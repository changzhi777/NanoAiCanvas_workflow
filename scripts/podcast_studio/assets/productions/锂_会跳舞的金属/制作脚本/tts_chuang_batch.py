#!/usr/bin/env python3
"""锂篇旁白批量合成（速创 TTS，抒情男声，全 9 句统一音色）。"""
import json
import pathlib
import subprocess
import sys
import time
import urllib.request

sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys  # noqa: E402

HERE = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/lithium_science")
OUT = HERE / "narration"
OUT.mkdir(exist_ok=True)
VOICE = "Chinese (Mandarin)_Lyrical_Voice"
KEY = get_keys()
BASE = KEY["WUYIN_BASE"].rstrip("/")


def submit(text: str) -> str:
    body = {"text": text, "voice_id": VOICE, "speed": "1", "language_boost": "Chinese"}
    req = urllib.request.Request(f"{BASE}/api/async/audio_tts?key={KEY['WUYIN_KEY']}",
                                data=json.dumps(body).encode(),
                                headers={"Authorization": KEY["WUYIN_KEY"],
                                         "Content-Type": "application/json"}, method="POST")
    r = json.loads(urllib.request.urlopen(req, timeout=60).read())
    if r.get("code") != 200:
        raise RuntimeError(r.get("msg"))
    return r["data"]["id"]


def poll(uid: str, timeout=300) -> str:
    t0 = time.time()
    while time.time() - t0 < timeout:
        time.sleep(4)
        q = urllib.request.Request(f"{BASE}/api/async/detail?id={uid}",
                                   headers={"Authorization": KEY["WUYIN_KEY"]})
        d = json.loads(urllib.request.urlopen(q, timeout=30).read()).get("data", {})
        st = d.get("status")
        if st == 2:
            res = d.get("result", {})
            return res if isinstance(res, str) else (res[0] if isinstance(res, list) and res else res.get("url"))
        if st not in (0, 1):
            raise RuntimeError(str(d.get("message"))[:80])
    raise TimeoutError(uid)


def download(url: str, path: pathlib.Path) -> int:
    """下载结果（速创返回 tar：内含 mp3 + titles 字幕时间戳），自动解包。"""
    import shutil
    import tarfile
    import tempfile
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = urllib.request.urlopen(req, timeout=180).read()
    path.write_bytes(data)
    if tarfile.is_tarfile(path):
        with tempfile.TemporaryDirectory() as td:
            with tarfile.open(path) as t:
                for n in t.getnames():
                    if n.endswith((".mp3", ".titles")):
                        t.extract(n, path=td)
            mp3s = list(pathlib.Path(td).rglob("*.mp3"))
            tls = list(pathlib.Path(td).rglob("*.titles"))
            if mp3s:
                shutil.move(str(mp3s[0]), path)
            if tls:
                shutil.move(str(tls[0]), path.with_suffix(".titles"))
    return path.stat().st_size


def dur(p: pathlib.Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return round(float(r.stdout.strip()), 3)


def main():
    script = json.loads((HERE / "script_lithium.json").read_text(encoding="utf-8"))
    timeline = []
    cursor = 0.0
    for ln in script["lines"]:
        i, text = ln["id"], ln["text"]
        out = OUT / f"line_{i:02d}.mp3"
        if not out.exists() or out.stat().st_size < 5000:
            uid = submit(text)
            print(f"[{i}] 提交 {uid}", flush=True)
            url = poll(uid)
            n = download(url, out)
            print(f"[{i}] ✓ {out.name} {n//1024}KB", flush=True)
        d = dur(out)
        timeline.append({"id": i, "text": text, "audio": str(out),
                         "start": round(cursor, 3), "end": round(cursor + d, 3)})
        cursor += d + 0.3
        print(f"[{i}] {d:.2f}s", flush=True)
    tl = {"mode": "tts", "voice": VOICE, "lines": timeline, "total": round(cursor - 0.3, 3)}
    (HERE / "narration_timeline.json").write_text(
        json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ 总时长 {tl['total']}s → narration_timeline.json", flush=True)


if __name__ == "__main__":
    main()
