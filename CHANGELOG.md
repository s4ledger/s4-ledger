# Changelog

All notable changes to the S4 Ledger project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.8.2] - 2026-02-16

### Added
- **Provisioning Demo Data** — 40 hypothetical defense parts pre-loaded into Provisioning & PTD Manager (valves, pumps, radar components, turbine blades, generators, FLIR sensors, missile canisters, crypto modules, etc.) with realistic NSNs, CAGE codes, FSC groups, quantities, costs, and manufacturers
- **Custom Provisioning Entry** — Full data entry form in Provisioning panel: Part Name, NSN, CAGE Code, Qty, FSC Group (dropdown with 10 common groups), PTD Status, Unit Cost, Manufacturer, Notes. Entries persist to localStorage
- **Parts Inventory Table** — Interactive parts table with search bar, status filter dropdown, per-item "Anchor" buttons, value totals, and hover effects
- **Per-Item & Batch Anchoring** — Individual anchor buttons per part row with animation + "Anchor All to XRPL" batch button that processes all items with progress feedback. Both call `/api/anchor`, `saveLocalRecord()`, and update metrics automatically
- **SDK Playground Function Boxes** — Replaced 12 small buttons with 16 card-style function boxes in a responsive grid. Each box shows icon, title, description, and SDK method name. Clicking any box loads code and immediately executes it
- **SDK Playground New Functions** — Added List Records, Record Types, and Provisioning runners with full output formatting. Added corresponding Python code templates
- **Always-Visible Record Type Selector** — Record type dropdown (160+ types, 9 branches) now appears at the top of the SDK Playground instead of being hidden for some functions

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
- **462 real defense platforms** across all 8 U.S. military branches (Navy, Army, Air Force, Space Force, Coast Guard, Marines, SOCOM, Joint)
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

[3.7.0]: https://github.com/solus-protocol/s4-ledger/compare/v3.6.0...v3.7.0
[3.2.0]: https://github.com/solus-protocol/s4-ledger/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/solus-protocol/s4-ledger/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/solus-protocol/s4-ledger/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/solus-protocol/s4-ledger/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/solus-protocol/s4-ledger/releases/tag/v1.0.0
