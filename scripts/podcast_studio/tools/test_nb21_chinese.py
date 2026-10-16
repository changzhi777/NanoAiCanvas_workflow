"""NanoBanana2.1 中文文字渲染测试 —— 手绘知识卡 + 中文标注。"""
import sys, json, time, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["WUYIN_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/cards_v3_nb21")

PROMPT = ("hand-drawn pencil sketch educational knowledge card on warm off-white paper. "
          "Large handwritten Chinese title at top center: 机器接管劳动. Below: three "
          "hand-drawn sketch vignettes in a horizontal row — a humanoid robot carrying "
          "boxes, a robotic arm assembling, a computer with floating documents. Under each "
          "vignette a small handwritten Chinese label: 体力劳动, 脑力工作, 全部接管. "
          "Graphite linework with subtle gold accents, framed border, educational "
          "knowledge-card composition, warm off-white paper")

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
            raise RuntimeError(f"status={st}")
    raise TimeoutError(uid)

r = post("/api/async/NanoBanana2.1", {"prompt": PROMPT, "aspectRatio": "16:9", "imageSize": "2K"})
assert r.get("code") == 200, f"提交失败: {r.get('msg')}"
url = poll(r["data"]["id"])
out = OUT / "test_中文渲染.png"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
out.write_bytes(urllib.request.urlopen(req, timeout=180).read())
print(f"✓ {out}")
