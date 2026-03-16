# Demo-App vs Prod-App — Differences Guide

S4 Ledger maintains two parallel applications that share ~95% of their architecture. This document explains what differs, what's shared, and why both exist.

---

## Why Two Apps?

- **demo-app** — Public-facing demonstration with mock data, walk-through, and simulated wallet. Used for sales demos, trade shows, and evaluations. No real API keys or auth required.
- **prod-app** — Production application with real Supabase auth, ITAR compliance banners, CAC login, and live XRPL anchoring. Used by actual defense program teams.

Both apps are built from the same codebase and deploy together. Every feature or fix is applied to both.

---

## Shared vs Different Files

### Identical Files (14 of 18 JS modules)

These files are byte-identical between both apps and are synced via copy:

| File | Purpose |
|------|---------|
| `brief.js` | Brief Composer tool |
| `enhancements.js` | Fetch wrapper, API helpers, empty states |
| `enterprise-features.js` | LPL, PIS, SCN, Email, DRL, advanced features |
| `metrics.js` | Performance dashboard, Chart.js visualizations |
| `navigation.js` | Tab/panel routing, keyboard shortcuts |
| `onboarding.js` | First-run walk-through flow |
| `registry.js` | Module registry, S4 namespace, error reporter, toast |
| `roles.js` | RBAC role definitions |
| `sanitize.js` | DOMPurify wrapper |
| `session-init.js` | Session initialization |
| `supabase-init.js` | Supabase client setup |
| `walkthrough.js` | Interactive guided tour |
| `wallet-toggle.js` | Wallet balance display toggle |
| `web-vitals.js` | Core Web Vitals tracking + alerts |

**To sync shared files after editing:**
```bash
cp demo-app/src/js/enhancements.js prod-app/src/js/enhancements.js
cp demo-app/src/js/web-vitals.js prod-app/src/js/web-vitals.js
# (same for any other shared file you edit)
```

### Different Files (4 of 18)

| File | Diff Lines | Why Different |
|------|-----------|---------------|
| `engine.js` | ~2,300 | Core logic: demo mode vs production mode (mock data, auth, wallet, element IDs) |
| `acquisition.js` | ~18 | Demo returns 12 hardcoded SCEP rows; prod returns empty (user imports) |
| `milestones.js` | ~24 | Demo returns 18 hardcoded milestone rows; prod returns empty |
| `scroll.js` | ~44 | Different element ID references, reveal animation class names |

---

## Feature Differences

| Feature | Demo-App | Prod-App |
|---------|----------|----------|
| **Demo banner** | Persistent banner showing credits, anchors, wallet address | Not present |
| **ITAR banner** | Not present | CUI/ITAR/export-control warning strip |
| **Authentication** | DoD consent banner only | Full flow: DoD consent → CAC login → onboarding → role selector |
| **Role selector** | Not present | 6 role presets (Admin, Analyst, Auditor, Operator, Viewer, ISSO) |
| **`_demoMode` flag** | Active — suppresses API errors, uses mock wallet | Not present — real API calls throughout |
| **Mock data** | Named personnel (e.g., "QA-237 J. Martinez"), pre-populated records | Placeholder brackets (e.g., `[Inspector Name]`), empty until user creates |
| **SLS balance** | `_demoSession` object, `_updateDemoSlsBalance()` | `window._s4TierAllocation` / localStorage, `_updateSlsBalance()` |
| **SLS notifications** | Suppressed (return early) | Live toast notifications with sanitized values |
| **Wallet label** | "XRPL Mainnet (Demo)" | "XRPL Mainnet" |
| **CSS reveal class** | `.reveal-demo` | `.reveal-anim` |
| **Element ID prefix** | `demo*` (demoWalletExplorer, demoSlsBalance) | No prefix (walletExplorer, walletSLSBalance) |

---

## Build & Config Differences

| Setting | Demo-App | Prod-App |
|---------|----------|----------|
| **Dev server port** | 3001 | 3000 |
| **Base path** | `/demo-app/dist/` | `/prod-app/dist/` |
| **Minifier** | esbuild (Vite default) | terser (preserves `window.*` exports) |
| **Console stripping** | `esbuild: { drop: ['console', 'debugger'] }` | `terserOptions.compress: { drop_console: true }` |
| **API proxy** | Not configured | Proxies `/api` → `https://s4ledger.com` |

---

## Development Rules

1. **Every change applies to both apps** unless it's demo-only UI (banner, walkthrough hero button) or prod-only UI (ITAR banner, CAC login).
2. **Shared files are synced by copying** from demo to prod (or vice versa). There is no symlink or build-time merge.
3. **engine.js is NOT shared** — it has significant demo-mode branching. Changes to engine.js must be made carefully in both files.
4. **Test both builds** after changes: `npm run build` builds both apps.
5. **Check both previews** when doing visual changes:
   ```bash
   python3 preview_server.py 8080
   # http://localhost:8080/demo-app/dist/
   # http://localhost:8080/prod-app/dist/
   ```

---

## When to Change Which App

| If you're adding... | Change in... |
|---------------------|-------------|
| A new ILS tool | Both `engine.js` files |
| A fetch/API helper | `enhancements.js` (shared — copy to both) |
| A new enterprise feature | `enterprise-features.js` (shared — copy to both) |
| Demo walkthrough content | demo-app only |
| ITAR/compliance UI | prod-app only |
| Auth/login flow | prod-app only |
| A new shared utility | Add to the shared file, copy to both apps |
