"""wm_detect — 检测管线：元数据层 → 水印层 → 指纹层 → 证据分级报告。

证据分级（高→低）：
  OURS_SIGNED  C2PA 凭证含本管线标识（com.nanocanvas.meta）——铁证
  ID_MATCH     解码出水印 ID 且在指纹库内——铁证
  WM_FOUND     解码出合法 ID（不在库内）——强证据
  SIGNED       有 C2PA 凭证（第三方签）——中
  DIST_MATCH   pHash 命中库内内容（水印/C2PA 皆失时的兜底）——中
  PROBABLE_AI  元数据含 AI 生成声明——弱
  UNKNOWN      无任何信号

用法：
    from wm_detect import detect
    report = detect("out.mp4")
"""
import json
import pathlib
import subprocess

import wm_c2pa
import wm_fingerprint
import wm_video
from wm_id import parse_id
from wm_image import decode as image_decode

EXIF = "exiftool"
AUDIO_EXT = {".mp3", ".wav", ".aac", ".m4a", ".flac"}
AI_MARKERS = ("aigc", "ai_generated", "aimetadata", "generativeai", "synthid",
              "com.nanocanvas", "生成合成", "ai生成")


def _ai_declaration(path) -> list[str]:
    """扫元数据中的 AI 声明类字段（隐式标识合规检查）。"""
    r = subprocess.run([EXIF, "-G1", "-j", "-s", str(path)],
                       capture_output=True, text=True, timeout=120)
    found = []
    blob = r.stdout.lower()
    for m in AI_MARKERS:
        if m in blob:
            found.append(m)
    return found


def detect(path, tier: str = "light") -> dict:
    path = pathlib.Path(path)
    is_video = path.suffix.lower() in (".mp4", ".mov", ".webm")
    report = {"file": str(path), "evidence": None, "tier": tier, "layers": {}}

    # ---- 层 1：C2PA / 元数据 ----
    c2pa_state, c2pa_data = wm_c2pa.verify(path)
    decl = _ai_declaration(path)
    report["layers"]["c2pa"] = {"state": c2pa_state}
    report["layers"]["ai_declaration"] = decl

    # ---- 层 2：L1 频域水印（音频域无 L1）----
    wm_hit, payload, wm_detail = False, None, None
    is_audio = path.suffix.lower() in AUDIO_EXT
    if is_audio:
        wm_detail = {"note": "音频域无 L1 频层（deep=WavMark）"}
    elif is_video:
        votes, frames, payload = wm_video.detect(path)
        wm_hit = votes > 0
        wm_detail = {"votes": votes, "frames": frames}
    else:
        wm_hit, payload, tries = image_decode(path)
        wm_detail = {"tries": tries}
    wm_info = None
    if wm_hit:
        ok, wm_info = parse_id(payload)
        wm_hit = ok
    report["layers"]["freq"] = wm_detail
    report["wm_info"] = wm_info

    # ---- 层 3：L2 深度引擎（deep tier）----
    deep_detail: dict = {}
    deep_id8 = None
    if tier == "deep":
        if is_audio:
            from engines.audio_engine import AudioEngine, _pack16
            hit2, key2b, det = AudioEngine().extract(path)
            assoc = (wm_fingerprint.find_by_key("wavmark", key2b.hex()) if key2b else None)
            deep_detail["wavmark"] = {**det, "hit": hit2,
                                      "linked_id": assoc["wm"] if assoc else None}
            if hit2 and assoc:
                deep_id8 = bytes.fromhex(assoc["wm"])
            elif hit2:
                deep_detail["wavmark"]["note"] = "key 命中但库内无关联"
        elif is_video:
            from engines.wam_engine import WamEngine
            votes, frames, key4 = WamEngine().extract_video_votes(path)
            assoc = (wm_fingerprint.find_by_key_fuzzy("wam", key4.hex()) if key4 else None)
            deep_detail["wam_video"] = {"votes": votes, "frames": frames,
                                        "linked_id": assoc["wm"] if assoc else None,
                                        "hit": votes >= 2 or bool(assoc)}
            if assoc:
                deep_id8 = bytes.fromhex(assoc["wm"])
        else:
            from engines.wam_engine import WamEngine
            hit2, msg32, det = WamEngine().extract(path)
            assoc = (wm_fingerprint.find_by_key_fuzzy("wam", msg32.hex()) if msg32 else None)
            deep_detail["wam"] = {**det, "hit": hit2,
                                  "linked_id": assoc["wm"] if assoc else None}
            if hit2 and assoc:
                deep_id8 = bytes.fromhex(assoc["wm"])
            elif hit2:
                deep_detail["wam"]["note"] = "msg 命中但库内无关联"
        report["layers"]["deep"] = deep_detail

    # ---- 层 4：指纹库 ----
    reg_hit = wm_fingerprint.lookup(path)
    lib_wm = None
    for rec in wm_fingerprint.load_all():       # 水印 ID 直接比对（转码后 pHash 可能失配）
        if payload and rec.get("wm") == payload.hex():
            lib_wm = rec
            break
        if deep_id8 and rec.get("wm") == deep_id8.hex():
            lib_wm = rec
            break
        if deep_id8 and rec.get("wm") == deep_id8.hex():
            lib_wm = rec
            break
    report["layers"]["registry"] = {
        "phash_hits": [{"file": r["file"], "dist": d} for r, d in reg_hit],
        "wm_in_registry": bool(lib_wm),
    }

    # ---- 证据分级 ----
    if c2pa_state == "OURS":
        report["evidence"] = "OURS_SIGNED"
    elif lib_wm:
        report["evidence"] = "ID_MATCH"
    elif deep_id8:
        report["evidence"] = "DEEP_MATCH"
    elif wm_hit:
        report["evidence"] = "WM_FOUND"
    elif c2pa_state == "THIRD_PARTY":
        report["evidence"] = "SIGNED"
    elif reg_hit:
        report["evidence"] = "DIST_MATCH"
    elif deep_detail:
        report["evidence"] = "DEEP_TRACE"
    elif decl:
        report["evidence"] = "PROBABLE_AI"
    else:
        report["evidence"] = "UNKNOWN"
    return report


def summarize(report: dict) -> str:
    lines = [f"证据: {report['evidence']}  {report['file']}"]
    if report.get("wm_info"):
        lines.append(f"  水印ID: {report['wm_info']}")
    for name, layer in report["layers"].items():
        if layer:
            lines.append(f"  [{name}] {json.dumps(layer, ensure_ascii=False)[:160]}")
    return "\n".join(lines)
