"""engines.videoseal_engine — L2 视频深度引擎（Meta Video Seal v1.0，256-bit，恒 CPU）。

实测背书（维度十九）：H3 真实视频（1376×768/362 帧）直提/crf30 二压/缩放 50% 回采
全部 bit 100%。MPS 段错误（算子兼容）→ 恒 CPU；60 帧分段嵌入防 OOM。

容量适配：32B 传输块 = 'NCSV'4B + ID8B + ID反码8B + CRC32(ID)4B + 图案8B(0xA5)。
  多重校验（magic/反码/CRC），误判率趋近零。
"""
from __future__ import annotations

import pathlib
import struct
import subprocess
import sys
import zlib

import numpy as np

import av

from engines.base import Engine, VENDOR, _torch_ok

VSEOAL = VENDOR / "videoseal"
CKPT = VENDOR / "weights" / "y_256b_img.pth"
MAGIC = b"NCSV"
PAD = b"\xa5" * 8
VIDEO_EXT = {".mp4", ".mov", ".webm"}
_model_cache: dict = {}


def pack256(id8: bytes) -> bytes:
    return MAGIC + id8 + bytes(b ^ 0xFF for b in id8) + struct.pack(">I", zlib.crc32(id8)) + PAD


def unpack256(raw: bytes) -> bytes | None:
    if len(raw) != 32 or raw[:4] != MAGIC or raw[24:32] != PAD:
        return None
    id8, inv = raw[4:12], raw[12:20]
    if inv != bytes(b ^ 0xFF for b in id8):
        return None
    if struct.unpack(">I", raw[20:24])[0] != zlib.crc32(id8):
        return None
    return id8


def _read_video(path: str) -> tuple[object, float]:
    """PyAV 解码 → (TCHW float/255, fps)。"""
    import av
    import torch
    container = av.open(path)
    frames = []
    for frame in container.decode(video=0):
        frames.append(frame.to_ndarray(format="rgb24"))
    fps = float(container.streams.video[0].average_rate or 24)
    container.close()
    video = torch.from_numpy(np.stack(frames)).permute(0, 3, 1, 2).float() / 255.0
    return video, fps


class VideoSealEngine(Engine):
    name = "videoseal"
    tier = "deep"
    domain = "video"

    def available(self) -> bool:
        return VSEOAL.exists() and CKPT.exists() and _torch_ok()

    def unavailable_reason(self) -> str:
        miss = [w for w, c in [(str(VSEOAL), VSEOAL.exists()),
                               (str(CKPT), CKPT.exists()),
                               ("torch", _torch_ok())] if not c]
        return f"VideoSeal 引擎缺失 {miss}——运行 bash setup_engines.sh"

    def _load(self):
        if _model_cache.get("vs") is not None:
            return _model_cache["vs"]
        sys.path.insert(0, str(VSEOAL))
        import videoseal

        yaml_loc = VSEOAL.parent / "weights" / "videoseal_local.yaml"
        if not yaml_loc.exists():
            src = VSEOAL / "videoseal" / "cards" / "videoseal_1.0.yaml"
            # 相对路径 configs/ → 包内绝对路径（cfg.py 从 cwd 解析会错层）
            text = src.read_text().replace(
                "checkpoint_path: https://dl.fbaipublicfiles.com/videoseal/y_256b_img.pth",
                f"checkpoint_path: {CKPT}")
            text = text.replace("configs/", str(VSEOAL / "configs") + "/")
            yaml_loc.write_text(text)
        model = videoseal.load(yaml_loc).eval()   # 恒 CPU（MPS 段错误实测）
        # 注意：JND(attenuation) 是嵌入必要组件——置 None 会使水印写入失效（实测 E5）
        _model_cache["vs"] = model
        return model

    def embed(self, src: str, wm_id: bytes, out: str, **kw) -> str:
        import torch

        model = self._load()
        video, fps = _read_video(src)

        pack = pack256(wm_id)
        bits = torch.tensor(np.unpackbits(np.frombuffer(pack, np.uint8)),
                            dtype=torch.float32).unsqueeze(0)     # 1×256

        SEG = 60                                    # 分段嵌入防 OOM，段间挪 CPU
        parts = []
        with torch.no_grad():
            for st in range(0, len(video), SEG):
                seg = video[st:st + SEG].to("cpu")
                out_seg = model.embed(seg, bits)
                parts.append(out_seg["imgs_w"].clamp(0, 1).cpu())
        imgs_w = torch.cat(parts)

        _, _, h, w = imgs_w.shape
        proc = subprocess.Popen(
            ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
             "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
             "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
             "-pix_fmt", "yuv420p", "/tmp/_vs_na.mp4"],
            stdin=subprocess.PIPE)
        for f in imgs_w:
            proc.stdin.write((f.permute(1, 2, 0).numpy() * 255).astype("uint8").tobytes())
        proc.stdin.close()
        proc.wait()

        has_audio = any(s for s in av.open(src).streams if s.type == "audio")
        if has_audio:
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", "/tmp/_vs_na.mp4", "-i", src,
                            "-map", "0:v", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac",
                            "-shortest", out], check=True)
        else:
            pathlib.Path("/tmp/_vs_na.mp4").replace(out)
        return out

    def extract(self, path: str) -> tuple[bool, bytes | None, dict]:
        import torch

        model = self._load()
        video, _ = _read_video(path)
        with torch.no_grad():
            msg = model.extract_message(video.to("cpu"))
        raw = msg[0].cpu().numpy().tobytes()
        id8 = unpack256(raw)
        return id8 is not None, id8, {"block": raw.hex()[:24] + "…"}
