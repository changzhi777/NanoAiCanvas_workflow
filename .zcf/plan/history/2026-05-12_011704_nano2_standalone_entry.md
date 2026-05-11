# Nano2独立入口

## 目标
Nano2页面作为单独入口 https://nanoai.fun/nano2

## 计划
1. App.tsx 修复 popstate 中 /nano2 → admin-mqtt bug
2. frontend.Dockerfile nginx 添加 /nano2 SPA fallback
3. deploy/nginx-outer.conf 添加 /nano2 location
