# V26 三幕结构设计 + 实施计划

> **状态**：📋 分析研究阶段（用户要求"先分析计划直到我说好了"）
> **创建**：2026-10-04
> **作者**：BB小子 🤙

---

## 1. 背景与问题复盘

### V19-V25 反复跑偏的根本原因

| 版本 | 偏离点 |
|------|--------|
| **V19** | ✅ 字幕同步完美；⚠️ 开场有 Logo 横幅 |
| **V20** | ✅ 视觉优化；⚠️ 桶上英文不准（GALAXY CHICKEN） |
| **V22** | ⚠️ 镜头顺序错位（H3 自由重排） |
| **V23** | ❌ 单镜模式把所有元素揉成 15s 同场景 |
| **V24** | ✅ 三段独立镜头；但产品桶上英文错 |
| **V25** | ❌ 人物设定跑偏（**像 KFC 员工**），背景出现 KFC |

### 用户原话（设计哲学核心）

> "**不应该出现 KFC，人物又不是 KFC 的人，是天体研究院的人，逻辑硬伤**"
>
> "**结尾一个出现一个这次宣传页的**"（指用户发的"天生翅粉 宇宙同频"KV 图）
>
> "**尾帧应该采用过渡动画首尾**"
>
> "**开篇应该是根据故事脚本以对白故事线驱动分镜头脚本演绎，采用三幕结构，开头结尾不变，变化的中间一幕的分镜头情节，衍生不同版本**"

---

## 2. V26 设计哲学：固定首尾 + 可变中间

### 2.1 三幕结构（核心）

```
┌─────────────────────────────────────────────────────┐
│  第一幕（固定）    第二幕（可变）    第三幕（固定）     │
│  0-5s              5-12s              12-15s          │
│  研究员工作场景    中间情节           过渡动画         │
│  无 KFC 元素       可换剧本           → KV 宣传页      │
│  天体物理研究员    衍生 V26A/B/C/D    天生翅粉宇宙同频  │
└─────────────────────────────────────────────────────┘
```

### 2.2 固定部分（所有 V26 版本共享）

| 元素 | 描述 | 状态 |
|------|------|------|
| **第一幕** | 天体物理实验室控制台场景 | 🔒 固定 |
| **人设** | 3D 卡通理工男研究员（聪明小子气质） | 🔒 固定 |
| **场景道具** | **实验室显示屏（多屏）+天体实验室元素**（辐射警告/控制台/数据看板/星图全息投影等） | 🔒 固定 |
| **第三幕** | 过渡动画 → KV 宣传页 | 🔒 固定 |
| **字幕台词** | 三句固定台词 | 🔒 固定 |

> ⚠️ **关键修正（2026-10-04）**：
>
> 1. **第一幕和第二幕不出现窗口/窗户**（用户否决），改为实验室显示屏 + 天体实验室元素
> 2. **人物是 3D 卡通理工男**（用户原话：3D 卡通，优化人物形象设计，视觉上就是理工男和聪明小子感觉）
>    - **不是真人版**（V23 那种写实人物已否决）
>    - **不是 Q 版萌系**（V19 "Q版吃货哥" 偏可爱，V26 要的是理工男的聪明感）
>    - **视觉关键词**：戴黑框眼镜 + 略带书卷气 + 专注思考 + 表情机灵 + 理工气质

### 2.3 可变部分（中间一幕衍生）

| 版本 | 中间情节 | 视觉调性 | 状态 |
|------|---------|---------|------|
| **V26A** | 显示屏切换到全息星图（仍是实验室控制台） | 冷蓝紫调 + 全息投影 | ✅ **第一版（待执行）** |
| **V26B** | 显示屏出现神秘信号波形 + 警示灯闪烁 | 暖光闪过 + 信号波纹 | 📋 后续追加 |
| **V26C** | 显示屏 3D 模拟虫洞 | 几何粒子 | 📋 后续追加 |
| **V26D** | 显示屏数字矩阵粒子推演 | 数字矩阵 | 📋 后续追加 |

