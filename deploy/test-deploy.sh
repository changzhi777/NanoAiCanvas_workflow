#!/bin/bash
# ============================================
# NanoAiCanvas 部署测试 — 一键入口
# 用法: bash test-deploy.sh [--html]
# ============================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0; FAIL=0; SKIP=0; TOTAL=0
RESULTS=()
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# --- 颜色 ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

# --- 工具函数 ---
log_pass() { ((PASS++)); ((TOTAL++)); RESULTS+=("✅|$1|$2|"); echo -e "  ${GREEN}[✅] $1${NC} ... $2"; }
log_fail() { ((FAIL++)); ((TOTAL++)); RESULTS+=("❌|$1|$2|"); echo -e "  ${RED}[❌] $1${NC} ... $2"; }
log_skip() { ((SKIP++)); ((TOTAL++)); RESULTS+=("⏭️|$1|$2|"); echo -e "  ${YELLOW}[⏭️] $1${NC} ... $2"; }
log_section() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

# --- 导入测试模块 ---
source "$SCRIPT_DIR/tests/01-network.sh"
source "$SCRIPT_DIR/tests/02-services.sh"
source "$SCRIPT_DIR/tests/03-frontend.sh"
source "$SCRIPT_DIR/tests/04-backend-api.sh"
source "$SCRIPT_DIR/tests/05-database.sh"
source "$SCRIPT_DIR/tests/06-performance.sh"

# --- 主流程 ---
clear
echo "============================================"
echo " NanoAiCanvas 部署测试"
echo " 服务器: $(hostname) ($(hostname -I | awk '{print $1}'))"
echo " 时间:   $TIMESTAMP"
echo "============================================"

test_network
test_services
test_frontend
test_backend_api
test_database
test_performance

# --- 汇总 ---
echo ""
echo "============================================"
echo -e " ${GREEN}通过: $PASS${NC} | ${RED}失败: $FAIL${NC} | ${YELLOW}跳过: $SKIP${NC} | 总计: $TOTAL"
echo "============================================"

# --- HTML 报告 ---
if [[ "${1:-}" == "--html" ]]; then
    REPORT_FILE="$SCRIPT_DIR/test-report-$(date '+%Y%m%d_%H%M%S').html"
    generate_html_report > "$REPORT_FILE"
    echo "HTML 报告: $REPORT_FILE"
fi

exit $FAIL

# --- HTML 报告生成 ---
generate_html_report() {
    cat << HTMLEOF
<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<title>NanoAiCanvas 部署测试报告</title>
<style>
body{font-family:monospace;max-width:900px;margin:40px auto;background:#1a1a2e;color:#eee;padding:20px}
h1{color:#00d4ff;border-bottom:2px solid #00d4ff;padding-bottom:10px}
.pass{color:#00ff88}.fail{color:#ff4444}.skip{color:#ffaa00}
table{width:100%;border-collapse:collapse;margin:20px 0}
th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #333}
th{background:#16213e;color:#00d4ff}
.summary{font-size:1.2em;padding:15px;background:#16213e;border-radius:8px;margin:20px 0}
</style></head><body>
<h1>🔍 NanoAiCanvas 部署测试报告</h1>
<div class="summary">
<strong>服务器:</strong> $(hostname) ($(hostname -I | awk '{print $1}'))<br>
<strong>时间:</strong> $TIMESTAMP<br>
<strong class="pass">通过: $PASS</strong> |
<strong class="fail">失败: $FAIL</strong> |
<strong class="skip">跳过: $SKIP</strong> |
总计: $TOTAL
</div>
<table><tr><th>状态</th><th>测试项</th><th>详情</th></tr>
HTMLEOF
    for r in "${RESULTS[@]}"; do
        IFS='|' read -r icon name detail _ <<< "$r"
        cls="pass"
        [[ "$icon" == "❌" ]] && cls="fail"
        [[ "$icon" == "⏭️" ]] && cls="skip"
        echo "<tr><td class=\"$cls\">$icon</td><td>$name</td><td>$detail</td></tr>"
    done
    echo "</table></body></html>"
}
