import { chromium } from 'playwright';

async function testGenerate() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('=== Navigate to /nano2 ===');
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  
  // Check login state
  const storage = await page.evaluate(() => ({
    token: localStorage.getItem('nanoai_token'),
    userId: localStorage.getItem('nanoai_user_id')
  }));
  console.log('Login state:', storage);
  
  // If not logged in, we need to login first
  if (!storage.token) {
    console.log('=== Need to login ===');
    // Look for login dialog - it might appear automatically
    await page.waitForTimeout(2000);
    
    // Try to find login form
    const loginVisible = await page.isVisible('text=/登录|login|signin/i');
    console.log('Login form visible:', loginVisible);
    
    // Take screenshot to see current state
    await page.screenshot({ path: 'test-login.png', fullPage: true });
    console.log('Screenshot saved');
  }
  
  // Try to enter prompt and see what happens
  console.log('=== Try entering prompt ===');
  const textarea = await page.locator('textarea').first();
  if (await textarea.isVisible()) {
    await textarea.fill('一个美丽的唐朝少女在花园里赏花');
    console.log('Prompt entered');
    await page.screenshot({ path: 'test-prompt.png', fullPage: true });
  }
  
  await browser.close();
}

testGenerate().catch(e => console.error('Error:', e.message));
