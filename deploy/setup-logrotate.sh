#!/bin/bash
# ============================================
# 日志轮转配置
# 用法: bash setup-logrotate.sh install|status|force
# ============================================
set -uo pipefail

LOGROTATE_CONF="/etc/logrotate.d/nanoai"

case "${1:-install}" in
    install)
        echo "=== 配置 logrotate ==="

        # 创建日志目录
        mkdir -p /var/log/nanoai

        # Nginx + 后端 + 测试日志轮转配置
        cat > "$LOGROTATE_CONF" << 'EOF'
# Nginx 访问/错误日志
/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1 || true
    endscript
}

# 后端 uvicorn 日志（journalctl 导出）
/var/log/nanoai/backend-*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
    maxsize 50M
}

# 测试报告日志
/opt/nanoai/deploy/reports/*.log {
    weekly
    missingok
    rotate 8
    compress
    notifempty
}

# 备份日志
/var/log/nanoai-backup.log {
    weekly
    missingok
    rotate 8
    compress
    notifempty
    copytruncate
}
EOF

        chmod 644 "$LOGROTATE_CONF"

        # 创建每日 journal 日志导出 cron
        CRON_LINE="0 3 * * * journalctl -u nanoai-backend --since yesterday --no-pager > /var/log/nanoai/backend-\$(date -d yesterday +\%Y\%m\%d).log 2>/dev/null"
        (crontab -l 2>/dev/null | grep -v "nanoai-backend --since"; echo "$CRON_LINE") | crontab -

        echo "✅ logrotate 配置完成"
        echo "   配置: $LOGROTATE_CONF"
        echo "   每日导出后端日志 cron 已安装"
        ;;

    status)
        echo "=== logrotate 配置 ==="
        if [[ -f "$LOGROTATE_CONF" ]]; then
            cat "$LOGROTATE_CONF"
        else
            echo "未配置"
        fi
        echo ""
        echo "=== 日志大小 ==="
        echo "Nginx:"
        du -sh /var/log/nginx/ 2>/dev/null || echo "  N/A"
        echo "后端:"
        du -sh /var/log/nanoai/ 2>/dev/null || echo "  N/A"
        echo "Journal:"
        journalctl --disk-usage 2>/dev/null || echo "  N/A"
        echo ""
        echo "=== Cron ==="
        crontab -l 2>/dev/null | grep -E "nanoai|logrotate" || echo "无相关 cron"
        ;;

    force)
        echo "强制轮转..."
        logrotate -vf "$LOGROTATE_CONF" 2>&1 | tail -10
        ;;

    uninstall)
        rm -f "$LOGROTATE_CONF"
        crontab -l 2>/dev/null | grep -v "nanoai-backend --since" | crontab -
        echo "✅ logrotate 已卸载"
        ;;

    *)
        echo "用法: $0 {install|status|force|uninstall}"
        ;;
esac
