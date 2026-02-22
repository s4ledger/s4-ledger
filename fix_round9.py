#!/usr/bin/env python3
"""
Round 9 — COMPREHENSIVE FIX for S4 Ledger
==========================================

ROOT CAUSES IDENTIFIED:

1. S4_buildProgramOptions FUNCTION MISSING (MASTER BUG)
   - populateAllDropdowns() calls window.S4_buildProgramOptions() which DOES NOT EXIST
   - ALL 8 program dropdowns across ALL tools are EMPTY
   - This causes: "Pick a program" errors, charts don't change, no program-specific data
   - FIX: Create the function that generates <option> HTML from the PROGS object

2. DEMO VERIFY AUTO-POPULATE NOT WORKING
   - "Now Verify It" button calls switchDemoTab('verify') but doesn't pre-fill content
   - _anchoredRecords stores {type,hash,txHash,ledger,time} but NOT the raw content text
   - FIX: Save content in _anchoredRecords, auto-fill verify textarea on "Now Verify It"

3. ROI CHART IS A STRAIGHT LINE
   - Old renderROICharts(): cumulative = (y+1) * (baseSavings - license) → straight line
   - Bulletproof roiLineChart: roiPct = (totalAnnual-license)/license*100 → FLAT horizontal
   - Both formulas produce linear/constant output because months cancel out
   - FIX: Model realistic adoption ramp with compound growth curve

4. PRELOAD USES WRONG CASE
   - preloadAllILSDemoData uses 'DDG51' but PROGS keys are lowercase 'ddg51'
   - FIX: Use correct lowercase value

5. CALENDAR GRID FORCE RENDER
   - Calendar code is structurally correct but ensure robustness
   - FIX: Ensure grid always renders on open, add safety re-render
"""

import re, os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(BASE, 'demo-app', 'index.html')
DEMO  = os.path.join(BASE, 'demo-app', 'demo.html')

def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

changes = []

# ═══════════════════════════════════════════════════════════════
#  FIX 1: Create S4_buildProgramOptions + S4_countPlatforms
# ═══════════════════════════════════════════════════════════════

ix = read(INDEX)

# We need to inject the function BEFORE populateAllDropdowns is called.
# The best place is right before the populateAllDropdowns function definition.
# We'll insert it just before "function populateAllDropdowns()"

S4_BUILD_FN = r'''
// ═══ S4 PLATFORM DATABASE BRIDGE (Round 9) ═══
// Generates program <option> elements from the PROGS object for all tool dropdowns
window.S4_buildProgramOptions = function(includeAll, includeCustom) {
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
};

window.S4_countPlatforms = function() {
    if (typeof PROGS === 'undefined') return 0;
    return Object.keys(PROGS).length;
};
// ═══ END S4 PLATFORM DATABASE BRIDGE ═══

'''

# Insert right before populateAllDropdowns
target = 'function populateAllDropdowns() {'
if target in ix:
    ix = ix.replace(target, S4_BUILD_FN + target, 1)
    changes.append('FIX 1: Created S4_buildProgramOptions and S4_countPlatforms functions')
else:
    print('ERROR: Could not find populateAllDropdowns function')
    sys.exit(1)


# ═══════════════════════════════════════════════════════════════
#  FIX 2: Fix preloadAllILSDemoData program case (DDG51 → ddg51)
# ═══════════════════════════════════════════════════════════════

old_preload = "progSel.value = 'DDG51'"
new_preload = "progSel.value = 'ddg51'"
if old_preload in ix:
    ix = ix.replace(old_preload, new_preload, 1)
    changes.append('FIX 2: Fixed preloadAllILSDemoData program key case DDG51 → ddg51')
else:
    # Maybe already fixed or different format
    changes.append('FIX 2: SKIP - DDG51 string not found (may already be correct)')


# ═══════════════════════════════════════════════════════════════
#  FIX 3: Fix ROI chart — BOTH the old function and bulletproof
# ═══════════════════════════════════════════════════════════════

# Fix 3a: Old renderROICharts() — replace the linear cumulative formula
# The old code: cumulative.push(((y + 1) * baseSavings) - ((y + 1) * license));
# This is linear. Replace with a realistic adoption curve.

old_roi_fallback = """    var cumulative = [];
    var years = ['Year 1','Year 2','Year 3','Year 4','Year 5'];
    for (var y = 0; y < 5; y++) {
        cumulative.push(((y + 1) * baseSavings) - ((y + 1) * license));
    }"""

