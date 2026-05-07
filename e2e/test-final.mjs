import { chromium } from 'playwright';

async function finalTest() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Error]:`, msg.text().substring(0, 150));
    }
  });
  
  console.log('=== Navigate to /nano2 ===');
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  
  // Press Escape to close any open modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  
  // Click login button (top right)
  console.log('=== Click login button ===');
  const loginBtn = page.locator('button:has-text("登录")').first();
  await loginBtn.click({ force: true });
  await page.waitForTimeout(1000);
  
  // Close any overlay by pressing Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'login-modal.png' });
  
  // Now fill login form
  console.log('=== Fill login form ===');
  // Find all inputs and fill them
  const inputs = await page.locator('input').all();
  console.log('Number of inputs:', inputs.length);
  
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const type = await input.getAttribute('type');
    if (type === 'email' || type === 'text') {
      await input.fill('test@test.com');
    } else if (type === 'password') {
      await input.fill('test123456');
    }
  }
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'form-filled.png' });
  
  // Click submit button
  console.log('=== Submit login ===');
  const submitBtn = page.locator('button[type="submit"], button:has-text("登录")').last();
  await submitBtn.click({ force: true });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'after-submit.png', fullPage: true });
  
  // Check login state
  const storage = await page.evaluate(() => ({
    token: localStorage.getItem('nanoai_token'),
    userId: localStorage.getItem('nanoai_user_id')
  }));
  console.log('Login state:', storage);
  
  await browser.close();
}

finalTest().catch(e => console.error('Error:', e.message));
