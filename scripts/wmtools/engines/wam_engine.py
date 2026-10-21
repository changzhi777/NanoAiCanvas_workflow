"""engines.wam_engine — L2 图像深度引擎（Meta Watermark Anything，MPS/CPU）。

实测背书（维度十八）：JPG q60/q30、截屏 72%+q70、裁剪 15% 全部 bit 100%；
局部化 mask 支持篡改定位。三坑已封装：normalize 域转换、sigmoid mask、CPU 投票。

容量适配：32-bit 精简 ID = 项目 hash 高 8b + 序号 24b。
  完整 8B ID 存指纹库 rec['wam']（hex）；检测命中 4B → registry 关联取全 ID。

用法（模块级单例，首次调用加载 ~20s）：
    from engines.wam_engine import WamEngine
    e = WamEngine()
    e.embed("in.png", id8, "out.png")       # 注意：WAM 不含 RS 位流，id8 仅入库关联
    hit, key4b, detail = e.extract("out.png")
"""
from __future__ import annotations

import hashlib
import io
import pathlib
import sys

import torch

from engines.base import Engine, VENDOR, WEIGHTS, _torch_ok

WAM_REPO = VENDOR / "watermark-anything"
CKPT = WEIGHTS / "wam_mit.pth"
_model_cache = {}


def _pack32(id8: bytes, project: str) -> bytes:
    """32-bit 精简 ID：项目 hash 高 8b + ID 尾 24b（seq）。"""
    proj8 = int(hashlib.sha256(project.encode()).hexdigest(), 16) & 0xFF
    return bytes([proj8]) + id8[5:8]          # id8[5:8] = seq 3B


class WamEngine(Engine):
    name = "wam"
    tier = "deep"
    domain = "image"

    def __init__(self):
        self._wam = None

    def available(self) -> bool:
        return WAM_REPO.exists() and CKPT.exists() and _torch_ok()

    def unavailable_reason(self) -> str:
        miss = [w for w, c in [(str(WAM_REPO), WAM_REPO.exists()),
                               (str(CKPT), CKPT.exists()),
                               ("torch", _torch_ok())] if not c]
        return f"WAM 引擎缺失 {miss}——运行 bash setup_engines.sh"

    def _load(self):
        if self._wam is not None:
            return self._wam
        sys.path.insert(0, str(WAM_REPO))
        sys.path.insert(0, str(WAM_REPO / "notebooks"))
        import argparse
        import json
        import os
        from notebooks.inference_utils import load_model_from_checkpoint

        # params.json 的 configs/*.yaml 是相对路径 → 补全为 vendor 绝对路径
        params = json.loads((WAM_REPO / "checkpoints" / "params.json").read_text())
        for k, v in list(params.items()):
            if isinstance(v, str) and v.startswith("configs/"):
                params[k] = str(WAM_REPO / v)
        args = argparse.Namespace(**params)

        device = "mps" if torch.backends.mps.is_available() else "cpu"
        try:
            self._wam = _load_with_args(args, str(CKPT)).to(device).eval()
        except RuntimeError:                       # MPS 算子失败 → CPU
            device = "cpu"
            self._wam = _load_with_args(args, str(CKPT)).to(device).eval()
        self._device = device
        return self._wam



    # ---- 协议实现 ----
    def embed(self, src: str, wm_id: bytes, out: str, project: str = "default", **kw) -> str:
        import torch
        from PIL import Image
        from engines.notebooks_shim import default_transform, unnormalize_img

        wam = self._load()
        im = Image.open(src).convert("RGB")
        imgs = default_transform(im).unsqueeze(0).to(self._device)
        msg32 = _pack32(wm_id, project)
        bits = torch.tensor([[int(b) for b in format(int.from_bytes(msg32, "big"), "032b")]],
                            dtype=torch.float32).to(self._device)
        with torch.no_grad():
            outputs = wam.embed(imgs, bits)
        wm_pix = unnormalize_img(outputs["imgs_w"]).clamp(0, 1)
        arr = (wm_pix[0].permute(1, 2, 0).cpu().numpy() * 255).astype("uint8")
        Image.fromarray(arr).save(out)
        return out

    def extract(self, path: str) -> tuple[bool, bytes | None, dict]:
        import torch
        from PIL import Image
        from engines.notebooks_shim import default_transform
        from watermark_anything.data.metrics import msg_predict_inference

        wam = self._load()
        im = Image.open(path).convert("RGB")
        atk = default_transform(im).unsqueeze(0).to(self._device)
        with torch.no_grad():
            preds = wam.detect(atk)
        masks = torch.sigmoid(preds["preds"][:, 0:1])
        cover = float((masks > 0.5).float().mean())
        detail = {"mask_cover": round(cover, 2), "device": self._device}
        if cover < 0.05:                           # 无水印判定
            detail["note"] = "mask 覆盖近零"
            return False, None, detail
        # masked 投票（CPU：MPS 不支持 float64）
        bits_mean = msg_predict_inference(preds["preds"][:, 1:].cpu(), masks.cpu())
        bits = (bits_mean > 0.5)[0].cpu().numpy().astype(int)
        msg32 = int("".join(map(str, bits)), 2).to_bytes(4, "big")
        detail["msg32"] = msg32.hex()
        return True, msg32, detail



