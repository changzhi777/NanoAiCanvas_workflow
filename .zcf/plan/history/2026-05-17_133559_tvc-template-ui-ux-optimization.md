# TVC 模板 UI/UX 优化

> 渐进式 UI 优化：节点颜色、步骤角标、连线升级、布局收紧、间距调整

---

## Step 1: TVC 节点颜色注册
- 文件：`src/components/nanoai-workflow/nodes/nodeColors.ts`
- 在 `NODE_TYPE_TO_CATEGORY` 中注册 `tvc_script` → `AI_GENERATOR`，`storyboard_video` → `AI_GENERATOR`
- 在 dark 模式中也对应注册
- 预期：TVC 节点获得绿色→蓝色渐变 header

## Step 2: TVC 模板节点间距 + 步骤角标
- 文件：`src/components/nanoai-workflow/templates/tvcVideo01.ts`
- `horizontalGap` 150 → 280
- 3 个节点的 `data.label` 加步骤前缀：`① TVC 文案/剧本`、`② 分镜+视频+BGM`、`③ TVC 视频合成`
- 连线标签：`label` 字段标注数据流名称
- 连线颜色差异化：step1→2 用蓝色，step2→3 用绿色渐变
- 预期：更宽敞的布局 + 清晰的步骤引导

## Step 3: TvcScriptNode 布局优化
- 文件：`src/components/nanoai-workflow/nodes/TvcScriptNode.tsx`
- textarea `min-h`/`max-h` 从 120px → 90px（节省纵向空间）
- 积分预估面板加折叠控制（默认折叠，点击展开）
- 脚本结果预览 `max-h` 从 160px → 120px
- 节点宽度保持 320px 不变
- 预期：节点高度从 ~600px 降至 ~420px，更紧凑

## Step 4: 连线视觉升级
- 文件：`src/components/nanoai-workflow/templates/tvcVideo01.ts`
- edge 1（script→storyboard）：渐变蓝 `#3B82F6→#06B6D4`，标签"脚本JSON"
- edge 2（storyboard→compose）：渐变绿 `#3ecf8e→#22D3EE`，标签"视频+BGM"
- `labelBgStyle` 配置半透明背景 + 圆角
- `labelStyle` 配置白色文字
- 预期：连线数据流一目了然

## Step 5: 验证
- 本地启动 dev server，加载 TVC 模板，检查渲染效果
