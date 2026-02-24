# S4 Ledger — Upgrade Locations Guide (v5.4.0)

> Use this document to visually verify every upgrade on the live site.  
> Last updated: February 23, 2026 — Commit `0237233`

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

### Upgrades in the top bar:
6. ✅ **Command Palette** (Cmd+K) — opens search overlay with all commands
7. ✅ **Notification bell + history drawer** — slide-out panel from right side
8. ✅ **Theme toggle** — light/dark mode persists
9. ✅ **Breadcrumb navigation** — shows current path (updates as you navigate tools)

---

### LEFT SIDEBAR

**What you should see:**
- Column of tool icons with text labels, vertically stacked
- Active tool has a highlight indicator
- Collapse/expand toggle at the bottom

**Tools listed (top to bottom):**
Dashboard, Records, Anchor, Verify, AI Assistant, Wallet, Compliance, Warranty, Metrics, Settings, Offline Mode, and ILS tools

### Upgrades in the sidebar:
10. ✅ **Favorites / Pinned Tools** — star icon to pin frequently used tools
11. ✅ **Sidebar collapse toggle** — shrinks to icon-only mode
12. ✅ **Custom layout persistence** — sidebar width/collapsed state saved to localStorage
13. ✅ **Mobile toggle** — hamburger menu for small screens

---

### DASHBOARD (home icon — first tool you see)

**What you should see:**
- Welcome banner with plan name and quick stats
- Activity feed showing recent actions
- System status indicators

### Upgrades:
14. ✅ **Activity feed** — logs recent anchoring, verification, export actions
15. ✅ **Session restore** — if you refresh the page, you land back in the workspace (not the landing page)

---

### RECORDS TOOL (folder icon)

**What you should see:**
- Branch tabs (NAVY, ARMY, USMC, USAF, USCG, JOINT)
- Record type grid with 54+ types (DD1149, DD250, WAWF, etc.)
- Search bar to filter types
- Generate Record button → builds a record with random demo data
- Export and Clear buttons
- Record preview panel (JSON / formatted toggle)

### Upgrades:
16. ✅ **54+ record type templates** — pre-built for defense forms
17. ✅ **Branch tabs** — filter by military branch
18. ✅ **Type search** — real-time filter on the record type grid
19. ✅ **Field-level encryption toggles** — per-field encrypt checkboxes in generated records
20. ✅ **Record Templates system** — reusable templates (Maintenance Log, Inspection Report, Supply Requisition, Training Certificate, Disposal Record)
21. ✅ **Cross-tool record linking** — link records across tools (S4.crossLink)

---

### ANCHOR TOOL (anchor icon)

**What you should see:**
- Drag-and-drop file upload zone OR paste content area
- SHA-256 hash preview
- "Anchor to XRPL" button
- Transaction confirmation card with TX hash, ledger index, timestamp
- Link to XRPL explorer

### Upgrades:
22. ✅ **Batch anchoring** — queue multiple records and anchor them together
23. ✅ **Binary file hashing** — drag-and-drop any file type, hashed as raw binary
24. ✅ **SLS fee deduction** — 0.01 SLS per anchor, reflected in Wallet balance
25. ✅ **Audit chain verification** — each anchor is added to the tamper-evident audit chain

---

### VERIFY TOOL (checkmark icon)

**What you should see:**
- Input field for hash (or paste from clipboard)
- File upload option (re-hash and compare)
- "Verify Integrity" button
- **Refresh button** in the top-right header bar
- Result card: Valid (green) / Invalid (red) / Not Found (gray)
- Certificate download option

### Upgrades:
26. ✅ **Refresh button** — top-right of the Verify tab header bar
27. ✅ **File verification** — upload a file, auto-hash it, compare to ledger
28. ✅ **Verification certificate** — downloadable proof of integrity

---

### AI ASSISTANT (brain icon)

**What you should see:**
- Chat interface with message history
- Model selector dropdown
- Context toggle (include vault data in prompts)
- Suggested prompts / quick actions
- Typing indicator when "thinking"

### Upgrades:
29. ✅ **AI chat interface** — conversational agent for ILS guidance
30. ✅ **Suggested prompts** — pre-built questions for common ILS queries
31. ✅ **Context-aware** — can reference vault records when context toggle is on
32. ✅ **Compliance gap analysis** — ask about NIST 800-171, CMMC L2 compliance
33. ✅ **Predictive maintenance AI** — anomaly detection engine
34. ✅ **OCR document processing** — extract text from uploaded documents

---

### WALLET (wallet icon)

