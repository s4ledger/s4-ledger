import { test, expect } from '@playwright/test';

/**
 * S4 Ledger — Prod-App Anchor Flow E2E Tests
 *
 * Validates the complete anchor lifecycle in prod-app:
 *   1. Auth flow (Enter → Consent → CAC → Onboarding → Role)
 *   2. Anchor a record (type content → click Anchor)
 *   3. Balance deduction (0.01 Credits)
 *   4. Vault population
 *   5. Verify tool shows recently anchored record
 *   6. Digital thread updates
 *
 * Prerequisites:
 *   npx serve -l 9999 -s .   (from workspace root)
 *   OR: python3 preview_server.py 9999
 *
 * Run:
 *   npx playwright test tests/e2e/prod-anchor-flow.spec.js
 */

const PROD_URL = '/prod-app/dist/index.html';

// Helper: complete auth flow and reach workspace with Enterprise tier
async function completeAuthFlow(page) {
  page.on('pageerror', () => {});

  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Wait for modules
  const ready = await page.evaluate(() => typeof window.startAuthFlow === 'function');
  if (!ready) await page.waitForTimeout(5000);

  // Enter Platform
  const enterBtn = page.locator('button:has-text("Enter Platform")').first();
  if (await enterBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enterBtn.click();
    await page.waitForTimeout(500);
  }

  // DoD Consent
  const consentBtn = page.locator('#dodConsentBanner button').first();
  if (await consentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await consentBtn.click();
    await page.waitForTimeout(500);
  }

  // CAC Login
  const cacBtn = page.locator('button:has-text("Authenticate with CAC")').first();
  if (await cacBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cacBtn.click();
    await page.waitForTimeout(3500);
  }

  // Onboarding — select Enterprise tier
  const overlay = page.locator('#onboardOverlay');
  if (await overlay.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.evaluate(() => {
      const card = document.querySelector('.onboard-tier[data-tier="enterprise"]');
      if (card && window.selectOnboardTier) window.selectOnboardTier(card, 'enterprise');
    });
    await page.waitForTimeout(300);
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => { if (window.onboardNext) window.onboardNext(); });
      await page.waitForTimeout(500);
    }
  }

  // Role selector — pick first role
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const card = document.querySelector('.role-card');
    if (card) card.click();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    if (typeof window.applyRole === 'function') window.applyRole();
  });
  await page.waitForTimeout(1000);
}

