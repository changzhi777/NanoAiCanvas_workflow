# AI作图 - Skills 模板文档

**更新时间**: 2026-05-06
**模板数量**: 15 个结构化模板
**分类数量**: 6 个主要分类

---

## 分类总览

| 分类 | 模板数量 | 描述 |
|------|----------|------|
| UI 界面 (ui-mockups) | 3 | 社交动态、产品卡片、直播 UI |
| 产品视觉 (product-visuals) | 2 | 纯白底主图、爆炸视图 |
| 地图信息图 (maps) | 2 | 旅行路线、美食地图 |
| 故事板分镜 (storyboards) | 3 | 电影感分镜、四格漫画、漫画单页 |
| 人物肖像 (portraits) | 1 | 角色设定稿 |
| 品牌包装 (branding) | 1 | 品牌识别系统板 |
| 海报宣传 (poster) | 1 | 品牌主海报 |
| 技术图表 (technical) | 2 | 系统架构图、流程图 |

---

## 模板详情

---

### 分类 1：UI 界面 (ui-mockups)

#### 模板 1.1：社交平台动态
**ID**: `ui-mockups-social-interface`
**描述**: 社交平台动态详情页样机，支持 Twitter/X、小红书、微博、Threads 等风格

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| platform | select | 是 | 平台 | Twitter/X, 小红书, 微博, Threads, Instagram |
| username | text | 是 | 用户名 | - |
| content_type | select | 是 | 内容类型 | 纯文字, 单图, 多图, 视频 |
| post_text | textarea | 否 | 帖子内容 | 动态的文字内容 |
| likes | text | 否 | 点赞数 | 如: 1.2万 |
| comments | text | 否 | 评论数 | - |
| shares | text | 否 | 转发数 | - |

**Prompt 模板**:
```
Social media feed post mockup, platform style: {platform}. User: {username}. Post content: {post_text}. Content type: {content_type}. Engagement stats: {likes} likes, {comments} comments, {shares} shares. Clean UI design with proper spacing, modern social platform aesthetic. Screenshot style, high fidelity mockup.
```

---

#### 模板 1.2：产品卡片叠加
**ID**: `ui-mockups-product-card`
**描述**: 落地页 hero 或详情页主图，产品与卖点叠加设计

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| product_name | text | 是 | 产品名称 | - |
| product_type | select | 是 | 产品类型 | 电子产品, 美妆护肤, 服装, 食品, 家具 |
| headline | text | 是 | 主标题 | 主卖点文案 |
| subheadline | text | 否 | 副标题 | - |
| price | text | 否 | 价格 | - |
| cta_text | text | 否 | 按钮文案 | 默认: 立即购买 |

**Prompt 模板**:
```
Product hero card overlay, product: {product_name} ({product_type}). Headline: {headline}. Subheadline: {subheadline}. Price: {price}. CTA button: {cta_text}. Professional e-commerce product showcase, clean white or light background, product prominently displayed with key selling points overlaid. Marketing material style, high conversion design.
```

---

#### 模板 1.3：电商直播 UI
**ID**: `ui-mockups-live-commerce`
**描述**: 电商直播带货截图样机，包含主播画面、聊天区、礼物区、商品卡等区域

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| host_name | text | 是 | 主播名称 | 主播的名字或昵称 |
| host_type | select | 是 | 主播来源 | 名人明星, 网红达人, 商家自播, 随机生成 |
| product_name | text | 是 | 商品名称 | 直播售卖的商品名称 |
| product_price | text | 否 | 商品价格 | 如: 99.9元 |
| platform | select | 是 | 平台风格 | 抖音, 快手, 淘宝直播, 小红书 |
| chat_count | select | 否 | 评论数量 | 少量, 中等, 刷屏 (默认: 中等) |
| gift_enabled | select | 否 | 礼物特效 | 有, 无 (默认: 有) |

**Prompt 模板**:
```
E-commerce live streaming screenshot, {host_name} as the host, promoting {product_name} at {product_price}. Platform style: {platform}. Chat area shows active comments with multiple viewers. Gift area with animated effects. Product card prominently displayed. High energy sales atmosphere, professional streaming setup with ring lights, clean background. Screenshot mockup, 16:9 aspect ratio, realistic UI design.
```

---

### 分类 2：产品视觉 (product-visuals)

#### 模板 2.1：纯白底主图
**ID**: `product-visuals-white-background`
**描述**: 电商纯白底主图，单品或多角度极简营销叠层

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| product_name | text | 是 | 产品名称 | - |
| product_color | text | 否 | 产品颜色 | - |
| angle | select | 是 | 视角 | 正面, 侧面, 3/4 视角, 多角度 |
| background_color | select | 否 | 背景色 | 白色 (默认), 灰色, 浅蓝色 |

**Prompt 模板**:
```
E-commerce product shot on pure white background, {product_name}. Color: {product_color}. Angle: {angle}. Studio lighting, clean minimal product photography, professional commercial photography style. Multiple angles if selected. High detail, sharp focus, commercial e-commerce ready.
```

---