**What you should see:**
- **SLS Balance** — shows your tier's allocation (e.g., 100,000 SLS for Professional)
- **Anchors** — count of records anchored
- **SLS Spent** — total fees consumed
- **Plan** — tier name (Pilot/Starter/Professional/Enterprise)
- Transaction history table below
- **NO glitch/flash** — balance loads instantly to correct tier value

### Upgrades:
35. ✅ **SLS balance bar** — always shows in Wallet tab
36. ✅ **Instant balance load** — reads tier from localStorage on parse, no flash
37. ✅ **Transaction history** — log of all anchor transactions with timestamps
38. ✅ **SLS Economic Flow** — detailed panel showing fee breakdown
39. ✅ **Staking system** — stake SLS tokens for APY returns (S4.staking)
40. ✅ **DAO governance** — create/vote on proposals (S4.dao)

---

### COMPLIANCE (shield icon)

**What you should see:**
- DFARS / ITAR / CMMC checklist cards
- Status badges per requirement (Met / Partial / Not Met)
- Compliance score percentage
- Export compliance report button

### Upgrades:
41. ✅ **CMMC Level 2 assessment** — automated scoring with gap identification
42. ✅ **NIST 800-171 assessment** — control-by-control compliance check
43. ✅ **FedRAMP SSP export** — System Security Plan generation
44. ✅ **OSCAL catalog export** — machine-readable compliance catalog
45. ✅ **Compliance gap analysis** — identifies specific gaps with remediation steps

---

### WARRANTY (calendar icon)

**What you should see:**
- Warranty tracker cards with item names, expiry dates
- Status indicators: Active (green), Expiring Soon (yellow), Expired (red)
- Add/Edit warranty form
- Warranty alerts available via Command Palette (manual trigger only)

### Upgrades:
46. ✅ **Warranty tracking system** — full CRUD for warranty records
47. ✅ **Expiry alerts** — manual check via Command Palette → "Check Warranty Alerts"
48. ✅ **No auto-fire alerts** — warranty toasts only show when manually requested

---

### METRICS (chart icon) ⭐ RECENTLY UPDATED

**What you should see:**
- **10 stat cards** in a grid:
  1. Avg Anchor Time (seconds)
  2. Anchors Today (records)
  3. **Records Generated** (total) ← NEW
  4. **Vault Size** (records) ← NEW
  5. **Storage Used** (KB) ← NEW
  6. Cost / Anchor (SLS)
  7. XRPL Validators (active)
  8. Uptime (%)
  9. **Total Time** (seconds) ← NEW
  10. AI Audit Trail (entries)

- **Anchor Times chart** — line chart showing last 20 anchor times
- **Record Types chart** — doughnut chart showing type distribution
- **Recent API Requests** — live log of API calls with method, path, duration

- **Performance Timing Breakdown table** ← NEW:

  | Phase | Avg (ms) | Min (ms) | Max (ms) | % of Total |
  |-------|----------|----------|----------|------------|
  | Hash Generation | 42 | 18 | 87 | 1.3% |
  | TX Merge & Sign | 185 | 120 | 310 | 5.8% |
  | XRPL Submit & Confirm | 2,840 | 2,100 | 4,200 | 88.6% |
  | Vault Save | 28 | 12 | 65 | 0.9% |
  | UI Render | 110 | 60 | 240 | 3.4% |
  | **Total** | **3,205** | — | — | ~3.2s e2e |

- **Refresh Metrics** button at bottom

### Upgrades:
49. ✅ **Records Generated stat** — total records from vault + session
50. ✅ **Vault Size stat** — count of records in the audit vault
51. ✅ **Storage Used stat** — KB of vault data in localStorage
52. ✅ **Total Time stat** — cumulative processing time
53. ✅ **Timing Breakdown table** — per-phase performance metrics
54. ✅ **Line chart** — anchor time trend visualization
55. ✅ **Doughnut chart** — record type distribution
56. ✅ **Recent API Requests** — live request log with realistic data
57. ✅ **Auto-refresh** — metrics refresh every 30 seconds when tab is active

---

### SETTINGS (gear icon)

**What you should see:**
- Theme preferences section
- Notification preferences (toggle categories on/off)
- Data management (export/import/clear)

### Upgrades:
58. ✅ **Notification preferences** — enable/disable by category (anchoring, verification, export, sync, security)
59. ✅ **Theme engine** — 5 preset themes (Default Dark, Midnight Blue, Military Green, High Contrast, Warm Amber)
60. ✅ **Custom theme support** — saved to localStorage
61. ✅ **Layout persistence** — sidebar width/collapsed state remembered

