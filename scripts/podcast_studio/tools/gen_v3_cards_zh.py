"""V3 图卡全量 —— NanoBanana2.1 手绘知识卡（中文标注图文结合版）。"""
import sys, json, time, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["WUYIN_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/cards_v3_nb21_zh")
OUT.mkdir(parents=True, exist_ok=True)

STYLE = ("hand-drawn pencil sketch educational knowledge card on warm off-white paper, "
         "graphite linework with subtle gold accents, framed decorative border, "
         "educational knowledge-card composition")

JOBS = [
    ("zh_B1_机器接管劳动",
     f"{STYLE}. Large handwritten Chinese title at top center: 机器接管劳动. Below: three "
     f"hand-drawn sketch vignettes in a horizontal row — a humanoid robot carrying boxes, a "
     f"robotic arm assembling, a computer with floating documents. Under each vignette a "
     f"small handwritten Chinese label: 体力劳动, 脑力工作, 全部接管"),
    ("zh_B2_价值支点的崩塌",
     f"{STYLE}. Large handwritten Chinese title at top center: 价值支点的崩塌. Center: a "
     f"pencil-sketch human figure standing on a tall cracking stone pillar that is breaking "
     f"beneath his feet, looking down anxiously. Two handwritten Chinese labels floating on "
     f"either side: left label 被需要、能干活, right label 凭什么存在？"),
    ("zh_C1_虚拟世界的玻璃幕",
     f"{STYLE}. Large handwritten Chinese title at top center: 虚拟世界的玻璃幕. Content: "
     f"crowds of small pencil-sketch figures wearing large VR headsets immersed in glowing "
     f"floating screens, a transparent glass wall separating them from the dim real world "
     f"behind. Two handwritten Chinese labels: left 即时快感, right 隔着玻璃"),
    ("zh_C2_直面自己",
     f"{STYLE}. Large handwritten Chinese title at top center: 直面自己. Content: a single "
     f"pencil-sketch figure sitting before an old standing mirror in a dim quiet room, "
     f"looking into their own eyes, a large empty thought bubble above. One handwritten "
     f"Chinese label below: 剥去身份，我是谁？"),
    ("zh_B3_从向外到向内",
     f"{STYLE}. Large handwritten Chinese title at top center: 从向外到向内. Content: a "
     f"U-turn path arrow flowing like a river — upper branch passes tiny sketches of office "
     f"desks and machines labeled 向外劳碌, then bends down into a quiet valley where a "
     f"small figure meditates labeled 向内探索"),
    ("zh_C3_安静觉察",
     f"{STYLE}. Large handwritten Chinese title at top center: 安静觉察. Content: a "
     f"pencil-sketch figure meditating cross-legged on perfectly still water, radiating "
     f"ripple rings, a bright sun of awareness above the head. Two handwritten Chinese "
     f"labels: 谁在感受, 谁在清醒"),
    ("zh_B4_觉知不可替代",
     f"{STYLE}. Large handwritten Chinese title at top center: 觉知不可替代. Content: left "
     f"side a pencil-sketch robot head with circuit patterns labeled 机器模拟一切, right "
     f"side a serene human face with a soft radiant halo labeled 清醒的觉察"),
    ("zh_C4_本自圆满",
     f"{STYLE}. Large handwritten Chinese title at top center: 本自圆满. Content: clouds "
     f"parting to reveal a clear full moon over still water, a white lotus flower emerging "
     f"clean from a muddy pond. Two handwritten Chinese labels: 喧嚣褪去, 清明显现"),
    ("zh_C5_只为成为自己",
     f"{STYLE}. Large handwritten Chinese title at top center: 只为成为自己. Content: a "
     f"pencil-sketch figure standing relaxed in soft morning light, shoulders open, gentle "
     f"smile. Three handwritten Chinese labels below: 变软, 变稳, 变从容"),
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
