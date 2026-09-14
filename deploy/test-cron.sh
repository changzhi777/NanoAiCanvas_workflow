#!/bin/bash
# ============================================
# 定时测试 — cron 配置
# 用法: bash test-cron.sh install   # 安装 cron
#       bash test-cron.sh run       # 手动触发
#       bash test-cron.sh status    # 查看 cron 状态
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/var/log/nanoai-test"
REPORT_DIR="$SCRIPT_DIR/reports"

mkdir -p "$LOG_DIR" "$REPORT_DIR"

case "${1:-status}" in
    install)
        # 每天 8:00 和 20:00 各跑一次，失败时写日志
        CRON_LINE="0 8,20 * * * cd $SCRIPT_DIR && bash test-deploy.sh --html > $LOG_DIR/test-\$(date +\%Y\%m\%d-\%H\%M\%S).log 2>&1"
        (crontab -l 2>/dev/null | grep -v "test-deploy.sh"; echo "$CRON_LINE") | crontab -
        echo "Cron 已安装:"
        crontab -l | grep test-deploy
        ;;
    uninstall)
        crontab -l 2>/dev/null | grep -v "test-deploy.sh" | crontab -
        echo "Cron 已卸载"
        ;;
    run)
        echo "$(date '+%Y-%m-%d %H:%M:%S') 开始测试..."
        cd "$SCRIPT_DIR"
        bash test-deploy.sh --html
        FAIL=$?
        # 保留最近 30 天报告
        find "$REPORT_DIR" -name "*.html" -mtime +30 -delete
        find "$LOG_DIR" -name "*.log" -mtime +30 -delete
        echo "$(date '+%Y-%m-%d %H:%M:%S') 测试完成，失败: $FAIL"
        exit $FAIL
        ;;
    status)
        echo "=== Cron 任务 ==="
        crontab -l 2>/dev/null | grep test-deploy || echo "未安装"
        echo ""
        echo "=== 最近报告 ==="
        ls -lt "$REPORT_DIR"/*.html 2>/dev/null | head -5 || echo "无报告"
        echo ""
        echo "=== 最近日志 ==="
        ls -lt "$LOG_DIR"/*.log 2>/dev/null | head -5 || echo "无日志"
        ;;
    *)
        echo "用法: $0 {install|uninstall|run|status}"
        ;;
esac
