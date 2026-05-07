import { chromium } from 'playwright';

async function testFull() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('=== Step 1: Navigate to app ===');
  await page.goto('http://localhost:3000');
  console.log('Title:', await page.title());
  
  // Listen for console messages
  page.on('console', msg => {
    console.log(`[Console ${msg.type()}]:`, msg.text().substring(0, 200));
  });
  
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'local-test-1.png', fullPage: true });
  console.log('Screenshot 1 saved');
  
  // Check localStorage
  const storage = await page.evaluate(() => ({
    token: localStorage.getItem('nanoai_token'),
    userId: localStorage.getItem('nanoai_user_id')
  }));
  console.log('LocalStorage:', storage);
  
  await browser.close();
  console.log('\nTest completed');
}

testFull().catch(e => console.error('Error:', e.message));