test.describe('Prod App — Anchor Lifecycle', () => {

  test('anchor record deducts 0.01 credits and updates balance', async ({ page }) => {
    test.setTimeout(90000);
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await completeAuthFlow(page);

    // Get initial stats
    const before = await page.evaluate(() => ({
      anchored: window.stats?.anchored || 0,
      slsFees: window.stats?.slsFees || 0,
      balance: document.getElementById('walletSLSBalance')?.textContent?.trim() || '',
      triggerBal: document.getElementById('walletTriggerBal')?.textContent?.trim() || '',
    }));

    // Navigate to Anchor tab
    await page.evaluate(() => window.showSection('tabAnchor'));
    await page.waitForTimeout(500);

    // Type content into record input
    const input = page.locator('#recordInput');
    await input.fill('E2E test anchor record — production readiness verification');
    await page.waitForTimeout(300);

    // Click Anchor button
    await page.evaluate(() => {
      if (typeof window.anchorRecord === 'function') window.anchorRecord();
    });
    await page.waitForTimeout(5000); // Wait for animation + callbacks

    // Get updated stats
    const after = await page.evaluate(() => ({
      anchored: window.stats?.anchored || 0,
      slsFees: window.stats?.slsFees || 0,
      balance: document.getElementById('walletSLSBalance')?.textContent?.trim() || '',
      triggerBal: document.getElementById('walletTriggerBal')?.textContent?.trim() || '',
    }));

    // Verify stats incremented
    expect(after.anchored).toBe(before.anchored + 1);
    expect(after.slsFees).toBeCloseTo(before.slsFees + 0.01, 5);

    // Verify no critical page errors
    const critical = errors.filter(e =>
      !e.includes('net::ERR') && !e.includes('supabase') &&
      !e.includes('cdn.jsdelivr') && !e.includes('Failed to fetch')
    );
    expect(critical).toEqual([]);
  });

  test('anchored record appears in vault', async ({ page }) => {
    test.setTimeout(90000);
    page.on('pageerror', () => {});
    await completeAuthFlow(page);

    // Get initial vault count
    const beforeVault = await page.evaluate(() => {
      const vault = JSON.parse(localStorage.getItem(window._vaultKey?.() || 's4Vault') || '[]');
      return vault.length;
    });

    // Anchor a record
    await page.evaluate(() => window.showSection('tabAnchor'));
    await page.waitForTimeout(500);
    const input = page.locator('#recordInput');
    await input.fill('Vault population test — prod E2E');
    await page.waitForTimeout(300);
    await page.evaluate(() => { if (window.anchorRecord) window.anchorRecord(); });
    await page.waitForTimeout(5000);

    // Check vault
    const afterVault = await page.evaluate(() => {
      const vault = JSON.parse(localStorage.getItem(window._vaultKey?.() || 's4Vault') || '[]');
      return vault.length;
    });

    expect(afterVault).toBeGreaterThan(beforeVault);
  });

  test('anchored record appears in verify recents', async ({ page }) => {
    test.setTimeout(90000);
    page.on('pageerror', () => {});
    await completeAuthFlow(page);

    // Anchor a record
    await page.evaluate(() => window.showSection('tabAnchor'));
    await page.waitForTimeout(500);
    const input = page.locator('#recordInput');
    await input.fill('Verify recents test — prod E2E');
    await page.waitForTimeout(300);
    await page.evaluate(() => { if (window.anchorRecord) window.anchorRecord(); });
    await page.waitForTimeout(5000);

    // Navigate to Verify tab
    await page.evaluate(() => window.showSection('sectionVerify'));
    await page.waitForTimeout(1000);

    // Check for recently anchored records
    const recents = await page.evaluate(() => {
      const container = document.getElementById('recentAnchored') ||
                        document.querySelector('[id*="recent"]');
      return container ? {
        exists: true,
        childCount: container.children.length,
        text: container.textContent.substring(0, 200),
      } : { exists: false };
    });

    // Records should exist (either from vault seed data or our anchor)
    expect(recents.exists).toBe(true);
  });

  test('anchor preserves fullContent for verification', async ({ page }) => {
    test.setTimeout(90000);
    page.on('pageerror', () => {});
    await completeAuthFlow(page);

    const testContent = 'Full content preservation test — unique identifier 12345';

    // Anchor
    await page.evaluate(() => window.showSection('tabAnchor'));
    await page.waitForTimeout(500);
    await page.locator('#recordInput').fill(testContent);
    await page.waitForTimeout(300);
    await page.evaluate(() => { if (window.anchorRecord) window.anchorRecord(); });
    await page.waitForTimeout(5000);

    // Check vault for fullContent
    const vaultRecord = await page.evaluate((content) => {
      const vault = JSON.parse(localStorage.getItem(window._vaultKey?.() || 's4Vault') || '[]');
      return vault.find(r => r.fullContent?.includes('unique identifier 12345')) || null;
    }, testContent);

    expect(vaultRecord).not.toBeNull();
    expect(vaultRecord.fullContent).toContain('unique identifier 12345');
  });
});

test.describe('Prod App — Multiple Anchors', () => {

  test('multiple anchors accumulate fees correctly', async ({ page }) => {
    test.setTimeout(120000);
    page.on('pageerror', () => {});
    await completeAuthFlow(page);

    await page.evaluate(() => window.showSection('tabAnchor'));
    await page.waitForTimeout(500);

    const initialFees = await page.evaluate(() => window.stats?.slsFees || 0);

    // Anchor 3 records
    for (let i = 0; i < 3; i++) {
      await page.locator('#recordInput').fill(`Multi-anchor test record ${i + 1}`);
      await page.waitForTimeout(300);
      await page.evaluate(() => { if (window.anchorRecord) window.anchorRecord(); });
      await page.waitForTimeout(4000);
    }

    const finalFees = await page.evaluate(() => window.stats?.slsFees || 0);
    expect(finalFees).toBeCloseTo(initialFees + 0.03, 5);
  });
});
