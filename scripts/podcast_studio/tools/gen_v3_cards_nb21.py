"""V3 图卡 NanoBanana2.1 重制 —— 8 张（A3 对谈场景 + B5 手绘图卡，urls 参照）。"""
import sys, json, time, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["WUYIN_BASE"].rstrip("/")
B = "https://nanoai-tvc-hk-1418512491.cos.ap-hongkong.myqcloud.com/tvc/digital-human"
ANCHOR = f"{B}/huzong_open_anchor_16x9.png"      # 胡总近景讲解（A 系列参照）
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/cards_v3_nb21")
OUT.mkdir(parents=True, exist_ok=True)

IDENT = ("a middle-aged Chinese man about 50 years old, short cropped black hair, round "
         "friendly face, taupe stand-collar zip-up windbreaker, dark navy trousers")
SCENE = ("an intimate podcast studio living room: warm wooden wall panels, a beige fabric "
         "sofa, bookshelves and green plants softly blurred in the background, warm key "
         "light like a thoughtful video podcast interview")
MAN = ("the same middle-aged Chinese man from the reference photos — short cropped black "
       "hair, round friendly face, taupe stand-collar jacket — rendered as a pencil-sketch "
       "figure inside the drawing")
SKETCH = ("hand-drawn pencil sketch on warm off-white paper, graphite linework with subtle "
          "gold and soft purple accents, diagram arrows and empty framed note boxes, "
          "educational knowledge-card composition, ABSOLUTELY NO text, no letters, no words")

JOBS = [
    ("nb21_A1_全景讲解", True,
     f"Wide shot of a podcast recording scene: {IDENT} sits on the sofa in {SCENE}, "
     f"speaking with gentle hand gestures, three-quarter view, shallow depth of field"),
    ("nb21_A2_近景手势", True,
     f"Medium close-up of {IDENT} in {SCENE}, leaning slightly forward explaining a point "
     f"with both hands raised in a natural explanatory gesture, engaged warm expression"),
    ("nb21_A3_侧面机位", True,
     f"Side-angle shot of {IDENT} in {SCENE}, seated and speaking calmly, host's blurred "
     f"shoulder in the near foreground, intimate interview framing"),
    ("nb21_B1_劳动法则终结", True,
     f"{SKETCH}. Content: a pencil-sketch humanoid robot on the left carrying tools and "
     f"documents, and on the right {MAN} seated calmly watching it work, one large arrow "
     f"pointing from the robot toward a big empty framed box"),
    ("nb21_B2_价值支点崩塌", True,
     f"{SKETCH}. Content: {MAN} standing on a tall cracking stone pillar that is breaking "
     f"beneath his feet, two small empty framed note boxes floating on either side of him"),
    ("nb21_B3_向外转向内", True,
     f"{SKETCH}. Content: a U-turn path arrow flowing like a river — the upper branch "
     f"passes tiny sketches of office desks and machines, then bends down into a quiet "
     f"valley where {MAN} sits meditating cross-legged"),
    ("nb21_B4_觉知不可替代", True,
     f"{SKETCH}. Content: left side a pencil-sketch robot head filled with circuit "
     f"patterns, right side the serene face of {MAN} with a soft radiant halo, a thin "
     f"vertical divider between them and a small empty balance-scale doodle at the bottom"),
    ("nb21_B5_心灯相传", True,
     f"{SKETCH}. Content: a receding row of hand-drawn paper lanterns — {MAN} holds the "
     f"first lantern and passes its flame to the next, the chain of glowing lanterns "
     f"stretching into the far distance"),
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
for name, use_ref, prompt in JOBS:
    out = OUT / f"{name}.png"
    if out.exists():
        print(f"↷ {name} 已存在", flush=True)
        done.append(name)
        continue
    try:
        payload = {"prompt": prompt, "aspectRatio": "16:9", "imageSize": "2K"}
        if use_ref:
            payload["urls"] = ANCHOR
        r = post("/api/async/NanoBanana2.1", payload)
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