> ⚠️ **重要约束**：第二幕**仍在天体物理实验室控制台**，不是户外宇宙。研究员看着大屏变化，**人不离开实验室**。

---

## 3. KV 宣传页视觉规范（尾帧）

### 3.1 用户提供的 KV 图（来源）

```
路径：/private/tmp/claude-501/.../images/7.webp（256KB）
备份：/Users/mac/Documents/KFC-TVC/assets/KV_天生翅粉宇宙同频.webp
```

### 3.2 KV 必含元素（用于一致性校验）

| 元素 | 描述 | 位置 |
|------|------|------|
| **KFC 文字图标** | KFC 标准字 | 顶部 |
| **三体 THREE-BODY** | 三体 20 周年标志 | 顶部右侧 |
| **20 YEARS 徽章** | 周年标识 | 顶部最右 |
| **主标题** | "天生翅粉 宇宙同频"（双行大字） | 上半中央 |
| **黑金桶** | KFC × 三体联名桶 | 中心 |
| **鸡翅散落** | 8-10 只金黄+烤翅 | 桶四周爆炸 |
| **桶身副标** | KFC \| 三体 + 天生翅粉宇宙同频 | 桶身 |
| **鸡翅品种** | 香辣鸡翅 / 新奥尔良烤翅 | 左下/右下 |
| **经典版** | 红标 | 右下 |
| **十翅一桶** | 白色大字 | 右下 |
| **¥39.9** | 红色大字 | 右下最底 |
| **©三体宇宙** | 版权 | 左下角 |

### 3.3 KV 配色

| 颜色 | 用途 | 色值 |
|------|------|------|
| **深蓝** | 星空背景 | #0A1A3F |
| **白** | 主标题/桶身文字 | #FFFFFF |
| **黑** | 桶身/底部 | #1A1A1A |
| **红（KFC 红）** | 价格/经典版/Logo | #E4002B (PANTONE 185C) |
| **金黄** | 鸡翅 | #F5A623 |
| **红褐** | 烤翅 | #C0392B |

---

## 4. KFC 品牌规范（已读 Guideline 1-20 页）

### 4.1 三大元素（A01）

- 山德士上校图标
- KFC 文字图标
- 红白条纹

### 4.2 标准色（A02）

| 色名 | 用途 | 色值 |
|------|------|------|
| PANTONE 185C | KFC 红（主色） | #E4002B |
| 黑 | 文字图标底色 | #000000 |
| 白 | 背景 | #FFFFFF |

### 4.3 桶形主品牌图标（A06）

- 红白条纹桶身（官方 KFC 桶）
- 山德士上校头像（KFC 标准）
- 底部 KFC 文字图标

### 4.4 中文标语

- 主标：**肯德基**（粗体红）
- 副标：**永远好滋味**（书法红）

### 4.5 联名宣传语组合（A09）

```
山德士上校 + KFC 文字图标 + 肯德基 + 永远好滋味
```

### 4.6 V26 实际使用的桶（联名款）

⚠️ **用户提供的 KV 图是 KFC×三体联名款**，与官方红白桶不同：

| 元素 | 官方红白桶（A06） | V26 KV 联名桶 |
|------|------------------|--------------|
| 桶身 | 红白条纹 | **黑色磨砂** + 星空图案 |
| Logo | 山德士上校 + KFC | **KFC + 三体 THREE-BODY + 三角星图** |
| 副标 | 肯德基 + 永远好滋味 | "天生翅粉 宇宙同频"（大字） |
| 适用场景 | 常规 KFC 产品 | **联名限定款**（V26 选用） |

> **V26 第三幕 KV**：直接用用户提供的联名款海报（黑金桶+联名 Logo），不是 H3 生成的红白桶。

---

## 5. V26 关键技术挑战

### 5.1 人物一致性（三幕共享同一研究员）

**挑战**：H3/GPT-Image-2 生成研究员时，三幕人物五官/服装/年龄必须一致

