import { chromium } from 'playwright';

async function loginFullDebug() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const responses = [];
  page.on('response', res => {
    responses.push({ url: res.url(), status: res.status() });
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Console Error]: ${msg.text().substring(0, 100)}`);
    }
  });
  
  console.log('=== Navigate ===');
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  
  console.log('=== Open login dialog ===');
  // Click the login button in the header
  const loginBtn = page.locator('button:has-text("登录")').first();
  console.log('Login button visible:', await loginBtn.isVisible());
  await loginBtn.click();
  await page.waitForTimeout(1500);
  
  // Now find the dialog/form
  const dialog = page.locator('input[placeholder="邮箱"]');
  console.log('Email input visible:', await dialog.isVisible());
  
  console.log('=== Fill form ===');
  await page.fill('input[placeholder="邮箱"]', 'newtest@test.com');
  await page.fill('input[placeholder="密码"]', 'test123456');
  
  console.log('=== Submit form ===');
  // Click submit button inside the form/dialog
  const submitBtn = page.locator('button:has-text("登录")').last();
  console.log('Submit button visible:', await submitBtn.isVisible());
  
  // Wait for navigation or response
  await Promise.all([
    page.waitForURL('**/nano2**', { timeout: 10000 }).catch(() => {}),
    submitBtn.click()
  ]);
  
  await page.waitForTimeout(3000);
  
  console.log('\n=== Responses captured ===');
  responses.forEach(r => {
    if (r.url.includes('auth')) {
      console.log(`[${r.status}] ${r.url}`);
    }
  });
  
  const token = await page.evaluate(() => localStorage.getItem('nanoai_token'));
  console.log('\nToken:', token ? '✅ obtained' : '❌ NOT obtained');
  
  if (!token) {
    // Check if there's an error message displayed
    const errorText = await page.locator('text=/错误|失败|invalid/i').isVisible().catch(() => false);
    console.log('Error message visible:', errorText);
  }
  
  await page.screenshot({ path: 'login-full-debug.png' });
  await browser.close();
}

loginFullDebug().catch(e => console.error('Error:', e.message));
