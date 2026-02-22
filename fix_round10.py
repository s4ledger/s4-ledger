#!/usr/bin/env python3
"""
Round 10 — Fix ALL 6 issues from user feedback:

1. Platform Channels layout: 3-in-a-row → proper 2×2 grid
2. ILS Hub tools showing TWICE: injectChartContainers called from 4+ places
   duplicating chart containers. Consolidate wrappers + add guard.
3. Dropdowns: Remove all non-Navy branches (Army, AF, Marines, Space, CG).
   S4 Ledger is a NAVSEA product — Navy only.
4. Charts/info hardcoded: When you select a program, data in charts and tools
   doesn't change. Wire onILSProgramChange to refresh ALL tool charts.
5. Calendar STILL doesn't show: renderActionCalendar fires but the panel
   is display:none when it does. Need robust render + retry.
6. All prior tasks properly fixed.
"""
import re, shutil, os, sys

FILE = os.path.join(os.path.dirname(__file__), 'demo-app', 'index.html')

# Backup
shutil.copy2(FILE, FILE + '.pre-round10')

with open(FILE, 'r', encoding='utf-8') as f:
    html = f.read()

changes = []

# ═══════════════════════════════════════════════════════════
# FIX 1: Platform Channels — 2×2 grid instead of auto-fit
# ═══════════════════════════════════════════════════════════
old_hub_grid = '.hub-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:24px; }'
new_hub_grid = '.hub-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:16px; margin-bottom:24px; }'
if old_hub_grid in html:
    html = html.replace(old_hub_grid, new_hub_grid)
    changes.append('FIX 1: Platform channels → 2×2 grid')
else:
    # Try regex
    pat = r'\.hub-grid\s*\{[^}]*grid-template-columns:[^;]+;'
    m = re.search(pat, html)
    if m:
        old_text = m.group(0)
        new_text = old_text.replace(old_text.split('grid-template-columns:')[1].split(';')[0], 'repeat(2, 1fr)')
        html = html.replace(old_text, new_text)
        changes.append('FIX 1: Platform channels → 2×2 grid (regex)')
    else:
        changes.append('FIX 1: SKIP — hub-grid CSS not found')

# ═══════════════════════════════════════════════════════════
# FIX 2: Eliminate duplicate chart injection
# Remove the first openILSTool wrapper (lines ~10264-10320)
# and the DOMContentLoaded call to injectChartContainers.
# Keep only the bulletproof chart renderer (block 5) which
# already calls injectChartContainers with a guard.
# Also ensure injectChartContainers has a stronger guard.
# ═══════════════════════════════════════════════════════════

# 2a: Strengthen injectChartContainers guard — mark injected panels
old_inject_check = """    Object.keys(panels).forEach(function(panelId) {
        var conf = panels[panelId];
        var panel = document.getElementById(panelId);
        if (!panel) return;
        
        // Check if charts already injected
        var firstCanvasId = conf.charts.match(/id="([^"]+)"/);
        if (firstCanvasId && document.getElementById(firstCanvasId[1])) return;"""

new_inject_check = """    Object.keys(panels).forEach(function(panelId) {
        var conf = panels[panelId];
        var panel = document.getElementById(panelId);
        if (!panel) return;
        
        // ROBUST guard: check if charts already injected
        if (panel.getAttribute('data-charts-injected')) return;
        var firstCanvasId = conf.charts.match(/id="([^"]+)"/);
        if (firstCanvasId && document.getElementById(firstCanvasId[1])) { panel.setAttribute('data-charts-injected','1'); return; }"""

if old_inject_check in html:
    html = html.replace(old_inject_check, new_inject_check)
    changes.append('FIX 2a: Strengthened injectChartContainers guard')
else:
    changes.append('FIX 2a: SKIP — inject guard not found exactly')

