"""TVC 一镜到底模板 — DB 模型 + A/B 埋点日志"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SAEnum, Index
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


def _values(enum_cls):
    """SAEnum 用 .value（小写）而非成员名，匹配迁移里的 varchar 列"""
    return [e.value for e in enum_cls]


def _vc(enum_cls):
    """values_callable 工厂"""
    return lambda x: _values(enum_cls)


class NarrativeType(str, enum.Enum):
    """3 种叙事类型"""
    DISPLAY = "display"    # 纯展示：产品 360 / 模特走秀 / 场景氛围
    PLOT = "plot"          # 剧情：起承转合完整故事
    HYBRID = "hybrid"      # 混合：前段铺垫 + 后段一镜到底


class CompositionType(str, enum.Enum):
    """4 种构图"""
    CHARACTER_OBJECT = "character_object"  # 人 + 物独立两张图
    FRONT_SIDE = "front_side"              # 同人正面 + 侧面
    MERGED = "merged"                      # 人 + 物合并一张
    CLEAN_BG = "clean_bg"                  # 纯色背景（产品图）


class OneShotLogAction(str, enum.Enum):
    """A/B 埋点动作"""
    GENERATED = "generated"        # prompt 已生成
    SHOWN = "shown"                # 用户在节点看过结果
    DOWNLOADED = "downloaded"      # 用户下载了产物
    CANCELLED = "cancelled"        # 用户终止任务
    OPTIMIZED = "optimized"        # 用户触发了提示词优化


# 12 默认模板（4 构图 × 3 叙事）
# 占位符：{subject} {object} {composition_motion} {lighting} {duration_s}
DEFAULT_TEMPLATES = [
    # ───── DISPLAY（纯展示）─────
    # character_object
    {"narrative": "display", "composition": "character_object",
     "name": "展示·人+物环绕",
     "prompt_template": "static hold for 0.5s. A {subject} gracefully positioned beside a {object}, maintaining eye contact with the camera. The camera performs a slow steady orbit shot, 360 degrees around the duo. Soft golden hour side lighting, shallow depth of field f/2.8, eye-level close-up composition with rule of thirds. Photorealistic commercial advertising aesthetic, cinematic color grading, 8K detail. The {subject} occasionally touches the {object} with elegant hand gestures. End with static hold for 0.5s.",
     "recommended_duration": 12, "motion_chain": "orbit_motion", "bpm_hint": 90},
    # front_side
    {"narrative": "display", "composition": "front_side",
     "name": "展示·同模正侧",
     "prompt_template": "static hold for 0.5s. A {subject} shown from front-facing camera angle. Camera slowly dollies from left to right, transitioning from a front three-quarter view to a pure side profile, revealing the full silhouette. {composition_motion} Continues dollying to capture the back profile, then returns to front. Three-point lighting with soft fill, clean white studio background. Photorealistic fashion editorial photography, shot on ARRI Alexa with 85mm lens. End with static hold for 0.5s.",
     "recommended_duration": 12, "motion_chain": "dolly_pan", "bpm_hint": 80},
    # merged
    {"narrative": "display", "composition": "merged",
     "name": "展示·合并构图",
     "prompt_template": "static hold for 0.5s. A single cinematic frame containing both {subject} and {object} in a unified composition. {composition_motion} Subtle camera push-in over the duration, revealing details progressively. Soft rim lighting separates subject from product, eye-level medium close-up. Editorial fashion photography aesthetic, Vogue-quality composition. End with static hold for 0.5s.",
     "recommended_duration": 12, "motion_chain": "subtle_pushin", "bpm_hint": 75},
    # clean_bg
    {"narrative": "display", "composition": "clean_bg",
     "name": "展示·纯色背景",
     "prompt_template": "static hold for 0.5s. The {object} presented as a hero product shot, centered on a seamless {lighting} gradient backdrop. Camera performs a slow 180-degree orbit revealing the product silhouette and surface details. Floating particles or subtle light rays add atmosphere. Three-point studio lighting, soft shadows, ultra-clean product photography. Apple-style minimalist advertising aesthetic. End with static hold for 0.5s.",
     "recommended_duration": 12, "motion_chain": "orbit_product", "bpm_hint": 70},

    # ───── PLOT（剧情）─────
    {"narrative": "plot", "composition": "character_object",
     "name": "剧情·人+物互动",
     "prompt_template": "static hold for 0.5s. A {subject} notices the {object} across the frame. Their eyes widen with curiosity. Slowly walks toward it, reaches out, and picks it up with careful hands. Examines it closely, turns it over. A smile slowly spreads across their face. Camera tracks the journey from medium shot to close-up on hands, then to the {subject}'s delighted expression. Natural window lighting with warm color temperature. Character-driven storytelling, 24fps cinematic, natural motion blur. End with static hold for 0.5s.",
     "recommended_duration": 15, "motion_chain": "human_motion", "bpm_hint": 110},
    {"narrative": "plot", "composition": "front_side",
     "name": "剧情·正侧转场",
     "prompt_template": "static hold for 0.5s. A {subject} enters frame from the left, walking purposefully. Camera follows in profile view. The {subject} pauses, turns toward the camera (revealing front face), makes eye contact, then continues walking out of frame to the right. Continuous tracking shot, 360-degree rotation reveals full subject silhouette. Golden hour side lighting creates dramatic rim light. Cinematic narrative editing. End with static hold for 0.5s.",
     "recommended_duration": 15, "motion_chain": "human_motion", "bpm_hint": 100},
    {"narrative": "plot", "composition": "merged",
     "name": "剧情·互动高潮",
     "prompt_template": "static hold for 0.5s. Close-up: {subject} hands gently unwrap the {object}, revealing it slowly. Cut to wider shot: {subject}'s face lights up with surprise and joy. Slow zoom into the product details, with the {subject}'s satisfied expression in soft focus behind. Reverse shot: {subject} brings the {object} close to camera, presenting it as a gift to the viewer. Warm practical lighting, intimate emotional tone. Sundance-quality narrative cinematography. End with static hold for 0.5s.",
     "recommended_duration": 15, "motion_chain": "interactive", "bpm_hint": 95},
    {"narrative": "plot", "composition": "clean_bg",
     "name": "剧情·产品叙事",
     "prompt_template": "static hold for 0.5s. The {object} sits alone in a void of soft light. Suddenly, golden particles swirl around it as if awakening. Camera slowly cranes up, revealing the {object} ascending in a beam of ethereal light. The object rotates majestically, showing all angles. Lightning-fast cuts at 2s, 5s, 8s, 12s marks create rhythm. Epic cinematic lighting, god rays, volumetric fog. Hollywood blockbuster product reveal. End with static hold for 0.5s.",
     "recommended_duration": 15, "motion_chain": "product_motion", "bpm_hint": 120},

    # ───── HYBRID（混合）─────
    {"narrative": "hybrid", "composition": "character_object",
     "name": "混合·铺垫+收尾",
     "prompt_template": "static hold for 0.5s. Opening: {subject} in lifestyle context, distracted, unaware. Fast cuts at 1s, 3s, 5s marks show glimpses of the {object}. At 6s mark, camera pulls back to reveal the {object} prominently. Final 9 seconds: slow continuous tracking shot as {subject} picks up the {object}, examines it, satisfied smile. Editorial pacing builds to product reveal. Color grading transitions from cool lifestyle to warm product. Anamorphic widescreen, premium fashion film aesthetic. End with static hold for 0.5s.",
     "recommended_duration": 15, "motion_chain": "human_motion", "bpm_hint": 105},
    {"narrative": "hybrid", "composition": "front_side",
     "name": "混合·轮廓揭示",
     "prompt_template": "static hold for 0.5s. Fast cut sequence: silhouette of {subject} from side profile. Cut to front view revealing identity. Cut to overhead shot of the {object}. From 6s mark, slow continuous 360-degree orbit shot revealing both subject and product together. Stylized editing builds to unified composition. Dramatic studio lighting with strong key light and deep shadows. Cinematic fashion film meets product showcase. End with static hold for 0.5s.",
     "recommended_duration": 15, "motion_chain": "dolly_pan", "bpm_hint": 115},
    {"narrative": "hybrid", "composition": "merged",
     "name": "混合·统一构述",
     "prompt_template": "static hold for 0.5s. Quick montage: lifestyle moment with {subject}. Flash to {object} detail. From 5s mark, single continuous shot: camera pulls back to reveal both in a single artistic frame. {subject} interacts with the {object}. Slow push-in to final hero composition. Contemporary advertising pacing, dynamic to contemplative transition. Magazine-quality still life meets human warmth. End with static hold for 0.5s.",
     "recommended_duration": 15, "motion_chain": "interactive", "bpm_hint": 100},
    {"narrative": "hybrid", "composition": "clean_bg",
     "name": "混合·产品仪式",
     "prompt_template": "static hold for 0.5s. Initial fast cuts at 1s, 3s, 5s, 7s marks reveal the {object} in different abstract contexts. At 8s mark, transition to a single majestic shot: slow continuous orbit, the {object} rotating on a pedestal with cinematic lighting. Volumetric god rays, particle effects, dramatic score-synced pacing. Premium product ritual, ceremony of unveiling. Luxury brand advertising quality. End with static hold for 0.5s.",
     "recommended_duration": 15, "motion_chain": "product_motion", "bpm_hint": 125},
]


# 动作链模板（按主体类型关键词匹配）
HUMAN_MOTION_HINTS = {
    "model": "natural walking, hand gestures, facial expressions",
    "person": "breathing, micro-expressions, body language",
    "woman": "elegant posture, flowing hair movement, gentle gestures",
    "man": "confident stance, deliberate movements",
    "girl": "youthful energy, curious glances, playful gestures",
}

PRODUCT_MOTION_HINTS = {
    "bottle": "liquid swirl, glass refraction, label focus",
    "watch": "tick rotation, strap movement, light play",
    "phone": "screen glow, typing animation, surface reflection",
    "car": "panel reveal, wheel rotation, paint light play",
    "shoe": "sole flex, material stretch, shadow grounding",
    "bag": "strap swing, leather texture, opening reveal",
}

INTERACTIVE_HINTS = (
    "the {subject} reaches out and touches the {object}, "
    "eye contact with camera, gentle handling"
)


class TvcOneShotTemplate(Base):
    """一镜到底模板表（4 构图 × 3 叙事 = 12 默认行）"""
    __tablename__ = "tvc_one_shot_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    narrative = Column(SAEnum(NarrativeType, name="tvc_narrative_type", native_enum=False, length=20, values_callable=_vc(NarrativeType)), nullable=False)
    composition = Column(SAEnum(CompositionType, name="tvc_composition_type", native_enum=False, length=30, values_callable=_vc(CompositionType)), nullable=False)
    name = Column(String(100), nullable=False)
    prompt_template = Column(Text, nullable=False)
    recommended_duration = Column(Integer, default=15, nullable=False)
    motion_chain = Column(String(50), default="human_motion")
    bpm_hint = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_one_shot_unique", "narrative", "composition", unique=True),
    )


class TvcOneShotLog(Base):
    """A/B 埋点日志（统计每个模板的生成/展示/下载/取消率）"""
    __tablename__ = "tvc_one_shot_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("tvc_one_shot_templates.id", ondelete="SET NULL"), nullable=True)
    task_id = Column(String(64), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    narrative = Column(String(30), nullable=False)
    composition = Column(String(30), nullable=False)
    action = Column(SAEnum(OneShotLogAction, name="tvc_one_shot_action", native_enum=False, length=20, values_callable=_vc(OneShotLogAction)), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
