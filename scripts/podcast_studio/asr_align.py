"""外部解说音轨对齐 —— ASR 词级时间戳 → 段落 timeline + 句级精确 SRT。

用法：
    python3 asr_align.py "/path/to/解说.mp3"     # 读 out/script.json 的段落文本

产出：
    out/timeline.json  段落级（start/end = ASR 实测，供 assemble 切视频段）
    out/external.srt   句级精确字幕（时间戳取自词级 ASR，非字数估算）

场景：用户提供专业解说录音时，跳过 TTS，图文卡与字幕全部对齐真实音轨。
"""
import json
import pathlib
import re
import sys

import requests

from get_keys import get_keys

HERE = pathlib.Path(__file__).parent
_PUNCT = "，。！？；：、""''（）()《》〈〉·「」【】…— \t\n"
_TTS_MARK = re.compile(r"<#\d+(?:\.\d+)?#>|\([a-z-]+\)", re.IGNORECASE)


def asr_word_level(mp3_path: str) -> list[dict]:
    """MiniMax ASR 词级转写 → [{text, start, end}]（中文按字）。"""
    keys = get_keys()
    base = keys["MINIMAX_BASE"].rstrip("/")
    with open(mp3_path, "rb") as f:
        r = requests.post(f"{base}/speech_to_text",
                          headers={"Authorization": f"Bearer {keys['MINIMAX_KEY']}", "language": "zh"},
                          files={"file": (pathlib.Path(mp3_path).name, f, "audio/mpeg")},
                          data={"model": "asr-1.0", "response_format": "verbose_json",
                                "timestamp_level": "word"}, timeout=600)
    r.raise_for_status()
    return r.json().get("segments", [])


def _build_index(segs: list[dict]):
    """构造 去标点字符序列 → (段索引/起止时间) 的映射。"""
    chars, meta = [], []          # chars: 去标点字符; meta: 对应 seg 下标
    for i, s in enumerate(segs):
        for ch in s["text"]:
            if ch in _PUNCT:
                continue
            chars.append(ch)
            meta.append(i)
    return "".join(chars), meta


def align(script_lines: list[dict], segs: list[dict]):
    """段落文本 → ASR 时间轴。返回 (lines_with_time, sentence_srt_entries)。"""
    asr_plain, meta = _build_index(segs)
    total_end = segs[-1]["end"] if segs else 0.0

    # ---- 段落边界：顺序锚点定位 ----
    starts, cursor = [], 0
    for ln in script_lines:
        plain = re.sub(rf"[{re.escape(_PUNCT)}]", "", _TTS_MARK.sub("", ln["text"]))
        idx = -1
        for k in (12, 8, 6, 4):
            if len(plain) < k:
                continue
            idx = asr_plain.find(plain[:k], cursor)
            if idx >= 0:
                break
        if idx < 0:
            raise RuntimeError(f"段落锚点未命中: {plain[:20]}…（游标 {cursor}）")
        starts.append(idx)
        cursor = idx

    lines, sentences = [], []
    for i, ln in enumerate(script_lines):
        s_char = starts[i]
        e_char = starts[i + 1] if i + 1 < len(starts) else len(asr_plain)
        s_t = segs[meta[s_char]]["start"]
        e_t = segs[meta[e_char - 1]]["end"] if e_char - 1 < len(meta) else total_end
        text = _TTS_MARK.sub("", ln["text"]).strip()
        lines.append({**ln, "text": text, "id": i,
                      "start": round(s_t, 3), "end": round(e_t, 3)})

        # ---- 句级精确字幕：段内按标点切句，时间戳取自词级 ----
        for sent, cs, ce in _split_with_index(ln["text"], s_char, e_char, asr_plain):
            sentences.append({
                "text": sent,
                "start": round(segs[meta[cs]]["start"], 3),
                "end": round(segs[meta[min(ce, len(meta) - 1)]]["end"], 3),
            })
    return {"mode": "external", "title": "", "lines": lines,
            "total": round(total_end, 3)}, sentences


def _split_with_index(orig: str, s_char: int, e_char: int, asr_plain: str):
    """段内按标点切句，返回 (句子文本, ASR 字符区间)。

    以"去标点字符数"为坐标：原文每切出一句，计其非标点字符数 n，
    在 asr 全局坐标上推进 n 个字符。
    """
    cleaned = _TTS_MARK.sub("", orig)
    # 二级切分（同 assemble 策略：句 → 超长按逗号）
    parts = [p for p in re.split(r"(?<=[。！？；])", cleaned) if p.strip()]
    fine = []
    for s in parts:
        n = sum(1 for ch in s if ch not in _PUNCT)
        if n <= 26:
            fine.append(s)
        else:
            buf = ""
            for p in [x for x in re.split(r"(?<=[，、])", s) if x.strip()]:
                if sum(1 for ch in buf + p if ch not in _PUNCT) <= 26:
                    buf += p
                else:
                    if buf:
                        fine.append(buf)
                    buf = p
            if buf:
                fine.append(buf)
    out, cur = [], s_char
    for s in fine:
        n = sum(1 for ch in s if ch not in _PUNCT)
        out.append((s.strip(), cur, cur + max(n - 1, 0)))
        cur += n
    return out


def write_outputs(timeline: dict, sentences: list[dict], out_dir: pathlib.Path):
    """timeline.json + external.srt 落盘（generate/CLI 共用）。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "timeline.json").write_text(
        json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")

    def ts(sec):
        ms = int(round(sec * 1000))
        h, ms = divmod(ms, 3600000)
        m, ms = divmod(ms, 60000)
        s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    blocks = []
    for i, s in enumerate(sentences, 1):
        wrapped = "\n".join(s["text"][j:j + 14] for j in range(0, len(s["text"]), 14))
        blocks.append(f"{i}\n{ts(s['start'])} --> {ts(s['end'])}\n{wrapped}\n")
    (out_dir / "external.srt").write_text("\n".join(blocks), encoding="utf-8")


if __name__ == "__main__":
    mp3 = sys.argv[1]
    script = json.loads((HERE / "out" / "script.json").read_text(encoding="utf-8"))
    print("ASR 词级转写中…")
    segs = asr_word_level(mp3)
    print(f"  {len(segs)} 个时间单元")
    timeline, sentences = align(script["lines"], segs)
    write_outputs(timeline, sentences, HERE / "out")
    print(f"✓ 段落 {len(timeline['lines'])} 条 / 字幕 {len(sentences)} 条 / 总长 {timeline['total']}s")