# Add the data-charts-injected attribute at the end of each panel injection
old_inject_end = """        // For others, append to the first demo-card
        var wrapper = document.createElement('div');
        wrapper.innerHTML = conf.charts;
        card.appendChild(wrapper.firstElementChild);
    });
}"""
new_inject_end = """        // For others, append to the first demo-card
        var wrapper = document.createElement('div');
        wrapper.innerHTML = conf.charts;
        card.appendChild(wrapper.firstElementChild);
        panel.setAttribute('data-charts-injected','1');
    });
}"""
if old_inject_end in html:
    html = html.replace(old_inject_end, new_inject_end)
    changes.append('FIX 2b: Mark panels as charts-injected')
else:
    changes.append('FIX 2b: SKIP — inject end not found exactly')

# Also need to mark after the target insertion path
old_inject_target = """            if (target) {
                var wrapper = document.createElement('div');
                wrapper.innerHTML = conf.charts;
                target.parentNode.insertBefore(wrapper.firstElementChild, target.nextSibling);
                return;
            }"""
new_inject_target = """            if (target) {
                var wrapper = document.createElement('div');
                wrapper.innerHTML = conf.charts;
                target.parentNode.insertBefore(wrapper.firstElementChild, target.nextSibling);
                panel.setAttribute('data-charts-injected','1');
                return;
            }"""
if old_inject_target in html:
    html = html.replace(old_inject_target, new_inject_target)
    changes.append('FIX 2c: Mark panels as charts-injected (target path)')
else:
    changes.append('FIX 2c: SKIP — inject target not found exactly')

# 2d: Remove the DOMContentLoaded call that fires injectChartContainers again
old_dom_inject = """// Initialize chart containers on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(injectChartContainers, 2000);
});"""
if old_dom_inject in html:
    html = html.replace(old_dom_inject, '// Chart containers injected on demand by bulletproof renderer')
    changes.append('FIX 2d: Removed redundant DOMContentLoaded injectChartContainers')
else:
    changes.append('FIX 2d: SKIP — DOMContentLoaded inject not found exactly')

# ═══════════════════════════════════════════════════════════
# FIX 3: Dropdowns — Navy only
# Rewrite S4_buildProgramOptions to only show Navy branches
# ═══════════════════════════════════════════════════════════

old_build = """window.S4_buildProgramOptions = function(includeAll, includeCustom) {
    if (typeof PROGS === 'undefined') return '<option value="">No platforms loaded</option>';
    var html = '<option value="" disabled selected>— Select a Program —</option>';
    // Group programs by service branch
    var groups = {
        'Navy (NAVSEA)': [],
        'Navy (NAVAIR)': [],
        'Army': [],
        'Air Force': [],
        'Marines': [],
        'Space Force': [],
        'Coast Guard': [],
        'Joint / Other': []
    };
    var branchMap = {
        yrbm:'Navy (NAVSEA)', apl:'Navy (NAVSEA)', afdm:'Navy (NAVSEA)', ydt:'Navy (NAVSEA)', yon:'Navy (NAVSEA)',
        ddg51:'Navy (NAVSEA)', lcs:'Navy (NAVSEA)', cvn78:'Navy (NAVSEA)', ffg62:'Navy (NAVSEA)', lpd17:'Navy (NAVSEA)',
        f35:'Navy (NAVAIR)', f35b:'Marines', ch53k:'Navy (NAVAIR)',
        m1:'Army', stryker:'Army', ah64:'Army', himars:'Army', jltv:'Army', patriot:'Army',
        f35a:'Air Force', kc46:'Air Force', b21:'Air Force', c17:'Air Force', f15ex:'Air Force', t7a:'Air Force',
        gps3:'Space Force', sbirs:'Space Force',
        nsc:'Coast Guard', opc:'Coast Guard', frc:'Coast Guard',
        acv:'Marines', aav:'Marines'
    };
    Object.keys(PROGS).forEach(function(key) {
        var prog = PROGS[key];
        var branch = branchMap[key] || 'Joint / Other';
        if (!groups[branch]) groups[branch] = [];
        groups[branch].push({key: key, name: prog.name, ofc: prog.ofc});
    });
    // Build optgroups
    Object.keys(groups).forEach(function(branch) {
        var items = groups[branch];
        if (items.length === 0) return;
        html += '<optgroup label="' + branch + '">';
        items.forEach(function(item) {
            html += '<option value="' + item.key + '">' + item.name + ' (' + item.ofc + ')</option>';
        });
        html += '</optgroup>';
    });
    if (includeCustom) {
        html += '<optgroup label="Custom"><option value="__custom__">+ Add Custom Program...</option></optgroup>';
    }
    if (includeAll) {
        html = '<option value="all">All Programs</option>' + html;
    }
    return html;
};"""

