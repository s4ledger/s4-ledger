# S4 Ledger — Upgrade Locations Guide (v5.6.0)

> Use this document to visually verify every upgrade on the live site.  
> Last updated: February 24, 2026 (afternoon session included)

---

## PLATFORM ARCHITECTURE

The platform uses a **Hub → Section → Tab** navigation model:

- **Landing Page** — hero, feature cards, footer (public-facing)
- **Platform Hub** — 4 hub cards: Verify Records, Transaction Log, Anchor-S4 (ILS), Systems
- **Anchor-S4 ILS** — sub-hub with 14 tool cards, each opening a full-page tool panel
- **AI Agent** — floating chat widget accessible from all ILS tools
- **Wallet** — slide-in sidebar from "My Wallet" button
- **Command Palette** — Cmd+K overlay from anywhere in workspace

> There is NO sidebar navigation. All navigation uses hub-card grids.

---

## LANDING PAGE (`s4ledger.com/demo-app/`)

### What you should see:
- **ZERO notifications, toasts, or error popups** — completely clean landing
- **Nav bar** (top): S4 Ledger logo, Platform, Use Cases, Pricing, Docs, Request Demo button, theme toggle (sun/moon icon)
- **Hero section**: "S4 Ledger Platform" heading, subtitle about Navy logistics, "Enter Platform" button, "See a Demo" link
- **XRPL status badge**: "XRPL Mainnet Connected — Navy Record Types • 54+ Pre-Built Templates"
- **6 feature cards**: Anchor & Verify, Anchor-S4, Audit & Compliance, AI-Powered Analysis, Defense Data Import, Contract & Config Mgmt
- **Footer**: S4 Ledger branding, Product / Company / Resources / Connect columns, Terms + Privacy + Security links, copyright

### Upgrades on this page:
1. ✅ **Light/dark mode toggle** — sun/moon icon in the nav bar, top-right
2. ✅ **Theme toggle button** — persists choice to localStorage
3. ✅ **Security notice banner** — yellow "NOTICE: Do not submit ITAR-controlled..." bar at very top
4. ✅ **No error toasts** — global error handlers are now console-only
5. ✅ **No auto-fire notifications** — tour toast and warranty alerts removed

---

## PLATFORM WORKSPACE (click "Enter Platform")

### TOP BAR (always visible across all tools)
- **S4 LEDGER** brand text — top-left
- **Search bar** — Cmd+K shortcut to open command palette
- **Notification bell** — top-right, opens notification history drawer
- **Theme toggle** — sun/moon icon, switches light/dark
- **User avatar menu** — profile dropdown
- **My Wallet** button — opens wallet sidebar

### Upgrades in the top bar:
6. ✅ **Command Palette** (Cmd+K) — opens search overlay with all commands
7. ✅ **Notification bell + history drawer** — slide-out panel from right side
8. ✅ **Theme toggle** — light/dark mode persists
9. ✅ **Breadcrumb navigation** — shows current path (updates as you navigate tools)

---

### PLATFORM HUB (4 hub cards)

**What you should see:**
- Hub header: "Platform" heading, "Select a module to get started" description
- Collaboration indicators: "1 analyst online", session status
- **4 hub cards** in a grid layout:
  1. **Verify Records** (LIVE) — Upload files to verify blockchain integrity
  2. **Transaction Log** (AUDIT) — Full audit trail with XRPL explorer links
  3. **Anchor-S4** (14 TOOLS) — 14 integrated defense ILS tools
  4. **Systems** (METRICS) — Platform metrics and offline queue

### Upgrades:
10. ✅ **Collaboration indicators** — shows online analysts count
11. ✅ **Session restore** — if you refresh the page, you land back in the workspace

---

### ANCHOR RECORDS (first hub card)

**What you should see:**
- **Branch tabs** (NAVY, ARMY, USMC, USAF, USCG, JOINT) — filter record types by military branch
- **Record type search bar** — real-time filter on the type grid
- **Record type grid** — 54+ types (DD1149, DD250, WAWF, etc.)
- Generate Record button → builds a record with realistic demo data
- **File drag-and-drop zone** — hash any file as binary
- **Encrypt toggle** — AES-256 encryption checkbox
- **"Anchor to XRPL" button** — hashes and publishes to the XRP Ledger
- Transaction confirmation card with TX hash, ledger index, timestamp
- Result panel with hash preview and XRPL explorer link

