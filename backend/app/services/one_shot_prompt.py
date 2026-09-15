"""TVC 一镜到底 prompt 生成核心 — 模板 + 占位符 + 时长 + 动作链 + BPM + 埋点"""
from __future__ import annotations

import hashlib
import logging
import random
import re
from typing import Optional

from app.models.tvc_one_shot import (
    DEFAULT_TEMPLATES,
    HUMAN_MOTION_HINTS,
    INTERACTIVE_HINTS,
    NarrativeType,
    CompositionType,
    OneShotLogAction,
    PRODUCT_MOTION_HINTS,
)
from app.models.tvc_one_shot import TvcOneShotTemplate

logger = logging.getLogger(__name__)


# ==================== 单模板渲染 ====================

# 12 默认模板 seed（避免 DB 初始为空）
DEFAULT_TEMPLATES_DICT: dict[tuple[str, str], dict] = {}
for _tpl in DEFAULT_TEMPLATES:
    DEFAULT_TEMPLATES_DICT[(_tpl["narrative"], _tpl["composition"])] = _tpl


def _match_motion_chain(subject_desc: str, object_desc: str) -> str:
    """动作链感知：主体类型关键词匹配（HUMAN/PRODUCT/INTERACTIVE）"""
    subj_lower = (subject_desc or "").lower()
    obj_lower = (object_desc or "").lower()

    has_human = any(k in subj_lower for k in HUMAN_MOTION_HINTS.keys())
    has_product = any(k in obj_lower for k in PRODUCT_MOTION_HINTS.keys())

    if has_human and has_product:
        return "interactive"
    if has_human:
        # 选最匹配的 human motion chain
        for kw, hint in HUMAN_MOTION_HINTS.items():
            if kw in subj_lower:
                return f"human:{hint}"
        return "human_motion"
    if has_product:
        for kw, hint in PRODUCT_MOTION_HINTS.items():
            if kw in obj_lower:
                return f"product:{hint}"
        return "product_motion"
    return "human_motion"  # fallback


def _compose_motion(composition: CompositionType, motion_chain: str) -> str:
    """根据构图生成相机运动指令"""
    if composition == CompositionType.CHARACTER_OBJECT:
        return "camera dollies slowly, capturing both subject and product in harmony"
    if composition == CompositionType.FRONT_SIDE:
        return "camera tracks from front three-quarter view to pure profile, then orbits"
    if composition == CompositionType.MERGED:
        return "single continuous shot, camera pulls back to reveal unified composition"
    if composition == CompositionType.CLEAN_BG:
        return "camera orbits the product slowly, 180-degree rotation"
    return "camera moves gracefully"


def _light_default(narrative: NarrativeType) -> str:
    """根据叙事类型默认光照"""
    return {
        NarrativeType.DISPLAY: "studio softbox three-point lighting",
        NarrativeType.PLOT: "natural golden hour warm lighting",
        NarrativeType.HYBRID: "editorial mixed lighting, transitioning from cool to warm",
    }[narrative]


def _duration_for(narrative, template_recommended: int) -> int:
    """时长自适应：模板 recommended_duration 优先，否则按 narrative 默认"""
    return template_recommended or {
        NarrativeType.DISPLAY.value: 12,
        NarrativeType.PLOT.value: 15,
        NarrativeType.HYBRID.value: 15,
    }.get(narrative.value if hasattr(narrative, "value") else narrative, 15)


def _render_template(template: dict, **vars) -> str:
    """占位符替换 + 默认值"""
    full_vars = {
        "lighting": "soft three-point studio lighting",
        "composition_motion": "smooth camera movement",
        **vars,
    }
    prompt = template["prompt_template"]
    for k, v in full_vars.items():
        prompt = prompt.replace("{" + k + "}", str(v))
    return prompt.strip()


def _seed_compose(narrative, composition, task_id: str = "") -> str:
    """生成可复现 seed（持久化到 result，支持"再生成一次"）"""
    n_v = narrative.value if hasattr(narrative, "value") else narrative
    c_v = composition.value if hasattr(composition, "value") else composition
    raw = f"{n_v}:{c_v}:{task_id}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


# ==================== 核心 API ====================

def get_template(narrative: NarrativeType | str, composition: CompositionType | str, db=None) -> dict:
    """取模板（优先 DB，否则用默认 12 行种子）"""
    n_val = narrative.value if isinstance(narrative, NarrativeType) else narrative
    c_val = composition.value if isinstance(composition, CompositionType) else composition
    if db is not None:
        row = db.query(TvcOneShotTemplate).filter_by(
            narrative=n_val, composition=c_val, is_active=True
        ).first()
        if row:
            return {
                "id": row.id,
                "narrative": row.narrative.value,
                "composition": row.composition.value,
                "name": row.name,
                "prompt_template": row.prompt_template,
                "recommended_duration": row.recommended_duration,
                "motion_chain": row.motion_chain or "human_motion",
                "bpm_hint": row.bpm_hint,
            }
    # fallback: 默认 12 行
    return DEFAULT_TEMPLATES_DICT.get((n_val, c_val))


