// S4 Ledger — Main Entry Point
// This file imports all modules in the correct load order.
// Each module operates in global scope (window.*) for compatibility
// with onclick handlers and cross-module calls.

// ── Styles ──────────────────────────────────────────────────────
import './styles/main.css'

// ── DOMPurify Sanitization Layer ─────────────────────────────────
import './js/sanitize.js'

// ── Supabase Client Init ────────────────────────────────────────
import './js/supabase-init.js'

// ── Core: Module Registry & Security ────────────────────────────
import './js/registry.js'

// ── Session Initialization ──────────────────────────────────────
import './js/session-init.js'

// ── Main Engine (ILS tools, anchoring, persistence) ─────────────
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

// ── Program Brief Engine (Phase 3) ──────────────────────────────
import './js/brief.js'

// ── Platform Walkthrough & Feedback ─────────────────────────────
import './js/walkthrough.js'

// ── Web Vitals (LCP, FID, CLS, INP, TTFB) ──────────────────────
import './js/web-vitals.js'