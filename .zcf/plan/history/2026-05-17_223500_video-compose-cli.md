# 视频合成 CLI 工具 + AI 剪辑 Chat

## 上下文
- 任务：Remotion+FFmpeg 自动视频合成 CLI + MCP + AI 剪辑 Chat
- 模式：混合架构（FFmpeg 为主，v2 引入 Remotion）
- Agent 对话：glm-4.5-air（后端代理）
- 前端集成：TVC 第3节点属性面板内 Tab
- 独立部署：cli-agent/ 子包

## 执行步骤

### Step 1: cli-agent/ 项目初始化
- package.json + tsconfig.json + vitest.config.ts
### Step 2: 类型定义 + 配置
- types.ts + config.ts
### Step 3: FFmpeg 封装（7 个操作）
### Step 4: 管线编排器（4 阶段）
### Step 5: CLI 命令
### Step 6: MCP Server + HTTP API
### Step 7: 前端 StoryboardVideoPanel + VideoChatPanel
### Step 8: 后端 glm_proxy agent 端点

## 创建时间: 2026-05-17 22:15
