"""H3 结构化 Prompt 编译器（五锚点 → MiniMax H3 官方 Schema）。

权威源：GitHub MiniMax-AI/MiniMax-H3 skills/h3-prompt-writing/references/base-en.txt
三核心字段：integrated_multimodal_description / overall_soundscape / non_diegetic_music

五锚点映射：
- ①优化锚点（运镜/光线/风格）→ description 内官方词汇
- ②人物角色 character_desc → (S1) 音色特征 + 视觉主体描述
- ③配音 voice_gender/voice_preset → 原生 <d> 台词（声画同出）/ 旁白唇闭
- ④宣传产品 product_desc 三段 → 产品段 + 结尾 KV shot + on-screen text 引号
- ⑤横竖版 → 速创 ratio 参数（引擎层），本编译器不管比例
"""
import re
from typing import Optional

# ==================== 音色预设库（性别 → 预设 → H3 音色描述词） ====================

VOICE_PRESETS = {
    "male": [
        {"id": "male-elite", "label": "精英青年",
         "desc": "a calm, confident young adult male voice with clear articulation and moderate pitch"},
        {"id": "male-warm", "label": "暖大叔",
         "desc": "a warm, slightly husky middle-aged male voice, slow-paced and reassuring"},
        {"id": "male-energetic", "label": "活力少年",
         "desc": "an energetic youthful male voice, fast-paced, bright and playful"},
    ],
    "female": [
        {"id": "female-sweet", "label": "甜美",
         "desc": "a bright, sweet young female voice with lively, inviting intonation"},
        {"id": "female-yujie", "label": "御姐",
         "desc": "a mature, composed female voice with low-moderate pitch and smooth delivery"},
        {"id": "female-shaonv", "label": "少女",
         "desc": "a soft, youthful girl voice, light and airy with playful ups and downs"},
    ],
}


def resolve_voice(gender: str, preset_id: str = None) -> Optional[dict]:
    """解析音色预设。gender: male/female/none。"""
    if gender not in VOICE_PRESETS:
        return None
    presets = VOICE_PRESETS[gender]
    if preset_id:
        for p in presets:
            if p["id"] == preset_id:
                return p
    return presets[0]  # 默认第一个


# ==================== 运镜映射（面板 8 种 → H3 官方词汇） ====================

CAMERA_H3_MAP = {
    "push-in": "The camera pushes in with small amplitude at slow speed",
    "pull-out": "The camera pulls out with small amplitude at slow speed",
    "lateral": "The camera trucks right with small amplitude at normal speed",
    "tracking": "The camera performs a tracking shot, following the subject",
    "orbit": "The camera moves in a slow arc shot around the subject",
    "aerial": "The camera rises in a slow aerial drone shot",
    "handheld": "The camera shakes slightly in a handheld style",
    "fixed": "The camera holds a static shot",
}

LIGHT_H3_MAP = {
    "golden_hour": "warm golden-hour sunlight",
    "rim_light": "dramatic rim light against a darker background",
    "natural": "soft natural window light",
    "neon": "neon-lit colorful reflections",
    "backlit": "backlit silhouette with sun flare",
    "overcast": "even overcast diffused light",
    "studio": "professional studio softbox lighting",
    "dramatic": "dramatic chiaroscuro lighting",
}


def _camera_phrase(camera_movement: str = None) -> str:
    return CAMERA_H3_MAP.get(camera_movement or "", CAMERA_H3_MAP["push-in"])


def _light_phrase(light_style: str = None) -> str:
    return LIGHT_H3_MAP.get(light_style or "", LIGHT_H3_MAP["golden_hour"])


def _clean(text: str = None) -> str:
    """台词/描述清洗：英文双引号成对换「」（H3 schema 内引号保留给 on-screen text）、压空白。"""
    if not text:
        return ""
    s = re.sub(r"\s+", " ", str(text)).strip()
    counter = {"n": 0}
    def _q(_m):
        counter["n"] += 1
        return "」" if counter["n"] % 2 == 0 else "「"
    return re.sub(r'"', _q, s).replace("'", "「")


