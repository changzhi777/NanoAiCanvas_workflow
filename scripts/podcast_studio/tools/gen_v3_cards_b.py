"""V3 B 系列 —— 手绘知识图卡（no-text 留白版，标注由字幕层承担）。"""
import sys, json, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["MINIMAX_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/cards_v3")
OUT.mkdir(parents=True, exist_ok=True)

SKETCH = ("hand-drawn pencil sketch on warm off-white paper, graphite linework with subtle "
          "gold and soft purple accents, diagram arrows and empty framed note boxes with "
          "blank space for labels, educational knowledge-card composition, ABSOLUTELY NO "
          "text, no letters, no characters, no words anywhere, all labels left blank")

JOBS = [
    ("v3_B1_劳动法则终结_blank", "16:9",
     f"{SKETCH}. Content: a pencil-sketch humanoid robot on the left carrying tools and "
     f"documents, a seated human figure standing aside on the right, one large arrow "
     f"pointing from the robot toward a big empty framed box"),
    ("v3_B2_价值支点崩塌_blank", "16:9",
     f"{SKETCH}. Content: a pencil-sketch human figure standing on a tall cracking stone "
     f"pillar that is breaking beneath his feet, two small empty framed note boxes floating "
     f"on either side"),
    ("v3_B3_向外转向内_blank", "16:9",
     f"{SKETCH}. Content: a U-turn path arrow flowing like a river — the upper branch "
     f"passes tiny sketches of office desks and machines, then bends down into a quiet "
     f"valley where a small figure meditates cross-legged"),
    ("v3_B4_觉知不可替代_blank", "16:9",
     f"{SKETCH}. Content: left side a pencil-sketch robot head filled with circuit patterns, "
     f"right side a serene human face with a soft radiant halo, a thin vertical divider "
     f"between them and a small empty balance-scale doodle at the bottom"),
    ("v3_B5_心灯相传_blank", "16:9",
     f"{SKETCH}. Content: a receding row of hand-drawn paper lanterns, the first one lit by "
     f"a human hand passing its flame to the next, the chain of glowing lanterns stretching "
     f"into the far distance"),
]

def gen(name, aspect, prompt, model="image-01"):
    req = urllib.request.Request(f"{base}/image_generation",
        data=json.dumps({"model": model, "prompt": prompt, "aspect_ratio": aspect,
                         "response_format": "url"}).encode(),
        headers={"Authorization": f"Bearer {keys['MINIMAX_KEY']}", "Content-Type": "application/json"},
        method="POST")
    r = json.loads(urllib.request.urlopen(req, timeout=300).read())
    br = r.get("base_resp", {})
    if br.get("status_code") != 0:
        raise RuntimeError(f"{name}: {br.get('status_msg')}")
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
print(f"完成 {len(JOBS) - len(failed)}/{len(JOBS)}，失败: {failed or '无'}", flush=True)