**人物定位**（用户精确化）：3D 卡通理工男 + 聪明小子
- 30 岁亚洲青年男子
- 戴黑框眼镜（书卷气）
- 略带理工男气质（不修边幅但专注）
- 表情机灵（聪明小子感）
- 3D 卡通风格（不是真人写实，不是萌系 Q 版）
- 服装：白大褂 + 深色高领毛衣
- 短黑发

**解决路径**：
1. **方案 A**：先生成研究员三视图（character_ref），作为三幕共享参考图
2. **方案 B**：用 `character_desc` 高度具体化（年龄+发型+眼镜+服装细节+气质关键词），强制三幕 prompt 描述一致
3. **方案 C**：用 character_ref 图片上传 COS，传 `reference_image` 给 GPT-Image-2

**推荐**：A + B 组合（最稳）

**character_desc 精炼模板**（喂给 H3 / GPT-Image-2）：

```
A 30-year-old Asian male astrophysicist in 3D CG cartoon style (NOT realistic, NOT chibi Q-style).
Visual: black-framed glasses, short black hair, slightly geeky but focused expression, sharp clever eyes.
Outfit: white lab coat over dark turtleneck sweater.
Vibe: intellectual engineer / smart young researcher.
Body: lean, average height.
```

### 5.2 尾帧 KV 注入

**挑战**：H3 默认用 prompt 描述生成 KV，与用户提供的 KV 图不一致

**解决路径**：
| 路径 | 方式 | 优点 | 缺点 |
|------|------|------|------|
| **A** | H3 `last_frame_url` 参数 | H3 自动衔接 | H3 内部转场不可控 |
| **B** | ffmpeg 后处理拼接 | 完全可控 | 需手动拼接 |
| **C** | 第一幕用 H3 渲染，第三幕 KV 用 ffmpeg 叠图 | 折中 | 中间需转场 |

**推荐**：A + B 组合
- 上传用户 KV 图到 COS → 拿到 URL
- H3 第三幕用 `last_frame_url` 强制对齐
- 后处理阶段用 ffmpeg xfade 做转场收尾

### 5.3 三幕结构实现

**挑战**：shot_count=1 走一镜到底（V23 失败教训），shot_count=3 走多镜拼接（V24 验证可行）

**当前 tvc_engine.py 路径**：
```python
if shot_count == 1:
    # one_shot_prompt.py 单镜模板（V23 失败教训）
elif shot_count >= 2:
    # h3_prompt.py 多镜模板（V24 验证可行）
```

**推荐**：shot_count=3（V24 验证过），每幕独立视频，**时长 4s+7s+4s=15s**（见 §5.8）
- 第一幕 4s（控制台全景）
- 第二幕 7s（显示屏变化，可换剧本）
- 第三幕 4s（KV 收尾）
- ffmpeg xfade 拼接

### 5.4 字幕三段同步

**挑战**：三段独立视频，每段一句台词，时间窗与视频对齐

**当前 dialogue_timeline + srt_entries 机制**（V22 已验证）：
- `parsed_script.dialogue_timeline` 由 DS4 脚本生成
- 格式：`[{line, start, end}, ...]`
- `tvc_engine.py` 把 dialogue_timeline 注入 story_shots → `has_timeline=True` → 走精确时间窗分支
- `compile_h3_prompt` 返回 `srt_entries`（与 `<d>` 同源时间轴）
- `srt_generator.generate_srt()` 输出 SRT 文件（语速 3.5 字/秒 + 自动换行 14 字/行 + 末行截断）
- `TVC_SUBTITLE_BURN` 默认 False（clean frame，字幕由 H3 原生 on-screen text 渲染）

**推荐**：保持 V22 dialogue_timeline 设计，三幕各一句，时间窗见 §5.8。

### 5.5 过渡动画（V19 风格）

**挑战**：第一幕（研究员场景）→ 第三幕（KV 页）的转场

**当前 V19 实现**：
- 第一幕 H3 渲染 + on-screen text（"探索美味新宇宙"）
- 第三幕用 first_frame KV 图（H3 last_frame 模式）
- 自动衔接（fade transition）

