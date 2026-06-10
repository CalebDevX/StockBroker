# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> Mobile drawer accessibility >> opens the More drawer, traps focus, and announces state changes
- Location: tests\accessibility.spec.ts:12:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/
Call log:
  - navigating to "http://127.0.0.1:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | import Axe from 'axe-playwright'
  3  | 
  4  | const { AxeBuilder } = Axe
  5  | 
  6  | test.describe('Mobile drawer accessibility', () => {
  7  |   test.beforeEach(async ({ page }) => {
> 8  |     await page.goto('/')
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/
  9  |     await page.waitForLoadState('networkidle')
  10 |   })
  11 | 
  12 |   test('opens the More drawer, traps focus, and announces state changes', async ({ page }) => {
  13 |     const moreButton = page.getByRole('button', { name: 'More' })
  14 |     await expect(moreButton).toBeVisible()
  15 |     await expect(moreButton).toHaveAttribute('aria-controls', 'more-drawer')
  16 | 
  17 |     await moreButton.click()
  18 |     await expect(moreButton).toHaveAttribute('aria-expanded', 'true')
  19 | 
  20 |     const drawer = page.getByRole('dialog', { name: 'More navigation' })
  21 |     await expect(drawer).toBeVisible()
  22 | 
  23 |     const closeButton = drawer.getByRole('button', { name: 'Close more menu' })
  24 |     await expect(closeButton).toBeFocused()
  25 | 
  26 |     const lastLink = drawer.locator('a').last()
  27 |     await page.keyboard.press('Shift+Tab')
  28 |     await expect(lastLink).toBeFocused()
  29 | 
  30 |     await page.keyboard.press('Escape')
  31 |     await expect(drawer).toHaveCount(0)
  32 |   })
  33 | 
  34 |   test('has no Axe accessibility violations when the drawer is open', async ({ page }) => {
  35 |     await page.getByRole('button', { name: 'More' }).click()
  36 |     const results = await new AxeBuilder({ page }).include('#more-drawer').analyze()
  37 |     expect(results.violations).toEqual([])
  38 |   })
  39 | })
  40 | 
```