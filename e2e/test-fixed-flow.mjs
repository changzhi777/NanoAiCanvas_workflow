import { chromium } from 'playwright';

async function fixedFlow() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('=== Navigate to /nano2 ===');
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  
  // Login
  console.log('=== Login ===');
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
  
  // Enter prompt
  console.log('=== Enter prompt ===');
  await page.fill('textarea', '一个穿着汉服的唐朝少女在花园里赏花');
  await page.waitForTimeout(500);
  
  // Close any modal with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // Click generate button with force
  console.log('=== Click generate ===');
  const generateBtn = page.locator('button:has-text("开始生成")');
  await generateBtn.click({ force: true });
  
  console.log('Waiting for generation...');
  await page.waitForTimeout(10000);
  
  // Check for console errors
  console.log('\nTest completed');
}

fixedFlow().catch(e => console.error('Error:', e.message));
