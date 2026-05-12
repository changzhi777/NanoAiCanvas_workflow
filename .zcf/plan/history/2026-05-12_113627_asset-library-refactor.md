# 资产库全栈重构计划

> 创建时间: 2026-05-12
> 状态: 执行中

## 目标
精简分类为 6 大类 (IMAGE/VIDEO/AUDIO/STORYBOARD_IMAGE/STORYBOARD_VIDEO/TEXT)，
个人/团队分区，展示提示词和生成参数。

## 阶段 A: 后端模型 + 迁移
- A1: AssetCategory 枚举改为 6 值
- A2: Asset.type 字段同步
- A3: Alembic 迁移脚本
- A4: 简化 Category 模型
- A5: assets.py API 适配
- A6: 简化 categories.py/folders.py

## 阶段 B: 前端类型 + API
- B1: 更新类型定义
- B2: 更新 API 客户端
- B3: 简化 store

## 阶段 C: 前端 UI 重构
- C1: 重写侧边栏
- C2: 重写资产卡片
- C3: 资产详情面板
- C4: 移除旧分类管理 UI
- C5: 团队资产区

## 阶段 D: 验证 + 部署
