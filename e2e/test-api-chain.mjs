import { chromium } from 'playwright';

async function testAPIChain() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('=== Step 1: Navigate to app ===');
  await page.goto('https://nanoai.fun');
  console.log('Title:', await page.title());
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  console.log('\n=== Step 2: Check console errors ===');
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });
  
  // Get any cookies/state
  const cookies = await context.cookies();
  console.log('Cookies:', cookies.map(c => c.name).join(', '));
  
  // Check localStorage
  const localStorage = await page.evaluate(() => {
    return {
      token: localStorage.getItem('nanoai_token'),
      userId: localStorage.getItem('nanoai_user_id')
    };
  });
  console.log('LocalStorage:', JSON.stringify(localStorage));
  
  // Try to find login or generation elements
  const html = await page.content();
  console.log('\n=== Step 3: Check page content ===');
  console.log('Page has canvas:', html.includes('canvas') || html.includes('Canvas'));
  console.log('Page has GenerationPanel:', html.includes('Generation') || html.includes('generation'));
  
  // Take screenshot
  await page.screenshot({ path: 'test-screenshot.png' });
  console.log('\nScreenshot saved to test-screenshot.png');
  
  await browser.close();
}

testAPIChain().catch(e => console.error('Error:', e.message));
