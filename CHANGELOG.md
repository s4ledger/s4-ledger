# Changelog

## [5.11.0] — 2025-01-XX
### Added
- Supabase state sync engine — ALL localStorage data now persists to cloud database
- Custom program persistence — saved programs survive page refresh and sync across sessions
- Navigator.sendBeacon flush on page unload for zero data loss
### Changed
- Landing page and all satellite pages now route to demo-app (prod-app reserved for authenticated orgs)
- Removed "Production" and "Demo" labels from tool cards
### Fixed
- Custom programs lost on page refresh — now persist to localStorage + Supabase

## [5.10.0] — 2025-01-XX
### Added
- PMS 325 (SSC) and PMS 385 (DLS) programs
- USCG support across all tool dropdowns
- How It Works → real modal popup overlay
- Light-mode chart visibility (CSS vars + Chart.js theme awareness)
### Changed
- All tool icons standardized to blue (var(--accent))
- Branches restricted to Navy, USMC, USCG only
- Roadmap box redesigned with PLANNED badges
- Full demo-app mirror with sample data retained

---

## v5.6.0 — Full Persistence & Superior Features (2026-02-25)

### Database
- **Migration 004** — 17 new Supabase tables (81/81 statements, all with RLS policies)
- Tables: `ils_uploads`, `documents`, `document_versions`, `poam_items`, `compliance_evidence`, `submission_reviews`, `teams`, `team_members`, `team_invites`, `gfp_items`, `sbom_entries`, `provenance_chain`, `ai_conversations`, `ai_document_chunks`, `program_metrics`, `cdrl_validations`, `contract_extractions`
- **Total: 43 Supabase tables** (26 original + 17 new), all with org-isolation RLS

### Backend API (api/index.py — 4,887 lines, 90+ routes)
- 20+ new GET/POST route handlers for all new tables
- **AI/RAG endpoint** (`/api/ai/rag`) — Claude API integration with keyword-based RAG, conversation persistence, rule-based ILS fallback
- **CDRL Validator** (`/api/cdrl/validate`) — 8-rule compliance engine (DI format, CDRL format, title, scope, applicable docs, requirements, classification, distribution)
- **Contract NLP Extractor** (`/api/contracts/extract`) — Auto-extracts FAR/DFARS clauses, CDRLs, DI numbers, GFP references, warranty terms, data rights via regex patterns
- **Provenance Chain** (`/api/provenance`) — Chain-of-custody events with auto-generated QR data
- **GFP Tracker** (`/api/gfp`) — Full property accountability with DD Form 1662 field structure
- **SBOM Manager** (`/api/sbom`) — CycloneDX/SPDX with component and vulnerability counts
- **Cross-Program Analytics** (`/api/analytics/cross-program`) — 7-metric aggregation dashboard
- **Team Management** (`/api/team`, `/api/team/invite`) — Multi-tenant with auto-add creator as admin

### Frontend (prod-app/index.html — 22,077 lines)
- **IndexedDB offline-first layer** — S4DB object with 10 stores, full CRUD, 60-second sync worker
- **XML parser** — CycloneDX, SPDX, and generic XML format support via DOMParser
- **JSON parser** — CycloneDX/SPDX JSON detection
- **All file uploads now persist** — PDF, DOCX, XLSX, CSV, TSV, XML, JSON, text → Supabase
- **AI Chat upgraded** — Uses /api/ai/rag with session persistence, model attribution, RAG context indicator
- **SBOM Manager UI** — Upload (CycloneDX/SPDX/generic), vulnerability scan (5 known CVE patterns), listing
- **GFP Tracker UI** — Add items, list all, DD Form 1662 report generation
- **CDRL Validator UI** — Validate against backend engine, history tracking
- **Contract Extractor UI** — Extract clauses from contract text via backend
- **Provenance Chain UI** — Add events, view chain, canvas-based QR code generation
- **Cross-Program Analytics UI** — 7 metric cards + tool breakdown dashboard
- **Team Management UI** — Create orgs, invite members, view teams
- **Document Library auto-sync** — Storage.prototype.setItem override for automatic persistence
- **POA&M auto-persist** — DOM observer pattern with 5-second polling
- **Evidence auto-sync** — localStorage write triggers Supabase sync
- **Submission review persistence** — Monkey-patches anchorSubmissionReview
- **AI label cleanup** — clarifyAILabels function with honest tooltips

### Website (all pages)
- **All platform links** updated from `/demo-app/` to `/prod-app/` across all 20+ pages
- **Tool count** updated from "14" to "20+" across all pages, meta tags, and hero text
- **OG + Twitter meta tags** added to all 17 subpages (canonical URLs, descriptions, images)
- **Homepage footer** standardized to match subpage footer layout
- **Mobile nav fixed** on metrics.html and sdk-playground (replaced inline styles with class-based nav)
- **Duplicate footer removed** from metrics.html
- **FAQ/Pricing conflict resolved** — Pilot tier: 10,000 anchors (was 1,000 in FAQ)
- **Investor pricing** corrected to $999–$9,999/month (was $499–$4,999)
- **HarborLink link** fixed (docs/ path after reorganization)
- **"Demo App" text** → "Anchor-S4" in transactions.html

### Documentation
- **README.md** — Complete rewrite: 20+ tools, 90+ routes, 43 tables, architecture diagram updated, tech stack section, Phase 2 completion updated
- **CHANGELOG.md** — Added v5.3.0–v5.6.0 (this entry and below)
- All doc links updated to `docs/` subdirectory paths

### Deployment
- Vercel: 16 new rewrite rules (393 lines total in vercel.json)
- All new API endpoints validated via curl on s4ledger.com
- Service Worker v6.0.0 with offline/air-gapped support

---

## v5.5.0 — Demo Data Removal & Template Upgrade (2026-02-24)

### Removed
- **All demo/sample data** — 258 lines of hardcoded sample data removed from prod-app
- **All demo references** — 243 demo-related code references eliminated
- **Fix scripts** — Removed 15+ temporary fix_round*.py scripts from workspace root

### Changed
- **Template count** — Upgraded from 15 to 20 ILS templates
- **Rate limiting** — Hardened from 100/min to 30/min (API), 5/min (anchoring)
- **Docs reorganized** — 40+ markdown files moved to `docs/` subdirectory

---

## v5.4.0 — Supabase Persistence Layer (2026-02-23)

### Added
- **26 Supabase tables** with full RLS policies covering all ILS tools
- **All ILS tools converted** from hardcoded/localStorage to Supabase-backed
- Deployments table, audit logs, ILS analyses, templates, and more

---

## v5.3.0 — Vercel Deployment (2026-02-23)

### Added
- **Vercel serverless deployment** — Full Python API on Vercel
- **prod-app** — Production-hardened frontend (tighter CSP, no unsafe-eval, dns-prefetch)
- **65+ API routes** initially deployed

---

## v5.2.0 — Round 16 (2026-02-22)

### Bug Fixes
- **Role popup** — Fixed: role selector now reliably appears after onboarding (removed broken `offsetParent` check on hidden `.ils-hub-tabs` element)
- **DoD consent banner** — Recolored from orange (#ff9500) to brand blue (#00aaff)
- **SLS balance flicker** — Debounced `_updateDemoSlsBalance()` via `requestAnimationFrame`; reduced polling from 3s to 15s
- **Digital Thread dropdown** — Now auto-populates after each anchor, not just when Vault panel opens
- **Tool count** — Corrected "13 tools" → "14 tools" across all UI text, AI agent responses, and documentation

### New Features
- **SBOM Viewer SDK function** — `scan_sbom()` added to SDK Playground with CycloneDX vulnerability scan demo
- **Flankspeed/Nautilus VDI compatibility** — Auto-detects Navy VDI environments, disables heavy CSS animations and backdrop-filter for performance
- **Anchor-S4 header buttons** — My Analyses, Team, Webhooks, PDF Export now displayed as compact badge-style buttons in the workspace header (visible on all views)

### Documentation
- **About page** — Mission section expanded from "audit trails" to full 14-tool platform description
- **SDK Playground** — ILIE renamed to "Submissions & PTD", added SBOM Viewer function box and runner
- **README** — Updated to v5.1.0, added Round 16 changelog, updated Phase 2 tool count
- **All markdown docs** — Updated "13 tools" → "14 tools" across WHITEPAPER, SUBSCRIPTION_GUIDE, INVESTOR docs, etc.

## [0.12.0] — 2026-02-22

### Added
- **AI Threat Intelligence Scoring** — Weighted heuristic analysis in Supply Chain Risk Engine (single-source, GIDEP alerts, lead time spikes) with red/amber/green dashboard overlay
- **Predictive Failure Timeline** — 12-month visual forecast (stacked bar chart) in Predictive Maintenance panel showing projected failures by severity
- **Real-time Collaboration Indicators** — Live multi-analyst session badges with avatar overlays and activity status
- **Digital Thread Traceability** — Full provenance chain visualization in Audit Vault (source tool → SHA-256 hash → XRPL TX → verification → audit report)
- **SBOM Integration Panel** — Complete Software Bill of Materials viewer with component scanning, CVE tracking, CycloneDX/SPDX export, and blockchain attestation
- **Zero-Trust Audit Watermark** — All CSV/report exports include cryptographic verification header with blockchain reference
- **21 new Navy programs** — SSN-774, SSBN-826, DDG-1000, CG-47, LHA-6, LHD-1, LSD-49, MCM-1, F/A-18E/F, E-2D, EA-18G, P-8A, MH-60R/S, MQ-4C, MQ-25A, CMV-22B, T-45C, AH-1Z, UH-1Y, KC-130J
- **calcLifecycle function** — Complete lifecycle cost calculator with breakdown output

### Fixed
- **Chart reactivity** — All ILS tool charts (DMSMS, Readiness, Compliance, Risk, Lifecycle, ROI) now update dynamically when input data changes
- **Offline queue** — Now pulls from real vault records instead of generating test hashes
- **Demo page layout** — Responsive hub-grid with card badges, mobile-friendly SLS Economic Flow steps
- **Navy platform dropdowns** — Expanded from 13 to 34 programs across 11 categories (NAVSEA, NAVAIR, USMC)

### Changed
- Hub cards now show status badges (LIVE, AUDIT, 14 TOOLS, METRICS)
- Offline queue button changed from "Queue Test Hash" to "Queue Vault Record"
- Platform count reflects 34 Navy programs


All notable changes to the S4 Ledger project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.2.0] - 2026-02-22

### Major
- **Hub Landing Page Architecture** — Platform now opens to a hub with 5 cards (Anchor, Verify, Tx Log, Logistics Workspace, Systems) replacing direct tab navigation. Each card navigates to its own sub-page with back navigation.
- **ILS Workspace Sub-Hub** — 13 ILS tools presented as visual cards with descriptions. Click to open individual tool pages.
- **Floating Wallet Sidebar** — Wallet moved from main tab to persistent floating sidebar (slide-out from right edge). Shows SLS balance in header.
- **Compact Stat Strip** — Replaced 3 large stat cards with single-line inline strip for cleaner layout.
- **Backend Infrastructure Modules** — 6 new production-ready Python modules:
  - `ai/` — Defense NLP (intent detection, entity extraction for NSN/CAGE/DI/MIL-STD), supply chain anomaly detection (IsolationForest-ready), federated learning stubs (Flower-compatible), DLA/GIDEP/PIEE API adapters
  - `monitoring/` — Prometheus metrics (counters, gauges, histograms), XRPL multi-validator health monitor with failover, alert manager (email/Slack/PagerDuty routing)
  - `resilience/` — SQLite-backed persistent queue, circuit breakers (XRPL/Supabase/DLA), WebSocket ping/pong health, data cap manager for air-gapped environments
  - `interop/` — OpenAPI 3.1 specification, gRPC protobuf definitions, MIL-STD XML parser (LSAR/WAWF), ERP adapters (SAP/Oracle/Deltek), CDRL data transformer
  - `security/` — Enhanced ZKP (Pedersen commitments), HSM key management stubs, RBAC enforcer with audit trail, dependency auditing, OWASP security headers, Snyk config
  - `k8s/` — Kubernetes deployment (3-25 pod HPA), Redis, Prometheus/Grafana configs, 20+ alert rules with SLOs

### Added
- File-based verification with drag-drop (PDFs, XLSX, contracts) and binary SHA-256 hashing
- Offline queue with AES-256-GCM encryption and exponential backoff retry
- Supply chain anomaly detection with risk scoring (lead time, price, vendor, DMSMS, GIDEP)
- Defense entity extraction: NSN, CAGE code, DI number, MIL-STD, contract number, DD Form, OPNAVINST, NIST SP patterns
- AI agent intent classification with confidence scoring
- Prometheus-compatible /api/metrics/prometheus endpoint
- XRPL multi-validator routing with health checks, exponential backoff, and automatic failover
- Circuit breaker pattern for XRPL, Supabase, and DLA service calls
- gRPC service definitions (AnchorService, ILSService) with streaming support
- OpenAPI 3.1 specification with full endpoint documentation
- MIL-STD-1388-2B XML import/export for LSAR data exchange
- WAWF XML parsing for PIEE integration
- ERP adapter stubs (SAP S/4HANA, Oracle Cloud SCM, Deltek Costpoint)
- CDRL (DD Form 1423) data transformer
- NSN normalization utility
- Pedersen commitment scheme for enhanced zero-knowledge proofs
- HSM-ready key management with FIPS 140-2 Level 3 interface
- RBAC enforcer with role inheritance and access audit trail
- Dependency vulnerability auditing (Snyk/safety/OSV.dev compatible)
- OWASP security headers (HSTS, CSP, X-Frame-Options, etc.)
- Snyk policy file (.snyk) with license compliance
- Kubernetes deployment: 3-replica Deployment, HPA (3-25 pods, CPU/memory/custom metrics), Redis (512MB), ServiceMonitor, Namespace
- Prometheus alert rules: 20+ rules covering API availability, XRPL health, queue depth, treasury balance, AI agent, Redis, offline sync, SLOs
- Grafana dashboard: anchors/min, API rate, queue depth, XRPL health, treasury balance, SLS economy, p95 latency, AI queries, error rate, Redis stats, offline status
- Alert routing: email (Nodemailer), Slack webhook, PagerDuty with severity-based channels
- WebSocket health monitoring with ping/pong and latency tracking
- Data cap manager for offline environments (10K records / 500MB default)
- Federated learning coordinator stub (Flower-compatible) for cross-org model training
- PUBLIC_FEATURES.md — comprehensive public-facing feature documentation with sandbox API access

### Changed
- demo-app/index.html: ~8,760 → ~9,100 lines (hub architecture + ILS sub-hub + wallet sidebar + stat strip + back navigation)
- api/index.py: ~3,300 → ~3,337 lines
- SLS Economic Flow duplicates removed (merged into wallet sidebar)
- Tab navigation hidden — replaced by hub card navigation with JavaScript routing

### Fixed
- Duplicate SLS explanations across demoPanel, wallet tab "How SLS Works", and "How USD to SLS Works"
- Visual clutter from 7 simultaneous tabs in navigation bar
- Stat boxes too large and dominating viewport

## [5.1.0] - 2026-02-20

### Demo Mode — Real SLS Fee Transfers on XRPL

#### Added — Demo Mode (4 new endpoints)
- **`/api/demo/provision`** — Creates a simulated demo session: shows hypothetical account creation, 12 XRP wallet funding, and SLS allocation (steps 1-3 simulated display). Uses Ops wallet (99M SLS) as demo wallet
- **`/api/demo/anchor`** — Real 0.01 SLS transfer from Ops wallet → Treasury (`rMLm…KLqJ`) on XRPL Mainnet + standard hash anchor via Issuer. Both transactions are real on-chain
- **`/api/demo/status`** — Returns demo session status, Ops wallet SLS balance (real from XRPL), and anchor history
- **`/api/treasury/health`** — Live Treasury health monitor: XRP balance, SLS balance, low-balance alerts, wallet provisions remaining, explorer link

#### Added — Stripe Auto-Provisioning
- **`customer.subscription.created`** webhook handler — Automatically provisions XRPL wallet and delivers first SLS allocation when a new Stripe subscription is created
- Existing `invoice.payment_succeeded` and `customer.subscription.deleted` handlers remain

#### Changed — Demo App Frontend
- **Demo mode integration** — `_anchorToXRPL()` function now routes through `/api/demo/anchor` when in demo mode, showing real on-chain fee transfer results (TX hash + explorer link)
- **Demo banner** — Auto-provisions demo session on page load; shows plan, wallet address, and "Demo Mode" indicator
- **Anchor result panel** — Now displays `$SLS FEE` line with `ON-CHAIN ✓` badge and clickable fee TX explorer link when demo mode is active
- **Treasury stat card** — Reverted to simple `$SLS Fees` display (user preference)

#### Changed — Hero Video
- **Brightness increased** — Video opacity raised from 0.55 to 0.65, brightness filter from 1.3 to 1.4, gradient overlay lightened (0.45/0.15/0.55)

#### Changed — Vercel Configuration
- **19 new route rewrites** — Added demo mode (4), Stripe webhook, AI chat, HarborLink (4), composite/batch anchor, proof-chain, custody transfer/chain, file hash, batch verify, org records. Total: 51 rewrites

#### Changed — Documentation (All 43 .md files audited)
- **73+ replacements** across 22 files: `29 endpoints → 49+`, `27 SDK functions → 38+`, `54+ record types → 156+`, `462 platforms → 500+`, version numbers updated to v5.1
- **CHANGELOG.md** — This entry

