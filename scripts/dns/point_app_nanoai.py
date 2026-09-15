#!/usr/bin/env python3
"""DNSPod 改 A 记录 — app.nanoai.fun → 43.129.205.22

DNSPod API 文档：https://docs.dnspod.cn/api/mod-record/

需要 DNSPod 凭证：
  - Login Token（推荐，DNSPod 控制台「用户中心 → 安全设置 → API Token」生成）
  - 或 ID + Token 组合（已弃用）

用法：
  export DNSPOD_TOKEN="12345,abcdef..."
  python3 scripts/dns/point_app_nanoai.py

注：脚本会优先用环境变量 DNSPOD_TOKEN；如未设则交互式提示输入
"""
import json
import os
import sys
import urllib.request
import urllib.parse
from typing import Optional

API_BASE = "https://dnsapi.cn"
DOMAIN = "nanoai.fun"
SUBDOMAIN = "app"
TARGET_IP = "43.129.205.22"
RECORD_TYPE = "A"
TTL = 600  # 10 分钟缓存（生产可改 600 = 1h）
LINE = "default"  # 默认解析线路（免费版只有默认）


def call_dnspod(api: str, payload: dict, token: str) -> dict:
    url = f"{API_BASE}/{api}"
    data = urllib.parse.urlencode({
        "login_token": token,
        "format": "json",
        **payload,
    }).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    req.add_header("User-Agent", "nanoai-deploy/1.0 (macOS)")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return {"status": {"code": str(e.code), "message": body[:200]}}


def list_records(token: str) -> list[dict]:
    """列出该域名所有 A 记录。"""
    r = call_dnspod("Record.List", {
        "domain": DOMAIN,
        "sub_domain": SUBDOMAIN,
        "record_type": RECORD_TYPE,
    }, token)
    status = r.get("status", {})
    if str(status.get("code")) != "1":
        sys.exit(f"❌ Record.List 失败: {status.get('message', r)}")
    return r.get("records", [])


def get_token() -> str:
    token = os.environ.get("DNSPOD_TOKEN", "").strip()
    if not token:
        sys.exit(
            "❌ 未设置 DNSPOD_TOKEN 环境变量\n"
            "  获取：https://console.dnspod.cn → 用户中心 → 安全设置 → API Token\n"
            "  格式：id,token（如 12345,abc...）\n"
            "  使用：export DNSPOD_TOKEN=\"id,token\""
        )
    return token


def main() -> int:
    token = get_token()
    print(f"📋 域名: {DOMAIN}  子域: {SUBDOMAIN}  目标 IP: {TARGET_IP}")
    print(f"🔑 Token: {token[:8]}...{token[-4:]}")
    print()

    # 1. 查现有记录
    existing = list_records(token)
    print(f"📊 现有 {RECORD_TYPE} 记录: {len(existing)} 条")
    for r in existing:
        rid = r.get("record_id")
        val = r.get("value")
        print(f"  • id={rid}  value={val}")

    matched = [r for r in existing if r.get("value") == TARGET_IP and r.get("status") == "enable"]
    if matched:
        print(f"\n✅ A 记录已存在且指向 {TARGET_IP}（record_id={matched[0]['record_id']}），无需修改")
        return 0

    if existing:
        # 已有记录但 IP 错 → 改
        print(f"\n🔄 修改现有 A 记录 {existing[0]['record_id']} → {TARGET_IP}")
        r = call_dnspod("Record.Modify", {
            "domain": DOMAIN,
            "sub_domain": SUBDOMAIN,
            "record_type": RECORD_TYPE,
            "record_line": LINE,
            "record_id": existing[0]["record_id"],
            "value": TARGET_IP,
            "ttl": str(TTL),
        }, token)
    else:
        # 没记录 → 创
        print(f"\n➕ 创建 A 记录 app.{DOMAIN} → {TARGET_IP}")
        r = call_dnspod("Record.Create", {
            "domain": DOMAIN,
            "sub_domain": SUBDOMAIN,
            "record_type": RECORD_TYPE,
            "record_line": LINE,
            "value": TARGET_IP,
            "ttl": str(TTL),
        }, token)

    status = r.get("status", {})
    code = str(status.get("code"))
    msg = status.get("message", "")
    if code == "1":
        print(f"✅ 成功: {msg}")
        print(f"\n🔍 验证 DNS 解析（可能需 1-5 分钟生效）:")
        print(f"   dig app.{DOMAIN} +short")
        return 0
    else:
        print(f"❌ 失败 [{code}]: {msg}")
        print(f"   完整响应: {r}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