### Upgrades:
13. ✅ **54+ record type templates** — pre-built for defense forms
14. ✅ **Branch tabs** — filter by military branch
15. ✅ **Type search** — real-time filter on the record type grid
16. ✅ **Binary file hashing** — drag-and-drop any file type, hashed as raw binary
17. ✅ **Batch anchoring** — queue multiple records and anchor them together
18. ✅ **SLS fee deduction** — 0.01 SLS per anchor, reflected in Wallet balance
19. ✅ **Audit chain verification** — each anchor is added to the tamper-evident audit chain
20. ✅ **Record Templates system** — reusable templates (Maintenance Log, Inspection Report, etc.)
21. ✅ **Cross-tool record linking** — link records across tools (S4.crossLink)
22. ✅ **Field-level encryption toggles** — per-field encrypt checkboxes

---

### VERIFY RECORDS (first hub card)

**What you should see:**
- Input field for hash (or paste from clipboard)
- File upload option (re-hash and compare)
- "Verify Integrity" button
- **Refresh button** in the top-right header bar
- Result card: Valid (green) / Invalid (red) / Not Found (gray)
- Recently anchored records list

### Upgrades:
23. ✅ **Refresh button** — top-right of the Verify tab header bar
24. ✅ **File verification** — upload a file, auto-hash it, compare to ledger
25. ✅ **Verification certificate** — downloadable proof of integrity

---

### TRANSACTION LOG (second hub card)

**What you should see:**
- Full audit trail of every anchored record
- XRPL explorer links for each transaction
- Timestamps and hash verification status
- Filterable/searchable log

### Upgrades:
26. ✅ **XRPL explorer links** — direct links to on-chain transactions
27. ✅ **Filterable log** — search and filter transaction history

---

### ANCHOR-S4 ILS HUB (third hub card — 14 tools)

**What you should see when entering:**
- Sub-hub grid with **14 tool cards**, each opening a full-page tool panel
- "Back to Tools" button to return to the card grid
- SLS balance strip showing current SLS, anchors, spent
- AI Agent indicator "AI Agent Active"

**14 ILS Tool Cards:**
1. Gap Analysis — ILS gap identification with MIL-STD-1388 scoring
2. DMSMS Tracker — Diminishing Manufacturing Sources & Material Shortages
3. Readiness Calculator — Operational Availability (Ao), MTBF, MTTR, MLDT
4. Compliance Scorecard — CMMC, NIST 800-171, DFARS, FAR 46 scoring
5. Supply Chain Risk — Risk assessment with single-source analysis
6. Action Items — Unified action items store with calendar view
7. Predictive Maintenance — AI-powered failure prediction and CBM+
8. Lifecycle Cost — Total ownership cost modeling
9. ROI Calculator — S4 Ledger investment return analysis
10. Audit Vault — Blockchain-anchored document vault
11. Document Library — MIL-STD reference library (100+ documents)
12. Report Generator — Audit packages, DCMA reports, executive briefs
13. Submissions & PTD — Vendor submission discrepancy analysis
14. SBOM Viewer — Software Bill of Materials with CVE tracking