**V26 推荐**（基于 4+7+4=15s）：
- 第一幕 H3 渲染（4s）— 控制台全景
- 第二幕 H3 渲染（7s）— 显示屏全息星图变化
- 第三幕 H3 渲染 + last_frame_url=KV（4s）— KV 收尾
- ffmpeg xfade 转场参数：
  - 第一幕→第二幕：fade（淡入淡出 0.5s，offset=4.0）
  - 第二幕→第三幕：fade（淡入淡出 0.5s，offset=10.5）
  - 第三幕→KV：H3 last_frame 自然收尾

### 5.6 衍生版本管理

**挑战**：V26A/B/C/D 共享首尾，只有中间一幕不同

**推荐数据结构**：
```python
V26_TEMPLATES = {
    "act_1_fixed": "...",   # 固定（控制台场景）
    "act_3_fixed": "...",   # 固定（KV 收尾）
    "act_2_variable": {
        "V26A_holo_galaxy":   "...",   # 显示屏切换全息星图（默认版）
        "V26B_mystery_signal": "...",   # 神秘信号波形
        "V26C_wormhole":      "...",   # 虫洞模拟
        "V26D_quantum":       "...",   # 量子推演
        # ...可继续衍生
    }
}
```

**批处理**：脚本化生成 V26A/B/C/D，10-15 分钟一批

⚠️ **重要**：所有变体第二幕都**仍在实验室控制台**（人不动），变化的是显示屏内容。

---

## 5.7 V19 字幕显示效果深挖（用户硬约束）

> 用户要求：**"字幕要 V19 字幕那种效果"** → V26 字幕必须按 V19 样式 1:1 复刻

### 5.7.1 V19 字幕实测分析（4 帧）

| 时间 | 画面 | 字幕内容 | 备注 |
|------|------|---------|------|
| **1s** | 3D 研究员 + 望远镜 | "宇宙这么大，" | 第一幕工作场景字幕 |
| **5s** | 桶+鸡翅特写 | "而我，" | 第二幕字幕 |
| **10s** | 桶+手拿翅 | "肯德基×三体宇宙，" | 第三幕字幕 |
| **13s** | KV 宣传页 | 无字幕 | KV 完整展示 |

### 5.7.2 V19 字幕视觉规范（保留）

| 元素 | 规范 | 详细 |
|------|------|------|
| **位置** | 底部居中（画面高度约 1/6） | 距底部约 1/8 高度 |
| **形状** | **斜切角矩形**（左右上角 45° 斜切） | 科技感 HUD 风 |
| **边框** | **蓝色发光描边** | 明亮青色/蓝色霓虹光 |
| **文字** | **白色粗体大号** | 居中对齐 |
| **背景** | **半透明深蓝/黑色 box** | 增强对比度 |
| **引号** | **单引号** `'xxx'`（避免与 H3 引号冲突） | 双引号 H3 内部转义 |
| **时序** | **一镜一句**（每幕恰好一句） | 准时序切换 |

### 5.7.3 V19 多余元素（V26 删除）

| 元素 | 描述 | V26 处理 |
|------|------|---------|
| ❌ **顶部角标框** | "镜头1 0-5秒" + "天体研究院：Q版吃货哥在望远镜前严雨思考" | **删除**（这是 prompt 调试残留） |
| ❌ **顶部 Logo 横幅** | "KFC × 三体宇宙" 从头到尾一直在 | **开场隐藏**，仅第三幕 KV 自然出现 |

### 5.7.4 V26 字幕完整 prompt 描述（喂给 H3）

```
字幕样式约束（V26 = V19 风格）：
- 位置：底部居中（距底部约 1/8 画面高度）
- 形状：斜切角矩形（左右上角 45° 斜切，HUD 科技感）
- 边框：蓝色发光描边（青色霓虹光）
- 文字：白色粗体大号，居中对齐
- 背景：半透明深蓝/黑色 box
- 引号：单引号（例：'有人研究宇宙')
- 时序：一镜一句（每幕恰好一句，准时序切换）
- 严格禁止：顶部任何文字框、顶部 Logo 横幅（仅 KV 自然出现）
```

