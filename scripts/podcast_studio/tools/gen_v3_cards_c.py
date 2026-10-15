"""V3 补卡 C1-C5 —— 中段知识点图卡（no-text，image-01）。"""
import sys, json, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["MINIMAX_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/cards_v3")

SKETCH = ("hand-drawn pencil sketch on warm off-white paper, graphite linework with subtle "
          "gold and soft purple accents, diagram arrows and empty framed note boxes, "
          "educational knowledge-card composition, ABSOLUTELY NO text, no letters, no "
          "words anywhere")

JOBS = [
    ("v3_C1_虚拟玻璃幕", "16:9",
     f"{SKETCH}. Content: crowds of small pencil-sketch figures wearing large VR headsets, "
     f"immersed in glowing floating screens and playful icons, a transparent glass wall "
     f"separating them from the dim real world behind, one figure's hand pressed against "
     f"the glass"),
    ("v3_C2_镜前自问", "16:9",
     f"{SKETCH}. Content: a single pencil-sketch figure sitting before an old standing "
     f"mirror in a dim quiet room, looking into their own eyes, a large empty thought "
     f"bubble above with a question-mark doodle, two small empty framed note boxes"),
    ("v3_C3_静水觉知", "16:9",
     f"{SKETCH}. Content: a pencil-sketch figure meditating cross-legged on perfectly "
     f"still water, soft radiating ripple rings of awareness around them, a bright small "
     f"sun of awareness above the head, mirror-like reflection below, generous negative space"),
    ("v3_C4_月明莲开", "16:9",
     f"{SKETCH}. Content: clouds parting to reveal a clear full moon over still water, a "
     f"white lotus flower emerging clean from a muddy pond in the foreground, ink-wash "
     f"gradient shading, generous negative space"),
    ("v3_C5_晨光从容", "16:9",
     f"{SKETCH}. Content: a pencil-sketch figure standing relaxed and at ease in soft "
     f"morning light, shoulders open, gentle smile, a quiet garden and rolling hills "
     f"behind, warm serene atmosphere with birds in the sky"),
]

def gen(name, aspect, prompt):
    req = urllib.request.Request(f"{base}/image_generation",
        data=json.dumps({"model": "image-01", "prompt": prompt, "aspect_ratio": aspect,
                         "response_format": "url"}).encode(),
        headers={"Authorization": f"Bearer {keys['MINIMAX_KEY']}", "Content-Type": "application/json"},
        method="POST")
    r = json.loads(urllib.request.urlopen(req, timeout=300).read())
    br = r.get("base_resp", {})
    if br.get("status_code") != 0:
        raise RuntimeError(br.get("status_msg"))
    url = r["data"]["image_urls"][0]
    out = OUT / f"{name}.png"
    req2 = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    out.write_bytes(urllib.request.urlopen(req2, timeout=180).read())
    print(f"✓ {name}", flush=True)

failed = []
for name, aspect, prompt in JOBS:
    try:
        gen(name, aspect, prompt)
    except Exception as e:
        print(f"✗ {name}: {str(e)[:100]}", flush=True)
        failed.append(name)
print(f"RESULT: 完成 {len(JOBS) - len(failed)}/{len(JOBS)} 失败={failed}", flush=True)
