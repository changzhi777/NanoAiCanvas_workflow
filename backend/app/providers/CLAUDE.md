# Providers 模块 - AI 服务提供商统一接口

导航面包屑：[根目录](../../../CLAUDE.md) > [backend](../../) > [app](../) > **providers**

**最后更新**: 2026-05-14

---

## 文件清单

| 文件 | 行数 | 职责 |
|------|------|------|
| **base.py** | 39 | `BaseImageProvider` 抽象基类，定义 `generate()` / `check_status()` / `get_supported_models()` 接口 |
| **__init__.py** | - | `ProviderFactory` 工厂类，根据 provider_type 字符串创建对应实例（"wuyinkeji"/"caohua_jimeng"） |
| **wuyinkeji.py** | 117 | `WuyinkejiProvider`，速创 API（NanoBanana 系列），支持图片生成+状态轮询 |
| **caohua_jimeng.py** | 136 | `CaohuaJimengProvider`，草花互动即梦（Volcengine），支持图片+视频生成 |

## 架构设计

```
BaseImageProvider (抽象基类)
├── generate()      → 提交任务，返回 task_id
├── check_status()  → 轮询任务结果
└── get_supported_models() → 返回支持的模型列表

ProviderFactory (工厂)
├── "wuyinkeji"    → WuyinkejiProvider
└── "caohua_jimeng" → CaohuaJimengProvider
```

## 技术要点

- **工厂模式**：ProviderFactory 根据 model_type 路由到具体 Provider
- **统一接口**：generate() 提交任务 → 返回 task_id，check_status() 轮询结果
- **配置注入**：API Key + base_url 通过 config dict 注入
- **Wuyinkeji**：使用 query param 认证（?token=xxx）
- **CaohuaJimeng**：使用 Authorization header 认证（Bearer xxx）