### Upgrades:
28. ✅ **14 ILS tool cards** — organized by function in a card grid
29. ✅ **500+ defense platforms database** — pre-loaded platform data
30. ✅ **Gap analysis engine** — automated ILS gap identification with radar chart
31. ✅ **DMSMS tracking** — parts at risk, alternates, resolution cost
32. ✅ **Readiness scoring** — Ao, Ai, failure rate, mission readiness
33. ✅ **Compliance scorecard** — 6 frameworks, letter grade output
34. ✅ **Supply chain risk engine** — single-source, foreign dependency, lead time
35. ✅ **Action items system** — unified store with localStorage persistence + calendar view
36. ✅ **Predictive maintenance** — fleet-wide analysis with failure prediction
37. ✅ **Lifecycle cost estimation** — acquisition, operating, sustainment, disposal
38. ✅ **ROI calculator** — labor savings, audit efficiency, 5-year projection
39. ✅ **Audit vault** — every anchored record stored with hash, preview, TX hash
40. ✅ **Defense document library** — 100+ MIL-STDs with categories and direct links
41. ✅ **Report generator** — audit packages, DCMA reports, compliance summaries
42. ✅ **Submissions & PTD** — upload vendor data, detect discrepancies, cost anomalies
43. ✅ **SBOM viewer** — CycloneDX/SPDX, CVE matching, blockchain attestation

---

### AI AGENT (floating panel inside Anchor-S4)

**What you should see:**
- Floating chat widget accessible from all ILS tool panels
- Chat message history
- Text input with send button
- Quick prompt buttons for common queries
- Context-aware responses based on active tool

### Upgrades:
45. ✅ **AI chat interface** — conversational agent for ILS guidance
46. ✅ **Suggested prompts** — pre-built questions for common ILS queries
47. ✅ **Context-aware** — references vault records and active tool data
48. ✅ **20+ tool-specific responses** — detailed guidance for every ILS tool
49. ✅ **Defense standards knowledge** — MIL-STD-1388, NIST 800-171, CMMC, DFARS

---

### SYSTEMS HUB (fourth hub card)

**What you should see when entering:**
- Sub-hub with 2 cards: Metrics Dashboard, Offline Queue

#### METRICS DASHBOARD
- **10 stat cards** in a grid:
  1. Avg Anchor Time (seconds)
  2. Anchors Today (records)
  3. Records Generated (total)
  4. Vault Size (records)
  5. Storage Used (KB)
  6. Cost / Anchor (SLS)
  7. XRPL Validators (active)
  8. Uptime (%)
  9. Total Time (seconds)
  10. AI Audit Trail (entries)
- **Anchor Times chart** — line chart showing last 20 anchor times
- **Record Types chart** — doughnut chart showing type distribution
- **Performance Timing Breakdown table** — per-phase metrics (Hash, TX, XRPL, Vault, UI)
- **Recent API Requests** — live log of API calls with method, path, duration
- **Refresh Metrics** button

#### OFFLINE QUEUE
- Connection status indicator
- Queued hashes count
- Last sync timestamp
- Queue list with hash previews
- Sync / Queue / Clear buttons

### Upgrades:
50. ✅ **10 metric stat cards** — comprehensive platform health dashboard
51. ✅ **Timing Breakdown table** — per-phase performance metrics
52. ✅ **Line chart** — anchor time trend visualization
53. ✅ **Doughnut chart** — record type distribution
54. ✅ **Recent API Requests** — live request log with realistic data
55. ✅ **Offline queue** — anchor requests queued when offline
56. ✅ **Background sync** — auto-syncs queued operations when back online

---

### WALLET (slide-in sidebar from "My Wallet" button)

**What you should see:**
- **SLS Balance bar** — shows your tier's allocation (e.g., 100,000 SLS for Professional)
- **Anchors** — count of records anchored
- **SLS Spent** — total fees consumed
- **Plan** — tier name (Pilot/Starter/Professional/Enterprise)
- Wallet overview cards, credentials section
- Purchase SLS section
- SLS Economic Flow details
- Logout button
- **NO glitch/flash** — balance loads instantly to correct tier value

### Upgrades:
57. ✅ **SLS balance bar** — always shows in Wallet
58. ✅ **Instant balance load** — reads tier from localStorage, no flash
59. ✅ **Transaction history** — log of all anchor transactions with timestamps
60. ✅ **SLS Economic Flow** — detailed panel showing fee breakdown
61. ✅ **Staking system** — stake SLS tokens for APY returns (S4.staking)
62. ✅ **DAO governance** — create/vote on proposals (S4.dao)

---

### COMMAND PALETTE (Cmd+K from anywhere in workspace)

**What you should see:**
- Search overlay with text input
- Categorized command list (Tools, Data, Security, Theme, etc.)
- Quick actions for all platform features