### 5.7.5 V19 vs V26 字幕对比

| 项 | V19 | V26 | 状态 |
|----|-----|-----|------|
| 底部斜切角字幕框 | ✅ | ✅ | 保留 |
| 蓝发光描边 | ✅ | ✅ | 保留 |
| 白色粗体 | ✅ | ✅ | 保留 |
| 半透明背景 | ✅ | ✅ | 保留 |
| 单引号 | ❌（双引号） | ✅ | 修正 |
| 一镜一句 | ✅ | ✅ | 保留（3 句） |
| 顶部角标 | ❌（多余） | ✅ 删除 | 修正 |
| 顶部 Logo 横幅 | ❌（一直显示） | ✅ 开场隐藏 | 修正 |
| 第三幕 KV | ❌（H3 生成假 KV） | ✅ 用用户原图 last_frame | 修正 |

### 5.8 时间分配优化（关键修正）

**问题**：原分配 5s+7s+3s=15s，但第三幕 3s 过短，KV 显示 + 字幕 + 转场都挤在一起。

**修正后分配**：

```
┌──────────────────────────────────────────────────────────────┐
│  第一幕（固定）       第二幕（可变）      第三幕（固定）         │
│  4s                  7s                  4s                   │
│  0.0-4.0s            4.0-11.0s           11.0-15.0s           │
│  控制台场景          显示屏变化          KV 收尾              │
│  字幕：13字/3.7s     字幕：16字/4.6s     字幕：7字/2s          │
└──────────────────────────────────────────────────────────────┘
```

| 幕 | 时长 | 字幕时长 | 画面结束位置 |
|----|------|---------|------------|
| 第一幕 | 4s | 3.7s | 控制台全景 |
| 第二幕 | 7s | 4.6s | 显示屏特写 |
| 第三幕 | 4s | 2s | KV 完整定格（2s 字幕 + 2s KV 静帧） |

**H3 兼容性**：单段 ≥4s（前面看过 `cut_s = max(4, duration - 3)`），4s 起步满足要求。

---

## 6. V26 实施步骤（完整版）

### Step 1：KV 图上传 COS（5 分钟）

**目的**：把用户提供的 KV 海报传到 COS，拿到 HTTPS URL 作为 H3 last_frame_url

**工具路径**：
- **优先**：用项目自带的 `cos_upload.py` 服务（`backend/app/services/cos_upload.py`）
- **备选**：coscmd CLI（已部署）
- **备选**：写个 Python 脚本调用腾讯云 COS SDK

**操作步骤**：
```bash
# 1. 验证源文件存在
ls -lh /Users/mac/Documents/KFC-TVC/assets/KV_天生翅粉宇宙同频.webp

# 2. 通过 cos_upload 上传（走项目 bucket，路径用英文避免编码问题）
python3 -c "
from app.services.cos_upload import upload_file
url = upload_file(
    local_path='/Users/mac/Documents/KFC-TVC/assets/KV_天生翅粉宇宙同频.webp',
    cos_key='tvc/v26/kv-santi-final.webp',
    bucket='nanoai-tvc-hk-1418512491'
)
print(url)
"

# 3. 验证 URL 可访问（公网可读）
curl -I "https://nanoai-tvc-hk-1418512491.cos.ap-hongkong.myqcloud.com/tvc/v26/kv-santi-final.webp"
```

**输出**：`https://nanoai-tvc-hk-1418512491.cos.ap-hongkong.myqcloud.com/tvc/v26/kv-santi-final.webp`

> ⚠️ **路径必须用英文**（参考全局规则 `filename-english-only` memory），源文件本地保留中文文件名（用户原资产），COS 路径统一英文。

### Step 2：研究员 character_ref 生图（3 分钟）

**目的**：先生成研究员三视图，上传 COS，作为 GPT-Image-2 reference_image

