/**
 * 清除 NanoAI Workflow 相关的 localStorage 数据
 * 在浏览器控制台粘贴并执行此脚本
 */

console.log('🧹 开始清除 localStorage...');

// 清除工作流存储
const keysToRemove = [
  'workflow-template-loaded',
  'workflow-force-reload',
  'nanoai-workflow-storage'
];

// 删除指定键
keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ 已清除: ${key}`);
  } else {
    console.log(`⚠️  不存在: ${key}`);
  }
});

// 清除所有相关的 localStorage（可选，谨慎使用）
const allKeys = Object.keys(localStorage);
const workflowKeys = allKeys.filter(key =>
  key.includes('workflow') ||
  key.includes('nanoai') ||
  key.includes('sidebar-collapsed')
);

console.log('🔍 发现的工作流相关键:', workflowKeys);

workflowKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`✅ 已清除: ${key}`);
});

console.log('🎉 清除完成！1秒后自动刷新页面...');

// 1秒后刷新页面
setTimeout(() => {
  location.reload();
}, 1000);
