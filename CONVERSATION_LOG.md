# S4 Ledger — Conversation Log & Fix Tracker
## Last Updated: March 2, 2026

---

## KNOWN CORRECT STATE (verified working)
| Feature | Status | Notes |
|---------|--------|-------|
| Vite 5-chunk build (engine, enhancements, navigation, metrics, index) | ✅ | Both apps |
| Vercel routing: / → prod-app/dist, /demo-app → demo-app/dist | ✅ | vercel.json |
| demo-app/index.html = copy of demo-app/dist/index.html (post-build) | ✅ | buildCommand in vercel.json |
| AI agent hidden on prod-app landing, shown after auth | ✅ | Commit 811a138 |
| No fake API hashes (sha256:a1b2c3d4) in metrics fallback | ✅ | Both apps cleaned |
| SAMPLES in engine.js use bracket placeholders in prod ([Inspector Name]) | ✅ | Intentional template data |
| Web Vitals (LCP, FID, CLS, INP, TTFB) module in both apps | ✅ | S4.vitals namespace |

## ISSUES REPORTED & FIX STATUS
| # | Issue | Reported | Status | Fix Details |
|---|-------|----------|--------|-------------|
| 1 | Logout button doesn't work (demo-app) | Multiple times | ❌ STILL BROKEN | Removed confirm() but resetDemoSession may not be exported or button handler not wired |
| 2 | Dark/light mode toggle doesn't work | Mar 2 | ❌ NOT FIXED | Need to investigate toggle button and handler |
| 3 | Role selector popup doesn't appear | Mar 2 | ❌ NOT FIXED | showRoleSelector() may not be called or exported |
| 4 | MIL-STD references outdated/wrong | Multiple times | ❌ WRONG | Need to check repo docs for correct standards |
| 5 | Tier cards not clickable in onboarding | Multiple times | ❌ STILL BROKEN | Added onclick but may have other issues |
| 6 | Tool formatting/margins off (Gap Analysis etc) | Multiple times | ⚠️ PARTIAL | Fixed Vault/Compliance headers but other tools may still be off |
| 7 | How It Works dropdowns still showing | Multiple times | ⚠️ PARTIAL | Added display:none in HTML but may have missed some or JS overrides |
| 8 | Anchor-S4 / Verify hub order wrong | Multiple times | ❓ NEED VERIFY | Was changed before but need to verify current state |
| 9 | Production enhancements not in demo-app | Mar 2 | ❓ NEED AUDIT | Need comprehensive comparison |

## BUILD PIPELINE CHECKLIST (EVERY CHANGE)
1. Edit source files in `*/src/` directories
2. `cd prod-app && rm -rf dist && npx vite build`
3. `cd demo-app && rm -rf dist && npx vite build`
4. `cp demo-app/dist/index.html demo-app/index.html`
5. Verify fixes in dist output
6. `git add -A && git commit && git push origin main`
7. Vercel auto-deploys from main

## KEY FILE LOCATIONS
- **Demo source HTML**: demo-app/src/index.html
- **Demo navigation JS**: demo-app/src/js/navigation.js
- **Demo engine JS**: demo-app/src/js/engine.js
- **Demo onboarding JS**: demo-app/src/js/onboarding.js
- **Demo roles JS**: demo-app/src/js/roles.js
- **Demo styles**: demo-app/src/styles/main.css
- **Prod source HTML**: prod-app/src/index.html
- **Prod navigation JS**: prod-app/src/js/navigation.js
- **Vite configs**: demo-app/vite.config.js, prod-app/vite.config.js
- **Vercel config**: vercel.json (workspace root)
- **MIL-STD docs**: docs/ directory (check for correct standards)

---
*This log is updated every session. Reference before making changes.*
