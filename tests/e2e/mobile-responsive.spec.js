import { test, expect } from '@playwright/test';

/**
 * S4 Ledger — Mobile Responsive E2E Tests
 *
 * Validates both prod-app and demo-app render and function correctly
 * on mobile / tablet viewports (iPhone 17, iPad Pro 12.9″).
 *
 * Run:
 *   npx playwright test tests/e2e/mobile-responsive.spec.js
 */

const PROD_URL = '/prod-app/dist/index.html';
const DEMO_URL = '/demo-app/dist/index.html';

const VIEWPORTS = {
  iphone: { width: 393, height: 852, name: 'iPhone 17' },
  ipad:   { width: 1024, height: 1366, name: 'iPad Pro 12.9″' },
};

// ─── Helpers ────────────────────────────────────────────
async function setupPage(page, url, viewport) {
  await page.setViewportSize(viewport);
  page.on('pageerror', () => {});
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
}

async function authToWorkspace(page) {
  const enterBtn = page.locator('button:has-text("Enter Platform")').first();
  if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enterBtn.click();
    await page.waitForTimeout(500);
  }
  const consentBtn = page.locator('#dodConsentBanner button').first();
  if (await consentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await consentBtn.click();
    await page.waitForTimeout(500);
  }
  const cacBtn = page.locator('button:has-text("Authenticate with CAC")').first();
  if (await cacBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cacBtn.click();
    await page.waitForTimeout(3500);
  }
  const overlay = page.locator('#onboardOverlay');
  if (await overlay.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.evaluate(() => {
      const c = document.querySelector('.onboard-tier[data-tier="enterprise"]');
      if (c && window.selectOnboardTier) window.selectOnboardTier(c, 'enterprise');
    });
    await page.waitForTimeout(300);
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => { if (window.onboardNext) window.onboardNext(); });
      await page.waitForTimeout(500);
    }
  }
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const c = document.querySelector('.role-card');
    if (c) c.click();
  });
  await page.waitForTimeout(300);
  const launchBtn = page.locator('button:has-text("Launch Workspace")').first();
  if (await launchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await launchBtn.click();
    await page.waitForTimeout(1500);
  }
}