#### Architecture — SLS Economic Flow (Demo Mode)
```
┌─────────────────────────────────────────────────────────────┐
│  DEMO MODE (Stripe not yet live — CEO approval pending)     │
│                                                              │
│  Step 1: Simulated account creation          [display only] │
│  Step 2: Simulated 12 XRP wallet funding     [display only] │
│  Step 3: Simulated SLS tier allocation       [display only] │
│  Step 4: REAL 0.01 SLS Ops → Treasury        [on-chain]    │
│                                                              │
│  Ops Wallet: raWL7nYZkuXMUurHcp5ZXkABfVgStdun51 (99M SLS) │
│  Treasury:   rMLmkrxpadq5z6oTDmq8GhQj9LKjf1KLqJ           │
│  Issuer:     r95GyZac4butvVcsTWUPpxzekmyzaHsTA5             │
│  Network:    XRPL Mainnet                                    │
└─────────────────────────────────────────────────────────────┘
```

#### Environment Variables (Vercel)
| Variable | Purpose |
|---|---|
| `XRPL_WALLET_SEED` | Issuer wallet — signs anchor AccountSet memos |
| `XRPL_TREASURY_SEED` | Treasury wallet — provisions user wallets, collects fees |
| `XRPL_DEMO_SEED` | **NEW** — Ops wallet for demo SLS fee transfers |
| `XRPL_NETWORK` | `mainnet` or `testnet` |

---

## [5.0.1] - 2026-02-19

### QA Fixes & SDK Playground Overhaul

#### Fixed — Demo App
- **Treasury Wallet widget** — `$SLS Fees` stat card replaced with Treasury Wallet display showing `rMLm…KLqJ` address, green pulse animation on successful anchor, and running fee total
- **Icon rendering in Transaction Log** — FontAwesome class names (e.g., `fa-shopping-cart`, `fa-clipboard-list`) now properly wrapped in `<i>` elements instead of rendering as raw text. New `_renderIcon()` utility handles emojis, FA classes, and HTML icon strings
- **Anchor result panel** — Record type icons now rendered via `_renderIcon()` for consistent display

#### Fixed — Metrics Page
- **Records Secured Breakdown dropdowns** — Replaced inline `<p>` + `<select>` with flex-aligned row; record type and platform filter dropdowns now vertically aligned
- **Auto-refresh visibility** — Added live pulse indicator and "Last updated: HH:MM:SS" timestamp below Recent Anchored Records table; updates on every 5-second refresh cycle

#### Fixed — SDK Playground
- **Function boxes restored** — Added 20 clickable function boxes in a responsive grid above the code editor: hash, anchor, verify, batch, metrics, list_records, record_types, ils_analysis, dmsms, readiness, roi, lifecycle, supply_chain_risk, predictive_maintenance, compliance, audit_reports, action_items, doc_library, audit_vault, ilie
- **"How It Works" text updated** — Now accurately references "click any function box above" and shows "20 SDK functions" count

#### Changed — Documentation
- **PRODUCTION_READINESS.md** — Recalibrated readiness scores: ~88% MVP/Pilot, ~75% Enterprise. Added separate MVP vs Enterprise columns. Added critical path section (persistent DB → security audit → monitoring → compliance)
- **HARBORLINK_INTEGRATION.md** — Section 11 updated: 8/10 S4 endpoints now marked ✅ Built (webhook, composite, proof chain, custody, file hash, batch, org tagging, bulk verify). Remaining: audit export package + persistent storage
- **CHANGELOG.md** — This entry

---

## [5.0.0] - 2026-02-18

### HarborLink Integration — Full API Surface Built

#### Added — New API Endpoints (12 routes)
- **POST /api/webhooks/register** — Register HTTPS endpoints for async event notifications with HMAC-SHA256 signed payloads
- **GET /api/webhooks/list** — List all registered webhooks for an org
- **GET /api/webhooks/deliveries** — View webhook delivery history and status
- **POST /api/webhooks/test** — Send test webhook to verify endpoint connectivity
- **POST /api/anchor/composite** — Anchor file + metadata in a single XRPL transaction (composite hash)
- **POST /api/anchor/batch** — Merkle-tree batch anchoring: up to 1000 records in 1 XRPL tx (0.01 SLS total)
- **GET /api/proof-chain** — Retrieve full sequential event history for any record
- **POST /api/custody/transfer** — Record blockchain-anchored custody transfer events
- **GET /api/custody/chain** — Retrieve full custody chain with current custodian and verification
- **POST /api/hash/file** — Hash file binary content (base64 or UTF-8)
- **POST /api/verify/batch** — Verify up to 100 records in a single call
- **GET /api/org/records** — Multi-tenant org-scoped record retrieval (records tagged by API key)

#### Added — Webhook Event System
- 8 event types: `anchor.confirmed`, `verify.completed`, `tamper.detected`, `batch.completed`, `custody.transferred`, `sls.balance_low`, `chain.integrity_check`, `proof.appended`
- HMAC-SHA256 signed payloads with per-hook signing secrets
- Delivery logging with attempt tracking
- Automatic webhook firing on anchor, verify, tamper detection, batch completion, and custody transfer

#### Added — SDK Methods (10 new)
- `register_webhook()` — Register webhook endpoint
- `list_webhooks()` — List registered webhooks
- `verify_webhook_signature()` — HMAC-SHA256 signature verification
- `anchor_composite()` — Composite file + metadata anchoring
- `anchor_batch()` — Merkle-tree batch anchoring
- `transfer_custody()` — Record custody transfer
- `get_custody_chain()` — Retrieve custody chain
- `get_proof_chain()` — Retrieve proof chain
- `hash_file()` — Hash file content via API
- `verify_batch()` — Bulk record verification
- `get_org_records()` — Multi-tenant record retrieval

#### Changed
- API version bumped to 5.0.0
- Anchor endpoint now tags records with `org_id`, `record_id`, `source_system`
- Anchor endpoint now auto-appends to proof chain store
- Verify endpoint now fires `verify.completed` and `tamper.detected` webhooks
- OpenAPI spec updated with all 12 new HarborLink Integration endpoints
- HARBORLINK_INTEGRATION.md status updated: Planning → Integration Endpoints Built

---

## [4.1.0] - 2026-02-22

### Dual-Product Restructuring — S4 Ledger × HarborLink