#### 模板 2.2：产品爆炸视图
**ID**: `product-visuals-exploded-view`
**描述**: 产品爆炸视图海报，主体垂直堆叠 + callout 标注 + 顶部 logo + 底部品牌区

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| product_name | text | 是 | 产品名称 | - |
| product_type | select | 是 | 产品类型 | 电子产品, 手表/配饰, 耳机/音响, 相机, 其他 |
| brand_name | text | 否 | 品牌名称 | - |
| features | textarea | 否 | 产品特点 | 用逗号分隔多个特点 |

**Prompt 模板**:
```
Product exploded view poster, {product_name}. Brand: {brand_name}. Features: {features}. Vertical stacked composition with floating components, callout labels pointing to each part. Clean dark background with tech aesthetic, professional product photography style. Top logo area, bottom brand zone. Commercial product marketing material, 3D render style.
```

---

### 分类 3：地图信息图 (maps)

#### 模板 3.1：旅行路线图
**ID**: `maps-travel-route`
**描述**: 旅行路线图，多日行程或单日 city walk

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| destination | text | 是 | 目的地 | - |
| duration | select | 是 | 行程天数 | 一日游, 两日游, 三日游, 五日游 |
| route_type | select | 是 | 路线类型 | 城市漫步, 自然风光, 文化之旅, 美食之旅 |

**Prompt 模板**:
```
Travel route map, destination: {destination}. Duration: {duration}. Route type: {route_type}. Illustrated map with marked route, numbered stops with small icons. Clean modern design, tourist map style. Clear visual hierarchy showing the journey path.
```

---

#### 模板 3.2：城市美食地图
**ID**: `maps-food-map`
**描述**: 城市美食手绘地图，编号点位 + 图例 + 中心吉祥物

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| city_name | text | 是 | 城市名称 | - |
| map_style | select | 是 | 地图风格 | 手绘风格, 扁平风格, 复古风格 |
| spot_count | select | 是 | 推荐点位 | 5个, 8个, 10个 |
| include_mascot | select | 否 | 吉祥物 | 有 (默认), 无 |

**Prompt 模板**:
```
Hand-drawn style city food map, {city_name}. Style: {map_style}. Include {spot_count} numbered food spots with icons. Legend showing food types. Center mascot character. Illustrated map style with warm colors, tourist map aesthetic. Clean layout with good hierarchy.
```

---

### 分类 4：故事板分镜 (storyboards)

#### 模板 4.1：电影感分镜
**ID**: `storyboards-cinematic`
**描述**: 电影感叙事分镜 contact sheet，3x4 或 4x4 连续叙事

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| story_logline | textarea | 是 | 故事梗概 | 一句话描述故事 |
| grid_size | select | 是 | 网格 | 3x4 (12格), 4x4 (16格), 4x3 (12格) |
| cinematic_style | select | 是 | 风格 | 黑色电影, 科幻, 剧情, 动作, 爱情 |

**Prompt 模板**:
```
Cinematic storyboard grid, {grid_size}. Story: {story_logline}. Style: {cinematic_style}. Contact sheet format showing continuous narrative with varied shots (wide, medium, close-up). Cinematic lighting, film grain texture, professional cinematography feel. Scene transitions visible in sequence.
```

---

#### 模板 4.2：四格漫画
**ID**: `storyboards-four-panel`
**描述**: 4 格漫画 / 讽刺漫画 / 段子漫画，起承转合+对话气泡

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| story_theme | text | 是 | 故事主题 | - |
| genre | select | 是 | 题材 | 喜剧, 爱情, 动作, 恐怖, 日常 |
| has_dialogue | select | 否 | 对话气泡 | 有 (默认), 无 |
| art_style | select | 是 | 画风 | 日漫, 韩漫, 美式漫画, 国漫 |

**Prompt 模板**:
```
Four-panel comic strip, theme: {story_theme}. Genre: {genre}. Art style: {art_style}. Dialogue bubbles: {has_dialogue}. Clear narrative flow with beginning, development, twist, and conclusion. Comic panel layout with proper pacing. Expressive characters with dynamic poses.
```

---

#### 模板 4.3：漫画单页
**ID**: `storyboards-manga-spread`
**描述**: 单页或跨页漫画分镜，不规则格子+对话+心声

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| title | text | 是 | 漫画标题 | - |
| scene | textarea | 是 | 场景描述 | - |
| panel_count | select | 是 | 格数 | 4格, 6格, 8格 |
| mood | select | 是 | 情绪基调 | 紧张, 幽默, 情感, 动作 |

**Prompt 模板**:
```
Manga single page spread, title: {title}. Scene: {scene}. {panel_count} panels with irregular layouts. Mood: {mood}. Japanese manga art style, expressive characters, dynamic composition. Speed lines and effect marks for action scenes. Inner thoughts shown in smaller panels.
```

---

### 分类 5：人物肖像 (portraits)

#### 模板 5.1：角色设定稿
**ID**: `character-sheet`
**描述**: 角色综合设定稿，三视图+表情+服装+配色板

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| character_name | text | 是 | 角色名称 | - |
| gender | select | 是 | 性别 | 男性, 女性, 其他 |
| age_group | select | 是 | 年龄段 | 儿童, 青少年, 成年, 老年 |
| character_type | select | 是 | 角色类型 | 战士, 法师, 盗贼, 骑士, 弓箭手 |
| outfit_style | select | 是 | 服装风格 | 奇幻, 科幻, 中世纪, 现代, 赛博朋克 |

