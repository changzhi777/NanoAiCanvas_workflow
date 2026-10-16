"""V3 C 系列 —— 中段知识点图卡（NanoBanana2.1 no-text）。"""
import sys, json, time, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["WUYIN_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/cards_v3_nb21")
OUT.mkdir(parents=True, exist_ok=True)

SKETCH = ("hand-drawn pencil sketch on warm off-white paper, graphite linework with subtle "
          "gold and soft purple accents, diagram arrows and empty framed note boxes, "
          "educational knowledge-card composition, ABSOLUTELY NO text, no letters, no words")

JOBS = [
    ("nb21_C1_虚拟玻璃幕",
     f"{SKETCH}. Content: crowds of small pencil-sketch figures wearing large VR headsets, "
     f"immersed in glowing floating screens and playful icons, a transparent glass wall "
     f"separating them from the dim real world behind, one figure's hand pressed against the glass"),
    ("nb21_C2_镜前自问",
     f"{SKETCH}. Content: a single pencil-sketch figure sitting before an old standing mirror "
     f"in a dim quiet room, looking into their own eyes, a large empty thought bubble above "
     f"with a question-mark doodle, two small empty framed note boxes"),
    ("nb21_C3_静水觉知",
     f"{SKETCH}. Content: a pencil-sketch figure meditating cross-legged on perfectly still "
     f"water, soft radiating ripple rings of awareness around them, a bright small sun of "
     f"awareness above the head, mirror-like reflection below, generous negative space"),
    ("nb21_C4_月明莲开",
     f"{SKETCH}. Content: clouds parting to reveal a clear full moon over still water, a "
     f"white lotus flower emerging clean from a muddy pond in the foreground, ink-wash "
     f"gradient shading, generous negative space"),
    ("nb21_C5_晨光从容",
     f"{SKETCH}. Content: a pencil-sketch figure standing relaxed and at ease in soft "
     f"morning light, shoulders open, gentle smile, a quiet garden and rolling hills "
     f"behind, warm serene atmosphere with birds in the sky"),
]

def post(path, payload, timeout=60):
    req = urllib.request.Request(f"{base}{path}", data=json.dumps(payload).encode(),
        headers={"Authorization": keys["WUYIN_KEY"], "Content-Type": "application/json"}, method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read())

def detail(uid):
    q = urllib.request.Request(f"{base}/api/async/detail?id={uid}",
        headers={"Authorization": keys["WUYIN_KEY"]})
    return json.loads(urllib.request.urlopen(q, timeout=30).read()).get("data", {})

def poll(uid, max_wait=600):
    t0 = time.time()
    while time.time() - t0 < max_wait:
        time.sleep(5)
        d = detail(uid)
        st = d.get("status")
        if st == 2:
            res = d.get("result", {})
            return res if isinstance(res, str) else (res[0] if isinstance(res, list) and res else res.get("url"))
        if st not in (0, 1):
            raise RuntimeError(f"status={st} {d.get('message','')[:60]}")
    raise TimeoutError(uid)

def download(url, out):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    out.write_bytes(urllib.request.urlopen(req, timeout=180).read())

done, failed = [], []
for name, prompt in JOBS:
    out = OUT / f"{name}.png"
    if out.exists():
        print(f"↷ {name} 已存在", flush=True)
        continue
    try:
        r = post("/api/async/NanoBanana2.1",
                 {"prompt": prompt, "aspectRatio": "16:9", "imageSize": "2K"})
        if r.get("code") != 200:
            raise RuntimeError(r.get("msg", ""))
        url = poll(r["data"]["id"])
        download(url, out)
        done.append(name)
        print(f"✓ {name}", flush=True)
    except Exception as e:
        print(f"✗ {name}: {str(e)[:90]}", flush=True)
        failed.append(name)

print(f"RESULT: 完成 {len(done)}/{len(JOBS)} 失败={failed or '无'}", flush=True)
