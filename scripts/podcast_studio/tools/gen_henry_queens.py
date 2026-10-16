"""亨利八世六王后肖像 —— NanoBanana2.1 都铎肖像画风（English name label）。"""
import sys, json, time, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["WUYIN_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/cards_queens")
OUT.mkdir(parents=True, exist_ok=True)

STYLE = ("Renaissance Tudor royal portrait in the style of Hans Holbein the Younger, rich "
         "oil painting, jewel tones, intricate Tudor costume and jewellery, dark elegant "
         "background, museum masterpiece quality")

QUEENS = [
    ("queen1_catherine_aragon",
     "Portrait of Catherine of Aragon, first queen of Henry VIII of England: a dignified "
     "Spanish princess in her forties, pale skin, reddish-gold hair under an English gable "
     "hood, wearing a dark gown with ermine trim and a gold cross, holding a small book, "
     "serious pious expression, with a small handwritten English label at the bottom: "
     "Catherine of Aragon — Divorced"),
    ("queen2_anne_boleyn",
     "Portrait of Anne Boleyn, second queen of Henry VIII: an elegant dark-haired woman in "
     "her early thirties with striking dark eyes, wearing a French hood and a green Tudor "
     "gown with the falcon emblem brooch, a subtle confident smile with a shadow of fate, "
     "with a small handwritten English label at the bottom: Anne Boleyn — Beheaded"),
    ("queen3_jane_seymour",
     "Portrait of Jane Seymour, third queen of Henry VIII: a gentle pale English woman with "
     "light brown hair under a gable hood, wearing a pearl-adorned gown in soft ivory and "
     "gold, calm serene expression holding a small dog, with a small handwritten English "
     "label at the bottom: Jane Seymour — Died"),
    ("queen4_anne_of_cleves",
     "Portrait of Anne of Cleves, fourth queen of Henry VIII: a German princess with fair "
     "hair under an ornate headdress, wearing a rich gown of deep red and gold with "
     "elaborate sleeves, gentle dignified expression, with a small handwritten English "
     "label at the bottom: Anne of Cleves — Divorced"),
    ("queen5_catherine_howard",
     "Portrait of Catherine Howard, fifth queen of Henry VIII: a young vibrant English "
     "woman in her late teens, playful sparkling eyes, wearing a French hood and a rose-gold "
     "gown with jewels, laughing expression full of life, with a small handwritten English "
     "label at the bottom: Catherine Howard — Beheaded"),
    ("queen6_catherine_parr",
     "Portrait of Catherine Parr, sixth queen of Henry VIII: a wise mature English woman "
     "in her early thirties with auburn hair, wearing an elegant dark gown with silver "
     "embroidery and a French hood, intelligent warm expression holding a book, with a "
     "small handwritten English label at the bottom: Catherine Parr — Survived"),
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
for name, prompt in QUEENS:
    out = OUT / f"{name}.png"
    if out.exists():
        print(f"↷ {name} 已存在", flush=True)
        done.append(name)
        continue
    for attempt in range(2):
        try:
            r = post("/api/async/NanoBanana2.1",
                     {"prompt": prompt, "aspectRatio": "3:4", "imageSize": "2K"})
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

print(f"RESULT: 完成 {len(done)}/{len(QUEENS)} 失败={failed or '无'}", flush=True)