### Upgrades:
63. ✅ **Full command palette** — search and execute any platform action
64. ✅ **Category filters** — commands grouped by function
65. ✅ **Keyboard shortcuts** — Cmd+K to open, Esc to close
66. ✅ **Tour access** — "Start Tour" available in command palette
67. ✅ **Batch anchor** — "Execute Batch Anchor" available in command palette

---

### CROSS-CUTTING FEATURES (visible across all tools)

68. ✅ **Role-based access control** — roles system (admin, operator, viewer, auditor)
69. ✅ **Multi-tenant support** — tenant switching capability
70. ✅ **SSO / Auth providers** — CAC/PIV, OAuth, SAML integration points
71. ✅ **Encrypted localStorage** — AES-GCM encrypted storage wrapper
72. ✅ **Session timeout** — auto-lock after 30 minutes of inactivity
73. ✅ **XSS sanitization** — all user input sanitized before rendering
74. ✅ **Rate limiting** — API call rate limiter
75. ✅ **Audit chain** — tamper-evident hash chain for all operations
76. ✅ **Cloud sync** — sync data to cloud storage
77. ✅ **Cross-ledger verification** — verify across multiple blockchains
78. ✅ **NFT certificates** — mint verification certificates as NFTs
79. ✅ **DID (Decentralized ID)** — generate decentralized identifiers
80. ✅ **Smart contract deployment** — deploy anchor contracts
81. ✅ **Multi-chain support** — XRPL, Ethereum, Solana, Polygon chains
82. ✅ **Internationalization (i18n)** — language support framework
83. ✅ **Keyboard shortcuts system** — Cmd+K, Cmd+/, number keys for tools
84. ✅ **Notification preferences** — enable/disable by category
85. ✅ **Theme engine** — 5 preset themes with custom support
86. ✅ **Test runner** — built-in test suite with coverage reporting
87. ✅ **A11y audit** — accessibility audit tool
88. ✅ **Load testing** — performance benchmarking tool
89. ✅ **Service worker** — registered on page load for offline support
90. ✅ **IndexedDB fallback** — persistent storage fallback

---

## OTHER PAGES

### Terms of Service (`s4ledger.com/s4-terms/`)
- ✅ Custom nav bar (matches main site)
- ✅ 13 sections of legal content
- ✅ Standard footer with all links
- ✅ Scroll/reveal animations

### Privacy Policy (`s4ledger.com/s4-privacy/`)
- ✅ Custom nav bar (matches main site)
- ✅ 13 sections covering data handling
- ✅ Standard footer with all links
- ✅ Scroll/reveal animations

### Homepage (`s4ledger.com/`)
- ✅ Hero with tagline and CTA
- ✅ 4-step "How It Works" section
- ✅ Two Products section (S4 Ledger + HarborLink)
- ✅ "Why XRP Ledger" section with 3 cards
- ✅ Compliance & Security badges table
- ✅ CTA section with Schedule Demo + Launch Platform
- ✅ Full footer with PRODUCT/COMPANY/RESOURCES/CONNECT columns

---

## BUG FIXES LOG