# ==================== 主编译器 ====================

def _mmss(sec: float) -> str:
    return f"00:{sec:06.3f}"


def compile_h3_prompt(
    *,
    character_desc: str,
    product_name: str,
    product_sell: str = "",
    product_price: str = "",
    scene_desc: str = "",
    camera_movement: str = "push-in",
    light_style: str = "golden_hour",
    narration: str = "",
    dialogue: str = "",
    bgm_prompt: str = "",
    style_word: str = "3D CG",
    duration: int = 15,
    voice_gender: str = "none",
    voice_preset: str = None,
    story_shots: list = None,
) -> dict:
    """五锚点 + 剧本 → H3 三字段结构化 Schema。

    返回 {"prompt": 全文, "mode": "t2va/i2va", "voice": 音色预设 dict|None,
          "on_screen_texts": [...], "shots": 段落数}
    story_shots 为空 → 单镜头叙事 + 结尾 KV shot；
    story_shots = [{"visual": "...", "line": "..."}, ...] → 多镜头时间轴
    （[Shot N] At 00:XX.000 切点协议，末镜头后接 KV 定格 shot）。
    """
    character_desc = _clean(character_desc)
    product_name = _clean(product_name) or "产品"
    product_sell = _clean(product_sell)
    product_price = _clean(product_price)
    scene_desc = _clean(scene_desc)
    narration = _clean(narration)
    dialogue = _clean(dialogue)

    voice = resolve_voice(voice_gender, voice_preset)
    cut_s = max(4, duration - 3)  # KV shot 切点
    on_screen_texts = []

    # ---- 台词构造（③ 定案：单人 + 画外音旁白优先，无配音则转花字） ----
    voice_desc = voice["desc"] if voice else ""
    speaker = f" {character_desc} with {voice_desc} (S1)" if voice else ""

    def _voiceover(line: str) -> str:
        # 旁白（唇闭无对白口型）→ 需要显式字幕声明（H3 对 off-screen 语音不出自动字幕）
        return (
            f"{speaker} says in an off-screen voiceover: "
            f"<d>[Chinese] {line} </d> while the on-screen character's lips remain completely closed, "
            f'with on-screen subtitles reading "{line}".'
        )

    def _inline_line(line: str) -> str:
        # 出镜台词 → <d> 自带单次字幕（V8 实证：显式声明会导致字幕重复）
        return f"{speaker} says: <d>[Chinese] {line} </d>"

    # ---- 多镜头模式：story_shots 驱动 [Shot N] 时间轴 ----
    desc_parts = []
    shots_out = []
    if story_shots:
        n_shots = len(story_shots)
        kv_cut = duration - 3
        # 镜头均匀分配时长（KV shot 占末尾 3s）
        seg = kv_cut / n_shots
        for i, sh in enumerate(story_shots):
            visual = _clean(sh.get("visual") or "")
            line = _clean(sh.get("line") or "")
            head = f"[Shot {i + 1}]"
            if i > 0:
                head += f" At {_mmss(i * seg)}, the shot cuts to"
            seg_text = f"{head} {visual}"
            if line:
                seg_text += " " + _voiceover(line) + " The visual continues as described."
            desc_parts.append(seg_text)
            shots_out.append(seg_text[:60])
        # KV 定格 shot
        kv_text = f"{product_name}" + (f" {product_price}" if product_price else "")
        on_screen_texts.append(kv_text)
        desc_parts.append(
            f"[Shot {n_shots + 1}] At {_mmss(kv_cut)}, the shot cuts to the final product KV: "
            f"{product_name} presented as the hero product on its signature packaging, "
            f'with on-screen text reading "{_clean(kv_text)}" and clean space for the headline.'
        )
        description = " ".join(desc_parts)
        prompt = (
            f"integrated_multimodal_description: {description}\n\n"
            f"overall_soundscape: Soft restaurant ambience continues underneath with light kitchen sounds. "
            f"A crisp bite and gentle packaging rustle accompany the product close-up.\n\n"
            f"non_diegetic_music: {_clean(bgm_prompt) or 'N/A'}"
        )
        return {
            "prompt": prompt,
            "mode": "t2va",
            "voice": voice,
            "on_screen_texts": [t for t in on_screen_texts if t],
            "shots": n_shots + 1,
            "cut_at": kv_cut,
        }

    # ---- 单镜头模式（原逻辑） ----
    s1_parts = [
        f"[Shot 1] {style_word}, commercial advertising,",
        f"{scene_desc or 'a bright branded restaurant scene'} with {_light_phrase(light_style)}.",
        _camera_phrase(camera_movement) + ".",
        f"{character_desc} interacts with {product_name}"
        + (f" — {product_sell}" if product_sell else "") + ".",
    ]
    if voice and (narration or dialogue):
        line = dialogue or narration
        s1_parts.append(_voiceover(line) if not dialogue else _inline_line(line))
    elif narration:
        on_screen_texts.append(narration)

    # ---- Shot 2：结尾 KV 定格 ----
    kv_text = f"{product_name}"
    if product_price:
        kv_text += f" {product_price}"
    on_screen_texts.append(kv_text)
    s2 = (
        f"[Shot 2] At 00:{cut_s:02d}.000, the shot cuts to the final product KV: "
        f"{product_name} presented as the hero product, "
        f'with on-screen text reading "{_clean(kv_text)}" and clean space for the headline.'
    )

    description = " ".join(s1_parts) + " " + s2

    # ---- soundscape（环境音推导，1-2 句默认模板） ----
    soundscape = (
        "Soft restaurant ambience continues underneath with light kitchen sounds. "
        "A crisp bite and gentle packaging rustle accompany the product close-up."
    )

    # ---- music（bgm_prompt 原文透传——用户 BGM 锚点直映射 non_diegetic_music） ----
    music = _clean(bgm_prompt) or "N/A"

    prompt = (
        f"integrated_multimodal_description: {description}\n\n"
        f"overall_soundscape: {soundscape}\n\n"
        f"non_diegetic_music: {music}"
    )

    return {
        "prompt": prompt,
        "mode": "t2va",
        "voice": voice,
        "on_screen_texts": [t for t in on_screen_texts if t],
        "shots": 2,
        "cut_at": cut_s,
    }