new_roi_fallback = """    var cumulative = [];
    var years = ['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10','Q11','Q12','Q13','Q14','Q15','Q16','Q17','Q18','Q19','Q20'];
    for (var q = 1; q <= 20; q++) {
        // Realistic adoption curve: savings ramp from 20% to 85% over 20 quarters
        var adoptionRate = 0.20 + 0.65 * (1 - Math.exp(-0.18 * q));
        var qtrlySavings = (baseSavings / 4) * adoptionRate;
        var qtrlyLicense = license / 4;
        var prev = q > 1 ? cumulative[q - 2] : 0;
        cumulative.push(Math.round(prev + qtrlySavings - qtrlyLicense));
    }"""

if old_roi_fallback in ix:
    ix = ix.replace(old_roi_fallback, new_roi_fallback, 1)
    changes.append('FIX 3a: Fixed old renderROICharts with adoption-curve cumulative ROI')
else:
    print('WARNING: Old ROI fallback code not found exactly, trying flexible match')
    # Try a regex approach
    pat = re.compile(
        r'var cumulative = \[\];\s*'
        r'var years = \[.*?Year 5.*?\];\s*'
        r'for \(var y = 0; y < 5; y\+\+\) \{\s*'
        r'cumulative\.push\(\(\(y \+ 1\) \* baseSavings\) - \(\(y \+ 1\) \* license\)\);\s*'
        r'\}',
        re.DOTALL
    )
    m = pat.search(ix)
    if m:
        ix = ix[:m.start()] + new_roi_fallback.strip() + ix[m.end():]
        changes.append('FIX 3a: Fixed old renderROICharts with adoption-curve (regex match)')
    else:
        changes.append('FIX 3a: SKIP - Could not find old ROI cumulative code')

# Fix 3b: Bulletproof roiLineChart — fix the ROI% calculation  
# The problem: roiPct = ((cumSavings-cumLicense)/cumLicense*100) simplifies to a CONSTANT
# because both cumSavings and cumLicense grow linearly with months, the ratio is constant.
# Fix: model adoption ramp-up where savings grow non-linearly

old_bp_roi = """roiLineChart: function() {
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
            }"""

new_bp_roi = """roiLineChart: function() {
            var s = _getToolState();
            var monthlyRecords = s.roiPrograms * s.roiRecords;
            var volMult = 1 + Math.sqrt(Math.max(0, monthlyRecords)) / 50;
            var annualLabor = s.roiFTEs * 2080 * s.roiRate;
            var laborSave = annualLabor * 0.65 * volMult;
            var auditSave = s.roiAudit * 0.70 * Math.max(1, s.roiPrograms / 5);
            var totalAnnual = laborSave + auditSave;
            var license = s.roiLicense || 1;
            // Build 20 quarters (5 full years) with realistic adoption ramp
            var labels = []; var data = [];
            var hasInput = (s.roiPrograms > 0 || s.roiFTEs > 0 || s.roiLicense > 0);
            if (hasInput) {
                var cumNet = 0;
                for (var y = 1; y <= 5; y++) { for (var q = 1; q <= 4; q++) { labels.push('Y'+y+'-Q'+q); var qtr = (y-1)*4+q; var adoptRate = 0.20 + 0.65 * (1 - Math.exp(-0.18 * qtr)); var qtrlySavings = (totalAnnual / 4) * adoptRate; var qtrlyLicense = license / 4; cumNet += (qtrlySavings - qtrlyLicense); var roiPct = license > 0 ? ((cumNet / license) * 100) : 0; data.push(Math.round(roiPct)); }}
            }"""

if old_bp_roi in ix:
    ix = ix.replace(old_bp_roi, new_bp_roi, 1)
    changes.append('FIX 3b: Fixed bulletproof roiLineChart with adoption-curve ROI%')
