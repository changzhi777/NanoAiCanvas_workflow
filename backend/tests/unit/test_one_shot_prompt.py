"""one_shot_prompt 单元测试 — 模板/占位符/动作链/时长/A/B 埋点"""
import pytest
from unittest.mock import MagicMock, patch

from app.services.one_shot_prompt import (
    DEFAULT_TEMPLATES_DICT,
    _match_motion_chain,
    _compose_motion,
    _duration_for,
    _render_template,
    generate,
    generate_variants,
)
from app.models.tvc_one_shot import (
    CompositionType,
    NarrativeType,
)


# ==================== 模板种子完整性 ====================

class TestTemplateSeed:
    def test_all_12_combos_present(self):
        """4 构图 × 3 叙事 = 12 行不可漏"""
        expected = {(n.value, c.value) for n in NarrativeType for c in CompositionType}
        actual = set(DEFAULT_TEMPLATES_DICT.keys())
        assert actual == expected, f"缺失模板: {expected - actual}"

    def test_each_template_has_required_fields(self):
        for (n, c), t in DEFAULT_TEMPLATES_DICT.items():
            assert "name" in t, f"{n}/{c} 缺 name"
            assert "prompt_template" in t, f"{n}/{c} 缺 prompt_template"
            assert t["recommended_duration"] in (12, 15), f"{n}/{c} 时长异常"
            assert "{" in t["prompt_template"], f"{n}/{c} 无占位符"

    def test_bpm_hint_in_range(self):
        for t in DEFAULT_TEMPLATES_DICT.values():
            bpm = t.get("bpm_hint")
            if bpm is not None:
                assert 60 <= bpm <= 200, f"BPM 异常: {bpm}"


# ==================== 占位符替换 ====================

class TestRenderTemplate:
    def test_basic_replacement(self):
        out = _render_template(
            {"prompt_template": "A {subject} with a {object}"},
            subject="model", object="bottle",
        )
        assert out == "A model with a bottle"

    def test_default_light(self):
        out = _render_template(
            {"prompt_template": "Lighting: {lighting}"},
            subject="x",
        )
        assert "Lighting:" in out

    def test_default_composition_motion(self):
        out = _render_template(
            {"prompt_template": "Motion: {composition_motion}"},
            subject="x",
        )
        assert "Motion:" in out


# ==================== 动作链 ====================

class TestMotionChain:
    def test_human_only(self):
        result = _match_motion_chain("a young woman model", "")
        assert "human" in result

    def test_product_only(self):
        result = _match_motion_chain("", "a luxury perfume bottle")
        assert "product" in result

    def test_interactive(self):
        result = _match_motion_chain("a model", "a watch")
        assert result == "interactive"

    def test_fallback(self):
        result = _match_motion_chain("", "")
        assert result == "human_motion"


class TestComposeMotion:
    def test_each_composition(self):
        for c in CompositionType:
            motion = _compose_motion(c, "human_motion")
            assert len(motion) > 10, f"{c.value} motion 太短"


# ==================== 时长自适应 ====================

class TestDuration:
    def test_display_default_12s(self):
        d = _duration_for(NarrativeType.DISPLAY, 0)
        assert d == 12

    def test_plot_default_15s(self):
        d = _duration_for(NarrativeType.PLOT, 0)
        assert d == 15

    def test_template_recommended_wins(self):
        d = _duration_for(NarrativeType.DISPLAY, 8)
        assert d == 8  # 模板优先


# ==================== 生成核心 ====================

class TestGenerate:
    def test_returns_full_dict(self):
        r = generate(
            subject_desc="young female model in white dress",
            object_desc="luxury perfume bottle",
            narrative="display",
            composition="character_object",
            task_id="tvc_test_001",
            user_id="00000000-0000-0000-0000-000000000001",
        )
        assert "prompt" in r
        assert r["narrative"] == "display"
        assert r["composition"] == "character_object"
        assert r["duration"] in (12, 15)
        assert "composition_seed" in r
        assert "narrative_seed" in r
        assert "bpm_hint" in r

    def test_random_combination(self):
        r1 = generate(
            subject_desc="model", object_desc="bottle",
            task_id="tvc_test_a", user_id="00000000-0000-0000-0000-000000000001",
        )
        r2 = generate(
            subject_desc="model", object_desc="bottle",
            task_id="tvc_test_b", user_id="00000000-0000-0000-0000-000000000002",
        )
        # 不同 task_id 大概率随机到不同组合（允许偶尔相同）
        assert isinstance(r1["narrative"], str)
        assert isinstance(r2["composition"], str)

    def test_seed_reproducible(self):
        """同 prev_seed 同 narrative/composition 组合"""
        r1 = generate(
            subject_desc="model", object_desc="bottle",
            task_id="tvc_t1", user_id="00000000-0000-0000-0000-000000000001",
            prev_seed="seed_abc",
        )
        r2 = generate(
            subject_desc="model", object_desc="bottle",
            task_id="tvc_t2", user_id="00000000-0000-0000-0000-000000000002",
            prev_seed="seed_abc",
        )
        assert (r1["narrative"], r1["composition"]) == (r2["narrative"], r2["composition"])


# ==================== 多候选 ====================

class TestVariants:
    def test_3_unique(self):
        rs = generate_variants(
            subject_desc="model", object_desc="bottle",
            candidate_count=3, task_id="tvc_v", user_id="00000000-0000-0000-0000-000000000003",
        )
        assert len(rs) == 3
        # 三个组合应该不重复
        combos = {(r["narrative"], r["composition"]) for r in rs}
        assert len(combos) == 3


# ==================== 埋点 ====================

class TestLog:
    def test_log_writes_row(self):
        from app.services.one_shot_prompt import log_action

        mock_db = MagicMock()
        log_action(
            mock_db,
            task_id="tvc_log_test",
            user_id="00000000-0000-0000-0000-000000000099",
            narrative="display",
            composition="character_object",
            action="generated",
        )
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
