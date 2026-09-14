import { chromium } from 'playwright';

async function testFullResult() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  
  page.on('response', res => {
    if (res.url().includes('prompt-restrictions')) {
      console.log(`[Response]:`, res.status(), res.url());
      res.text().then(text => {
        if (text.length < 500) console.log(`  Body:`, text);
      });
    }
  });
  
  console.log('=== Navigate and login ===');
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  
  // Login
  await page.click('button:has-text("登录")');
  await page.waitForTimeout(500);
  
  const inputs = await page.locator('input').all();
  for (const input of inputs) {
    const placeholder = await input.getAttribute('placeholder');
    if (placeholder?.includes('邮箱')) await input.fill('newtest@test.com');
    if (placeholder?.includes('密码')) await input.fill('test123456');
  }
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  console.log('\n=== Test 1: Restricted prompt ===');
  await page.fill('textarea', '14岁唐朝小姑娘');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.click('button:has-text("开始生成")', { force: true });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'restricted-result.png' });
  
  console.log('\n=== Test 2: Safe prompt ===');
  await page.fill('textarea', '一个美丽的唐朝少女在花园里赏花');
  await page.waitForTimeout(500);
  await page.click('button:has-text("开始生成")', { force: true });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'safe-result.png' });
  
  console.log('\n=== Console Messages ===');
  consoleMessages.forEach(m => {
    if (m.type === 'error' || m.text.includes('error') || m.text.includes('Error')) {
      console.log(`[${m.type}]:`, m.text.substring(0, 200));
    }
  });
  
  await browser.close();
}

testFullResult().catch(e => console.error('Error:', e.message));
