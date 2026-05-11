# 资产库升级 — 团队资产 + 个人资产

## 方案
基于 TeamAsset 关联表，Tab 切换个人/团队资产

## 步骤
1. 后端：GET /assets/team/{team_id} 查团队资产
2. 后端：POST /assets/{id}/share 资产加入团队
3. 后端：DELETE /assets/{id}/team/{team_id} 资产移出团队
4. 前端：API client 新增3个方法
5. 前端：AssetLibraryPanel 加"个人|团队"Tab
6. 前端：资产操作菜单加"分享到团队"
