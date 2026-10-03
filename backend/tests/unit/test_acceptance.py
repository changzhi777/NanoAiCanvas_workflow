"""acceptance 服务单元测试 — 规则层/评分/LLM 解析/合并/降级"""
import json
from unittest.mock import patch, AsyncMock

import pytest

from app.services.acceptance import (
    compute_score,
    extract_conflicts_top,
    rule_check,
    llm_content_review,
    _parse_llm_json,
    merge_items,
    _finalize,
    _unverified_report,
    run_script_gate,
)
from app.models.tvc_acceptance import DEFAULT_KFC_TEMPLATE


CRITERIA = DEFAULT_KFC_TEMPLATE["criteria"]


def _mk_item(key, cat="llm_content", weight=8, veto=False, passed=True, **kw):
    return {"key": key, "label": key, "category": cat, "weight": weight,
            "veto": veto, "pass": passed, "conflict": "", "standard_ref": "", "actual": "", **kw}


# ==================== 评分 ====================

class TestComputeScore:
    def test_all_pass_full_score(self):
        items = [_mk_item("a", weight=6), _mk_item("b", weight=4)]
        score, veto = compute_score(items)
        assert score == 100 and veto == []

    def test_weighted_average(self):
        items = [_mk_item("a", weight=8, passed=True), _mk_item("b", weight=2, passed=False)]
        score, _ = compute_score(items)
        assert score == 80

    def test_veto_caps_score_at_20(self):
        items = [_mk_item("a", weight=2, passed=True), _mk_item("v", weight=8, veto=True, passed=False)]
        score, veto = compute_score(items)
        assert score <= 20 and veto == ["v"]

    def test_archive_excluded(self):
        items = [_mk_item("a", weight=10), _mk_item("arch", cat="archive", weight=50, passed=False)]
        score, _ = compute_score(items)
        assert score == 100


class TestConflictsTop:
    def test_veto_first_then_weight(self):
        items = [
            _mk_item("low", weight=2, passed=False),
            _mk_item("veto1", weight=5, veto=True, passed=False),
            _mk_item("high", weight=10, passed=False),
        ]
        top = extract_conflicts_top(items, limit=2)
        assert [t["key"] for t in top] == ["veto1", "high"]


# ==================== 规则层 ====================

class TestRuleCheck:
    def test_video_meta_aspect_and_duration(self):
        meta = {"width": 768, "height": 1376, "duration": 15.2, "aspect_ratio": "9:16"}
        items = rule_check(CRITERIA, video_meta=meta)
        by_key = {i["key"]: i for i in items}
        assert by_key["aspect_ratio"]["pass"] is True
        assert by_key["duration"]["pass"] is True

    def test_wrong_ratio_veto_fail(self):
        meta = {"width": 1280, "height": 720, "duration": 15.0, "aspect_ratio": "16:9"}
        items = rule_check(CRITERIA, video_meta=meta)
        by_key = {i["key"]: i for i in items}
        assert by_key["aspect_ratio"]["pass"] is False
        assert by_key["aspect_ratio"]["veto"] is True

    def test_text_contains_hit_and_miss(self):
        script = {"shots": [{"video_prompt": "金枕榴莲椰耶蛋挞 13.5元2只 特写", "dialogue": []}]}
        ctx = {"product_name": "金枕榴莲椰耶蛋挞", "price_info": "13.5元2只"}
        items = rule_check(CRITERIA, parsed_script=script, brief_ctx=ctx)
        by_key = {i["key"]: i for i in items}
        assert by_key["product_name_hit"]["pass"] is True
        assert by_key["price_hit"]["pass"] is True

    def test_price_regex_fallback(self):
        script = {"shots": [{"video_prompt": "只要二十九块9", "dialogue": []}]}
        ctx = {"product_name": "未知产品", "price_info": "29.9元"}
        items = rule_check(CRITERIA, parsed_script=script, brief_ctx=ctx)
        by_key = {i["key"]: i for i in items}
        assert by_key["price_hit"]["pass"] is True  # 正则兜底命中"块9"

    def test_missing_brief_field_skips(self):
        items = rule_check(CRITERIA, parsed_script={"shots": []}, brief_ctx={})
        by_key = {i["key"]: i for i in items}
        assert by_key["product_name_hit"]["pass"] is None  # 未提供不判定

    def test_archive_item_always_pass(self):
        items = rule_check(CRITERIA, parsed_script={"shots": []}, brief_ctx={})
        by_key = {i["key"]: i for i in items}
        assert by_key["video_theme"]["pass"] is True
        assert by_key["video_theme"]["category"] == "archive"

    def test_ad_law_banned_word_hit(self):
        script = {"shots": [{"video_prompt": "全国销量冠军汉堡 全场最佳", "dialogue": [{"line": "顶级美味"}]}]}
        items = rule_check(CRITERIA, parsed_script=script, brief_ctx={})
        by_key = {i["key"]: i for i in items}
        assert by_key["ad_law_compliance"]["pass"] is False
        assert by_key["ad_law_compliance"]["veto"] is True
        assert "销量冠军" in by_key["ad_law_compliance"]["conflict"]

    def test_ad_law_clean_text_passes(self):
        script = {"shots": [{"video_prompt": "金枕榴莲椰耶蛋挞 咔嚓一口唤醒清晨", "dialogue": []}]}
        items = rule_check(CRITERIA, parsed_script=script, brief_ctx={})
        by_key = {i["key"]: i for i in items}
        assert by_key["ad_law_compliance"]["pass"] is True

    async def test_ad_law_veto_caps_score(self):
        """违禁词命中是 veto → 总分压 20 且 status failed"""
        script = {"shots": [{"video_prompt": "史上最好吃的炸鸡", "dialogue": []}]}
        template = dict(DEFAULT_KFC_TEMPLATE)
        template["brief_ctx"] = {}
        llm_out = [{"key": c["key"], "pass": True, "conflict": "", "actual": "", "advice": ""}
                   for c in CRITERIA if c["category"] == "llm_content"]
        with patch("app.api.v2.glm_proxy._glm_chat",
                   new=AsyncMock(return_value={"choices": [{"message": {"content": json.dumps(llm_out)}}]})):
            report = await run_script_gate("t_adlaw", script, template)
        assert report["status"] == "failed"
        assert "ad_law_compliance" in report["veto_hit"]


