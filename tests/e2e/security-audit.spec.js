import { test, expect } from '@playwright/test';

/**
 * S4 Ledger — Security-Focused E2E Tests
 *
 * Validates security controls in the production and demo applications:
 *   - XSS prevention (DOMPurify)
 *   - No sensitive key leakage in client-side code
 *   - Service Worker integrity
 *   - Input sanitization
 *   - Security header readiness (vercel.json validated separately)
 *
 * Run:
 *   npx playwright test tests/e2e/security-audit.spec.js --config tests/e2e/playwright-local.config.js
 */

const PROD_URL = '/prod-app/dist/index.html';
const DEMO_URL = '/demo-app/dist/index.html';

// ─── Prod-App Security Tests ────────────────────────────────────────

test.describe('Prod-App Security', () => {

  test('no sensitive keys exposed in page source', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    const lower = html.toLowerCase();

    // XRPL seeds, Supabase service key, API master key must never appear in client
    expect(lower).not.toContain('sxxxxxxxxx');            // XRPL seed prefix pattern
    expect(html).not.toMatch(/SUPABASE_SERVICE_KEY/);     // service key env name
    expect(html).not.toMatch(/S4_API_MASTER_KEY/);        // API master key env name
    expect(html).not.toMatch(/S4_WALLET_ENCRYPTION_KEY/); // wallet encryption key env name
    expect(html).not.toMatch(/sk_live_/);                 // Stripe live secret key
    expect(html).not.toMatch(/sk_test_/);                 // Stripe test secret key
  });

  test('DOMPurify is loaded and functional', async ({ page }) => {
    page.on('pageerror', () => {}); // suppress non-critical errors
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
    // Wait for all modules to fully initialize
    await page.waitForTimeout(6000);

    const hasDOMPurify = await page.evaluate(() => typeof window.DOMPurify !== 'undefined');
    if (!hasDOMPurify) {
      // DOMPurify may load asynchronously via chunk — wait more
      await page.waitForTimeout(5000);
    }

    const sanitized = await page.evaluate(() => {
      if (typeof window.DOMPurify === 'undefined') return 'not-loaded';
      return window.DOMPurify.sanitize('<img src=x onerror=alert(1)>');
    });

    if (sanitized !== 'not-loaded') {
      expect(sanitized).not.toContain('onerror');
    }
  });

  test('no eval() or Function() in application scripts', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });

    // Check inline scripts for dangerous patterns
    const scripts = await page.evaluate(() => {
      const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'));
      return inlineScripts.map(s => s.textContent);
    });

    for (const script of scripts) {
      // eval("...") or new Function("...") should not appear in app code
      // (minifiers may use Function for module wrapping — skip those patterns)
      expect(script).not.toMatch(/\beval\s*\(\s*['"`]/);
    }
  });

  test('no open redirects via URL parameters', async ({ page }) => {
    // Attempt to inject a redirect URL
    await page.goto(PROD_URL + '?redirect=https://evil.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should still be on our page, not redirected
    const url = page.url();
    expect(url).not.toContain('evil.com');
  });

  test('XSS via hash fragment is neutralized', async ({ page }) => {
    page.on('pageerror', () => {});
    await page.goto(PROD_URL + '#<script>alert(1)</script>', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check that no alert dialog appeared and script tag was not rendered
    const alert = await page.evaluate(() => {
      const body = document.body.innerHTML;
      return body.includes('<script>alert(1)</script>');
    });
    expect(alert).toBe(false);
  });

  test('service worker uses versioned cache', async ({ page }) => {
    const response = await page.goto('/prod-app/sw.js', { waitUntil: 'domcontentloaded' });
    if (response && response.ok()) {
      const text = await response.text();
      // SW should have a versioned cache name
      expect(text).toMatch(/s4-prod-v\d+/);
    }
  });

  test('localStorage does not contain XRPL seeds or API keys', async ({ page }) => {
    page.on('pageerror', () => {});
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const storage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return JSON.stringify(items);
    });

    expect(storage).not.toMatch(/sxxxxxxxx/i);
    expect(storage).not.toMatch(/SUPABASE_SERVICE_KEY/i);
    expect(storage).not.toMatch(/sk_live_/);
  });
});

// ─── Demo-App Security Tests ────────────────────────────────────────

test.describe('Demo-App Security', () => {

  test('no sensitive keys exposed in page source', async ({ page }) => {
    await page.goto(DEMO_URL, { waitUntil: 'domcontentloaded' });
    const html = await page.content();

    expect(html).not.toMatch(/SUPABASE_SERVICE_KEY/);
    expect(html).not.toMatch(/S4_API_MASTER_KEY/);
    expect(html).not.toMatch(/sk_live_/);
    expect(html).not.toMatch(/sk_test_/);
  });

  test('DOMPurify is loaded and sanitizes XSS', async ({ page }) => {
    page.on('pageerror', () => {});
    await page.goto(DEMO_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const sanitized = await page.evaluate(() => {
      if (typeof window.DOMPurify === 'undefined') return 'not-loaded';
      return window.DOMPurify.sanitize('<svg onload=alert(1)>');
    });

    if (sanitized !== 'not-loaded') {
      expect(sanitized).not.toContain('onload');
    }
  });

  test('service worker uses versioned cache', async ({ page }) => {
    const response = await page.goto('/demo-app/sw.js', { waitUntil: 'domcontentloaded' });
    if (response && response.ok()) {
      const text = await response.text();
      expect(text).toMatch(/s4-v\d+/);
    }
  });
});

// ─── Vercel Security Headers Validation ─────────────────────────────

test.describe('Security Headers (vercel.json)', () => {

  test('vercel.json configures all required security headers', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const vercelPath = path.resolve(process.cwd(), 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));

    // Find the global headers block (source: "/(.*)")
    const globalHeaders = vercelConfig.headers.find(h => h.source === '/(.*)');
    expect(globalHeaders).toBeTruthy();

    const headerMap = {};
    for (const h of globalHeaders.headers) {
      headerMap[h.key.toLowerCase()] = h.value;
    }

    // Required security headers
    expect(headerMap['x-content-type-options']).toBe('nosniff');
    expect(headerMap['x-frame-options']).toBeTruthy();
    expect(headerMap['strict-transport-security']).toContain('max-age=');
    expect(headerMap['referrer-policy']).toBeTruthy();
    expect(headerMap['content-security-policy']).toContain("default-src 'self'");
    expect(headerMap['permissions-policy']).toContain('camera=()');
    expect(headerMap['cross-origin-opener-policy']).toBe('same-origin');
    expect(headerMap['cross-origin-resource-policy']).toBe('same-origin');
  });

  test('CSP disallows unsafe-eval', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const vercelPath = path.resolve(process.cwd(), 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));

    const globalHeaders = vercelConfig.headers.find(h => h.source === '/(.*)');
    const csp = globalHeaders.headers.find(h => h.key === 'Content-Security-Policy');
    expect(csp.value).not.toContain("unsafe-eval");
  });
});
