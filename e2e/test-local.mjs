import { chromium } from 'playwright';

async function testLocal() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('=== Navigate to local dev server ===');
  await page.goto('http://localhost:3004');
  console.log('Title:', await page.title());
  
  // Listen for console messages
  page.on('console', msg => {
    console.log(`[Console ${msg.type()}]:`, msg.text());
  });
  
  // Wait for page load
  await page.waitForLoadState('networkidle');
  
  // Take screenshot
  await page.screenshot({ path: 'local-test-1.png', fullPage: true });
  console.log('Screenshot saved');
  
  // Check page content
  const html = await page.content();
  console.log('Has login:', html.includes('login') || html.includes('登录'));
  console.log('Has Generation:', html.includes('Generation') || html.includes('生成'));
  
  await browser.close();
}

testLocal().catch(e => console.error('Error:', e.message));
