# 数字人设计 V1（南北双版 · 新中式 · 真人写实 · 白底单图）

> 状态：待批准执行（已过审查 R1-R5）
> 风格：**真人写实**（photorealistic 人像摄影质感，非 3D 渲染感）
> 工具：gpt-image-2.5（速创 Authorization header）· 本地直跑
> 产出：南/北各 2 张（正面全身主图 + 面部特写）· 3:4 · 纯白底

---

## 审查修正记录

| # | 问题 | 修正 |
|---|------|------|
| R1 | 三视图 sheet 与真人写实冲突 | 弃三视图，改"正面主图 + 面部特写"两图一组 |
| R2 | 三视图对 H3 下游无用（YAGNI） | 主图即 reference_image/first_frame 锚点 |
| R3 | 容器内运行链路冗长 | 本地直跑，key 环境变量传递不落盘 |
| R4 | 眼距/妆容措辞风险 | broad-set→well-set；统一 light natural makeup |
| R5 | 无迭代策略 | 首轮南北同出，后续只重出不达标版 |

## Step 1：提示词定稿

### 南方版 · 主图（正面全身）

```
Photorealistic full-body portrait photography of a 30-year-old Chinese
Southern woman, Jiangnan water-town classical beauty. Oval face, almond eyes,
delicate thin lips, fair smooth skin with natural texture and visible fine
pores, light natural makeup. Gentle, reserved, scholarly temperament — a
book-loving intellectual. Long straight black hair with soft natural fall.
New-Chinese-style outfit: stand-collar cotton-linen tea dress with mamian
skirt, palette of moon-white / lotus-pink / misty-blue. Standing pose, facing
camera, relaxed natural posture with hands gently clasped. Clean pure white
studio background (#FFFFFF), soft even editorial lighting, 85mm lens look,
natural skin tones, individually rendered hair strands, real fabric drape
and weave. Style anchor: Vogue China editorial, cinematic period-drama
stills. Avoid: 3D render, CGI look, plastic doll skin, anime, chibi,
illustration, celebrity likeness, busy background, props, heavy makeup.
```

### 南方版 · 面部特写

```
Photorealistic headshot close-up of the same woman: 30-year-old Chinese
Southern Jiangnan classical beauty, oval face, almond eyes, delicate thin
lips, fair skin with natural pores, light natural makeup, gentle reserved
scholarly expression. Long straight black hair framing face. Neutral
collar hint of moon-white linen. Clean pure white studio background,
soft editorial lighting, 85mm lens, Vogue China editorial quality.
Avoid: 3D render, CGI, plastic skin, anime, heavy makeup.
```

### 北方版 · 主图（正面全身）

```
Photorealistic full-body portrait photography of a 30-year-old Chinese
Northern woman, Beijing-style dignified classical beauty. Full oval face
with subtle square jawline, well-set expressive eyes, sculpted yet feminine
bone structure, natural skin texture with visible fine pores, light natural
makeup. Stately, composed, gracious presence — a book-loving intellectual.
Full low chignon updo hairstyle. New-Chinese-style outfit: brocade
stand-collar long top with satin mamian skirt, palette of crimson /
dark-green / azurite-blue. Standing pose, facing camera, dignified natural
posture. Clean pure white studio background (#FFFFFF), soft directional
studio lighting, 85mm lens look, natural skin tones, individually rendered
hair strands, real brocade weave and satin sheen. Style anchor: Vogue China
editorial, cinematic period-drama stills. Avoid: 3D render, CGI look,
plastic doll skin, anime, chibi, illustration, celebrity likeness, busy
background, props, heavy makeup.
```

### 北方版 · 面部特写

```
Photorealistic headshot close-up of the same woman: 30-year-old Chinese
Northern Beijing-style dignified classical beauty, full oval face with
subtle square jawline, well-set expressive eyes, natural skin texture with
fine pores, light natural makeup, stately composed expression. Full low
chignon updo. Neutral collar hint of crimson brocade. Clean pure white
studio background, soft directional lighting, 85mm lens, Vogue China
editorial quality. Avoid: 3D render, CGI, plastic skin, anime, heavy makeup.
```

## Step 2：生图执行（本地直跑）

- `POST https://api.wuyinkeji.com/api/async/image_gpt_2.5`
  - headers: `Authorization: $WUYIN_KEY`
  - body: `{"prompt": <上>, "aspectRatio": "864*1152"}`（3:4 竖版人像）
- 轮询 `GET /api/async/detail?id=`（Authorization，status 0→2，5s 间隔，600s 上限）
- key 获取：`ssh zhiming` 容器 env 导出 → 本地 shell 环境变量传递（不写入任何文件）
- 4 张图并行提交（南主/南特写/北主/北特写）

## Step 3：归档 + 定稿

```
~/Downloads/tvc-output/digital-human/
├── south_full.png    south_face.png
└── north_full.png    north_face.png
```

- 定稿：**南北选一用一**（主图 + 特写成组判读）
- 选中版主图 → 上传 COS `tvc/digital-human/anchor/character-main.png`（解说视频 reference_image/first_frame 锚点）
- 落选版 → COS `tvc/digital-human/archive/`

## Step 4（定稿后）：H3 女声音色锁定

按选中形象气质配 `voice_preset`（候选：female-yujie 御姐成熟沉稳 / female-sweet 甜美 / female-shaonv 少女；知性解说倾向 female-yujie），锁定为解说任务固定参数。

## 迭代策略

- 首轮：南北两版同出（4 图）
- 后续轮：只重出不达标的那一版（提示词微调），控成本
- 定稿后：固化 `scripts/digital_human_design.py` 入仓库（复用）

## 边做边改进登记

- 本轮 = V1 起步轮（方案 1 管线）
- 定稿后升级方案 3（工作流节点化：人物设计前置节点 + 参数锁定资产）
- 后续迭代项：服装季节款 / 发型变体 / 场景设计
