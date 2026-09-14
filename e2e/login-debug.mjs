import { chromium } from 'playwright';

async function loginDebug() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Monitor network
  page.on('response', res => {
    if (res.url().includes('auth')) {
      console.log(`[${res.status()}] ${res.url()}`);
    }
  });
  
  console.log('=== Navigate ===');
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  
  console.log('=== Open login dialog ===');
  await page.click('button:has-text("登录")');
  await page.waitForTimeout(1000);
  
  // Get all inputs visible
  const allInputs = await page.locator('input:visible').all();
  console.log(`Found ${allInputs.length} visible inputs`);
  
  for (const input of allInputs) {
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder');
    console.log(`  Input type=${type} placeholder=${placeholder}`);
  }
  
  // Fill using more specific selectors
  console.log('=== Fill inputs ===');
  await page.fill('input[placeholder="邮箱"]', 'newtest@test.com');
  await page.fill('input[placeholder="密码"]', 'test123456');
  
  // Check remember me checkbox
  const rememberCheckbox = page.locator('input[type="checkbox"]').first();
  if (await rememberCheckbox.isVisible()) {
    await rememberCheckbox.click();
  }
  
  console.log('=== Submit ===');
  // Wait for network to settle
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('auth/login'), { timeout: 10000 }).catch(() => null),
    page.click('button[type="submit"]')
  ]);
  
  await page.waitForTimeout(2000);
  
  const token = await page.evaluate(() => localStorage.getItem('nanoai_token'));
  console.log('Token:', token ? '✅' : '❌');
  
  await page.screenshot({ path: 'login-debug.png' });
  await browser.close();
}

loginDebug().catch(e => console.error('Error:', e.message));