| Fix | Commit | Status |
|-----|--------|--------|
| Terms/Privacy pages rebuilt | e8dffd3 | ✅ Verified live |
| Verify refresh button | e8dffd3 | ✅ Verified live |
| showOnboarding DOM guard | e8dffd3 | ✅ Verified live |
| showRoleSelector DOM guard | e8dffd3 | ✅ Verified live |
| Tour toast auto-fire killed | 65736b0 | ✅ Verified live |
| Warranty alerts auto-fire killed | 65736b0 | ✅ Verified live |
| Metrics: 4 new stat cards | 65736b0 | ✅ Verified live |
| Metrics: Timing Breakdown table | 65736b0 | ✅ Verified live |
| SLS balance glitch fixed | 65736b0 | ✅ Verified live |
| Error toasts eliminated | 0237233 | ✅ Verified live |
| 17 JSON.parse calls hardened | 0237233 | ✅ Verified live |
| S4.toast gated to workspace | 0237233 | ✅ Verified live |
| s4Notify gated to workspace | 0237233 | ✅ Verified live |
| Metrics auto-fire gated | 0237233 | ✅ Verified live |
| Dead SLS IIFE removed | d5120c5 | ✅ Pushed |
| UPGRADE_LOCATIONS.md rewritten | d5120c5 | ✅ Pushed |
| Unauthorized Anchor Records card reverted | d5120c5 | ✅ Pushed |
| Unauthorized Warranty tool removed | d5120c5 | ✅ Pushed |
| 14 TOOLS count restored | d5120c5 | ✅ Pushed |
| SW cache bumped to s4-v310 | 1e6440f | ✅ Pushed |
| **CRITICAL: `</script>` inside JS string killed 6,300-line script block** | 4891bcc | ✅ Pushed |
| Warranty command palette entry removed | dc67f79 | ✅ Pushed |
| SW strategy: NetworkFirst for HTML | dc67f79 | ✅ Pushed |
| Bootstrap SRI hash added | dc67f79 | ✅ Pushed |
| SW precache URLs fixed (Chart.js, platforms.js, defense-docs.js) | dc67f79 | ✅ Pushed |

---

## COMPETITIVE UPGRADES — v5.6.0 (Afternoon Session, February 24 2026)

> 23 new features across 7 tools, plus a global Roadmap modal.  
> All committed in batches c54bf9b → ece26fe and bug-fixed in d17cb6a → abfaaed.

### How to Navigate

1. Open platform → click **Platform Workspace**
2. Click any of the **14 tool tabs** in the left sidebar (ILS Hub)
3. Each tool panel scrolls vertically — competitive upgrades are typically **collapsible sections** with arrow toggles

---

### A. Action Items (`hub-actions`) — 8 Upgrades

| # | Feature | Where to Find It | Element ID | What You See |
|---|---------|-------------------|------------|--------------|
| 91 | **⌘N / Ctrl+N Shortcut** | Anywhere on the workspace | Keyboard handler | Press ⌘N → Add Action Item modal opens |
| 92 | **Bulk Operations Bar** | Action Items → above the list | `actionBulkBar` | Hidden until you tick checkboxes. Shows: Select All, count, Set Critical, Set Warning, Mark Done, Delete |
| 93 | **Calendar View** | Action Items → below stat cards | `actionCalendarSection` | Monthly grid with prev/next month arrows. Days with due items show colored dots. Click a day for detail popover |
| 94 | **AI Smart Sort** | Action Items → toolbar | Button with wand icon | "Smart Sort" button ranks items by severity × cost × urgency |
| 95 | **Stat Drill-down** | Action Items → four mini stat cards | `hubAiTotal`, `hubAiCritical`, `hubAiOpen`, `hubAiDone` | Click any card → action list filters to that category |
| 96 | **Inline Edit** | Action Items → any item title | Double-click title | Double-click → title becomes editable. Press Enter to save, Escape to cancel |
| 97 | **Row Checkboxes** | Action Items → each row | Per-item `<input type="checkbox">` | Checkbox on every action item row. Enables bulk bar when ticked |
| 98 | **Select All** | Action Items → bulk bar | Checkbox in `actionBulkBar` | Master checkbox to select/deselect all visible items at once |

**Navigation path:** Platform Workspace → ILS Hub → Action Items tab

---

### B. Compliance (`hub-compliance`) — 4 Upgrades

| # | Feature | Where to Find It | Element ID | What You See |
|---|---------|-------------------|------------|--------------|
| 99 | **POA&M Tracker** | Compliance → collapsible section | `poamSection`, `poamBody` | "POA&M — Plan of Action & Milestones" header. Table: ID / Weakness / Control / Risk / Milestone / Due / Owner / Status. Add & Export buttons |
| 100 | **Evidence Manager** | Compliance → collapsible section | `evidenceSection`, `evidenceList` | Dropdown to pick NIST control (AC-1 through SI-4). File upload button, export log. Lists attached evidence with hashes |
| 101 | **Continuous Monitoring** | Compliance → collapsible section | `monitoringSection`, `monitoringGrid` | "LIVE" badge with pulse dot. "Run Full Scan" button, auto-monitor toggle. Grid of control status cards + scrollable log |
| 102 | **FedRAMP Alignment** | Compliance → collapsible section | `fedrampSection` | Impact-level dropdown (Low/Moderate/High), export button. Stats: Satisfied / Partial / Not Met / Total. Per-family progress bars (AC, AU, CM, IA, IR, SC) |

