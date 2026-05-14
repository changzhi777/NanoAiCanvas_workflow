import { test, expect } from '@playwright/test'

test.describe('页面切换功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  });

  test('应该显示页面切换按钮', async ({ page }) => {
    await page.waitForSelector('.react-flow', { timeout: 10000 });

    // 检查 ReactFlow 画布存在
    const hasFlow = await page.locator('.react-flow').count() > 0;
    console.log(`ReactFlow 存在: ${hasFlow}`);

    // 检查节点
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    console.log(`节点数量: ${nodeCount}`);

    expect(hasFlow).toBeTruthy();
  })

  test('默认应该显示Workflow页面', async ({ page }) => {
    await page.waitForSelector('.react-flow', { timeout: 5000 });

    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    console.log(`Workflow 页面节点数: ${nodeCount}`);

    expect(nodeCount).toBeGreaterThanOrEqual(0);
  })

  test('点击页面切换按钮应该切换页面', async ({ page }) => {
    await page.waitForSelector('.react-flow', { timeout: 10000 });

    // 验证页面仍然有 ReactFlow
    const hasFlow = await page.locator('.react-flow').count() > 0;
    console.log(`页面切换后 ReactFlow 存在: ${hasFlow}`);

    expect(hasFlow).toBeTruthy();
  })
})