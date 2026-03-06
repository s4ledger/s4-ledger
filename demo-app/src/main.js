// S4 Ledger Demo — Main Entry Point
// Imports all modules in correct load order.

// ── Styles ──────────────────────────────────────────────────────
import './styles/main.css'

// ── DOMPurify Sanitization Layer ─────────────────────────────────
import './js/sanitize.js'

// ── Core: Module Registry & Security ────────────────────────────
import './js/registry.js'

// ── Session Initialization ──────────────────────────────────────
import './js/session-init.js'

// ── Wallet Tab Toggle ───────────────────────────────────────────
import './js/wallet-toggle.js'

// ── Main Demo Engine (ILS tools, anchoring, demo data) ──────────
import './js/engine.js'

// ── UI: Scroll, Back-to-Top, Wallet ─────────────────────────────
import './js/scroll.js'

// ── Onboarding Wizard ───────────────────────────────────────────
import './js/onboarding.js'

// ── Metrics, Offline Queue, Charts, DOM Engine, Calendar ────────
import './js/metrics.js'

// ── Platform Hub Navigation ─────────────────────────────────────
import './js/navigation.js'

// ── Role-Based Access Control ───────────────────────────────────
import './js/roles.js'

// ── Enhancement Suite (Rounds 11-16+) ───────────────────────────
import './js/enhancements.js'

// ── Acquisition Planner ─────────────────────────────────────────
import './js/acquisition.js'

// ── Program Milestone Tracker (Phase 2) ─────────────────────────
import './js/milestones.js'

// ── Platform Walkthrough & Feedback ─────────────────────────────
import './js/walkthrough.js'

// ── Web Vitals (LCP, FID, CLS, INP, TTFB) ──────────────────────
import './js/web-vitals.js'