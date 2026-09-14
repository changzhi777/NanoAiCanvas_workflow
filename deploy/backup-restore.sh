#!/bin/bash
# ============================================
# 数据库备份与恢复测试
# 用法:
#   bash backup-restore.sh backup           # 生产备份
#   bash backup-restore.sh test-restore     # 恢复到临时库验证
#   bash backup-restore.sh schedule         # 安装定时备份 cron
#   bash backup-restore.sh status           # 查看备份状态
# ============================================
set -uo pipefail

# --- 配置 ---
PG_HOST="10.10.10.11"
PG_PORT="5432"
PG_USER="nanoai"
PG_PASS="nanoai2026"
PG_DB="nanoai"
PG_TEST_DB="nanoai_test_restore"
BACKUP_DIR="/opt/nanoai/backups"
TS=$(date '+%Y%m%d_%H%M%S')
export PGPASSWORD="$PG_PASS"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

mkdir -p "$BACKUP_DIR"

case "${1:-status}" in
    backup)
        echo -e "${GREEN}=== 数据库备份 ===${NC}"
        FILE="$BACKUP_DIR/${PG_DB}_${TS}.sql.gz"

        # PG 备份
        echo "备份 ${PG_DB}..."
        pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -Fc "$PG_DB" > "${FILE%.sql.gz}.dump" 2>/dev/null

        if [[ $? -eq 0 ]] && [[ -s "${FILE%.sql.gz}.dump" ]]; then
            SIZE=$(du -h "${FILE%.sql.gz}.dump" | awk '{print $1}')
            TABLES=$(pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DB" --list 2>/dev/null | grep -c "TABLE" || echo "?")
            echo -e "${GREEN}✅ 备份成功${NC}"
            echo "  文件: ${FILE%.sql.gz}.dump"
            echo "  大小: $SIZE"
            echo "  表数: $TABLES"
        else
            echo -e "${RED}❌ 备份失败${NC}"
            exit 1
        fi

        # Redis 备份
        echo "备份 Redis..."
        python3 -c "
import redis
r = redis.Redis(host='10.10.10.13', port=6379, password='redis_pass_2026')
r.save()
print('✅ Redis BGSAVE 已触发')
" 2>/dev/null || echo -e "${YELLOW}⚠️ Redis 备份跳过${NC}"

        # 清理 30 天前的备份
        find "$BACKUP_DIR" -name "*.dump" -mtime +30 -delete
        echo "清理 >30 天备份完成"
        ;;

    test-restore)
        echo -e "${YELLOW}=== 恢复测试 ===${NC}"
        LATEST=$(ls -t "$BACKUP_DIR"/*.dump 2>/dev/null | head -1)
        if [[ -z "$LATEST" ]]; then
            echo -e "${RED}❌ 无备份文件，先执行 backup${NC}"
            exit 1
        fi

        echo "使用备份: $LATEST"
        SIZE=$(du -h "$LATEST" | awk '{print $1}')
        echo "文件大小: $SIZE"

        # 创建临时库
        echo "创建临时库 ${PG_TEST_DB}..."
        psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres \
            -c "DROP DATABASE IF EXISTS ${PG_TEST_DB};" 2>/dev/null
        psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres \
            -c "CREATE DATABASE ${PG_TEST_DB};" 2>/dev/null

        # 恢复
        echo "恢复中..."
        pg_restore -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_TEST_DB" "$LATEST" 2>&1 | tail -5

        # 验证
        RESTORE_TABLES=$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_TEST_DB" \
            -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
        ORIG_TABLES=$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" \
            -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')

        echo ""
        echo "原始表数: ${ORIG_TABLES:-?}"
        echo "恢复表数: ${RESTORE_TABLES:-?}"

        if [[ "$RESTORE_TABLES" == "$ORIG_TABLES" ]] 2>/dev/null; then
            echo -e "${GREEN}✅ 恢复验证通过${NC}"
        else
            echo -e "${YELLOW}⚠️ 表数不一致 (原始=${ORIG_TABLES}, 恢复=${RESTORE_TABLES})${NC}"
        fi

        # 清理临时库
        psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres \
            -c "DROP DATABASE IF EXISTS ${PG_TEST_DB};" 2>/dev/null
        echo "临时库已清理"
        ;;

    schedule)
        # 每天凌晨 2:00 自动备份
        CRON_LINE="0 2 * * * /opt/nanoai/deploy/backup-restore.sh backup >> /var/log/nanoai-backup.log 2>&1"
        (crontab -l 2>/dev/null | grep -v "backup-restore.sh"; echo "$CRON_LINE") | crontab -
        echo -e "${GREEN}✅ 定时备份已安装 (每天 02:00)${NC}"
        crontab -l | grep backup
        ;;

    unschedule)
        crontab -l 2>/dev/null | grep -v "backup-restore.sh" | crontab -
        echo "定时备份已卸载"
        ;;

    status)
        echo "=== 备份文件 ==="
        ls -lht "$BACKUP_DIR"/*.dump 2>/dev/null | head -5 || echo "无备份"
        echo ""
        echo "=== 磁盘占用 ==="
        du -sh "$BACKUP_DIR" 2>/dev/null
        echo ""
        echo "=== Cron ==="
        crontab -l 2>/dev/null | grep backup || echo "无定时备份"
        ;;

    *)
        echo "用法: $0 {backup|test-restore|schedule|unschedule|status}"
        ;;
esac
