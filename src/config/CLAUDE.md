# Config 模块 - AI 渠道商前端配置

> 导航面包屑：[根目录](../../CLAUDE.md) > **config**

**最后更新**: 2026-05-14
**文件数**: 6

---

## 文件清单

| 文件 | 行数 | 描述 |
|------|------|------|
| `shortcuts.ts` | 254 | 默认快捷键配置 + 系统保留键列表 |
| `minimax.ts` | 64 | MiniMax 配置（MODELS.TEXT / SPEECH / VIDEO / MUSIC / IMAGE / CODING） |
| `jimeng.ts` | 42 | 即梦配置（VIDEO_DEFAULTS、ASPECT_RATIOS） |
| `glm.ts` | 37 | GLM 配置（MODELS.TVC_DEEP = 'glm-5.1'） |
| `kimi.ts` | 16 | Kimi 配置（moonshot API） |
| `qwen.ts` | 16 | 通义千问配置（dashscope API） |

---

## 统一模式

每个渠道商配置文件遵循统一结构：

- **`API_KEY`** — 从 `import.meta.env.VITE_*_API_KEY` 读取
- **`API_BASE_URL`** — 渠道商 API 基础 URL
- **`MODELS`** — 该渠道商支持的模型列表（code → model_id 映射）
- 特定常量（如 `VIDEO_DEFAULTS`、`ASPECT_RATIOS`）

---

**维护者**: BB小子 🤙