def generate(
    *,
    subject_desc: str,
    object_desc: str = "",
    narrative: Optional[str] = None,
    composition: Optional[str] = None,
    lighting: Optional[str] = None,
    task_id: str = "",
    user_id: str = "",
    db=None,
    prev_seed: Optional[str] = None,
) -> dict:
    """一镜到底 prompt 生成。

    不传 narrative/composition → 按 prev_seed 反序列化（"再生成一次"同组合）
    或随机生成新组合（避免与最近使用连续重复）

    returns:
      {
        prompt, template_id, template_name,
        narrative, composition, motion_chain,
        duration, bpm_hint,
        composition_seed, narrative_seed
      }
    """
    # 1. 决定 narrative + composition
    if prev_seed:
        # 从种子反序列化（避免连续重复）
        h = hashlib.md5(prev_seed.encode()).hexdigest()
        narrative = narrative or ["display", "plot", "hybrid"][int(h[0], 16) % 3]
        composition = composition or ["character_object", "front_side", "merged", "clean_bg"][int(h[1], 16) % 4]
    elif not narrative or not composition:
        # 随机（避免连续重复）
        all_n = list(NarrativeType)
        all_c = list(CompositionType)
        narrative = narrative or random.choice(all_n)
        composition = composition or random.choice(all_c)
    else:
        narrative = NarrativeType(narrative)
        composition = CompositionType(composition)

    # 2. 取模板
    template = get_template(narrative, composition, db)
    n_v = narrative.value if hasattr(narrative, "value") else narrative
    c_v = composition.value if hasattr(composition, "value") else composition
    if not template:
        raise ValueError(f"未找到模板: {n_v} × {c_v}")

    # 3. 时长 + 动作链 + 光照
    duration = _duration_for(narrative, template.get("recommended_duration", 15))
    motion_chain = _match_motion_chain(subject_desc, object_desc)
    composition_motion = _compose_motion(composition, motion_chain)
    final_lighting = lighting or template.get("lighting") or _light_default(narrative)

    # 4. 渲染 prompt
    prompt = _render_template(
        template,
        subject=subject_desc,
        object=object_desc or "subject",
        composition_motion=composition_motion,
        lighting=final_lighting,
    )

    # 5. 种子（用于"再生成一次"复现）
    composition_seed = _seed_compose(narrative, composition, task_id)
    n_seed_src = narrative.value if hasattr(narrative, "value") else narrative
    narrative_seed = hashlib.md5(f"n:{n_seed_src}:{task_id}".encode()).hexdigest()[:12]

    # 6. 埋点（GENERATED）
    if db is not None and user_id:
        _log(db, template, task_id, user_id, narrative, composition, OneShotLogAction.GENERATED)

    return {
        "prompt": prompt,
        "template_id": template.get("id"),
        "template_name": template.get("name"),
        "narrative": n_v,
        "composition": c_v,
        "motion_chain": motion_chain,
        "duration": duration,
        "bpm_hint": template.get("bpm_hint"),
        "composition_seed": composition_seed,
        "narrative_seed": narrative_seed,
    }


def generate_variants(
    *,
    subject_desc: str,
    object_desc: str = "",
    narrative: Optional[str] = None,
    composition: Optional[str] = None,
    candidate_count: int = 3,
    task_id: str = "",
    user_id: str = "",
    db=None,
) -> list[dict]:
    """A/B 多候选：同种子，narrative+composition 不同组合（3 个变体）"""
    used = set()
    results: list[dict] = []
    # 先选 narrative 一次，composition 随机 3 次去重
    base_narrative = narrative
    for _ in range(candidate_count * 2):  # 多试几次找 3 个不重复
        r = generate(
            subject_desc=subject_desc,
            object_desc=object_desc,
            narrative=base_narrative,
            composition=None,  # 强制随机
            task_id=task_id,
            user_id=user_id,
            db=db,
        )
        key = (r["narrative"], r["composition"])
        if key in used:
            continue
        used.add(key)
        results.append(r)
        if len(results) >= candidate_count:
            break
    return results


# ==================== 埋点 ====================

def _log(db, template, task_id, user_id, narrative, composition, action):
    """写埋点日志"""
    from app.models.tvc_one_shot import TvcOneShotLog
    from uuid import UUID
    try:
        uid = UUID(user_id) if isinstance(user_id, str) else user_id
        tid = UUID(template["id"]) if template.get("id") and isinstance(template["id"], str) else template.get("id")
        log = TvcOneShotLog(
            template_id=tid,
            task_id=task_id,
            user_id=uid,
            narrative=narrative,
            composition=composition,
            action=action,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.warning(f"埋点失败: {e}")
        db.rollback()


def log_action(db, task_id, user_id, narrative, composition, action):
    """外部调用：单独埋点（无需 template_id 也可写日志，template_id 留空）"""
    from app.models.tvc_one_shot import TvcOneShotLog
    from uuid import UUID
    try:
        uid = UUID(user_id) if isinstance(user_id, str) else user_id
        log = TvcOneShotLog(
            template_id=None,
            task_id=task_id,
            user_id=uid,
            narrative=narrative,
            composition=composition,
            action=action,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.warning(f"埋点失败: {e}")
        db.rollback()
