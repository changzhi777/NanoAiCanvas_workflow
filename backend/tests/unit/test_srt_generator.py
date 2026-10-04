"""srt_generator 单元测试 — SRT 格式/语速校验/自动换行/烧录命令构建"""
import pytest

from app.services.srt_generator import (
    generate_srt,
    _fmt_ts,
    _wrap_text,
    _validate_speech_rate,
    SPEECH_RATE_DEFAULT,
)


class TestFmtTs:
    def test_seconds(self):
        assert _fmt_ts(1.0) == "00:00:01,000"

    def test_milliseconds(self):
        assert _fmt_ts(3.856) == "00:00:03,856"

    def test_zero(self):
        assert _fmt_ts(0) == "00:00:00,000"

    def test_minutes(self):
        assert _fmt_ts(65.5) == "00:01:05,500"


class TestWrapText:
    def test_short_no_wrap(self):
        assert _wrap_text("宇宙这么大") == "宇宙这么大"

    def test_long_wraps(self):
        text = "宇宙这么大什么才是最重要的有人研究宇宙"  # 18 字
        wrapped = _wrap_text(text)
        assert "\n" in wrapped
        lines = wrapped.split("\n")
        assert all(len(l) <= 14 for l in lines)
        assert "".join(lines) == text

    def test_wrap_at_punctuation(self):
        text = "宇宙这么大，什么才是最重要的？"  # 14 字含标点
        result = _wrap_text(text)
        # 14 字恰好不折或标点处折
        assert result.count("\n") <= 1


class TestSpeechRateValidation:
    def test_normal_rate_unchanged(self):
        entries = [{"text": "宇宙这么大", "start": 0.5, "end": 2.0}]  # 5字/1.5s ≈ 3.3 字/s
        result = _validate_speech_rate(entries)
        assert result[0]["end"] == 2.0

    def test_too_fast_expanded(self):
        entries = [{"text": "十个字十个字十个字十个字十个字", "start": 0, "end": 1}]  # 15字/1s = 15字/s
        result = _validate_speech_rate(entries)
        new_duration = result[0]["end"] - result[0]["start"]
        expected = 15 / SPEECH_RATE_DEFAULT  # ≈4.3s
        assert abs(new_duration - expected) < 0.1

    def test_too_slow_compressed(self):
        entries = [{"text": "三个字", "start": 0, "end": 10}]  # 3字/10s = 0.3字/s
        result = _validate_speech_rate(entries)
        new_duration = result[0]["end"] - result[0]["start"]
        assert new_duration < 10


class TestGenerateSrt:
    def test_basic_srt(self):
        entries = [
            {"text": "宇宙这么大，什么才是最重要的？", "start": 0.5, "end": 4.0},
            {"text": "有人研究宇宙，有人探索未知……", "start": 4.5, "end": 8.0},
        ]
        srt = generate_srt(entries, 15.0)
        assert "1\n" in srt
        assert "00:00:00,500 --> 00:00:04,000" in srt
        assert "2\n" in srt
        assert "00:00:04,500 --> 00:00:08,000" in srt

    def test_empty_entries(self):
        assert generate_srt([], 15.0) == ""

    def test_last_entry_clamped(self):
        entries = [{"text": "这是一句较长的末尾台词用于测试截断", "start": 14.0, "end": 20.0}]
        srt = generate_srt(entries, 15.0)
        # 语速校验先压缩（16字/3.5字每秒≈4.57s→end≈18.57），再截到 15s
        assert "00:00:15,000" in srt

    def test_invalid_entry_skipped(self):
        entries = [
            {"text": "正常", "start": 0.5, "end": 3.0},
            {"text": "无效", "start": 5.0, "end": 4.0},  # end < start
        ]
        srt = generate_srt(entries, 15.0)
        assert "正常" in srt
        assert "无效" not in srt