// ─── PROD-APP × iPhone ─────────────────────────────────
test.describe('Prod-app – iPhone 17', () => {
  const vp = VIEWPORTS.iphone;

  test('landing page renders within viewport', async ({ page }) => {
    await setupPage(page, PROD_URL, vp);
    const hero = page.locator('.hero-section, #landingHero, .landing-hero').first();
    if (await hero.isVisible({ timeout: 3000 }).catch(() => false)) {
      const box = await hero.boundingBox();
      expect(box.width).toBeLessThanOrEqual(vp.width + 1);
    }
    // No horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('auth flow completes on mobile', async ({ page }) => {
    await setupPage(page, PROD_URL, vp);
    await authToWorkspace(page);
    const workspace = page.locator('#workspace, #ilsHub, .ils-hub-grid').first();
    await expect(workspace).toBeVisible({ timeout: 10000 });
  });

  test('ILS Hub tools are accessible', async ({ page }) => {
    await setupPage(page, PROD_URL, vp);
    await authToWorkspace(page);
    await page.waitForTimeout(1000);
    // At least some tool cards should be visible or scrollable-to
    const toolCards = page.locator('.ils-tool-card, .ils-hub-card');
    const count = await toolCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('walkthrough overlay opens and is usable', async ({ page }) => {
    await setupPage(page, PROD_URL, vp);
    // Try starting walkthrough from demo banner or directly
    const tourBtn = page.locator('button:has-text("Watch Demo"), button:has-text("Platform Tour")').first();
    if (await tourBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tourBtn.click();
    } else {
      await page.evaluate(() => { if (window.startWalkthrough) window.startWalkthrough(); });
    }
    await page.waitForTimeout(800);
    const overlay = page.locator('#s4WalkthroughOverlay');
    if (await overlay.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Verify it fits viewport (stacked layout on mobile)
      const box = await overlay.boundingBox();
      expect(box.width).toBeLessThanOrEqual(vp.width + 1);
      // Controls should be visible
      const nextBtn = page.locator('.wt-btn:has-text("Next"), button:has-text("Next")').first();
      await expect(nextBtn).toBeVisible({ timeout: 3000 });
      // Advance one step
      await nextBtn.click();
      await page.waitForTimeout(500);
      // Close walkthrough
      await page.evaluate(() => { if (window.endWalkthrough) window.endWalkthrough(); });
    }
  });

  test('feedback drawer opens and fits screen', async ({ page }) => {
    await setupPage(page, PROD_URL, vp);
    const fbTab = page.locator('#s4FeedbackTab, .fb-tab').first();
    if (await fbTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fbTab.click();
      await page.waitForTimeout(400);
      const drawer = page.locator('#s4FeedbackDrawer, .fb-drawer');
      if (await drawer.isVisible({ timeout: 2000 }).catch(() => false)) {
        const box = await drawer.boundingBox();
        expect(box.width).toBeLessThanOrEqual(vp.width);
      }
    }
  });

  test('no content overflows horizontally', async ({ page }) => {
    await setupPage(page, PROD_URL, vp);
    await authToWorkspace(page);
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});

// ─── PROD-APP × iPad Pro ────────────────────────────────
test.describe('Prod-app – iPad Pro', () => {
  const vp = VIEWPORTS.ipad;

  test('landing page renders correctly', async ({ page }) => {
    await setupPage(page, PROD_URL, vp);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('auth flow completes on tablet', async ({ page }) => {
    await setupPage(page, PROD_URL, vp);
    await authToWorkspace(page);
    const workspace = page.locator('#workspace, #ilsHub, .ils-hub-grid').first();
    await expect(workspace).toBeVisible({ timeout: 10000 });
  });

  test('ILS Hub grid layout is appropriate', async ({ page }) => {
    await setupPage(page, PROD_URL, vp);
    await authToWorkspace(page);
    await page.waitForTimeout(1000);
    const toolCards = page.locator('.ils-tool-card, .ils-hub-card');
    const count = await toolCards.count();
    expect(count).toBeGreaterThan(0);
    // First card should be visible without scrolling
    if (count > 0) {
      await expect(toolCards.first()).toBeVisible();
    }
  });

  test('walkthrough split-screen renders side-by-side', async ({ page }) => {
    await setupPage(page, PROD_URL, vp);
    await page.evaluate(() => { if (window.startWalkthrough) window.startWalkthrough(); });
    await page.waitForTimeout(800);
    const overlay = page.locator('#s4WalkthroughOverlay');
    if (await overlay.isVisible({ timeout: 3000 }).catch(() => false)) {
      // On iPad, container should show side-by-side (narrator + display)
      const narrator = page.locator('.wt-narrator').first();
      const display = page.locator('.wt-display').first();
      if (await narrator.isVisible().catch(() => false) && await display.isVisible().catch(() => false)) {
        const nBox = await narrator.boundingBox();
        const dBox = await display.boundingBox();
        // On tablet width (1024px), they should be side-by-side (narrator left of display)
        expect(nBox.x).toBeLessThan(dBox.x);
      }
      await page.evaluate(() => { if (window.endWalkthrough) window.endWalkthrough(); });
    }
  });
});

// ─── DEMO-APP × iPhone ─────────────────────────────────
test.describe('Demo-app – iPhone 17', () => {
  const vp = VIEWPORTS.iphone;

  test('landing page renders within viewport', async ({ page }) => {
    await setupPage(page, DEMO_URL, vp);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('demo mode auth completes on mobile', async ({ page }) => {
    await setupPage(page, DEMO_URL, vp);
    await authToWorkspace(page);
    await page.waitForTimeout(1500);
    // Should reach workspace or ILS hub
    const workspace = page.locator('#workspace, #ilsHub, .ils-hub-grid').first();
    const visible = await workspace.isVisible({ timeout: 10000 }).catch(() => false);
    expect(visible).toBe(true);
  });

  test('no horizontal overflow after auth', async ({ page }) => {
    await setupPage(page, DEMO_URL, vp);
    await authToWorkspace(page);
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});

// ─── DEMO-APP × iPad Pro ────────────────────────────────
test.describe('Demo-app – iPad Pro', () => {
  const vp = VIEWPORTS.ipad;

  test('landing page and auth work on tablet', async ({ page }) => {
    await setupPage(page, DEMO_URL, vp);
    await authToWorkspace(page);
    const workspace = page.locator('#workspace, #ilsHub, .ils-hub-grid').first();
    await expect(workspace).toBeVisible({ timeout: 10000 });
  });

  test('no horizontal overflow', async ({ page }) => {
    await setupPage(page, DEMO_URL, vp);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
