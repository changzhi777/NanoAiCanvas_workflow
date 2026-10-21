"""wm_fingerprint — 内容指纹库（五元组：pHash + 关键帧 + sha256 + 水印 ID + C2PA）。

存储：JSONL（data/registry.jsonl，gitignore——含内容资产清单）。
检索：汉明距离 ≤ threshold（实测边界：同图 0-8 / 异图 28，阈值 10）。

用法：
    from wm_fingerprint import fingerprint, register, lookup
    rec = fingerprint("out.png", wm_id=wm, c2pa="urn:c2pa:...")
    register(rec)
    hits = lookup("out.jpg")   # → [(rec, distance), ...]
"""
import hashlib
import json
import pathlib
import subprocess

import imagehash
from PIL import Image

DATA = pathlib.Path(__file__).parent / "data"
REGISTRY = DATA / "registry.jsonl"


def _sha256(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def _probe(path) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration:stream=codec_type,width,height",
                        "-of", "json", str(path)], capture_output=True, text=True)
    try:
        info = json.loads(r.stdout or "{}")
    except json.JSONDecodeError:
        return {}
    streams = info.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video"), {})
    return {"duration": round(float(info.get("format", {}).get("duration", 0)), 2),
            "width": v.get("width"), "height": v.get("height"),
            "has_audio": any(s.get("codec_type") == "audio" for s in streams)}


def fingerprint(path, wm_id: bytes | None = None, c2pa: str | None = None,
                extra: dict | None = None) -> dict:
    """生成内容指纹记录。图 → 单 pHash；视频 → 首中尾三帧 pHash。extra 存引擎键。"""
    path = pathlib.Path(path)
    is_video = path.suffix.lower() in (".mp4", ".mov", ".webm")
    is_audio = path.suffix.lower() in AUDIO_EXT
    tmp = path.parent / "_fp_f.png"
    if is_audio:
        rec = {
            "file": path.name, "sha": _sha256(path),
            "phash": None, "dhash": None,
            "wm": wm_id.hex() if wm_id else None, "c2pa": c2pa,
            **_probe(path),
        }
    elif is_video:
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(path),
                        "-frames:v", "1", str(tmp)], check=True)
        im = Image.open(tmp).convert("RGB")          # 视频不能直接 Image.open
        rec = {
            "file": path.name, "sha": _sha256(path),
            "phash": str(imagehash.phash(im)), "dhash": str(imagehash.dhash(im)),
            "wm": wm_id.hex() if wm_id else None, "c2pa": c2pa,
            **_probe(path),
        }
        frames = []
        total = rec.get("duration") or 1
        for t in [0, total / 2, max(total - 0.1, 0)]:
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(t), "-i", str(path),
                            "-frames:v", "1", str(tmp)], check=True)
            fh = Image.open(tmp).convert("RGB")
            frames.append(str(imagehash.phash(fh)))
        rec["frame_phash"] = frames
    else:
        im = Image.open(path).convert("RGB")
        rec = {
            "file": path.name, "sha": _sha256(path),
            "phash": str(imagehash.phash(im)), "dhash": str(imagehash.dhash(im)),
            "wm": wm_id.hex() if wm_id else None, "c2pa": c2pa,
            **_probe(path),
        }
    if extra:
        rec.update(extra)
    if is_audio:
        return rec                      # 音频无视觉帧序列，直接返回
    tmp.unlink(missing_ok=True)
    return rec


def register(rec: dict) -> int:
    """入库。同 sha 已存在则跳过（防重复注册）。返回库内总数。"""
    DATA.mkdir(exist_ok=True)
    for existing in load_all():
        if existing.get("sha") == rec.get("sha"):
            return _count()
    with open(REGISTRY, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    return _count()


def _count() -> int:
    if not REGISTRY.exists():
        return 0
    return sum(1 for _ in open(REGISTRY, encoding="utf-8"))


def load_all():
    """遍历指纹库全部记录。"""
    if not REGISTRY.exists():
        return
    with open(REGISTRY, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def find_by_key(key_field: str, key_hex: str) -> dict | None:
    """按引擎键（如 rec['wam']）查库，返回关联记录（含完整 8B ID）。"""
    for rec in load_all():
        if rec.get(key_field) == key_hex:
            return rec
    return None


AUDIO_EXT = {".mp3", ".wav", ".aac", ".m4a", ".flac"}


def lookup(path, threshold: int = 10) -> list[tuple[dict, int]]:
    """按 pHash 汉明距离检索库内近似内容。返回 [(记录, 距离)] 升序。
    视频取首帧；音频无视觉 pHash → 返回空（音频靠 wavmark key 比对）。"""
    path = pathlib.Path(path)
    if path.suffix.lower() in AUDIO_EXT:
        return []
    if path.suffix.lower() in (".mp4", ".mov", ".webm"):
        tmp = path.parent / "_wm_lk.png"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(path),
                        "-frames:v", "1", str(tmp)], check=True)
        target = imagehash.phash(Image.open(tmp).convert("RGB"))
        tmp.unlink(missing_ok=True)
    else:
        target = imagehash.phash(Image.open(path).convert("RGB"))
    hits = []
    for rec in load_all():
        if not rec.get("phash"):
            continue
        d = int(target - imagehash.hex_to_hash(rec["phash"]))
        if d <= threshold:
            hits.append((rec, d))
    return sorted(hits, key=lambda x: x[1])