else:
    print('WARNING: Bulletproof ROI code not found exactly — trying to locate and patch')
    # Try the key pattern  
    if 'var roiPct = cumLicense>0?((cumSavings-cumLicense)/cumLicense*100):0;' in ix:
        # Replace just the inner loop logic
        ix = ix.replace(
            'var hasInput = (s.roiPrograms > 0 || s.roiFTEs > 0 || s.roiLicense > 0);\n            if (hasInput) {\n                for (var y = 1; y <= 5; y++) { for (var q = 1; q <= 4; q++) { labels.push(\'Y\'+y+\'-Q\'+q); var months = ((y-1)*4+q)*3; var cumSavings = (totalAnnual/12)*months; var cumLicense = (license/12)*months; var roiPct = cumLicense>0?((cumSavings-cumLicense)/cumLicense*100):0; data.push(Math.round(roiPct)); }}\n            }',
            'var hasInput = (s.roiPrograms > 0 || s.roiFTEs > 0 || s.roiLicense > 0);\n            if (hasInput) {\n                var cumNet = 0;\n                for (var y = 1; y <= 5; y++) { for (var q = 1; q <= 4; q++) { labels.push(\'Y\'+y+\'-Q\'+q); var qtr = (y-1)*4+q; var adoptRate = 0.20 + 0.65 * (1 - Math.exp(-0.18 * qtr)); var qtrlySavings = (totalAnnual / 4) * adoptRate; var qtrlyLicense = license / 4; cumNet += (qtrlySavings - qtrlyLicense); var roiPct = license > 0 ? ((cumNet / license) * 100) : 0; data.push(Math.round(roiPct)); }}\n            }',
            1
        )
        changes.append('FIX 3b: Fixed bulletproof roiLineChart ROI% calculation (partial match)')
    else:
        changes.append('FIX 3b: SKIP - Could not find bulletproof ROI code')

# Fix 3c: Also fix the labels in the old chart to match 20 quarters
# The old chart uses ['Year 1','Year 2','Year 3','Year 4','Year 5'] as labels
# but our new data is 20 quarters. Update the chart labels reference.
# Already handled in FIX 3a above since we rewrote the years array.

# Fix 3d: Update the chart's existing check that expects 10+ labels
# "if (existing && existing.data && existing.data.labels && existing.data.labels.length >= 10) return;"
# This was preventing re-render. Let's make it check for 20 to match bp system.
old_check = 'if (existing && existing.data && existing.data.labels && existing.data.labels.length >= 10) return;'
new_check = 'if (existing && existing.data && existing.data.labels && existing.data.labels.length >= 20) return;'
if old_check in ix:
    ix = ix.replace(old_check, new_check, 1)
    changes.append('FIX 3d: Updated ROI chart stale-check to 20-quarter threshold')


# ═══════════════════════════════════════════════════════════════
#  FIX 4: Calendar — ensure robust rendering
# ═══════════════════════════════════════════════════════════════

# The calendar code looks structurally correct. Let's ensure the DOMContentLoaded
# handler calls it with enough delay and also ensure the first time the ILS Hub
# opens it forces a calendar render.

# Add an additional safety render on the ILS Hub's initial load
# Look for the line that calls setTimeout(preloadAllILSDemoData, 3000);
# and add a calendar render right after

old_preload_timeout = "setTimeout(preloadAllILSDemoData, 3000);"
new_preload_timeout = """setTimeout(preloadAllILSDemoData, 3000);
    // Force calendar render after preload (Round 9 safety)
    setTimeout(function() { if (typeof renderActionCalendar === 'function') renderActionCalendar(); }, 3500);"""
if old_preload_timeout in ix:
    ix = ix.replace(old_preload_timeout, new_preload_timeout, 1)
    changes.append('FIX 4: Added safety calendar render after preload')


# ═══════════════════════════════════════════════════════════════
#  FIX 5: Ensure charts update on program change 
# ═══════════════════════════════════════════════════════════════

# When a program is selected in any tool dropdown, the bulletproof chart system
# needs to re-render. Check if onILSProgramChange triggers chart re-renders.

# Find onILSProgramChange function
if 'function onILSProgramChange()' in ix:
    # Check if it already triggers chart re-render
    prog_change_match = re.search(r'function onILSProgramChange\(\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}', ix)
    if prog_change_match:
        fn_body = prog_change_match.group(1)
        if '_bpRenderInPanel' not in fn_body and 'injectChartContainers' not in fn_body:
            # Need to add chart refresh after program change
            old_prog_change = 'function onILSProgramChange() {'
            new_prog_change = '''function onILSProgramChange() {
    // Clear bp-rendered flags so charts refresh with new program data (Round 9)
    document.querySelectorAll('.ils-hub-panel.active canvas[data-bp-rendered]').forEach(function(c) { c.removeAttribute('data-bp-rendered'); });'''
            ix = ix.replace(old_prog_change, new_prog_change, 1)
            changes.append('FIX 5: Added chart refresh trigger on program change')
        else:
            changes.append('FIX 5: SKIP - onILSProgramChange already has chart refresh')
    else:
        changes.append('FIX 5: SKIP - Could not parse onILSProgramChange body')
else:
    changes.append('FIX 5: SKIP - onILSProgramChange function not found')


