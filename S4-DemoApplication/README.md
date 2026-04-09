# S4 Ledger — Demo Application

Standalone React/TypeScript deliverables tracker for U.S. Navy Data Requirements Lists (DRLs).
Built on XRPL blockchain anchoring, Supabase (Auth + Realtime + Storage), and optional NSERC IDE integration.

## Quick Start

```bash
# Install dependencies
npm ci

# Copy env template and configure
cp .env.example .env
# Edit .env — at minimum set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start dev server (demo mode — uses built-in sample data)
npm run dev

# Start dev server (production mode — loads from Supabase)
npm run dev:prod
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (demo mode) |
| `npm run dev:prod` | Start Vite dev server (production mode) |
| `npm run build` | Type-check + production build |
| `npm run build:prod` | Production-mode build (loads s4-config.json) |
| `npm run preview` | Preview production build locally |
| `npm test` | Run all tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage enforcement |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |

## Tech Stack

- **React 19** + **TypeScript 5.7** (strict mode, `noUnusedLocals`, `noUnusedParameters`)
- **Vite 6** — dev server + build tool with code splitting (`manualChunks`)
- **Tailwind CSS 3** — utility-first styling
- **Supabase** — Auth, PostgreSQL, Realtime (presence + broadcast), Storage
- **XRPL** — Blockchain anchoring for tamper-evident sealing
- **Sentry** — Error tracking, browser tracing, session replay, PII stripping
- **TipTap** — Rich text report editor (18 extensions, lazy-loaded)
- **jsPDF + SheetJS** — PDF/Excel export (lazy-loaded)
- **DOMPurify** — XSS sanitization on all user content
- **web-vitals** — CLS, LCP, FCP, TTFB, INP → Sentry

## Architecture

```
src/
├── App.tsx                     # Root — Auth provider + ErrorBoundary + routing
├── main.tsx                    # Entry — Sentry init + React mount + Web Vitals
├── components/                 # 33 React components
│   ├── DeliverablesTracker.tsx  # Main tracker (2000+ LOC) — table, filters, modals
│   ├── LoginScreen.tsx          # Supabase Auth UI
│   ├── PortfolioDashboard.tsx   # Multi-contract portfolio view
│   ├── ReportExportModal.tsx    # TipTap report editor + PDF/Excel export (lazy)
│   ├── ChatPanel.tsx            # AI + team chat (lazy)
│   ├── AnomalyDashboard.tsx     # Anomaly detection dashboard (lazy)
│   └── ...                      # Modals, sidebar, presence, workflow, etc.
├── utils/                      # 19 pure utility modules
│   ├── aiAnalysis.ts            # Row + portfolio AI analysis, chat response
│   ├── auditTrail.ts            # Immutable audit event log
│   ├── sealedVault.ts           # Tamper-evident sealed record store
│   ├── workflowEngine.ts        # State machine for DRL workflows
│   ├── hash.ts                  # SHA-256 hashing (row sealing)
│   ├── anomalyDetection.ts      # 7 anomaly detection rules
│   └── ...                      # RACI, permissions, PDF, Excel, spreadsheet import
├── services/                   # 7 service modules (external integrations)
│   ├── chatService.ts           # Supabase Realtime chat channels
│   ├── realtimeService.ts       # Presence + collaboration
│   ├── nsercIdeService.ts       # NSERC IDE / PMS 300 sync via Azure AD
│   ├── offlineStore.ts          # Offline queue + IndexedDB persistence
│   └── ...
├── contexts/                   # React context providers
│   └── AuthContext.tsx           # Supabase Auth state
├── config/                     # Runtime configuration
├── data/                       # Static demo/portfolio data
├── lib/                        # Third-party init (Sentry, Supabase client)
└── __tests__/                  # 12 test files, 151 tests
```

## Dual-Mode Configuration

| Mode | Env Var | Behavior |
|---|---|---|
| `demo` (default) | `VITE_APP_MODE=demo` | Uses built-in sample DRL data, simulated users |
| `production` | `VITE_APP_MODE=production` | Loads `s4-config.json`, connects to Supabase + NSERC IDE |

## Environment Variables

See [`.env.example`](.env.example) for all variables. Required for production:

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes (prod) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes (prod) | Supabase anon/public key |
| `VITE_SENTRY_DSN` | No | Sentry error tracking DSN |
| `VITE_AZURE_TENANT_ID` | No | Azure AD tenant for NSERC IDE |
| `VITE_AZURE_CLIENT_ID` | No | Azure AD app registration |
| `VITE_PMS300_SITE_ID` | No | SharePoint site for DRL data |
| `VITE_PMS300_DRL_LIST_ID` | No | SharePoint list ID |

## Testing

```bash
# Run all 151 tests
npm test

# Watch mode
npm run test:watch

# With coverage (thresholds: statements 50%, branches 40%, functions 45%, lines 50%)
npm run test:coverage
```

Test files: 12 suites covering components, utilities, services, and integration scenarios.

## Bundle Optimization

Main bundle: **682 KB** (gzipped: 183 KB). Heavy dependencies are code-split:

| Chunk | Size | Loading |
|---|---|---|
| Main (index) | 682 KB | Immediate |
| xlsx (SheetJS) | 424 KB | Lazy (spreadsheet import) |
| pdf (jsPDF) | 399 KB | Lazy (report export) |
| tiptap | 384 KB | Lazy (report editor) |
| html2canvas | 202 KB | Lazy (report export) |
| Supabase | 160 KB | Immediate |
| DOMPurify | 22 KB | Immediate |

## Security

- **CSP** with strict `script-src`, `connect-src`, `form-action 'self'`
- **Permissions-Policy** denies camera, microphone, geolocation, payment
- **SRI** on external stylesheets (Font Awesome)
- **DOMPurify** sanitizes all user-generated HTML
- **Supabase JWT** + API key auth on serverless endpoints
- **Rate limiting** on API endpoints (30 req/min/IP)

## License

See root [LICENSE](../LICENSE).
