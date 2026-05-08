# 节点UI优化 + 左右连线 + 缩放

> 创建时间：2026-05-08 20:58
> 任务：节点精简 + 属性面板集成 + 左右连线 + 流动动画 + 节点可缩放

---

## 计划

1. 安装 `@reactflow/node-resizer` ✅
2. StoryboardShotANode：精简UI（文本框+运行按钮），Handle改左右，NodeResizer，新增aspectRatio参数
3. ImagePreviewNode：精简UI（图片+放大），aspect-ratio自适应，Handle改左右，NodeResizer
4. 属性面板：StoryboardShotA新增提示词优化+比例，ImagePreview新增下载/保存/生成信息
5. 模板连线水平布局
6. 连线流动动画增强
7. 构建验证
