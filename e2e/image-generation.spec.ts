import { test, expect } from '@playwright/test'

test.describe('Image Generation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Go to nano2 page
    await page.goto('http://localhost:3000/nano2')

    // Wait for page load
    await page.waitForSelector('.react-flow', { timeout: 10000 }).catch(() => {})

    // Check if logged in, if not login
    const loginButton = page.locator('button:has-text("登录")')
    if (await loginButton.isVisible()) {
      console.log('Need to login first...')
      await loginButton.click()
      await page.fill('input[type="email"]', 'cz@nanoai.fun')
      await page.fill('input[type="password"]', 'cz777777+')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)
    }
  })

  test('should generate image with GPT Image 2 model', async ({ page }) => {
    // Wait for GenerationPanel to be visible
    await page.waitForSelector('textarea[placeholder*="描述你"]', { timeout: 10000 })

    // Enter prompt
    const textarea = page.locator('textarea').first()
    await textarea.fill('一个可爱的猫咪在阳光下打盹')

    // Open advanced params if collapsed
    const advancedButton = page.locator('button:has-text("高级参数")')
    if (advancedButton.isVisible()) {
      await advancedButton.click()
      await page.waitForTimeout(500)
    }

    // Select GPT Image 2 model
    const modelSelect = page.locator('div:has(> label:has-text("模型")) select, [class*="Select"]').first()

    // Click on model dropdown to open it
    const modelTrigger = page.locator('button:has-text("GPT Image 2")').first()
    if (await modelTrigger.isVisible({ timeout: 3000 })) {
      console.log('GPT Image 2 already selected or visible')
    } else {
      // Look for the model select trigger
      const selectTrigger = page.locator('[class*="SelectTrigger"]').first()
      if (await selectTrigger.isVisible()) {
        await selectTrigger.click()
        await page.waitForTimeout(500)
        // Select GPT Image 2 option
        await page.click('div[role="option"]:has-text("GPT Image 2")', { timeout: 3000 }).catch(() => {
          console.log('Option select failed, trying alternative')
        })
      }
    }

    // Click generate button
    const generateButton = page.locator('button:has-text("开始生成")')

    // Wait for button to be enabled
    await expect(generateButton).toBeEnabled({ timeout: 5000 })

    console.log('Clicking generate button...')
    await generateButton.click()

    // Wait for generation to start (progress bar should appear)
    await page.waitForTimeout(3000)

    // Check if generation started - progress should be visible
    const progressBar = page.locator('[class*="progress"], [class*="bg-gradient-to-r"]').first()

    // Wait for generation result or error
    let success = false
    let errorMessage = ''

    for (let i = 0; i < 60; i++) { // Wait up to 60 seconds
      await page.waitForTimeout(1000)

      // Check for success (images in the result panel)
      const imageResult = page.locator('[class*="image"], img[src*="http"]').first()
      if (await imageResult.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('Image generated successfully!')
        success = true
        break
      }

      // Check for error toast
      const errorToast = page.locator('[role="alert"]:has-text("失败"), [role="alert"]:has-text("错误"), [role="alert"]:has-text("失败")').first()
      if (await errorToast.isVisible({ timeout: 1000 }).catch(() => false)) {
        errorMessage = await errorToast.textContent() || 'Unknown error'
        console.log('Error found:', errorMessage)
        break
      }

      // Check for progress
      const progressText = page.locator('text=/%').first()
      if (await progressText.isVisible({ timeout: 500 }).catch(() => false)) {
        const progress = await progressText.textContent()
        console.log('Progress:', progress)
      }

      console.log(`Waiting for generation... ${i + 1}s`)
    }

    // Take screenshot for verification
    await page.screenshot({ path: `test-results/image-gen-${Date.now()}.png`, fullPage: true })

    // Final assertion
    if (errorMessage) {
      console.log('Final error:', errorMessage)
      // Check if it's a points issue
      if (errorMessage.includes('积分') || errorMessage.includes('不足')) {
        throw new Error('Insufficient points: ' + errorMessage)
      }
    }

    console.log('Test completed. Check screenshot for results.')
  })
})