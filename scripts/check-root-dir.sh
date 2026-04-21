#!/bin/bash

################################################################################
# 根目录检查脚本
#
# 用途：检查项目根目录是否有违规文件（临时 .md、测试文件等）
# 使用：bash scripts/check-root-dir.sh
# 返回：0 = 通过，1 = 发现违规
################################################################################

set -e

echo "🔍 检查根目录文件违规..."
echo ""

VIOLATIONS=0
WARNINGS=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# 检查临时 .md 文件
echo "📄 检查临时 .md 文件..."
TEMP_MD=$(ls *.md 2>/dev/null | grep -v "CLAUDE.md" | grep -v "README.md" | grep -v "CHANGELOG.md" || true)
if [ -n "$TEMP_MD" ]; then
    echo -e "${RED}❌ 发现根目录有非标准 .md 文件：${NC}"
    echo "$TEMP_MD"
    echo "根目录应该只保留 CLAUDE.md、README.md 和 CHANGELOG.md"
    echo "请将这些文件移动到 docs/ 目录的合适子目录中："
    echo "  - 报告类 → docs/reports/"
    echo "  - 指南类 → docs/guides/"
    echo "  - 功能类 → docs/features/"
    echo "  - 归档类 → docs/archive/"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo -e "${GREEN}✅ 未发现临时 .md 文件${NC}"
fi

# 检查测试文件
echo ""
echo "🧪 检查测试文件..."
TEST_FILES=$(ls *.test.* *.spec.* 2>/dev/null || true)
if [ -n "$TEST_FILES" ]; then
    echo -e "${RED}❌ 发现根目录有测试文件：${NC}"
    echo "$TEST_FILES"
    echo "请将这些文件移动到以下目录："
    echo "  - 源码测试 → src/__tests__/"
    echo "  - 独立测试 → tests/"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo -e "${GREEN}✅ 未发现测试文件${NC}"
fi

# 检查临时脚本
echo ""
echo "🔧 检查临时脚本..."
TEMP_SCRIPTS=$(ls temp.* tmp.* scratch.* debug.* 2>/dev/null || true)
if [ -n "$TEMP_SCRIPTS" ]; then
    echo -e "${YELLOW}⚠️  发现根目录有临时脚本：${NC}"
    echo "$TEMP_SCRIPTS"
    echo "建议："
    echo "  - 有用的脚本 → 移动到 scripts/ 并重命名"
    echo "  - 调试脚本 → 移动到 scripts/debug/"
    echo "  - 临时脚本 → 删除"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ 未发现临时脚本${NC}"
fi

# 检查常见的临时文件名
echo ""
echo "📝 检查临时文件名..."
TEMP_NAMES=$(ls TODO.md NOTES.md DRAFT.md SCRATCH.md TEMP.md 2>/dev/null || true)
if [ -n "$TEMP_NAMES" ]; then
    echo -e "${RED}❌ 发现根目录有临时文件：${NC}"
    echo "$TEMP_NAMES"
    echo "请将这些文件移动到 docs/archive/ 或删除"
    VIOLATIONS=$((VIOLATIONS + 1))
else
    echo -e "${GREEN}✅ 未发现临时文件${NC}"
fi

# 统计结果
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $VIOLATIONS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ 根目录检查完全通过！${NC}"
    echo "根目录整洁，符合项目规范。"
    exit 0
elif [ $VIOLATIONS -eq 0 ] && [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  发现 $WARNINGS 个警告${NC}"
    echo "建议修复，但不阻止提交。"
    exit 0
else
    echo -e "${RED}❌ 发现 $VIOLATIONS 个违规项和 $WARNINGS 个警告${NC}"
    echo "请修复违规项后再提交代码。"
    echo ""
    echo "📚 详细规则请查看：docs/DIRECTORY_MANAGEMENT.md"
    exit 1
fi
