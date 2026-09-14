"""
Provider 工厂类
根据配置创建对应的 Provider 实例
"""
from typing import Dict, Any
from .base import BaseImageProvider
from .wuyinkeji import WuyinkejiProvider
from .caohua_jimeng import CaohuaJimengProvider


class ProviderFactory:
    """Provider 工厂类"""

    _providers = {
        "wuyinkeji": WuyinkejiProvider,
        "caohua_jimeng": CaohuaJimengProvider,
    }

    @classmethod
    def create(cls, provider_type: str, api_key: str, config: Dict[str, Any] = None) -> BaseImageProvider:
        """创建 Provider 实例"""
        provider_class = cls._providers.get(provider_type.lower())
        if not provider_class:
            raise ValueError(f"Unknown provider type: {provider_type}")
        return provider_class(api_key, config)

    @classmethod
    def register(cls, provider_type: str, provider_class: type):
        """注册新的 Provider"""
        cls._providers[provider_type.lower()] = provider_class