**操作步骤**：
```bash
# 1. 调用 character_sheet 生成（用 build_character_sheet_prompt 模板）
curl -s -X POST "https://91zm.com.cn/nanoai/api/v2/image/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "professional character sheet of a 30-year-old Asian astrophysicist young man, front/side/back view, clean layout on white background, 3D CG Pixar style, wearing white lab coat over dark turtleneck sweater, black-framed glasses, short black hair, friendly curious expression. Brand: KFC red + black + white.",
    "aspect_ratio": "1:1",
    "model": "gpt-image-2"
  }' --max-time 60

# 2. 下载生成的 character_ref 图 → 上传 COS
# 3. 拿到 URL（如 https://.../character_ref.png）
```

**输出**：`https://.../character_ref.png`（用作 step-images 的 reference_image）

### Step 3：V26A prompt 设计（5 分钟）

详见 §5.8 + §6 Step 3 的最终 prompt 模板（已修正实验室控制台）。

### Step 4：构造 POST payload + 提交任务（5 分钟）

**完整 payload 模板**（基于 V24 验证过的参数）：

```json
{
  "workflow_id": "kfc-santi-v26a",
  "prompt": "<见 §6 Step 3 的 V26A 完整 prompt>",
  "shot_count": 3,
  "shot_duration": 5,
  "total_duration": 15,
  "mode": "cinematic",
  "style": "3d",
  "optimize_mode": "tvc_deep",
  "execution_mode": "auto",
  "image_model": "gpt-image-2",
  "aspect_ratio": "9:16",
  "character_desc": "A 30-year-old Asian male astrophysicist in 3D CG cartoon style (NOT realistic, NOT chibi Q-style). Black-framed glasses, short black hair, slightly geeky but focused expression, sharp clever eyes. White lab coat over dark turtleneck sweater. Lean, average height. Vibe: intellectual engineer / smart young researcher.",
  "product_name_desc": "三体宇宙联名翅桶",
  "product_sell": "KFC×三体宇宙 联名 10翅一桶",
  "product_price": "¥39.9",
  "voice_gender": "male",
  "voice_preset": "male-elite",
  "last_frame_url": "https://<KV_cos_url>",
  "reference_image": "https://<character_ref_url>",
  "product_image": "https://<character_ref_url>"
}
```

**字段说明**：
- `character_desc`：3D 卡通理工男（英文版喂 H3，避免 H3 字符集问题）
- `last_frame_url`：用户提供的 KV 图 URL（强制 H3 收尾对齐）
- `reference_image`：character_ref 三视图 URL（GPT-Image-2 参考图，提升一致性）
- `product_image`：同 character_ref（V22 验证过减少产品走样）
- `dialogue_timeline`：**不传**，由 DS4 脚本生成自动注入（见 §5.4）

**提交命令**：
```bash
curl -s -X POST "https://91zm.com.cn/nanoai/api/v2/tvc-tasks/submit" \
  -H "Content-Type: application/json" \
  -d @/tmp/v26a_payload.json --max-time 20
```

**返回**：`{"task_id": "tvc_xxx", "status": "submitted"}`

### Step 5：等待任务完成（15-20 分钟）

- step-script → step-optimize → step-breakdown → step-images → step-video
- 轮询查询：`GET /api/v2/tvc-tasks/{task_id}` 每 60 秒

### Step 6：下载视频 + ffmpeg 拼接 + 字幕烧录（10 分钟）

```bash
# 1. 下载 3 段视频（H3 渲染时长会有 ±0.2s 浮动）
# act1 实际 ~4.16s + act2 实际 ~7.16s + act3 实际 ~5.16s
# 容差范围内，按 4+7+5=16s 设计，最后 1s 用于 KV 收尾+ 转场

# 2. ffmpeg xfade 拼接（基于 act1=4s, act2=7s, act3=5s = 16s）
#    offset 算法：offset = 前视频末尾 - fade_duration
#    act1→act2: offset = 4 - 0.5 = 3.5
#    act2→act3: offset = 4 + 7 - 0.5 = 10.5
#    act3 从拼接轴 10.5s 开始到 10.5+5=15.5s → 截到 15s = 15s 总时长 ✓
ffmpeg -i act1.mp4 -i act2.mp4 -i act3.mp4 \
  -filter_complex "
    [0:v][1:v]xfade=transition=fade:duration=0.5:offset=3.5[v01];
    [v01][2:v]xfade=transition=fade:duration=0.5:offset=10.5[v012];
    [0:a][1:a][2:a]concat=n=3:v=0:a=1[aout]
  " \
  -map "[v012]" -map "[aout]" \
  -c:v libx264 -preset veryfast -crf 22 \
  -c:a aac -movflags +faststart v26a_concat.mp4

# 3. 截取到精确 15s（裁掉多余的 0.5s 静态画面）
ffmpeg -y -i v26a_concat.mp4 -t 15 -c copy v26a_final.mp4
```

