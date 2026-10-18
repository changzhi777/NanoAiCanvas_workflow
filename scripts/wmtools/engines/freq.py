"""engines.freq — L1 轻量引擎（invisible-watermark dwtDctSvd + RS(20,8)）。

包装 wm_image / wm_video（行为与实测矩阵一致，零语义变化）：
  图像：全 CPU 秒级；JPG q85+/单压/缩放回采 适用
  视频：首帧+中点帧 overlay + CRF18 重编码；尾帧阴性对照
容量适配：ID 8B → RS(20,8) 20B 位流
"""
from __future__ import annotations

import pathlib
import sys

HERE = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(HERE))

from engines.base import Engine  # noqa: E402


class FreqEngine(Engine):
    name = "freq"
    tier = "light"
    domain = "both"

    def available(self) -> bool:
        try:
            import cv2  # noqa: F401
            from imwatermark import WatermarkEncoder  # noqa: F401
            return True
        except ImportError:
            return False

    def unavailable_reason(self) -> str:
        return "缺 invisible-watermark/opencv：pip3 install --break-system-packages invisible-watermark opencv-python"

    def embed(self, src: str, wm_id: bytes, out: str, **kw) -> str:
        if pathlib.Path(src).suffix.lower() in {".mp4", ".mov", ".webm"}:
            from wm_video import embed as video_embed
            return video_embed(src, wm_id, out, **kw)
        from wm_image import embed as image_embed
        return image_embed(src, wm_id, out)

    def extract(self, path: str) -> tuple[bool, bytes | None, dict]:
        if pathlib.Path(path).suffix.lower() in {".mp4", ".mov", ".webm"}:
            from wm_video import detect as video_detect
            votes, frames, payload = video_detect(path)
            return votes > 0, payload, {"votes": votes, "frames": frames}
        from wm_image import decode as image_decode
        hit, payload, tries = image_decode(path)
        return hit, payload, {"tries": tries}