# ═══════════════════════════════════════════════════════════════
#  FIX 6: Ensure populateAllDropdowns is called AFTER the bridge
#  function is defined (initialization order)
# ═══════════════════════════════════════════════════════════════

# The initILSEngine function calls populateAllDropdowns().
# Our S4_buildProgramOptions is defined right before populateAllDropdowns,
# so it will exist by the time populateAllDropdowns runs.
# BUT we should also make sure the DOMContentLoaded or init flow calls
# populateAllDropdowns after PROGS is defined. Since PROGS is at line 4322
# and populateAllDropdowns is at ~7016, and our function is injected just
# before that, the order is: PROGS → S4_buildProgramOptions → populateAllDropdowns.
# This should work. But let's add a safety call.

# Add a redundant call to populateAllDropdowns after preload
old_preload_log = "console.log('[S4] Pre-loaded demo data into all ILS tools');"
new_preload_log = """// Ensure dropdowns populated (Round 9 safety)
    if (typeof populateAllDropdowns === 'function') populateAllDropdowns();
    console.log('[S4] Pre-loaded demo data into all ILS tools');"""
if old_preload_log in ix:
    ix = ix.replace(old_preload_log, new_preload_log, 1)
    changes.append('FIX 6: Added safety populateAllDropdowns call in preload')


# ═══════════════════════════════════════════════════════════════
#  FIX 7: Also need partsProgram dropdown to have options
# ═══════════════════════════════════════════════════════════════

# Parts Cross-Reference uses "partsProgram" dropdown. Check if it's in populateAllDropdowns.
if 'partsProgram' not in ix.split('function populateAllDropdowns')[1].split('function ')[0]:
    # partsProgram is NOT in the dropdown population list. Let's check its HTML.
    if 'id="partsProgram"' in ix:
        # Check if it already has options
        parts_match = re.search(r'<select[^>]*id="partsProgram"[^>]*>(.*?)</select>', ix, re.DOTALL)
        if parts_match and '<option value="all">' in parts_match.group(1):
            changes.append('FIX 7: SKIP - partsProgram already has hardcoded options')
        else:
            # Add partsProgram to the dropdown population list inside populateAllDropdowns
            old_selects = """const selects = {
        ilsProgram:        {all: false, custom: true},
        dmsmsProgram:      {all: false, custom: true},
        readinessProgram:  {all: false, custom: true},
        lifecycleProgram:  {all: false, custom: true},
        complianceProgram: {all: false, custom: true},
        riskProgram:       {all: false, custom: true},
        pdmPlatform:       {all: false, custom: true},
        subProgram:        {all: false, custom: true}
    };"""
            new_selects = """const selects = {
        ilsProgram:        {all: false, custom: true},
        dmsmsProgram:      {all: false, custom: true},
        readinessProgram:  {all: false, custom: true},
        lifecycleProgram:  {all: false, custom: true},
        complianceProgram: {all: false, custom: true},
        riskProgram:       {all: false, custom: true},
        pdmPlatform:       {all: false, custom: true},
        subProgram:        {all: false, custom: true},
        partsProgram:      {all: true, custom: false}
    };"""
            if old_selects in ix:
                ix = ix.replace(old_selects, new_selects, 1)
                changes.append('FIX 7: Added partsProgram to populateAllDropdowns')
            else:
                changes.append('FIX 7: SKIP - Could not find selects object in populateAllDropdowns')
    else:
        changes.append('FIX 7: SKIP - partsProgram element not found in HTML')
else:
    changes.append('FIX 7: SKIP - partsProgram already in populateAllDropdowns')


write(INDEX, ix)
print(f'[index.html] {len(changes)} fixes applied')


# ═══════════════════════════════════════════════════════════════
#  DEMO.HTML FIXES
# ═══════════════════════════════════════════════════════════════

dm = read(DEMO)
demo_changes = []

# FIX 8: Save content text in _anchoredRecords during runAnchorDemo
old_anchor_store = """    // Store for verify demo
    _anchoredRecords.push({
        type: _selectedType,
        hash: _currentHash,
        txHash: txHash,
        ledger: ledgerIndex,
        time: new Date().toISOString()
    });"""

new_anchor_store = """    // Store for verify demo (including raw content for auto-verify)
    _anchoredRecords.push({
        type: _selectedType,
        hash: _currentHash,
        content: document.getElementById('demoContent').value,
        txHash: txHash,
        ledger: ledgerIndex,
        time: new Date().toISOString()
    });"""

