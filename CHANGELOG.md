# Changelog

All notable changes to the S4 Ledger project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **TECHNICAL_SPECS.md Enriched** — Added REST API Endpoints section (7 endpoints with paths, methods, descriptions), ILS Workspace section (18 tools listed with categories), SDK function count (21), record type count (156+), pre-loaded entity count (500+: 462 platforms + 37 suppliers + 25 contracts). Version bumped to 3.9.0. Added S4 Systems, LLC attribution.
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
- **Key Metrics Enrichment** — All investor documents now include: 21 SDK functions, 7 REST API endpoints, 500+ pre-loaded military entities (462 platforms + 37 suppliers + 25 contracts), 156+ record types, ~$600K–$1.6M per-program savings, 10–100x ROI, pricing tiers ($499–$4,999/mo).
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
- **Tool Count Corrections** — Fixed "12 ILS Workspace sub-tabs" → "18" in MAINNET_MIGRATION.md. Fixed "13-tool ILS Workspace" → "18-tool" in README.md.
- **ROADMAP.md Phase 2 Updated** — Updated Phase 2 from vague/outdated description to comprehensive feature list: 18 tools, 500+ platforms, 156+ record types, SDK Playground, competitive analysis, all pitch materials.
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
- **Expanded Real Defense Data** — Researched and added 35+ real DoW weapons platforms across all branches with actual NSN numbers, program offices, and fleet sizes to all new ILS tools. Supply Chain Risk Engine now covers Navy (DDG-51, CVN-78, SSN-774, SSBN-826, CG-47, LCS, LPD-17), Air Force (F-35, F-22A, F-15EX, B-21, B-52H, KC-46A, C-17A, MQ-9), Army (M1A2, M2A3, Stryker, HIMARS, Patriot, AH-64E, UH-60M), Marines (CH-53K, V-22, ACV, AH-1Z, LAV-25), Space Force/MDA (GPS III, THAAD, SBIRS), SOCOM (CV-22B, AC-130J), and Coast Guard (WMSL-750)
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
- **Contract Lifecycle Management** — New ILS Workspace tool (#16). CDRL tracking, contract modifications, and SOW deliverable status monitoring. 5 realistic DoW contracts (Navy, Air Force, Army), DI number references, deliverable status tracking (On Track/At Risk/Overdue/Delivered), type filtering (CDRLs/Mods/SOW Deliverables). Blockchain-anchored delivery timestamps eliminate contract disputes
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
- **SDK Playground Record Type Fallback** — 156+ hardcoded defense record types across 9 branches load automatically when the API is unavailable. Organized by branch with realistic record types, icons, and optgroups. SDK Playground now always has a populated dropdown
- **Economic Impact & Job Creation Section** — New section on landing page with data-driven economic impact metrics ($2.1B+ DoW manual ILS spend, 85–95% audit reduction, 340+ estimated jobs at scale, 3.4× DoW multiplier, $8M–$17M total impact). Includes job breakdown per 100 programs and small business enablement callout
- **Economic Impact in Executive Proposal** — Added full Economic Impact & Job Creation section with table and small business enablement narrative
- **Economic Impact in Internal Pitch** — Added economic growth math summary with Year 5 projections
- **Login Page Persistent Auth** — Auth state now uses `localStorage` instead of `sessionStorage` for 24-hour persistence across pages. All pages show logged-in user name in navbar via shared `main.js` auth-state awareness
- **Login Dashboard Cards Updated** — Added Audit Record Vault (LIVE) and Provisioning Tool (LIVE) cards, updated all card descriptions with latest capabilities (13-tool workspace, AI agent, 40+ provisioning items, per-item anchoring). Removed Audit Trail "COMING SOON" card (it's the Vault, now LIVE)

### Changed
- **"160+ record types" → "Any defense record type"** — Updated 20 instances across 11 files. New messaging: "Supports any defense record type — 156+ pre-built templates across 9 branches." Accurate count (156 actual types in API), and emphasizes that any custom record type can also be anchored
- **Login Page Navbar** — Now matches landing page navigation (Company dropdown, Products dropdown, Use Cases, Pricing, Roadmap, FAQ, Contact) instead of the previous simplified 5-link navbar
- **Metrics Page Loading Fix** — Added 8-second fetch timeout with AbortController, `finally` block guarantees "Loading..." text is always cleared even if chart rendering throws, and initializes metricsData on catch path
- **Metrics ILS Reference** — Updated from "12-tool" to "13-tool" with provisioning added to tool list
- **Tool Count Audit** — Updated all references from "12 tools" → "13 tools" and "11 tools" → "13 tools" across index.html, WHITEPAPER.md, INVESTOR_PITCH.md, INVESTOR_SLIDE_DECK.md, BAA_TEMPLATE.md, PRODUCTION_READINESS.md, and s4-use-cases/index.html
- **Branch Count Audit** — Fixed "6 military branches" → "9" in Executive Proposal, "8 branches" → "9" in PRODUCTION_READINESS.md
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
- **Always-Visible Record Type Selector** — Record type dropdown (156+ types, 9 branches) now appears at the top of the SDK Playground instead of being hidden for some functions

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

[3.7.0]: https://github.com/s4ledger/s4-ledger/compare/v3.6.0...v3.7.0
[3.2.0]: https://github.com/s4ledger/s4-ledger/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/s4ledger/s4-ledger/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/s4ledger/s4-ledger/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/s4ledger/s4-ledger/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/s4ledger/s4-ledger/releases/tag/v1.0.0
