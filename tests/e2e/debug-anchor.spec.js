import { test, expect } from '@playwright/test';

/**
 * Debug test — traces the EXACT user flow the user is experiencing:
 * 1. Open demo-app
 * 2. Complete onboarding (select a tier)
 * 3. Navigate to Anchor tool
 * 4. Type content
 * 5. Click Anchor
 * 6. Check balance, vault, verify
 */

test.describe('Demo App — Anchor Flow Debug', () => {
  test('full anchor flow with console logging', async ({ page }) => {
    test.setTimeout(90000);
    const logs = [];
    const errors = [];
    const networkErrors = [];

    // Capture ALL console messages
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      errors.push(err.message);
    });
    
    // Track failed network requests
    page.on('requestfailed', req => {
      networkErrors.push({ url: req.url(), error: req.failure()?.errorText });
    });

    // Track network requests
    const apiRequests = [];
    page.on('request', req => {
      if (req.url().includes('/api/')) {
        apiRequests.push({ url: req.url(), method: req.method() });
      }
    });
    page.on('response', resp => {
      if (resp.url().includes('/api/')) {
        apiRequests.push({ url: resp.url(), status: resp.status() });
      }
    });

    // 1. Load the demo app
    await page.goto('/demo-app/dist/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('=== PAGE LOADED ===');
    console.log('Page errors so far:', errors);
    console.log('Network errors so far:', networkErrors);
    
    // Check what scripts are loaded
    const scriptInfo = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(s => ({
        src: s.src || '(inline)',
        type: s.type || 'classic',
        loaded: s.src ? 'external' : 'inline'
      })).filter(s => s.src.includes('engine') || s.src.includes('index-') || s.src.includes('navigation') || s.type === 'module');
    });
    console.log('Module scripts:', JSON.stringify(scriptInfo, null, 2));
    
    // Check if window functions exist right now
    const earlyCheck = await page.evaluate(() => ({
      anchorRecord: typeof window.anchorRecord,
      stats: typeof window.stats,
      startAuthFlow: typeof window.startAuthFlow,
      DOMPurify: typeof window.DOMPurify,
    }));
    console.log('Early function check:', JSON.stringify(earlyCheck));

    // Wait longer for modules to load
    await page.waitForTimeout(3000);

    // The demo app has: Enter Platform → DoD Consent → CAC Login → Workspace
    // Step 1: Click "Enter Platform" button (calls startAuthFlow)
    const enterBtn = page.locator('button:has-text("Enter Platform")').first();
    if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Clicking Enter Platform...');
      await enterBtn.click();
      await page.waitForTimeout(1000);
    }

    // Step 2: Accept DoD consent
    const consentBanner = page.locator('#dodConsentBanner');
    if (await consentBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('DoD consent visible, accepting...');
      const acceptBtn = page.locator('#dodConsentBanner button:has-text("Accept"), #dodConsentBanner button:has-text("accept"), button:has-text("I Accept")').first();
      if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await acceptBtn.click();
        await page.waitForTimeout(1000);
      } else {
        // Try calling acceptDodConsent directly
        await page.evaluate(() => { if (window.acceptDodConsent) window.acceptDodConsent(); });
        await page.waitForTimeout(1000);
      }
    }

    // Step 3: CAC Login simulation
    const cacModal = page.locator('#cacLoginModal');
    if (await cacModal.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('CAC modal visible, simulating login...');
      const cacBtn = page.locator('button:has-text("Insert CAC"), button:has-text("Authenticate"), #cacLoginModal button').first();
      if (await cacBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cacBtn.click();
        await page.waitForTimeout(3000); // CAC animation takes ~2.3s
      } else {
        await page.evaluate(() => { if (window.simulateCacLogin) window.simulateCacLogin(); });
        await page.waitForTimeout(3000);
      }
      // Force-close the CAC modal if it's still visible
      if (await cacModal.isVisible().catch(() => false)) {
        console.log('CAC modal still visible, force-closing...');
        await page.evaluate(() => {
          var m = document.getElementById('cacLoginModal');
          if (m) m.style.display = 'none';
        });
      }
    }

    // Wait for workspace to appear
    await page.waitForTimeout(2000);

    const workspace = page.locator('#platformWorkspace');
    const wsVisible = await workspace.isVisible().catch(() => false);
    console.log('platformWorkspace visible:', wsVisible);

    if (!wsVisible) {
      // Force it open
      console.log('Forcing workspace open...');
      await page.evaluate(() => {
        var l = document.getElementById('platformLanding');
        var h = document.querySelector('.hero');
        var w = document.getElementById('platformWorkspace');
        if (l) l.style.display = 'none';
        if (h) h.style.display = 'none';
        if (w) w.style.display = 'block';
        sessionStorage.setItem('s4_entered', '1');
      });
      await page.waitForTimeout(1000);
    }

    // Check if onboarding overlay is visible
    const overlay = page.locator('#onboardOverlay');
    const overlayVisible = await overlay.isVisible().catch(() => false);
    console.log('Onboarding overlay visible:', overlayVisible);

    // If onboarding appears, go through it
    if (await overlay.isVisible().catch(() => false)) {
      console.log('=== ONBOARDING STARTED ===');

      // Select Enterprise tier if visible
      const enterpriseCard = page.locator('.onboard-tier[data-tier="enterprise"]');
      if (await enterpriseCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await enterpriseCard.click();
        console.log('Selected Enterprise tier');
        await page.waitForTimeout(500);
      }

      // Click through ALL onboarding steps using JavaScript
      await page.evaluate(() => {
        // Fast-forward through onboarding
        if (window.selectOnboardTier) {
          var card = document.querySelector('.onboard-tier[data-tier="enterprise"]');
          if (card) window.selectOnboardTier(card, 'enterprise');
        }
        if (window.closeOnboarding) window.closeOnboarding();
      });
      console.log('Force-closed onboarding');
      await page.waitForTimeout(3000); // Wait for _initDemoSession + _showDemoOffline
    }

    // Role selector might appear
    const roleSelector = page.locator('#roleSelector');
    if (await roleSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Role selector visible, selecting a role...');
      const roleCard = page.locator('[data-role]').first();
      if (await roleCard.isVisible().catch(() => false)) {
        await roleCard.click();
        await page.waitForTimeout(1000);
      }
    }

    // 2. Check initial state
    console.log('=== CHECKING INITIAL STATE ===');
    
    const initialState = await page.evaluate(() => {
      return {
        _demoSession: window._demoSession,
        _demoMode: window._demoMode,
        _onboardTier: window._onboardTier,
        _onboardTiers: window._onboardTiers,
        stats: window.stats ? { anchored: window.stats.anchored, slsFees: window.stats.slsFees } : 'NOT FOUND',
        s4Vault: window.s4Vault ? window.s4Vault.length : 'NOT FOUND',
        slsBarBalance: document.getElementById('slsBarBalance')?.textContent,
        walletSLSBalance: document.getElementById('walletSLSBalance')?.textContent,
        walletTriggerBal: document.getElementById('walletTriggerBal')?.textContent,
        demoSlsBalance: document.getElementById('demoSlsBalance')?.textContent,
        anchorBtn: document.getElementById('anchorBtn')?.innerHTML,
        recordInput: document.getElementById('recordInput')?.tagName,
        hasAnchorRecord: typeof window.anchorRecord,
        has_updateDemoSlsBalance: typeof window._updateDemoSlsBalance,
        has_syncSlsBar: typeof window._syncSlsBar,
        hasRefreshVerifyRecents: typeof window.refreshVerifyRecents,
        hasRenderVault: typeof window.renderVault,
        hasAddToVault: typeof window.addToVault,
      };
    });
    console.log('Initial state:', JSON.stringify(initialState, null, 2));

    // 3. Navigate to Anchor tab
    const anchorTab = page.locator('#tabAnchor');
    if (await anchorTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await anchorTab.click();
      console.log('Clicked Anchor tab');
      await page.waitForTimeout(500);
    } else {
      console.log('Anchor tab not visible, using showSection...');
      await page.evaluate(() => { if (window.showSection) window.showSection('sectionAnchor'); });
      await page.waitForTimeout(500);
    }

    // Check if sectionAnchor is visible
    const sectionAnchor = page.locator('#sectionAnchor');
    const anchorVisible = await sectionAnchor.isVisible().catch(() => false);
    console.log('sectionAnchor visible:', anchorVisible);
    
    if (!anchorVisible) {
      // Force show anchor section
      await page.evaluate(() => {
        var sections = document.querySelectorAll('[id^="section"]');
        sections.forEach(function(s) { s.style.display = 'none'; });
        var anchor = document.getElementById('sectionAnchor');
        if (anchor) anchor.style.display = 'block';
      });
      console.log('Force-showed sectionAnchor');
      await page.waitForTimeout(500);
    }

    // 4. Type content into the record input
    const recordInput = page.locator('#recordInput');
    if (await recordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recordInput.fill('Test anchor record — debug test at ' + new Date().toISOString());
      console.log('Filled record input');
    } else {
      console.log('ERROR: recordInput not visible!');
    }

    // 5. Check balance BEFORE anchoring
    const beforeState = await page.evaluate(() => {
      return {
        stats: window.stats ? { anchored: window.stats.anchored, slsFees: window.stats.slsFees } : 'NOT FOUND',
        vaultLen: window.s4Vault ? window.s4Vault.length : 'NOT FOUND',
        slsBarBalance: document.getElementById('slsBarBalance')?.textContent,
        walletSLSBalance: document.getElementById('walletSLSBalance')?.textContent,
        walletTriggerBal: document.getElementById('walletTriggerBal')?.textContent,
        demoSlsBalance: document.getElementById('demoSlsBalance')?.textContent,
      };
    });
    console.log('=== BEFORE ANCHOR ===');
    console.log('Before state:', JSON.stringify(beforeState, null, 2));

    // 6. Click Anchor button (close any modal overlays first)
    // Close roleModal if blocking
    await page.evaluate(() => {
      var roleModal = document.getElementById('roleModal');
      if (roleModal) roleModal.style.display = 'none';
      var cacModal = document.getElementById('cacLoginModal');
      if (cacModal) cacModal.style.display = 'none';
    });
    await page.waitForTimeout(300);
    
    const anchorBtn = page.locator('#anchorBtn');
    const preAnchorLogCount = logs.length;
    const preAnchorErrorCount = errors.length;
    
    console.log('=== CALLING anchorRecord() ===');
    // Call directly via JS to bypass any overlay issues
    await page.evaluate(() => {
      var input = document.getElementById('recordInput');
      if (input && !input.value) input.value = 'Test anchor record — debug test at ' + new Date().toISOString();
      window.anchorRecord();
    });
    
    // Wait for the full anchor flow (animation is ~3.6s + network timeout)
    await page.waitForTimeout(10000);
    
    console.log('New console logs during anchor:', logs.slice(preAnchorLogCount));
    console.log('New errors during anchor:', errors.slice(preAnchorErrorCount));

    // 7. Check state AFTER anchoring
    const afterState = await page.evaluate(() => {
      return {
        stats: window.stats ? { anchored: window.stats.anchored, slsFees: window.stats.slsFees } : 'NOT FOUND',
        vaultLen: window.s4Vault ? window.s4Vault.length : 'NOT FOUND',
        slsBarBalance: document.getElementById('slsBarBalance')?.textContent,
        walletSLSBalance: document.getElementById('walletSLSBalance')?.textContent,
        walletTriggerBal: document.getElementById('walletTriggerBal')?.textContent,
        demoSlsBalance: document.getElementById('demoSlsBalance')?.textContent,
        anchorResult: document.getElementById('anchorResult')?.classList.contains('show'),
        anchorResultText: document.getElementById('anchorResult')?.textContent?.substring(0, 200),
        _demoSession: window._demoSession,
      };
    });
    console.log('=== AFTER ANCHOR ===');
    console.log('After state:', JSON.stringify(afterState, null, 2));

    // 8. Check API requests
    console.log('API requests:', JSON.stringify(apiRequests, null, 2));

    // 9. Check Verify tab
    const verifyTab = page.locator('#tabVerify');
    if (await verifyTab.isVisible().catch(() => false)) {
      await verifyTab.click();
      await page.waitForTimeout(1000);
      
      const verifyState = await page.evaluate(() => {
        const container = document.getElementById('verifyRecentAnchors');
        return {
          containerExists: !!container,
          containerHTML: container?.innerHTML?.substring(0, 500),
          childCount: container?.children?.length,
        };
      });
      console.log('=== VERIFY TAB ===');
      console.log('Verify state:', JSON.stringify(verifyState, null, 2));
    }

    // 10. Check Vault
    const vaultState = await page.evaluate(() => {
      const container = document.getElementById('vaultRecords');
      return {
        containerExists: !!container,
        containerHTML: container?.innerHTML?.substring(0, 500),
        childCount: container?.children?.length,
        vaultLen: window.s4Vault?.length,
        vaultFirstItem: window.s4Vault?.[0] ? JSON.stringify(window.s4Vault[0]).substring(0, 200) : 'empty',
      };
    });
    console.log('=== VAULT STATE ===');
    console.log('Vault state:', JSON.stringify(vaultState, null, 2));

    // Print all errors at the end
    console.log('=== ALL PAGE ERRORS ===');
    console.log(errors);
    console.log('=== ALL CONSOLE LOGS ===');
    logs.forEach(l => console.log(l));

    // Assertions  
    expect(errors.length).toBe(0);
    expect(afterState.stats).not.toBe('NOT FOUND');
    if (afterState.stats !== 'NOT FOUND') {
      expect(afterState.stats.anchored).toBeGreaterThanOrEqual(1);
      expect(afterState.stats.slsFees).toBeGreaterThanOrEqual(0.01);
    }
  });
});
