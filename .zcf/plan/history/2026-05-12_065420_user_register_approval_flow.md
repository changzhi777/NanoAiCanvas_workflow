# 用户注册审批流程检查优化

## 任务
全面检查用户注册→申请→管理员审批流程，修复问题并添加测试

## 计划
1. 修复 approve_user 事务隔离（points失败不影响status）
2. 修复 User 模型默认 status（APPROVED→PENDING）
3. 检查前端 admin API 路径
4. 优化登录错误提示
5. 后端单元测试
