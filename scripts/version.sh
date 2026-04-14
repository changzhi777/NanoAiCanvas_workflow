#!/bin/bash

# 版本管理脚本 - 自动更新修订号
# 作者：外星动物（常智）/ IoTchange
# 用途：每次git推送前自动更新版本号的第三位数字

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取当前版本号
get_current_version() {
    grep '"version":' package.json | sed 's/.*"version": "\(.*\)".*/\1/' | tr -d ','
}

# 更新版本号
update_version() {
    local current_version=$1
    local version_type=$2 # major, minor, or patch

    # 分割版本号
    IFS='.' read -r major minor patch <<< "$current_version"

    case $version_type in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch"|"")
            patch=$((patch + 1))
            ;;
        *)
            log_error "无效的版本类型: $version_type"
            exit 1
            ;;
    esac

    local new_version="${major}.${minor}.${patch}"
    echo "$new_version"
}

# 更新 package.json
update_package_json() {
    local new_version=$1

    log_info "更新 package.json 版本号到 $new_version"

    # 使用 sed 更新版本号
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" package.json
    else
        # Linux
        sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" package.json
    fi

    log_success "package.json 已更新"
}

# 更新 VERSION.md
update_version_md() {
    local new_version=$1
    local changelog_entry=$2

    log_info "更新 VERSION.md"

    # 添加新版本条目
    local date=$(date +%Y-%m-%d)
    local new_entry="## [$new_version] - $date\n\n### 更新内容\n$changelog_entry\n\n"

    # 在第二个标题后插入新版本
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "/^## \[2\.0\.0\]/a\\
\\
$new_entry" VERSION.md
    else
        # Linux
        sed -i "/^## \[2\.0\.0\]/a\\$new_entry" VERSION.md
    fi

    log_success "VERSION.md 已更新"
}

# Git 提交更改
commit_changes() {
    local new_version=$1

    log_info "提交版本更新"

    git add package.json VERSION.md
    git commit -m "chore: bump version to $new_version

- 更新版本号到 $new_version
- 作者: 外星动物（常智）/ IoTchange
- 版权: Copyright (C) 2026 IoTchange - All Rights Reserved"

    log_success "版本更新已提交"
}

# 主函数
main() {
    log_info "========================================="
    log_info "  NanoAiCanvas 版本管理工具 v2.0.1"
    log_info "  作者: 外星动物（常智）/ IoTchange"
    log_info "========================================="
    log_info ""

    # 检查是否在git仓库中
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "当前目录不是git仓库"
        exit 1
    fi

    # 获取当前版本
    local current_version=$(get_current_version)
    log_info "当前版本: $current_version"

    # 确定更新类型
    local version_type=${1:-"patch"}
    log_info "更新类型: $version_type"

    # 生成新版本号
    local new_version=$(update_version "$current_version" "$version_type")
    log_success "新版本号: $new_version"

    # 更新文件
    update_package_json "$new_version"

    # 如果提供了更新日志，则更新VERSION.md
    if [[ -n "$2" ]]; then
        update_version_md "$new_version" "$2"
    else
        update_version_md "$new_version" "- 版本号更新"
    fi

    # 提交更改
    commit_changes "$new_version"

    log_info ""
    log_success "========================================="
    log_success "  版本更新完成！"
    log_success "  新版本: $new_version"
    log_success "========================================="
    log_info ""
    log_info "下一步："
    log_info "1. 查看更改: git log -1"
    log_info "2. 推送到远程: git push"
    log_info "3. 查看版本历史: cat VERSION.md"
    log_info ""
}

# 显示使用说明
show_help() {
    cat << EOF
用法: ./scripts/version.sh [更新类型] [更新日志]

更新类型:
  major   主版本号（不兼容的API修改）
  minor   次版本号（向下兼容的功能性新增）
  patch   修订号（向下兼容的问题修正，默认）

更新日志:
  可选，描述本次更新的内容

示例:
  ./scripts/version.sh patch "修复样式问题"
  ./scripts/version.sh minor "添加新功能"
  ./scripts/version.sh major "重大更新"

版本规则:
  V2.0.1
  │ │ └─ 修订号（PATCH）：每次git推送 +1
  │ └─── 次版本号（MINOR）：功能新增
  └───── 主版本号（MAJOR）：不兼容更新

作者: 外星动物（常智）/ IoTchange
邮箱: 14455975@qq.com
版权: Copyright (C) 2026 IoTchange - All Rights Reserved
EOF
}

# 参数处理
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@"
