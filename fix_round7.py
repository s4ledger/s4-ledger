#!/usr/bin/env python3
"""
Round 7 Comprehensive Fix Script
Fixes ALL reported issues:
  1. Role popup: only shows when entering platform, NOT during interactive demo
  2. Customize Visible Tools: clean grid layout
  3. Role persistence: sessionStorage (resets on tab close)
  4. Role switching: clickable badge always visible
  5. Role → ILS visibility: fix selector for .ils-tool-card
  6. Logout: go to landing page, NO reload, NO welcome popup
  7. Action Item calendar: fix storage key mismatch (was reading sessionStorage 's4_action_items', items stored in localStorage 's4ActionItems')
  8. Back button: properly hide active panel + show tool grid
  9. ROI chart: fix flat line — use exponential growth curve for defaults
 10. Document Library: proper drag-and-drop upload, rename "diff" → "Document Intelligence Analysis", AI agent integration messaging
"""

import re
import sys

FILE = 'demo-app/index.html'

def read_file():
    with open(FILE, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(content):
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

def apply_fix(content, name, old, new):
    if old in content:
        content = content.replace(old, new, 1)
        print(f"  ✅ {name}")
        return content, True
    else:
        print(f"  ❌ {name} — anchor not found")
        return content, False

def main():
    content = read_file()
    total = 0
    ok = 0

    # ─────────────────────────────────────────────────────────────
    # FIX 1: Role system — use sessionStorage instead of localStorage
    # ─────────────────────────────────────────────────────────────
    print("\n── Fix 1: Role → sessionStorage ──")

    # 1a: _currentRole
    total += 1
    content, s = apply_fix(content,
        "1a: _currentRole from sessionStorage",
        "var _currentRole = localStorage.getItem('s4_user_role') || '';",
        "var _currentRole = sessionStorage.getItem('s4_user_role') || '';")
    if s: ok += 1

    # 1b: _currentTitle
    total += 1
    content, s = apply_fix(content,
        "1b: _currentTitle from sessionStorage",
        "var _currentTitle = localStorage.getItem('s4_user_title') || '';",
        "var _currentTitle = sessionStorage.getItem('s4_user_title') || '';")
    if s: ok += 1

    # 1c: _customVisibleTabs
    total += 1
    content, s = apply_fix(content,
        "1c: _customVisibleTabs from sessionStorage",
        "var _customVisibleTabs = JSON.parse(localStorage.getItem('s4_visible_tabs') || 'null');",
        "var _customVisibleTabs = JSON.parse(sessionStorage.getItem('s4_visible_tabs') || 'null');")
    if s: ok += 1

    # 1d: applyRole() — save to sessionStorage
    total += 1
    content, s = apply_fix(content,
        "1d: applyRole save role to sessionStorage",
        "localStorage.setItem('s4_user_role', _currentRole);\n    localStorage.setItem('s4_user_title', _currentTitle);",
        "sessionStorage.setItem('s4_user_role', _currentRole);\n    sessionStorage.setItem('s4_user_title', _currentTitle);")
    if s: ok += 1

    # 1e: applyRole() — save visible_tabs to sessionStorage
    total += 1
    content, s = apply_fix(content,
        "1e: applyRole save visible_tabs to sessionStorage",
        "localStorage.setItem('s4_visible_tabs', JSON.stringify(_customVisibleTabs));",
        "sessionStorage.setItem('s4_visible_tabs', JSON.stringify(_customVisibleTabs));")
    if s: ok += 1

    # 1f: applyRole() — removeItem from sessionStorage
    total += 1
    content, s = apply_fix(content,
        "1f: applyRole removeItem from sessionStorage",
        "localStorage.removeItem('s4_visible_tabs');",
        "sessionStorage.removeItem('s4_visible_tabs');")
    if s: ok += 1

    # ─────────────────────────────────────────────────────────────
    # FIX 2: Role popup — only show when inside platform, not during demo/landing
    # ─────────────────────────────────────────────────────────────
    print("\n── Fix 2: Role popup timing ──")

    total += 1
    old_init = """function initRoleSystem() {
    if (_currentRole) {
        var visibleTabs = _customVisibleTabs || (_s4Roles[_currentRole] ? _s4Roles[_currentRole].tabs : _allHubTabs);
        applyTabVisibility(visibleTabs);
    }
    updateRoleBadge();
    // Show role selector on first visit if no role set
    if (!_currentRole) {
        setTimeout(function() {
            // Only show if hub is visible
            var hubSection = document.querySelector('.ils-hub-tabs');
            if (hubSection) showRoleSelector();
        }, 2000);
    }
}"""
    new_init = """function initRoleSystem() {
    if (_currentRole) {
        var visibleTabs = _customVisibleTabs || (_s4Roles[_currentRole] ? _s4Roles[_currentRole].tabs : _allHubTabs);
        applyTabVisibility(visibleTabs);
    }
    updateRoleBadge();
    // Show role selector ONLY when user is inside the platform (not landing page or demo)
    if (!_currentRole) {
        setTimeout(function() {
            // Must have entered platform AND hub must be visible
            if (sessionStorage.getItem('s4_entered') === '1') {
                var hubSection = document.querySelector('.ils-hub-tabs');
                if (hubSection && hubSection.offsetParent !== null) showRoleSelector();
            }
        }, 2500);
    }
}"""
    content, s = apply_fix(content, "2: initRoleSystem only show when inside platform", old_init, new_init)
    if s: ok += 1

    # ─────────────────────────────────────────────────────────────
    # FIX 3: Customize Visible Tools — clean layout
    # ─────────────────────────────────────────────────────────────
    print("\n── Fix 3: Customize Visible Tools layout ──")

    total += 1
    old_customize = """+ '<details style="margin-bottom:16px"><summary style="cursor:pointer;color:var(--accent);font-weight:600;font-size:0.85rem"><i class="fas fa-sliders-h"></i> Customize Visible Tools</summary>'
        + '<div id="roleToolChecks" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:12px 0">';"""
    new_customize = """+ '<details style="margin-bottom:20px;background:rgba(0,170,255,0.03);border:1px solid rgba(0,170,255,0.12);border-radius:10px;padding:0 16px"><summary style="cursor:pointer;color:var(--accent);font-weight:600;font-size:0.85rem;padding:12px 0;list-style:none;display:flex;align-items:center;gap:8px"><i class="fas fa-sliders-h"></i> Customize Visible Tools <i class="fas fa-chevron-down" style="font-size:0.7rem;margin-left:auto;opacity:0.5"></i></summary>'
        + '<div id="roleToolChecks" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 0 16px">';"""
    content, s = apply_fix(content, "3a: Customize Tools details/summary style", old_customize, new_customize)
    if s: ok += 1

    # Fix the checkbox labels inside the tool checks
    total += 1
    old_check_label = """html += '<label style="display:flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--steel);cursor:pointer"><input type="checkbox" data-tab="'+tab+'" '+(vis?'checked':'')+' onchange="onRoleToolToggle()">' + (_allHubLabels[tab]||tab) + '</label>';"""
    new_check_label = """html += '<label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--steel);cursor:pointer;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:all 0.2s"><input type="checkbox" data-tab="'+tab+'" '+(vis?'checked':'')+' onchange="onRoleToolToggle()" style="accent-color:#00aaff;width:16px;height:16px;flex-shrink:0"> <span>' + (_allHubLabels[tab]||tab) + '</span></label>';"""
    content, s = apply_fix(content, "3b: Checkbox label styling", old_check_label, new_check_label)
    if s: ok += 1

    # ─────────────────────────────────────────────────────────────
    # FIX 4: Role switching — make badge more prominent + always clickable
    # ─────────────────────────────────────────────────────────────
    print("\n── Fix 4: Role badge more prominent ──")

    total += 1
    old_badge_style = "badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;font-size:0.72rem;font-weight:600;background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.15);color:#a78bfa;cursor:pointer';"
    new_badge_style = "badge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.25);color:#a78bfa;cursor:pointer;transition:all 0.2s;hover:background:rgba(167,139,250,0.2)';badge.title='Click to change your role';"
    content, s = apply_fix(content, "4: Role badge style + tooltip", old_badge_style, new_badge_style)
    if s: ok += 1

    # ─────────────────────────────────────────────────────────────
    # FIX 5: Role → ILS visibility — fix selector for tool cards
    # ─────────────────────────────────────────────────────────────
    print("\n── Fix 5: Role controls ILS tool card visibility ──")

    total += 1
    old_visibility = """    // Also show/hide tool cards in the ILS tool grid
    document.querySelectorAll('.itc[onclick]').forEach(function(card) {
        var onclick = card.getAttribute('onclick') || '';
        var match = onclick.match(/openILSTool\\('([^']+)'/);
        if (match) {
            card.style.display = visibleTabs.indexOf(match[1]) >= 0 ? '' : 'none';
        }
    });"""
    new_visibility = """    // Also show/hide tool cards in the ILS tool grid
    document.querySelectorAll('.ils-tool-card[onclick]').forEach(function(card) {
        var onclick = card.getAttribute('onclick') || '';
        var match = onclick.match(/openILSTool\\('([^']+)'/);
        if (match) {
            card.style.display = visibleTabs.indexOf(match[1]) >= 0 ? '' : 'none';
        }
    });"""
    content, s = apply_fix(content, "5: Fix tool card selector .itc → .ils-tool-card", old_visibility, new_visibility)
    if s: ok += 1

    # ─────────────────────────────────────────────────────────────
    # FIX 6: Logout → go to landing page, NO reload, NO welcome popup
    # ─────────────────────────────────────────────────────────────
    print("\n── Fix 6: Logout flow → landing page ──")

    total += 1
    old_logout = """function resetDemoSession() {
    if (!confirm('Reset your demo session? This will clear all anchored records, stats, and cached data.')) return;
    // Clear all S4 localStorage keys
    localStorage.removeItem('s4_demo_stats');
    localStorage.removeItem('s4_anchored_records');
    localStorage.removeItem('s4_wallet');
    localStorage.removeItem('s4_selected_tier');
    localStorage.removeItem('s4_vault');
    localStorage.removeItem('s4_action_items');
    localStorage.removeItem('s4_uploaded_docs');
    // Clear sessionStorage
    sessionStorage.removeItem('s4_onboard_done');
    // Reset in-memory state
    _demoSession = null;
    stats = {anchored:0, verified:0, types:new Set(), slsFees:0};
    sessionRecords = [];
    if (typeof s4Vault !== 'undefined') s4Vault = [];
    if (typeof s4ActionItems !== 'undefined') s4ActionItems = [];
    // Reload page (will trigger onboarding again since sessionStorage cleared)
    window.location.reload();
}"""
    new_logout = """function resetDemoSession() {
    if (!confirm('End your session? This will clear all anchored records, stats, and cached data and return you to the platform landing page.')) return;
    // Clear all S4 localStorage keys
    localStorage.removeItem('s4_demo_stats');
    localStorage.removeItem('s4_anchored_records');
    localStorage.removeItem('s4_wallet');
    localStorage.removeItem('s4_selected_tier');
    localStorage.removeItem('s4_vault');
    localStorage.removeItem('s4_action_items');
    localStorage.removeItem('s4ActionItems');
    localStorage.removeItem('s4_uploaded_docs');
    localStorage.removeItem('s4_doc_versions');
    localStorage.removeItem('s4_doc_notifications');
    // Clear role from sessionStorage (session-scoped)
    sessionStorage.removeItem('s4_user_role');
    sessionStorage.removeItem('s4_user_title');
    sessionStorage.removeItem('s4_visible_tabs');
    // Clear platform-entered flag so landing page shows
    sessionStorage.removeItem('s4_entered');
    // Keep onboard_done so the welcome wizard does NOT re-pop
    // (user already saw it once this browser session)
    // Reset in-memory state
    _demoSession = null;
    stats = {anchored:0, verified:0, types:new Set(), slsFees:0};
    sessionRecords = [];
    if (typeof s4Vault !== 'undefined') s4Vault = [];
    if (typeof s4ActionItems !== 'undefined') s4ActionItems = [];
    _currentRole = ''; _currentTitle = ''; _customVisibleTabs = null;
    // Return to landing page WITHOUT reload (no popup)
    var workspace = document.getElementById('platformWorkspace');
    var landing = document.getElementById('platformLanding');
    var hero = document.querySelector('.hero');
    if (workspace) workspace.style.display = 'none';
    if (landing) landing.style.display = '';
    if (hero) hero.style.display = '';
    // Hide any open tool panels
    document.querySelectorAll('.ils-hub-panel').forEach(function(p) { p.classList.remove('active'); });
    var toolBack = document.getElementById('ilsToolBackBar');
    if (toolBack) toolBack.style.display = 'none';
    var subHub = document.getElementById('ilsSubHub');
    if (subHub) subHub.style.display = 'grid';
    // Remove role badge
    var badge = document.getElementById('roleBadge');
    if (badge) badge.remove();
    // Reset all tab visibility to full
    if (typeof applyTabVisibility === 'function') applyTabVisibility(_allHubTabs || []);
    // Scroll to top
    window.scrollTo(0, 0);
}"""
    content, s = apply_fix(content, "6: Logout → landing page, no reload, no popup", old_logout, new_logout)
    if s: ok += 1

    # ─────────────────────────────────────────────────────────────
    # FIX 7: Action Item Calendar — fix storage key mismatch
    #   Calendar reads: sessionStorage.getItem('s4_action_items')
    #   Items stored in: localStorage.getItem('s4ActionItems')
    # ─────────────────────────────────────────────────────────────
    print("\n── Fix 7: Action Item Calendar storage key fix ──")

    # 7a: renderActionCalendar — fix the items source
    total += 1
    old_cal_source = """    // Collect action item due dates from sessionStorage
    var actionDates = {};
    try {
        var items = JSON.parse(sessionStorage.getItem('s4_action_items') || '[]');
        items.forEach(function(item) {
            if (item.due) {
                var d = new Date(item.due);
                if (d.getFullYear() === _calYear && d.getMonth() === _calMonth) {
                    var day = d.getDate();
                    if (!actionDates[day]) actionDates[day] = [];
                    actionDates[day].push(item);
                }
            }
        });
    } catch(e) {}"""
    new_cal_source = """    // Collect action item due dates from in-memory array and localStorage
    var actionDates = {};
    try {
        var items = (typeof s4ActionItems !== 'undefined' && s4ActionItems.length > 0)
            ? s4ActionItems
            : JSON.parse(localStorage.getItem('s4ActionItems') || '[]');
        items.forEach(function(item) {
            var dueStr = item.due || item.schedule || '';
            if (dueStr) {
                var d = new Date(dueStr);
                if (!isNaN(d.getTime()) && d.getFullYear() === _calYear && d.getMonth() === _calMonth) {
                    var day = d.getDate();
                    if (!actionDates[day]) actionDates[day] = [];
                    actionDates[day].push(item);
                }
            }
        });
    } catch(e) {}"""
    content, s = apply_fix(content, "7a: renderActionCalendar fix storage source", old_cal_source, new_cal_source)
    if s: ok += 1

    # 7b: showCalDay — fix the items source
    total += 1
    old_cal_day = """    var actionDates = {};
    try {
        var items = JSON.parse(sessionStorage.getItem('s4_action_items') || '[]');
        items.forEach(function(item) {
            if (item.due) {
                var d = new Date(item.due);
                if (d.getFullYear() === _calYear && d.getMonth() === _calMonth) {
                    var dy = d.getDate();
                    if (!actionDates[dy]) actionDates[dy] = [];
                    actionDates[dy].push(item);
                }
            }
        });
    } catch(e) {}"""
    new_cal_day = """    var actionDates = {};
    try {
        var items = (typeof s4ActionItems !== 'undefined' && s4ActionItems.length > 0)
            ? s4ActionItems
            : JSON.parse(localStorage.getItem('s4ActionItems') || '[]');
        items.forEach(function(item) {
            var dueStr = item.due || item.schedule || '';
            if (dueStr) {
                var d = new Date(dueStr);
                if (!isNaN(d.getTime()) && d.getFullYear() === _calYear && d.getMonth() === _calMonth) {
                    var dy = d.getDate();
                    if (!actionDates[dy]) actionDates[dy] = [];
                    actionDates[dy].push(item);
                }
            }
        });
    } catch(e) {}"""
    content, s = apply_fix(content, "7b: showCalDay fix storage source", old_cal_day, new_cal_day)
    if s: ok += 1

    # 7c: Fix the calendar default label "June 2025" → use current date
    total += 1
    old_cal_label = '<span id="calMonthLabel" style="font-size:0.82rem;color:var(--steel);font-weight:600;min-width:120px;text-align:center;line-height:28px">June 2025</span>'
    new_cal_label = '<span id="calMonthLabel" style="font-size:0.82rem;color:var(--steel);font-weight:600;min-width:120px;text-align:center;line-height:28px"></span>'
    content, s = apply_fix(content, "7c: Remove hardcoded 'June 2025' label", old_cal_label, new_cal_label)
    if s: ok += 1

    # ─────────────────────────────────────────────────────────────
    # FIX 8: Back button — properly hide active panel + show tool grid
    # ─────────────────────────────────────────────────────────────
    print("\n── Fix 8: Back button ──")

    total += 1
    old_close = """function closeILSTool() {
    var subHub = document.getElementById('ilsSubHub');
    if (subHub) { subHub.style.display = 'grid'; subHub.style.animation = 'fadeIn 0.3s ease'; }
    var toolBack = document.getElementById('ilsToolBackBar');
    if (toolBack) toolBack.style.display = 'none';
    document.querySelectorAll('.ils-hub-panel').forEach(function(p) { p.classList.remove('active'); });
    _currentILSTool = null;
}"""
    new_close = """function closeILSTool() {
    // Hide ALL tool panels (remove active class AND force display)
    document.querySelectorAll('.ils-hub-panel').forEach(function(p) {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    // Show tool grid
    var subHub = document.getElementById('ilsSubHub');
    if (subHub) { subHub.style.display = 'grid'; subHub.style.animation = 'fadeIn 0.3s ease'; }
    // Hide back bar
    var toolBack = document.getElementById('ilsToolBackBar');
    if (toolBack) toolBack.style.display = 'none';
    // Show hub tabs row
    var hubTabs = document.querySelector('.ils-hub-tabs');
    if (hubTabs) hubTabs.style.display = '';
    _currentILSTool = null;
    // Re-apply role visibility on tool cards
    if (_currentRole && typeof applyTabVisibility === 'function') {
        var vis = _customVisibleTabs || (_s4Roles[_currentRole] ? _s4Roles[_currentRole].tabs : _allHubTabs);
        applyTabVisibility(vis);
    }
}"""
    content, s = apply_fix(content, "8: closeILSTool properly hides panels + shows grid", old_close, new_close)
    if s: ok += 1

    # Also fix openILSTool to set display on the panel
    total += 1
    old_open_panel = """    // Activate the tool panel
    document.querySelectorAll('.ils-hub-panel').forEach(function(p) { p.classList.remove('active'); });
    var panel = document.getElementById(toolId);
    if (panel) { panel.classList.add('active'); panel.style.animation = 'fadeIn 0.3s ease'; }"""
    new_open_panel = """    // Activate the tool panel (hide all, then show target)
    document.querySelectorAll('.ils-hub-panel').forEach(function(p) { p.classList.remove('active'); p.style.display = 'none'; });
    var panel = document.getElementById(toolId);
    if (panel) { panel.style.display = 'block'; panel.classList.add('active'); panel.style.animation = 'fadeIn 0.3s ease'; }"""
    content, s = apply_fix(content, "8b: openILSTool force display on panel", old_open_panel, new_open_panel)
    if s: ok += 1

    # ─────────────────────────────────────────────────────────────
    # FIX 9: ROI Chart — fix flat line, use exponential growth curve
    # ─────────────────────────────────────────────────────────────
    print("\n── Fix 9: ROI chart curve ──")

    total += 1
    old_roi = """        roiLineChart: function() {
            var s = _getToolState();
            var monthlyRecords = s.roiPrograms * s.roiRecords;
            var volMult = 1 + Math.sqrt(Math.max(0, monthlyRecords)) / 50;
            var annualLabor = s.roiFTEs * 2080 * s.roiRate;
            var laborSave = annualLabor * 0.65 * volMult;
            var auditSave = s.roiAudit * 0.70 * Math.max(1, s.roiPrograms / 5);
            var totalAnnual = laborSave + auditSave;
            var license = s.roiLicense || 1;
            // Build 20 quarters (5 full years) of cumulative ROI
            var labels = []; var data = [];
            for (var y = 1; y <= 5; y++) { for (var q = 1; q <= 4; q++) { labels.push('Y'+y+'-Q'+q); var months = ((y-1)*4+q)*3; var cumSavings = (totalAnnual/12)*months; var cumLicense = (license/12)*months; var roiPct = cumLicense>0?((cumSavings-cumLicense)/cumLicense*100):0; data.push(Math.round(roiPct)); }}
            if (data.every(function(v){return v===0;})) data = [5,15,30,55,80,110,145,185,225,270,320,370,420,475,530,590,650,715,785,860];"""
    new_roi = """        roiLineChart: function() {
            var s = _getToolState();
            var monthlyRecords = s.roiPrograms * s.roiRecords;
            var volMult = 1 + Math.sqrt(Math.max(0, monthlyRecords)) / 50;
            var annualLabor = s.roiFTEs * 2080 * s.roiRate;
            var laborSave = annualLabor * 0.65 * volMult;
            var auditSave = s.roiAudit * 0.70 * Math.max(1, s.roiPrograms / 5);
            var totalAnnual = laborSave + auditSave;
            var license = s.roiLicense || 1;
            // Build 20 quarters (5 full years) of cumulative ROI
            var labels = []; var data = [];
            var hasInput = (s.roiPrograms > 0 || s.roiFTEs > 0 || s.roiLicense > 0);
            if (hasInput) {
                for (var y = 1; y <= 5; y++) { for (var q = 1; q <= 4; q++) { labels.push('Y'+y+'-Q'+q); var months = ((y-1)*4+q)*3; var cumSavings = (totalAnnual/12)*months; var cumLicense = (license/12)*months; var roiPct = cumLicense>0?((cumSavings-cumLicense)/cumLicense*100):0; data.push(Math.round(roiPct)); }}
            }
            // Always use the visually appealing default curve when no real inputs
            if (!hasInput || data.every(function(v){return v===0;})) {
                labels = []; data = [];
                for (var y2 = 1; y2 <= 5; y2++) { for (var q2 = 1; q2 <= 4; q2++) {
                    labels.push('Y'+y2+'-Q'+q2);
                    var qtr = (y2-1)*4+q2;
                    // Exponential-ish growth curve that looks realistic
                    data.push(Math.round(-20 + 50 * Math.pow(qtr/20, 0.6) * qtr));
                }}
            }"""
    content, s = apply_fix(content, "9: ROI chart exponential growth curve", old_roi, new_roi)
    if s: ok += 1

    # ─────────────────────────────────────────────────────────────
    # FIX 10: Document Library
    #   10a: Rename "Upload & Diff" button → "Upload & Analyze"
    #   10b: Rename "diff-highlighted and flagged" description
    #   10c: Rename showDiffResult title "Version Diff" → "Document Intelligence Analysis"
    #   10d: Improve the Add Document modal with proper drag-and-drop + AI messaging
    #   10e: Rename "Upload Version" button label
    # ─────────────────────────────────────────────────────────────
    print("\n── Fix 10: Document Library ──")

    # 10a: Rename "Upload & Diff" button
    total += 1
    content, s = apply_fix(content,
        "10a: Rename 'Upload & Diff' → 'Upload & Analyze'",
        "Upload & Diff</button>",
        "Upload & Analyze</button>")
    if s: ok += 1

    # 10b: Rename diff description
    total += 1
    content, s = apply_fix(content,
        "10b: Rename diff description text",
        "Upload a revised version of an existing document. Changes will be diff-highlighted and flagged.",
        "Upload a revised version of an existing document. Our AI agent will analyze it for discrepancies, changes, errors, omissions, and cost modifications — then flag anything that needs attention.")
    if s: ok += 1

    # 10c: Rename "Version Diff" title in showDiffResult
    total += 1
    content, s = apply_fix(content,
        "10c: Rename 'Version Diff' → 'Document Intelligence Analysis'",
        """'<h3 style="color:#fff;margin:0 0 16px"><i class="fas fa-code-branch" style="color:#c9a84c;margin-right:8px"></i>Version Diff: '+docId+'</h3>'""",
        """'<h3 style="color:#fff;margin:0 0 16px"><i class="fas fa-brain" style="color:#c9a84c;margin-right:8px"></i>Document Intelligence Analysis: '+docId+'</h3>'
                + '<div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.15);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:0.8rem;color:var(--steel)"><i class="fas fa-robot" style="color:#a78bfa;margin-right:6px"></i><strong style="color:#a78bfa">S4 AI Agent:</strong> Analyzed document for discrepancies, unauthorized changes, errors, omissions, and cost modifications.</div>'""")
    if s: ok += 1

    # 10d: Rename "Upload Version" button in the doc library toolbar
    total += 1
    content, s = apply_fix(content,
        "10d: Rename 'Upload Version' button",
        """<i class="fas fa-code-branch"></i> Upload Version</button>""",
        """<i class="fas fa-brain"></i> Analyze Revision</button>""")
    if s: ok += 1

    # 10e: Improve Add Document modal — better drag-and-drop with proper dropzone
    total += 1
    old_upload_modal = """+ '<div style="border:2px dashed rgba(0,170,255,0.3);border-radius:12px;padding:20px;text-align:center;color:var(--muted);cursor:pointer" onclick="document.getElementById(\\'newDocFile\\').click()"><i class="fas fa-cloud-upload-alt" style="font-size:1.5rem;margin-bottom:8px;display:block;color:var(--accent)"></i>Drop file or click to upload<br><span style="font-size:0.75rem">.pdf, .docx, .xlsx, .txt</span><input type="file" id="newDocFile" style="display:none" accept=".pdf,.docx,.xlsx,.txt,.csv" onchange="handleDocFileSelect(this)"></div>'"""
    new_upload_modal = """+ '<div id="docUploadDropzone" ondragover="event.preventDefault();event.stopPropagation();this.style.borderColor=\\'var(--accent)\\';this.style.background=\\'rgba(0,170,255,0.08)\\'" ondragleave="this.style.borderColor=\\'rgba(0,170,255,0.3)\\';this.style.background=\\'rgba(0,170,255,0.02)\\'" ondrop="event.preventDefault();event.stopPropagation();this.style.borderColor=\\'rgba(0,170,255,0.3)\\';this.style.background=\\'rgba(0,170,255,0.02)\\';if(event.dataTransfer.files.length){var inp=document.getElementById(\\'newDocFile\\');inp.files=event.dataTransfer.files;handleDocFileSelect(inp)}" onclick="document.getElementById(\\'newDocFile\\').click()" style="border:2px dashed rgba(0,170,255,0.3);border-radius:12px;padding:28px 20px;text-align:center;color:var(--muted);cursor:pointer;background:rgba(0,170,255,0.02);transition:all 0.3s"><i class="fas fa-cloud-upload-alt" style="font-size:2rem;margin-bottom:10px;display:block;color:var(--accent)"></i><div style=\\'font-size:0.9rem;color:var(--steel);font-weight:600;margin-bottom:6px\\'>Drag & drop your file here</div><div style=\\'font-size:0.78rem;color:var(--muted)\\'>or <span style=\\'color:var(--accent);text-decoration:underline\\'>click to browse</span></div><div style=\\'font-size:0.72rem;color:var(--muted);margin-top:8px\\'>PDF, Word, Excel, CSV, TXT — any document type</div><input type="file" id="newDocFile" style="display:none" accept=".pdf,.docx,.xlsx,.txt,.csv,.json" onchange="handleDocFileSelect(this)"></div>'
        + '<div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.15);border-radius:8px;padding:10px 14px;margin-top:12px;font-size:0.78rem;color:var(--steel)"><i class="fas fa-robot" style="color:#a78bfa;margin-right:6px"></i><strong style="color:#a78bfa">S4 AI Agent</strong> will automatically scan uploads for discrepancies, compliance gaps, unauthorized changes, and red flags.</div>'"""
    content, s = apply_fix(content, "10e: Add Document modal drag-and-drop + AI messaging", old_upload_modal, new_upload_modal)
    if s: ok += 1

    # 10f: Add AI messaging to the notification for newly added documents
    total += 1
    old_notify_add = """s4Notify('Document Added', id + ' — ' + title + (flags.length > 0 ? ' ('+flags.length+' flags detected)' : ''), flags.length > 0 ? 'warning' : 'success');"""
    new_notify_add = """s4Notify('Document Added', id + ' — ' + title + (flags.length > 0 ? ' — AI Agent detected '+flags.length+' issue'+(flags.length>1?'s':'') : ' — AI Agent scan complete, no issues found'), flags.length > 0 ? 'warning' : 'success');"""
    content, s = apply_fix(content, "10f: AI agent messaging in doc add notification", old_notify_add, new_notify_add)
    if s: ok += 1

    # 10g: Add AI messaging to version upload notification
    total += 1
    old_notify_ver = """s4Notify('Version Uploaded', docId + ' v' + newVer.version + ' — ' + diff.added + ' added, ' + diff.removed + ' removed' + (flags.length>0 ? ', '+flags.length+' RED FLAGS' : ''), flags.length>0?'warning':'success');"""
    new_notify_ver = """s4Notify('AI Analysis Complete', docId + ' v' + newVer.version + ' — ' + diff.added + ' additions, ' + diff.removed + ' removals, ' + diff.changed + ' modifications' + (flags.length>0 ? ' | '+flags.length+' red flag'+(flags.length>1?'s':'')+' detected' : ' | No issues found'), flags.length>0?'warning':'success');"""
    content, s = apply_fix(content, "10g: AI agent messaging in version upload notification", old_notify_ver, new_notify_ver)
    if s: ok += 1

    # ─────────────────────────────────────────────────────────────
    # FIX 11: Every tool should reference AI agent communication
    # Add a subtle "S4 AI Agent Active" indicator to the ILS tool back bar
    # ─────────────────────────────────────────────────────────────
    print("\n── Fix 11: AI Agent indicator on tool bar ──")

    total += 1
    old_backbar_end = """<span style="color:var(--steel)"><i class="fas fa-bolt" style="color:var(--accent);margin-right:4px"></i>Spent: <strong id="toolSlsSpent" style="color:var(--accent)">0.00</strong> SLS</span></div></div></div>"""
    new_backbar_end = """<span style="color:var(--steel)"><i class="fas fa-bolt" style="color:var(--accent);margin-right:4px"></i>Spent: <strong id="toolSlsSpent" style="color:var(--accent)">0.00</strong> SLS</span><span style="color:#a78bfa;margin-left:8px"><i class="fas fa-robot" style="margin-right:4px"></i>AI Agent Active</span></div></div></div>"""
    content, s = apply_fix(content, "11: AI Agent Active indicator on tool bar", old_backbar_end, new_backbar_end)
    if s: ok += 1

    # ─────────────────────────────────────────────────────────────
    # WRITE RESULT
    # ─────────────────────────────────────────────────────────────
    write_file(content)

    print(f"\n{'='*50}")
    print(f"Round 7: {ok}/{total} fixes applied successfully")
    print(f"{'='*50}")

    # Verify brace balance
    opens = content.count('{')
    closes = content.count('}')
    print(f"Brace balance: {{ = {opens}, }} = {closes} {'✅ BALANCED' if opens == closes else '⚠️  IMBALANCED'}")

    scripts_open = content.count('<script')
    scripts_close = content.count('</script>')
    print(f"Script tags: <script = {scripts_open}, </script> = {scripts_close} {'✅ BALANCED' if scripts_open == scripts_close else '⚠️  IMBALANCED'}")

    if ok < total:
        print(f"\n⚠️  {total - ok} fixes failed — check anchors above")
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
