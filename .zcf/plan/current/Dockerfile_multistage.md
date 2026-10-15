# 任务：Dockerfile multi-stage

## 计划
| # | 任务 |
|---|------|
| 1 | 改 Dockerfile multi-stage |
| 2 | 新建 .dockerignore |
| 3 | 验证 build test target + build runtime target |
| 4 | 部署 |

## 验收
- test stage 含 tests/ 能跑 pytest
- runtime stage 不含 tests/（镜像小）