> ✅ **音频策略（M12）**：H3 模型自带配音 + BGM
> - 配音：`compile_h3_prompt` 已传入 `voice_gender=male` + `voice_preset=male-elite`
> - BGM：传入 `bgm_prompt`（如"cinematic, hopeful, orchestral"）
> - 每段 H3 视频自带独立音轨
> - ffmpeg concat 用 `-c:a aac` 保留 H3 生成的音频，避免重编码
> - **不依赖后处理 TTS 叠加或 amix 混音**

> ⚠️ **TVC_SUBTITLE_BURN 开关**（`backend/app/config.py`）：默认 False。V26 字幕由 H3 原生 on-screen text 渲染（与 V19 一致），**不需要后烧录**。仅当 H3 字幕失效时启用兜底。

### Step 7：验收（5 分钟）

按 §7 验收标准逐项检查（人设一致性 / KV 一致性 / 字幕同步 / 镜头拼接）。

### Step 8（后续追加）：V26B/C/D 衍生

用户当前决定只做 V26A。V26B/C/D 后续按需追加，**共享首尾 + 不同中间一幕**。

---

## 7. 验收标准（V26 Acceptance Gate）

### 7.1 人设一致性（必检）

- [ ] 第一幕/第二幕无 KFC/Logo/桶/鸡翅/价格
- [ ] 研究员服装一致（白大褂+深色高领毛衣）
- [ ] 研究员年龄/发型/眼镜一致
- [ ] 背景不出现 KFC 门店/Logo/工服

### 7.2 KV 一致性（必检）

- [ ] 尾帧使用用户提供的"天生翅粉宇宙同频"KV
- [ ] KFC 文字图标正确
- [ ] 三体 + 20 YEARS 徽章正确
- [ ] "天生翅粉宇宙同频"主标题正确
- [ ] 黑金桶 + 鸡翅散落正确
- [ ] ¥39.9 价格正确
- [ ] 鸡翅品种标注（香辣/新奥尔良）正确
- [ ] 经典版红标正确
- [ ] ©三体宇宙版权正确

### 7.3 字幕同步（必检，时间窗基于 4+7+4=15s）

- [ ] "有人研究宇宙，有人探索未知……" 在 0-4s（13 字 / 3.7s）
- [ ] "而我，只想知道今天，肯德基x三体宇宙" 在 4-11s（16 字 / 4.6s）
- [ ] "探索美味新宇宙" 在 11-15s（7 字 / 2s）
- [ ] 字幕时间窗与画面一致（V19 风格斜切角 + 蓝发光描边）
- [ ] SRT 文件生成 + 烧录（force_style 来自 srt_generator.py）

### 7.4 镜头拼接（必检）

- [ ] 第一幕→第二幕 转场自然（无黑场/卡顿）
- [ ] 第二幕→第三幕 转场自然
- [ ] 第三幕→KV 完整定格
- [ ] 总时长 = 15s ±0.5s

### 7.5 衍生版本（V26A/B/C/D）

- [ ] V26A 显示屏全息星图：冷蓝紫调 + 实验室显示屏投影（不变户外）
- [ ] V26B 神秘信号波形：显示屏异常波形 + 警示灯闪烁
- [ ] V26C 虫洞 3D 模拟：显示屏几何粒子
- [ ] V26D 量子推演：数字矩阵粒子在屏幕滚动

