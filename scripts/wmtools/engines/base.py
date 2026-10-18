"""engines.base — 水印引擎抽象协议。

引擎职责：把 8B canonical ID 嵌入内容 / 从内容提取（容量适配封装在引擎内）。
属性：
  name     引擎名（freq / wam / videoseal）
  tier     'light'（全 CPU 秒级）| 'deep'（深度模型，抗重度失真）
  domain   'image' | 'video' | 'both'
  available() 依赖与权重自检；失败时 unavailable_reason() 给出指引
"""
from __future__ import annotations

import abc
import pathlib

HERE = pathlib.Path(__file__).parent
VENDOR = HERE.parent / "vendor"
WEIGHTS = VENDOR / "weights"


class Engine(abc.ABC):
    name: str = "base"
    tier: str = "light"
    domain: str = "both"

    @abc.abstractmethod
    def available(self) -> bool:
        """依赖 + 权重自检。"""

    @abc.abstractmethod
    def unavailable_reason(self) -> str:
        """available() 为 False 时的指引。"""

    @abc.abstractmethod
    def embed(self, src: str, wm_id: bytes, out: str, **kw) -> str:
        """嵌入 8B canonical ID（引擎内部自行 pack）。返回输出路径。"""

    @abc.abstractmethod
    def extract(self, path: str) -> tuple[bool, bytes | None, dict]:
        """提取。返回 (hit, id_8b|None, detail)。"""


def _torch_ok() -> bool:
    try:
        import torch  # noqa: F401
        return True
    except ImportError:
        return False
