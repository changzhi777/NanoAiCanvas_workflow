# KFC TVC 验收标准审查闸 — 研究资料

> 状态：**研究阶段完成（2026-10-02）**——所有研究问题闭环，等用户「可以了」进入构思/计划
> 原始数据：`data/kfc-brief-s4-rows.json`、`data/kfc-brief-s6-rows.json`、`data/kfc-brief-s7-tables.json`

## 0. 全部已锁定决策（10 项，2026-10-02 用户逐项拍板）

| # | 决策项 | 定案 |
|---|--------|------|
| 1 | 闸口位置 | **剧本 + 成片双闸**（剧本闸省视频费，成片闸抽帧视觉终审） |
| 2 | 审查方式 | **规则 + LLM 混合**（硬规格规则秒判；内容/IP 走模型） |
| 3 | 标准集来源 | **按需导入飞书 Brief**（粘贴分享链接→clientvars 匿名抓取→标准集 JSON） |
| 4 | 百分比算法 | **分级加权**（硬规格一票否决 + 内容/IP 项可配权重） |
| 5 | 打回依据（P0-A） | Brief 案例列要点（无独立清单，"只有这些"） |
| 6 | 覆盖链路（Q9） | **只做一镜到底** |
| 7 | 模板形态（Q6） | **通用客户模板引擎**（KFC 吃货哥第一实例） |
| 8 | 重做策略（Q5） | **单步重做 + 正常计费 + 上限 3 次** |
| 9 | 报告用途（Q7） | **内部版 UI + 可导出客户版** |
| 10 | 审查计费（Q10） | **审查计费**（积分体系新增「验收审查」档） |

## 0.1 技术实测结论（全部通过）

| 项 | 结论 |
|----|------|
| 竖屏生图 | gpt-image-2.5-flare `720*1280` → PNG 720×1280 ✅ |
| 竖屏视频 | H3 `ratio:"9:16"` → 768×1376 + aac 双声道 ✅（全链路竖屏仅改两处参数 + 前端适配，**纳入方案范围**） |
| H3 计价 | 0.3 元/秒按秒计费，768P/2K 同价 |
| 视觉审查 | **MiniMax-M3**（`api.minimax.cn/anthropic/v1/messages`）读图准确零幻觉，一张图 ~1238 in/31 out tokens；后端 `_describe_image` 骨架已在；key 已收到待部署 |
| 文本审查 | glm-5.3 可用（或统一 M3，构思阶段权衡） |
| 飞书抓取可靠性 | 第七节抓取内容与用户粘贴逐字一致 ✅ |

## 1. 飞书挖掘成果

### 1.1 数据获取方式（可复用）

飞书多维表格匿名分享链接的抓取链路（无需登录态）：

1. Playwright 打开分享链接（SPA 加载）
2. 页面上下文 `fetch` `clientvars` API：
   `GET /space/api/v1/bitable/{token}/clientvars?tableID={tid}&viewID={vid}&recordLimit=200&needBase=true&viewLazyLoad=true&ondemandVer=2&openType=0&noMissCS=true&optimizationFlag=1&removeFmlExtra=true`
3. 响应 `data.table` / `data.base` 字段为 **gzip+base64**，用 `DecompressionStream('gzip')` 解压
4. `fieldMap`（字段定义）+ `recordMap`（记录，单元格形状 `{fid: {value: [...]}}`）

两个域名均匿名可访问：`my.feishu.cn`（乙方空间）+ `kcn4shhldas4.feishu.cn`（客户/另一空间）。

### 1.2 项目全貌：KFC 吃货哥 IP 系列 AIGC 广告

索引表「肯德基AI商业视频制作统计表」（8 行）：

