"""英国绅士教授形象设计 —— NB21 四款候选（50 岁，福尔摩斯式英伦学者气质）。"""
import sys, json, time, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["WUYIN_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/gentleman")
OUT.mkdir(parents=True, exist_ok=True)

COMMON = ("cinematic photorealistic portrait, 16:9, shallow depth of field, "
          "warm Victorian atmosphere, natural skin texture, film still quality")

CANDIDATES = [
    ("A_tweed_pipe",
     f"Distinguished British gentleman professor, around 50 years old, silver-grey hair "
     f"combed back, neatly trimmed short grey beard, sharp intelligent eyes, high "
     f"cheekbones, wearing a tailored dark brown tweed three-piece suit with a gold "
     f"watch chain, white shirt and deep red tie, seated in a leather wingback armchair "
     f"in a Victorian study — tall bookshelves, crackling fireplace, brass lamp glow — "
     f"holding a smoking pipe thoughtfully, Sherlock Holmes-like scholarly gravitas, {COMMON}"),
    ("B_cleanshaven_cravat",
     f"Distinguished British gentleman professor, around 50 years old, clean-shaven "
     f"angular face, dark hair with grey at the temples swept back, piercing "
     f"grey-blue eyes, wearing a charcoal wool coat with a silk cravat and brocade "
     f"waistcoat, standing before a mahogany desk with open folios and brass "
     f"instruments in a Victorian library, gaslight and candle glow, Sherlock "
     f"Holmes-like analytical intensity, {COMMON}"),
    ("C_glasses_tweed",
     f"British gentleman professor, around 50 years old, neatly trimmed grey beard, "
     f"round brass-rimmed spectacles, wearing a herringbone tweed jacket with leather "
     f"elbow patches, knitted tie and pocket square, seated at a writing desk with a "
     f"fountain pen, ink pot and stacked leather books, warm window light through "
     f"leaded glass in a Victorian college room, gentle wise expression, {COMMON}"),
    ("D_foggy_street",
     f"British gentleman professor, around 50 years old, silver-grey moustache, wearing "
     f"a long dark wool overcoat, dark fedora hat and leather gloves, long scarf, "
     f"walking on a foggy Victorian London cobblestone street at dusk — gas lamps, "
     f"horse carriage silhouettes, warm shop windows, mysterious elegant atmosphere, "
     f"Sherlock Holmes-like presence, {COMMON}"),
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
for name, prompt in CANDIDATES:
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

print(f"RESULT: 完成 {len(done)}/{len(CANDIDATES)} 失败={failed or '无'}", flush=True)
