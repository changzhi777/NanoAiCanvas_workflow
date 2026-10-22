import sys, json, time, urllib.request, pathlib
sys.path.insert(0, "/Volumes/user/cz_code/NanoAiCanvas_workflow/scripts/podcast_studio")
from get_keys import get_keys
k = get_keys(); base = k["WUYIN_BASE"].rstrip("/")
B = "https://nanoai-tvc-hk-1418512491.cos.ap-hongkong.myqcloud.com/tvc/digital-human"
OUT = pathlib.Path(".")
prompt = ("Helix shot: the camera orbits about 150 degrees around the floating silver lithium "
          "chunk while continuously rising and tilting slightly downward, the chunk stays "
          "centered in frame, warm beige paper void with faint atom-orbit doodles and soft dust "
          "particles, smooth gimbal move, cinematic and steady. Keep the exact hand-drawn "
          "children's science illustration style: warm paper texture, ink line art, soft "
          "watercolor fills. Do not photorealize. Do not change the composition. Do not add "
          "objects. No text, letters, words or watermark.")
body = {"prompt": prompt, "first_frame": f"{B}/lithium_hero_card.png",
        "resolution": "768P", "duration": "15", "ratio": "16:9"}
req = urllib.request.Request(f"{base}/api/async/video_minimax_h3", data=json.dumps(body).encode(),
    headers={"Authorization": k["WUYIN_KEY"], "Content-Type": "application/json"}, method="POST")
r = json.loads(urllib.request.urlopen(req, timeout=60).read())
assert r.get("code") == 200, r.get("msg")
uid = r["data"]["id"]; print("提交:", uid, flush=True)
t0=time.time()
while time.time()-t0<1500:
    time.sleep(15)
    q=urllib.request.Request(f"{base}/api/async/detail?id={uid}",headers={"Authorization":k["WUYIN_KEY"]})
    d=json.loads(urllib.request.urlopen(q,timeout=30).read()).get("data",{})
    if d.get("status")==2:
        res=d.get("result",{}); url=res if isinstance(res,str) else (res[0] if isinstance(res,list) and res else res.get("url"))
        req2=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
        (OUT/"h3_helix.mp4").write_bytes(urllib.request.urlopen(req2,timeout=300).read())
        print("✓ h3_helix.mp4",flush=True); break
    if d.get("status") not in (0,1): raise RuntimeError(d.get("message"))
    print(int(time.time()-t0),"s",flush=True)
