import { test, expect } from '@playwright/test';

const PROD_URL = '/prod-app/dist/index.html';

/**
 * Verify the walkthrough narrator typewriter and Next button work correctly
 * on Steps 1–3. Regression test for the shared-timer bug where onEnter
 * mock animations would kill the narrator typewriter, preventing the
 * Next button from ever enabling.
 */
test.describe('Walkthrough timer fix – narrator + Next button', () => {

  test('Step 1: narrator text appears and Next becomes clickable', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Start walkthrough
    await page.evaluate(() => { if (window.startWalkthrough) window.startWalkthrough(); });
    await page.waitForTimeout(1000);

    const overlay = page.locator('#s4WalkthroughOverlay');
    await expect(overlay).toBeVisible({ timeout: 5000 });

    // Narrator desc should get text via typewriter
    const desc = overlay.locator('.wt-step-desc');
    await expect(desc).not.toBeEmpty({ timeout: 10000 });

    // Next button should eventually enable (opacity 1, pointer-events auto)
    const nextBtn = overlay.locator('.wt-btn-next');
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).toHaveCSS('pointer-events', 'auto', { timeout: 15000 });
  });

  test('Step 2 (Anchor): narrator text completes and Next enables', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.evaluate(() => { if (window.startWalkthrough) window.startWalkthrough(); });
    await page.waitForTimeout(1000);

    const overlay = page.locator('#s4WalkthroughOverlay');
    await expect(overlay).toBeVisible({ timeout: 5000 });

    // Wait for step 1 Next to be clickable, then advance
    const nextBtn = overlay.locator('.wt-btn-next');
    await expect(nextBtn).toHaveCSS('pointer-events', 'auto', { timeout: 15000 });
    await nextBtn.click();

    // Now on step 2 — verify counter
    const counter = overlay.locator('.wt-step-counter');
    await expect(counter).toHaveText(/Step 2/i, { timeout: 3000 });

    // Narrator text should appear (this was broken before the fix)
    const desc = overlay.locator('.wt-step-desc');
    await expect(desc).not.toBeEmpty({ timeout: 10000 });

    // Next button should re-enable after narrator finishes
    await expect(nextBtn).toHaveCSS('pointer-events', 'auto', { timeout: 15000 });
  });

  test('Step 3 (Confirmation): narrator text completes and Next enables', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.evaluate(() => { if (window.startWalkthrough) window.startWalkthrough(); });
    await page.waitForTimeout(1000);

    const overlay = page.locator('#s4WalkthroughOverlay');
    await expect(overlay).toBeVisible({ timeout: 5000 });

    // Advance through step 1
    const nextBtn = overlay.locator('.wt-btn-next');
    await expect(nextBtn).toHaveCSS('pointer-events', 'auto', { timeout: 15000 });
    await nextBtn.click();

    // Advance through step 2
    await expect(nextBtn).toHaveCSS('pointer-events', 'auto', { timeout: 15000 });
    await nextBtn.click();

    // Now on step 3 — verify counter
    const counter = overlay.locator('.wt-step-counter');
    await expect(counter).toHaveText(/Step 3/i, { timeout: 3000 });

    // Narrator text should appear
    const desc = overlay.locator('.wt-step-desc');
    await expect(desc).not.toBeEmpty({ timeout: 10000 });

    // Next button should re-enable
    await expect(nextBtn).toHaveCSS('pointer-events', 'auto', { timeout: 15000 });
  });
});
