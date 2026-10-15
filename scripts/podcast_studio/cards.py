"""图文卡生成 — GPT-Image-2.5（速创）插画 + image-01-live 封面。

用法：
    from cards import build_cards
    cards = build_cards(timeline, cfg)   # → out/cards/card_XX.png + cover.png

经验纪律：提示词禁用 "exact same person from reference image" 类克隆措辞（内容过滤实证）。
"""
import json
import pathlib
import urllib.parse
import urllib.request

from get_keys import get_keys

HERE = pathlib.Path(__file__).parent


def _post_json(url: str, payload: dict, key: str) -> dict:
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=120).read())


def _post_form(url: str, fields: dict, key: str) -> dict:
    """速创基础版端点收 form 表单（JSON body 会被解析成空字段 → 报 KEY 不正确）。"""
    data = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(
        url, data=data,
        headers={"Authorization": key,
                 "Content-Type": "application/x-www-form-urlencoded"},
        method="POST")
    return json.loads(urllib.request.urlopen(req, timeout=120).read())


def _get_json(url: str, key: str) -> dict:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())


def _poll_detail(task_id: str, key: str, base: str, max_wait: int = 300) -> str:
    """速创异步任务轮询：status==2 成功 → 首个 URL。"""
    import time
    t0 = time.time()
    while time.time() - t0 < max_wait:
        time.sleep(5)
        try:
            d = _get_json(f"{base}/api/async/detail?id={task_id}", key).get("data", {})
        except Exception as e:
            print(f"    poll err: {e}")
            continue
        st = d.get("status")
        if st == 2:
            r = d.get("result", {})
            if isinstance(r, str):
                return r
            if isinstance(r, list) and r:
                return r[0] if isinstance(r[0], str) else r[0].get("url")
            if isinstance(r, dict):
                return r.get("url")
        if st not in (0, 1):
            raise RuntimeError(f"生图失败 status={st} {d.get('message', '')}")
    raise TimeoutError(f"生图超时 {max_wait}s task={task_id}")


def gen_card(prompt: str, cfg: dict, idx: int, out_dir: pathlib.Path) -> pathlib.Path:
    """单张插画，三通道 fallback：速创 flare → 速创基础版 → MiniMax image-01-live。

    速创两接口 2026-10 实测轮流维护；image-01-live 独立于其维护窗口。
    """
    keys = get_keys()
    wbase = keys["WUYIN_BASE"].rstrip("/")
    mbase = keys["MINIMAX_BASE"].rstrip("/")
    aspect = cfg["defaults"]["image"]["aspect"]

    errors = []
    # 1) 速创 flare（JSON，支持 quality）
    try:
        r = _post_json(f"{wbase}/api/async/image_gpt_2.5_flare",
                       {"prompt": prompt, "aspectRatio": aspect, "quality": "medium"},
                       keys["WUYIN_KEY"])
        if r.get("code") == 200:
            url = _poll_detail(r["data"]["id"], keys["WUYIN_KEY"], wbase)
            png = out_dir / f"card_{idx:02d}.png"
            _download(url, png)
            return png
        errors.append(f"flare: {r.get('msg')}")
    except Exception as e:
        errors.append(f"flare: {e}")

    # 2) 速创基础版（form）
    try:
        r = _post_form(f"{wbase}/api/async/image_gpt_2.5",
                       {"prompt": prompt, "aspectRatio": aspect}, keys["WUYIN_KEY"])
        if r.get("code") == 200:
            url = _poll_detail(r["data"]["id"], keys["WUYIN_KEY"], wbase)
            png = out_dir / f"card_{idx:02d}.png"
            _download(url, png)
            return png
        errors.append(f"gpt2.5: {r.get('msg')}")
    except Exception as e:
        errors.append(f"gpt2.5: {e}")

    # 3) MiniMax image-01-live（套餐内；9:16 不支持则回退 1:1，KenBurns 端裁切）
    for ar in ("9:16", "1:1"):
        try:
            r = _post_json(f"{mbase}/image_generation",
                           {"model": cfg["models"]["cover"], "prompt": prompt,
                            "aspect_ratio": ar, "response_format": "url"},
                           keys["MINIMAX_KEY"])
            png = out_dir / f"card_{idx:02d}.png"
            _download(r["data"]["image_urls"][0], png)
            if ar == "1:1":
                print(f"    card#{idx:02d} image01 仅 1:1（合成端裁切）")
            return png
        except Exception as e:
            errors.append(f"image01({ar}): {e}")

    raise RuntimeError(f"生图三通道全挂 card#{idx}: {'; '.join(errors)}")