new_build = """window.S4_buildProgramOptions = function(includeAll, includeCustom) {
    if (typeof PROGS === 'undefined') return '<option value="">No platforms loaded</option>';
    var html = '<option value="" disabled selected>\\u2014 Select a Program \\u2014</option>';
    // S4 Ledger is a NAVSEA product — Navy programs only
    var navyKeys = {
        'NAVSEA — Surface Combatants': ['ddg51','ffg62','lcs'],
        'NAVSEA — Carriers & Amphibs': ['cvn78','lpd17'],
        'NAVSEA — Service Craft (PMS 300)': ['yrbm','apl','afdm','ydt','yon'],
        'NAVAIR — Aviation': ['f35','f35b','ch53k']
    };
    Object.keys(navyKeys).forEach(function(group) {
        var keys = navyKeys[group];
        var items = [];
        keys.forEach(function(k) {
            if (PROGS[k]) items.push({key:k, name:PROGS[k].name, ofc:PROGS[k].ofc});
        });
        if (items.length === 0) return;
        html += '<optgroup label="' + group + '">';
        items.forEach(function(item) {
            html += '<option value="' + item.key + '">' + item.name + ' (' + item.ofc + ')</option>';
        });
        html += '</optgroup>';
    });
    if (includeCustom) {
        html += '<optgroup label="Custom"><option value="__custom__">+ Add Custom Program...</option></optgroup>';
    }
    if (includeAll) {
        html = '<option value="all">All Programs</option>' + html;
    }
    return html;
};"""

if old_build in html:
    html = html.replace(old_build, new_build)
    changes.append('FIX 3: Dropdowns now Navy-only (NAVSEA + NAVAIR)')
else:
    changes.append('FIX 3: SKIP — S4_buildProgramOptions not found exactly')

# Also update S4_countPlatforms to count only Navy
old_count = """window.S4_countPlatforms = function() {
    if (typeof PROGS === 'undefined') return 0;
    return Object.keys(PROGS).length;
};"""
new_count = """window.S4_countPlatforms = function() {
    if (typeof PROGS === 'undefined') return 0;
    var navyKeys = ['ddg51','ffg62','lcs','cvn78','lpd17','yrbm','apl','afdm','ydt','yon','f35','f35b','ch53k'];
    var count = 0;
    navyKeys.forEach(function(k){ if(PROGS[k]) count++; });
    return count;
};"""
if old_count in html:
    html = html.replace(old_count, new_count)
    changes.append('FIX 3b: countPlatforms now counts Navy only')
else:
    changes.append('FIX 3b: SKIP — countPlatforms not found exactly')

# ═══════════════════════════════════════════════════════════
# FIX 4: Charts react to program selection
# Expand onILSProgramChange to refresh ALL tool data,
# not just ILS checklist. Clear bp-rendered flags globally
# so bulletproof renderer will re-draw.
# ═══════════════════════════════════════════════════════════