**Navigation path:** Platform Workspace → ILS Hub → Compliance tab → scroll down through collapsible sections

---

### C. Reports (`hub-reports`) — 4 Upgrades

| # | Feature | Where to Find It | Element ID | What You See |
|---|---------|-------------------|------------|--------------|
| 103 | **Executive Summary Generator** | Reports → collapsible section | `execSummarySection`, `execSummaryOutput` | "ONE-CLICK" badge. Generate button + Download. Outputs leadership-ready summary combining compliance, risk, actions, financials |
| 104 | **Scheduled Reports** | Reports → collapsible section | `schedReportsSection`, `schedReportList` | Report type dropdown, frequency dropdown (Daily/Weekly/Monthly/Quarterly). "Schedule" button. Shows list of scheduled reports |
| 105 | **Fleet-wide Comparison** | Reports → collapsible section | `fleetCompareSection`, `fleetCompareOutput` | "Generate Comparison" button. Side-by-side table of metrics across programs/platforms |
| 106 | **Supply Chain Risk Heat Map** | Reports → collapsible section | `heatMapSection`, `heatMapOutput` | "Generate Heat Map" button. Visual risk heatmap by supplier, component category, and geographic region |

**Navigation path:** Platform Workspace → ILS Hub → Reports tab → scroll down through collapsible sections

---

### D. Risk Engine (`hub-risk`) — 4 Upgrades

| # | Feature | Where to Find It | Element ID | What You See |
|---|---------|-------------------|------------|--------------|
| 107 | **AI Remediation Plans** | Risk → collapsible section | `remediationSection`, `remediationOutput` | "AI-POWERED" badge. "Generate Plans" button. Outputs step-by-step remediation for high-risk items with alternate sourcing & cost estimates |
| 108 | **Anomaly Detection** | Risk → collapsible section | `anomalySection`, `anomalyOutput` | "AI-SCAN" badge. "Run Anomaly Scan" button (red gradient). Scans for cost spikes, lead time anomalies, duplicates, integrity mismatches |
| 109 | **Budget Forecasting** | Risk → collapsible section | `budgetForecastSection`, `budgetForecastOutput` | Year-range dropdown (3/5/10 year). "Forecast" button. AI-driven budget projection from procurement, obsolescence, and maintenance data |
| 110 | **Document AI — Data Extraction** | Risk → collapsible section | `docAISection`, `docAIOutput` | "CLIENT-SIDE" badge. Upload (.txt/.csv/.json/.xml) + "Demo Extract" button. Extracts NSNs, CAGE codes, part numbers, dates, dollar amounts. Feeds into risk analysis pipeline |

**Navigation path:** Platform Workspace → ILS Hub → Risk tab → scroll down through collapsible sections

---

### E. Document Library (`hub-docs`) — 2 Upgrades

| # | Feature | Where to Find It | Element ID | What You See |
|---|---------|-------------------|------------|--------------|
| 111 | **15 Defense Templates** | Document Library → "Template Library" section | `templateList` | Collapsible section with "15 TEMPLATES" badge. Templates: DRL Tracker, Corrective Action Report, CDRL Status Tracker, SOW, PPL, DMSMS Case Report, SSR, POA&M Template, SSP, T&E Plan, FRB Report, Warranty Claim, Risk Matrix, FRACAS Report, ILS Certification Checklist. Each has a download button |
| 112 | **Category Filter** | Document Library → inside Template Library | Filter buttons (All / Contract / Engineering / Logistics / Compliance) | Category buttons filter the template list. Also has a document-level category filter bar at the top of the library |