if old_anchor_store in dm:
    dm = dm.replace(old_anchor_store, new_anchor_store, 1)
    demo_changes.append('FIX 8: Save raw content text in _anchoredRecords')
else:
    demo_changes.append('FIX 8: SKIP - Could not find anchor store block')


# FIX 9: Change "Now Verify It" button to auto-populate verify content
# Current: <button class="demo-btn green" onclick="switchDemoTab('verify')">
# Change to call a new function that switches tab AND pre-fills content

old_verify_btn = """<button class="demo-btn green" onclick="switchDemoTab('verify')"><i class="fas fa-check-circle"></i> Now Verify It</button>"""
new_verify_btn = """<button class="demo-btn green" onclick="autoVerifyAnchored()"><i class="fas fa-check-circle"></i> Now Verify It</button>"""

if old_verify_btn in dm:
    dm = dm.replace(old_verify_btn, new_verify_btn, 1)
    demo_changes.append('FIX 9a: Changed "Now Verify It" button to call autoVerifyAnchored()')
else:
    demo_changes.append('FIX 9a: SKIP - Could not find verify button')

# FIX 10: Add autoVerifyAnchored function
# Insert it right after the runVerifyDemo function (or anywhere in the script)

auto_verify_fn = '''
// ═══ AUTO-VERIFY: Pre-fill verify tab with last anchored content ═══
async function autoVerifyAnchored() {
    // Switch to verify tab
    switchDemoTab('verify');
    
    // Get the most recent anchored record
    if (_anchoredRecords.length === 0) return;
    var lastRecord = _anchoredRecords[_anchoredRecords.length - 1];
    
    // Pre-fill the verify content textarea with the anchored content
    var verifyTA = document.getElementById('verifyContent');
    if (verifyTA && lastRecord.content) {
        verifyTA.value = lastRecord.content;
        // Trigger the hash comparison
        await onVerifyInput();
        // Scroll to verify button
        var vBtn = document.getElementById('verifyBtn');
        if (vBtn) {
            vBtn.disabled = false;
            setTimeout(function() {
                vBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
}
'''

# Insert before the closing </script> tag
if '</script>' in dm:
    # Find the last </script> in the file
    last_script_pos = dm.rfind('</script>')
    dm = dm[:last_script_pos] + auto_verify_fn + '\n' + dm[last_script_pos:]
    demo_changes.append('FIX 10: Added autoVerifyAnchored function to demo.html')
else:
    demo_changes.append('FIX 10: SKIP - Could not find </script> tag')

write(DEMO, dm)
print(f'[demo.html] {len(demo_changes)} fixes applied')


# ═══════════════════════════════════════════════════════════════
#  SUMMARY
# ═══════════════════════════════════════════════════════════════

print('\n' + '='*60)
print('ROUND 9 — FIX SUMMARY')
print('='*60)

all_changes = changes + demo_changes
for i, c in enumerate(all_changes, 1):
    status = '✓' if 'SKIP' not in c else '⊘'
    print(f'  {status} {c}')

applied = sum(1 for c in all_changes if 'SKIP' not in c)
skipped = sum(1 for c in all_changes if 'SKIP' in c)
print(f'\n  Applied: {applied} | Skipped: {skipped} | Total: {len(all_changes)}')

# Verification
ix_verify = read(INDEX)
dm_verify = read(DEMO)

checks = [
    ('S4_buildProgramOptions defined', 'window.S4_buildProgramOptions = function' in ix_verify),
    ('S4_countPlatforms defined', 'window.S4_countPlatforms = function' in ix_verify),
    ('ROI adoption curve (old)', 'adoptionRate = 0.20 + 0.65' in ix_verify),
    ('ROI adoption curve (bp)', 'adoptRate = 0.20 + 0.65' in ix_verify),
    ('preload uses ddg51', "progSel.value = 'ddg51'" in ix_verify),
    ('autoVerifyAnchored exists', 'function autoVerifyAnchored' in dm_verify),
    ('_anchoredRecords saves content', "content: document.getElementById('demoContent').value" in dm_verify),
    ('Calendar safety render', 'renderActionCalendar(); }, 3500' in ix_verify),
]

print('\nVERIFICATION:')
all_pass = True
for label, result in checks:
    status = '✓ PASS' if result else '✗ FAIL'
    if not result: all_pass = False
    print(f'  {status}: {label}')

if all_pass:
    print('\n  ALL CHECKS PASSED ✓')
else:
    print('\n  SOME CHECKS FAILED — review output above')