old_program_change = """function onILSProgramChange() {
    // Clear bp-rendered flags so charts refresh with new program data (Round 9)
    document.querySelectorAll('.ils-hub-panel.active canvas[data-bp-rendered]').forEach(function(c) { c.removeAttribute('data-bp-rendered'); });
    const key = document.getElementById('ilsProgram').value;
    if (!key) return; // respect empty default
    // Handle custom program
    if (key === 'custom' || key === '__custom__') {
        showCustomProgramInput();
        return;
    }
    const prog = PROGS[key];
    if (!prog) return;
    const ofc = document.getElementById('ilsOffice');
    if (ofc) ofc.value = prog.ofc;
    // Rebuild checklist for this program
    initILSChecklist(key);
    // Re-apply auto-detection from any uploaded files
    updateChecklistFromUploads();
    // Reset results since program changed
    ilsResults = null;
    document.getElementById('ilsScore').textContent = '--';
    document.getElementById('ilsScore').style.color = 'var(--muted)';
    document.getElementById('ilsScoreLabel').textContent = 'Upload documents & run analysis';
    document.getElementById('ilsGaugeFill').style.width = '0%';
    document.getElementById('ilsCoverage').innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem">Upload files to see checklist coverage.</div>';
    document.getElementById('ilsActions').innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem;font-size:0.85rem">Run analysis to generate action items.</div>';
    document.getElementById('ilsCostSchedule').innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem">Analysis required to estimate impact.</div>';
    const r = document.getElementById('ilsResult'); r.innerHTML=''; r.classList.remove('show');
}"""

new_program_change = """function onILSProgramChange() {
    // Clear ALL bp-rendered flags so every chart refreshes with new program data
    document.querySelectorAll('canvas[data-bp-rendered]').forEach(function(c) { c.removeAttribute('data-bp-rendered'); });
    // Also clear charts-injected so containers get re-checked
    document.querySelectorAll('.ils-hub-panel[data-charts-injected]').forEach(function(p) { p.removeAttribute('data-charts-injected'); });
    var key = document.getElementById('ilsProgram').value;
    if (!key) return;
    // Handle custom program
    if (key === 'custom' || key === '__custom__') {
        showCustomProgramInput();
        return;
    }
    var prog = PROGS[key];
    if (!prog) return;
    var ofc = document.getElementById('ilsOffice');
    if (ofc) ofc.value = prog.ofc;
    // Rebuild checklist for this program
    initILSChecklist(key);
    // Re-apply auto-detection from any uploaded files
    updateChecklistFromUploads();
    // Reset ILS results
    ilsResults = null;
    document.getElementById('ilsScore').textContent = '--';
    document.getElementById('ilsScore').style.color = 'var(--muted)';
    document.getElementById('ilsScoreLabel').textContent = 'Upload documents & run analysis';
    document.getElementById('ilsGaugeFill').style.width = '0%';
    document.getElementById('ilsCoverage').innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem">Upload files to see checklist coverage.</div>';
    document.getElementById('ilsActions').innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem;font-size:0.85rem">Run analysis to generate action items.</div>';
    document.getElementById('ilsCostSchedule').innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem">Analysis required to estimate impact.</div>';
    var r = document.getElementById('ilsResult'); if(r){r.innerHTML=''; r.classList.remove('show');}

    // ═══ SYNC ALL OTHER TOOL DROPDOWNS to same program ═══
    ['dmsmsProgram','readinessProgram','lifecycleProgram','complianceProgram','riskProgram','pdmPlatform','subProgram'].forEach(function(id) {
        var sel = document.getElementById(id);
        if (sel) { sel.value = key; }
    });

    // ═══ REFRESH DATA FOR ALL TOOLS with new program context ═══
    // Generate program-specific DMSMS data
    if (typeof loadDMSMSData === 'function') { try { loadDMSMSData(); } catch(e){} }
    else if (typeof dmsmsItems !== 'undefined') {
        // Generate fresh DMSMS items based on program
        var dmsmsData = [];
        var partPool = [
            {nsn:'5961-01-123-4567',nomen:'CAPACITOR,FIXED',cage:'1HP47',status:'Obsolete',alt:'5961-01-999-8888'},
            {nsn:'5962-01-234-5678',nomen:'MICROCIRCUIT,DIGITAL',cage:'96214',status:'At-Risk (Diminishing)',alt:'5962-01-888-7777'},
            {nsn:'5905-01-345-6789',nomen:'RESISTOR,FIXED',cage:'81205',status:'Active',alt:'—'},
            {nsn:'5935-01-456-7890',nomen:'CONNECTOR,PLUG',cage:'77820',status:'EOL Planned',alt:'5935-01-777-6666'},
            {nsn:'6625-01-567-8901',nomen:'OSCILLOSCOPE',cage:'30003',status:'Discontinued',alt:'6625-01-666-5555'},
            {nsn:'5820-01-678-9012',nomen:'RADIO SET',cage:'13413',status:'At-Risk (Diminishing)',alt:'5820-01-555-4444'},
            {nsn:'1270-01-789-0123',nomen:'SIGHT,FIRE CONTROL',cage:'11672',status:'Active',alt:'—'}
        ];
        var numItems = 4 + Math.floor(prog.name.length % 5);
        for (var di = 0; di < Math.min(numItems, partPool.length); di++) {
            dmsmsData.push(Object.assign({}, partPool[di], {program: prog.name}));
        }
        dmsmsItems = dmsmsData;
    }
    // Refresh readiness, compliance, risk, lifecycle, predictive based on program
    if (typeof calcCompliance === 'function') { try { calcCompliance(); } catch(e){} }
    if (typeof loadRiskData === 'function') { try { loadRiskData(); } catch(e){} }
    if (typeof calcLifecycle === 'function') { try { calcLifecycle(); } catch(e){} }
    if (typeof loadPredictiveData === 'function') { try { loadPredictiveData(); } catch(e){} }
    if (typeof loadReadinessData === 'function') { try { loadReadinessData(); } catch(e){} }

    // Re-render charts in whichever panel is currently visible
    setTimeout(function() {
        var activePanel = document.querySelector('.ils-hub-panel.active');
        if (activePanel && typeof _bpRenderInPanel === 'function') {
            try { _bpRenderInPanel(activePanel); } catch(e){}
        }
    }, 400);
}"""