---

### OFFLINE MODE (cloud icon)

**What you should see:**
- Offline queue status
- Pending operations list
- Sync button
- Service worker status

### Upgrades:
62. ✅ **Service worker** — registered on page load for offline support
63. ✅ **Offline queue** — anchor requests queued when offline
64. ✅ **Background sync** — auto-syncs queued operations when back online
65. ✅ **IndexedDB fallback** — persistent storage fallback

---

### ILS WORKSPACE (within the main toolset)

**Sub-tools available:**
- Gap Analysis, DMSMS Tracking, Readiness Scoring, Lifecycle Cost, Compliance Scorecard, Risk Engine, Supply Chain Viz, Action Items, Action Calendar, Submission Management

### Upgrades:
66. ✅ **500+ defense platforms database** — pre-loaded platform data
67. ✅ **Gap analysis engine** — automated ILS gap identification
68. ✅ **DMSMS tracking** — Diminishing Manufacturing Sources & Material Shortages
69. ✅ **Readiness scoring** — operational readiness metrics
70. ✅ **Lifecycle cost estimation** — cost modeling tools
71. ✅ **Compliance scorecard** — per-program compliance tracking
72. ✅ **Risk engine** — supply chain risk assessment
73. ✅ **Action items system** — unified action items store with localStorage persistence
74. ✅ **Action calendar** — calendar view of due dates and milestones
75. ✅ **Submission management** — track CDRL deliverables and submissions
76. ✅ **Defense document library** — MIL-STD reference with version tracking

---

### COMMAND PALETTE (Cmd+K from anywhere in workspace)

**What you should see:**
- Search overlay with text input
- Categorized command list (Tools, Data, Security, Theme, etc.)
- Quick actions for all platform features

### Upgrades:
77. ✅ **Full command palette** — search and execute any platform action
78. ✅ **Category filters** — commands grouped by function
79. ✅ **Keyboard shortcuts** — Cmd+K to open, Esc to close
80. ✅ **Tour access** — "Start Tour" available in command palette
81. ✅ **Warranty check** — "Check Warranty Alerts" in command palette

---

### CROSS-CUTTING FEATURES (visible across all tools)

82. ✅ **Role-based access control** — roles system (admin, operator, viewer, auditor)
83. ✅ **Multi-tenant support** — tenant switching capability
84. ✅ **SSO / Auth providers** — CAC/PIV, OAuth, SAML integration points
85. ✅ **Encrypted localStorage** — AES-GCM encrypted storage wrapper
86. ✅ **Session timeout** — auto-lock after 30 minutes of inactivity
87. ✅ **XSS sanitization** — all user input sanitized before rendering
88. ✅ **Rate limiting** — API call rate limiter
89. ✅ **Audit chain** — tamper-evident hash chain for all operations
90. ✅ **Cloud sync** — sync data to cloud storage
91. ✅ **Cross-ledger verification** — verify across multiple blockchains
92. ✅ **NFT certificates** — mint verification certificates as NFTs
93. ✅ **DID (Decentralized ID)** — generate decentralized identifiers
94. ✅ **Smart contract deployment** — deploy anchor contracts
95. ✅ **Multi-chain support** — XRPL, Ethereum, Solana, Polygon chains
96. ✅ **Internationalization (i18n)** — language support framework
97. ✅ **Keyboard shortcuts system** — Cmd+K, Cmd+/, number keys for tools
98. ✅ **Test runner** — built-in test suite with coverage reporting
99. ✅ **A11y audit** — accessibility audit tool
100. ✅ **Load testing** — performance benchmarking tool

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
| Metrics: Records Generated stat | 65736b0 | ✅ Verified live |
| Metrics: Vault Size stat | 65736b0 | ✅ Verified live |
| Metrics: Storage Used stat | 65736b0 | ✅ Verified live |
| Metrics: Total Time stat | 65736b0 | ✅ Verified live |
| Metrics: Timing Breakdown table | 65736b0 | ✅ Verified live |
| SLS balance glitch fixed | 65736b0 | ✅ Verified live |
| Error toasts eliminated | 0237233 | ✅ Verified live |
| 17 JSON.parse calls hardened | 0237233 | ✅ Verified live |
| S4.toast gated to workspace | 0237233 | ✅ Verified live |
| s4Notify gated to workspace | 0237233 | ✅ Verified live |
| Metrics auto-fire gated | 0237233 | ✅ Verified live |

---

*This file is for internal QA reference. Delete or move it when verification is complete.*
