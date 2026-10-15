"""爆点视频 — 让首尾插画"动起来"（Hailuo-02 首帧锚定 / S2V-01 主体参照）。

通道优先级：
  1. Hailuo-02 first_frame_image（首帧锚定，图生视频 6s）
  2. S2V-01 subject_reference（配了 hero.character_ref 时启用；仅支持单主体）
  3. 速创 H3 首帧锚定（兜底，4-15s）

用法：
    from hero_shot import gen_hero
    path = gen_hero("out/cards/card_00.png", "slow push-in, dust motes drift, ...", cfg, out)

契约要点（2026-10-15 官方文档实测）：
  - S2V-01: subject_reference=[{"type":"character","image":["<url>"]}]，prompt ≤2000，prompt_optimizer 设 false
  - 轮询: GET /query/video_generation?task_id= → Success 得 file_id
          GET /files/retrieve?file_id=&purpose=video_generation → download_url
"""
import base64
import json
import pathlib
import time
import urllib.parse
import urllib.request

from get_keys import get_keys

HERE = pathlib.Path(__file__).parent


def _post(url: str, payload: dict, key: str) -> dict:
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=120).read())


def _get(url: str, key: str) -> dict:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())


def _data_url(png: pathlib.Path) -> str:
    """图片转 data URL（免上传，MiNiMax 接受 base64 内联）。"""
    return "data:image/png;base64," + base64.b64encode(png.read_bytes()).decode()


def _poll_video(task_id: str, key: str, base: str, max_wait: int = 900) -> str:
    """轮询到 Success → 取下载 URL。processing/success/failed 三态。"""
    t0 = time.time()
    while time.time() - t0 < max_wait:
        time.sleep(10)
        d = _get(f"{base}/query/video_generation?task_id={task_id}", key)
        st = d.get("status")
        if st == "Success":
            file_id = d.get("file_id")
            if not file_id:
                raise RuntimeError(f"Success 但无 file_id: {d}")
            r = _get(f"{base}/files/retrieve?file_id={file_id}&purpose=video_generation", key)
            url = r.get("file", {}).get("download_url", "")
            if not url:
                raise RuntimeError(f"无 download_url: {r}")
            return url
        if st == "Fail":
            raise RuntimeError(f"视频生成失败: {d.get('base_resp', {}).get('status_msg')}")
        print(f"    hero 生成中 {int(time.time() - t0)}s…")
    raise TimeoutError(f"hero 超时 {max_wait}s task={task_id}")


def gen_hero_suchuang(image_url: str, prompt: str, cfg: dict, out: pathlib.Path,
                      duration: int = 6, ratio: str = "16:9") -> pathlib.Path:
    """速创 H3 首帧锚定爆点（MiniMax 官方额度耗尽时的通道；image_url 需公网可访问）。"""
    import urllib.parse
    keys = get_keys()
    base = keys["WUYIN_BASE"].rstrip("/")
    body = {"prompt": prompt, "first_frame": image_url,
            "resolution": "768P",
            "duration": str(max(4, min(15, duration))), "ratio": ratio}
    req = urllib.request.Request(f"{base}/api/async/video_minimax_h3",
        data=json.dumps(body).encode(),
        headers={"Authorization": keys["WUYIN_KEY"], "Content-Type": "application/json"},
        method="POST")
    r = json.loads(urllib.request.urlopen(req, timeout=60).read())
    if r.get("code") != 200:
        raise RuntimeError(f"H3 提交失败: {r.get('msg')}")
    uid = r["data"]["id"]
    t0 = time.time()
    while time.time() - t0 < 900:
        time.sleep(10)
        q = urllib.request.Request(f"{base}/api/async/detail?id={uid}",
            headers={"Authorization": keys["WUYIN_KEY"]})
        d = json.loads(urllib.request.urlopen(q, timeout=30).read()).get("data", {})
        st = d.get("status")
        if st == 2:
            res = d.get("result", {})
            url = res if isinstance(res, str) else (res[0] if isinstance(res, list) and res else res.get("url"))
            out.parent.mkdir(parents=True, exist_ok=True)
            req2 = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            out.write_bytes(urllib.request.urlopen(req2, timeout=300).read())
            return out
        if st not in (0, 1):
            raise RuntimeError(f"H3 失败 status={st} {d.get('message','')}")
        print(f"    H3 生成中 {int(time.time()-t0)}s…")
    raise TimeoutError(f"H3 超时 900s task={uid}")


def gen_hero(image: str, prompt: str, cfg: dict, out: pathlib.Path) -> pathlib.Path:
    """生成一段爆点视频（默认 6s 竖屏）。失败抛异常（上层可跳过爆点）。"""
    keys = get_keys()
    base = keys["MINIMAX_BASE"].rstrip("/")
    img = pathlib.Path(image)
    hero_cfg = cfg.get("hero", {})
    char_ref = hero_cfg.get("character_ref")  # 有固定角色时走 S2V-01

    payload: dict
    if char_ref:
        payload = {
            "model": "S2V-01",
            "prompt": prompt,
            "prompt_optimizer": False,
            "subject_reference": [{"type": "character", "image": [char_ref]}],
        }
    else:
        payload = {
            "model": "MiniMax-Hailuo-02",
            "prompt": prompt,
            "prompt_optimizer": False,
            "first_frame_image": _data_url(img),
            "duration": 6,
            "resolution": hero_cfg.get("resolution", "768P"),
        }

    r = _post(f"{base}/video_generation", payload, keys["MINIMAX_KEY"])
    if r.get("base_resp", {}).get("status_code") != 0:
        raise RuntimeError(f"hero 提交失败: {r.get('base_resp', {}).get('status_msg')}")
    task_id = r.get("task_id")
    if not task_id:
        raise RuntimeError(f"hero 无 task_id: {r}")

    url = _poll_video(task_id, keys["MINIMAX_KEY"], base)
    out.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    out.write_bytes(urllib.request.urlopen(req, timeout=300).read())
    return out


if __name__ == "__main__":
    import sys
    import yaml

    cfg = yaml.safe_load(open(HERE / "config.yaml", encoding="utf-8"))
    img = sys.argv[1] if len(sys.argv) > 1 else str(HERE / "out" / "cards" / "card_00.png")
    prompt = (sys.argv[2] if len(sys.argv) > 2 else
              "Slow cinematic push-in, dust motes drifting in warm amber light, "
              "subtle parallax, documentary atmosphere")
    p = gen_hero(img, prompt, cfg, HERE / "out" / "hero_test.mp4")
    print(f"✓ hero → {p}")
