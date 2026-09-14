# Docker Compose 部署 mini-s 测试环境

## 上下文
- 任务：部署独立测试环境"mini s"，Docker Compose全容器化
- 对比验证：部署流程自动化、功能正确性、性能对比
- 新服务器：独立IP+端口直连，独立PG+Redis
- 代码源：GitHub仓库 `changzhi777/NanoAiCanvas_workflow`

## 计划

### Step 1: 后端 Dockerfile
- python:3.12-slim, 安装依赖, uvicorn启动

### Step 2: 前端 Dockerfile
- 多阶段构建: node:20-alpine → nginx:alpine

### Step 3: docker-compose.yml
- 5服务: postgres, redis, backend, frontend, nginx
- 内部网络, 卷持久化

### Step 4: 环境配置模板
- .env.mini-s (不含敏感值)

### Step 5: 数据库初始化
- Alembic迁移

### Step 6: 一键部署脚本
- deploy.sh

### Step 7: 验证
- 健康检查 + API冒烟

## 状态
- [x] 计划制定
- [ ] 执行中
