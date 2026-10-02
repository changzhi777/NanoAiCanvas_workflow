"""feishu_brief 解析单元测试 — 转置还原/维度映射/criteria 生成（用真实 Brief fixture 结构）"""
import json
from pathlib import Path

import pytest

from app.services.feishu_brief import (
    parse_share_url,
    parse_brief,
    extract_product_and_price,
    to_template_criteria,
    bundle_from_share_url_sync,
    _dim_key,
)


# 真实第七节 Brief（20260928 三体联名）缩样——转置结构
FIXTURE_ROWS = [
    {"文本": "画面比例（默认 9:16）", "案例": "示例：9:16", "第一条": "默认"},
    {"文本": "本期视频主题", "案例": "示例：黄油小熊开学大冒险", "第一条": "十翅一桶 联名 三体宇宙"},
    {"文本": "主要推广对象 / 必须出现的产品 / 信息卖点 / 活动机制 / 必要 slogan / 价格",
     "案例": "案例略", "第一条": "1、三体联名信息 \n2、39.9元十翅一桶\n3、薄脆金沙翅首次加入"},
    {"文本": "视频类型（非 IP / 是 IP（请保证良品））", "案例": "示例", "第一条": "是IP （请保证良品）"},
    {"文本": "故事情节描述（注意篇幅在15s左右）", "案例": "案例略", "第一条": "男主在工作台……视频最后KV结尾"},
    {"文本": "需要产出时间", "案例": "示例：8 月 26 日", "第一条": "10/4"},
    {},
]


class TestParseShareUrl:
    def test_standard_link(self):
        info = parse_share_url("https://my.feishu.cn/base/JuuFb6XIeano0LsiBPYcpn9on6e?table=tblAbc&view=vewX")
        assert info["base_token"] == "JuuFb6XIeano0LsiBPYcpn9on6e"
        assert info["table_id"] == "tblAbc"
        assert info["view_id"] == "vewX"
        assert info["host"] == "my.feishu.cn"

    def test_non_feishu_rejected(self):
        with pytest.raises(ValueError):
            parse_share_url("https://example.com/base/xxx")

    def test_no_token_rejected(self):
        with pytest.raises(ValueError):
            parse_share_url("https://my.feishu.cn/base/")


class TestDimKey:
    def test_prefix_mapping(self):
        assert _dim_key("画面比例（默认 9:16）") == "aspect_ratio"
        assert _dim_key("本期视频主题") == "theme"
        assert _dim_key("需要产出时间") == "delivery_date"
        assert _dim_key("进度（已完成/进行中）") == "progress_status"

    def test_unknown_returns_none(self):
        assert _dim_key("随便什么") is None


class TestParseBrief:
    def test_transpose_restore(self):
        parsed = parse_brief(FIXTURE_ROWS)
        items = parsed["items"]
        # 案例列被排除，只剩第一条
        assert len(items) == 1
        it = items[0]
        assert it["column"] == "第一条"
        assert it["theme"] == "十翅一桶 联名 三体宇宙"
        assert it["fields"]["aspect_ratio"] == "默认"
        assert it["fields"]["delivery_date"] == "10/4"
        assert "39.9元" in it["fields"]["product_info"]

    def test_empty_rows(self):
        assert parse_brief([{}, {}, {}])["items"] == []


class TestExtractProductPrice:
    def test_price_and_name(self):
        out = extract_product_and_price("主推产品：金枕榴莲椰耶蛋挞 9/21上市\n①第二份半价：13.5元2只")
        assert out["product_name"] == "金枕榴莲椰耶蛋挞"
        assert "13.5元" in out["price_info"]

    def test_price_then_name_pattern(self):
        """三体 Brief 实测格式：无「主推产品：」前缀，「39.9元十翅一桶」→ 价格后产品名"""
        out = extract_product_and_price("1、三体联名信息 \n2、39.9元十翅一桶\n3、薄脆金沙翅首次加入")
        assert out["product_name"] == "十翅一桶"
        assert "39.9元" in out["price_info"]

    def test_fallback_strips_enum_prefix(self):
        """无价格线索时兜底首行并清洗序号前缀"""
        out = extract_product_and_price("1、墨西哥风情爆芝牛肉五方\n2、29.9元三件套")
        assert out["product_name"] == "墨西哥风情爆芝牛肉五方"
        assert not out["product_name"].startswith("1、")

    def test_fallback_first_line(self):
        out = extract_product_and_price("随便写点东西\n第二行")
        assert out["product_name"] == "随便写点东西"


class TestToTemplateCriteria:
    def test_aspect_and_overrides(self):
        item = {"column": "第一条", "theme": "三体", "fields": {
            "aspect_ratio": "默认", "product_info": "主推产品：十翅一桶\n39.9元",
            "character_setting": "Q版吃货哥（天体研究员风格）",
        }}
        out = to_template_criteria(item)
        assert out["aspect_ratio"] == "9:16"
        assert out["brief_ctx"]["product_name"] == "十翅一桶"
        assert "天体研究员" in out["criteria_overrides"]["ip_consistency"]["prompt_hint"]

    def test_169_brief(self):
        item = {"column": "x", "theme": "", "fields": {"aspect_ratio": "示例：16:9，横屏"}}
        out = to_template_criteria(item)
        assert out["aspect_ratio"] == "16:9"


class TestBundle:
    def test_full_bundle(self):
        bundle = bundle_from_share_url_sync(FIXTURE_ROWS, base_name="20260928 Brief")
        assert bundle["base_name"] == "20260928 Brief"
        assert len(bundle["items"]) == 1
        assert "preview" in bundle["items"][0]
        assert bundle["items"][0]["preview"]["brief_ctx"]["theme"] == "十翅一桶 联名 三体宇宙"
