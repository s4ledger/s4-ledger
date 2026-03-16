# S4 Ledger — Developer Guide

> **Goal:** Get a new developer productive in under one day.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 18.x LTS | [nodejs.org](https://nodejs.org) |
| npm | >= 9.x | Comes with Node.js |
| Python | >= 3.10 | [python.org](https://python.org) |
| Git | >= 2.x | [git-scm.com](https://git-scm.com) |

Optional (for full E2E testing):
- Playwright: `npx playwright install`

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/s4-systems/s4ledger.git
cd s4ledger

# 2. Install JS dependencies (root workspace)
npm install

# 3. Install Python dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 4. Start demo-app dev server (HMR, port 3001)
cd demo-app && npm run dev

# 5. Or start prod-app dev server (HMR, port 3000)
cd prod-app && npm run dev
```

---

## Repository Structure

```
s4ledger/
├── api/                    # Python serverless API (Vercel)
│   ├── index.py            # ~8,000 lines — all 105+ endpoints
│   └── openapi.json        # OpenAPI 3.0 spec
├── demo-app/               # Demo application (mock data, walk-through)
│   ├── src/
│   │   ├── index.html      # SPA entry point
│   │   └── js/             # ~20 JS modules
│   ├── dist/               # Built output
│   └── vite.config.js
├── prod-app/               # Production application (real API, auth)
│   ├── src/
│   │   ├── index.html      # SPA entry point
│   │   └── js/             # ~20 JS modules (shared structure with demo)
│   ├── dist/               # Built output
│   └── vite.config.js
├── sdk/                    # Python SDK package
├── sdk-playground/         # Browser-based API tester
├── tests/                  # Unit + E2E test suites
├── docs/                   # Documentation
├── supabase/               # Database migrations
├── k8s/                    # Kubernetes manifests
├── monitoring/             # Grafana/Prometheus configs
├── package.json            # Root workspace (lint, test, build)
├── vitest.config.js        # Unit test configuration
├── playwright.config.js    # E2E test configuration
├── eslint.config.js        # Linting rules
└── vercel.json             # Deployment config
```

---

## JavaScript Modules

Both apps share the same module architecture. Each file has a single responsibility:

| Module | Purpose |
|--------|---------|
| `engine.js` | Core app logic — 23 ILS tools, data rendering, API calls (largest file) |
| `enhancements.js` | Fetch wrapper (`_s4Fetch`), API helpers, empty states, UX polish |
| `navigation.js` | Tab/panel routing, keyboard shortcuts (Cmd+K, Cmd+1-6), focus management |
| `enterprise-features.js` | Living Ledger, Impact Simulator, Collaboration, Email, DRL, advanced features |
| `registry.js` | Module registry, global state (`S4` namespace), error reporter, toast system |
| `metrics.js` | Performance dashboard — Chart.js visualizations, AI audit trail |
| `acquisition.js` | Fleet Optimizer / Acquisition Planner tool |
| `milestones.js` | Milestone Monitor tool |
| `brief.js` | Brief Composer tool |
| `web-vitals.js` | Core Web Vitals tracking + threshold alerts + beacon |
| `onboarding.js` | First-run walk-through |
| `roles.js` | RBAC role definitions and permission checks |
| `sanitize.js` | DOM sanitization (DOMPurify wrapper) |
| `scroll.js` | Smooth scrolling + scroll-to-section |
| `session-init.js` | Session initialization, analytics setup |
| `supabase-init.js` | Supabase client initialization |
| `walkthrough.js` | Interactive demo walkthrough (demo-app specific) |
| `wallet-toggle.js` | XRP/SLS wallet balance display toggle |

---

## Build Commands

All commands run from the **workspace root** (`s4ledger/`):

| Command | Description |
|---------|-------------|
| `npm run build` | Build both apps (prod + demo) |
| `npm run build:prod` | Build prod-app only |
| `npm run build:demo` | Build demo-app only |
| `npm run build:sizes` | Build + report bundle sizes (raw + gzip) |
| `npm run lint` | ESLint both apps (zero warnings) |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run ci` | Full CI: lint → test → build |

---

## Testing

### Unit Tests (Vitest)

```bash
npm test              # Run all unit tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

- **28 test files, 1,700+ tests**
- Environment: jsdom
- Coverage thresholds: 40% statements, 55% branches, 35% functions, 40% lines
- Test files: `tests/**/*.test.js`

### Python Tests (pytest)

```bash
pytest -v             # Run all Python tests
pytest -v --tb=short  # Compact output
```

- **73+ tests** covering SDK, API, anchoring, verification
- Tests: `test_*.py` files in root + `tests/` directory

### E2E Tests (Playwright)

```bash
npm run test:e2e      # Run Playwright suite
npx playwright show-report  # View report
```

- **36 E2E specs** across Chromium, Firefox, WebKit
- Requires `npx playwright install` for browser binaries

### Docker Test Runner

```bash
docker build -t s4-tests .
docker run s4-tests          # Runs pytest
```

---

## API Development

The API is a single Python file (`api/index.py`) deployed as a Vercel serverless function.

### Local API Testing

```bash
# Run the Python test server (port 8080)
python3 preview_server.py 8080

# Or use pytest to test API handlers directly
pytest test_sdk.py -v
```

### Key API Patterns

- **Routing:** `_route()` method (line ~1788) dispatches GET/POST to handlers
- **Structured logging:** `_JsonFormatter` → JSON to stdout (Vercel captures this)
- **Request tracking:** Every request gets a `request_id` (12-char hex) and timing
- **Auth:** `_check_auth()` validates `X-API-Key` header against Supabase `api_keys` table
- **XRPL:** `_send_xrpl_tx()` submits memo transactions; `_get_xrpl_client()` manages connection
- **Supabase:** `_sb()` returns the Supabase client (lazy-initialized)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `S4_MASTER_KEY` | Yes | Master API key for admin operations |
| `XRPL_WALLET_SEED` | Yes | XRPL wallet seed for anchoring |
| `OPENAI_API_KEY` | No | For AI chat (OpenAI backend) |
| `ANTHROPIC_API_KEY` | No | For AI chat (Claude backend) |
| `AZURE_OPENAI_KEY` | No | For AI chat (Azure backend) |
| `STRIPE_SECRET_KEY` | No | For payment processing |
| `STRIPE_WEBHOOK_SECRET` | No | For Stripe webhook verification |
| `SENDGRID_API_KEY` | No | For email sending |

---

## Deployment

### Vercel (Production)

```bash
vercel --prod
```

Configuration in `vercel.json`. Both apps deploy as static sites with the API as a serverless function.

### Preview

```bash
# Local preview of built apps
python3 preview_server.py 8080
# Visit:
#   http://localhost:8080/prod-app/dist/
#   http://localhost:8080/demo-app/dist/
```

---

## Development Workflow

1. **Pick a task** from `IMPROVEMENT_CHECKLIST.md` or GitHub issues
2. **Make changes** in the relevant app(s) — both demo-app and prod-app should stay in sync
3. **Sync shared files** — `enhancements.js` and `web-vitals.js` are synced between apps:
   ```bash
   cp demo-app/src/js/enhancements.js prod-app/src/js/enhancements.js
   cp demo-app/src/js/web-vitals.js prod-app/src/js/web-vitals.js
   ```
4. **Build both apps:**
   ```bash
   npm run build
   ```
5. **Run tests:**
   ```bash
   npm test && pytest -v
   ```
6. **Commit with clear message** referencing the checklist item or feature

---

## Coding Conventions

- **No frameworks** — Vanilla JS, no React/Vue/Angular
- **`S4` global namespace** — All shared state lives on `window.S4` (toast, errorReporter, vitals, etc.)
- **DOMPurify** — All user input rendered to DOM goes through `sanitize.js`
- **Strict CSP** — Content Security Policy enforced; no inline scripts in production
- **Both apps move together** — Every feature/fix applies to both demo-app and prod-app
- **Test before commit** — `npm run ci` must pass

---

## Key References

| Document | Path |
|----------|------|
| API Reference | [docs/API_REFERENCE.md](API_REFERENCE.md) |
| API Examples | [docs/api_examples.md](api_examples.md) |
| Architecture | [docs/ARCHITECTURE.md](ARCHITECTURE.md) |
| Troubleshooting | [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| Demo vs Prod | [docs/DEMO_VS_PROD.md](DEMO_VS_PROD.md) |
| Security Policy | [SECURITY.md](../SECURITY.md) |
| Improvement Checklist | [IMPROVEMENT_CHECKLIST.md](../IMPROVEMENT_CHECKLIST.md) |
| Changelog | [CHANGELOG.md](../CHANGELOG.md) |
