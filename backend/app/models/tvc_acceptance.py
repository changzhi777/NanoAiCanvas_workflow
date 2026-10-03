"""TVC 验收标准审查闸 — 客户模板 + 审查报告"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database import Base


class TvcAcceptanceTemplate(Base):
    """客户验收模板（通用客户标准引擎，KFC 是第一实例）。

    criteria 为标准项数组，schema：
    [{"key", "label", "category": rule_hard|rule_content|llm_content|llm_visual|archive,
      "weight": int, "veto": bool, "rule": {...}|null, "prompt_hint": str|null}]
    """
    __tablename__ = "tvc_acceptance_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_code = Column(String(64), unique=True, index=True, nullable=False)  # 如 "kfc"
    name = Column(String(128), nullable=False)
    aspect_ratio = Column(String(8), nullable=False, default="9:16")   # 驱动竖屏生成
    duration_sec = Column(Integer, nullable=False, default=15)
    criteria = Column(JSONB, nullable=False, default=list)
    brief_ctx = Column(JSONB, nullable=False, default=dict)   # Brief 上下文（产品名/价格/文案等，规则层+LLM层共用）
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class TvcAcceptanceReport(Base):
    """验收审查报告（剧本闸 gate=script / 成片闸 gate=final）。"""
    __tablename__ = "tvc_acceptance_reports"
    __table_args__ = (
        Index("ix_tvc_acc_reports_task_gate", "task_id", "gate"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(String(64), index=True, nullable=False)
    template_id = Column(UUID(as_uuid=True), nullable=True)
    template_snapshot = Column(JSONB, nullable=True)   # 审查时模板快照，防模板后续变更
    gate = Column(String(16), nullable=False)          # script | final
    status = Column(String(16), nullable=False, default="unverified")  # passed|failed|unverified
    score = Column(Integer, nullable=False, default=0)  # 0-100
    veto_hit = Column(JSONB, nullable=False, default=list)  # 命中否决项 key 列表
    items = Column(JSONB, nullable=False, default=list)
    conflicts_top = Column(JSONB, nullable=False, default=list)
    redo_count = Column(Integer, nullable=False, default=0)
    decision = Column(String(16), nullable=True)        # accepted | redo_pending | redo_done
    model_meta = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


# ==================== KFC 默认模板种子（14 项） ====================

def _kfc_criteria():
    return [
        # rule_hard（一票否决）
        {"key": "aspect_ratio", "label": "画面比例 9:16", "category": "rule_hard",
         "weight": 10, "veto": True, "rule": {"type": "aspect_ratio", "expect": "9:16"}, "prompt_hint": None},
        {"key": "duration", "label": "时长 15s 左右", "category": "rule_hard",
         "weight": 10, "veto": True, "rule": {"type": "duration", "expect_sec": 15, "tolerance": 2}, "prompt_hint": None},
        # rule_content
        {"key": "product_name_hit", "label": "主推产品全称命中", "category": "rule_content",
         "weight": 10, "veto": True, "rule": {"type": "text_contains", "source": "product_name"}, "prompt_hint": None},
        {"key": "price_hit", "label": "价格/活动信息命中", "category": "rule_content",
         "weight": 8, "veto": False, "rule": {"type": "text_contains", "source": "price_info"}, "prompt_hint": None},
        {"key": "ad_law_compliance", "label": "广告法合规（极限词/食品违禁语）", "category": "rule_content",
         "weight": 8, "veto": True, "rule": {"type": "ad_law"}, "prompt_hint": None},
        # llm_content
        {"key": "copy_fidelity", "label": "指定文案忠实度", "category": "llm_content",
         "weight": 8, "veto": False, "rule": None, "prompt_hint": "脚本中配音/字幕/台词是否与 Brief 指定文案一致（未指定则跳过）"},
        {"key": "offer_mechanism", "label": "活动机制完整", "category": "llm_content",
         "weight": 8, "veto": False, "rule": None, "prompt_hint": "Brief 要求的活动机制/日期/价格信息是否完整出现在脚本信息位"},
        {"key": "must_elements", "label": "必现元素齐全", "category": "llm_content",
         "weight": 10, "veto": True, "rule": None, "prompt_hint": "情节描述中「必须出现、不可缺失的元素」（产品全貌/logo/道具/文字标识）是否在镜头中体现"},
        {"key": "ending_norm", "label": "结尾 KV/海报规范", "category": "llm_content",
         "weight": 8, "veto": False, "rule": None, "prompt_hint": "结尾是否定格产品 KV/海报，并呈现价格与活动时间"},
        {"key": "scene_mood_text", "label": "故事场景/氛围符合", "category": "llm_content",
         "weight": 5, "veto": False, "rule": None, "prompt_hint": "脚本场景是否在 Brief 指定的环境背景/时代/氛围/色调内"},
        # llm_visual
        {"key": "ip_consistency", "label": "IP 形象一致性", "category": "llm_visual",
         "weight": 10, "veto": True, "rule": None, "prompt_hint": "出镜人物形象与 Brief 指定设定/参照图一致，不得改动面部、服饰等细节"},
        {"key": "product_fidelity", "label": "产品还原度", "category": "llm_visual",
         "weight": 10, "veto": True, "rule": None, "prompt_hint": "产品外观与参照 KV 一致，颜色材质不能变形"},
        {"key": "logo_integrity", "label": "Logo/上校头像完整性", "category": "llm_visual",
         "weight": 10, "veto": True, "rule": None,
         "prompt_hint": "KFC Logo 与上校头像是否变形/改色/加特效（官方规范：Logo 不可修改，上校形象保持完整；KFC Red 参考 #E4002B）。Logo 缺失本身不扣分，变形/错误呈现才扣"},
        {"key": "scene_mood_visual", "label": "画面氛围/品牌色调", "category": "llm_visual",
         "weight": 5, "veto": False, "rule": None, "prompt_hint": "画面色调氛围符合 Brief（如肯德基品牌红主色调）"},
        # archive（仅存档展示，不参与评分）
        {"key": "delivery_date", "label": "交付日期", "category": "archive",
         "weight": 0, "veto": False, "rule": {"type": "archive", "source": "delivery_date"}, "prompt_hint": None},
        {"key": "video_theme", "label": "本期视频主题", "category": "archive",
         "weight": 0, "veto": False, "rule": {"type": "archive", "source": "theme"}, "prompt_hint": None},
    ]


DEFAULT_KFC_TEMPLATE = {
    "customer_code": "kfc",
    "name": "KFC 吃货哥 IP 系列",
    "aspect_ratio": "9:16",
    "duration_sec": 15,
    "criteria": _kfc_criteria(),
}
