"""video_compose 单元测试 — 纯函数 filter 构建（无 ffmpeg 依赖）
运行: cd backend && python -m pytest tests/unit/test_video_compose.py -v
"""
import pytest

from app.services.video_compose import (
    build_bgm_filter,
    build_normalize_filter,
    build_xfade_chain,
    generate_srt,
    quality_args,
    resolve_resolution,
    resolve_transition,
    DEFAULT_FADE_DURATION,
)


# ==================== 分辨率 ====================

class TestResolution:
    def test_named_resolutions(self):
        assert resolve_resolution("480p") == "854x480"
        assert resolve_resolution("720p") == "1280x720"
        assert resolve_resolution("1080p") == "1920x1080"
        assert resolve_resolution("2k") == "2560x1440"

    def test_passthrough_wxh(self):
        assert resolve_resolution("1920x804") == "1920x804"

    def test_unknown_falls_back(self):
        assert resolve_resolution("nonsense") == "1280x720"

    def test_normalize_filter_contains_key_parts(self):
        f = build_normalize_filter("1280x720")
        assert "scale=1280:720" in f
        assert "pad=1280:720" in f
        assert "format=yuv420p" in f
        assert "setsar=1" in f


# ==================== 转场映射 ====================

class TestTransition:
    def test_known_values(self):
        assert resolve_transition("fade") == "fade"
        assert resolve_transition("dissolve") == "dissolve"
        assert resolve_transition("wipeleft") == "wipeleft"

    def test_cut_returns_none(self):
        assert resolve_transition("cut") is None

    def test_unknown_falls_back_to_fade(self):
        assert resolve_transition("teleport") == "fade"


# ==================== xfade 链 ====================

class TestXfadeChain:
    def test_two_segments_offset(self):
        # 两段各 5s，fade 0.5 → offset = 5 - 0.5 = 4.5
        chain = build_xfade_chain([5.0, 5.0], "fade", 0.5)
        assert chain is not None
        assert "[0:v][1:v]xfade=transition=fade:duration=0.50:offset=4.50[vout]" == chain

    def test_three_segments_cumulative(self):
        # d=[5,5,5], fade=0.5
        # offset1 = 5 - 0.5 = 4.5; cumulative = 5 - 0.5 + 5 = 9.5
        # offset2 = 9.5 - 0.5 = 9.0
        chain = build_xfade_chain([5.0, 5.0, 5.0], "fade", 0.5)
        assert chain is not None
        parts = chain.split(";")
        assert len(parts) == 2
        assert "offset=4.50[v01]" in parts[0]
        assert "offset=9.00[vout]" in parts[1]

    def test_cut_returns_none(self):
        assert build_xfade_chain([5.0, 5.0], "cut", 0.5) is None

    def test_single_segment_returns_none(self):
        assert build_xfade_chain([5.0], "fade", 0.5) is None

    def test_empty_returns_none(self):
        assert build_xfade_chain([], "fade", 0.5) is None

    def test_fade_clamped_to_short_segment(self):
        # 最短段 1.0s → fade 最大 0.4s（0.4 * 1.0）
        chain = build_xfade_chain([1.0, 5.0], "fade", 2.0)
        assert chain is not None
        assert "duration=0.40" in chain

    def test_min_fade_floor(self):
        # 极短段 → fade 下限 0.1
        chain = build_xfade_chain([0.2, 0.2], "fade", 0.5)
        assert chain is not None
        assert "duration=0.10" in chain

    def test_labels_numbered(self):
        chain = build_xfade_chain([5.0, 5.0, 5.0, 5.0], "fade", 0.5)
        assert "[v01]" in chain
        assert "[v02]" in chain
        assert "[vout]" in chain


# ==================== BGM filter ====================

class TestBgmFilter:
    def test_volume_fade_loudnorm_present(self):
        f = build_bgm_filter(0.3, 1.0, 1.5, total_duration=15.0, has_original_audio=False)
        assert "volume=0.30" in f
        assert "afade=t=in:st=0:d=1.00" in f
        assert "afade=t=out:st=13.50:d=1.50" in f
        assert "loudnorm=I=-16" in f
        assert "alimiter" in f
        assert "[aout]" in f

    def test_volume_clamped(self):
        f = build_bgm_filter(5.0, 0, 0, total_duration=10.0, has_original_audio=False)
        assert "volume=1.00" in f
        f2 = build_bgm_filter(-1.0, 0, 0, total_duration=10.0, has_original_audio=False)
        assert "volume=0.00" in f2

    def test_with_original_audio_uses_amix(self):
        f = build_bgm_filter(0.3, 1.0, 1.5, 15.0, has_original_audio=True)
        assert "amix=inputs=2" in f
        assert "[0:a]" in f  # 原声输入

    def test_without_original_audio_no_amix(self):
        f = build_bgm_filter(0.3, 1.0, 1.5, 15.0, has_original_audio=False)
        assert "amix" not in f

    def test_fade_out_skipped_when_too_short(self):
        # 总长 1.0s < fade_out 1.5 → 不出 afade out
        f = build_bgm_filter(0.3, 0, 1.5, total_duration=1.0, has_original_audio=False)
        assert "afade=t=out" not in f


# ==================== SRT ====================

class TestSrt:
    def test_basic_format(self):
        srt = generate_srt([
            {"text": "第一句", "start": 0.0, "end": 2.5},
            {"text": "第二句", "start": 2.5, "end": 5.0},
        ])
        assert "1\n00:00:00,000 --> 00:00:02,500\n第一句" in srt
        assert "2\n00:00:02,500 --> 00:00:05,000\n第二句" in srt

    def test_hour_wrap(self):
        srt = generate_srt([{"text": "X", "start": 3661.5, "end": 3662.0}])
        assert "01:01:01,500 --> 01:01:02,000" in srt

    def test_empty(self):
        assert generate_srt([]) == ""


# ==================== 质量档 ====================

class TestQuality:
    def test_high(self):
        q = quality_args("high")
        assert q["crf"] == "18"
        assert q["preset"] == "slow"

    def test_draft(self):
        q = quality_args("draft")
        assert q["crf"] == "28"

    def test_unknown_defaults_standard(self):
        q = quality_args("ultra")
        assert q["crf"] == "23"
