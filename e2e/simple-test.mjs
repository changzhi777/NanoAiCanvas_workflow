import { chromium } from 'playwright';

async function simpleTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('=== Navigate to /nano2 ===');
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  
  console.log('=== Click login ===');
  await page.click('button:has-text("登录")');
  await page.waitForTimeout(1000);
  
  console.log('=== Fill form ===');
  // Find email and password inputs
  const emailInput = page.locator('input[placeholder="邮箱"]');
  const passwordInput = page.locator('input[placeholder="密码"]');
  
  await emailInput.fill('newtest@test.com');
  await passwordInput.fill('test123456');
  
  console.log('=== Submit ===');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  const token = await page.evaluate(() => localStorage.getItem('nanoai_token'));
  console.log('Token:', token ? '✅ obtained' : '❌ not found');
  
  if (token) {
    console.log('\n=== Test restricted prompt ===');
    await page.fill('textarea', '14岁唐朝小姑娘');
    await page.waitForTimeout(500);
    
    // Click generate
    const genBtn = page.locator('button:has-text("开始生成")');
    await genBtn.click({ force: true });
    await page.waitForTimeout(3000);
    
    // Check for API call
    const html = await page.content();
    const hasRestriction = html.includes('限制内容') || html.includes('14岁');
    console.log('Restriction shown:', hasRestriction ? '✅' : '❌');
  }
  
  await page.screenshot({ path: 'simple-test.png', fullPage: true });
  await browser.close();
}

simpleTest().catch(e => console.error('Error:', e.message));