def gen_cover(title: str, style_visual: str, cfg: dict, out_dir: pathlib.Path) -> pathlib.Path | None:
    """封面：MiniMax image-01-live（套餐内）。失败不阻断（返回 None）。"""
    try:
        keys = get_keys()
        prompt = (f"Podcast cover art, no text. Theme: {title}. "
                  f"Style: {style_visual}")
        r = _post_json(f"{keys['MINIMAX_BASE'].rstrip('/')}/image_generation",
                       {"model": cfg["models"]["cover"], "prompt": prompt,
                        "aspect_ratio": "9:16", "response_format": "url"},
                       keys["MINIMAX_KEY"])
        url = r["data"]["image_urls"][0]
        png = out_dir / "cover.png"
        _download(url, png)
        return png
    except Exception as e:
        print(f"    封面生成跳过: {e}")
        return None


def _download(url: str, path: pathlib.Path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    path.write_bytes(urllib.request.urlopen(req, timeout=120).read())


def build_cards(timeline: dict, cfg: dict) -> list[str]:
    """生成插画卡；返回路径列表。

    单口播：逐句一卡（与 timeline.lines 对齐）；
    对谈：按 groups 分组一卡（每 4 句一卡，防图数爆炸）。
    """
    out_dir = HERE / "out" / "cards"
    out_dir.mkdir(parents=True, exist_ok=True)
    style_visual = cfg["styles"][cfg["defaults"]["style"]]["visual"].strip().replace("\n", " ")

    groups = timeline.get("groups")
    if groups:  # 对谈模式
        paths = []
        for g in groups:
            png = out_dir / f"group_{g['card']:02d}.png"
            if not png.exists():
                prompt = f"{g['visual_hint']}, {style_visual}" if g["visual_hint"] else style_visual
                print(f"  卡组 #{g['card']:02d}（{len(g['lines'])} 句）生成中…")
                gen_card(prompt, cfg, g["card"], out_dir).rename(png)  # card_XX → group_XX
            paths.append(str(png))
            print(f"  ✓ 卡组 #{g['card']:02d}")
        if not (out_dir / "cover.png").exists():
            print("  封面生成中…")
            gen_cover(timeline.get("title", ""), style_visual, cfg, out_dir)
        return paths

    paths = []
    for e in timeline["lines"]:
        png = out_dir / f"card_{e['id']:02d}.png"
        if not png.exists():  # 断点续跑
            prompt = f"{e['visual_hint']}, {style_visual}" if e["visual_hint"] else style_visual
            print(f"  卡 #{e['id']:02d} 生成中…")
            gen_card(prompt, cfg, e["id"], out_dir)
        paths.append(str(png))
        print(f"  ✓ 卡 #{e['id']:02d}")

    if not (out_dir / "cover.png").exists():
        print("  封面生成中…")
        gen_cover(timeline.get("title", ""), style_visual, cfg, out_dir)
    return paths


if __name__ == "__main__":
    import yaml
    cfg = yaml.safe_load(open(HERE / "config.yaml", encoding="utf-8"))
    tl = json.loads((HERE / "out" / "timeline.json").read_text(encoding="utf-8"))
    paths = build_cards(tl, cfg)
    print(f"✓ 图文卡 {len(paths)} 张 → {HERE}/out/cards/")
