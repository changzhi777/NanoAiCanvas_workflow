"""V3 B 系列 ref 版 —— 手绘知识图卡 + 胡总素描形象融合（subject_reference）。"""
import sys, json, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys

keys = get_keys()
base = keys["MINIMAX_BASE"].rstrip("/")
OUT = pathlib.Path("/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio/out/cards_v3")
OUT.mkdir(parents=True, exist_ok=True)
ANCHOR = "https://nanoai-tvc-hk-1418512491.cos.ap-hongkong.myqcloud.com/tvc/digital-human/huzong_character_anchor.png"
MAN = ("the same middle-aged Chinese man from the reference photo — short cropped black "
       "hair, round friendly face, taupe stand-collar jacket — rendered as a pencil-sketch "
       "figure inside the drawing")

SKETCH = ("hand-drawn pencil sketch on warm off-white paper, graphite linework with subtle "
          "gold and soft purple accents, diagram arrows and empty framed note boxes, "
          "educational knowledge-card composition, ABSOLUTELY NO text, no letters, no "
          "words anywhere")

JOBS = [
    ("v3_B1_劳动法则终结_ref", "16:9",
     f"{SKETCH}. Content: a pencil-sketch humanoid robot on the left carrying tools and "
     f"documents, and on the right {MAN} seated calmly watching it work, one large arrow "
     f"pointing from the robot toward a big empty framed box"),
    ("v3_B2_价值支点崩塌_ref", "16:9",
     f"{SKETCH}. Content: {MAN} standing on a tall cracking stone pillar that is breaking "
     f"beneath his feet, two small empty framed note boxes floating on either side of him"),
    ("v3_B3_向外转向内_ref", "16:9",
     f"{SKETCH}. Content: a U-turn path arrow flowing like a river — the upper branch "
     f"passes tiny sketches of office desks and machines, then bends down into a quiet "
     f"valley where {MAN} sits meditating cross-legged"),
    ("v3_B4_觉知不可替代_ref", "16:9",
     f"{SKETCH}. Content: left side a pencil-sketch robot head filled with circuit "
     f"patterns, right side the serene face of {MAN} with a soft radiant halo, a thin "
     f"vertical divider between them and a small empty balance-scale doodle at the bottom"),
    ("v3_B5_心灯相传_ref", "16:9",
     f"{SKETCH}. Content: a receding row of hand-drawn paper lanterns — {MAN} holds the "
     f"first lantern and passes its flame to the next, the chain of glowing lanterns "
     f"stretching into the far distance"),
]

def gen(name, aspect, prompt):
    req = urllib.request.Request(f"{base}/image_generation",
        data=json.dumps({"model": "image-01", "prompt": prompt, "aspect_ratio": aspect,
                         "response_format": "url",
                         "subject_reference": [{"type": "character", "image_file": ANCHOR}]}).encode(),
        headers={"Authorization": f"Bearer {keys['MINIMAX_KEY']}", "Content-Type": "application/json"},
        method="POST")
    r = json.loads(urllib.request.urlopen(req, timeout=300).read())
    br = r.get("base_resp", {})
    if br.get("status_code") != 0:
        raise RuntimeError(br.get("status_msg"))
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
print(f"RESULT: 完成 {len(JOBS) - len(failed)}/{len(JOBS)} 失败={failed}", flush=True)