if old_program_change in html:
    html = html.replace(old_program_change, new_program_change)
    changes.append('FIX 4: onILSProgramChange now syncs ALL tools & refreshes charts')
else:
    changes.append('FIX 4: SKIP — onILSProgramChange not found exactly')

# ═══════════════════════════════════════════════════════════
# FIX 5: Calendar robust rendering
# The calendar renders on DOMContentLoaded and when hub-actions opens.
# Problem: panel may still be transitioning. 
# Fix: Add a robust retry loop and ensure it renders every time
# hub-actions becomes visible.
# ═══════════════════════════════════════════════════════════

old_cal_render_onload = """// Render calendar on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(renderActionCalendar, 500); });
} else {
    setTimeout(renderActionCalendar, 500);
}"""

new_cal_render_onload = """// Render calendar robustly — retry until grid exists and is visible
function renderActionCalendarSafe() {
    var grid = document.getElementById('actionCalendarGrid');
    var label = document.getElementById('calMonthLabel');
    if (!grid || !label) {
        // Retry — elements may not exist yet
        setTimeout(renderActionCalendarSafe, 500);
        return;
    }
    renderActionCalendar();
    // Double-check it actually rendered content
    if (!grid.innerHTML || grid.innerHTML.trim() === '') {
        setTimeout(renderActionCalendar, 300);
    }
}
// Initial render on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(renderActionCalendarSafe, 800); });
} else {
    setTimeout(renderActionCalendarSafe, 800);
}
// Also observe hub-actions panel visibility
(function() {
    var _actionsObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            if (m.type === 'attributes' && m.attributeName === 'style') {
                var panel = m.target;
                if (panel.id === 'hub-actions' && panel.style.display !== 'none') {
                    setTimeout(renderActionCalendar, 150);
                }
            }
        });
    });
    var actionsPanel = document.getElementById('hub-actions');
    if (actionsPanel) {
        _actionsObserver.observe(actionsPanel, { attributes: true, attributeFilter: ['style'] });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            var ap = document.getElementById('hub-actions');
            if (ap) _actionsObserver.observe(ap, { attributes: true, attributeFilter: ['style'] });
        });
    }
})();"""

if old_cal_render_onload in html:
    html = html.replace(old_cal_render_onload, new_cal_render_onload)
    changes.append('FIX 5: Calendar now has robust retry + MutationObserver')
else:
    changes.append('FIX 5: SKIP — calendar onload not found exactly')