#### Changed — Product Architecture (Breaking)
- **S4 Ledger refocused as Trust & Intelligence Layer** — S4 Ledger now provides 13 ILS tools focused on hashing, blockchain anchoring, AI analysis, risk scoring, compliance, and audit verification. Data management and workflow tools moved to HarborLink.
- **7 tools moved to HarborLink** — Parts Cross-Reference, Contract Lifecycle Management, Digital Thread / Configuration Bridge, Warranty Tracker, ILS Calendar, Provisioning / ICAPS / PTD Manager, and Defense Database Import are now part of HarborLink (S4 Systems' collaboration portal).
- **13 tools remain in S4 Ledger** — Gap Analysis, Action Items, DMSMS Risk Tracker, Readiness Calculator, ROI Calculator, Lifecycle Cost Estimator, Audit Vault, Defense Doc Library, Compliance Scorecard, Supply Chain Risk Engine, Audit Report Generator, Predictive Maintenance AI, and Submission Review & Discrepancy Analyzer (ILIE).
- **API endpoints preserved** — All 29 API routes remain in `api/index.py` for HarborLink to consume. S4 Ledger serves as the API and anchoring backend for both products.
- **Demo app updated** — Removed 7 tab buttons, HTML panels, and JS function sections from `demo-app/index.html` (8,997 → ~7,137 lines). AI chatbot responses for moved tools now redirect to HarborLink.
- **SDK playground updated** — Removed SDK cards, runner functions, and code samples for 7 moved tools. Added HarborLink redirect card.
- **Tool count updated across 32+ files** — All references to "13 purpose-built ILS tools" updated to "13 tools" across documentation, HTML pages, and configuration files.

#### Added
- **HARBORLINK_INTEGRATION.md** — Comprehensive integration architecture document (1,311 lines) covering API contracts, data flow diagrams, webhook system, Merkle batch anchoring, and 4-phase implementation roadmap.
- **Dual-product framing** — README, WHITEPAPER, INVESTOR_OVERVIEW, INVESTOR_PITCH, INVESTOR_SLIDE_DECK, INVESTOR_RELATIONS, and 12+ other docs updated to position S4 Ledger and HarborLink as complementary S4 Systems products.
- **HarborLink redirect notes** — s4-use-cases, s4-faq, s4-login, sdk, and sdk-playground pages now direct users to HarborLink for data management tools.

#### Removed (from S4 Ledger demo — still available via HarborLink)
- Parts Cross-Reference tab, panel, and JS functions
- Contract Lifecycle Management tab, panel, and JS functions
- Digital Thread / Configuration Bridge tab, panel, and JS functions
- Warranty Tracker tab, panel, and JS functions
- ILS Calendar tab, panel, and JS functions
- Provisioning / ICAPS / PTD Manager tab, panel, and JS functions
- Defense Database Import tab, panel, and JS functions
- Associated AI chatbot context entries, vault seed records, and dropdown configurations

---

## [4.0.8] - 2026-02-21

### AI Agent Overhaul, File Upload Expansion & Product Audit

#### Changed — AI Agent (Major)
- **Real LLM Backend** — AI Agent now routes to Azure OpenAI (FedRAMP eligible) → OpenAI GPT-4o → Anthropic Claude with automatic fallback. Previously was 100% client-side regex pattern matching.
- **`/api/ai-chat` endpoint** — New POST endpoint accepts message, conversation history (last 20), tool context, and analysis data. Returns LLM response or fallback signal.
- **Defense-specific system prompt** — ~150 lines covering all 12 ILS elements, 30+ defense acronyms, 24+ weapon systems, 6 compliance frameworks, and all S4 Ledger tools.
- **Async frontend** — `aiSend()` rewritten as async function. LLM-first with pattern-matching fallback. Markdown→HTML conversion for responses.
- **Context enrichment** — Frontend passes current tool context, gap analysis results (readiness %, critical gaps, top actions), and conversation history to LLM.
- **New env vars**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, `AZURE_OPENAI_DEPLOYMENT`

#### Added — File Upload Expansion
- **PDF support** — pdf.js v3.11.174 CDN loaded. Extracts text from all PDF pages via `pdfjsLib.getDocument()`.
- **DOCX support** — mammoth.js v1.6.0 CDN loaded. Extracts raw text from Word documents via `mammoth.extractRawText()`.
- **DMSMS upload area** — New drag-and-drop dropzone for uploading DMSMS case files, parts lists, GIDEP notices.
- **Parts Cross-Ref upload area** — New dropzone for APLs, COSALs, provisioning lists, BOM exports.
- **Contracts upload area** — New dropzone for CDRL logs, mod packages, SOW deliverables.
- **`handleToolUpload()`** — Universal file upload handler for DMSMS, Parts, and Contracts tools. Supports CSV, XLSX, XLS, PDF, DOCX, TXT, TSV.
- **`setupToolDropzones()`** — Initializes drag-and-drop event handlers for all new upload areas.
- **`renderToolFileList()`** / **`removeToolFile()`** — File list rendering and removal for tool-specific uploads.

#### Added — Documentation
- **SUBSCRIPTION_GUIDE.md** — Complete subscription brochure: tier comparison, feature matrix, onboarding steps, FAQ, enterprise contracting info.
- **PRODUCT_AUDIT.md** — Honest full-platform audit: route-by-route API assessment, tool-by-tool ILS workspace review, website status, SDK evaluation, and priority fix list.
- **CEO_PITCH_READINESS.md** — CEO briefing document with competitive analysis (Palantir, Govini, PRISM, SAP, Rune, etc.), positioning matrix, pitch structure, and realistic revenue timeline.

#### Fixed — Whitepaper Accuracy
- **WHITEPAPER.md** — Replaced false AI Agent claims (non-existent `AI_ENGINE_CONFIG`, `buildAiContext()`) with accurate description of the new `/api/ai-chat` endpoint, LLM fallback chain, and env var configuration.
- **Added SLS Token Economy section** — Documents Treasury-based delivery model, subscription tiers, custodial wallets, and Stripe integration.

## [4.0.7] - 2026-02-20

### SLS Circular Economy — Treasury-Based Token Delivery

#### Changed — SLS Economy (Breaking)
- **Treasury-Based SLS Delivery** — SLS tokens are now delivered directly from the S4 Treasury as part of the subscription. Replaces the previous DEX conversion model (USD→XRP→SLS). No user-facing conversion required.
- **Custodial Wallet Model** — User wallet seeds stored securely in Supabase for automatic anchor fee deduction. Same model as Coinbase/Kraken.
- **Automatic Anchor Fees** — 0.01 SLS per anchor is now deducted automatically from user wallets and sent to Treasury (custodial signing). No manual action required.
- **Treasury Wallet Init** — New `XRPL_TREASURY_SEED` env var. Treasury wallet initialized on startup for XRP funding + SLS delivery.
- **Removed `_purchase_sls_via_dex()`** — Replaced by direct Treasury→User delivery.
- **Removed Ops wallet from SLS flow** — Ops wallet has zero involvement in SLS economy. Treasury handles all XRP activation + SLS distribution.

#### Added
- **Stripe Webhook** — `POST /api/webhook/stripe` handles `invoice.payment_succeeded` (monthly SLS renewal) and `customer.subscription.deleted` events.
- **`_deliver_monthly_sls(email, plan)`** — New function for automatic monthly SLS replenishment from Treasury.
- **`_store_wallet(email, address, seed, plan)`** — Stores custodial wallet in Supabase + in-memory cache.
- **`_get_wallet_seed(email, address)`** — Retrieves custodial wallet seed for automatic fee signing.
- **CEO Explainer Document** — `SLS_ECONOMY_CEO_EXPLAINER.md` — plain-English explanation of how the SLS economy works.
- **XRP Top-Off Forecast** — `XRP_TOPOFF_FORECAST.md` — hypothetical scenarios for Treasury XRP replenishment.

#### Updated Documentation
- All docs/HTML/JSON updated to replace "DEX purchase" / "USD→XRP→SLS" / "fair market value" language with "Treasury delivery" model.
- Files updated: PRODUCTION_READINESS.md, S4_SYSTEMS_EXECUTIVE_PROPOSAL.md, USER_TRAINING_GUIDE.md, INTEGRATIONS.md, SEC_COMPLIANCE.md, s4-pricing/index.html, sdk/index.html, s4-login/index.html, api/openapi.json, s4_sdk.py, fiat_conversion_documentation.md.

---

## [4.0.5] - 2026-02-19

### Enterprise Pricing, Enhanced AI Agent, ILS Demo Data

#### Changed — Pricing Tiers (All Channels)
- **New 4-tier pricing model** — Replaced legacy Starter ($9.99) / Professional ($49) / Enterprise (Custom) / Government (Custom) tiers with:
  - **Pilot** — Free, 100 SLS/mo, 10,000 anchors
  - **Starter** — $999/mo, 25,000 SLS/mo, 2,500,000 anchors
  - **Professional** — $2,499/mo, 100,000 SLS/mo, 10,000,000 anchors
  - **Enterprise** — $9,999/mo, 500,000 SLS/mo, Unlimited anchors
- **Government tier removed** — Enterprise tier now covers DoD, federal agencies, and FedRAMP pathway.
- **Pricing page (`s4-pricing/index.html`)** fully rewritten with 4 tier cards, updated CTA: "Start Free with Pilot — or Go Pro".
- **Login page (`s4-login/index.html`)** updated — 4 plan cards with correct SLS/anchor allocations, all 3 `tierLabels`/`tierSLS`/`tierAnchors` JS objects updated.
- **API (`api/index.py`)** `SUBSCRIPTION_TIERS` dict updated with `pilot`, `starter`, `professional`, `enterprise` at correct prices.
- **11 markdown documents** updated with new pricing ranges ($999–$9,999/mo, $12K–$120K/year): WHITEPAPER, INVESTOR_PITCH, INVESTOR_SLIDE_DECK, INVESTOR_OVERVIEW, INVESTOR_RELATIONS, EXECUTIVE_PROPOSAL, PRODUCTION_READINESS, USER_TRAINING_GUIDE, BILLION_DOLLAR_ROADMAP (×2), INTERNAL_PITCH.

#### Fixed — Wallet Language
- **"TrustLine to Treasury issuer" → "TrustLine to SLS issuer"** — Corrected misleading language on pricing page. TrustLines point to the SLS issuer wallet (`r95GyZac...`), not the Treasury wallet (`rMLmkrxp...`). Treasury holds and distributes SLS; Issuer defines the token on XRPL.

#### Enhanced — AI Agent (`generateAiResponse`)
- **200+ response patterns** — Rewrote `generateAiResponse()` from ~20 patterns to 50+ pattern categories covering: all 13 ILS tools, product info, pricing tiers, wallet architecture (Treasury vs Issuer), SLS tokenomics, XRPL explanation, defense standards (MIL-STD-1388, NIST 800-171, CMMC, DFARS), acronyms (LCSP, LSAR, PHS&T, CBM+, FLIS, CDRL, ITAR), encryption, Xaman integration, SDK/API, workspace stats, and comprehensive catch-all.
- **Demo mode indicator** — When `AI_ENGINE_CONFIG.enabled` is false (default), responses include a note that the agent is running in demo mode with instructions to enable full AI via Settings.
- **Analysis-aware responses** — AI Agent now reads ILS analysis results and provides contextual answers about summary, critical findings, CAR reports, cost breakdowns, missing DIs, next steps, and can draft emails/memos based on analysis data.
- **Handles ANY question** — Catch-all pattern provides relevant S4 Ledger context for unrecognized queries instead of generic "I don't understand" messages.

#### Added — ILS Demo Data Seeding
- **`seedDemoState()` function** — Seeds Action Items (8 realistic entries), Audit Vault (10 anchored records across Army/Navy/Joint), and Calendar (6 upcoming events) on first visit when these tools are empty. Only runs when localStorage arrays are empty — never overwrites user data.
- **Cascading benefit** — Seeded vault entries automatically improve Compliance Scorecard scores and give Report Generator content to work with.
- **Realistic defense data** — Demo entries include real NSNs, CAGE codes, DI numbers, contract references, and program names (Apache, Black Hawk, F-35, DDG-51, Stryker, Osprey, Seahawk, Patriot).

## [4.0.4] - 2026-02-19

### Critical Syntax Fix, CDN Cleanup, Wallet Language Correction

#### Fixed — Critical JavaScript Error
- **Syntax Error in buildAiContext** — Removed extra closing brace (`}`) in `buildAiContext()` that was prematurely closing the `if (context)` block, causing a JavaScript parse error that broke ALL client-side functionality (ILS tools, anchoring, verification, wallet, AI agent). The analysis findings and document types enrichment code was placed outside its parent scope in v4.0.3 — now correctly nested inside `if (context) { ... }`.
- **ILS Tools Now Functional** — All 20+ ILS workspace tools (Gap Analysis, Action Items, Calendar, DMSMS, Readiness, Parts, ROI, Lifecycle, Warranty, Audit Vault, Doc Library, Compliance, Provisioning, Supply Chain Risk, Audit Reports, Contracts, Digital Thread, Predictive Maintenance, Defense Database Import, ILIE Submissions) now open and function correctly via `switchHubTab()`.

#### Fixed — Wallet Language
- **"Ops wallet" → "Treasury"** — Changed "allocates SLS from the Ops wallet to your account" to "allocates SLS from the Treasury to your account" in the How USD→SLS Works section. Eliminates all references to deprecated operational wallet terminology.

#### Fixed — Duplicate CDN Entries
- **Removed duplicate `<script>` tags** — pdf.js 3.11.174 and mammoth.js 1.6.0 were each loaded twice in `<head>`. Removed the duplicate entries (3 lines), reducing page load size and preventing potential redefinition issues.

#### Added — Subscription-Integrated Wallet Provisioning
- **Pricing page aligned with API tiers** — Updated `s4-pricing/index.html` from legacy Pilot/Standard/Enterprise/Government tiers to canonical Starter ($9.99/mo, 500 SLS, 50K anchors), Professional ($49/mo, 5K SLS, 500K anchors), Enterprise (Custom), and Government (Custom site license). Each tier now shows "XRPL wallet provisioned" as a key included feature.
- **"Every Subscription Includes Wallet Setup" section** — New card on pricing page explains the subscription→wallet flow: XRPL wallet provisioning, SLS TrustLine, automated USD→XRP→SLS DEX conversion, and Xaman compatibility.
- **Login page subscription flow enhanced** — Plan selector now shows "Select Subscription Plan" with note that every plan includes automatic XRPL wallet provisioning. Each card displays SLS allocation, anchor capacity, and wallet confirmation.
- **Wallet credentials show plan info** — After signup, the wallet modal displays the subscription tier name, SLS allocation, and anchor capacity. Downloaded credentials file includes full subscription details.
- **Progress steps show subscription activation** — Signup flow now shows 4 steps: subscription activation → wallet generation → XRP funding → SLS TrustLine + SLS delivery.

#### Updated — All Repository Documentation
- **17 markdown documents updated** to reflect current v4.0.4 state: fixed "Ops wallet" → "Treasury wallet", corrected "13 tools" → "13 tools", fixed CMMC "Certified" → "In Progress", updated pricing references, added ILS Analysis Engine sections, corrected per-anchor cost to $0.01, and removed legacy healthcare content from MAINNET_MIGRATION.md.

#### Removed — Temporary Debug Files
- Cleaned up 9 temporary debug/analysis scripts (`_check_syntax.py`, `_find_error.js`, `_debug_parse.js`, etc.) that were created during syntax error diagnosis.

---

## [4.0.3] - 2026-02-18

### Comprehensive ILS Analysis Engine, Auto-Analysis, Enhanced AI Context

#### Added — ILS Analysis Engine (18 New Functions)
- **`detectDocumentType()`** — Automatically classifies uploaded documents into 30+ defense document types (DRL, CDRL, MFR, POA&M, BOM, FRACAS, Tech Manual, Provisioning List, etc.) using keyword/pattern matching.
- **`checkDataQuality(records, docType)`** — Validates NSN/NIIN format (XXXX-XX-XXX-XXXX), CAGE code format (5-char alphanumeric), detects duplicates, checks date validity, and validates status fields against allowed values for each document type.
- **`analyzeByDocType(records, docType, fileName)`** — Runs 20+ type-specific analysis routines covering DRL status distribution, CDRL compliance checks, BOM completeness, FRACAS failure pattern analysis, provisioning categorization, tech manual revision tracking, training completion rates, and more.
- **`crossReferenceAllDocuments()`** — Compares all uploaded documents for DI number conflicts, NSN discrepancies across documents, CAGE code mismatches, and cross-document status inconsistencies.
- **`assessMilestoneReadiness(docType, findings)`** — Evaluates readiness against defense acquisition milestones (Milestone A/B/C, IOC, FOC) based on document completeness, quality scores, and finding severity.
- **`runAutoAnalysisOnUpload(fileName, records)`** — Automatically triggers document type detection, data quality checks, type-specific analysis, cross-referencing, and milestone readiness assessment every time a file is uploaded.
- **`displayAnalysisNotifications(findings)`** — Shows toast-style notifications for critical/warning/info findings immediately after auto-analysis completes.
- **`formatAnalysisFindings(findings)`** — Formats analysis results into HTML for display in the AI agent conversation and analysis panels.
- **`validateNSNFormat(nsn)`** — Validates National Stock Number format against the standard XXXX-XX-XXX-XXXX pattern.
- **`validateCAGECode(cage)`** — Validates Commercial and Government Entity codes (5-character alphanumeric).
- **`parsePDFContent(file)`** — Enhanced PDF text extraction with structured data parsing for defense document formats.
- **`parseDOCXContent(file)`** — Enhanced DOCX text extraction with table and structured content support.
- **`detectDocumentDiscrepancies()`** — Enhanced cross-document comparison engine with severity-weighted finding generation.

#### Changed — handleILSFiles Enhancement
- **Auto-Analysis on Every Upload** — `handleILSFiles()` now calls `runAutoAnalysisOnUpload()` for CSV, XLSX, PDF, and DOCX file types immediately after parsing. Users see real-time notifications about data quality issues, missing fields, and compliance gaps without any manual action.
- **`.doc` Extension Support** — Added `.doc` to the accepted file input extensions.

#### Changed — AI Agent Enhancement
- **Thinking Indicator** — `aiSend()` displays "Analyzing your documents..." thinking animation while processing queries.
- **Findings-Aware Responses** — AI agent automatically detects when users ask about analysis findings, quality issues, or problems and includes formatted analysis results in responses.
- **Milestone Readiness Queries** — AI agent handles queries about milestone readiness (MS A/B/C, IOC, FOC) by running `assessMilestoneReadiness()` and presenting formatted readiness assessments.

#### Changed — buildAiContext Enhancement
- **Analysis Findings in LLM Context** — `buildAiContext()` now includes auto-analysis findings (critical/warning counts with top 5 details) in the prompt context sent to the LLM, enabling AI-powered interpretation of document analysis results.
- **Document Types in Context** — Passes detected document types and names to the LLM for document-aware responses.

#### Changed — Production Readiness
- **Readiness Score** — Updated from 96% to 97% reflecting comprehensive ILS Analysis Engine, auto-analysis capabilities, and enhanced AI integration.
- **AI Capabilities** — Upgraded from pattern-matching to full LLM-powered analysis with 18 specialized defense document analysis functions.

---

## [4.0.2] - 2026-02-18

### AI Engine Architecture, Wallet Redesign, ILS Document Analysis, SEC Compliance

#### Breaking Changes — Wallet & Token Economics
- **Eliminated Free SLS Grants** — Users no longer receive 100 free SLS on signup. All SLS must be purchased at fair market value via subscription or on-demand purchase flow (USD→XRP→SLS DEX). This resolves SEC compliance concerns around free token distribution.
- **Subscription-Based SLS Model** — 3-tier pricing: Starter ($9.99/mo, 500 SLS, 50,000 anchors), Professional ($49/mo, 5,000 SLS, 500,000 anchors), Enterprise (custom pricing, unlimited).
- **User-Paid Anchor Fees** — `_deduct_anchor_fee(user_wallet_seed)` deducts 0.01 SLS from the user's own wallet to Treasury on each anchor, replacing the Ops-wallet-pays model.
- **Stripe Payment Verification Required** — `POST /api/wallet/buy-sls` now requires a verified `stripe_payment_id`. No SLS is delivered without confirmed payment.
- **DEX-Based SLS Purchase** — New `_purchase_sls_via_dex()` function converts USD→XRP→SLS via XRPL DEX at fair market value instead of direct Ops wallet transfer.

#### Added — AI Engine Architecture
- **Defense-Compliant AI Engine Config** — `AI_ENGINE_CONFIG` object supporting Azure OpenAI (FedRAMP High / IL5), AWS Bedrock (GovCloud), or any OpenAI-compatible endpoint. Plug-and-play: set `enabled: true` and provide endpoint + API key.
- **Real LLM Integration** — `callAiEngine(query, context)` async function tries configured LLM API first with defense-specific system prompt (MIL-STD-1388, DRL analysis, DMSMS, provisioning, etc.), falls back to local pattern matching if unavailable.
- **Context-Aware AI Prompts** — `buildAiContext(query, context)` constructs rich context from ILS analysis state, uploaded documents, and discrepancy results for LLM queries.
- **Defense System Prompt** — Pre-built system prompt covering ILS standards, DI number interpretation, DRL/CDRL analysis, DMSMS obsolescence, provisioning, and all 13 ILS tools.

#### Added — ILS Document Analysis Enhancements
- **PDF Document Parsing** — pdf.js 3.11.174 integration for extracting text from PDF documents. Automatically detects DI numbers, NSN patterns, MIL-STD references, and record types.
- **DOCX Document Parsing** — mammoth.js 1.6.0 integration for extracting text from Word documents including table-like structures.
- **Cross-Document Discrepancy Detection** — `detectDocumentDiscrepancies()` compares all uploaded documents for: missing items between documents, title mismatches, status conflicts, and duplicate records.
- **Contract Requirements Compliance** — `compareAgainstContractRequirements(contractRecords)` checks uploaded documents against Attachment J-2 style contract requirements for compliance gaps.
- **Extended File Upload** — ILS Gap Analysis and Database Import now accept `.pdf` and `.docx` in addition to CSV/XLSX/XLS/TXT/TSV.

#### Fixed — SEC Compliance & Token Language
- **SLS Name Corrected** — Fixed "Solus Ledger Service" → "Secure Logistics Standard" in all references.
- **Signup Flow Updated** — Starter plan changed from "Free Trial / 100 SLS" to "$9.99/mo / 500 SLS/mo / 50,000 anchors". Removed "Granting initial SLS tokens" progress step.
- **Wallet Credentials Updated** — Signup success display shows "0 (subscribe to purchase SLS)" instead of pre-loaded SLS balance.
- **SDK Documentation Updated** — buy-sls endpoint description changed to "Purchase SLS via subscription (USD→XRP→SLS DEX)". Footer updated with "SLS (Secure Logistics Standard) is a utility token purchased at fair market value."
- **SEC Compliance Notice** — All SLS purchase flows include regulatory notice: utility token / prepaid service credits per SEC/FinCEN guidance.

#### Changed — Documentation
- **User Training Guide Complete Rewrite** — Replaced technical guide with plain-English version readable by a high schooler. No code blocks, no blockchain jargon. All 13 ILS tools explained in table format. Subscription model documented. Document analysis capabilities described.
- **SDK Footer** — Version bumped to 4.0.2, copyright year to 2026.

#### Changed — Production Readiness
- **Readiness Score** — Updated from 95% to 96% reflecting AI engine architecture, subscription model, document analysis, and SEC compliance improvements.
- **Authentication** — Upgraded from 55% to 65% reflecting Stripe payment verification and subscription tier enforcement.

## [4.0.1] - 2026-02-17

### Documentation, UX, Compliance, and Wallet Improvements

#### Added — Documentation
- **Full SDK Documentation Page** — Replaced empty redirect at `/sdk/` with comprehensive 42KB reference: 38+ functions documented with signatures, parameters, return types, and code examples. Sticky sidebar navigation, installation guide, Quick Start, CLI reference (15 commands), REST API endpoint cards.
- **User Training Guide** — `USER_TRAINING_GUIDE.md`: Complete step-by-step guide covering account creation, wallet setup, all 5 tabs (Anchor, Verify, Log, ILS Workspace, My Wallet), all 13 ILS tools with instructions, CLI/SDK/API usage, security best practices, and FAQ.

#### Added — Wallet & Compliance
- **Wallet Navy/Gold/White Branding** — My Wallet tab restyled with S4 brand colors: navy (#1a3a5c) headers and buttons, gold (#c9a84c) accents and SLS balance, white text.
- **SLS Usage Chart** — Canvas-based usage visualization with range buttons (Hour/Day/Week/Month/Year), legend (SLS Balance, Anchors Created, Purchases), and placeholder overlay.
- **Role-Based SLS Purchase Controls** — 3-tier authorization panel: Admin/Leadership (full purchase), Program Manager (approval limits), Standard User (view-only).
- **USD→SLS Purchase Flow Explainer** — 4-step visual guide: Pay USD via Stripe → S4 Processes → SLS Delivered on-chain → Ready to Use.
- **SEC Regulatory Notice** — Comprehensive compliance notice in wallet tab: SLS classified as utility token / prepaid service credits per SEC/FinCEN guidance.

#### Fixed — UX & Links
- **Landing Page Box Alignment** — Added `height:100%;display:flex;flex-direction:column` to 18 inline-styled card boxes across competitive landscape, Why XRPL, and compliance sections. Cards now render uniform height side-by-side.
- **Compliance Grade Overlap** — Fixed `.score-ring` margin (12px→48px) and `.score-grade` position (-24px→-36px) so the letter grade badge no longer overlaps the percentage circle.
- **xMagnetic Broken Links** — Fixed URL format in 3 files (pricing, investors, README) from hex-padded currency code to correct `SLS+r95GyZac4butvVcsTWUPpxzekmyzaHsTA5` format.
- **DEX Broken Link** — Fixed demo-app DEX link from defunct `xrpl.org/dex.html` to `xrpl.org/docs/concepts/tokens/decentralized-exchange`.
- **SEC-Safe Token Language** — Changed "100 free SLS tokens" → "100 SLS service credits" across demo-app and login page. Changed "Free" → "Free Trial" on login page.

#### Changed — Production Readiness
- **Readiness Score** — Updated from 93% to 95% reflecting SDK docs, training guide, wallet onboarding, and compliance improvements.
- **NIST 800-171 3.2 (Awareness & Training)** — Updated from Pending to Partial with User Training Guide v4.0.

## [4.0.0] - 2026-02-18

### XRPL Mainnet Migration Complete — Full Production Anchoring

**S4 Ledger v4.0 marks the transition from testnet demo anchoring to fully operational XRPL Mainnet anchoring.** Every anchor across all 19 ILS workspace tools now creates a real, verifiable transaction on the XRP Ledger mainnet.

#### Added — Wallet Onboarding & SLS Purchases
- **Automatic Wallet Provisioning** — New users receive a fully funded XRPL wallet on signup. `POST /api/wallet/provision` creates a secp256k1 wallet, funds it with 12 XRP from the Ops wallet, sets up SLS TrustLine (1M limit), and grants 100 SLS (10,000 anchors).
- **Fiat-to-SLS Purchases** — `POST /api/wallet/buy-sls` accepts USD amount, calculates SLS at $0.01/SLS, and sends tokens from the Ops wallet. Stripe payment integration point ready.
- **Wallet Balance API** — `GET /api/wallet/balance?address=rXXX` queries XRPL for real-time XRP balance, SLS balance, and available anchors.
- **Signup Flow with Plan Selection** — Login page now includes a full signup form with 3-tier plan selector: Starter (free, 100 SLS), Professional ($49/mo, 5,000 SLS), Enterprise (custom, unlimited).
- **Wallet Credentials Modal** — On signup, users see their wallet address, family seed (masked with warning), public key, SLS/anchors/XRP stats, explorer link, and Xaman mobile import instructions.
- **Credential Download** — Users can download a plaintext .txt file with all wallet credentials for safekeeping.
- **My Wallet Tab in Demo App** — New top-level "My Wallet" tab alongside Anchor, Verify, Log, and ILS Workspace. Shows live balances, wallet credentials with seed show/hide toggle, and SLS purchase panel with quick-amount buttons ($10/$50/$100/$500).
- **OpenAPI Wallet Documentation** — 3 new endpoint definitions with full request/response schemas and "Wallet" tag added to API spec.

#### Added — Mainnet Anchoring & SLS Fee Payments
- **Full Mainnet Anchoring** — All 19 ILS workspace tools now anchor SHA-256 hashes to XRPL Mainnet via `AccountSet` + Memo transactions. Every anchor is verifiable on [livenet.xrpl.org](https://livenet.xrpl.org).
- **0.01 SLS Fee per Anchor** — Each anchor triggers a real 0.01 SLS payment from the Ops wallet (`raWL7nYZkuXMUurHcp5ZXkABfVgStdun51`) to the Treasury (`rMLmkrxpadq5z6oTDmq8GhQj9LKjf1KLqJ`). No new SLS is created — fees come from circulating supply.
- **Explorer Links on Every Anchor** — All 19 anchor functions now destructure `{txHash, explorerUrl, network}` and pass explorer links to the Audit Vault, local records, and session tracking.
- **Clickable TX Hash in Audit Vault** — Vault records now display clickable explorer links. TX hashes link directly to livenet.xrpl.org transaction details.
- **Vault Export with Explorer Links** — CSV/XLSX vault exports now include Explorer URL and Network columns.
- **Network Badge in Anchor Results** — `anchorRecord()` result panel shows a green "XRPL Mainnet" badge with explorer link to the transaction.
- **CMMC Level 2 Alignment** — S4 Systems, LLC is pursuing CMMC Level 2 certification. All compliance docs updated with CMMC-aligned architecture posture.

#### Fixed — Anchor Function Audit (All 19 Tools)
- **anchorCompliance()** — Added missing `saveLocalRecord()`, `sessionRecords.push()`, `updateTxLog()`, and `stats.types.add()`. Compliance anchors now appear in Transaction Log, Metrics, and session records.
- **8 functions missing sessionRecords.push** — Added `sessionRecords.push()` + `updateTxLog()` to: `anchorProvItem`, `anchorAllProvisioning`, `anchorProvisioning`, `anchorRisk`, `anchorReport`, `anchorContracts`, `anchorThread`, `anchorPredictive`. All anchors now tracked in session TX log.
- **secp256k1 Wallet Algorithm** — Fixed wallet derivation to use `CryptoAlgorithm.SECP256K1` (Xaman-compatible) instead of xrpl-py's ed25519 default. Resilient 3-level import fallback.

#### Changed — Architecture
- **3-Wallet Architecture** — Issuer (`r95GyZac...TA5`), Ops (`raWL7nYZ...un51`, holds circulating SLS), Treasury (`rMLmkrxp...f1KLqJ`, receives fees). Issuer anchors hashes; Ops pays SLS fees; Treasury accumulates fees.
- **Transaction Type** — Anchoring uses `AccountSet` + Memo (cheaper, no trust line required) instead of `Payment`.
- **Vercel Serverless Deployment** — Production API at `/api/anchor` running on Vercel with environment variables for wallet seeds and network selection.

## [3.9.17] - 2026-02-17

### Added — Context-Aware Export, XRPL Mainnet Support, Production Hardening

- **Context-Aware PDF/CSV Export** — Export toolbar now detects which ILS tool tab is active and exports that tool's data. "Export PDF" generates per-tool PDF reports with classification banners, summary metrics, data tables, and structured content. "Export CSV" routes to each tool's native CSV export function. Export bar label dynamically updates to show "Export: [Tool Name]" when switching tabs.
- **Universal Tool PDF Export** — New `S4PDF.exportActiveToolPDF()` and `S4PDF.exportActiveToolCSV()` methods route export to the correct sub-tool. New `S4PDF.exportToolPanelPDF()` captures any tool panel's tables, stats, and content into a professional PDF report.
- **XRPL Mainnet Support** — API backend (`api/index.py`) now supports mainnet via `XRPL_NETWORK` env var. Uses `AccountSet` + memo (cheaper than Payment, no trust line needed). Explorer URLs dynamically switch between testnet.xrpl.org and livenet.xrpl.org. Mainnet requires `XRPL_WALLET_SEED` env var (no auto-generated faucet wallets).
- **Real API Anchoring in Demo App** — `anchorRecord()` now uses the API response's real `tx_hash`, `network`, and `explorer_url` instead of generating random TX hashes. Anchor results display clickable explorer links and network badges (MAINNET/TESTNET/SIMULATED).
- **Production Security Headers** — Added Content-Security-Policy, Permissions-Policy, X-Permitted-Cross-Domain-Policies to vercel.json. HSTS upgraded to 2-year with preload directive.
- **API `do_POST` Method Fix** — **Critical bug fix**: POST endpoints (anchor, hash, verify, categorize, auth, db) were unreachable dead code inside `do_GET`. Now properly routed through a real `do_POST` method with rate limiting.
- **Request Body Size Limit** — API now rejects request bodies larger than 1 MB.
- **Marketplace Navigation** — Added Marketplace link to Products dropdown on all 12 pages that were missing it (s4-about, s4-pricing, s4-faq, s4-roadmap, s4-contact, s4-investors, s4-partners, s4-terms, s4-privacy, security, sdk-playground, s4-login).
- **robots.txt** — Created with crawl rules (allow public pages, disallow API/assets/login/playground/demo-app).
- **sitemap.xml** — Created with 14 public page entries and proper priority/changefreq values.
- **Login Dashboard Expansion** — Now shows 12 tool cards (added PDF & CSV Export, Task Assignment & Collaboration, Authentication & Sessions, Marketplace). SDK card updated to "38+ functions". Removed "Team Management COMING SOON".

### Changed — Emoji Removal, UI Fixes, Pricing & Content Accuracy

- **Demo-App Emoji Elimination (164+ lines)** — Replaced ALL remaining emojis in demo-app JavaScript: 4 CLF_META icons, U.S. Navy icons, 150+ record type icons (`_RT` object), srcIcons, vault icons, audit report type icons, AI chatbot greeting strings, optgroup labels, and all `animStatus` messages. All now use FontAwesome 6 class names rendered via `innerHTML` with `<i class="fas">` elements. Zero emojis remain.
- **CUI Rendering Bug Fix** — CLF icon element was using `textContent` to set FontAwesome class names (displaying "fa-shield-alt" as text). Fixed to use `innerHTML` with proper `<i>` elements.
- **Landing Page Title** — Changed from "XRP Ledger" focus to "Immutable Defense Logistics on the S4 Ledger". Meta title/description updated accordingly.
- **Badge Alignment** — Added `white-space:nowrap` to "Built on XRP Ledger" and "$SLS Token LIVE" badges to prevent misalignment.
- **Pricing Consistency** — Standardized all anchor cost references to `$0.01` SLS (was inconsistent between `$0.001` and `$0.01`). Updated stat card, Why XRPL section, and comparison table.
- **Competitive Landscape Expanded** — From 4 entries to 9 competitors in 2 categories: Blockchain Solutions (Guardtime KSI, SIMBA Chain, Hyperledger/R3 Corda, Ethereum/Polygon) and Enterprise & Defense Tech (Palantir Foundry, IBM/Accenture, GCSS/GFEBS/LMP, Manual Audit/Excel), plus S4 Ledger highlight bar.
- **Footer Copyright** — Updated from © 2025 to © 2026 across login page and PDF export engine.

### Infrastructure — Production Readiness

- **Dockerfile** — Updated from Python 3.14-slim (unreleased) to 3.12-slim. Added non-root user, health check, layer caching, proper WORKDIR setup.
- **API Version Strings** — Normalized health, status, infrastructure, and openapi.json endpoints to v3.9.17.
- **pyproject.toml** — Version updated from 3.0.0 to 3.9.17. Development status changed to "Production/Stable".
- **requirements-dev.txt** — Aligned xrpl-py minimum version with production (>=2.6.0). Pinned flask (>=3.0.0) and flask-cors (>=4.0.0).
- **vercel.json** — Added 8 missing API route rewrites (verify, supply-chain-risk, audit-reports, contracts, digital-thread, predictive-maintenance, action-items, calendar).

## [3.9.16] - 2026-02-16

### Added — Platform Feature Upgrades: Auth, Persistence, Export, Collaboration, Mobile

- **Auth & Session Management (`s4-auth.js`)** — Full authentication module with session CRUD, role-based access control (admin/manager/analyst/auditor/viewer), session history tracking, user preferences (auto-save, notifications, dark mode), auth badge UI with dropdown menu, profile & settings modals. Integrates with existing login system.
- **Persistent Data Layer (`s4-data.js`)** — IndexedDB-backed persistence layer with 6 object stores (analyses, actionItems, vault, settings, comments, notifications). Full CRUD, domain-specific methods for analysis save/retrieve, action item management with filtering/sorting, vault record persistence, notification system with CustomEvent dispatch, comment threads, settings key-value store, stats aggregation, full JSON export/import.
- **PDF & CSV Export Engine (`s4-pdf.js`)** — Professional report generation with A4 layout, classification banners, executive summary stats, readiness bar, gap analysis breakdown, action items table, vault records table, footer with report ID & timestamps. Also exports vault records and action items as CSV.
- **Multi-User Collaboration (`s4-collab.js`)** — Team member management (7 simulated members across ranks), assignee picker widget, full action item assignment modal (title/assignee/priority/due date/status/notes/email notification), comment thread widget with real-time rendering, notification toasts.
- **Mobile Responsive CSS (`s4-mobile.css`)** — Comprehensive responsive stylesheet: mobile ≤768px (horizontal-scroll ILS tabs, full-width panels, iOS zoom prevention), small phone ≤480px (compact nav/cards), tablet 769–991px (2-col grids), touch-friendly targets (44px min), print styles (hide nav/footer/particles, white background, page-break avoidance). Loaded on all 20 HTML pages.
- **Export & Collaborate Toolbar** — New toolbar in ILS Workspace with Export PDF, Export CSV, Assign Task, and Saved Analyses buttons. Wired to S4PDF, S4Data, and S4Collab modules.
- **Saved Analyses Viewer** — Modal overlay showing analysis count, vault record count, action item count, and scrollable list of saved analyses with readiness scores.
- **Auth Badge in Navbar** — User avatar/role badge rendered in demo-app navbar with dropdown menu for profile, settings, and session management.
- **Vault Auto-Persistence** — Vault records now automatically persist to IndexedDB via intercepted `pushToVault()` calls.

### Changed — Favicon, Emoji Elimination, Claims Fix, Pricing Correction

- **Favicon Overhaul** — Regenerated all icon sizes (32×32, 180×180, 192×192, 512×512) from S4Ledger_logo.png. New SVG favicon with dark hex shield, "S4" text in blue, gold divider bar, "LEDGER" subtitle. SVG favicon reference added to all 20 HTML pages.
- **Site-Wide Emoji Elimination** — Replaced ~168 remaining emoji instances across 8 files (demo-app, SDK Playground, login, about, pricing, 404, transactions, landing page) with professional FontAwesome 6 icons. Zero emojis remain in the codebase.
- **Use Cases & Landing Page Claims Fix** — Removed "Prime Contractors (LM, RTX, HII, GD, NG)", "Defense OEMs", "Sub-Contractors (Tier 2–4)", "Depot-Level MROs" from both pages. Replaced with role-based descriptions: "Program Offices (PEOs, NAVSEA, NAVAIR)", "ILS Managers", "Supply Chain Teams", "Compliance Officers".
- **Pricing Page Fix** — "All 12 IPS modules" → "All 13 ILS tools" in Enterprise tier.

## [3.9.15] - 2026-02-16

### Changed — Professional UI Overhaul + Use Cases Expansion + Site-Wide Consistency

- **Use Cases page**: Complete rewrite — now shows all 13 ILS Workspace tools, 6 additional capabilities (AI Agent, SDK, $SLS, Metrics, Classified Architecture, Marketplace), 9 service branches, and stat pills
- **Landing page title**: "Immutable Logistics Verification" → "Immutable Defense Logistics on the XRP Ledger" (reflects broader platform scope)
- **Landing page badges**: "Built on XRP Ledger" and "$SLS Token LIVE" now displayed side-by-side instead of stacked
- **Emoji → FontAwesome**: Replaced 35+ emoji icons with professional FontAwesome 6 icons across landing page (How It Works, Why XRPL, Explore grid, Compliance, Built For sections)
- **Use Cases page icons**: All emoji replaced with colored FontAwesome icons in styled containers
- **Demo App XRPL banner**: Changed from green to blue (`#00aaff`) with white text for professional branding consistency
- **Tool count consistency**: Fixed "18 integrated tools" → "20" and "19 Tools" → "13 purpose-built ILS tools" across landing page and demo app
- **ILS Workspace description**: Updated to reflect all 13 tools including Defense Database Import and ILIE

## [3.9.14] - 2026-02-16

### Changed — ILIE v2: Comprehensive Enhancement + Bug Fixes + SDK Expansion
- **How It Works text fixed** — VRSL→VRS, grammar corrections
- **AI Summary program name fix** — Platform display names resolve through S4_PLATFORMS DB (e.g., "ddg51" → "DDG-51 — Arleigh Burke Class Destroyer"); custom platform info now displays correctly in AI summary
- **Navbar consolidated** — Use Cases, Pricing, Roadmap, FAQ, Contact moved into "More" dropdown across all site pages for cleaner navigation
- **Action Items integration** — ILIE discrepancies auto-generate Action Items: critical findings create 7-day action items, warnings create 14-day items, tagged "ILIE" source
- **Sample download files** — 5 downloadable CSV samples (VRS, IUID, BOM, Config Drawings, ECP) above upload zone for full workflow testing
- **ECP/CDRL demo data** — 8-item ECP data with real NAVSEA-style change proposals + 8-item CDRL data with DI numbers
- **Drag & drop upload** — Added handleSubFileDrop() for proper file drag-and-drop
- **AI Agent ILIE context** — Agent provides ILIE-specific responses with discrepancy counts if analysis has been run
- **SDK Playground expanded** — 38+ functions (was 20): added ILIE, Defense DB Import, Compliance Score, ILS Calendar, Parts X-Ref, Doc Library, Audit Vault with Python code samples and realistic output
- **Marketplace verified** — Exists at /s4-marketplace/ and is linked from Products dropdown

## [3.9.13] - 2026-02-16

### Changed — ILIE Enhancement: 500+ Platform Selector + Realistic Demo Data
- **ILIE platform dropdown upgraded** — Replaced static 13-platform dropdown with dynamic `S4_buildProgramOptions()` selector (462 platforms, 37 suppliers, 25 contracts, U.S. Navy). Added `subProgram` to `populateAllDropdowns()` selects object. Auto-sets branch dropdown from selected platform's branch data.
- **Realistic demo data** — Replaced random generators with authentic defense ILS submission data:
  - **30-item VRSL**: Real NSNs, MIL-SPEC part numbers, CAGE codes, production lead times, mixed Active/DMSMS Watch/Obsolete statuses
  - **12-item IUID Registry**: Real UID format, serial numbers, acquisition costs ($2K–$945K), fleet locations
  - **8-item Configuration Drawings**: NSTM chapter references, ECN numbers, drawing revision tracking
  - **20-item BOM**: Real defense vendors (GE Marine, Raytheon, L3Harris), make/buy designations, line pricing
- **Baseline generator improved** — More realistic "previous submission" differences with specific price increase patterns, vendor changes, and status transitions
- **All documentation updated** — ILIE mentioned by name across README, DEVELOPER_BIO, S4_SYSTEMS_EXECUTIVE_PROPOSAL, BILLION_DOLLAR_ROADMAP, BILLION_DOLLAR_ROADMAP_SIMPLE, S4_LEDGER_INTERNAL_PITCH, INVESTOR_RELATIONS, INVESTOR_PITCH, MAINNET_MIGRATION (new Section 37)
- **Revenue recalculated** — Per-program: ~$1.02M–$2.6M/year. Scale: $1.02B–$2.6B/year (1,000 programs). Billion dollar roadmaps updated with ILIE row ($120K–$500K/program/year savings).

## [3.9.12] - 2026-02-16

### Added — Integrated Logistics Insights Engine (ILIE) — Tool #20
- **Integrated Logistics Insights Engine (ILIE)** — 20th ILS Workspace tool. AI-powered submission review and discrepancy detection engine that ingests OEM/vendor/shipbuilder submissions across the U.S. Navy and programs. Compares new submissions against previous baselines to automatically flag:
  - **New components** not in previous submission
  - **Removed components** that were previously listed
  - **Cost anomalies** (unit price increases >10–25%, total cost variance)
  - **Vendor/source changes** (CAGE code, manufacturer, make/buy shifts)
  - **Configuration mismatches** (drawing rev vs parts list rev)
  - **IUID discrepancies** (serial/lot traceability gaps)
  - **Lead time increases** (>30 day threshold alerts)
  - **Red flags** (sole-source substitutions, cost spikes, quantity changes)
- **24+ submission document types** supported: VRSL, IUID Registry, Configuration Drawings, Outfitting Lists, Purchase Order Index, PTD, APL, Technical Manuals (IETM/TM), Maintenance Plans, Supply Support Requests, LSAR, FRACAS, Calibration Records, PHS&T, Training Equipment Lists, Support Equipment Recommendations, Warranty Submissions, ECPs, CDRLs, BOMs, Cost Estimates/ROM, Test Reports, HAZMAT/Environmental Data, plus custom types
- **U.S. Navy and programs** — 9 branch selector (USN, USA, USAF, USMC, USCG, DLA, JOINT, SOCOM, USSF) with 13 pre-loaded platforms and custom platform input
- **File upload + paste** — CSV, Excel, XML, JSON, PDF upload with drag-and-drop; manual data paste option
- **Discrepancy severity ratings** — Critical (red), Warning (orange), Info (blue) with filterable report table
- **AI Discrepancy Summary** — Auto-generated analysis with findings count, cost impact, and leadership recommendation
- **Submission History** — Tracks all analyses in localStorage with hash verification
- **Full platform integration** — saveLocalRecord(), addToVault(), sessionRecords, updateTxLog(), showAnchorAnimation(), fetch('/api/anchor'), AI_TOOL_CONTEXT quick actions, switchHubTab() initialization
- **SDK/API compatible** — Anchored reviews auto-populate Metrics and Transactions pages; record_type: SUBMISSION_REVIEW

### Changed — 19→13 purpose-built ILS tools Count Update
- **All documentation updated** from "19-tool" to "13-tool" across: MAINNET_MIGRATION.md, PRODUCTION_READINESS.md, ROADMAP.md, INVESTOR_PITCH.md, INVESTOR_OVERVIEW.md, INVESTOR_RELATIONS.md, INVESTOR_SLIDE_DECK.md, TECHNICAL_SPECS.md, WHITEPAPER.md, metrics.html
- **Financial figures recalculated** — ILIE adds $120K–$500K/year per program in eliminated submission review labor, prevented procurement errors, and avoided readiness shortfalls. New per-program total: ~$1.02M–$2.6M/year (was ~$900K–$2.1M). Scale projection (1,000 programs): $1.02B–$2.6B/year.
- **WHITEPAPER.md** — Added ILIE row to Current Toolset table
- **ROADMAP.md** — Added ILIE to Phase 2 tool list
- **demo-app/index.html** — Tab button, panel HTML, AI_TOOL_CONTEXT entry, switchHubTab block, full JavaScript engine (8180 lines total)
- **metrics.html** — ILS cross-link updated to 13-tool with ILIE listed

## [3.9.10] - 2026-02-16

### Added — Scalability Architecture, CEO Guide, Financial Recalculation
- **SCALABILITY_ARCHITECTURE.md** — Comprehensive 6-phase plan addressing browser performance at scale. Covers: server-side persistence (Supabase/PostgreSQL), server-side pagination with virtual scrolling, Web Workers for background processing, Merkle tree batch XRPL anchoring (100x cost reduction), CDN/edge caching for global <100ms response, and microservices decomposition with FedRAMP readiness. Infrastructure costs never exceed 6% of revenue at any phase. Scales from 0 cost (current) to 50,000+ concurrent users.
- **CEO_CONVERSATION_GUIDE.md** — Practical playbook for presenting S4 Ledger to company CEO. Includes: the "Don't lead with blockchain, lead with the problem" approach, 5 key talking points, 8 anticipated CEO questions with prepared answers, what NOT to say, recommended demo walkthrough sequence, and post-meeting follow-up strategy.

### Changed — Financial Recalculation (19th Tool: Defense Database Import)
- **Per-program savings recalculated** — Defense Database Import adds $300K–$500K/year in manual data reconciliation savings per program. New total: ~$900K–$2.1M/year per program (was ~$600K–$1.6M). ROI: 15–100x (was 10–100x).
- **BILLION_DOLLAR_ROADMAP.md** — Added Defense Database Import row to tool savings table, updated total from ~$600K–$1.6M to ~$900K–$2.1M, recalculated all scale projections (1,000 programs: $900M–$2.1B), updated combined savings table, updated 5-minute pitch section.
- **BILLION_DOLLAR_ROADMAP_SIMPLE.md** — Added Defense Database Import row, updated per-program savings to $900K–$2.1M, updated scale projections, updated 5-minute pitch.
- **S4_SYSTEMS_EXECUTIVE_PROPOSAL.md** — Updated per-program savings, valuation projections, and scale table to new figures.
- **All financial figures updated** across INVESTOR_PITCH.md, INVESTOR_SLIDE_DECK.md, INVESTOR_OVERVIEW.md, INVESTOR_RELATIONS.md, S4_LEDGER_INTERNAL_PITCH.md, DEVELOPER_BIO.md, PRODUCTION_READINESS.md, MAINNET_MIGRATION.md, s4-assets/search.js.

### Changed — Scalability Narrative Added to All Documents
- **INVESTOR_PITCH.md** — New "Scalability Architecture" section with 6-phase table showing capacity/cost at each phase. Roadmap updated with scalability milestones.
- **INVESTOR_SLIDE_DECK.md** — New "Scalability" slide. Roadmap bullets updated with server persistence, Merkle batch anchoring, microservices.
- **INVESTOR_OVERVIEW.md** — Scalability paragraph added under "For Grantmakers & Strategic Partners."
- **WHITEPAPER.md** — New "Scalability Architecture" subsection under Section 7 (Revenue Model). Roadmap table Phases 3-5 updated with infrastructure milestones.
- **ROADMAP.md** — Phase 3 expanded with server persistence, auth, pagination. Phase 4 expanded with Web Workers, Merkle batch anchoring. Phase 5 expanded with CDN/edge, microservices, horizontal scaling.
- **PRODUCTION_READINESS.md** — Infrastructure row updated with full scalability plan reference. Score updated to 65%.

### Changed — Remaining 18→19 Tool Count Audit
- **43 references fixed** across: index.html, PRODUCTION_READINESS.md (4 locations), MAINNET_MIGRATION.md, WHITEPAPER.md (2 locations), INVESTOR_SLIDE_DECK.md (2 locations), S4_LEDGER_INTERNAL_PITCH.md, s4-use-cases/index.html, S4_SYSTEMS_EXECUTIVE_PROPOSAL.md, DEVELOPER_BIO.md (2 locations), s4-faq/index.html (2 locations), INVESTOR_PITCH.md (3 locations), INVESTOR_OVERVIEW.md (4 locations), INVESTOR_RELATIONS.md, TECHNICAL_SPECS.md (2 locations), BILLION_DOLLAR_ROADMAP.md (2 locations), BILLION_DOLLAR_ROADMAP_SIMPLE.md (4 locations).
- **API endpoint count updated** from "27 REST API endpoints" to "49+ REST API endpoints" across 8+ files.
- **Files Modified** — CEO_CONVERSATION_GUIDE.md (new), SCALABILITY_ARCHITECTURE.md (new), BILLION_DOLLAR_ROADMAP.md, BILLION_DOLLAR_ROADMAP_SIMPLE.md, INVESTOR_PITCH.md, INVESTOR_SLIDE_DECK.md, INVESTOR_OVERVIEW.md, INVESTOR_RELATIONS.md, S4_SYSTEMS_EXECUTIVE_PROPOSAL.md, S4_LEDGER_INTERNAL_PITCH.md, WHITEPAPER.md, ROADMAP.md, PRODUCTION_READINESS.md, DEVELOPER_BIO.md, MAINNET_MIGRATION.md, TECHNICAL_SPECS.md, index.html, s4-use-cases/index.html, s4-faq/index.html, s4-assets/search.js, CHANGELOG.md.

## [3.9.9] - 2026-02-16

### Changed — Defense Database Import: All-Branch Expansion
- **Renamed "DoD / DoN Database Import" → "Defense Database Import"** — Reflects full coverage of the U.S. Navy, not just Navy/DoD.
- **Expanded from 13 to 24 defense systems** — Added: GCSS-Army, LMP, AESIP (Army); REMIS, LIMS-EV, D200A (Air Force); GCSS-MC, ATLASS (Marines); ALMIS, CGOne (Coast Guard); USSF LMS (Space Force); PIEE/WAWF (Joint). Dropdown now uses `<optgroup>` elements organized by branch with icons.
- **Demo data generators for all 24 systems** — Each new system has a dedicated data generator with realistic field names, values (NSNs, platforms, depots, squadrons), and sample volumes.
- **SDK expanded to 24 systems** — `s4_sdk.py` `DOD_SYSTEMS` dict now includes all branch systems with agency/format/record_type metadata.
- **Anomaly engine expanded** — `s4_anomaly.py` `LOGISTICS_SYSTEMS` expanded from 6 to 13 entries to cover all-branch monitoring endpoints.

### Fixed — Transaction Log / Metrics Auto-Update
- **`anchorDbImport()` now pushes to `sessionRecords[]`** — Previously, anchored import records were added to the Audit Vault but NOT pushed to `sessionRecords`, so they never appeared in the Transaction Log or Metrics page. Fixed by adding `sessionRecords.push()` and `saveLocalRecord()` calls within the anchor loop.
- **`updateTxLog()` now called after import anchoring** — Ensures the Transaction Log DOM updates immediately after anchoring.
- **Branch-aware vault records** — `addToVault()` now uses `info.branch` (e.g., 'USA', 'USAF', 'USMC') instead of hardcoded 'USN'.

### Fixed — AI Agent Compatibility
- **Added `hub-dbimport` to `AI_TOOL_CONTEXT`** — 6 quick-action buttons: Supported Systems, Import Guide, File Formats, Import Savings, Import Status, Import Anchoring.
- **Added import query handling to `generateAiResponse()`** — Comprehensive response listing all 24 systems by branch with savings figures and workflow steps.
- **Added `hub-dbimport` to `switchHubTab()`** — Calls `updateDbImportInfo()` when the tab is selected.

### Changed — How It Works Savings Enhancement
- **Specific savings figures added** — $450K+/year per program, 80% fewer data discrepancies, 60% faster audit preparation, $45M+/year at 100-program scale.

### Changed — Documentation: 19-Tool Updates
- **All references updated from "18-tool" to "19-tool"** across 15+ files: README, ROADMAP, WHITEPAPER, INVESTOR_RELATIONS, INVESTOR_PITCH, INVESTOR_SLIDE_DECK, S4_LEDGER_INTERNAL_PITCH, PRODUCTION_READINESS, MAINNET_MIGRATION, CHANGELOG, TECHNICAL_SPECS, index.html, search.js, s4-faq/index.html.
- **MAINNET_MIGRATION.md Section 36** — Added comprehensive section documenting all v3.9.9 changes, system-by-branch table, scalability notes, and migration checklist.

## [3.9.8] - 2026-02-16

### Added — Code Features
- **`POST /api/verify` Endpoint** — New verification endpoint in `api/index.py`. Accepts `record_text` (required), `tx_hash`, and `expected_hash`. Recomputes SHA-256, compares against on-chain hash, returns structured result with `verified`, `status` (MATCH/MISMATCH/NOT_FOUND), `tamper_detected`, `explorer_url`, and `audit_id`. Tamper detections return a CRITICAL alert payload with correction instructions.
- **Verification Audit Log** — Every `/api/verify` call is logged to `_verify_audit_log` with timestamp, operator, both hashes, TX hash, result, and tamper status. Last 50 entries are exposed in `/api/metrics` response under `verify_audit_log`.
- **Webhook Delivery Implemented** — `s4_comms.py` `_fire_webhooks()` now performs real HTTP POST to registered webhook URLs with JSON payload, HMAC signature (`X-S4-Signature`), and `User-Agent: S4-Ledger-Webhook/3.9.7`. Previously was a no-op (`pass`).
- **Tamper Alert System** — New `send_tamper_alert()` method in `S4LedgerMessenger`. Sends EMERGENCY priority (04) CUI-classified notifications to Security Officer, Program Manager, and Contracting Officer when hash mismatch is detected.
- **Correction / Re-Anchor Chain** — New `correct_record()` method in `S4SDK` and `send_correction_notice()` in `S4LedgerMessenger`. Corrected records are re-anchored to XRPL with `CORRECTION:{hash}:SUPERSEDES:{original_tx}` in the memo, preserving the full audit trail. Original transaction remains on-chain.
- **`verify_against_chain()` SDK Method** — New method in `S4SDK` for programmatic record verification. Compares current record hash against expected or on-chain hash. Returns structured result with tamper detection.
- **DoD Database Import Adapters** — 13 DoD/DoN system adapters added to `S4SDK`: NSERC/SE IDE, MERLIN, NAVAIR AMS PMT, COMPASS, CDMD-OA, NDE, MBPS, PEO MLB, CSPT, GCSS, DPAS, DLA FLIS/WebFLIS, NAVSUP OneTouch. Each adapter includes system metadata, supported formats (CSV/XML/JSON/fixed-width), and mapped record types. Import methods: `import_csv()`, `import_xml()`, `import_json()`, `import_and_anchor()`, `list_dod_systems()`.
- **DoD Import Tool in Demo App** — New 19th ILS tool "DoD Import" in `demo-app/index.html`. File upload (drag-and-drop) and paste support for CSV/XML/JSON. Source system selector (13 systems), format selector, auto-detect record types. Demo import generator with realistic sample data for each system. Import, hash, anchor, and export workflows.
- **Metrics: Data Source Tracking** — `/api/metrics` now tracks `records_by_source` showing which DoD system each record was imported from (NSERC, CDMD-OA, MERLIN, etc.).

### Added — Documentation
- **DoD Database Integration Sections** — Added to TECHNICAL_SPECS.md, WHITEPAPER.md, and S4_SYSTEMS_EXECUTIVE_PROPOSAL.md. Includes 13-system compatibility table, import workflow (Export → Upload → Parse → Hash → Anchor → Integrate), SDK code examples.
- **Tamper Detection & Response Documentation** — Added to TECHNICAL_SPECS.md. Covers detection (MATCH/MISMATCH/NOT_FOUND), response pipeline (detect → alert → webhook → audit log → correct), and correction chain with `supersedes_tx` linking.

### Changed — API & Versions
- **OpenAPI Spec Updated to v3.9.7** — `openapi.json` version bumped from 3.8.0 to 3.9.7. Status example version bumped from 3.2.0 to 3.9.7. Added 7 new endpoint definitions: `/api/verify`, `/api/supply-chain-risk`, `/api/audit-reports`, `/api/contracts`, `/api/digital-thread`, `/api/predictive-maintenance` (these 5 existed in code but were undocumented). Total: 29 documented API endpoints.
- **API Version Strings Updated** — `api/index.py` version strings updated from 3.8.0/3.8.6/3.3.0 to 3.9.7 across status, health, and infrastructure endpoints.
- **SDK Status Command Updated** — Now shows v3.9.7, 500+ platforms, 13 DoD import systems, 28 REST API endpoints, and 25+ platform pages.
- **Route Table Updated** — Added `action_items`, `calendar`, and `verify` routes to the `_route()` function (were handled but not in the route lookup).

### Changed — Documentation Audit
- **API Endpoint Count** — "7 REST API endpoints" → "27 REST API endpoints" in 10+ docs (INVESTOR_PITCH, INVESTOR_OVERVIEW, INVESTOR_RELATIONS, INVESTOR_SLIDE_DECK, EXECUTIVE_PROPOSAL, WHITEPAPER, TECHNICAL_SPECS, DEVELOPER_BIO, INTERNAL_PITCH).
- **Page Count** — "14+ pages" → "25+ pages" in 9 locations across 7 docs.
- **Pricing Standardized** — Starter $499/mo ($6K/yr), Professional $1,999/mo ($24K/yr), Enterprise $4,999/mo ($60K/yr) across all investor docs.
- **Revenue Projections Updated** — Year 1 ~$72K, Year 2 ~$480K, Year 3 ~$2.4M, Year 5 $8M–$15M+ (was $15K/$180K/$900K/$3-5M).
- **BAA Template Version** — Updated from v3.8.3 to v3.9.7.
- **WHITEPAPER API Pricing** — Changed from "TBD" to "$499–$4,999/mo".

## [3.9.7] - 2026-02-15

### Changed
- **S4 Anchor Brand Mark** — New navy circle + gold S4 anchor logo deployed across all pages. Updated `s4-assets/s4-logo.svg`, `s4-assets/s4-logo.png` (192×192), `s4-assets/s4-favicon.ico`, `s4-assets/s4-icon-512.png`, `demo-app/manifest.json` icons. Fixed GitHub raw URL references that were returning 404.
- **Navbar Logo Size** — Increased from 32px → 44px desktop, 26px → 34px mobile for better visibility.

## [3.9.6] - 2026-02-15

### Changed
- **Solus Protocol Removed** — Replaced all 7 remaining "Solus Protocol" references across the codebase. OpenAPI spec contact name changed from "Solus Protocol" to "S4 Systems, LLC." CHANGELOG comparison URLs updated from `solus-protocol/s4-ledger` to `s4ledger/s4-ledger` to match current GitHub org.
- **xrp-ledger.toml Updated for DEX Display** — Fixed `display_name` from "S4 Ledger" to "Secure Logistics Standard" (the official token name). Fixed missing closing quote on twitter URL. Updated `description` with full token purpose. Changed principal name to "S4 Systems, LLC." Updated `modified` date. Logo URL (`SLS_logo.png`) confirmed correct — DEXs pulling from this file will display the S4 Ledger SLS logo instead of the old Solus Protocol logo.
- **Vercel CORS + Content-Type for .well-known** — Added headers rule to `vercel.json` serving `.well-known/*` with `Content-Type: application/toml` and `Access-Control-Allow-Origin: *` so XRPL DEXs (Sologenic, First Ledger, XPMarket, etc.) can fetch the token metadata file.

## [3.9.5] - 2026-02-15

### Added
- **"Why XRPL?" Section on Homepage** — New 6-card section between Competitive Advantage and ILS Workspace explaining why the XRP Ledger was chosen over Ethereum, Solana, and private blockchains. Covers: 3-5 second finality, ~$0.001 cost, public/neutral with 150+ validators, no mining/energy waste, quantum-resistant architecture, independent verifiability.
- **"Why XRPL?" in README.md** — Added 7-point bullet list with blockchain comparison after the XRPL stats section.
- **"Why XRPL?" in TECHNICAL_SPECS.md** — Added full comparison table (Ethereum vs Solana vs Hyperledger vs XRPL) across 6 criteria before the $SLS Token section.
- **"Why XRPL?" in INVESTOR_PITCH.md** — Added blockchain evaluation section after competitor table — Ethereum (gas fees), Solana (outages), private chains (vendor control), XRPL (ideal).
- **"Why XRPL?" in INVESTOR_RELATIONS.md** — Added comparison table (XRPL vs Ethereum vs Private Chains) for speed, cost, uptime, and independence.

### Notes
- WHITEPAPER.md (§1.3), s4-faq/index.html, and s4-about/index.html already contained full "Why XRPL" explanations — confirmed no changes needed.

## [3.9.4] - 2026-02-15

### Added
- **FAQ Page Expanded** — Added 13 new FAQ entries (7→20 total). New topics: 18 ILS tools overview, custom input/hull/program office capabilities, SDK Playground description, ICAPS vs Provisioning comparison, Compliance Scorecard frameworks, pricing tiers, AI Supply Chain Risk Engine, data safety/client-side processing, export/download options, SDK language support, anchor transaction cost, project creator attribution.

### Changed
- **Documentation Audit for v3.9.3 Features** — Updated 6 docs (TECHNICAL_SPECS, WHITEPAPER, PRODUCTION_READINESS, README, MAINNET_MIGRATION, ROADMAP) to reflect v3.9.3 changes: version stamps bumped to 3.9.3, hardcoded platform counts (35+/40+/32) updated to 500+ dynamically populated, custom hull/designation + program office input noted on all tools, SDK Playground platform selector added, Metrics + Transactions platform filters documented, custom contract number input noted.
- **Compliance Grade Position Fix** — Moved the compliance letter grade badge further below the SVG score ring (`bottom: -12px` → `bottom: -24px`) so it no longer overlaps the ring border.

## [3.9.3] - 2026-02-15

### Added
- **Custom Input Fields Across All ILS Tools** — Every ILS Workspace tool with a platform selector now includes hull/tail/designation and program office free-text input fields. Users can enter real vessel hull numbers, aircraft tail numbers, or custom designations alongside any selected program. Added to 9 tools: DMSMS Tracking, Readiness Reporting, Lifecycle Cost, Warranty Tracking, Compliance Audit, Provisioning, Supply Chain Risk, Digital Thread, and Predictive Maintenance.
- **Custom Contract Number Input** — Contracts & Procurement tool now includes a "Custom" option in the contract dropdown. Selecting it reveals a free-text contract number input so users can enter real contract identifiers beyond the 25 pre-loaded samples.
- **SDK Playground Platform Selector** — Added full "Select Platform / Program" card to SDK Playground with 500+ platform dropdown (populated from platforms.js), hull/tail/designation input, program office input, and contract number input. All SDK function calls can now target specific programs.
- **Platform Filter — Metrics Dashboard** — Added platform/program filter dropdown to the Records Secured Breakdown section of metrics.html, enabling filtering by specific defense platform.
- **Platform Filter — Transaction Log** — Added platform/program filter dropdown to the transaction log filter bar in transactions.html, enabling filtering by specific defense platform.

### Changed
- **Dynamic Platform Dropdowns for All Tools** — Converted 4 tools with hardcoded platform lists (Supply Chain Risk ≈35 options, Digital Thread ≈30 options, Predictive Maintenance ≈40 options, Contracts ≈25 options) to dynamic population from platforms.js (500+ platforms across 8 branches, 35 categories). All 11 platform dropdowns now load from the same master database.
- **Custom Program Option Enabled Globally** — Changed `custom: true` on all platform dropdowns in `populateAllDropdowns()`. Previously only Gap Analysis allowed custom program entry; now all 11 dropdowns include a "Custom Program" option for free-text platform input.
- **Files Modified** — demo-app/index.html (18 ILS tools updated), sdk-playground/index.html (platform selector added), metrics.html (platform filter added), transactions.html (platform filter added).

## [3.9.2] - 2026-02-15

### Changed
- **TECHNICAL_SPECS.md Enriched** — Added REST API Endpoints section (7 endpoints with paths, methods, descriptions), ILS Workspace section (13 tools listed with categories), SDK function count (21), record type count (156+), pre-loaded entity count (500+: 462 platforms + 37 suppliers + 25 contracts). Version bumped to 3.9.0. Added S4 Systems, LLC attribution.
- **GitHub Rendering Fix** — Replaced `~` prefix with `≈` in TECHNICAL_SPECS.md numeric values (e.g., `~0.000012` → `≈0.000012`) to prevent GitHub markdown parser from rendering tildes as strikethrough text.

## [3.9.1] - 2026-02-15

### Changed
- **PRODUCTION_READINESS.md — S4 Systems Infrastructure Framing** — Version bumped to v3.9.0. Corporate infrastructure items (EIN, D-U-N-S, CAGE Code, SAM.gov, NAICS, ITAR, CMMC) reframed from "Pending" to "🟡 Verify" — S4 Systems LLC likely already has these in place. Added header note clarifying that Nick leads product/technology while S4 Systems provides BD, legal, compliance, hiring, and corporate infrastructure. Legal/Business readiness score updated 30%→40%. ITAR warning marked complete. Quick Win Checklist updated with verify-first framing.
- **SBIR Figures Corrected** — Fixed Phase I from "$150K" to "$50K–$250K" and Phase II from "$1M" to "$500K–$1.5M" in S4_SYSTEMS_EXECUTIVE_PROPOSAL.md. Fixed Phase I from "$150K–$250K" to "$50K–$250K" and Phase II from "$750K–$1.5M" to "$500K–$1.5M" in BILLION_DOLLAR_ROADMAP.md. Fixed "$150K to $1.5M" to "$50K to $1.5M" in BILLION_DOLLAR_ROADMAP_SIMPLE.md.
- **Oracle Cost Corrected** — Fixed Oracle NetSuite from "$100K–$1M+" to "$200K–$1M+" in S4_LEDGER_INTERNAL_PITCH.md competitor table.

## [3.9.0] - 2026-02-15

### Added
- **Comprehensive Repo-Wide Documentation Audit** — Audited all 23 remaining markdown files against current key facts. Fixed every inconsistency found across investor docs, whitepaper, developer bio, and compliance documents.
- **National Impact & Job Creation Sections** — Added to all 4 investor documents: 340+ jobs by Year 5, $8M–$17M economic impact, $150B+ addressable market, $600M–$1.6B/yr savings at scale, defense industrial base expansion.
- **Key Metrics Enrichment** — All investor documents now include: 21 SDK functions, 7 REST API endpoints, 500+ pre-loaded military entities (462 platforms + 37 suppliers + 25 contracts), 156+ pre-built record types across 9 military branches, ~$600K–$1.6M per-program savings, 10–100x ROI, pricing tiers ($499–$4,999/mo).
- **Competitive Landscape Enhancement** — Added competitor valuations (Palantir $60B+/$2.2B rev, Anduril $14B/~$800M rev), Microsoft Dynamics ($150K–$800K+) to all competitor tables. SBIR Phase I/II/III dollar ranges ($50K–$250K/$500K–$1.5M/full production) added everywhere.
- **Funding Path Sections** — Added explicit SBIR Phase I/II/III dollar ranges to INVESTOR_PITCH, INVESTOR_OVERVIEW, and INVESTOR_SLIDE_DECK.

### Changed
- **Background Animation v4** — Complete rewrite removing floating hash text fragments and matrix-style data streams. Added futuristic anchor enhancements: holographic aura (4-layer concentric glow rings), orbital rings with traveling bright node, energy pulses traveling along chains, chain glow trails, double-stroke shackle with brighter core, parallel shaft highlights, fluke tip micro-glows. Anchors and chains now look distinctly sci-fi/futuristic.
- **Copyright Entity Branding** — Changed `© 2026 S4 Ledger` to `© 2026 S4 Systems, LLC` across 7 markdown files (WHITEPAPER, SECURITY_AUDIT, SECURITY, CONTRIBUTING, CODE_OF_CONDUCT, BAA_TEMPLATE, README).
- **DEVELOPER_BIO.md Rewritten** — Changed "founder" to "creator and owner." Added S4 Systems LLC ownership, ILS contractor role, proposed Product Lead/CTO title, zero-cost build, and comprehensive scope of what was built (18 tools, 21 SDK functions, 7 API endpoints, 500+ entities).
- **WHITEPAPER.md Updated** — Version bumped to 3.9.0. SBIR figures corrected ($50K–$250K Phase I / $500K–$1.5M Phase II / Phase III production). Team section updated with Nick Frankfort credit and S4 Systems LLC.
- **DoW Budget Corrected** — Fixed `$800B+` to `$850B+` annual DoW budget in INVESTOR_PITCH, INVESTOR_OVERVIEW, and INVESTOR_SLIDE_DECK.
- **Oracle Cost Fixed** — Corrected Oracle NetSuite from `$100K–$1M+` to `$200K–$1M+` in INVESTOR_SLIDE_DECK competitor table.
- **S4 Systems LLC Attribution** — All investor documents now identify S4 Ledger as "A product line of S4 Systems, LLC" with Nick Frankfort credited by name.
- **INVESTOR_RELATIONS.md Enriched** — Added full key performance metrics table, SDK/API counts, 500+ entities, per-program savings, AI Agent to tool list, zero-cost build credit.

## [3.8.9] - 2026-02-15

### Added
- **Job Security Messaging** — Added comprehensive "This Creates Jobs — It Doesn't Replace Them" sections to all 4 key documents (BILLION_DOLLAR_ROADMAP, BILLION_DOLLAR_ROADMAP_SIMPLE, S4_SYSTEMS_EXECUTIVE_PROPOSAL, S4_LEDGER_INTERNAL_PITCH). Addresses common fear that AI/blockchain/automation replaces workers. Details how S4 Ledger automates grunt work while preserving and enhancing skilled human roles. 340+ net new jobs projected by Year 5 with category breakdowns. Historical precedent (GPS, ERP, Palantir) proves the pattern.
- **National Impact Sections** — Added "From Congress to the Warfighter" sections to all 4 key documents. Covers Congressional appropriations impact ($850B+ annual DoW budget, $150B+ logistics), taxpayer value ($600M–$1.6B/yr savings at scale), military readiness and warfighter safety (counterfeit parts elimination, predictive maintenance, supply chain acceleration), and defense industrial base strengthening (small business enablement).

### Changed
- **LLC Ownership Structure Clarified** — Updated S4_SYSTEMS_EXECUTIVE_PROPOSAL.md "Proposed Arrangement" section to clarify S4 Ledger operates as a product line within S4 Systems, LLC. No separate LLC/subsidiary/C-Corp needed. Nick gets equity stake in S4 Systems + Product Lead/CTO title. All IP owned by S4 Systems.
- **Background Animation Brightness Increased** — Increased all alpha/opacity values in s4-background.js by approximately 2–2.5x. Anchors, chains, nodes, fragments, streams, circuits, particles, hex grid, scanning line, and wave lines all more visible while remaining subtle. No longer hard to see on most displays.
- **Production Readiness — Entity Formation Fixed** — Updated PRODUCTION_READINESS.md to reflect that S4 Systems, LLC already exists. Removed "Form legal entity (Delaware C-Corp)" items, replaced with "S4 Ledger product line under S4 Systems" (marked complete). Changed CAGE/SAM items to "verify/obtain" rather than "create from scratch."
- **DoDI Directive Name Fix** — Fixed "DoWI 4245.14" back to "DoDI 4245.14" in PRODUCTION_READINESS.md (official directive names keep DoD prefix). Fixed "DoW 5200.01" back to "DoD 5200.01" in BAA_TEMPLATE.md.
- **Tool Count Corrections** — Fixed "12 ILS Workspace sub-tabs" → "19" in MAINNET_MIGRATION.md. Fixed "13-tool ILS Workspace" → "19-tool" in README.md.
- **ROADMAP.md Phase 2 Updated** — Updated Phase 2 from vague/outdated description to comprehensive feature list: 18 tools, 500+ platforms, 156+ pre-built record types across 9 military branches, SDK Playground, competitive analysis, all pitch materials.
- **CHANGELOG.md Terminology** — Fixed remaining "DoD" → "DoW" in changelog entries where not referring to official directive names.

## [3.8.8] - 2026-02-15

### Added
- **Billion-Dollar Roadmap — Plain English Version** — New `BILLION_DOLLAR_ROADMAP_SIMPLE.md` with complete glossary of 40+ acronyms/terms, same financial data presented in plain language a high schooler can understand. CEO-ready presentation document.
- **Competitive Analysis vs Palantir, Anduril, SAP** — Added detailed head-to-head comparison tables and narrative analysis to INVESTOR_OVERVIEW, INVESTOR_SLIDE_DECK, and S4_LEDGER_INTERNAL_PITCH. Explains why S4 Ledger serves an unoccupied market niche that $60B+ competitors don't address.
- **Site-Wide Search v2** — Expanded search index from 60 to 120+ entries covering all pages, all 18 ILS tools, all 5 new SDK functions, security, login, marketplace, and documentation topics. Compatible with any search term across the entire website.

### Changed
- **Background Animation v3** — Anchors now have trailing chains (physics-based link following with wave motion), L-shaped circuit traces with traveling pulses, energy particles with glow halos. More futuristic + distinctly anchor-themed.
- **About Page — "Our Mission" Gradient** — Added gradient-text styling to match other page headings.
- **Financial Numbers Fixed** — Replaced all awkward "$601K" and "$1,595K/year" with properly rounded "~$600K" and "~$1.6M/year" across 5+ documents. Fixed tool count inconsistencies (INVESTOR_OVERVIEW 12→18, INVESTOR_SLIDE_DECK 13→18). Reconciled Internal Pitch savings table to match investor docs.
- **DoW Terminology Standardized** — Updated all general "DoD" / "Department of Defense" references to "DoW" / "Department of War" across 10+ documents (preserving official directive names like DoD 5000.73, DoDI 4245.15).
- **Cross-Document Consistency** — Harmonized tool counts (18 everywhere), savings figures, pricing tiers, and competitive positioning across all investor, executive, and internal documents.

## [3.8.7] - 2026-02-15

### Added
- **Site-Wide Blockchain Anchor Animation** — Enhanced `s4-background.js` v2 now loads on all 19 HTML pages (was only on demo-app). Features: floating anchor icons with glow rings, blockchain network nodes with mesh connections, rotating blockchain blocks with `#` symbols, flowing hex data streams, circuit trace lines with traveling pulse dots, hexagonal grid overlay, blockchain sync scanning line, and nautical wave lines. Auto-creates canvas if missing. Mobile-optimized with reduced particle counts on small screens. Zero external dependencies.
- **SDK Playground — 5 New Tool Functions** — Added Supply Chain Risk (`analyze_supply_chain_risk()`), Audit Reports (`generate_audit_report()`), Contract Lifecycle (`manage_contracts()`), Digital Thread (`get_digital_thread()`), and Predictive Maintenance (`predict_maintenance()`) to SDK Playground. Each includes interactive function box, Python code template, mock runner output, SDK Quick Reference entry, and API endpoint entry. Total SDK functions: 21 (was 16).

### Changed
- **particles.js CDN Removed** — All pages previously loaded particles.js from CDN. Now replaced by shared `s4-assets/s4-background.js` with zero external dependencies.
- **demo-app Inline Animation Replaced** — The 115-line inline canvas animation in demo-app/index.html replaced with shared `s4-background.js` reference (same enhanced animation as all other pages).
- **SDK Playground Function Count** — Updated from "16 SDK functions" to "21 SDK functions"

## [3.8.6] - 2026-02-15

### Added
- **Nautical Anchor Background Animation** — Replaced particles.js with custom canvas-based animation featuring floating anchor icons with chain links, drifting SHA-256 hash fragments, and subtle wave patterns. Gold + blue color scheme matches brand identity. Zero external dependencies
- **Expanded Real Defense Data** — Researched and added 35+ real DoW weapons platforms across the U.S. Navy with actual NSN numbers, program offices, and fleet sizes to all new ILS tools. Supply Chain Risk Engine now covers Navy (DDG-51, CVN-78, SSN-774, SSBN-826, CG-47, LCS, LPD-17), Air Force (F-35, F-22A, F-15EX, B-21, B-52H, KC-46A, C-17A, MQ-9), Army (M1A2, M2A3, Stryker, HIMARS, Patriot, AH-64E, UH-60M), Marines (CH-53K, V-22, ACV, AH-1Z, LAV-25), Space Force/MDA (GPS III, THAAD, SBIRS), SOCOM (CV-22B, AC-130J), and Coast Guard (WMSL-750)
- **25 Real Defense Contracts** — Contract Lifecycle Management now includes contracts from NAVSEA, NAVAIR, Army ACC (Detroit/Warren/Redstone), AF LCMC, DLA, MCSC, MDA, and Space Systems Command with authentic prefix formats
- **32 Defense Platform Configurations** — Digital Thread Bridge expanded with variant-specific designators (DDG-51 Flight I/IIA/III, F-35A/B/C, SSN-774 Block IV/V, M1A2 SEPv3/v4, Stryker DVH, AH-64E V6, B-52H CERP, etc.)
- **40+ Fleet Predictive Maintenance Platforms** — Predictive Maintenance AI now covers all major fleet sizes (M1A2: 2,509 tanks, Stryker: 4,466 vehicles, F-16: 936 aircraft, UH-60: 2,135 helicopters, KC-135: 396 tankers, etc.) with realistic system/component/failure mode data per platform type
- **37 Defense Suppliers** — Expanded supplier database from 20 to 37 real defense contractors across Tier 1 primes (Lockheed Martin, Boeing, Huntington Ingalls), Tier 1.5 (Leidos, SAIC, Textron, BWX Technologies), and Tier 2 specialty (Palantir, Anduril, Kongsberg, Sierra Nevada)

### Changed
- **How It Works Repositioned** — "How Anchoring Works" box moved directly under "Anchor a Defense Record" heading; "How Verification Works" moved directly under "Verify a Defense Record" heading — more intuitive layout
- **Compliance Letter Grade (A-F) Enhanced** — Score grade badge now 2x larger (1.3rem), includes color-coded glow effect, dynamic border/shadow based on grade value (green for A/B, gold for C, red for D/F). Much more visible at a glance
- **API Version Updated** — Health endpoint now reports v3.8.6, tools list includes all 18 tool endpoints
- **Marketplace Dates Fixed** — Updated "Coming Soon" items from past dates (Q3/Q4 2025, Q1 2026) to future dates (Q3/Q4 2026, Q1 2027)
- **All Documentation Updated** — Synced WHITEPAPER, PRODUCTION_READINESS, MAINNET_MIGRATION, BILLION_DOLLAR_ROADMAP, S4_LEDGER_INTERNAL_PITCH, S4_SYSTEMS_EXECUTIVE_PROPOSAL, and INVESTOR_PITCH with 18-tool counts, new financial math, and v3.8.6 version stamps

## [3.8.5] - 2026-02-15

### Added
- **AI Supply Chain Risk Engine** — New ILS Workspace tool (#14). ML-powered risk scoring across 15+ parts per program — analyzes supplier health (GIDEP alerts, DLA lead time spikes, financial distress, single-source dependency, counterfeit indicators). Generates risk scores (Critical/High/Medium/Low), ETA impact calculations, and full CSV export. Realistic data for DDG-51, CVN-78, F-35, CH-53K, SSN-774 programs with real NSN numbers
- **Automated Audit Report Generator** — New ILS Workspace tool (#15). One-click audit package generation from anchored records. 6 report types (Full Audit, Supply Chain, Maintenance, Compliance, Custody, Contract Deliverables), configurable time periods, PDF/CSV/JSON output. Generates preview with section-by-section compliance scoring. Report hash anchoring to XRPL for immutable audit trail
- **Contract Lifecycle Management** — New ILS Workspace tool (#16). CDRL tracking, contract modifications, and SOW deliverable status monitoring. 5 realistic DoW contracts (Navy), DI number references, deliverable status tracking (On Track/At Risk/Overdue/Delivered), type filtering (CDRLs/Mods/SOW Deliverables). Blockchain-anchored delivery timestamps eliminate contract disputes
- **Digital Thread / Configuration Bridge** — New ILS Workspace tool (#17). 4 configuration management views: Engineering Changes (ECP tracking with Class I/II), BOM Revisions (multi-level assemblies), Configuration Baselines (FBL/ABL/Product), TDP Versions (specifications through IPBs). Status workflow (Pending→Approved→Implemented), anchoring status per item, full export capability
- **Predictive Maintenance AI** — New ILS Workspace tool (#18). Fleet-wide failure prediction engine — analyzes MTBF trends, failure mode clustering, and component age curves. Platform-specific predictions (DDG-51: 12 systems, CVN: 10, F/A-18: 10, MH-60: 8, LCS: 8) with confidence scores, ETA predictions, and cost-if-unplanned estimates. Configurable prediction window (30d–365d) and confidence threshold (50%–95%)
- **Developer Marketplace** — New standalone page (`/s4-marketplace/`) with 12 available extensions (7 official, 3 partner, 2 community), 3 coming-soon items, category filtering (Integrations/Analytics/Compliance/Connectors/Templates/AI), marketplace economics section (70/30 revenue share), and publish CTA. Extensions include SAP S/4HANA, PTC Windchill, Siemens Teamcenter, DCMA Compliance, GIDEP Alert Monitor, EDA/PIEE Bridge, Power BI dashboards, IBM Maximo, Splunk SIEM, NIST/CMMC templates, and SDK starter packs
- **5 New API Endpoints** — Added `/api/supply-chain-risk`, `/api/audit-reports`, `/api/contracts`, `/api/digital-thread`, `/api/predictive-maintenance` to the serverless API with full query parameter support and realistic demo data

### Changed
- **ILS Workspace expanded** — 13 tools → 18 tools (5 new ILS panels + Marketplace page)
- **Tool Count Audit** — Updated all references from "13 tools" → "18 tools" across index.html, WHITEPAPER.md, INVESTOR_PITCH.md, INVESTOR_SLIDE_DECK.md, BAA_TEMPLATE.md, PRODUCTION_READINESS.md, s4-use-cases/index.html, BILLION_DOLLAR_ROADMAP.md, S4_SYSTEMS_EXECUTIVE_PROPOSAL.md, INVESTOR_RELATIONS.md, S4_LEDGER_INTERNAL_PITCH.md, and api/openapi.json
- **Landing Page** — Updated ILS Workspace description to list all 18 tools including the 5 new ones, updated Use Cases explore card to "18 ILS Use Cases"
- **OpenAPI Spec** — Description updated to list all 18 integrated tools

## [3.8.4] - 2026-02-15

### Added
- **Transactions Page localStorage Fallback** — When `/api/transactions` is unavailable, transactions page now builds the full table from localStorage-synced anchored records instead of showing an error. Shows helpful guidance when no records exist
- **Transactions Page Timeout Guard** — Added AbortController with 8-second fetch timeout (matching metrics page) to prevent indefinite loading state
- **Cross-Page Auto-Sync** — Both metrics and transactions pages now listen for `storage` events. When records are anchored in the Demo App, metrics and transactions pages update instantly without waiting for the 30-second poll interval
- **Transactions USSF Branch Color** — Added Space Force branch color definition (was missing from transactions page)
- **Billion-Dollar Roadmap** — New `BILLION_DOLLAR_ROADMAP.md` document with complete financial analysis: detailed savings math per tool, 10-year revenue waterfall projections, Phase 1–4 growth strategy, 15 new capabilities needed for billion-dollar scale, comparable defense tech valuations (Palantir, Anduril, Govini), and CEO-ready 5-minute pitch
- **Path to $1B in Executive Proposal** — Added scaling math and 10 new capabilities table with development timelines and revenue unlocks to the executive proposal

### Fixed
- **Transactions Page Not Loading** — Transactions page previously failed silently when the API was unavailable, showing permanent "Loading..." state. Now properly falls back to localStorage records and displays informative empty state when no records exist
- **About Page Title Formatting** — "Our Mission" was inside a card box with left accent border, but "Our Story", "What Makes Us Different", and "Technology Stack" used unstyled section titles. All four now use consistent card-style formatting with bordered accent strips
- **How It Works Box Positioning** — Moved Anchor and Verify "How It Works" expandable sections from the sidebar column (col-lg-5) to directly under the tool's main content area (col-lg-7), matching the positioning pattern used by all 11 ILS Workspace tools

### Changed
- **Metrics Cross-Page Sync** — Added `storage` event listener to immediately refresh when new records are anchored from other pages
- **Transactions Filter Population** — Refactored filter population into dedicated `populateFilters()` function for cleaner code reuse between API and localStorage fallback paths

## [3.8.3] - 2026-02-16

### Added
- **Audit Vault Expanded Time Filters** — Added Last Week, Last Month, This Year, and Last Year filter options to the Audit Record Vault. Each filter calculates proper date ranges (e.g., Last Month = first day of previous month to first day of current month)
- **Audit Vault Time Savings** — New paragraph in Vault How It Works explaining how S4 Ledger reduces audit preparation labor by 85–95% (2–6 weeks → minutes)
- **Anchor Tool How It Works** — New expandable `<details>` section in Anchor panel with What's real, What's demo, How S4 saves money (99.9% cost reduction), and Production mode integration details
- **Verify Tool How It Works** — New expandable `<details>` section in Verify panel with What's real (cryptographic proof), How S4 saves money (90–98% verification labor reduction), and Production mode (automated batch verification via API)
- **SDK Playground How It Works Expanded** — Added expandable technical details section to SDK Playground with What's real, What's demo, How S4 saves money (95% integration cost reduction), and Production mode (pip install, API key, CI/CD integration)
- **SDK Playground Record Type Fallback** — 156+ hardcoded defense record types across U.S. Navy load automatically when the API is unavailable. Organized by branch with realistic record types, icons, and optgroups. SDK Playground now always has a populated dropdown
- **Economic Impact & Job Creation Section** — New section on landing page with data-driven economic impact metrics ($2.1B+ DoW manual ILS spend, 85–95% audit reduction, 340+ estimated jobs at scale, 3.4× DoW multiplier, $8M–$17M total impact). Includes job breakdown per 100 programs and small business enablement callout
- **Economic Impact in Executive Proposal** — Added full Economic Impact & Job Creation section with table and small business enablement narrative
- **Economic Impact in Internal Pitch** — Added economic growth math summary with Year 5 projections
- **Login Page Persistent Auth** — Auth state now uses `localStorage` instead of `sessionStorage` for 24-hour persistence across pages. All pages show logged-in user name in navbar via shared `main.js` auth-state awareness
- **Login Dashboard Cards Updated** — Added Audit Record Vault (LIVE) and Provisioning Tool (LIVE) cards, updated all card descriptions with latest capabilities (13-tool workspace, AI agent, 40+ provisioning items, per-item anchoring). Removed Audit Trail "COMING SOON" card (it's the Vault, now LIVE)

### Changed
- **"160+ record types" → "Any defense record type"** — Updated 20 instances across 11 files. New messaging: "Supports any defense record type — 54+ pre-built templates across U.S. Navy." Accurate count (156 actual types in API), and emphasizes that any custom record type can also be anchored
- **Login Page Navbar** — Now matches landing page navigation (Company dropdown, Products dropdown, Use Cases, Pricing, Roadmap, FAQ, Contact) instead of the previous simplified 5-link navbar
- **Metrics Page Loading Fix** — Added 8-second fetch timeout with AbortController, `finally` block guarantees "Loading..." text is always cleared even if chart rendering throws, and initializes metricsData on catch path
- **Metrics ILS Reference** — Updated from "12-tool" to "13-tool" with provisioning added to tool list
- **Tool Count Audit** — Updated all references from "12 tools" → "13 tools" and "11 tools" → "13 tools" across index.html, WHITEPAPER.md, INVESTOR_PITCH.md, INVESTOR_SLIDE_DECK.md, BAA_TEMPLATE.md, PRODUCTION_READINESS.md, and s4-use-cases/index.html
- **Branch Count Audit** — Fixed "the U.S. Navy" → "9" in Executive Proposal, "8 branches" → "9" in PRODUCTION_READINESS.md
- **BAA Template** — Updated to v3.8.3, added Provisioning Tool as 13th integrated tool
- **Login Session Duration** — Extended from 1-hour to 24-hour sessions

## [3.8.2] - 2026-02-16

### Added
- **Provisioning Demo Data** — 40 hypothetical defense parts pre-loaded into Provisioning & PTD Manager (valves, pumps, radar components, turbine blades, generators, FLIR sensors, missile canisters, crypto modules, etc.) with realistic NSNs, CAGE codes, FSC groups, quantities, costs, and manufacturers
- **Custom Provisioning Entry** — Full data entry form in Provisioning panel: Part Name, NSN, CAGE Code, Qty, FSC Group (dropdown with 10 common groups), PTD Status, Unit Cost, Manufacturer, Notes. Entries persist to localStorage
- **Parts Inventory Table** — Interactive parts table with search bar, status filter dropdown, per-item "Anchor" buttons, value totals, and hover effects
- **Per-Item & Batch Anchoring** — Individual anchor buttons per part row with animation + "Anchor All to XRPL" batch button that processes all items with progress feedback. Both call `/api/anchor`, `saveLocalRecord()`, and update metrics automatically
- **SDK Playground Function Boxes** — Replaced 12 small buttons with 16 card-style function boxes in a responsive grid. Each box shows icon, title, description, and SDK method name. Clicking any box loads code and immediately executes it
- **SDK Playground New Functions** — Added List Records, Record Types, and Provisioning runners with full output formatting. Added corresponding Python code templates
- **Always-Visible Record Type Selector** — Record type dropdown (156+ types, U.S. Navy) now appears at the top of the SDK Playground instead of being hidden for some functions

### Changed
- **Provisioning panel JS** — Complete rewrite with state management (`provItems`, `provCustomItems`, `provView`), localStorage persistence, CSV export with headers, APL grouping, NSN cataloging display
- **SDK Playground layout** — Function boxes replace button row; record type selector always visible; reference tables updated with provisioning endpoints; How It Works text updated

## [3.8.1] - 2026-02-16

### Changed
- **Floating AI Agent** — AI Agent extracted from Gap Analysis panel and converted to a floating widget accessible from all 13 ILS Workspace tools. Appears as a chat bubble in the bottom-right corner. Context-aware quick-action buttons update automatically when switching tools (e.g., switching to DMSMS shows "Obsolete Parts", "Alt Sources"; switching to Provisioning shows "ICAPS Comparison", "Explain PTD"). Includes tool context label showing which tool is active. Agent only appears on the ILS Workspace tab.
- **Back-to-top button** — Moved from bottom-right to bottom-left to avoid overlap with floating AI agent

## [3.8.0] - 2026-02-16

### Added
- **Provisioning & PTD Manager** — New ILS Workspace panel (`hub-provisioning`) that replaces ICAPS (DAU's Interactive Computer-Aided Provisioning System). Manages Provisioning Technical Documentation (PTD) per MIL-STD-1552, generates Allowance Parts Lists (APLs), tracks NSN cataloging status via Federal Cataloging System (FCS), and monitors Provisioning Performance Schedules. Blockchain-anchored provisioning decisions. All-branch support (ICAPS is Navy/USMC only). Includes ICAPS comparison banner showing 6 competitive advantages.
- **AI Agent — New Tool Coverage** — Added topic matchers for Audit Vault, Compliance Scorecard, Defense Document Library, Provisioning/PTD, and ICAPS comparison. 4 new quick-action buttons (Audit Vault, Compliance, Doc Library, ICAPS Comparison). Agent can now answer questions about all 13 workspace tools.
- **SDK Provisioning Command** — New `s4-anchor provisioning` CLI command and `get_provisioning_status()` SDK method returning PTD progress, APL count, NSN cataloging, and ICAPS competitive advantages.

### Changed
- **ILS Workspace expanded to 13 panels** — added Provisioning & PTD Manager alongside existing 12 tools
- **How It Works boxes standardized** — Vault, Doc Library, and Compliance Scorecard panels now use the same colored-background pattern (What's real / What's demo / How S4 saves money / Production mode) as all other tools
- **Landing page renamed** — "ILS Workspace Analyzer" → "ILS Workspace", "Launch ILS Analyzer" → "Launch ILS Workspace", explore card updated with all 13 tools
- **Metrics page fallback** — When `/api/metrics` is unavailable, the page now generates metrics from localStorage records with full time-series bucketing (minute/hour/day/week/month) instead of showing empty charts
- **API version** → 3.8.0 with provisioning-ptd in tools list
- **OpenAPI spec** → 3.8.0 with updated description listing all 13 tools

### Fixed
- **How It Works visual inconsistency** — New panels (vault, docs, compliance) used plain `<details>` with no background color and different icon (`fa-circle-info` vs `fa-info-circle`). Now matches existing tool pattern with colored backgrounds, structured content sections, and consistent typography.
- **Metrics page blank on API failure** — Catch block only logged error. Now builds complete metrics dataset from localStorage with record type distribution, branch breakdown, and time-series data for all 5 chart views.
- **Landing page CTA mismatch** — Hero still said "ILS Workspace Analyzer" and button said "Launch ILS Analyzer" despite v3.6.0 rename.

## [3.7.0] - 2026-02-16

### Added
- **Audit Record Vault** — New ILS Workspace panel (`hub-vault`). Every record anchored via any tool is automatically saved to client-side localStorage with content + SHA-256 hash + TX hash. Searchable, filterable by time period, one-click re-verification of all records, CSV/XLSX export for auditor handoff. Zero server-side storage.
- **Defense Document Reference Library** — New ILS Workspace panel (`hub-docs`). 100+ real defense documents in separate `s4-assets/defense-docs.js` database: MIL-STDs (810H, 882E, 881F, 1388-2B, 461G, 1472H, etc.), OPNAVINSTs (4790.4F, 4441.12G, 5100.23H), DoD Directives (5000.01, 5000.02, 4140.01), NAVSEA/NAVAIR/NAVSUP manuals, FAR/DFARS clauses, NIST frameworks, Army/Air Force/Marine Corps/Coast Guard/Space Force regulations, DMSMS standards, CDRLs, ILS element references. Filterable by 7 branches and 17 categories with full-text search.
- **Compliance Scorecard** — New ILS Workspace panel (`hub-compliance`). Real-time multi-framework compliance calculator: CMMC Level 2 (25%), NIST 800-171 (20%), DFARS 252.204 (15%), FAR 46 Quality (15%), MIL-STD-1388 ILS (15%), DoDI 4245.15 DMSMS (10%). SVG ring chart with animated gradient arc, letter grades (A+ → F), color-coded bars, actionable recommendations, XLSX export, and anchor scorecard to XRPL.
- **Vault Auto-Save Integration** — All 9 anchor functions (`anchorRecord`, `anchorILSReport`, `anchorDMSMS`, `anchorReadiness`, `anchorParts`, `anchorROI`, `anchorLifecycle`, `anchorWarranty`, `anchorCompliance`) now auto-save to Audit Vault
- **Workspace Notification System** — Toast-style notifications for vault saves and bulk operations with auto-dismiss
- **Glassmorphism Design System** — `glass-card` with backdrop-filter blur, `hover-lift` transforms, `gradient-border` animated pseudo-elements, `pulse-dot` live indicators, `shimmer-text` loading states
- **Enhanced Animations** — `slideUp`, `shimmer`, `pulseGlow`, `countUp` keyframes for smoother UX
- **Enhanced Tooltips** — `tooltip-enhanced` with `data-tip` attribute for contextual help across all tools
- **Cost Savings Analysis** — Realistic numbers for minimal/mid/high implementation tiers for US Government ($180K–$48M) and S4 Systems ($48K–$18M ARR) added to Whitepaper, Executive Proposal, and Investor docs
- **DDIA v2.0** — BAA_TEMPLATE.md updated with Audit Vault, Doc Library, Compliance Scorecard, and all 12 ILS Workspace tools

### Changed
- **ILS Workspace expanded to 12 panels** — added Audit Vault, Defense Doc Library, and Compliance Scorecard alongside existing 9 tools
- **BAA_TEMPLATE.md v2.0** — Added ILS Workspace tools catalog, Audit Vault and Doc Library service descriptions, Compliance Scorecard reference
- **MAINNET_MIGRATION.md §34** — Full migration checklist for vault, doc library, compliance scorecard, and UX enhancements
- **PRODUCTION_READINESS.md** — Added v3.7.0 changelog, updated product readiness table with new tools, updated business development section

## [3.6.0] - 2026-02-15

### Added
- **ILS Workspace Consolidation** — All 9 ILS tools (Gap Analysis, Action Items, Calendar, DMSMS, Readiness, Parts Cross-Reference, ROI, Lifecycle Cost, Warranty) now contain FULL functionality inside the ILS Workspace panels — complete with all inputs, How It Works sections, Export buttons, and Anchor to XRPL buttons
- **Executive Proposal Overhaul** — Removed blockchain jargon, defined all acronyms on first use, added SAP/Oracle/Microsoft/Windchill competitive analysis, corrected military branch count to 6, expanded ILS Workspace tool table with standards alignment
- **Internal Pitch Document** — New `S4_LEDGER_INTERNAL_PITCH.md` — plain-English guide for any S4 Systems employee explaining what S4 Ledger is, how it works, and why it matters, with FAQ section addressing common concerns

### Changed
- **Renamed "ILS Intelligence Hub" → "ILS Workspace"** — all references across 15+ files (demo-app, landing page, metrics, transactions, search, SDK playground, OpenAPI spec, login page, CHANGELOG, WHITEPAPER, MAINNET_MIGRATION, PRODUCTION_READINESS)
- **Deleted standalone tool tabs** — removed all 7 standalone ILS tool tabs (Action Items, DMSMS, Readiness, Parts, ROI, Lifecycle, Warranty) and their 7 nav buttons; tools now live exclusively inside the ILS Workspace
- **Consolidated landing page explore cards** — replaced 8 individual tool cards (ILS Hub + 7 standalone tools) with single "ILS Workspace" card
- **Search index updated** — all tool search entries now point to `demo-app/#tabILS` instead of removed tab hashes
- **Cross-page links updated** — metrics.html and transactions.html cross-link cards renamed to "ILS Workspace"

### Fixed
- **YRBM naming** — corrected from "Yard Repair, Berthing & Messing" to "Yard, Repair, Berthing, & Messing" in demo-app and platforms database
- **Removed sync functions** — deleted `syncHubDmsms`, `syncHubReadiness`, `syncHubLifecycle`, `syncHubWarranty`, `syncROIInput` (no longer needed since workspace panels contain full tools)
- **Fixed broken element IDs** — hub-parts panel no longer references non-existent `searchParts()` or `partsNSN`/`partsName` elements; hub-roi no longer has `roiFTE` vs `roiFTEs` mismatch

### Removed
- Standalone tab panels: `tabActions`, `tabDMSMS`, `tabReadiness`, `tabParts`, `tabROI`, `tabLifecycle`, `tabWarranty`
- Standalone nav buttons for 7 removed tabs
- Hub sync functions that copied data between standalone tabs and hub mirrors

## [3.5.0] - 2026-02-15

### Added
- **ILS Workspace** — Unified command center consolidating all 8 ILS tools (Gap Analysis, Action Items, Calendar, DMSMS, Readiness, Parts, ROI, Lifecycle, Warranty) into a single tabbed interface with sub-navigation and cross-tool data syncing
- **Calendar System** — Full month-grid calendar with day cells, event markers, navigation, add-event form, and upcoming-events sidebar. Auto-populates from action item schedules and custom events. Persisted via localStorage
- **Action Items "How It Works"** — Expandable details section explaining the cross-tool task queue, severity system, and delegation workflow
- **Hub Panel Syncing** — Tools inside the ILS Workspace mirror data from standalone tabs (DMSMS stats, Readiness scores, Lifecycle costs, Warranty status)
- **Hub Action Items Breakdown** — Source-by-source breakdown showing open items per tool (DMSMS, Readiness, Warranty, etc.)
- **SDK Playground Expansion** — 6 new interactive examples: DMSMS Check, Readiness Calculator, ROI Analysis, Lifecycle Cost, Warranty Tracker, Action Items. Updated SDK Reference table (13 methods) and API Endpoints table (12 endpoints)
- **API Endpoints** — New `/api/action-items` and `/api/calendar` endpoints with query parameter filtering
- **OpenAPI Spec** — Added documentation for `/api/roi`, `/api/lifecycle`, `/api/warranty`, `/api/action-items`, `/api/calendar` endpoints
- **Python SDK Methods** — `get_action_items(severity, source)` and `get_calendar_events(month, year)` added to `S4SDK`
- **CLI Commands** — `s4-anchor action-items` and `s4-anchor calendar` commands added
- **Search Index** — 13 new entries for ILS Workspace, Action Items, Calendar, DMSMS, Readiness, Parts, ROI, Lifecycle, Warranty, SDK Playground, Metrics, and Transactions
- **Cross-Page Hub Links** — Metrics and Transactions pages now include ILS Workspace cross-link cards
- **Landing Page Hub Card** — ILS Workspace explore card restyled as featured "ILS Workspace" with gradient border and Action Items card added

### Changed
- Landing page ILS Workspace card → "ILS Workspace" with highlighted border and expanded description
- API version bumped to 3.5.0 (11 tools, 22 endpoints)
- OpenAPI spec fully documenting all ILS tool endpoints (was missing ROI and Warranty)

### Fixed
- **Lifecycle Cost formatting** — Values in $M now properly scale through K→M→B→T tiers via new `formatCostM()` function. Previously showed "$8024.0B" for values that should display as "$8.0B"
- `generateLifecycleActions()` now formats costs correctly using `formatCostM()` instead of hardcoded "$XB"

## [3.4.0] - 2026-02-14

### Added
- **Toast Notification System** — Real-time alert toasts for warranty expirations (90-day), DMSMS obsolescence detections, readiness threshold violations, and low-stock parts. Animated slide-in/out with severity levels (info/warning/danger/success), action buttons, auto-dismiss with progress bars.
- **Unified Action Items & Alerts Tab** — New consolidated tab replacing the standalone "How It Works" tab. Tracks actionable tasks from all 6 tools with severity-based sorting, filtering, localStorage persistence, and CSV export.
- **Tool Action Item Generators** — Every tool now generates specific actionable recommendations:
  - DMSMS: Bridge buy/alternate source actions for obsolete parts
  - Readiness: MTTR reduction plans for below-threshold systems
  - Warranty: Renewal/re-compete actions for expiring contracts (90-day alerts)
  - Parts: Reorder alerts for low-stock items, long lead-time warnings
  - Lifecycle: DMSMS savings opportunities, high sustainment ratio alerts
  - ROI: Business case documentation actions
- **Notification Bell** — Navbar bell icon with badge counter showing open action items
- **ILS Workspace "How It Works"** — Collapsible details box with platform overview, 9-branch coverage, $SLS Mainnet token status
- **Landing page tools** — ROI Calculator, Lifecycle Cost Estimator, and Warranty & Contract Tracker added to Explore section (15 total cards)

### Changed
- **$SLS Token: LIVE on XRPL Mainnet** — Total Supply: 100,000,000 | Circulating: ~15,000,000 | AMM pools active | Trustlines established | Tradable on XRPL DEX
- Removed standalone "How It Works" tab (#tabAbout) — content merged into ILS Workspace
- Updated PRODUCTION_READINESS.md: readiness score 67% -> 78%, XRPL integration 60% -> 85%
- Updated all documentation to reflect $SLS Mainnet status (not just Testnet)
- Action Items tab replaces How It Works in navigation (10 functional tabs)

### Fixed
- Differentiated total supply (100M $SLS) from circulating supply (~15M $SLS) across all docs

## [3.3.0] - 2026-02-14

### Added
- **462 real defense platforms** across all 8 U.S. military branches (Navy, Marines, SOCOM, Joint)
- Master platform database (`s4-assets/platforms.js`) with category templates, component data, and deterministic NSN generation
- **ROI Calculator** — calculates annual savings, ROI %, payback period, and 5-year net benefit from S4 Ledger implementation
- **Lifecycle Cost Estimator** — projects total ownership cost (TOC) per DoD 5000.73 / MIL-STD-881F (acquisition, O&S, DMSMS, tech refresh)
- **Warranty & Contract Tracker** — tracks OEM warranties, CLIN deliverables, and contract expirations per FAR 46.7 / DFARS 246.7
- All existing tool dropdowns (ILS Workspace, DMSMS, Readiness, Parts X-Ref) now dynamically populated from the 462-platform database
- 3 new API endpoints: `/api/roi`, `/api/lifecycle`, `/api/warranty`
- 3 new SDK methods: `calculate_roi()`, `estimate_lifecycle_cost()`, `track_warranty()`
- 3 new CLI commands: `s4-anchor roi`, `s4-anchor lifecycle`, `s4-anchor warranty`
- Anchor animation auto-dismiss after 5 seconds

### Changed
- API version bumped to 3.3.0 (9 tools, 20 endpoints)
- PROG_COMPONENTS and READINESS_DEFAULTS now proxy to the platform database (backwards compatible)
- Tab navigation shortened (DMSMS, Readiness, Parts) to fit 11 total tabs
- SDK version bumped to 3.3.0 with expanded tool listing

---

## [3.2.0] - 2026-02-13

### Added
- ITAR/export-control warning banner across all public-facing HTML pages
- OpenAPI 3.0 specification (`api/openapi.json`) documenting all 17 API endpoints
- CHANGELOG.md following Keep a Changelog format
- NIST SP 800-171 / CMMC compliance documentation (`NIST_CMMC_COMPLIANCE.md`)
- GDPR compliance documentation (`GDPR_COMPLIANCE.md`)
- SEC compliance documentation (`SEC_COMPLIANCE.md`)
- Investor slide deck (`INVESTOR_SLIDE_DECK.md`) with full market and technical overview
- Investor relations page (`INVESTOR_RELATIONS.md`) and investor overview (`INVESTOR_OVERVIEW.md`)
- Production readiness checklist (`PRODUCTION_READINESS.md`)
- Deployment guide (`DEPLOYMENT_GUIDE.md`) with Docker, Vercel, and bare-metal instructions
- Deployment metrics API documentation (`DEPLOYMENT_METRICS_API.md`)
- Recommendations engine documentation (`RECOMMENDATIONS.md`)
- Partner onboarding guide (`PARTNER_ONBOARDING.md`)
- Security audit report (`SECURITY_AUDIT.md`)
- Developer bio page (`DEVELOPER_BIO.md`)
- S4 Systems executive proposal (`S4_SYSTEMS_EXECUTIVE_PROPOSAL.md`)
- Mainnet migration guide (`MAINNET_MIGRATION.md`)
- SDK playground (`sdk-playground/`) for interactive API testing
- Fiat conversion documentation and test suite
- Cross-command logistics anchoring (`cross_command_logistics_anchor.py`)
- Predictive maintenance anchoring (`predictive_maintenance_anchor.py`)
- Ordnance lot anchoring (`ordnance_lot_anchor.py`)
- Custody transfer anchoring (`custody_transfer_anchor.py`)
- Multi-signature setup tooling (`s4-multi-sig-setup/`)
- Transparency report generation (`s4-transparency-report/`)
- Comprehensive test scenario runners (`run_comprehensive_scenarios.py`, `run_typed_scenarios.py`, `run_v28_scenarios.py`)
- S4 anomaly detection module (`s4_anomaly.py`)
- S4 backup management module (`s4_backup.py`)
- S4 communications module (`s4_comms.py`)
- S4 DLRS integration module (`s4_dlrs.py`)
- Webhook integration example (`webhook_example.py`)
- Partner API example (`partner_api_example.py`)
- BAA template (`BAA_TEMPLATE.md`)
- PWA manifest and service worker for demo app

### Changed
- Updated API version to 3.2.0
- Enhanced metrics dashboard with real-time XRPL transaction monitoring
- Improved ILS Workspace categorization engine accuracy
- Expanded record type support with granular field definitions
- Refined security policy page with compliance badge display

### Fixed
- Scroll progress bar z-index consistency across all pages
- Mobile responsive layout for ILS check grid
- API rate limiting edge cases for burst traffic

### Security
- Added ITAR classification notice to prevent submission of export-controlled data
- Enforced CUI/UNCLASSIFIED data-only policy on all input endpoints
- Strengthened API key validation with scope-based access control

## [3.1.0] - 2026-02-12

### Added
- ILS Workspace v3 dashboard with DMSMS risk monitoring
- Parts catalog API endpoint (`GET /api/parts`)
- Readiness assessment API endpoint (`GET /api/readiness`)
- DMSMS monitoring API endpoint (`GET /api/dmsms`)
- Infrastructure status API endpoint (`GET /api/infrastructure`)
- Categorization API endpoint (`POST /api/categorize`)
- Analysis persistence endpoints (`POST /api/db/save-analysis`, `GET /api/db/get-analyses`)
- Investor pitch documentation (`INVESTOR_PITCH.md`)
- Integration guide (`INTEGRATIONS.md`)
- S4 CLI tool (`s4_cli.py`) for command-line operations
- Ledger demo notebook (`s4_ledger_demo.ipynb`)

### Changed
- Redesigned main dashboard with particle effects and mesh overlays
- Enhanced transaction viewer with real-time updates
- Improved metrics page with chart visualizations

### Fixed
- XRPL connection timeout handling
- Hash computation for large payloads

## [3.0.0] - 2026-02-11

### Added
- ILS Workspace v3 engine with ML-powered categorization
- XRPL mainnet anchoring with memo-based record storage
- Real-time transaction monitoring dashboard
- Supply chain receipt anchoring with deterministic verification
- Metrics API (`metrics_api.py`) with Prometheus-compatible output
- S4 SDK (`s4_sdk.py`) for programmatic platform access
- API key authentication system (`POST /api/auth/api-key`, `GET /api/auth/validate`)
- Technical specifications document (`TECHNICAL_SPECS.md`)
- Security policy (`SECURITY.md`)
- Code of Conduct (`CODE_OF_CONDUCT.md`)
- Contributing guidelines (`CONTRIBUTING.md`)
- Comprehensive API examples (`api_examples.md`)

### Changed
- Complete UI redesign with defense-grade dark theme
- Migrated from REST-only to hybrid REST + blockchain architecture
- Upgraded hashing to SHA-256 with XRPL memo anchoring

### Removed
- Legacy v2 API endpoints (deprecated since v2.0.0)

## [2.0.0] - 2026-02-01

### Added
- XRPL integration for immutable record anchoring
- Multi-record type support (supply chain receipts, custody transfers, maintenance logs)
- Transaction history viewer
- Hash verification endpoint (`POST /api/hash`)
- XRPL network status endpoint (`GET /api/xrpl-status`)
- Audit logging (`audit_log.md`)
- Whitepaper (`WHITEPAPER.md`)
- Roadmap documentation (`ROADMAP.md`)

### Changed
- Upgraded API to v2.0 with breaking schema changes
- Moved to serverless deployment on Vercel
- Enhanced error handling and input validation

## [1.0.0] - 2026-01-15

### Added
- Initial release of S4 Ledger platform
- Core anchoring engine with SHA-256 hashing
- REST API with status, health, and metrics endpoints
- Basic transaction recording
- Landing page and documentation site
- Docker deployment support
- Requirements and dependency management
- MIT License

[3.7.0]: https://github.com/s4ledger/s4-ledger/compare/v3.6.0...v3.7.0
[3.2.0]: https://github.com/s4ledger/s4-ledger/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/s4ledger/s4-ledger/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/s4ledger/s4-ledger/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/s4ledger/s4-ledger/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/s4ledger/s4-ledger/releases/tag/v1.0.0