# ==================== 生图模板构造器（角色 Sheet / 产品 KV） ====================

def build_character_sheet_prompt(character_desc: str,
                                 brand_anchor: str = "KFC red (#E4002B) and white brand accents") -> str:
    """角色设定图（character sheet 三视图）模板——六模块结构。"""
    desc = _clean(character_desc)
    return (
        "专业的角色设定参考图（character sheet），三视图：front view, side view, back view，"
        f"横向排版 clean layout on flat white background, concept art style。"
        f"角色：{desc}。"
        f"品牌元素：{brand_anchor}；配色板：主色与辅助色色块并排展示。"
        "线条干净、比例准确、细节完整，适合作为后续视频生成的角色一致性参照。"
    )


def build_product_kv_prompt(product_name: str, product_sell: str = "",
                            product_price: str = "", light_style: str = "golden_hour",
                            scene_desc: str = "") -> str:
    """产品广告 KV 主视觉模板——六段结构，文案区留白（中文不渲染）。"""
    name = _clean(product_name) or "产品"
    sell = _clean(product_sell)
    scene = _clean(scene_desc) or "明亮的产品展示台"
    return (
        f"商业产品广告 KV 主视觉，{name} 45° hero shot 角度，居中构图。"
        f"材质细节：{sell or '质感层次分明，色泽诱人'}，蒸汽与光泽增强食欲感。"
        f"打光：studio lighting, softbox, rim light, {_light_phrase(light_style)}。"
        f"场景：{scene}。"
        "构图：三分法留白，顶部与右侧 clean space for headline（预留文案区域，不要渲染任何文字）。"
        "商业摄影质感，8K detail, ultra sharp。"
    )
