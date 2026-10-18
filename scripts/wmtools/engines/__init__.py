"""engines — 引擎注册与可用性探测。

引擎：
  freq       L1 轻量（invisible-watermark dwtDctSvd + RS）——图/视频，全 CPU
  wam        L2 图像深度（Meta WAM，MPS/CPU）
  videoseal  L2 视频深度（Meta Video Seal v1.0，CPU）
"""
from __future__ import annotations

from engines.base import Engine  # noqa: F401
from engines.freq import FreqEngine  # noqa: F401


def get_engines(tier: str = "light") -> dict[str, Engine]:
    """返回可用引擎实例字典。deep 不可用时自动跳过并保留 reason。"""
    engines: dict[str, Engine] = {}
    freq = FreqEngine()
    if freq.available():
        engines["freq"] = freq
    if tier == "deep":
        from engines.videoseal_engine import VideoSealEngine
        from engines.wam_engine import WamEngine
        for e in (WamEngine(), VideoSealEngine()):
            if e.available():
                engines[e.name] = e
    return engines


def missing_deep() -> dict[str, str]:
    """deep 引擎缺失清单 {name: reason}。"""
    from engines.videoseal_engine import VideoSealEngine
    from engines.wam_engine import WamEngine
    out = {}
    for e in (WamEngine(), VideoSealEngine()):
        if not e.available():
            out[e.name] = e.unavailable_reason()
    return out
