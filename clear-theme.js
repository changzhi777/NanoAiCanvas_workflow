// 清理主题设置的临时脚本
console.log('清理本地存储的主题设置...');
localStorage.removeItem('nanoai-workflow-theme');
localStorage.removeItem('theme');
localStorage.removeItem('darkMode');
console.log('✓ 主题设置已清除');
console.log('请刷新页面以应用默认深色主题');
