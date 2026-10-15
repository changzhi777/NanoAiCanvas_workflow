"""ASR 质量监控服务 — Whisper-large-v3 本地调用

定位：扎吉视频知识人文口播产线的质量闸，对标 V28「M3 一致性闭环」。

工作流：
  1. 接收 H3 输出的音视频文件（mp4）
  2. ffmpeg 抽音轨（wav 16kHz mono）
  3. Whisper-large-v3 本地转录（含中文+英文字幕）
  4. 与期望字幕（SRT）逐句对齐，计算
     - 字符一致率（WER = 1 - matched_chars / expected_chars）
     - 时间戳偏差（mean abs diff, ms）
  5. 输出 ASRReport 评分（pass/warn/fail 三档）

设计原则：
  - 本地推理，零网络依赖（除了首次下载）
  - 中文为主（扎吉定位），支持多语言兜底
  - fail-fast：模型未下载时给清晰错误（避免假装转录）
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
import tempfile
import wave
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# 默认模型路径（部署到 .22 时改；本机默认 ~/models/whisper-large-v3）
DEFAULT_MODEL_PATH = os.environ.get(
    "ZAJI_WHISPER_MODEL",
    os.path.expanduser("~/models/whisper-large-v3"),
)

# 抽音轨默认参数
SAMPLE_RATE = 16000  # Whisper 期望 16kHz
CHANNELS = 1


@dataclass
class ASRTranscript:
    """单条转录结果。"""
    start: float
    end: float
    text: str
    confidence: float = 0.0  # 0~1


@dataclass
class ASRReport:
    """整段音视频的 ASR 质量评分。"""
    video_path: str
    expected_srt: Optional[str] = None
    transcripts: list[ASRTranscript] = field(default_factory=list)
    full_text: str = ""
    language: str = "zh"
    duration_sec: float = 0.0

    # 评分指标
    wer: float = 0.0          # 1 - matched_chars / expected_chars
    time_drift_ms: float = 0.0  # 平均时间戳偏差（毫秒）
    matched_chars: int = 0
    expected_chars: int = 0

    # 阈值（V28 验收：90+ 一致 / 85+ 口型 / 85+ 场景）
    wer_pass: float = 0.90
    time_drift_pass_ms: float = 500.0  # 半秒以内

    @property
    def verdict(self) -> str:
        """pass / warn / fail"""
        if self.wer >= self.wer_pass and self.time_drift_ms <= self.time_drift_pass_ms:
            return "pass"
        if self.wer >= 0.80 and self.time_drift_ms <= 1500.0:
            return "warn"
        return "fail"

    def to_dict(self) -> dict:
        return {
            "video_path": self.video_path,
            "language": self.language,
            "duration_sec": round(self.duration_sec, 2),
            "wer": round(self.wer, 4),
            "matched_chars": self.matched_chars,
            "expected_chars": self.expected_chars,
            "time_drift_ms": round(self.time_drift_ms, 2),
            "verdict": self.verdict,
            "transcript_count": len(self.transcripts),
            "full_text": self.full_text,
        }


def _extract_audio(video_path: str, out_wav: str) -> float:
    """ffmpeg 抽 16kHz mono wav，返回时长。"""
    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-i", video_path,
        "-ar", str(SAMPLE_RATE),
        "-ac", str(CHANNELS),
        "-c:a", "pcm_s16le",
        out_wav,
    ]
    subprocess.run(cmd, check=True, timeout=120)

    with wave.open(out_wav, "rb") as wf:
        frames = wf.getnframes()
        return frames / wf.getframerate()


def _parse_srt(srt_path: str) -> list[ASRTranscript]:
    """简单 SRT 解析（与 generate_srt 输出兼容）。"""
    items: list[ASRTranscript] = []
    if not srt_path or not Path(srt_path).exists():
        return items
    with open(srt_path, encoding="utf-8") as f:
        blocks = re.split(r"\n\s*\n", f.read().strip())

    ts_re = re.compile(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)")
    for blk in blocks:
        lines = [l.strip() for l in blk.splitlines() if l.strip()]
        if len(lines) < 2:
            continue
        m = ts_re.match(lines[1] if "-->" not in lines[1] else lines[1])
        if not m:
            # 跳过无时间戳的块
            continue
        sh, sm, ss, sms, eh, em, es, ems = map(int, m.groups())
        start = sh * 3600 + sm * 60 + ss + sms / 1000
        end = eh * 3600 + em * 60 + es + ems / 1000
        text = " ".join(lines[2:]) if len(lines) > 2 else ""
        items.append(ASRTranscript(start=start, end=end, text=text))
    return items


def _normalize_zh(s: str) -> str:
    """中文 ASR 归一化：去标点+空格+全角转半角。"""
    import unicodedata
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"[\s　、。，！？…：；（）\"" "“”‘’《》｛｝【】]+", "", s)
    return s


def _align(expected: list[ASRTranscript], actual: list[ASRTranscript]) -> tuple[float, float, int, int]:
    """贪婪对齐（按时间窗匹配），计算字符一致率与时间戳偏差。"""
    if not expected:
        return 0.0, 0.0, 0, 0

    matched_chars = 0
    expected_chars = 0
    drift_ms_list = []
    used = set()

    for exp in expected:
        exp_norm = _normalize_zh(exp.text)
        if not exp_norm:
            continue
        expected_chars += len(exp_norm)
        # 在 ±2s 窗内找最佳匹配
        best = None
        best_score = -1
        for j, act in enumerate(actual):
            if j in used:
                continue
            if abs(act.start - exp.start) > 2.0:
                continue
            act_norm = _normalize_zh(act.text)
            score = sum(1 for a, b in zip(exp_norm, act_norm) if a == b)
            if score > best_score:
                best_score = score
                best = (j, act)
        if best is None:
            continue
        j, act = best
        used.add(j)
        # 字符匹配数
        act_norm = _normalize_zh(act.text)
        common = sum(1 for a, b in zip(exp_norm, act_norm) if a == b)
        matched_chars += common
        # 时间戳偏差
        drift_ms_list.append(abs(act.start - exp.start) * 1000)

    wer = matched_chars / expected_chars if expected_chars else 0.0
    drift = sum(drift_ms_list) / len(drift_ms_list) if drift_ms_list else 0.0
    return wer, drift, matched_chars, expected_chars


def transcribe(audio_wav: str, model_path: str = DEFAULT_MODEL_PATH) -> tuple[list[ASRTranscript], str, str]:
    """Whisper-large-v3 转录。返回 (transcripts, full_text, language)。"""
    if not Path(model_path).exists():
        raise FileNotFoundError(
            f"Whisper 模型未找到: {model_path}\n"
            f"下载: wget -c https://openaipublic.azureedge.net/models/whisper/models-v3/large-v3.pt -O {model_path}\n"
            f"或设置环境变量 ZAJI_WHISPER_MODEL 指向其他模型路径"
        )

    try:
        import whisper  # type: ignore
    except ImportError as e:
        raise ImportError(
            f"openai-whisper 未安装: {e}\n"
            f"安装: pip install -U openai-whisper"
        ) from e

    logger.info(f"whisper transcribe: {audio_wav} model={model_path}")
    model = whisper.load_model(model_path)
    result = model.transcribe(audio_wav, language="zh", verbose=False)

    transcripts = [
        ASRTranscript(
            start=seg["start"],
            end=seg["end"],
            text=seg["text"].strip(),
        )
        for seg in result.get("segments", [])
    ]
    full_text = result.get("text", "").strip()
    language = result.get("language", "zh")
    return transcripts, full_text, language


def monitor_video(
    video_path: str,
    expected_srt: Optional[str] = None,
    model_path: str = DEFAULT_MODEL_PATH,
) -> ASRReport:
    """完整流程：抽音 → Whisper 转录 → 与期望 SRT 对齐 → 评分。"""
    video_p = Path(video_path)
    if not video_p.exists():
        raise FileNotFoundError(f"视频文件不存在: {video_path}")

    report = ASRReport(video_path=str(video_p), expected_srt=expected_srt)

    with tempfile.TemporaryDirectory() as tmp:
        wav_path = os.path.join(tmp, "audio.wav")
        duration = _extract_audio(str(video_p), wav_path)
        report.duration_sec = duration

        transcripts, full_text, language = transcribe(wav_path, model_path=model_path)
        report.transcripts = transcripts
        report.full_text = full_text
        report.language = language

        if expected_srt:
            expected = _parse_srt(expected_srt)
            wer, drift, matched, total = _align(expected, transcripts)
            report.wer = wer
            report.time_drift_ms = drift
            report.matched_chars = matched
            report.expected_chars = total

    logger.info(
        f"ASR monitor verdict={report.verdict} WER={report.wer:.3f} "
        f"drift={report.time_drift_ms:.0f}ms matched={report.matched_chars}/{report.expected_chars}"
    )
    return report


# CLI 入口
if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="ASR quality monitor (Whisper-large-v3)")
    ap.add_argument("video", help="音视频文件路径")
    ap.add_argument("--srt", help="期望字幕 SRT（用于校核）")
    ap.add_argument("--model", default=DEFAULT_MODEL_PATH, help="Whisper 模型路径")
    ap.add_argument("--json", action="store_true", help="输出 JSON 报告")
    args = ap.parse_args()

    r = monitor_video(args.video, args.srt, args.model)
    if args.json:
        print(json.dumps(r.to_dict(), ensure_ascii=False, indent=2))
    else:
        print(f"verdict:   {r.verdict}")
        print(f"language:  {r.language}")
        print(f"duration:  {r.duration_sec:.2f}s")
        print(f"WER:       {r.wer:.3f}  (matched {r.matched_chars}/{r.expected_chars})")
        print(f"time drift:{r.time_drift_ms:.0f}ms")
        print(f"text:      {r.full_text[:200]}{'...' if len(r.full_text) > 200 else ''}")
