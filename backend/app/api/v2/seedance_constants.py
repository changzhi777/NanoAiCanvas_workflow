"""
Seedance 2.0 提示词常量
前后端共享的镜头运动 / 光线 / 负面约束映射
"""

CAMERA_MAP = {
    "push-in": "slow push-in",
    "pull-out": "slow pull-out / dolly out",
    "lateral": "lateral motion / pan",
    "tracking": "tracking shot / follow",
    "orbit": "orbit / arc shot",
    "aerial": "aerial / drone shot",
    "handheld": "handheld camera",
    "fixed": "fixed / locked-off camera",
}

LIGHT_MAP = {
    "golden_hour": "soft golden hour lighting",
    "rim_light": "dramatic rim light against dark background",
    "natural": "soft natural window light",
    "neon": "neon-lit, colorful reflections",
    "backlit": "backlit silhouette, sun flare",
    "overcast": "even overcast diffused light",
    "studio": "professional studio lighting, softbox",
    "dramatic": "dramatic chiaroscuro lighting",
}

NEG_MAP = {
    "avoid_jitter": "avoid jitter",
    "avoid_bent_limbs": "avoid bent limbs",
    "avoid_flicker": "avoid temporal flicker",
    "avoid_identity_drift": "avoid identity drift",
    "avoid_chaos": "avoid chaotic composition",
}


def build_seedance_hints(camera_movement=None, light_style=None, negative_prompts=None) -> list[str]:
    """构建 Seedance 2.0 增强约束提示列表"""
    hints = []
    if camera_movement:
        hints.append(f"默认镜头运动: {CAMERA_MAP.get(camera_movement, camera_movement)}")
    if light_style:
        hints.append(f"默认光线: {LIGHT_MAP.get(light_style, light_style)}")
    if negative_prompts:
        neg_str = ", ".join(NEG_MAP.get(n, n) for n in negative_prompts)
        hints.append(f"每个 video_prompt 结尾必须包含: {neg_str}")
    return hints
