import { chromium } from 'playwright';

async function finalTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  const networkRequests = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  page.on('request', req => {
    if (req.url().includes('prompt-restrictions') || req.url().includes('wuyinkeji')) {
      networkRequests.push({ method: req.method(), url: req.url() });
    }
  });
  
  page.on('response', res => {
    if (res.url().includes('prompt-restrictions')) {
      console.log(`[Response ${res.status()}]: ${res.url()}`);
      const body = res.text();
      body.then(t => console.log(`  Body: ${t.substring(0, 200)}`));
    }
  });
  
  console.log('=== 1. Navigate to /nano2 ===');
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  
  console.log('\n=== 2. Login ===');
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
  
  const token = await page.evaluate(() => localStorage.getItem('nanoai_token'));
  console.log(`Token obtained: ${token ? '✅' : '❌'}`);
  
  console.log('\n=== 3. Test 1: Restricted prompt "14岁唐朝小姑娘" ===');
  await page.fill('textarea', '14岁唐朝小姑娘');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.click('button:has-text("开始生成")', { force: true });
  await page.waitForTimeout(3000);
  
  // Check for toast message
  const toastVisible = await page.locator('text=限制内容').isVisible().catch(() => false);
  console.log(`Restriction detected: ${toastVisible ? '✅' : '❌'}`);
  
  console.log('\n=== 4. Test 2: Safe prompt "唐朝少女赏花" ===');
  await page.fill('textarea', '唐朝少女在花园里赏花');
  await page.waitForTimeout(500);
  await page.click('button:has-text("开始生成")', { force: true });
  await page.waitForTimeout(5000);
  
  // Check if generation was attempted
  const genRequested = networkRequests.some(r => r.url.includes('wuyinkeji'));
  console.log(`Generation API called: ${genRequested ? '✅' : '❌'}`);
  
  console.log('\n=== Summary ===');
  console.log(`Network requests: ${networkRequests.length}`);
  networkRequests.forEach(r => console.log(`  ${r.method} ${r.url.substring(0, 80)}`));
  
  console.log(`\nConsole errors: ${errors.length}`);
  errors.slice(0, 3).forEach(e => console.log(`  ${e.substring(0, 100)}`));
  
  await page.screenshot({ path: 'final-test-result.png', fullPage: true });
  await browser.close();
}

finalTest().catch(e => console.error('Error:', e.message));
