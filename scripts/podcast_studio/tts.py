"""TTS 逐句合成 — speech-2.8-hd 产时间轴骨架。

用法：
    from tts import build_timeline
    timeline = build_timeline(script, cfg)   # script = script_gen 产物

产物 out/timeline.json：
    {"lines": [{"id": 0, "text": ..., "audio": "out/tts/line_00.mp3",
                "start": 0.0, "end": 3.2, "speaker": "host"}], "total": 60.1}
时间以 ffprobe 实测为准（永不预算制）。
"""
import base64
import json
import pathlib
import shutil
import subprocess
import urllib.request

from get_keys import get_keys

HERE = pathlib.Path(__file__).parent

FFPROBE = shutil.which("ffprobe") or "ffprobe"


def synth_line(text: str, voice_id: str, cfg: dict) -> bytes:
    """单句合成 → mp3 bytes。失败抛 RuntimeError。"""
    a = cfg["defaults"]["audio"]
    keys = get_keys()
    req = urllib.request.Request(
        f"{keys['MINIMAX_BASE'].rstrip('/')}/t2a_v2",
        data=json.dumps({
            "model": cfg["models"]["tts"],
            "text": text,
            "stream": False,
            "voice_setting": {"voice_id": voice_id,
                              "speed": cfg["defaults"].get("voice_speed", 1.0)},
            "audio_setting": {"sample_rate": a["sample_rate"], "format": a["format"]},
        }).encode(),
        headers={"Authorization": f"Bearer {keys['MINIMAX_KEY']}",
                 "Content-Type": "application/json"},
        method="POST",
    )
    resp = json.loads(urllib.request.urlopen(req, timeout=120).read())
    br = resp.get("base_resp", {})
    if br.get("status_code") != 0:
        raise RuntimeError(f"TTS 失败 status={br.get('status_code')} {br.get('status_msg')}")
    return bytes.fromhex(resp["data"]["audio"])  # 官方返回 hex 编码（非 base64）


def _audio_duration(path: pathlib.Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, timeout=30,
    )
    return float(out.stdout.strip())


def build_timeline(script: dict, cfg: dict, out_dir: str | None = None) -> dict:
    """逐句合成 → 实测时长 → timeline.json。dialogue 双音色交替。"""
    out = pathlib.Path(out_dir or (HERE / "out"))
    tts_dir = out / "tts"
    tts_dir.mkdir(parents=True, exist_ok=True)

    mode = script.get("mode", "monologue")
    voices = cfg["voices"]
    gap = cfg["defaults"]["sentence_gap"]
    entries, cursor = [], 0.0
    for i, line in enumerate(script["lines"]):
        vid = (voices["dialogue"][line.get("speaker", "host")]
               if mode == "dialogue" else voices["monologue"])
        mp3 = tts_dir / f"line_{i:02d}.mp3"
        if not mp3.exists():  # 断点续跑：已有则跳过
            mp3.write_bytes(synth_line(line["text"], vid, cfg))
        dur = _audio_duration(mp3)
        entries.append({
            "id": i, "text": line["text"], "speaker": line.get("speaker", "host"),
            "visual_hint": line.get("visual_hint", ""),
            "audio": str(mp3), "start": round(cursor, 3), "end": round(cursor + dur, 3),
        })
        cursor += dur + gap
    timeline = {"mode": mode, "title": script.get("title", ""),
                "lines": entries, "total": round(cursor - gap, 3)}
    if mode == "dialogue":
        group_timeline(timeline, cfg["defaults"].get("dialogue_group_size", 4))
    (out / "timeline.json").write_text(
        json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")
    return timeline


def group_timeline(timeline: dict, group_size: int = 4) -> dict:
    """对谈模式图文卡分组：每 group_size 句共用一张卡（逐句配图会图数爆炸）。

    在 timeline 上挂 groups：{"card": 卡序号, "start": 组起点, "end": 组终点,
    "lines": [句 id], "visual_hint": 组代表句的视觉描述}
    """
    lines = timeline["lines"]
    groups = []
    for g, i in enumerate(range(0, len(lines), group_size)):
        chunk = lines[i:i + group_size]
        hint = next((c["visual_hint"] for c in chunk if c.get("visual_hint")), "")
        groups.append({
            "card": g, "start": chunk[0]["start"], "end": chunk[-1]["end"],
            "lines": [c["id"] for c in chunk], "visual_hint": hint,
        })
    timeline["groups"] = groups
    return timeline


if __name__ == "__main__":
    import yaml
    cfg = yaml.safe_load(open(HERE / "config.yaml", encoding="utf-8"))
    script = json.loads((HERE / "out" / "script.json").read_text(encoding="utf-8"))
    tl = build_timeline(script, cfg)
    print(f"✓ 时间轴 {tl['total']}s / {len(tl['lines'])} 句 → {HERE}/out/timeline.json")
    for e in tl["lines"][:3]:
        print(f"  #{e['id']} {e['start']:.1f}-{e['end']:.1f}s  {e['text'][:24]}…")