> ⚠️ 所有 V26 衍生版本**人都不离开实验室控制台**，变化的是显示屏内容。

---

## 8. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| **KV 图上传 COS 失败** | V26 阻塞 | 备用路径：H3 用 prompt 描述生成 KV（牺牲一致性） |
| **character_ref 一致性失败** | 三幕人物五官不一 | 用 V24 验证过的 shot_count=3 + 共享 character_desc |
| **H3 last_frame_url 不可控** | 转场生硬 | ffmpeg 后处理 xfade 二次补救 |
| **三幕拼接时间精度** | 字幕错位 | dialogue_timeline 硬约束（V22 已验证） |
| **GPT-Image-2 排队拥塞** | 生成慢 | 错峰提交 + 失败重试机制 |

---

## 9. 时间线估算（V26A 单版本）

| 阶段 | 工作量 | 预计耗时 |
|------|--------|----------|
| Step 1：KV 上传 COS | cos_upload 调用 + 验证 URL | 5 分钟 |
| Step 2：character_ref 生图 + 上传 | GPT-Image-2 三视图 + COS | 5 分钟 |
| Step 3-4：prompt 设计 + payload 构造 | 设计 + curl | 10 分钟 |
| Step 5：等待 H3 任务完成 | step-script→optimize→breakdown→images→video | 15-20 分钟 |
| Step 6：下载 + xfade 拼接 + 字幕烧录 | ffmpeg 脚本 | 10 分钟 |
| Step 7：验收 | 16 项 acceptance_gate | 5 分钟 |
| **总计** | — | **约 50-55 分钟** |

> V26B/C/D 后续追加每版本约 30 分钟（共享首尾 + KV + character_ref）。

---

## 10. 已确认决策（2026-10-04）

| # | 决策点 | 决策 | 影响 |
|---|--------|------|------|
| 1 | KV 图上传 COS | ✅ 同意上传 | 拿到 last_frame_url |
| 2 | character_ref 三视图 | ✅ A+B 组合（参考图 + 详细 prompt） | 提升三幕人物一致性 |
| 3 | V26A 默认中间情节 | ✅ 显示屏切换全息星图（仍是实验室控制台） | 默认版 |
| 4 | 转场方案 | ✅ A+B 组合（H3 last_frame + ffmpeg xfade） | 自动 + 手动双重保险 |
| 5 | 衍生版本数量 | ✅ 先做 1 个（V26A），后续按需追加 | 控制首批工作量 |

### 关键修正（用户审阅后追加）

| # | 修正 | 来源 |
|---|------|------|
| M1 | **不出现窗口/窗户**，第一幕和第二幕用实验室显示屏 + 天体实验室元素 | 用户原话 |
| M2 | **字幕要 V19 字幕那种效果**（底部斜切角 + 蓝发光描边 + 单引号） | 用户原话 |
| M3 | **删除 V19 顶部角标框**（"镜头1 0-5秒"等调试残留） | 用户硬约束 |
| M4 | **开场隐藏 Logo 横幅**（仅 KV 自然出现） | V19 一直存在的 bug |
| M5 | **第三幕延长到 4s**（原 3s 过短，KV 显示时间不够） | 自我审查 |
| M6 | **第二幕仍是实验室控制台**，不切换到户外宇宙 | 用户硬约束 |
| M7 | **研究员是 3D 卡通理工男 + 聪明小子气质**（不是真人写实，不是 Q 版萌系） | 用户硬约束 |
| M9 | **character_desc 改英文版喂 H3**（避免中文字符集问题） | 自我审查 |
| M10 | **COS 路径用英文**（遵循 filename-english-only 全局规则） | 自我审查 |
| M11 | **TVC_SUBTITLE_BURN 默认 False**（H3 原生字幕足够） | 自我审查 |
| M12 | **使用 H3 模型自带配音和 BGM**（不依赖后处理 TTS/混音） | 用户原话 |

---

**全部决策已确认。** 等用户说"**好了**"开始执行 V26A。

🤙
