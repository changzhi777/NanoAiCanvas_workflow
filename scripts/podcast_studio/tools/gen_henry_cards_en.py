"""Henry VIII 知识图卡 —— NanoBanana2.1 手绘素描 + English labels（Henry 锚图溶图）。"""
import sys, json, time, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["WUYIN_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/cards_henry_en")
OUT.mkdir(parents=True, exist_ok=True)
ANCHOR = f"{base.rsplit('/api', 1)[0]}/v1" if False else "https://nanoai-tvc-hk-1418512491.cos.ap-hongkong.myqcloud.com/tvc/digital-human/henry8_anchor_16x9.png"

MAN = ("the same Tudor king from the reference image — a heavyset English king in his "
       "forties with a beard, wearing a flat Tudor cap with feather and a rich crimson "
       "and gold doublet with fur trim and gold chains — rendered as a pencil-sketch "
       "figure inside the drawing")
SKETCH = ("hand-drawn pencil sketch on warm off-white parchment, graphite linework with "
          "subtle gold accents, diagram arrows and empty framed note boxes, educational "
          "knowledge-card composition in Renaissance manuscript style, ABSOLUTELY NO text, "
          "no letters, no words anywhere")

JOBS = [
    ("en_B1_机器接管劳动",
     f"{SKETCH}. Content: a pencil-sketch humanoid robot on the left carrying tools and "
     f"documents, and on the right {MAN} seated calmly watching it work, one large arrow "
     f"pointing from the robot toward a big empty framed box"),
    ("en_B2_价值支点崩塌",
     f"{SKETCH}. Content: {MAN} standing on a tall cracking stone throne that is breaking "
     f"beneath him, two small empty framed note boxes floating on either side of him"),
    ("en_C1_虚拟世界玻璃幕",
     f"{SKETCH}. Content: crowds of small Tudor-era pencil-sketch figures wearing glowing "
     f"VR headsets, immersed in floating screens, a transparent glass wall separating them "
     f"from the dim Tudor court behind"),
    ("en_C2_镜前自问",
     f"{SKETCH}. Content: {MAN} sitting before an old standing mirror in a candlelit Tudor "
     f"chamber, looking into his own eyes, a large empty thought bubble above with a "
     f"question-mark doodle, two small empty framed note boxes"),
    ("en_B3_从向外到向内",
     f"{SKETCH}. Content: a U-turn path arrow flowing like a river — the upper branch "
     f"passes tiny sketches of Tudor courtiers and jesters, then bends down into a quiet "
     f"chapel where {MAN} kneels in prayer"),
    ("en_C3_静水觉知",
     f"{SKETCH}. Content: {MAN} in Tudor dress meditating cross-legged on perfectly still "
     f"water, radiating ripple rings of awareness around him, a bright sun of awareness "
     f"above his crowned head"),
    ("en_B4_觉知不可替代",
     f"{SKETCH}. Content: left side a pencil-sketch robot head filled with circuit "
     f"patterns, right side the bearded face of {MAN} with a soft radiant halo, a thin "
     f"vertical divider between them and a small empty balance-scale doodle at the bottom"),
    ("en_C4_本自圆满",
     f"{SKETCH}. Content: clouds parting to reveal a clear full moon over the Thames, a "
     f"Tudor rose in full bloom in the foreground, ink-wash gradient shading, generous "
     f"negative space"),
    ("en_C5_晨光从容",
     f"{SKETCH}. Content: {MAN} in Tudor dress standing relaxed and at ease in soft "
     f"morning light over a quiet English garden, rolling hills behind, warm serene "
     f"atmosphere with birds in the sky"),
]

def post(path, payload, timeout=90):
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
    for attempt in range(2):
        try:
            r = post("/api/async/NanoBanana2.1",
                     {"prompt": prompt, "aspectRatio": "16:9", "imageSize": "2K",
                      "urls": ANCHOR})
            if r.get("code") != 200:
                raise RuntimeError(r.get("msg", ""))
            url = poll(r["data"]["id"])
            download(url, out)
            done.append(name)
            print(f"✓ {name}", flush=True)
            break
        except Exception as e:
            print(f"✗ {name} (attempt {attempt+1}): {str(e)[:90]}", flush=True)
            if attempt == 1:
                failed.append(name)
            time.sleep(5)

print(f"RESULT: 完成 {len(done)}/{len(JOBS)} 失败={failed or '无'}", flush=True)
