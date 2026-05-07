"""
图片生成 Provider 抽象基类
定义统一接口，各 Provider 实现类继承
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseImageProvider(ABC):
    """图片生成 Provider 基类"""

    def __init__(self, api_key: str, config: Dict[str, Any] = None):
        self.api_key = api_key
        self.config = config or {}

    @abstractmethod
    async def generate_image(self, params: Dict[str, Any]) -> str:
        """
        提交图片生成任务
        返回 task_id
        """
        pass

    @abstractmethod
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        查询任务状态
        返回 {
            "task_id": str,
            "status": "pending" | "processing" | "success" | "failed",
            "images": List[str],  # 成功时返回
            "error": str  # 失败时返回
        }
        """
        pass

    def get_config(self, key: str, default: Any = None) -> Any:
        """获取配置项"""
        return self.config.get(key, default)
