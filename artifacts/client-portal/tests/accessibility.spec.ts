import { test, expect } from '@playwright/test'
import Axe from 'axe-playwright'

const { AxeBuilder } = Axe

test.describe('Mobile drawer accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('opens the More drawer, traps focus, and announces state changes', async ({ page }) => {
    const moreButton = page.getByRole('button', { name: 'More' })
    await expect(moreButton).toBeVisible()
    await expect(moreButton).toHaveAttribute('aria-controls', 'more-drawer')

    await moreButton.click()
    await expect(moreButton).toHaveAttribute('aria-expanded', 'true')

    const drawer = page.getByRole('dialog', { name: 'More navigation' })
    await expect(drawer).toBeVisible()

    const closeButton = drawer.getByRole('button', { name: 'Close more menu' })
    await expect(closeButton).toBeFocused()

    const lastLink = drawer.locator('a').last()
    await page.keyboard.press('Shift+Tab')
    await expect(lastLink).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
  })

  test('has no Axe accessibility violations when the drawer is open', async ({ page }) => {
    await page.getByRole('button', { name: 'More' }).click()
    const results = await new AxeBuilder({ page }).include('#more-drawer').analyze()
    expect(results.violations).toEqual([])
  })
})
