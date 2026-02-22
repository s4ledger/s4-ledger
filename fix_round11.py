#!/usr/bin/env python3
"""
Round 11 — DEFINITIVE fix for all remaining issues:

1. Calendar shows "undefined undefined" — add safety init inside renderActionCalendar
2. Tools showing twice — closeILSTool reveals tab bar; fix it to KEEP tabs hidden
3. Charts MUST react to ANY data change — hook every data-loading function to
   clear bp-rendered flags and re-render charts after data loads
4. Every program dropdown change must sync ALL other tool dropdowns
"""
import re, shutil, os

FILE = os.path.join(os.path.dirname(__file__), 'demo-app', 'index.html')
shutil.copy2(FILE, FILE + '.pre-round11')

with open(FILE, 'r', encoding='utf-8') as f:
    html = f.read()

changes = []

# ═══════════════════════════════════════════════════════════
# FIX 1: Calendar "undefined undefined" — safety init inside renderActionCalendar 
# ═══════════════════════════════════════════════════════════
old_cal_fn = """function renderActionCalendar() {
    var grid = document.getElementById('actionCalendarGrid');
    var label = document.getElementById('calMonthLabel');
    if (!grid || !label) return;
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    label.textContent = months[_calMonth] + ' ' + _calYear;"""

new_cal_fn = """function renderActionCalendar() {
    var grid = document.getElementById('actionCalendarGrid');
    var label = document.getElementById('calMonthLabel');
    if (!grid || !label) return;
    // Safety: ensure calendar vars are initialized
    if (typeof _calYear === 'undefined' || _calYear === undefined || _calYear === null) {
        var _now = new Date(); _calYear = _now.getFullYear(); _calMonth = _now.getMonth();
    }
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    label.textContent = months[_calMonth] + ' ' + _calYear;"""

if old_cal_fn in html:
    html = html.replace(old_cal_fn, new_cal_fn)
    changes.append('FIX 1: Calendar safety init inside renderActionCalendar')
else:
    changes.append('FIX 1: SKIP — renderActionCalendar not found exactly')

# ═══════════════════════════════════════════════════════════
# FIX 2: closeILSTool — keep tab bar hidden, only show card grid
# ═══════════════════════════════════════════════════════════
old_close = """    // Show hub tabs row
    var hubTabs = document.querySelector('.ils-hub-tabs');
    if (hubTabs) hubTabs.style.display = '';"""

new_close = """    // Keep hub tabs row HIDDEN — card grid is the only navigation
    var hubTabs = document.querySelector('.ils-hub-tabs');
    if (hubTabs) hubTabs.style.display = 'none';"""

if old_close in html:
    html = html.replace(old_close, new_close)
    changes.append('FIX 2: closeILSTool now keeps tab bar hidden')
else:
    changes.append('FIX 2: SKIP — closeILSTool tab display not found exactly')

# ═══════════════════════════════════════════════════════════
# FIX 3: Make EVERY data-loading function clear chart flags + re-render
#
# We inject a universal "refreshChartsForPanel" function and hook it
# into every tool's data loader via wrappers.
# ═══════════════════════════════════════════════════════════

# Find the IIFE that defines _bpRenderInPanel and add the refresh function after it
# First, let's find where the _bpInit function ends and inject our universal refresher

# Strategy: inject a new <script> block right before the closing </body> that:
# a) Wraps each data-loading function to clear flags + re-render after
# b) Makes all program dropdowns sync to each other
# c) Adds an event listener on EVERY input/select change in ILS to refresh charts

