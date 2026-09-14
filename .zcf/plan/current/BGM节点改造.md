# 任务：BGM 节点 + TVC 模板升级（minimax M3 + Hailuo-3 链路）

## 上下文
- 生产：https://91zm.com.cn/nanoai
- minimax music API 永久 410 拦截 → BGM 改为弹窗开 MiniMax Audio → dropzone 上传
- minimax M3 多模态已实测通：端点 api.minimax.cn、模型 MiniMax-M3、base64 图输入
- minimax 旧端点 api.minimaxi.com 已废，需切到 .cn
- 音频上传端点：POST /api/chat/upload
- 14455975/cz777777+ 测试账号 + 10000 积分

## 计划
| # | 任务 | 文件 |
|---|------|------|
| 1 | 改 minimax.py 端点/模型/多模态 | backend/app/api/v2/minimax.py |
| 2 | 后端 + 生产 .env 改端点 | .env + backend/.env.example |
| 3 | 创建 BGM 节点目录骨架 | src/.../nodes/bgm-uploader/index.tsx |
| 4 | 实现 BGMGeneratorModal | src/.../nodes/bgm-uploader/BGMGeneratorModal.tsx |
| 5 | 上传 hook | src/.../nodes/bgm-uploader/hooks.ts |
| 6 | 属性面板 | src/.../nodes/bgm-uploader/properties.tsx |
| 7 | 注册节点到 store/index | src/stores/nanoaiWorkflowStore.ts + nodes/index.ts |
| 8 | 模板 3 节点改 5 节点 | src/.../templates/tvcVideo01.ts |
| 9 | 构建测试 + 推送 + 部署 | pnpm build + git push + 7897 代理 |
| 10 | 浏览器端到端验证 | ego-browser 测 TVC 模板渲染 + BGM 弹窗 |

## 验收
- minimax M3 多模态 api 调通返回合理 JSON
- BGM 节点在模板面板可见可拖
- 弹窗点 "打开 MiniMax Audio" 新窗口 + dropzone 接收
- 完整 5 节点模板 14455975 登录后加载正常