# ==================== LLM 解析与合并 ====================

class TestParseLlmJson:
    def test_plain_json(self):
        raw = json.dumps([{"key": "copy_fidelity", "pass": True, "conflict": "", "actual": "一致", "advice": ""}])
        out = _parse_llm_json(raw, [c for c in CRITERIA if c["key"] == "copy_fidelity"])
        assert out[0]["pass"] is True and out[0]["key"] == "copy_fidelity"

    def test_markdown_wrapped(self):
        raw = '```json\n[{"key": "must_elements", "pass": false, "conflict": "缺产品全貌", "actual": "", "advice": ""}]\n```'
        out = _parse_llm_json(raw, [c for c in CRITERIA if c["key"] == "must_elements"])
        assert out[0]["pass"] is False

    def test_unknown_keys_dropped(self):
        raw = json.dumps([{"key": "nonexistent", "pass": True}])
        out = _parse_llm_json(raw, [c for c in CRITERIA if c["key"] == "copy_fidelity"])
        assert out == []

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError):
            _parse_llm_json("完全不是 JSON", [])


class TestMergeItems:
    def test_later_group_overrides(self):
        g1 = [_mk_item("x", passed=None)]
        g2 = [_mk_item("x", passed=True)]
        assert merge_items(g1, g2)[0]["pass"] is True

    def test_finalize_converts_judged_none_to_fail(self):
        out = _finalize([_mk_item("y", passed=None)], judged_keys={"y"})
        assert out[0]["pass"] is False
        assert "人工复核" in out[0]["conflict"]

    def test_finalize_keeps_unjudged_none(self):
        out = _finalize([_mk_item("y", passed=None)], judged_keys={"other"})
        assert out[0]["pass"] is None


# ==================== 剧本闸集成（mock LLM） ====================

class TestRunScriptGate:
    async def test_pass_flow(self):
        script = {"tvc_title": "测试", "shots": [{"video_prompt": "金枕榴莲椰耶蛋挞", "dialogue": []}]}
        template = dict(DEFAULT_KFC_TEMPLATE)
        template["brief_ctx"] = {"product_name": "金枕榴莲椰耶蛋挞", "price_info": "13.5元"}
        llm_out = [{"key": c["key"], "pass": True, "conflict": "", "actual": "", "advice": ""}
                   for c in CRITERIA if c["category"] == "llm_content"]
        with patch("app.api.v2.glm_proxy._glm_chat",
                   new=AsyncMock(return_value={"choices": [{"message": {"content": json.dumps(llm_out)}}]})):
            report = await run_script_gate("t1", script, template)
        # price_info 未出现在脚本文本 → price_hit 合理扣分（86），但无 veto → passed
        assert report["status"] == "passed"
        assert report["score"] >= 60
        assert report["veto_hit"] == []

    async def test_veto_fail_flow(self):
        script = {"shots": []}
        template = dict(DEFAULT_KFC_TEMPLATE)
        template["brief_ctx"] = {"product_name": "某产品"}  # 不会命中空剧本
        llm_out = [{"key": c["key"], "pass": False, "conflict": "不达标", "actual": "", "advice": ""}
                   for c in CRITERIA if c["category"] == "llm_content"]
        with patch("app.api.v2.glm_proxy._glm_chat",
                   new=AsyncMock(return_value={"choices": [{"message": {"content": json.dumps(llm_out)}}]})):
            report = await run_script_gate("t2", script, template)
        assert report["status"] == "failed"
        assert report["score"] <= 20
        assert "must_elements" in report["veto_hit"]

    async def test_llm_failure_degrades_unverified(self):
        template = dict(DEFAULT_KFC_TEMPLATE)
        with patch("app.api.v2.glm_proxy._glm_chat", new=AsyncMock(side_effect=RuntimeError("502 up"))):
            report = await run_script_gate("t3", {"shots": []}, template)
        assert report["status"] == "unverified"
        assert report["items"] == []

    async def test_bad_llm_json_degrades(self):
        template = dict(DEFAULT_KFC_TEMPLATE)
        with patch("app.api.v2.glm_proxy._glm_chat",
                   new=AsyncMock(return_value={"choices": [{"message": {"content": "我无法输出JSON"}}]})):
            report = await run_script_gate("t4", {"shots": []}, template)
        assert report["status"] == "unverified"
