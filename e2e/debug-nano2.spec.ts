import { test, expect } from '@playwright/test';

test('debug nano2 page elements', async ({ page }) => {
  await page.goto('http://localhost:3000/nano2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Get all visible text content to understand what's rendered
  const bodyText = await page.locator('body').innerText();
  console.log('=== PAGE CONTENT ===');
  console.log(bodyText.slice(0, 2000));
  console.log('=== END ===');
  
  // Count key elements
  const buttons = await page.locator('button').all();
  console.log('\nButton count:', buttons.length);
  
  const textareas = await page.locator('textarea').all();
  console.log('Textarea count:', textareas.length);
  
  const images = await page.locator('img').all();
  console.log('Image count:', images.length);
});
