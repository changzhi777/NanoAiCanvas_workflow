"""飞书 Brief 抓取与解析（按需导入链路）。

链路（2026-10-02 实测验证）：匿名分享链接 → clientvars API → gzip+base64 解压
→ fieldMap/recordMap → 转置表还原（行=维度，列=每条视频）→ 标准集生成。
"""
import base64
import gzip
import json
import logging
import re
from urllib.parse import parse_qs, urlparse

import httpx

logger = logging.getLogger(__name__)

CLIENTVARS_PATH = "/space/api/v1/bitable/{token}/clientvars"
_DEFAULT_PARAMS = {
    "recordLimit": "200", "ondemandLimit": "200", "needBase": "true",
    "viewLazyLoad": "true", "ondemandVer": "2", "openType": "0",
    "noMissCS": "true", "optimizationFlag": "1", "removeFmlExtra": "true",
}

# Brief 转置表的「文本」列维度名 → 标准化 key
DIMENSION_KEY_MAP = {
    "本期视频主题": "theme",
    "下单日期": "order_date",
    "需要产出时间": "delivery_date",
    "画面比例": "aspect_ratio",
    "视频类型": "video_type",
    "主要推广对象": "product_info",     # 含 必现产品/卖点/活动/slogan/价格
    "海报、指定联名": "materials",       # 素材链接
    "故事环境背景": "scene_background",
    "人物形象设定": "character_setting",
    "视频广告文案内容": "copywriting",
    "故事情节描述": "plot_description",
    "进度": "progress_status",
}


def parse_share_url(share_url: str) -> dict:
    """解析分享链接 → {host, base_token, table_id, view_id}。"""
    u = urlparse(share_url.strip())
    if "feishu.cn" not in u.netloc and "larksuite.com" not in u.netloc:
        raise ValueError(f"非飞书链接: {share_url[:80]}")
    base_token = None
    for part in u.path.split("/"):
        if len(part) >= 20 and re.fullmatch(r"[A-Za-z0-9]+", part):
            base_token = part
    if not base_token:
        raise ValueError("无法从链接提取 base token")
    qs = parse_qs(u.query)
    return {
        "host": u.netloc,
        "base_token": base_token,
        "table_id": (qs.get("table") or [None])[0],
        "view_id": (qs.get("view") or [None])[0],
    }


def _decode_gzip_b64(data: str) -> bytes:
    return gzip.decompress(base64.b64decode(data))


async def fetch_bitable(share_url: str) -> dict:
    """抓取多维表格 → {base_name, fields, rows, tables}。

    rows: [{维度名: 单元格文本}]（转置原始行）
    """
    info = parse_share_url(share_url)
    params = dict(_DEFAULT_PARAMS)
    if info["table_id"]:
        params["tableID"] = info["table_id"]
    if info["view_id"]:
        params["viewID"] = info["view_id"]
    url = f"https://{info['host']}{CLIENTVARS_PATH.format(token=info['base_token'])}"

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(url, params=params, headers={"User-Agent": "Mozilla/5.0"})
    if resp.status_code != 200:
        raise RuntimeError(f"飞书 clientvars HTTP {resp.status_code}（链接可能失效或非匿名可访问）")
    body = resp.json()
    if body.get("code") != 0:
        raise RuntimeError(f"飞书 clientvars code={body.get('code')}: {str(body.get('msg'))[:100]}")

    raw_table = (body.get("data") or {}).get("table")
    raw_base = (body.get("data") or {}).get("base")
    if not raw_table:
        raise RuntimeError("响应缺少 table 数据")

    table = json.loads(_decode_gzip_b64(raw_table))
    base_name = ""
    if raw_base:
        try:
            base_name = (json.loads(_decode_gzip_b64(raw_base)) or {}).get("name", "")
        except Exception:
            pass

    fields = {fid: (f or {}).get("name", fid) for fid, f in (table.get("fieldMap") or {}).items()}

    def cell_text(cell) -> str:
        if not isinstance(cell, dict):
            return ""
        val = cell.get("value")
        if not isinstance(val, list):
            return ""
        parts = []
        for x in val:
            if isinstance(x, dict):
                if x.get("link"):
                    parts.append(f"{x.get('text', '')} → {x['link']}")
                elif x.get("text") is not None:
                    parts.append(str(x["text"]))
                elif x.get("name"):
                    parts.append(f"[附件]{x['name']}")
            elif x is not None:
                parts.append(str(x))
        return "\n".join(p for p in parts if p and p != "null")

    rows = []
    for _rid, rec in (table.get("recordMap") or {}).items():
        row = {}
        for fid, cell in rec.items():
            if isinstance(cell, dict) and "value" in cell:
                name = fields.get(fid, fid)
                txt = cell_text(cell)
                if txt:
                    row[name] = txt
        if row:
            rows.append(row)
    return {"base_name": base_name, "fields": list(fields.values()), "rows": rows}


