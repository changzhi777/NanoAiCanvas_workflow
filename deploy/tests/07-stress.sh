#!/bin/bash
# ============================================
# 压力测试 — wrk 并发压测
# 用法: bash stress-test.sh [duration] [threads] [connections]
# 默认: 30秒 / 4线程 / 100连接
# ============================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DURATION="${1:-30s}"
THREADS="${2:-4}"
CONNECTIONS="${3:-100}"
REPORT="$SCRIPT_DIR/reports/stress-$(date '+%Y%m%d_%H%M%S').txt"

mkdir -p "$SCRIPT_DIR/reports"

# --- 颜色 ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

# --- 安装 wrk ---
install_wrk() {
    if command -v wrk &>/dev/null; then return 0; fi
    echo -e "${YELLOW}安装 wrk...${NC}"
    apt install -y build-essential libssl-dev git >/dev/null 2>&1
    cd /tmp && git clone https://github.com/wg/wrk.git 2>/dev/null
    cd /tmp/wrk && make -j$(nproc) >/dev/null 2>&1
    cp /tmp/wrk/wrk /usr/local/bin/ 2>/dev/null
    rm -rf /tmp/wrk
    command -v wrk &>/dev/null && echo -e "${GREEN}wrk 安装成功${NC}" || { echo -e "${RED}wrk 安装失败${NC}"; exit 1; }
}

install_wrk

echo "============================================"
echo " NanoAiCanvas 压力测试"
echo " 参数: ${DURATION} / ${THREADS}线程 / ${CONNECTIONS}连接"
echo "============================================"

echo "" | tee "$REPORT"
echo "压力测试报告 — $(date '+%Y-%m-%d %H:%M:%S')" >> "$REPORT"
echo "参数: ${DURATION} / ${THREADS}T / ${CONNECTIONS}C" >> "$REPORT"
echo "============================================" >> "$REPORT"

# --- 测试场景 ---
declare -A TESTS=(
    ["首页(静态)"]="http://127.0.0.1/nanoai/"
    ["Health API"]="http://127.0.0.1/health"
    ["API Login"]="http://127.0.0.1/api/auth/login"
    ["V2 API"]="http://127.0.0.1/v2/"
)

for name in "${!TESTS[@]}"; do
    url="${TESTS[$name]}"
    echo -e "\n${CYAN}>>> $name${NC} — $url"

    RESULT=$(wrk -t"$THREADS" -c"$CONNECTIONS" -d"$DURATION" \
        --latency "$url" 2>&1)

    echo "$RESULT" | tee -a "$REPORT"
    echo "---" >> "$REPORT"

    # 提取关键指标
    REQ_SEC=$(echo "$RESULT" | grep "Requests/sec" | awk '{print $2}')
    LAT_AVG=$(echo "$RESULT" | grep -oP 'Latency\s+\K[\d.]+[mu]s')
    P99=$(echo "$RESULT" | grep -oP '99%\s+\K[\d.]+[mu]s')
    ERRORS=$(echo "$RESULT" | grep -oP 'Socket errors: connect \K\d+' || echo "0")

    # 判定
    if [[ "$ERRORS" -gt 0 ]] 2>/dev/null; then
        echo -e "  ${RED}[❌] $name — ${ERRORS} 连接错误${NC}"
    elif [[ -n "$REQ_SEC" ]]; then
        echo -e "  ${GREEN}[✅] $name — ${REQ_SEC} req/s | 延迟 ${LAT_AVG} | P99 ${P99}${NC}"
    else
        echo -e "  ${RED}[❌] $name — 无结果${NC}"
    fi
done

# --- 内存快照 ---
echo -e "\n${CYAN}>>> 压测后内存状态${NC}"
free -h | tee -a "$REPORT"

echo ""
echo "============================================"
echo "报告已保存: $REPORT"
echo "============================================"
