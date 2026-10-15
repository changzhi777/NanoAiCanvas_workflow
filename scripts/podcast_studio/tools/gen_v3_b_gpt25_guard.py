"""守卫：轮询速创 GPT-Image-2.5 恢复 → 自动出 B 系列 no-text 横版图卡。"""
import sys, json, time, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["WUYIN_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/cards_v3")

SKETCH = ("hand-drawn pencil sketch on warm off-white paper, graphite linework with subtle "
          "gold and soft purple accents, diagram arrows and empty framed note boxes with "
          "blank space for labels, educational knowledge-card composition, ABSOLUTELY NO "
          "text, no letters, no characters, no words anywhere, all labels left blank")

JOBS = [
    ("v3_B1_劳动法则终结_gpt25", "16:9",
     f"{SKETCH}. Content: a pencil-sketch humanoid robot on the left carrying tools and "
     f"documents, a seated human figure standing aside on the right, one large arrow "
     f"pointing from the robot toward a big empty framed box"),
    ("v3_B2_价值支点崩塌_gpt25", "16:9",
     f"{SKETCH}. Content: a pencil-sketch human figure standing on a tall cracking stone "
     f"pillar breaking beneath his feet, two small empty framed note boxes floating on "
     f"either side"),
    ("v3_B3_向外转向内_gpt25", "16:9",
     f"{SKETCH}. Content: a U-turn path arrow flowing like a river — upper branch past tiny "
     f"sketches of office desks and machines, bending down into a quiet valley where a "
     f"small figure meditates cross-legged"),
    ("v3_B4_觉知不可替代_gpt25", "16:9",
     f"{SKETCH}. Content: left a pencil-sketch robot head filled with circuit patterns, "
     f"right a serene human face with a soft radiant halo, a thin vertical divider and a "
     f"small empty balance-scale doodle at the bottom"),
    ("v3_B5_心灯相传_gpt25", "16:9",
     f"{SKETCH}. Content: a receding row of hand-drawn paper lanterns, the first lit by a "
     f"human hand passing its flame to the next, the chain stretching into the distance"),
]

def post(path, payload, timeout=60):
    req = urllib.request.Request(f"{base}{path}", data=json.dumps(payload).encode(),
        headers={"Authorization": keys["WUYIN_KEY"], "Content-Type": "application/json"}, method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read())

def probe():
    try:
        r = post("/api/async/image_gpt_2.5_flare", {"prompt": "probe"})
        return r.get("code")
    except Exception as e:
        return f"ERR {str(e)[:40]}"

# 等恢复
for i in range(12):   # 12 × 10min = 2h
    c = probe()
    print(f"[{i}] flare code={c}", flush=True)
    if c == 200:
        break
    time.sleep(600)
else:
    print("GUARD-EXPIRED: 2h 内未恢复", flush=True)
    sys.exit(2)

print("GPT-Image-2.5 已恢复，出 B 系列（gpt25 横版）…", flush=True)
failed = []
for name, aspect, prompt in JOBS:
    out = OUT / f"{name}.png"
    if out.exists():
        continue
    try:
        r = post("/api/async/image_gpt_2.5_flare",
                 {"prompt": prompt, "aspectRatio": "1280*720", "quality": "medium"})
        if r.get("code") != 200:
            raise RuntimeError(r.get("msg", ""))
        uid = r["data"]["id"]
        t0 = time.time()
        url = None
        while time.time() - t0 < 300:
            time.sleep(5)
            q = urllib.request.Request(f"{base}/api/async/detail?id={uid}",
                headers={"Authorization": keys["WUYIN_KEY"]})
            d = json.loads(urllib.request.urlopen(q, timeout=30).read()).get("data", {})
            if d.get("status") == 2:
                res = d.get("result", {})
                url = res if isinstance(res, str) else (res[0] if isinstance(res, list) and res else res.get("url"))
                break
            if d.get("status") not in (0, 1):
                raise RuntimeError(f"status={d.get('status')}")
        if not url:
            raise TimeoutError(name)
        out.write_bytes(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=180).read())
        print(f"✓ {name}", flush=True)
    except Exception as e:
        print(f"✗ {name}: {str(e)[:90]}", flush=True)
        failed.append(name)
print(f"RESULT: 完成 {len(JOBS)-len(failed)}/{len(JOBS)} 失败={failed}", flush=True)