# ==================== 转置表 → 结构化 Brief ====================

def _dim_key(field_name: str) -> str | None:
    """「画面比例（默认 9:16）」→ aspect_ratio。"""
    for prefix, key in DIMENSION_KEY_MAP.items():
        if field_name.startswith(prefix):
            return key
    return None


def parse_brief(rows: list[dict]) -> dict:
    """转置行还原 → {base_name 缺省, items: [{column, theme, fields: {key: text}}]}。

    「文本」列 = 维度名；其余「第一条/第二条/案例」列为视频条目。
    """
    items: dict[str, dict] = {}
    order: list[str] = []
    for row in rows:
        dim_name = (row.get("文本") or "").strip()
        if not dim_name:
            continue
        dim_key = _dim_key(dim_name)
        for col, value in row.items():
            if col == "文本":
                continue
            if col not in items:
                items[col] = {"column": col, "theme": "", "fields": {}}
                order.append(col)
            if dim_key:
                items[col]["fields"][dim_key] = value
            if col == "案例":
                continue  # 案例列是示例，不当条目
    for col in order:
        if col == "案例":
            continue
        it = items[col]
        it["theme"] = it["fields"].get("theme", "")
    # 只保留至少有一个标准字段的非案例列
    out = [items[c] for c in order if c != "案例" and items[c]["fields"]]
    return {"items": out}


def extract_product_and_price(product_info: str) -> dict:
    """从「主要推广对象…」自由文本提取产品名与价格信息（规则启发）。"""
    text = (product_info or "").strip()
    price_info = ""
    m = re.search(r"([0-9.]+\s*元[^，。\n;；]*|[0-9.]+\s*元/[^，。\n;；]*)", text)
    if m:
        price_info = m.group(1).strip()
    # 产品名：主推产品/产品全称 冒号后第一段（到空白/标点止）
    name = ""
    m = re.search(r"(?:主推产品|产品全称|推广对象)[:：]\s*([^\n，。;；\s]{2,30})", text)
    if m:
        name = m.group(1).strip()
    if not name and text:
        # 兜底：第一行前 30 字
        name = text.splitlines()[0][:30].strip()
    return {"product_name": name, "price_info": price_info}


def to_template_criteria(item: dict) -> dict:
    """Brief 条目 → 模板生成入参 {criteria_overrides, brief_ctx}。

    基于 KFC 默认 14 项骨架，用 Brief 实际内容覆盖 prompt_hint / brief_ctx。
    """
    f = item.get("fields") or {}
    prod = extract_product_and_price(f.get("product_info", ""))
    aspect = "9:16"
    ar_text = f.get("aspect_ratio", "")
    if "16:9" in ar_text:
        aspect = "16:9"

    brief_ctx = {
        "theme": f.get("theme", ""),
        "product_name": prod["product_name"],
        "price_info": prod["price_info"] or f.get("product_info", "")[:120],
        "delivery_date": f.get("delivery_date", ""),
        "scene_background": f.get("scene_background", "")[:500],
        "character_setting": f.get("character_setting", "")[:500],
        "copywriting": f.get("copywriting", "")[:500],
        "plot_description": f.get("plot_description", "")[:800],
        "video_type": f.get("video_type", ""),
        "materials": f.get("materials", "")[:300],
    }
    criteria_overrides = {
        "aspect_ratio": {"rule": {"type": "aspect_ratio", "expect": aspect}},
        "must_elements": {"prompt_hint": f"情节必现元素审查：{f.get('plot_description', '')[:200]}"},
        "copy_fidelity": {"prompt_hint": f"指定文案忠实度：{f.get('copywriting', '')[:200]}"},
        "scene_mood_text": {"prompt_hint": f"场景氛围：{f.get('scene_background', '')[:200]}"},
        "ip_consistency": {"prompt_hint": f"IP 设定：{f.get('character_setting', '')[:200]}；不得改动面部、服饰等细节"},
    }
    return {"aspect_ratio": aspect, "criteria_overrides": criteria_overrides, "brief_ctx": brief_ctx}


def bundle_from_share_url_sync(rows: list[dict], base_name: str = "") -> dict:
    """行数据 → BriefBundle（items 各带 theme + criteria 生成预览）。"""
    parsed = parse_brief(rows)
    for it in parsed["items"]:
        it["preview"] = to_template_criteria(it)
    return {"base_name": base_name, "items": parsed["items"]}
