"""锂篇母卡生成 —— NB21 手绘科普风 16:9 2K（9 张，无文字）。"""
import sys, json, time, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["WUYIN_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/lithium_science/cards")
OUT.mkdir(parents=True, exist_ok=True)

STYLE = ("Hand-drawn children's science illustration on warm off-white paper, clean ink "
         "line art with soft watercolor fills, beige background with subtle chemistry "
         "doodles (atoms, flask outlines), warm friendly educational picture-book style, "
         "16:9 composition, ABSOLUTELY NO text, no letters, no words, no numbers anywhere.")

JOBS = [
    ("S0_hero",
     f"{STYLE} A single shiny silver lithium metal chunk floating in mid-air above a soft warm "
     f"beige void, gentle golden light from above, faint atom-orbit doodles around it, tiny "
     f"dust particles, centered composition, generous negative space."),
    ("S1_element",
     f"{STYLE} A silver lithium metal chunk displayed on a small round wooden pedestal, soft "
     f"spotlight, warm paper background with faint grid doodles like a periodic table, "
     f"centered, calm and iconic."),
    ("S2_discovery",
     f"{STYLE} A 19th-century Swedish chemist's wooden desk: a lump of petalite mineral, an open "
     f"handwritten notebook, a brass oil lamp, glass vials, a quill pen, warm candlelight, "
     f"cozy and scholarly."),
    ("S3_density",
     f"{STYLE} A clear glass beaker of pale blue water with a small silver lithium piece "
     f"floating on the surface at the left, and a dark iron block sunk at the bottom at the "
     f"right, side-by-side comparison, simple doodled arrows between them, no text."),
    ("S4_cut",
     f"{STYLE} Close-up: a silver lithium chunk resting on a white paraffin block, a small "
     f"knife slicing a thin piece, the fresh cut surface gleaming mirror-bright, tiny shavings, "
     f"warm light, shallow depth of field illustrated."),
    ("S6_equation_bg",
     f"{STYLE} Warm off-white paper background with faint molecule doodles and thin arrows, a "
     f"large empty central area reserved for text, very subtle watercolor wash, minimal."),
    ("S7_battery",
     f"{STYLE} A cutaway illustration of a lithium-ion battery pack with cylindrical cells, and "
     f"a small electric car silhouette beside it, clean diagram style, warm colors, no text."),
    ("S7_storage",
     f"{STYLE} A large grid-scale battery energy storage station with rows of container units "
     f"beside a city skyline at dusk, wind turbines in the distance, warm light, hand-drawn."),
    ("S8_quote_bg",
     f"{STYLE} Soft warm paper background with a single small silver lithium chunk at the "
     f"bottom corner, gentle golden glow and floating dust motes, large empty space for a "
     f"quote, minimal and poetic."),
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
        done.append(name)
        continue
    for attempt in range(2):
        try:
            r = post("/api/async/NanoBanana2.1",
                     {"prompt": prompt, "aspectRatio": "16:9", "imageSize": "2K"})
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