inject_block = """
<!-- ═══ ROUND 11: UNIVERSAL CHART REACTIVITY ENGINE ═══ -->
<script>
(function() {
    'use strict';
    
    // ══ Universal chart refresh for any panel ══
    function refreshChartsInActivePanel() {
        // Clear ALL bp-rendered flags
        document.querySelectorAll('canvas[data-bp-rendered]').forEach(function(c) {
            c.removeAttribute('data-bp-rendered');
        });
        // Clear charts-injected flags so containers are re-checked
        document.querySelectorAll('.ils-hub-panel[data-charts-injected]').forEach(function(p) {
            p.removeAttribute('data-charts-injected');
        });
        // Re-render the currently active panel
        var activePanel = document.querySelector('.ils-hub-panel[style*="display: block"], .ils-hub-panel[style*="display:block"], .ils-hub-panel.active');
        if (activePanel && typeof window._bpRenderInPanel === 'function') {
            try { window._bpRenderInPanel(activePanel); } catch(e) { console.warn('[R11] chart refresh error:', e); }
        }
    }
    window.refreshChartsInActivePanel = refreshChartsInActivePanel;

    // ══ Sync ALL program dropdowns when ANY one changes ══
    var programDropdownIds = ['ilsProgram','dmsmsProgram','readinessProgram','lifecycleProgram','complianceProgram','riskProgram','pdmPlatform','subProgram'];
    
    function syncProgramDropdowns(sourceId, value) {
        programDropdownIds.forEach(function(id) {
            if (id === sourceId) return;
            var el = document.getElementById(id);
            if (!el) return;
            // Check if option exists
            var hasOption = false;
            for (var i = 0; i < el.options.length; i++) {
                if (el.options[i].value === value) { hasOption = true; break; }
            }
            if (hasOption) el.value = value;
        });
    }
    window.syncProgramDropdowns = syncProgramDropdowns;

    // ══ Wrap each data-loading function to auto-refresh charts after ══
    var toolFunctions = {
        'loadDMSMSData': 'hub-dmsms',
        'loadReadinessData': 'hub-readiness',
        'calcCompliance': 'hub-compliance',
        'loadRiskData': 'hub-risk',
        'loadPredictiveData': 'hub-predictive',
        'calcROI': 'hub-roi'
    };
    
    Object.keys(toolFunctions).forEach(function(fnName) {
        var panelId = toolFunctions[fnName];
        if (typeof window[fnName] === 'function') {
            var _orig = window[fnName];
            window[fnName] = function() {
                var result = _orig.apply(this, arguments);
                // After data loads, refresh charts in this panel
                setTimeout(function() {
                    var panel = document.getElementById(panelId);
                    if (panel) {
                        // Clear bp-rendered only for this panel's canvases
                        panel.querySelectorAll('canvas[data-bp-rendered]').forEach(function(c) {
                            c.removeAttribute('data-bp-rendered');
                        });
                        if (typeof window._bpRenderInPanel === 'function') {
                            try { window._bpRenderInPanel(panel); } catch(e) {}
                        }
                    }
                }, 200);
                return result;
            };
        }
    });

    // ══ Hook EVERY program dropdown to sync + refresh ══
    programDropdownIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', function() {
            var val = el.value;
            if (!val || val === '__custom__') return;
            syncProgramDropdowns(id, val);
            // After syncing, trigger data reload for the current panel
            setTimeout(refreshChartsInActivePanel, 500);
        });
    });

    // ══ Hook INPUT changes in tool panels to refresh charts ══
    // This catches sliders, number inputs, checkboxes, textareas, etc.
    document.querySelectorAll('.ils-hub-panel').forEach(function(panel) {
        panel.addEventListener('change', function() {
            // Debounce: wait for DOM to settle
            clearTimeout(panel._chartRefreshTimer);
            panel._chartRefreshTimer = setTimeout(function() {
                panel.querySelectorAll('canvas[data-bp-rendered]').forEach(function(c) {
                    c.removeAttribute('data-bp-rendered');
                });
                if (typeof window._bpRenderInPanel === 'function') {
                    try { window._bpRenderInPanel(panel); } catch(e) {}
                }
            }, 300);
        });
        panel.addEventListener('input', function() {
            clearTimeout(panel._chartRefreshTimer);
            panel._chartRefreshTimer = setTimeout(function() {
                panel.querySelectorAll('canvas[data-bp-rendered]').forEach(function(c) {
                    c.removeAttribute('data-bp-rendered');
                });
                if (typeof window._bpRenderInPanel === 'function') {
                    try { window._bpRenderInPanel(panel); } catch(e) {}
                }
            }, 500);
        });
    });

    // ══ Also hook ILS checklist checkbox changes ══
    var checklistEl = document.getElementById('ilsChecklist');
    if (checklistEl) {
        checklistEl.addEventListener('change', function() {
            setTimeout(refreshChartsInActivePanel, 300);
        });
    }

    // ══ Hook the Run Full ILS Analysis button output ══
    var _origRunFull = window.runFullILSAnalysis;
    if (typeof _origRunFull === 'function') {
        window.runFullILSAnalysis = function() {
            _origRunFull.apply(this, arguments);
            setTimeout(refreshChartsInActivePanel, 800);
        };
    }

    // ══ Hook file uploads ══
    var _origHandleFiles = window.handleILSFiles;
    if (typeof _origHandleFiles === 'function') {
        window.handleILSFiles = function() {
            _origHandleFiles.apply(this, arguments);
            setTimeout(refreshChartsInActivePanel, 1000);
        };
    }

    console.log('[Round-11] Universal chart reactivity engine loaded');
})();
</script>
"""

# Insert before </body>
if '</body>' in html:
    html = html.replace('</body>', inject_block + '</body>')
    changes.append('FIX 3: Injected universal chart reactivity engine')
else:
    changes.append('FIX 3: SKIP — </body> not found')

# ═══════════════════════════════════════════════════════════
# FIX 4: Also make the tab bar CSS enforce display:none
# In case any JS tries to show it
# ═══════════════════════════════════════════════════════════
old_tab_css = '.ils-hub-tabs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:16px;padding:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px}'
new_tab_css = '.ils-hub-tabs{display:none!important;flex-wrap:wrap;gap:4px;margin-bottom:16px;padding:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px}'

if old_tab_css in html:
    html = html.replace(old_tab_css, new_tab_css)
    changes.append('FIX 4: Tab bar CSS now display:none!important')
else:
    changes.append('FIX 4: SKIP — tab CSS not found exactly')

# ═══════════════════════════════════════════════════════════
# Write
# ═══════════════════════════════════════════════════════════
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'\n{"="*60}')
print(f'ROUND 11 APPLIED — {len(changes)} operations')
print(f'{"="*60}')
for c in changes:
    status = '✅' if 'SKIP' not in c else '⚠️'
    print(f'  {status} {c}')
print(f'{"="*60}\n')

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

checks = [
    ('Calendar safety init', 'typeof _calYear' in content),
    ('Tab bar hidden in CSS', 'ils-hub-tabs{display:none!important' in content),
    ('Tab bar hidden in closeILSTool', "hubTabs.style.display = 'none'" in content),
    ('refreshChartsInActivePanel', 'refreshChartsInActivePanel' in content),
    ('syncProgramDropdowns', 'syncProgramDropdowns' in content),
    ('Tool function wrapping', "toolFunctions[fnName]" in content or "var _orig = window[fnName]" in content),
    ('Panel input/change listeners', 'panel._chartRefreshTimer' in content),
]

print('VERIFICATION:')
all_pass = True
for name, ok in checks:
    s = '✅' if ok else '❌'
    if not ok: all_pass = False
    print(f'  {s} {name}')

if all_pass:
    print('\n✅ ALL CHECKS PASSED')
else:
    print('\n⚠️  Some checks failed')