**Navigation path:** Platform Workspace → ILS Hub → Document Library tab → scroll to "Template Library" section

---

### F. Submissions (`hub-submissions`) — 1 Upgrade

| # | Feature | Where to Find It | Element ID | What You See |
|---|---------|-------------------|------------|--------------|
| 113 | **Version Diff Viewer** | Submissions → collapsible section | `versionDiffSection`, `diffOutput` | Two version dropdowns (A = Base, B = New) + "Compare" button. Monospace diff output showing added / removed / changed fields |

**Navigation path:** Platform Workspace → ILS Hub → Submissions tab → scroll to "Version Diff" section

---

### G. Global — Production Features Roadmap Modal

| # | Feature | Where to Find It | Element ID | What You See |
|---|---------|-------------------|------------|--------------|
| 114 | **Roadmap Button** | Platform Workspace → collab indicators bar (below ILS Hub header) | Button calling `openProdFeatures()` | Gold button with rocket icon + "Roadmap" text |
| 115 | **Roadmap Modal** | Clicking the Roadmap button | `prodFeaturesModal`, `prodFeaturesList` | Full-screen overlay modal. Title: "Production Features Roadmap". 6 categories, 22 features with "PRODUCTION" badges. Close button + sales CTA |

**Navigation path:** Platform Workspace → look for gold "Roadmap" button in the toolbar area → click it

---

### Quick Visual Guide — Where Each Tool Lives

```
Platform Workspace
├── Top Bar (search, tabs, Roadmap button)
├── ILS Hub (left sidebar with 14 tool tabs)
│   ├── Action Items     ← Upgrades 91-98 (bulk ops, calendar, smart sort, etc.)
│   ├── SBOM
│   ├── DMSMS
│   ├── Readiness
│   ├── Lifecycle
│   ├── Analysis
│   ├── Document Library ← Upgrades 111-112 (15 templates, category filter)
│   ├── Compliance       ← Upgrades 99-102 (POA&M, Evidence, Monitoring, FedRAMP)
│   ├── Risk             ← Upgrades 107-110 (Remediation, Anomaly, Budget, Document AI)
│   ├── Reports          ← Upgrades 103-106 (Exec Summary, Scheduled, Fleet, Heat Map)
│   ├── Audit Trail
│   ├── Cost Tracking
│   ├── Submissions      ← Upgrade 113 (Version Diff)
│   └── Sustainment
├── AI Agent
├── Anchor Records
├── Verify
├── Transaction Log
└── Wallet
```

---

## BUG FIXES LOG — v5.6.0 (Session Chain d17cb6a → abfaaed)

| Fix | Commit | Status |
|-----|--------|--------|
| **CRITICAL: Stray `</div>` at line 2366 broke tabILS — all 14 hub panels ejected** | d17cb6a | ✅ Pushed |
| Duplicate `</div></section>` at end of platformWorkspace removed | d17cb6a | ✅ Pushed |
| 5 Pro-only FA icons replaced (fa-radar, fa-chart-radar, fa-shield-check, fa-shield-xmark, fa-hexagon-vertical-nft) | 2baf6ac | ✅ Pushed |
| Light mode invisible text — CSS for .ai-title/.ai-body/.ai-meta/.ai-check/.stat-mini | 34a2b57 | ✅ Pushed |
| 5 missing tool auto-loads wired in openILSTool/switchHubTab (SBOM, DMSMS, Readiness, Lifecycle, Analysis) | 34a2b57 | ✅ Pushed |
| renderHubActions error handling + graceful fallback | 34a2b57 | ✅ Pushed |
| tabPerformance→tabMetrics keyboard shortcut + command palette fix | bacfaa7 | ✅ Pushed |
| **Roadmap modal invisible/unclickable** — was using style.display instead of .active class | abfaaed | ✅ Pushed |
| **Action Item modal invisible/unclickable** — same CSS class bug | abfaaed | ✅ Pushed |
| Document AI renamed from "Supply Chain Risk Agent" to "Document AI — Data Extraction" | abfaaed | ✅ Pushed |

---

*This file is for internal QA reference. Delete or move it when verification is complete.*