def _load_with_args(args, ckpt_path: str):
    """inference_utils.load_model_from_checkpoint 的参数化复制（configs 绝对路径）。"""
    import omegaconf
    from watermark_anything.models import Wam, build_embedder, build_extractor
    from watermark_anything.augmentation.augmenter import Augmenter
    from notebooks.inference_utils import normalize_img, unnormalize_img
    from watermark_anything.modules.jnd import JND

    embedder_cfg = omegaconf.OmegaConf.load(WAM_REPO / args.embedder_config)
    embedder_params = embedder_cfg[args.embedder_model]
    extractor_cfg = omegaconf.OmegaConf.load(WAM_REPO / args.extractor_config)
    extractor_params = extractor_cfg[args.extractor_model]
    augmenter_cfg = omegaconf.OmegaConf.load(WAM_REPO / args.augmentation_config)
    attenuation_cfg = omegaconf.OmegaConf.load(WAM_REPO / args.attenuation_config)

    embedder = build_embedder(args.embedder_model, embedder_params, args.nbits)
    extractor = build_extractor(extractor_cfg.model, extractor_params, args.img_size, args.nbits)
    augmenter = Augmenter(**augmenter_cfg)
    try:
        attenuation = JND(**attenuation_cfg[args.attenuation],
                          preprocess=unnormalize_img, postprocess=normalize_img)
    except Exception:
        attenuation = None

    wam = Wam(embedder, extractor, augmenter, attenuation, args.scaling_w, args.scaling_i)
    checkpoint = torch.load(ckpt_path, map_location="cpu")
    wam.load_state_dict(checkpoint)
    return wam

# ===================== 视频逐帧扩展（维度二十实测：crf30 三帧 100%）=====================

def embed_video(self, src: str, wm_id: bytes, out: str, project: str = "default",
                max_frames: int | None = None, crf: int = 18, **kw) -> str:
    """逐帧 WAM 嵌入视频（每帧独立完整 32-bit 水印，任意抽帧可验）。MPS/CPU 自动。"""
    import subprocess
    import av
    from PIL import Image
    from engines.notebooks_shim import default_transform, unnormalize_img

    wam = self._load()
    msg32 = _pack32(wm_id, project)
    bits = torch.tensor([[int(b) for b in format(int.from_bytes(msg32, "big"), "032b")]],
                        dtype=torch.float32).to(self._device)

    container = av.open(src)
    frames = []
    for i, frame in enumerate(container.decode(video=0)):
        if max_frames and i >= max_frames:
            break
        frames.append(frame.to_ndarray(format="rgb24"))
    fps = float(container.streams.video[0].average_rate or 24)
    container.close()

    wm_frames = []
    with torch.no_grad():
        for i, arr in enumerate(frames):
            im = Image.fromarray(arr)
            t = default_transform(im).unsqueeze(0).to(self._device)
            with torch.no_grad():
                o = wam.embed(t, bits)
            pix = unnormalize_img(o["imgs_w"]).clamp(0, 1)
            wm_frames.append((pix[0].permute(1, 2, 0).cpu().numpy() * 255).astype("uint8"))
            if i % 30 == 0:
                print(f"    WAM 逐帧 {i}/{len(frames)}", flush=True)

    h, w = wm_frames[0].shape[:2]
    proc = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{w}x{h}", "-r", str(int(fps)), "-i", "-",
         "-c:v", "libx264", "-crf", str(crf), "-preset", "veryfast",
         "-pix_fmt", "yuv420p", "/tmp/_wam_vid_na.mp4"], stdin=subprocess.PIPE)
    for f in wm_frames:
        proc.stdin.write(f.tobytes())
    proc.stdin.close()
    proc.wait()
    if any(s for s in av.open(src).streams if s.type == "audio"):
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", "/tmp/_wam_vid_na.mp4",
                        "-i", src, "-map", "0:v", "-map", "1:a:0", "-c:v", "copy",
                        "-c:a", "aac", "-shortest", out], check=True)
    else:
        pathlib.Path("/tmp/_wam_vid_na.mp4").replace(out)
    return out


def extract_video_votes(self, path: str, project: str = "default", samples: int = 3
                        ) -> tuple[int, list[dict], bytes | None]:
    """抽帧 WAM 提取投票。返回 (命中帧数, 各帧记录, key4b|None)。"""
    import av
    from PIL import Image
    from engines.notebooks_shim import default_transform
    from watermark_anything.data.metrics import msg_predict_inference

    wam = self._load()
    container = av.open(path)
    all_frames = []
    for i, frame in enumerate(container.decode(video=0)):
        all_frames.append(frame.to_ndarray(format="rgb24"))
    total = len(all_frames)
    container.close()
    pts = sorted({0, total // 2, total - 1}) if samples == 3 else \
        [int(total * i / samples) for i in range(samples)]

    msg_gt_candidate = None
    frames_report, votes = [], 0
    for i, nf in enumerate(pts):
        arr = all_frames[nf]
        atk = default_transform(Image.fromarray(arr)).unsqueeze(0).to(self._device)
        with torch.no_grad():
            preds = wam.detect(atk)
        masks = torch.sigmoid(preds["preds"][:, 0:1])
        cover = float((masks > 0.5).float().mean())
        detail = {"frame": nf, "mask_cover": round(cover, 2)}
        hit = False
        if cover >= 0.05:
            bits_mean = msg_predict_inference(
                preds["preds"][:, 1:].cpu(), masks.cpu())
            b = (bits_mean > 0.5)[0].cpu().numpy().astype(int)
            key4 = int("".join(map(str, b)), 2).to_bytes(4, "big")
            if msg_gt_candidate is None:
                msg_gt_candidate = key4
            hit = key4 == msg_gt_candidate
            detail["key4"] = key4.hex()
        frames_report.append(detail)
        votes += int(hit)
    return votes, frames_report, msg_gt_candidate


# 实例方法绑定
WamEngine.embed_video = embed_video
WamEngine.extract_video_votes = extract_video_votes