| 节 | Brief 日期 | 视频条数 | Brief 链接域名 | 挖掘状态 |
|----|-----------|---------|---------------|---------|
| 一 | 20260816 | 5+前期5 | my.feishu.cn | 待挖（结构预计同） |
| 二 | 20260821 | 6 | my.feishu.cn | 待挖 |
| 三 | 20260828 | 6 | my.feishu.cn | 待挖 |
| 四 | 20260904 | 8 | kcn4shhldas4.feishu.cn | ✅ 全量 19 行 |
| 五 | 20260909（副本） | 5 | kcn4shhldas4.feishu.cn | 待挖 |
| 六 | 20260919 | 7 | my.feishu.cn | ✅ 全量 19 行 |
| 七 | 20260928 | ≥1（三体宇宙联名翅桶，仅第一条已填） | my.feishu.cn | ✅ 全量 15 行（table=tbliMo5UlvXjVoPg） |

第七节链接：`https://my.feishu.cn/base/JuuFb6XIeano0LsiBPYcpn9on6e`（20260928，十翅一桶×三体宇宙，39.9元，金沙版KV）。**Brief 模板跨 7 节结构稳定**（字段/维度完全一致）；第七节无评论无附件。

已确认决策（2026-10-02 用户拍板）：
1. **闸口 = 剧本+成片双闸**（剧本闸 LLM 对照 Brief 早发现省视频费；成片闸抽帧视觉审查+终审百分比）
2. **审查 = 规则+LLM 混合**（硬规格规则秒判；内容忠实度/IP一致性走 LLM+多模态）
3. **标准集 = 按需导入飞书 Brief**（粘贴分享链接→clientvars 匿名抓取→解析成标准集 JSON）
4. **百分比 = 分级加权**（硬规格一票否决 + 内容/IP 项可配权重）

合计 37+ 条视频。Brief 链接：
- 一：`https://my.feishu.cn/base/Nx1cb2BYYapuNqswAb8csyFNndb`
- 二：`https://my.feishu.cn/base/ZdrMbNbxOaAovZsACvCcXfnMnhd`
- 三：`https://my.feishu.cn/base/G9vibM8DxahojIsSiKzcS3eTn46`
- 四：`https://kcn4shhldas4.feishu.cn/base/MsYbbt9nuagtOqsnnZscCrG0nKf`（table=tblFmrrGk8bK1GDk）
- 五：`https://kcn4shhldas4.feishu.cn/base/GX1WbAgZTaKMPEs6TxlcsiNVnHd`
- 六：`https://my.feishu.cn/base/N1dqbP44Gaokfhs2v1sc1nwdn3f`（table=tblJjc2XO0cpZqw7）

### 1.3 Brief 表结构（转置表）

- **行 = 标准维度**，「文本」列是维度名
- **列 = 每条视频**（第一条~第八条）
- 「案例」列 = 标准示例/验收要点模板
- 空行 = 占位/历史行

### 1.4 提炼出的验收标准维度（两节交叉验证）

#### A. 硬性规格（可机器/规则验证）
| 维度 | 标准值 | 来源 |
|------|--------|------|
| 画面比例 | **9:16**（默认） | 「画面比例（默认 9:16）」行 |
| 时长 | **15s 左右** | 情节描述行备注「注意篇幅在15s左右」 |
| 视频类型 | 非 IP / 是 IP（**请保证良品**） | 「视频类型」行 |

#### B. 内容忠实度（需对照 Brief 文本审查）
| 维度 | 说明 |
|------|------|
| 必现产品 | 「主要推广对象/必须出现的产品」：主推产品**全称**必须出现（产品全貌） |
| 必现信息 | 价格、活动机制、活动日期、必要 slogan——Brief 逐条列出 |
| 文案内容 | 甲方指定文案（配音/旁白/花字）需按指定使用；未指定才由乙方自主生成 |
| 情节必现元素 | 情节描述中「必须出现、不可缺失的元素」（产品全貌、logo、特定道具、文字标识、场景元素） |
| 结尾规范 | 结尾展示产品 KV/海报/实拍图；案例明示「玩具实拍图，颜色材质不能变形」 |

#### C. IP 一致性（视觉审查，硬要求）
| 维度 | 说明 |
|------|------|
| 吃货哥形象 | 按 Brief 指定：Q版/真人、服饰（随环境适配，不默认西装）、三头身~四头身、E字符号等 |
| IP 细节冻结 | 「ip主角出镜，**不要改动任何面部、衣物等细节**」（第四节第四条） |
| 联名 IP | 联名角色符合原 IP 风格（如仙逆古风、「主角全程不要说话除非能用国漫原声」） |
| 人物设定 | 「所有出镜人物形象、风格、服饰必须提前明确指定」，未指定由乙方随机生成 |