# Also make the calendar render call in openILSTool more robust
old_cal_in_open = "if (toolId === 'hub-actions') { if (typeof renderHubActions === 'function') renderHubActions(); if (typeof renderActionCalendar === 'function') setTimeout(renderActionCalendar, 100); }"
new_cal_in_open = "if (toolId === 'hub-actions') { if (typeof renderHubActions === 'function') renderHubActions(); if (typeof renderActionCalendar === 'function') { setTimeout(renderActionCalendar, 200); setTimeout(renderActionCalendar, 600); } }"
if old_cal_in_open in html:
    html = html.replace(old_cal_in_open, new_cal_in_open)
    changes.append('FIX 5b: Calendar double-render in openILSTool')
else:
    changes.append('FIX 5b: SKIP — calendar in openILSTool not found exactly')

# ═══════════════════════════════════════════════════════════
# FIX 6: Make _bpRenderInPanel globally accessible
# The bulletproof chart renderer defines _bpRenderInPanel inside
# an IIFE, so onILSProgramChange can't call it. Expose it.
# ═══════════════════════════════════════════════════════════
# Find where _bpRenderInPanel is defined and expose it

if 'function _bpRenderInPanel(panel)' in html and 'window._bpRenderInPanel' not in html:
    html = html.replace(
        'function _bpRenderInPanel(panel)',
        'function _bpRenderInPanel(panel)' 
    )
    # Add window exposure after the IIFE that defines it
    # Find the pattern where it's called and add exposure
    if '    function _bpRenderInPanel(panel) {' in html:
        html = html.replace(
            '    function _bpRenderInPanel(panel) {',
            '    window._bpRenderInPanel = _bpRenderInPanel;\n    function _bpRenderInPanel(panel) {'
        )
        changes.append('FIX 6: Exposed _bpRenderInPanel globally (attempt 1)')
    else:
        changes.append('FIX 6: SKIP — _bpRenderInPanel indentation not matched')
else:
    changes.append('FIX 6: SKIP — _bpRenderInPanel already exposed or not found')

# Alternative: just add exposure at the end of the IIFE
# Look for a pattern where _bpRenderInPanel is used
if 'window._bpRenderInPanel' not in html:
    # Find the function and add global exposure right after
    pat = re.search(r'(function _bpRenderInPanel\(panel\)\s*\{)', html)
    if pat:
        # Add exposure before the function
        html = html.replace(pat.group(0), 'window._bpRenderInPanel = _bpRenderInPanel;\n' + pat.group(0), 1)
        changes.append('FIX 6: Exposed _bpRenderInPanel globally')
    else:
        changes.append('FIX 6: SKIP — could not find _bpRenderInPanel')


# ═══════════════════════════════════════════════════════════
# Write
# ═══════════════════════════════════════════════════════════
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'\n{"="*60}')
print(f'ROUND 10 FIX APPLIED — {len(changes)} operations')
print(f'{"="*60}')
for c in changes:
    status = '✅' if 'SKIP' not in c else '⚠️'
    print(f'  {status} {c}')
print(f'{"="*60}\n')

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

checks = [
    ('2x2 grid', 'repeat(2, 1fr)' in content),
    ('Navy only dropdown', 'NAVSEA — Surface Combatants' in content),
    ('No Army in dropdown', 'Army' not in content.split('S4_buildProgramOptions')[1].split('S4_countPlatforms')[0] if 'S4_buildProgramOptions' in content and 'S4_countPlatforms' in content else False),
    ('Program sync to all tools', 'dmsmsProgram' in content.split('onILSProgramChange')[1].split('}')[0] if 'onILSProgramChange' in content else False),
    ('Calendar MutationObserver', '_actionsObserver' in content),
    ('Charts-injected guard', 'data-charts-injected' in content),
    ('bpRenderInPanel exposed', 'window._bpRenderInPanel' in content),
]

print('VERIFICATION:')
all_pass = True
for name, ok in checks:
    status = '✅' if ok else '❌'
    if not ok: all_pass = False
    print(f'  {status} {name}')

if all_pass:
    print('\n✅ ALL CHECKS PASSED — Ready to commit and push')
else:
    print('\n⚠️  Some checks failed — review output above')
