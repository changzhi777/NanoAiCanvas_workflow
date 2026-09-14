import { chromium } from 'playwright';

async function testTextToImage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to app
  await page.goto('https://nanoai.fun');
  console.log('Page title:', await page.title());
  
  // Take snapshot to see what elements are on page
  const html = await page.content();
  console.log('Has login form:', html.includes('login') || html.includes('登录'));
  
  await browser.close();
  console.log('Test completed');
}

testTextToImage().catch(e => console.error('Error:', e.message));
