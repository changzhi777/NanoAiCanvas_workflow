import { chromium } from 'playwright';

async function testFixedAPI() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' || text.includes('Error')) {
      console.log(`[Console]:`, text.substring(0, 300));
    }
  });
  
  page.on('request', req => {
    if (req.url().includes('prompt-restrictions')) {
      console.log(`[Request]:`, req.method(), req.url());
    }
  });
  
  page.on('response', res => {
    if (res.url().includes('prompt-restrictions')) {
      console.log(`[Response]:`, res.status(), res.statusText());
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
  
  console.log('\n=== Enter restricted prompt "14岁唐朝小姑娘" ===');
  await page.fill('textarea', '14岁唐朝小姑娘');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  console.log('\n=== Click generate ===');
  await page.click('button:has-text("开始生成")', { force: true });
  
  // Wait and observe
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: 'fixed-result.png', fullPage: true });
  
  await browser.close();
}

testFixedAPI().catch(e => console.error('Error:', e.message));
