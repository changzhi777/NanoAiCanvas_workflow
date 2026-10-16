"""Henry VIII 都铎历史知识卡 —— NanoBanana2.1 Holbein 油画风（Henry 锚图溶图 + English label）。

对应脚本 seg1-8 中段八卡（seg3 六王后另有 cards_queens/ 竖版连播）。
"""
import sys, json, time, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["WUYIN_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/cards_tudor")
OUT.mkdir(parents=True, exist_ok=True)
ANCHOR = "https://nanoai-tvc-hk-1418512491.cos.ap-hongkong.myqcloud.com/tvc/digital-human/henry8_anchor_16x9.png"

REF = ("the same Tudor king from the reference image — heavyset, bearded, flat Tudor cap, "
       "crimson and gold doublet with fur trim")
STYLE = ("Renaissance Tudor scene in the style of Hans Holbein the Younger, rich oil "
         "painting, jewel tones, intricate Tudor costume, dramatic period lighting, "
         "museum masterpiece quality, with a small handwritten English label at the bottom")

JOBS = [
    ("tudor_1_renaissance_prince",
     f"Epic Tudor tournament: {REF} as a younger prince in gilded armor on a rearing "
     f"warhorse, lance couched, jousting before a roaring crowd in a Renaissance "
     f"tiltyard, Tudor rose banners streaming, golden afternoon light, "
     f"{STYLE}: The Renaissance Prince"),
    ("tudor_2_break_with_rome",
     f"Dramatic scene: {REF} standing tall tearing a great papal parchment scroll, "
     f"behind him monasteries silhouetted against a stormy burning sky, monks fleeing, "
     f"thunder and chiaroscuro light, {STYLE}: Break with Rome"),
    ("tudor_3_six_wives",
     f"Majestic palace gallery: {REF} standing proudly at center, flanked by six framed "
     f"full-length queen portraits along the marble wall, candlelight, regal "
     f"composition, {STYLE}: Six Wives"),
    ("tudor_4_price_of_defiance",
     f"Somber dawn at the Tower of London: a wooden scaffold draped in black, an "
     f"executioner's axe gleaming, solemn Tudor courtiers in mist, ravens circling the "
     f"tower, muted cold light, {STYLE}: The Price of Defiance"),
    ("tudor_5_father_of_navy",
     f"Grand maritime scene: {REF} on the deck of a great Tudor warship with towering "
     f"castles at bow and stern, cannons arrayed, the sea behind, full sails, dramatic "
     f"sky, {STYLE}: Father of the Navy"),
    ("tudor_6_aging_tyrant",
     f"Dark intimate scene: {REF} now aged and massively fat upon his throne, wrapped "
     f"in heavy fur robes, paranoid suspicious gaze, shadowy courtiers shrinking away "
     f"in candlelit gloom, oppressive chiaroscuro, {STYLE}: The Aging Tyrant"),
    ("tudor_7_immortal_image",
     f"The artist's studio: Holbein the Younger at his easel painting the famous "
     f"full-length portrait of {REF}, pigment jars and sketches around, warm light "
     f"through a tall window, {STYLE}: The Immortal Image"),
    ("tudor_8_time_judges",
     f"Emblematic scene, no people: an empty ornate Tudor throne in a vast dark hall, a "
     f"golden crown resting on the stone steps, a great hourglass glowing in a shaft of "
     f"pale light from a high window, dust motes, {STYLE}: Time Judges Kings"),
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
