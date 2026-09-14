import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3004');
  console.log('Title:', await page.title());
  await browser.close();
}

test().catch(console.error);