**Prompt 模板**:
```
Character design sheet, {character_name}. Gender: {gender}, Age: {age_group}, Type: {character_type}. Outfit style: {outfit_style}. Front view, side view, back view poses. Expression sheet showing happy, angry, sad, neutral expressions. Color palette swatch. Clean character design document style.
```

---

### 分类 6：品牌包装 (branding)

#### 模板 6.1：品牌识别系统板
**ID**: `brand-identity-board`
**描述**: 品牌识别系统板，logo+配色+字体+应用 mockup

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| brand_name | text | 是 | 品牌名称 | - |
| industry | select | 是 | 行业 | 科技, 时尚, 食品, 健康, 金融 |
| mood | select | 是 | 品牌调性 | 专业, 活泼, 高端, 简约, 大胆 |

**Prompt 模板**:
```
Brand identity board, {brand_name}. Industry: {industry}. Mood: {mood}. Logo design showcase, color palette with hex codes, typography samples, brand applications on business cards, letterhead, packaging mockups. Comprehensive brand guidelines presentation board.
```

---

### 分类 7：海报宣传 (poster)

#### 模板 7.1：品牌主海报
**ID**: `brand-poster`
**描述**: 品牌主海报，产品/人物/纯文字主张

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| brand_name | text | 是 | 品牌名称 | - |
| campaign_theme | text | 是 | 活动主题 | - |
| main_message | text | 是 | 主标语 | - |
| visual_type | select | 是 | 视觉类型 | 产品为主, 人物为主, 文字为主, 抽象图形 |
| color_scheme | select | 是 | 配色方案 | 大胆撞色, 简约黑白, 暖色调, 冷色调, 高端金色 |

**Prompt 模板**:
```
Brand poster, {brand_name}. Campaign theme: {campaign_theme}. Main message: {main_message}. Visual type: {visual_type}. Color scheme: {color_scheme}. Bold graphic design, professional marketing material. High impact composition suitable for large format printing. Clean typography hierarchy.
```

---

### 分类 8：技术图表 (technical)

#### 模板 8.1：系统架构图
**ID**: `technical-system-architecture`
**描述**: 系统架构图，前端+后端+DB+缓存+队列+外部服务

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| system_name | text | 是 | 系统名称 | - |
| components | textarea | 是 | 主要组件 | 用逗号分隔，如: 前端, API, 数据库, 缓存 |
| has_external | select | 否 | 外部服务 | 有, 无 (默认: 无) |

**Prompt 模板**:
```
System architecture diagram, {system_name}. Components: {components}. External services: {has_external}. Dark grid background, clean technical illustration style. Rectangular blocks for services, cylinders for databases, arrows showing data flow. Labeled connections with protocol indicators. Professional technical diagram, 16:9 aspect ratio.
```

---

#### 模板 8.2：流程图
**ID**: `technical-flowchart`
**描述**: 流程图/决策图，BPMN 形状语义+Yes/No 分支

**参数**:
| 参数名 | 类型 | 必填 | 标签 | 选项/说明 |
|--------|------|------|------|-----------|
| process_name | text | 是 | 流程名称 | - |
| steps | textarea | 是 | 步骤 | 用逗号分隔各步骤 |
| has_decision | select | 否 | 决策节点 | 有 (默认), 无 |

**Prompt 模板**:
```
Flowchart diagram, process: {process_name}. Steps: {steps}. Decision nodes: {has_decision}. Clean technical diagram style with rounded rectangles for processes, diamonds for decisions, arrows for flow. Yes/No labels on decision branches. Professional documentation style.
```

---

## 使用方式

### API 调用

```bash
# 获取所有模板
GET /api/v2/skills/templates

# 对话分析推荐
POST /api/v2/skills/chat
{
  "message": "我要生成一个电商UI界面",
  "skill_id": "gpt_image_2",
  "chat_history": []
}

# 发起生图任务
POST /api/v2/skills/generate
{
  "template_id": "ui-mockups-social-interface",
  "form_data": {
    "platform": "xiaohongshu",
    "username": "test_user",
    "content_type": "image",
    "post_text": "测试内容",
    "likes": "1.2万",
    "comments": "888",
    "shares": "123"
  },
  "skill_id": "gpt_image_2",
  "size": "1024x1024",
  "quality": "standard"
}

# 查询任务状态
GET /api/v2/skills/tasks/{task_id}
```

### Workflow 节点

18 个 Workflow 模板可通过以下路径访问：
- `src/components/nanoai-workflow/templates/skillsWorkflowTemplates.ts`

---

## 扩展指南

如需添加新模板：

1. 在 `backend/app/services/skills/gpt_image_2/templates/` 创建 JSON 文件
2. 遵循上述参数结构定义 fields
3. 编写 prompt_template（使用 `{字段名}` 占位符）
4. 重启后端服务自动加载

---

**文档版本**: 1.0
**最后更新**: 2026-05-06