import { chromium } from 'playwright';

async function debugLogin() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Get page HTML to find form elements
  const html = await page.content();
  
  // Look for input fields
  const inputs = await page.locator('input').all();
  console.log('Found', inputs.length, 'input elements');
  for (const input of inputs) {
    const placeholder = await input.getAttribute('placeholder');
    const type = await input.getAttribute('type');
    console.log('  Input:', type, '- placeholder:', placeholder);
  }
  
  // Look for buttons
  const buttons = await page.locator('button').all();
  console.log('Found', buttons.length, 'button elements');
  for (const btn of buttons) {
    const text = await btn.textContent();
    console.log('  Button:', text?.trim().substring(0, 50));
  }
  
  await page.screenshot({ path: 'debug-login.png', fullPage: true });
  
  await browser.close();
}

debugLogin().catch(e => console.error('Error:', e.message));
