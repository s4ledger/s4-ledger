# S4 Ledger — Upgrade Locations Guide (v5.5.0)

> Use this document to visually verify every upgrade on the live site.  
> Last updated: February 24, 2026

---

## PLATFORM ARCHITECTURE

The platform uses a **Hub → Section → Tab** navigation model:

- **Landing Page** — hero, feature cards, footer (public-facing)
- **Platform Hub** — 5 hub cards: Anchor Records, Verify Records, Transaction Log, Anchor-S4 (ILS), Systems
- **Anchor-S4 ILS** — sub-hub with 15 tool cards, each opening a full-page tool panel
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

### PLATFORM HUB (5 hub cards)

**What you should see:**
- Hub header: "Platform" heading, "Select a module to get started" description
- Collaboration indicators: "1 analyst online", session status
- **5 hub cards** in a grid layout:
  1. **Anchor Records** (CORE) — Hash and anchor documents to XRPL
  2. **Verify Records** (LIVE) — Upload files to verify blockchain integrity
  3. **Transaction Log** (AUDIT) — Full audit trail with XRPL explorer links
  4. **Anchor-S4** (15 TOOLS) — 15 integrated defense ILS tools
  5. **Systems** (METRICS) — Platform metrics and offline queue

### Upgrades:
10. ✅ **Anchor Records hub card** — direct access to the primary anchoring tool
11. ✅ **Collaboration indicators** — shows online analysts count
12. ✅ **Session restore** — if you refresh the page, you land back in the workspace

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

### VERIFY RECORDS (second hub card)

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

### TRANSACTION LOG (third hub card)

**What you should see:**
- Full audit trail of every anchored record
- XRPL explorer links for each transaction
- Timestamps and hash verification status
- Filterable/searchable log

### Upgrades:
26. ✅ **XRPL explorer links** — direct links to on-chain transactions
27. ✅ **Filterable log** — search and filter transaction history

---

### ANCHOR-S4 ILS HUB (fourth hub card — 15 tools)

**What you should see when entering:**
- Sub-hub grid with **15 tool cards**, each opening a full-page tool panel
- "Back to Tools" button to return to the card grid
- SLS balance strip showing current SLS, anchors, spent
- AI Agent indicator "AI Agent Active"

**15 ILS Tool Cards:**
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
15. **Warranty Tracker** — Warranty obligations, expiry alerts, claims, GFE/GFM

### Upgrades:
28. ✅ **15 ILS tool cards** — organized by function in a card grid
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
44. ✅ **Warranty tracker** — FAR 46.7 warranty obligations, expiry alerts, GFE/GFM, claims

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

### SYSTEMS HUB (fifth hub card)

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
67. ✅ **Warranty check** — "Check Warranty Alerts" in command palette

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
| Anchor hub card added | (pending) | 🔄 This commit |
| Warranty tool panel built | (pending) | 🔄 This commit |
| Dead SLS IIFE removed | (pending) | 🔄 This commit |
| UPGRADE_LOCATIONS.md rewritten | (pending) | 🔄 This commit |

---

*This file is for internal QA reference. Delete or move it when verification is complete.*
