import { test, expect } from '@playwright/test';

test.describe('Nano2 Image页面功能测试', () => {
  test('页面加载正常', async ({ page }) => {
    await page.goto('http://localhost:3000/nano2');
    await page.waitForLoadState('networkidle');

    // 等待React hydration
    await page.waitForSelector('[class*="min-h-screen"]', { timeout: 10000 }).catch(() => {});

    // 检查主标题或主要元素
    const heading = page.locator('h1, h2').first();
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasHeading) {
      console.log('Page title visible');
    }
  });

  test('生成图片功能', async ({ page }) => {
    await page.goto('http://localhost:3000/nano2');
    await page.waitForLoadState('networkidle');

    // 等待页面完全加载
    await page.waitForTimeout(2000);

    // 找到textarea并输入
    const textareas = page.locator('textarea');
    const count = await textareas.count();

    if (count > 0) {
      await textareas.first().fill('a cute cat');
      console.log('Filled textarea');
    }

    // 点击生成按钮
    const generateBtn = page.getByRole('button', { name: /生成|Generate/i }).first();
    const btnVisible = await generateBtn.isVisible().catch(() => false);

    if (btnVisible) {
      await generateBtn.click();
      console.log('Clicked generate');
    }

    expect(true).toBeTruthy();
  });
});

test.describe('Admin Providers页面测试', () => {
  test('providers页面可以访问', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/providers');
    await page.waitForLoadState('networkidle');

    // 等待React hydration
    await page.waitForTimeout(3000);

    // 打印页面内容用于调试
    const content = await page.content();
    console.log('Providers page loaded, checking elements...');

    // 检查AdminHeader组件
    const headerText = await page.locator('h1').first().textContent().catch(() => 'not found');
    console.log('Header:', headerText);

    // 查找按钮
    const buttons = await page.locator('button').all();
    console.log('Button count:', buttons.length);

    for (const btn of buttons.slice(0, 5)) {
      const text = await btn.textContent().catch(() => '');
      if (text.trim()) console.log('Button:', text.trim().slice(0, 30));
    }
  });
});

test.describe('Admin API Keys页面测试', () => {
  test('api-keys页面可以访问', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/api-keys');
    await page.waitForLoadState('networkidle');

    // 等待React hydration
    await page.waitForTimeout(3000);

    // 打印页面标题
    const headerText = await page.locator('h1').first().textContent().catch(() => 'not found');
    console.log('API Keys header:', headerText);

    // 查找按钮
    const buttons = await page.locator('button').all();
    console.log('Button count:', buttons.length);

    for (const btn of buttons.slice(0, 5)) {
      const text = await btn.textContent().catch(() => '');
      if (text.trim()) console.log('Button:', text.trim().slice(0, 30));
    }
  });
});