#### D. 场景/氛围
| 维度 | 说明 |
|------|------|
| 故事环境背景 | 场景、时代背景、环境氛围、色调（如「肯德基品牌红主色调」）须符合 Brief |

#### E. 交付管理（流程性）
| 维度 | 说明 |
|------|------|
| 交付日期 | 「需要产出时间」逐条指定（含加急标记） |
| 进度回填 | 「进度（已完成/进行中）」 |
| 下单日期 | 「下单日期」 |

#### 关键发现（对验收闸设计的直接输入）
1. **甲方自己已用秒级分镜表下需求**（第四节第五/七条）：`|镜|时间轴|画面|旁白|花字|` 四列结构——TVC 引擎的 parsed_script 结构可对齐
2. **Brief 即验收合同**：每条视频的验收标准 = 该列所有维度值的合取
3. 「是 IP（请保证良品）」= IP 类视频有额外质量门槛
4. 素材物料（产品 KV/RTB/POP/ID 图）通过百度网盘/微云链接下发——视觉审查的**参照图**来源
5. 现有 TVC 链路已有「三层提示词审查」经验（Bug#7 修复，commit 75af48c）可复用扩展

## 2. 网络资料

- [KFC Global Brand Identity Standards (PDF)](https://ratnacahyarina.files.wordpress.com/2014/03/kfc.pdf) — Logo/商标授权使用、格式、色彩复制标准
- [KFC Global 官方品牌资产页](https://global.kfc.com/media-assets) — 视觉识别系统 + 素材有限期限授权条款
- [KFC Brand Book（百胜国际版）](https://relayto.com/explore/kfc-brand-book-71hcbh7c2c0dh) — Logo 必须按原样使用
- KFC 内部 TVC 制作交付验收标准属百胜中国采购机密，公开网络无披露——**飞书 Brief 是最权威标准源**

## 3. 技术可行性备忘（构思阶段需验证）

| 项 | 现状 | 风险 |
|----|------|------|
| 文本审查（剧本/文案对照 Brief） | GLM-5.3 主路已通 | 低 |
| 图片审查（IP 形象/产品还原） | 需多模态模型；glm-5.3 是否支持 vision 待验证（智谱有 GLM-4V/4.5V 系列） | 中 |
| 视频审查（抽帧→多模态） | 需抽帧（容器有 ffmpeg）+ 多模态逐帧 | 中 |
| 比例/时长规则校验 | H3 通道 4-15s、分辨率参数已有 | 低 |
| 百分比计算 | 纯后端逻辑 | 低 |

## 4. TVC 前端节点逐文件深挖审查（2026-10-02）

审查范围 11 文件 ~5500 行：TvcScriptNode / useTvcExecution / tvc-api / tvc-cascade / WorkflowPropertiesPanel(TVC段) / MiniVideoPlayer / LanternImage / PromptOptimizerDialog / TvcExecutionPanel / TvcProjectPanel / TvcProjectDetail。

### P0 功能断链/真 bug（5 项）

| # | 位置 | 问题 |
|---|------|------|
| 1 | 双灯笼产品图位 | **productImage 全链断线**：前端上传 base64 存 params，submitTask 不传、后端 SubmitRequest 连字段都没有（grep 零命中）——产品图功能完全无效 |
| 2 | 双灯笼人物图位 | **referenceImage 前端漏传**：后端有完整消费链（workflow_tasks.py:38 → tvc_engine M3 视觉剧本 ：411-462），但 useTvcExecution submitParams 没放 referenceImage——只有分析出的文字 styleReference 间接生效，原图视觉信息丢失 |
| 3 | PromptOptimizerDialog | **孤儿组件**：TvcScriptNode 只 import 不渲染——「提示词二次优化」入口丢失（后端 optimize-prompt 端点仍在） |
| 4 | TvcProjectDetail:199 | **BGM 播放器 `<video muted>` 硬编码**——BGM 永远听不到声音 |
| 5 | nanoaiWorkflowStore persist | **base64 大图撑爆 localStorage**：partialize 存 nodes（含 params.referenceImage/productImage base64 数 MB），超 5MB 限制 → persist 静默失败丢全部画布状态 |

### P1 过时/失真（8 项）

| # | 位置 | 问题 |
|---|------|------|
| 6 | useTvcExecution:25 | getTvcModelConfig fallback `glm-5.1`（已下线） |
| 7 | tvc-api:176 | generateScript minimax 默认 `MiniMax-M2.7`（旧模型名） |
| 8 | tvc-api:203 | analyzeProductReference 默认 `glm-5v-turbo`——**智谱视觉已死（10-02 实测）**，应迁 M3（后端 _describe_image 已迁，前端还指旧名） |
| 9 | tvc-cascade:92-97 | 积分预估全面失真：bgm:3（实际 video 档 20）、video:15/shot 不感知模型；一镜到底 15s 被 calcTvcParams 虚拆 3 镜头×2 图（预估虚高 ~3x） |
| 10 | 两处 calcTvcParams 调用 | 不传 model 参数——预估永远按 jimeng 时长档算 |
| 11 | 属性面板 quality 下拉 | hd/standard 后端不消费（生图 quality=medium 硬编码）——死配置 |
| 12 | useTvcExecution SSE | 断连无降级轮询——网络抖动节点永卡 RUNNING，诱导重复提交重复扣费 |
| 13 | TvcScriptNode:102 | cancel 文案「已扣积分不予退还」与后端 cancel 退款行为矛盾 |

### P2 体验/适配（8 项）

14. MiniVideoPlayer `aspect-video` 硬编码 16:9（竖屏必改）；15. 下载按钮跨域 download 属性无效；16. window.confirm 两处风格不统一；17. 一镜到底完成态判断 `shotCount===1` 与 oneShot 参数双源不同步；18. 总时长下拉从 2 镜起，15s 不在选项；19. TvcProjectPanel 删除无确认；20. SSE 回调闭包 data.result 快照可能覆盖中间更新；21. linkTaskResult duration `shot_duration||5` 一镜到底写 5。

### 验收闸嵌入点（正面发现）

- **TvcScriptNode 完成态（374-398 行）**：验收报告卡片的天然挂载位（播放器下方）；运行中进度区可加审查步骤状态
- **MiniVideoPlayer 元数据条**：可扩 provider/分辨率/审查评分展示
- **TvcExecutionPanel NodeCard/SubtaskGrid**：审查步骤展示的现成视觉模式（framer-motion 卡片+子任务网格，已在 Nano2TvcPanel 使用）
- **SSE state.nodes 结构**（step-optimize/step-video）：审查报告数据源现成
- **estimatePoints → /points/tvc-estimate**：「验收审查计费」档的扩展点

> 处置：以上问题在用户说「可以了」后并入构思/计划（P0 建议随验收闸方案一起修，P1 顺手修，P2 择优）。

## 5. 深挖方向追踪（P0-A/P0-B/P1-C 均已闭环）

### P0-A 客户打回问题清单（✅ 2026-10-02 关闭）
「常见错误」= Brief「案例」列的实战要点（**用户确认只有这些，无独立打回清单文档**）：
- 结尾展示产品实拍图/KV，**颜色材质不能变形**
- 是 IP 视频「**请保证良品**」+「**不要改动任何面部、衣物等细节**」（第四节）
- 「所有出镜人物形象、风格、服饰**必须提前明确指定**」
- 甲方指定文案/情节必现元素必须出现；未指定才乙方自主生成
→ 初版权重设计依据：IP 一致性、必现信息（产品/价格/活动/slogan）、结尾规范 做否决项候选；后续真实打回记录出现再迭代校准。
（第七节 Brief 用户粘贴核对：与 clientvars 抓取内容逐字一致——按需导入链路可靠性实证 ✅）

### P0-B 9:16 竖屏链路缺口（2026-10-02 发现，P0 前置改造候选）
现状：生图硬编码 `aspectRatio="1280*720"`（tvc_providers.py:151）；H3 body 硬编码 `"ratio": "16:9"`（tvc_providers.py:382，**速创 H3 API 原生有 ratio 参数**）。客户默认 9:16。

**实测结果（2026-10-02，全部通过 ✅）**：
- ✅ **生图竖屏**：gpt-image-2.5-flare 传 `aspectRatio: "720*1280"` → 实际输出 PNG 720x1280
- ✅ **H3 竖屏视频**：竖屏首帧 + `ratio:"9:16"` + 4s → 输出 **768x1376**（9:16 竖屏）、24fps、4.46s、aac 双声道（task video_8bd07bd6，总耗时 ~12 分钟含排队 660s；产物 /tmp/h3vtest.mp4 本机留档）
- ✅ **速创 H3 计费不分分辨率**：计费说明页（/doc/76）——0.3 元/秒（点数 30 点/秒）**按秒计费，768P 与 2K 同价**（对照 MiniMax 官方 768P=0.5 / 2K=0.8 元/秒）
- **结论：全链路竖屏只需改两处后端参数**（生图 aspectRatio + H3 ratio，均已验证）+ 前端竖屏适配（播放器/画布/资产库）——改造量级小，可纳入本次方案
- 注意：H3 detail 的 result 是 **list[str] 结构**（生产代码已处理，测试脚本踩坑记录）

### P1-C 审查引擎可行性实测
**2026-10-02 实测结论**：
- ❌ **智谱 Anthropic 端点视觉全断**：glm-5.3 拒收图；glm-4.5v/4.6v 收 base64 图后**全部幻觉**（汉堡卡通图被描述为"AI Agent 概念图"/"古典建筑"——图未达模型）
- ❌ **智谱 v4 端点 GLM-4.5V → 1113**（Coding 套餐挡所有 v4 调用）；DeepSeek 无视觉；速创无理解类产品
- ✅ **视觉通道定案：MiniMax-M3（Claude/Anthropic 协议端点 `api.minimax.cn/anthropic/v1/messages`）**（用户拍板 + 提供 key）：
  - 实测读图准确（汉堡图描述与 ground truth 吻合，无幻觉）
  - 成本极低：一张图 input ~1238 tokens / output ~31 tokens
  - **代码骨架已存在**：`tvc_engine.py` `_describe_image` + `_build_minimax_image_block`（默认 IMG_DESC_VISION_ENDPOINT=anthropic、model=MiniMax-M3）——视频帧审查可直接复用扩展
  - 可用模型列表（该 key）：MiniMax-M3 / M2.7(-highspeed) / M2.5 / M2.1 / M2
  - key 待部署（研究阶段不部署，等"可以了"）
- 文本审查主路 glm-5.3（Anthropic 端点）可用；也可统一 M3 做审查（视觉+文本一体，简化依赖——构思阶段权衡）
- 待实测：视频抽帧方案（容器 ffmpeg 抽 N 帧 → M3 逐帧审）、审查 prompt 原型、每条视频审查成本估算

### P1-D 飞书对接与标准集解析
- wiki 链接解析链路（wiki node → obj_token → bitable）
- Brief 转置表 → 标准集 JSON 映射规则：14 维度各自流向（规则引擎 / LLM 审查 / 仅存档）
- 网盘物料（KV 参照图）：百度网盘/微云链接+提取码 → 自动下载基本不可行，预计人工上传参照图

### P2-E 产品决策补全（遗留 Q5-Q8 + 新增）
- Q5 重做边界/计费/次数上限
- Q6 通用化：KFC 专属 vs 客户模板引擎
- Q7 报告用途：内部自检 vs 客户交付
- Q8 是否补挖一/二/三/五节（模板已验证稳定，仅在需要更多历史样本时做）
- 新增 Q9：验收闸先覆盖一镜到底链路（15s 匹配客户需求）还是含多分镜？
- 新增 Q10：审查本身要不要计费？（LLM+多模态审查有真实成本）

### P2-F 历史交付数据（可选）
- 已交付 37+ 条视频的审查记录（若有存档）→ 验收闸的回归测试集
