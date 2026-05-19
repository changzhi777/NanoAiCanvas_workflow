[根目录](../CLAUDE.md) > **cli-agent**

---

# CLI Agent - 视频合成命令行工具

> 基于 FFmpeg 的视频合成 CLI，支持 MCP Server + HTTP API + Skill 接口

**最后更新**: 2026-05-18
**文件数**: 17 TypeScript 源文件，~1739 行

---

## 模块职责

cli-agent 是独立的 Node.js CLI 子包，负责：
- **视频合成**: FFmpeg 7 操作封装（concat/amix/overlay/subtitles/normalize/compare/extractAudio）
- **4 阶段管线**: 拼接→对比→字幕→混音，支持多规格输出（1080p+4K）
- **CLI 命令**: compose/concat/compare/subtitle/bgm + mcp + serve
- **MCP Server**: stdio 协议，4 Tools（compose/concat/compare/status）
- **HTTP API**: Fastify 服务（compose/tasks/health）
- **Skill 接口**: VideoComposeSkill 标准接口（可对接不同 Agent）

---

## 目录结构

```
cli-agent/
├── package.json                # 独立 package（TypeScript + Fastify）
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                # 入口：CLI + MCP + HTTP Server
│   ├── types.ts                # 类型定义
│   ├── core/
│   │   ├── ffmpeg.ts           # FFmpeg 7 操作封装
│   │   ├── pipeline.ts         # 4 阶段管线编排
│   │   ├── config.ts           # 配置管理
│   │   └── settings.ts         # 用户设置
│   ├── cli/
│   │   ├── utils.ts            # CLI 工具函数
│   │   └── commands/           # 7 个 CLI 命令
│   │       ├── compose.ts      # 完整合成
│   │       ├── concat.ts       # 拼接
│   │       ├── compare.ts      # 对比
│   │       ├── subtitle.ts     # 字幕
│   │       ├── bgm.ts          # 背景音乐
│   │       └── setup.ts        # 初始化配置
│   ├── mcp/
│   │   ├── server.ts           # MCP Server（stdio）
│   │   └── tools/
│   │       └── list.ts         # 4 MCP Tools
│   ├── api/
│   │   └── server.ts           # Fastify HTTP API
│   └── skill/
│       └── interface.ts        # VideoComposeSkill 标准接口
└── tests/
    └── unit/
        └── ffmpeg.test.ts      # FFmpeg 操作单元测试
```

---

## 关键接口

### CLI 命令

| 命令 | 描述 |
|------|------|
| `compose` | 完整视频合成（4 阶段管线） |
| `concat` | 视频拼接 |
| `compare` | 视频对比 |
| `subtitle` | 字幕烧录 |
| `bgm` | 背景音乐混音 |
| `mcp` | 启动 MCP Server（stdio） |
| `serve` | 启动 HTTP API Server |

### MCP Tools

| Tool | 描述 |
|------|------|
| `compose` | 完整视频合成 |
| `concat` | 视频拼接 |
| `compare` | 视频对比 |
| `status` | 查询任务状态 |

### HTTP API

| 路由 | 描述 |
|------|------|
| `POST /compose` | 提交合成任务 |
| `GET /tasks` | 任务列表 |
| `GET /health` | 健康检查 |

---

## 测试

```bash
cd cli-agent
pnpm install
pnpm test:run    # 运行单元测试
```

---

## 变更记录

### 2026-05-18
- 初始化模块文档
- 17 TypeScript 源文件，~1739 行
