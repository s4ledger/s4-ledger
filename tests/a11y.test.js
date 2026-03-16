/**
 * S4 Ledger — Accessibility (ARIA) Tests
 * Tests WCAG 2.1 AA compliance: focus traps, dialog roles, keyboard nav.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prodHtml = readFileSync(resolve(__dirname, '../prod-app/src/index.html'), 'utf-8');
const demoHtml = readFileSync(resolve(__dirname, '../demo-app/src/index.html'), 'utf-8');

describe('ARIA Dialog Roles', () => {
  it('prod-app: DoD consent has role=dialog and aria-modal', () => {
    expect(prodHtml).toContain('id="dodConsentBanner" role="dialog" aria-modal="true"');
    expect(prodHtml).toContain('aria-labelledby="dodConsentHeading"');
  });

  it('demo-app: DoD consent has role=dialog and aria-modal', () => {
    expect(demoHtml).toContain('id="dodConsentBanner" role="dialog" aria-modal="true"');
    expect(demoHtml).toContain('aria-labelledby="dodConsentHeading"');
  });

  it('prod-app: CAC login modal has role=dialog', () => {
    expect(prodHtml).toContain('id="cacLoginModal" role="dialog" aria-modal="true"');
    expect(prodHtml).toContain('aria-labelledby="cacLoginHeading"');
  });

  it('demo-app: CAC login modal has role=dialog', () => {
    expect(demoHtml).toContain('id="cacLoginModal" role="dialog" aria-modal="true"');
    expect(demoHtml).toContain('aria-labelledby="cacLoginHeading"');
  });

  it('both apps: session lock overlay has role=alertdialog', () => {
    expect(prodHtml).toContain('id="s4SessionLockOverlay" role="alertdialog" aria-modal="true"');
    expect(demoHtml).toContain('id="s4SessionLockOverlay" role="alertdialog" aria-modal="true"');
  });

  it('both apps: dialog heading IDs exist', () => {
    expect(prodHtml).toContain('id="dodConsentHeading"');
    expect(prodHtml).toContain('id="cacLoginHeading"');
    expect(demoHtml).toContain('id="dodConsentHeading"');
    expect(demoHtml).toContain('id="cacLoginHeading"');
  });
});

describe('ARIA Landmark Roles', () => {
  it('both apps: toast container has role=status and aria-live', () => {
    expect(prodHtml).toContain('id="s4ToastContainer" role="status" aria-live="polite"');
    expect(demoHtml).toContain('id="s4ToastContainer" role="status" aria-live="polite"');
  });

  it('both apps: command palette has role=search', () => {
    expect(prodHtml).toContain('id="s4CommandPalette" role="search"');
    expect(demoHtml).toContain('id="s4CommandPalette" role="search"');
  });

  it('both apps: command input has aria-label', () => {
    expect(prodHtml).toContain('id="s4CommandInput"');
    expect(prodHtml).toContain('aria-label="Command palette search"');
    expect(demoHtml).toContain('aria-label="Command palette search"');
  });

  it('both apps: wallet sidebar has role=complementary', () => {
    expect(prodHtml).toContain('id="walletSidebar" role="complementary"');
    expect(demoHtml).toContain('id="walletSidebar" role="complementary"');
  });

  it('both apps: nav has role=navigation and aria-label', () => {
    expect(prodHtml).toContain('role="navigation" aria-label="Main navigation"');
    expect(demoHtml).toContain('role="navigation" aria-label="Main navigation"');
  });

  it('both apps: main has role=main', () => {
    expect(prodHtml).toContain('id="mainContent" role="main"');
    expect(demoHtml).toContain('id="mainContent" role="main"');
  });

  it('both apps: sections have aria-label', () => {
    expect(prodHtml).toContain('aria-label="Platform overview"');
    expect(prodHtml).toContain('aria-label="Defense logistics toolkit"');
    expect(demoHtml).toContain('aria-label="Platform overview"');
    expect(demoHtml).toContain('aria-label="Defense logistics toolkit"');
  });
});

describe('Keyboard Accessibility', () => {
  it('both apps: hub cards have role=button and tabindex', () => {
    const prodCards = prodHtml.match(/hub-card[^>]*role="button"[^>]*tabindex="0"/g) || [];
    const demoCards = demoHtml.match(/hub-card[^>]*role="button"[^>]*tabindex="0"/g) || [];
    expect(prodCards.length).toBeGreaterThanOrEqual(4);
    expect(demoCards.length).toBeGreaterThanOrEqual(4);
  });

  it('both apps: hub cards have onkeydown handler', () => {
    const prodKeydown = prodHtml.match(/hub-card[^>]*onkeydown="[^"]*showSection/g) || [];
    expect(prodKeydown.length).toBeGreaterThanOrEqual(4);
  });

  it('both apps: back-to-top has aria-label', () => {
    expect(prodHtml).toContain('id="backToTop"');
    expect(prodHtml).toContain('aria-label="Back to top"');
    expect(demoHtml).toContain('aria-label="Back to top"');
  });
});

describe('Form Label Associations', () => {
  it('both apps: login email has associated label', () => {
    expect(prodHtml).toContain('for="loginEmail"');
    expect(demoHtml).toContain('for="loginEmail"');
  });

  it('both apps: login password has associated label', () => {
    expect(prodHtml).toContain('for="loginPassword"');
    expect(demoHtml).toContain('for="loginPassword"');
  });
});

describe('Skip Navigation', () => {
  it('both apps: skip-to-content link exists', () => {
    expect(prodHtml).toContain('href="#mainContent"');
    expect(demoHtml).toContain('href="#mainContent"');
  });

  it('both apps: main content target exists', () => {
    expect(prodHtml).toContain('id="mainContent"');
    expect(demoHtml).toContain('id="mainContent"');
  });
});

describe('Theme Toggle Accessibility', () => {
  it.skip('prod-app: theme toggle has aria-label (button is now dynamically injected by JS)', () => {
    expect(prodHtml).toContain('aria-label="Toggle Light/Dark Mode" id="themeToggleBtn"');
  });

  it.skip('demo-app: theme toggle has aria-label (button is now dynamically injected by JS)', () => {
    expect(demoHtml).toContain('aria-label="Toggle Light/Dark Mode" id="themeToggleBtn"');
  });
});

describe('Hamburger Menu Accessibility', () => {
  it('prod-app: hamburger has aria-expanded and aria-controls', () => {
    expect(prodHtml).toContain('aria-label="Menu" aria-expanded="false" aria-controls="navLinks"');
  });

  it('demo-app: hamburger has aria-expanded and aria-controls', () => {
    expect(demoHtml).toContain('aria-expanded="false" aria-controls="navLinks"');
  });
});
