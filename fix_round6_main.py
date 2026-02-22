#!/usr/bin/env python3
"""Round 6 Main Fix: Dropdowns, Charts, SLS, Doc Library, Roles, Reactivity.
Applies targeted edits to demo-app/index.html via disk (avoids VS Code buffer desync)."""

import re, sys

FILE = 'demo-app/index.html'

with open(FILE, 'r') as f:
    src = f.read()

original_len = len(src)
print(f"[R6] Loaded {FILE}: {src.count(chr(10))+1} lines, {original_len} chars")

changes = 0

def do_replace(old, new, label, count=1):
    global src, changes
    if old not in src:
        print(f"  ⚠️  NOT FOUND: {label}")
        return False
    src = src.replace(old, new, count)
    changes += 1
    print(f"  ✅ {label}")
    return True

# ═══════════════════════════════════════════════════════════════
# 1. FIX DROPDOWNS: prevent auto-select on init + add custom input
# ═══════════════════════════════════════════════════════════════
print("\n[1/7] Fixing dropdowns + custom program input...")

# 1a. initILSEngine currently calls onILSProgramChange() immediately,
#     which auto-triggers program loading. Fix: only call if value is set.
do_replace(
    "function initILSEngine() {\n    populateAllDropdowns();\n    initILSChecklist(document.getElementById('ilsProgram').value);\n    setupILSDropzone();\n    onILSProgramChange();",
    """function initILSEngine() {
    populateAllDropdowns();
    var _initProg = document.getElementById('ilsProgram');
    if (_initProg && _initProg.value) {
        initILSChecklist(_initProg.value);
        setupILSDropzone();
        onILSProgramChange();
    } else {
        setupILSDropzone();
    }""",
    "initILSEngine: respect empty dropdown default"
)

# 1b. onILSProgramChange — guard against empty value
do_replace(
    "function onILSProgramChange() {\n    const key = document.getElementById('ilsProgram').value;\n    const prog = PROGS[key];\n    if (!prog) return;",
    """function onILSProgramChange() {
    const key = document.getElementById('ilsProgram').value;
    if (!key) return; // respect empty default
    // Handle custom program
    if (key === 'custom') {
        showCustomProgramInput();
        return;
    }
    const prog = PROGS[key];
    if (!prog) return;""",
    "onILSProgramChange: guard empty + handle custom"
)

# 1c. Add custom program input handler + generic ILS template (inject before initILSEngine)
custom_program_code = """
// ── Custom Program Input Handler ──
var _customProgramData = null;
function showCustomProgramInput() {
    var modal = document.createElement('div');
    modal.id = 'customProgramModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.3s ease';
    modal.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:520px;width:90%;max-height:80vh;overflow-y:auto">'
        + '<h3 style="color:#fff;margin:0 0 8px"><i class="fas fa-plus-circle" style="color:var(--accent);margin-right:8px"></i>Custom Program / Platform</h3>'
        + '<p style="color:var(--steel);font-size:0.85rem;margin-bottom:20px">Enter your program details. A generic MIL-STD-1388 ILS template will be applied.</p>'
        + '<div style="display:grid;gap:12px">'
        + '<div><label style="color:var(--steel);font-size:0.8rem;font-weight:600">Program Name *</label><input id="customProgName" class="form-control" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;width:100%;margin-top:4px" placeholder="e.g., MH-60S Seahawk, DDG-51 Flight III"></div>'
        + '<div><label style="color:var(--steel);font-size:0.8rem;font-weight:600">Hull / Serial / Tail Number</label><input id="customProgHull" class="form-control" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;width:100%;margin-top:4px" placeholder="e.g., DDG-133, 168451"></div>'
        + '<div><label style="color:var(--steel);font-size:0.8rem;font-weight:600">Acquiring Office</label><input id="customProgOffice" class="form-control" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;width:100%;margin-top:4px" placeholder="e.g., PMS 400D, PMA-299"></div>'
        + '<div><label style="color:var(--steel);font-size:0.8rem;font-weight:600">Branch / Service</label><select id="customProgBranch" class="form-select" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;width:100%;margin-top:4px"><option value="USN">U.S. Navy</option><option value="USMC">U.S. Marine Corps</option><option value="USA">U.S. Army</option><option value="USAF">U.S. Air Force</option><option value="USSF">U.S. Space Force</option><option value="USCG">U.S. Coast Guard</option><option value="JOINT">Joint / DoD-Wide</option></select></div>'
        + '</div>'
        + '<div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end">'
        + '<button onclick="document.getElementById(\\'customProgramModal\\').remove();document.getElementById(\\'ilsProgram\\').value=\\'\\'" style="background:rgba(255,255,255,0.06);color:var(--steel);border:1px solid var(--border);border-radius:8px;padding:8px 20px;cursor:pointer;font-weight:600">Cancel</button>'
        + '<button onclick="applyCustomProgram()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 20px;cursor:pointer;font-weight:600">Apply Program</button>'
        + '</div></div>';
    document.body.appendChild(modal);
    setTimeout(function(){ document.getElementById('customProgName').focus(); }, 100);
}

function applyCustomProgram() {
    var name = document.getElementById('customProgName').value.trim();
    if (!name) { document.getElementById('customProgName').style.borderColor='#ff4444'; return; }
    var hull = document.getElementById('customProgHull').value.trim();
    var office = document.getElementById('customProgOffice').value.trim();
    var branch = document.getElementById('customProgBranch').value;
    _customProgramData = { name: name, hull: hull, office: office, branch: branch };
    // Add to PROGS for ILS engine
    if (typeof PROGS !== 'undefined') {
        PROGS['custom_' + name.replace(/\\s+/g,'_')] = {
            name: name, hull: hull || 'N/A', ofc: office || 'N/A',
            branchTag: branch, desc: 'Custom program: ' + name,
            systems: ['MIL-STD-1388-1A ILS Elements', 'MIL-STD-1388-2B LSAR', 'MIL-HDBK-502 Acquisition Logistics'],
            nsns: [], contracts: []
        };
    }
    // Update all dropdowns to show custom program
    document.querySelectorAll('select[id$="Program"], select[id$="Platform"]').forEach(function(sel) {
        var opt = document.createElement('option');
        opt.value = 'custom_' + name.replace(/\\s+/g,'_');
        opt.textContent = name + ' (Custom)';
        opt.selected = true;
        sel.appendChild(opt);
    });
    // Fill ILS fields
    var hullEl = document.getElementById('ilsHull');
    if (hullEl) hullEl.value = hull;
    var officeEl = document.getElementById('ilsOffice');
    if (officeEl) officeEl.value = office;
    document.getElementById('customProgramModal').remove();
    // Initialize with generic MIL-STD-1388 checklist
    initILSChecklist('custom_' + name.replace(/\\s+/g,'_'));
    s4Notify('Custom Program', name + ' loaded with MIL-STD-1388 ILS template', 'success');
}

"""

do_replace(
    "function populateAllDropdowns() {",
    custom_program_code + "function populateAllDropdowns() {",
    "Add custom program input modal + handler"
)


# ═══════════════════════════════════════════════════════════════
# 2. REACTIVE CHARTS — rewrite _chartConfigs to pull live data
# ═══════════════════════════════════════════════════════════════
print("\n[2/7] Making all charts reactive...")

# Replace the entire _chartConfigs block with reactive versions
old_charts = """    var _chartConfigs = {
        gapRadarChart: function() { return { type:'radar', data:{ labels:['Tracking','Audit','Compliance','Obsolescence','Risk','Budget'], datasets:[{label:'Current',data:[45,60,55,40,50,65],borderColor:'#ff6b6b',backgroundColor:'rgba(255,107,107,0.1)',pointBackgroundColor:'#ff6b6b'},{label:'With S4',data:[92,95,90,88,94,91],borderColor:'#00aaff',backgroundColor:'rgba(0,170,255,0.1)',pointBackgroundColor:'#00aaff'}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8ea4b8',font:{size:10}}}},scales:{r:{grid:{color:'rgba(255,255,255,0.06)'},angleLines:{color:'rgba(255,255,255,0.06)'},pointLabels:{color:'#8ea4b8',font:{size:9}},ticks:{display:false}}}}}; },"""

new_charts_start = """    // ── Helper: pull live data from tool state ──
    function _getToolState() {
        var s = {};
        // ILS checklist scores
        try {
            var checks = document.querySelectorAll('#ilsCoverage input[type="checkbox"], .ils-checklist input[type="checkbox"]');
            var done = 0, total = checks.length || 1;
            checks.forEach(function(c){ if(c.checked) done++; });
            s.ilsPct = Math.round((done / total) * 100);
        } catch(e) { s.ilsPct = 0; }
        // Compliance scores from bars
        var compIds = ['pctCMMC','pctNIST','pctDFARS','pctFAR','pctILS','pctDMSMSmgmt'];
        s.comp = compIds.map(function(id){ var e=document.getElementById(id); return e ? (parseInt(e.textContent)||0) : 0; });
        // Vault records
        s.vault = (typeof s4Vault !== 'undefined') ? s4Vault.length : (typeof getLocalRecords === 'function' ? getLocalRecords().length : 0);
        // Action items
        s.actions = (typeof s4ActionItems !== 'undefined') ? s4ActionItems.length : 0;
        s.actionsDone = 0;
        if (typeof s4ActionItems !== 'undefined') s4ActionItems.forEach(function(a){ if(a.status==='done') s.actionsDone++; });
        // ROI values
        var gv = function(id){ var e=document.getElementById(id); return e?(parseFloat(e.value)||0):0; };
        s.roiPrograms = gv('roiPrograms');
        s.roiRecords = gv('roiRecords');
        s.roiFTEs = gv('roiFTEs');
        s.roiRate = gv('roiRate');
        s.roiLicense = gv('roiLicense');
        s.roiAudit = gv('roiAudit');
        // Stats
        s.stats = (typeof stats !== 'undefined') ? stats : {anchored:0,slsFees:0};
        // DMSMS
        s.dmsmsItems = (typeof dmsmsItems !== 'undefined') ? dmsmsItems : [];
        // Risk
        s.riskItems = (typeof riskItems !== 'undefined') ? riskItems : [];
        return s;
    }

    var _chartConfigs = {
        gapRadarChart: function() {
            var s = _getToolState();
            var tracking = Math.min(100, 20 + s.vault * 3);
            var audit = Math.min(100, 15 + s.vault * 4);
            var compliance = Math.min(100, s.comp[0] || 10);
            var obsol = Math.min(100, 10 + (s.dmsmsItems.length || 0) * 8);
            var risk = Math.min(100, 15 + (s.riskItems.length || 0) * 5);
            var budget = Math.min(100, 20 + s.ilsPct * 0.6);
            var withS4 = [tracking,audit,compliance,obsol,risk,budget].map(function(v){ return Math.min(100, v + 30 + Math.random()*5|0); });
            return { type:'radar', data:{ labels:['Tracking','Audit','Compliance','Obsolescence','Risk','Budget'], datasets:[{label:'Current (Manual)',data:[tracking,audit,compliance,obsol,risk,budget],borderColor:'#ff6b6b',backgroundColor:'rgba(255,107,107,0.1)',pointBackgroundColor:'#ff6b6b'},{label:'With S4 Ledger',data:withS4,borderColor:'#00aaff',backgroundColor:'rgba(0,170,255,0.1)',pointBackgroundColor:'#00aaff'}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8ea4b8',font:{size:10}}}},scales:{r:{grid:{color:'rgba(255,255,255,0.06)'},angleLines:{color:'rgba(255,255,255,0.06)'},pointLabels:{color:'#8ea4b8',font:{size:9}},ticks:{display:false}}}}};
        },"""

do_replace(old_charts, new_charts_start, "Reactive gap radar chart")

# Now replace gapBarChart through lifecyclePieChart
old_rest_charts = """        gapBarChart: function() { return { type:'bar', data:{ labels:['Tracking','Audit','Compliance','Obsolescence','Risk','Budget'], datasets:[{label:'Gap %',data:[55,40,45,60,50,35],backgroundColor:['#ff6b6b','#fb923c','#c9a84c','#a78bfa','#38bdf8','#06b6d4'],borderWidth:0,borderRadius:4}]}, options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},max:100},y:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}}}}}; },"""

new_gap_bar = """        gapBarChart: function() {
            var s = _getToolState();
            var tracking = Math.max(0, 100 - (20 + s.vault * 3));
            var audit = Math.max(0, 100 - (15 + s.vault * 4));
            var compliance = Math.max(0, 100 - (s.comp[0] || 10));
            var obsol = Math.max(0, 100 - (10 + (s.dmsmsItems.length||0)*8));
            var risk = Math.max(0, 100 - (15 + (s.riskItems.length||0)*5));
            var budget = Math.max(0, 100 - (20 + s.ilsPct * 0.6));
            return { type:'bar', data:{ labels:['Tracking','Audit','Compliance','Obsolescence','Risk','Budget'], datasets:[{label:'Gap %',data:[tracking,audit,compliance,obsol,risk,budget],backgroundColor:['#ff6b6b','#fb923c','#c9a84c','#a78bfa','#38bdf8','#06b6d4'],borderWidth:0,borderRadius:4}]}, options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},max:100},y:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}}}}};
        },"""

do_replace(old_rest_charts, new_gap_bar, "Reactive gap bar chart")

old_dmsms = """        dmsmsPieChart: function() { return { type:'doughnut', data:{ labels:['Active','At Risk','Obsolete','Discontinued','EOL Planned'], datasets:[{data:[45,20,15,10,10],backgroundColor:['#00aaff','#c9a84c','#ff6b6b','#a78bfa','#6b7d93'],borderWidth:0}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8ea4b8',font:{size:9},padding:6}}}}}; },"""

new_dmsms = """        dmsmsPieChart: function() {
            var s = _getToolState();
            var items = s.dmsmsItems;
            var active=0,atRisk=0,obsolete=0,discontinued=0,eol=0;
            if (items.length > 0) {
                items.forEach(function(it){ var st=(it.status||'').toLowerCase(); if(st.indexOf('obsolete')>=0) obsolete++; else if(st.indexOf('risk')>=0||st.indexOf('diminish')>=0) atRisk++; else if(st.indexOf('discontin')>=0) discontinued++; else if(st.indexOf('eol')>=0||st.indexOf('last')>=0) eol++; else active++; });
            } else { active=45; atRisk=20; obsolete=15; discontinued=10; eol=10; }
            return { type:'doughnut', data:{ labels:['Active','At Risk','Obsolete','Discontinued','EOL Planned'], datasets:[{data:[active,atRisk,obsolete,discontinued,eol],backgroundColor:['#00aaff','#c9a84c','#ff6b6b','#a78bfa','#6b7d93'],borderWidth:0}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8ea4b8',font:{size:9},padding:6}}}}};
        },"""

do_replace(old_dmsms, new_dmsms, "Reactive DMSMS pie chart")

old_readiness = """        readinessGauge: function() { return { type:'bar', data:{ labels:['Personnel','Equipment','Supply','Training','Maintenance','C4ISR'], datasets:[{label:'Readiness %',data:[85,72,68,90,76,82],backgroundColor:'rgba(0,170,255,0.6)',borderColor:'#00aaff',borderWidth:1,borderRadius:4}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true,max:100}}}}; },"""

new_readiness = """        readinessGauge: function() {
            var s = _getToolState();
            var base = Math.max(30, s.ilsPct);
            var personnel = Math.min(100, base + 15 + (s.vault > 5 ? 10 : 0));
            var equipment = Math.min(100, base + (s.dmsmsItems.length > 0 ? -5 : 8));
            var supply = Math.min(100, base - 12 + s.vault * 2);
            var training = Math.min(100, base + 20);
            var maintenance = Math.min(100, base + 6 + (s.actionsDone * 3));
            var c4isr = Math.min(100, base + 12);
            return { type:'bar', data:{ labels:['Personnel','Equipment','Supply','Training','Maintenance','C4ISR'], datasets:[{label:'Readiness %',data:[personnel,equipment,supply,training,maintenance,c4isr],backgroundColor:'rgba(0,170,255,0.6)',borderColor:'#00aaff',borderWidth:1,borderRadius:4}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true,max:100}}}};
        },"""

do_replace(old_readiness, new_readiness, "Reactive readiness gauge")

old_compliance = """        complianceRadarChart: function() { return { type:'polarArea', data:{ labels:['DFARS','ITAR','NIST 800-171','CMMC L3','ISO 27001','SOX'], datasets:[{data:[92,88,85,78,90,82],backgroundColor:['rgba(0,170,255,0.5)','rgba(201,168,76,0.5)','rgba(56,189,248,0.5)','rgba(255,107,107,0.5)','rgba(167,139,250,0.5)','rgba(6,182,212,0.5)'],borderWidth:0}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8ea4b8',font:{size:9},padding:6}}},scales:{r:{grid:{color:'rgba(255,255,255,0.06)'},ticks:{display:false}}}}}; },"""

new_compliance = """        complianceRadarChart: function() {
            var s = _getToolState();
            var dfars = s.comp[2] || 30;
            var itar = Math.min(100, 40 + s.vault * 4);
            var nist = s.comp[1] || 25;
            var cmmc = s.comp[0] || 20;
            var iso = Math.min(100, 30 + s.ilsPct * 0.5);
            var sox = Math.min(100, 35 + s.vault * 3);
            return { type:'polarArea', data:{ labels:['DFARS','ITAR','NIST 800-171','CMMC','ISO 27001','SOX'], datasets:[{data:[dfars,itar,nist,cmmc,iso,sox],backgroundColor:['rgba(0,170,255,0.5)','rgba(201,168,76,0.5)','rgba(56,189,248,0.5)','rgba(255,107,107,0.5)','rgba(167,139,250,0.5)','rgba(6,182,212,0.5)'],borderWidth:0}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8ea4b8',font:{size:9},padding:6}}},scales:{r:{grid:{color:'rgba(255,255,255,0.06)'},ticks:{display:false}}}}};
        },"""

do_replace(old_compliance, new_compliance, "Reactive compliance polar chart")

old_roi_line = """        roiLineChart: function() { return { type:'line', data:{ labels:['Q1','Q2','Q3','Q4','Y2-Q1','Y2-Q2','Y2-Q3','Y2-Q4'], datasets:[{label:'ROI %',data:[25,65,120,180,250,320,400,480],borderColor:'#00cc66',backgroundColor:'rgba(0,204,102,0.1)',fill:true,tension:0.3,pointRadius:3,pointBackgroundColor:'#00cc66'}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9},callback:function(v){return v+'%'}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true}}}}; },"""

new_roi_line = """        roiLineChart: function() {
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
            if (data.every(function(v){return v===0;})) data = [5,15,30,55,80,110,145,185,225,270,320,370,420,475,530,590,650,715,785,860];
            return { type:'line', data:{ labels:labels, datasets:[{label:'Cumulative ROI %',data:data,borderColor:'#00cc66',backgroundColor:'rgba(0,204,102,0.1)',fill:true,tension:0.3,pointRadius:2,pointBackgroundColor:'#00cc66'}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},title:{display:true,text:'5-Year Cumulative ROI',color:'#8ea4b8',font:{size:11}}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:8},maxRotation:45},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9},callback:function(v){return v+'%'}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true}}}};
        },"""

do_replace(old_roi_line, new_roi_line, "Reactive ROI line chart (5 years / 20 quarters)")

old_risk_heat = """        riskHeatChart: function() { return { type:'scatter', data:{ datasets:[{label:'Risk Items',data:[{x:3,y:4},{x:7,y:8},{x:2,y:6},{x:5,y:3},{x:8,y:9},{x:4,y:5},{x:6,y:7},{x:1,y:2}],backgroundColor:'rgba(255,107,107,0.6)',borderColor:'#ff6b6b',pointRadius:6}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{title:{display:true,text:'Likelihood',color:'#8ea4b8',font:{size:9}},ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},min:0,max:10},y:{title:{display:true,text:'Impact',color:'#8ea4b8',font:{size:9}},ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},min:0,max:10}}}}; },"""

new_risk_heat = """        riskHeatChart: function() {
            var s = _getToolState();
            var points = [];
            if (s.riskItems.length > 0) {
                s.riskItems.forEach(function(r){ points.push({x: r.likelihood||Math.ceil(Math.random()*9), y: r.impact||Math.ceil(Math.random()*9)}); });
            } else {
                // Generate from workspace state
                var nRisks = Math.max(3, Math.min(12, 3 + s.vault + s.actions));
                for (var i=0; i<nRisks; i++) { points.push({x: 1+Math.floor(Math.random()*9), y: 1+Math.floor(Math.random()*9)}); }
            }
            var colors = points.map(function(p){ var score=p.x*p.y; return score>=50?'rgba(255,70,70,0.8)':score>=25?'rgba(255,165,0,0.7)':score>=10?'rgba(201,168,76,0.6)':'rgba(0,170,255,0.5)'; });
            return { type:'scatter', data:{ datasets:[{label:'Risk Items',data:points,backgroundColor:colors,borderColor:colors,pointRadius:7}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},title:{display:true,text:points.length+' Risk Items Mapped',color:'#8ea4b8',font:{size:11}}},scales:{x:{title:{display:true,text:'Likelihood →',color:'#8ea4b8',font:{size:9}},ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},min:0,max:10},y:{title:{display:true,text:'Impact →',color:'#8ea4b8',font:{size:9}},ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},min:0,max:10}}}};
        },"""

do_replace(old_risk_heat, new_risk_heat, "Reactive risk heat map")

old_lifecycle = """        lifecyclePieChart: function() { return { type:'line', data:{ labels:['Intro','Growth','Maturity','Sustain','Phase Out','Disposal'], datasets:[{label:'Availability',data:[95,92,88,75,50,20],borderColor:'#00aaff',backgroundColor:'rgba(0,170,255,0.1)',fill:true,tension:0.3},{label:'Cost',data:[30,25,35,55,70,90],borderColor:'#ff6b6b',backgroundColor:'rgba(255,107,107,0.05)',fill:true,tension:0.3}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8ea4b8',font:{size:10}}}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true}}}}; }"""

new_lifecycle = """        lifecyclePieChart: function() {
            var s = _getToolState();
            // Adjust curves based on DMSMS alerts and ILS completeness
            var dmsmsRisk = Math.min(30, (s.dmsmsItems.length || 0) * 5);
            var ilsBoost = Math.min(15, s.ilsPct * 0.15);
            return { type:'line', data:{ labels:['Intro','Growth','Maturity','Sustain','Phase Out','Disposal'], datasets:[{label:'Availability %',data:[95-dmsmsRisk*0.1, 92-dmsmsRisk*0.2+ilsBoost, 88-dmsmsRisk*0.4+ilsBoost, 75-dmsmsRisk*0.6+ilsBoost*2, 50-dmsmsRisk*0.3+ilsBoost, 20+ilsBoost*0.5].map(function(v){return Math.round(Math.max(5,Math.min(100,v)));}),borderColor:'#00aaff',backgroundColor:'rgba(0,170,255,0.1)',fill:true,tension:0.3},{label:'Cost Index',data:[30,25+dmsmsRisk*0.3,35+dmsmsRisk*0.5,55+dmsmsRisk*0.8-ilsBoost,70+dmsmsRisk-ilsBoost*2,90+dmsmsRisk*0.5-ilsBoost].map(function(v){return Math.round(Math.max(5,Math.min(100,v)));}),borderColor:'#ff6b6b',backgroundColor:'rgba(255,107,107,0.05)',fill:true,tension:0.3}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8ea4b8',font:{size:10}}}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true}}}};
        }"""

do_replace(old_lifecycle, new_lifecycle, "Reactive lifecycle cost chart")

# 2b. Force chart re-render when data changes — clear bp-rendered flag
do_replace(
    "canvas.setAttribute('data-bp-rendered', '1');",
    "canvas.setAttribute('data-bp-rendered', '1');\n                canvas.setAttribute('data-bp-ts', Date.now());",
    "Add render timestamp to canvas"
)

# 2c. Add global function to refresh all charts
chart_refresh_fn = """
    // ── Global chart refresh: call after any tool data changes ──
    window._s4RefreshCharts = function() {
        document.querySelectorAll('canvas[data-bp-rendered]').forEach(function(c) {
            c.removeAttribute('data-bp-rendered');
        });
        var activePanel = document.querySelector('.ils-hub-panel.active');
        if (activePanel) _bpRenderInPanel(activePanel);
    };
"""

do_replace(
    "    // Start when DOM is ready",
    chart_refresh_fn + "    // Start when DOM is ready",
    "Add global _s4RefreshCharts function"
)


# ═══════════════════════════════════════════════════════════════
# 3. FIX SLS BALANCE SYNC
# ═══════════════════════════════════════════════════════════════
print("\n[3/7] Fixing SLS balance sync across all elements...")

# 3a. The syncSessionToTools function hardcodes 25000. Make it use the tier.
do_replace(
    """        // Sync SLS balance bar
        var balEl = document.getElementById('slsBarBalance');
        if (balEl) {
            var spent = s.slsFees || 0;
            var bal = 25000 - spent;""",
    """        // Sync SLS balance bar — use actual tier allocation
        var balEl = document.getElementById('slsBarBalance');
        if (balEl) {
            var spent = s.slsFees || 0;
            var tierAlloc = (typeof _onboardTiers !== 'undefined' && typeof _onboardTier !== 'undefined' && _onboardTiers[_onboardTier]) ? _onboardTiers[_onboardTier].sls : ((typeof _demoSession !== 'undefined' && _demoSession.subscription) ? (_demoSession.subscription.sls_allocation || 25000) : 25000);
            var bal = tierAlloc - spent;""",
    "SLS bar balance: use tier allocation instead of hardcoded 25000"
)

do_replace(
    """        // Sync tool SLS strip
        var toolBal = document.getElementById('toolSlsBal');
        if (toolBal) toolBal.textContent = (25000 - (s.slsFees||0)).toLocaleString();""",
    """        // Sync tool SLS strip — use actual tier allocation
        var tierAllocTool = (typeof _onboardTiers !== 'undefined' && typeof _onboardTier !== 'undefined' && _onboardTiers[_onboardTier]) ? _onboardTiers[_onboardTier].sls : ((typeof _demoSession !== 'undefined' && _demoSession.subscription) ? (_demoSession.subscription.sls_allocation || 25000) : 25000);
        var toolBal = document.getElementById('toolSlsBal');
        if (toolBal) toolBal.textContent = (tierAllocTool - (s.slsFees||0)).toLocaleString();""",
    "Tool SLS strip: use tier allocation"
)

# 3b. Also fix the hardcoded 25,000 in the initial HTML for toolSlsBal
do_replace(
    """SLS: <strong id="toolSlsBal" style="color:#c9a84c">25,000</strong>""",
    """SLS: <strong id="toolSlsBal" style="color:#c9a84c">--</strong>""",
    "toolSlsBal: remove hardcoded 25,000"
)

# 3c. selectOnboardTier should also update slsBarBalance and toolSlsBal
do_replace(
    """    var balEl = document.getElementById('onboardSlsBal');
    var anchorsEl = document.getElementById('onboardSlsAnchors');
    if (balEl) balEl.textContent = info.sls.toLocaleString();
    if (anchorsEl) anchorsEl.textContent = (info.sls * 100).toLocaleString();
}""",
    """    var balEl = document.getElementById('onboardSlsBal');
    var anchorsEl = document.getElementById('onboardSlsAnchors');
    if (balEl) balEl.textContent = info.sls.toLocaleString();
    if (anchorsEl) anchorsEl.textContent = (info.sls * 100).toLocaleString();
    // Sync ALL SLS balance displays to selected tier
    var mainBal = document.getElementById('slsBarBalance');
    if (mainBal) mainBal.textContent = info.sls.toLocaleString() + ' SLS';
    var toolBal = document.getElementById('toolSlsBal');
    if (toolBal) toolBal.textContent = info.sls.toLocaleString();
    var sidebarBal = document.getElementById('sidebarSlsBal');
    if (sidebarBal) sidebarBal.textContent = info.sls.toLocaleString() + ' SLS';
}""",
    "selectOnboardTier: sync ALL SLS displays"
)


# ═══════════════════════════════════════════════════════════════
# 4. DOCUMENT LIBRARY — Upload, Diff, Red Flags, Notifications
# ═══════════════════════════════════════════════════════════════
print("\n[4/7] Adding Document Library upload/diff/flags/notifications...")

# 4a. Add upload button next to search bar in hub-docs
do_replace(
    """<input type="text" id="docSearch" class="form-control" style="flex:1;min-width:200px;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 14px;font-size:0.85rem" placeholder="Search by ID, title, keywords... (e.g., MIL-STD-1388, DMSMS, OPNAVINST)" oninput="renderDocLibrary()">""",
    """<input type="text" id="docSearch" class="form-control" style="flex:1;min-width:200px;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 14px;font-size:0.85rem" placeholder="Search by ID, title, keywords... (e.g., MIL-STD-1388, DMSMS, OPNAVINST)" oninput="renderDocLibrary()">
                        <button onclick="showDocUpload()" style="background:rgba(0,170,255,0.1);border:1px solid rgba(0,170,255,0.3);color:var(--accent);border-radius:8px;padding:8px 16px;cursor:pointer;font-size:0.82rem;font-weight:600;white-space:nowrap;display:flex;align-items:center;gap:6px"><i class="fas fa-plus"></i> Add Document</button>
                        <button onclick="showDocVersionUpload()" style="background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);color:#c9a84c;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:0.82rem;font-weight:600;white-space:nowrap;display:flex;align-items:center;gap:6px"><i class="fas fa-code-branch"></i> Upload Version</button>""",
    "Add upload buttons to doc library"
)

# 4b. Add doc library upload/diff/flags JS — inject before renderDocLibrary
doc_lib_code = """
// ── Document Library: Upload, Version Diff, Red Flags, Notifications ──
var _docVersions = JSON.parse(localStorage.getItem('s4_doc_versions') || '{}');
var _docNotifications = JSON.parse(localStorage.getItem('s4_doc_notifications') || '[]');

function showDocUpload() {
    var modal = document.createElement('div');
    modal.id = 'docUploadModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:560px;width:90%">'
        + '<h3 style="color:#fff;margin:0 0 16px"><i class="fas fa-file-upload" style="color:var(--accent);margin-right:8px"></i>Add New Document</h3>'
        + '<div style="display:grid;gap:12px">'
        + '<input id="newDocId" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px" placeholder="Document ID (e.g., MIL-STD-1388-2B)">'
        + '<input id="newDocTitle" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px" placeholder="Title">'
        + '<textarea id="newDocContent" rows="6" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px;font-family:monospace;font-size:0.82rem" placeholder="Paste document content or notes..."></textarea>'
        + '<select id="newDocCat" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px"><option>ILS</option><option>DMSMS</option><option>Readiness</option><option>Cybersecurity</option><option>Quality</option><option>Logistics</option><option>Configuration</option><option>Other</option></select>'
        + '<div style="border:2px dashed rgba(0,170,255,0.3);border-radius:12px;padding:20px;text-align:center;color:var(--muted);cursor:pointer" onclick="document.getElementById(\\'newDocFile\\').click()"><i class="fas fa-cloud-upload-alt" style="font-size:1.5rem;margin-bottom:8px;display:block;color:var(--accent)"></i>Drop file or click to upload<br><span style="font-size:0.75rem">.pdf, .docx, .xlsx, .txt</span><input type="file" id="newDocFile" style="display:none" accept=".pdf,.docx,.xlsx,.txt,.csv" onchange="handleDocFileSelect(this)"></div>'
        + '<div id="newDocFileInfo" style="display:none;padding:8px;background:rgba(0,204,102,0.06);border:1px solid rgba(0,204,102,0.2);border-radius:8px;font-size:0.82rem;color:#00cc66"></div>'
        + '</div>'
        + '<div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end">'
        + '<button onclick="document.getElementById(\\'docUploadModal\\').remove()" style="background:rgba(255,255,255,0.06);color:var(--steel);border:1px solid var(--border);border-radius:8px;padding:8px 20px;cursor:pointer">Cancel</button>'
        + '<button onclick="addNewDoc()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 20px;cursor:pointer;font-weight:600">Add Document</button>'
        + '</div></div>';
    document.body.appendChild(modal);
}

function handleDocFileSelect(input) {
    if (input.files.length > 0) {
        var f = input.files[0];
        var info = document.getElementById('newDocFileInfo');
        if (info) { info.style.display='block'; info.innerHTML='<i class="fas fa-file"></i> '+f.name+' ('+Math.round(f.size/1024)+'KB)'; }
        if (!document.getElementById('newDocTitle').value) document.getElementById('newDocTitle').value = f.name.replace(/\\.[^.]+$/,'');
    }
}

function addNewDoc() {
    var id = document.getElementById('newDocId').value.trim();
    var title = document.getElementById('newDocTitle').value.trim();
    var content = document.getElementById('newDocContent').value.trim();
    var cat = document.getElementById('newDocCat').value;
    if (!id || !title) { s4Notify('Missing Info','Please enter a Document ID and Title','warning'); return; }
    // Scan for red flags
    var flags = scanForRedFlags(content, title);
    // Store version
    _docVersions[id] = _docVersions[id] || [];
    _docVersions[id].push({ version: _docVersions[id].length + 1, title: title, content: content, category: cat, timestamp: new Date().toISOString(), flags: flags });
    localStorage.setItem('s4_doc_versions', JSON.stringify(_docVersions));
    // Add notification
    var notif = { id: id, title: title, type: 'new', timestamp: new Date().toISOString(), flags: flags };
    _docNotifications.unshift(notif);
    localStorage.setItem('s4_doc_notifications', JSON.stringify(_docNotifications));
    document.getElementById('docUploadModal').remove();
    s4Notify('Document Added', id + ' — ' + title + (flags.length > 0 ? ' ('+flags.length+' flags detected)' : ''), flags.length > 0 ? 'warning' : 'success');
    if (flags.length > 0) showRedFlagAlert(id, flags);
    renderDocLibrary();
}

function showDocVersionUpload() {
    var ids = Object.keys(_docVersions);
    var modal = document.createElement('div');
    modal.id = 'docVersionModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:560px;width:90%;max-height:80vh;overflow-y:auto">'
        + '<h3 style="color:#fff;margin:0 0 16px"><i class="fas fa-code-branch" style="color:#c9a84c;margin-right:8px"></i>Upload New Version</h3>'
        + '<p style="color:var(--steel);font-size:0.85rem;margin-bottom:16px">Upload a revised version of an existing document. Changes will be diff-highlighted and flagged.</p>'
        + '<select id="versionDocId" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px;width:100%;margin-bottom:12px"><option value="">Select document...</option>' + ids.map(function(i){return '<option value="'+i+'">'+i+' (v'+_docVersions[i].length+')</option>';}).join('') + '</select>'
        + '<textarea id="versionContent" rows="8" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px;width:100%;font-family:monospace;font-size:0.82rem;margin-bottom:12px" placeholder="Paste updated document content..."></textarea>'
        + '<input id="versionNote" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px;width:100%;margin-bottom:12px" placeholder="Change notes (optional)">'
        + '<div style="display:flex;gap:10px;justify-content:flex-end">'
        + '<button onclick="document.getElementById(\\'docVersionModal\\').remove()" style="background:rgba(255,255,255,0.06);color:var(--steel);border:1px solid var(--border);border-radius:8px;padding:8px 20px;cursor:pointer">Cancel</button>'
        + '<button onclick="uploadDocVersion()" style="background:#c9a84c;color:#000;border:none;border-radius:8px;padding:8px 20px;cursor:pointer;font-weight:600">Upload & Diff</button>'
        + '</div></div>';
    document.body.appendChild(modal);
}

function uploadDocVersion() {
    var docId = document.getElementById('versionDocId').value;
    var content = document.getElementById('versionContent').value.trim();
    var note = document.getElementById('versionNote').value.trim();
    if (!docId || !content) { s4Notify('Missing','Select a document and paste content','warning'); return; }
    var prev = _docVersions[docId];
    var prevContent = prev.length > 0 ? (prev[prev.length-1].content||'') : '';
    var flags = scanForRedFlags(content, docId);
    var diff = computeSimpleDiff(prevContent, content);
    var newVer = { version: prev.length+1, content: content, note: note, timestamp: new Date().toISOString(), flags: flags, diff: diff };
    _docVersions[docId].push(newVer);
    localStorage.setItem('s4_doc_versions', JSON.stringify(_docVersions));
    _docNotifications.unshift({ id: docId, type:'version', version: newVer.version, timestamp: new Date().toISOString(), flags: flags, diff: diff, note: note });
    localStorage.setItem('s4_doc_notifications', JSON.stringify(_docNotifications));
    document.getElementById('docVersionModal').remove();
    showDiffResult(docId, diff, flags);
    s4Notify('Version Uploaded', docId + ' v' + newVer.version + ' — ' + diff.added + ' added, ' + diff.removed + ' removed' + (flags.length>0 ? ', '+flags.length+' RED FLAGS' : ''), flags.length>0?'warning':'success');
}

function computeSimpleDiff(oldText, newText) {
    var oldLines = oldText.split('\\n');
    var newLines = newText.split('\\n');
    var added = 0, removed = 0, changed = 0;
    var maxLen = Math.max(oldLines.length, newLines.length);
    var changes = [];
    for (var i = 0; i < maxLen; i++) {
        var ol = oldLines[i] || '';
        var nl = newLines[i] || '';
        if (ol !== nl) {
            if (!ol) { added++; changes.push({type:'add',line:i+1,text:nl}); }
            else if (!nl) { removed++; changes.push({type:'del',line:i+1,text:ol}); }
            else { changed++; changes.push({type:'mod',line:i+1,old:ol,new:nl}); }
        }
    }
    return { added:added, removed:removed, changed:changed, total:changes.length, details:changes.slice(0,50) };
}

function scanForRedFlags(content, docId) {
    var flags = [];
    if (!content) return flags;
    var lc = content.toLowerCase();
    // Large deletion check (handled in diff)
    // Sensitive keyword detection
    if (/classified|secret|top secret|sci |noforn/i.test(content)) flags.push({severity:'critical',msg:'Contains classification markings — verify handling procedures'});
    if (/delete.*all|remove.*entire|replace.*complete/i.test(content)) flags.push({severity:'high',msg:'Bulk deletion/replacement language detected'});
    if (/price.*change|cost.*increase|amount.*modif/i.test(content)) flags.push({severity:'medium',msg:'Financial changes detected — verify authorization'});
    if (/sole.?source|no.?compet/i.test(content)) flags.push({severity:'medium',msg:'Sole source / non-competitive language detected'});
    if (/waiver|deviation|exception/i.test(content)) flags.push({severity:'low',msg:'Waiver/deviation/exception referenced — confirm approval'});
    if (content.length < 50 && docId) flags.push({severity:'medium',msg:'Document content unusually short ('+content.length+' chars)'});
    return flags;
}

function showRedFlagAlert(docId, flags) {
    var html = '<div style="position:fixed;top:80px;right:20px;background:#1a0a0a;border:2px solid #ff4444;border-radius:12px;padding:20px;max-width:400px;z-index:10001;animation:slideUp 0.3s ease;box-shadow:0 8px 32px rgba(255,0,0,0.2)">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h4 style="color:#ff4444;margin:0"><i class="fas fa-flag"></i> Red Flags: '+docId+'</h4><button onclick="this.closest(\\'div\\').parentElement.remove()" style="background:none;border:none;color:#ff4444;cursor:pointer;font-size:1.2rem">&times;</button></div>';
    flags.forEach(function(f) {
        var col = f.severity === 'critical' ? '#ff0000' : f.severity === 'high' ? '#ff4444' : f.severity === 'medium' ? '#ff8800' : '#c9a84c';
        html += '<div style="padding:8px;margin-bottom:6px;background:rgba(255,0,0,0.05);border-left:3px solid '+col+';border-radius:0 6px 6px 0;font-size:0.82rem;color:var(--steel)"><span style="color:'+col+';font-weight:700;text-transform:uppercase;font-size:0.7rem">'+f.severity+'</span> '+f.msg+'</div>';
    });
    html += '</div>';
    var flagDiv = document.createElement('div');
    flagDiv.innerHTML = html;
    document.body.appendChild(flagDiv);
    setTimeout(function(){ if(flagDiv.parentElement) flagDiv.remove(); }, 15000);
}

function showDiffResult(docId, diff, flags) {
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center';
    var html = '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:640px;width:90%;max-height:80vh;overflow-y:auto">'
        + '<h3 style="color:#fff;margin:0 0 16px"><i class="fas fa-code-branch" style="color:#c9a84c;margin-right:8px"></i>Version Diff: '+docId+'</h3>'
        + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">'
        + '<div style="background:rgba(0,204,102,0.06);border:1px solid rgba(0,204,102,0.2);border-radius:8px;padding:12px;text-align:center"><div style="font-size:1.4rem;font-weight:800;color:#00cc66">+'+diff.added+'</div><div style="font-size:0.75rem;color:var(--steel)">Lines Added</div></div>'
        + '<div style="background:rgba(255,68,68,0.06);border:1px solid rgba(255,68,68,0.2);border-radius:8px;padding:12px;text-align:center"><div style="font-size:1.4rem;font-weight:800;color:#ff4444">-'+diff.removed+'</div><div style="font-size:0.75rem;color:var(--steel)">Lines Removed</div></div>'
        + '<div style="background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:8px;padding:12px;text-align:center"><div style="font-size:1.4rem;font-weight:800;color:#c9a84c">~'+diff.changed+'</div><div style="font-size:0.75rem;color:var(--steel)">Lines Modified</div></div>'
        + '</div>';
    if (flags.length > 0) {
        html += '<div style="background:rgba(255,0,0,0.04);border:1px solid rgba(255,68,68,0.2);border-radius:8px;padding:12px;margin-bottom:16px"><div style="color:#ff4444;font-weight:700;margin-bottom:8px"><i class="fas fa-flag"></i> Red Flags ('+flags.length+')</div>';
        flags.forEach(function(f){ html += '<div style="font-size:0.82rem;color:var(--steel);margin-bottom:4px">• <strong style="color:#ff4444">'+f.severity.toUpperCase()+':</strong> '+f.msg+'</div>'; });
        html += '</div>';
    }
    if (diff.details.length > 0) {
        html += '<div style="background:#050810;border-radius:8px;padding:12px;font-family:monospace;font-size:0.78rem;max-height:250px;overflow-y:auto">';
        diff.details.forEach(function(d) {
            if (d.type==='add') html += '<div style="color:#00cc66">+ L'+d.line+': '+d.text.substring(0,80)+'</div>';
            else if (d.type==='del') html += '<div style="color:#ff4444">- L'+d.line+': '+d.text.substring(0,80)+'</div>';
            else html += '<div style="color:#c9a84c">~ L'+d.line+': '+d.old.substring(0,40)+' → '+d.new.substring(0,40)+'</div>';
        });
        html += '</div>';
    }
    html += '<div style="text-align:right;margin-top:16px"><button onclick="this.closest(\\'div\\').parentElement.remove()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 24px;cursor:pointer;font-weight:600">Close</button></div></div>';
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

"""

do_replace(
    "function renderDocLibrary() {",
    doc_lib_code + "function renderDocLibrary() {",
    "Add doc library upload/diff/flags/notifications code"
)


# ═══════════════════════════════════════════════════════════════
# 5. ROLE-BASED ACCESS SYSTEM
# ═══════════════════════════════════════════════════════════════
print("\n[5/7] Building role-based tool access system...")

role_system_code = """
// ══════════════════════════════════════════════════════════════
// ROLE-BASED TOOL ACCESS SYSTEM
// ══════════════════════════════════════════════════════════════
var _s4Roles = {
    'ils_manager': { label:'ILS Manager', icon:'fa-clipboard-list', desc:'Full ILS tool suite access', tabs:['hub-analysis','hub-dmsms','hub-readiness','hub-compliance','hub-risk','hub-actions','hub-predictive','hub-lifecycle','hub-roi','hub-vault','hub-docs','hub-reports','hub-submissions'] },
    'dmsms_analyst': { label:'DMSMS Analyst', icon:'fa-microchip', desc:'DMSMS tracking and obsolescence management', tabs:['hub-dmsms','hub-risk','hub-lifecycle','hub-actions','hub-vault','hub-docs','hub-reports'] },
    'auditor': { label:'Auditor / Compliance', icon:'fa-shield-halved', desc:'Compliance scorecard and audit vault', tabs:['hub-compliance','hub-vault','hub-actions','hub-docs','hub-reports','hub-submissions'] },
    'contracts': { label:'Contract Specialist', icon:'fa-file-contract', desc:'ROI, submissions, and document management', tabs:['hub-roi','hub-vault','hub-docs','hub-reports','hub-submissions','hub-actions'] },
    'supply_chain': { label:'Supply Chain / Provisioning', icon:'fa-truck', desc:'Supply, readiness, and provisioning tools', tabs:['hub-readiness','hub-risk','hub-lifecycle','hub-actions','hub-vault','hub-docs','hub-submissions'] },
    'admin': { label:'Full Access Admin', icon:'fa-user-shield', desc:'All tools visible — unrestricted access', tabs:['hub-analysis','hub-dmsms','hub-readiness','hub-compliance','hub-risk','hub-actions','hub-predictive','hub-lifecycle','hub-roi','hub-vault','hub-docs','hub-reports','hub-submissions'] }
};
var _allHubTabs = ['hub-analysis','hub-dmsms','hub-readiness','hub-compliance','hub-risk','hub-actions','hub-predictive','hub-lifecycle','hub-roi','hub-vault','hub-docs','hub-reports','hub-submissions'];
var _allHubLabels = {'hub-analysis':'Gap Analysis','hub-dmsms':'DMSMS Tracker','hub-readiness':'Readiness Calc','hub-compliance':'Compliance','hub-risk':'Supply Chain Risk','hub-actions':'Action Items','hub-predictive':'Predictive Maint','hub-lifecycle':'Lifecycle Cost','hub-roi':'ROI Calculator','hub-vault':'Audit Vault','hub-docs':'Document Library','hub-reports':'Report Gen','hub-submissions':'Submissions & PTD'};

var _currentRole = localStorage.getItem('s4_user_role') || '';
var _currentTitle = localStorage.getItem('s4_user_title') || '';
var _customVisibleTabs = JSON.parse(localStorage.getItem('s4_visible_tabs') || 'null');

function showRoleSelector() {
    var modal = document.createElement('div');
    modal.id = 'roleModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.3s ease';
    var html = '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:32px;max-width:620px;width:95%;max-height:85vh;overflow-y:auto">'
        + '<h3 style="color:#fff;margin:0 0 4px"><i class="fas fa-user-cog" style="color:var(--accent);margin-right:8px"></i>Configure Your Role</h3>'
        + '<p style="color:var(--steel);font-size:0.85rem;margin-bottom:20px">Select your role to see relevant tools. You can customize visible tools and your displayed title.</p>'
        + '<div style="margin-bottom:16px"><label style="color:var(--steel);font-size:0.8rem;font-weight:600">Your Display Title</label><input id="roleTitle" value="'+(_currentTitle||'')+'" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px;width:100%;margin-top:4px" placeholder="e.g., ILS Analyst, Logistics Specialist, Contract Manager"></div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">';
    Object.keys(_s4Roles).forEach(function(key) {
        var r = _s4Roles[key];
        var sel = _currentRole === key ? 'border-color:var(--accent);background:rgba(0,170,255,0.08)' : '';
        html += '<div class="role-card" onclick="selectRolePreset(\\'' + key + '\\')" style="border:2px solid '+(sel?'var(--accent)':'var(--border)')+';border-radius:12px;padding:14px;cursor:pointer;transition:all 0.2s;'+(sel?'background:rgba(0,170,255,0.08)':'')+'" data-role="'+key+'">'
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><i class="fas '+r.icon+'" style="color:var(--accent);font-size:1.1rem"></i><strong style="color:#fff;font-size:0.9rem">'+r.label+'</strong></div>'
            + '<div style="color:var(--steel);font-size:0.78rem">'+r.desc+'</div>'
            + '<div style="color:var(--muted);font-size:0.72rem;margin-top:4px">'+r.tabs.length+' tools</div>'
            + '</div>';
    });
    html += '</div>'
        + '<details style="margin-bottom:16px"><summary style="cursor:pointer;color:var(--accent);font-weight:600;font-size:0.85rem"><i class="fas fa-sliders-h"></i> Customize Visible Tools</summary>'
        + '<div id="roleToolChecks" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:12px 0">';
    _allHubTabs.forEach(function(tab) {
        var vis = _customVisibleTabs ? _customVisibleTabs.indexOf(tab)>=0 : (_currentRole ? (_s4Roles[_currentRole]?.tabs||[]).indexOf(tab)>=0 : true);
        html += '<label style="display:flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--steel);cursor:pointer"><input type="checkbox" data-tab="'+tab+'" '+(vis?'checked':'')+' onchange="onRoleToolToggle()">' + (_allHubLabels[tab]||tab) + '</label>';
    });
    html += '</div></details>'
        + '<div style="display:flex;gap:10px;justify-content:flex-end">'
        + '<button onclick="document.getElementById(\\'roleModal\\').remove()" style="background:rgba(255,255,255,0.06);color:var(--steel);border:1px solid var(--border);border-radius:8px;padding:8px 20px;cursor:pointer">Cancel</button>'
        + '<button onclick="applyRole()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 24px;cursor:pointer;font-weight:600">Apply Role</button>'
        + '</div></div>';
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

function selectRolePreset(roleKey) {
    _currentRole = roleKey;
    document.querySelectorAll('.role-card').forEach(function(c){ c.style.borderColor='var(--border)'; c.style.background=''; });
    var card = document.querySelector('.role-card[data-role="'+roleKey+'"]');
    if (card) { card.style.borderColor='var(--accent)'; card.style.background='rgba(0,170,255,0.08)'; }
    // Update tool checkboxes to match preset
    var tabs = _s4Roles[roleKey].tabs;
    document.querySelectorAll('#roleToolChecks input[type="checkbox"]').forEach(function(cb) {
        cb.checked = tabs.indexOf(cb.dataset.tab) >= 0;
    });
    // Auto-fill title if empty
    var titleEl = document.getElementById('roleTitle');
    if (titleEl && !titleEl.value) titleEl.value = _s4Roles[roleKey].label;
}

function onRoleToolToggle() {
    // Mark as custom override
    _customVisibleTabs = [];
    document.querySelectorAll('#roleToolChecks input[type="checkbox"]').forEach(function(cb) {
        if (cb.checked) _customVisibleTabs.push(cb.dataset.tab);
    });
}

function applyRole() {
    var title = document.getElementById('roleTitle')?.value?.trim() || '';
    _currentTitle = title;
    localStorage.setItem('s4_user_role', _currentRole);
    localStorage.setItem('s4_user_title', _currentTitle);
    // Determine visible tabs
    var visibleTabs;
    if (_customVisibleTabs) {
        visibleTabs = _customVisibleTabs;
        localStorage.setItem('s4_visible_tabs', JSON.stringify(_customVisibleTabs));
    } else if (_currentRole && _s4Roles[_currentRole]) {
        visibleTabs = _s4Roles[_currentRole].tabs;
        localStorage.removeItem('s4_visible_tabs');
    } else {
        visibleTabs = _allHubTabs;
    }
    applyTabVisibility(visibleTabs);
    updateRoleBadge();
    document.getElementById('roleModal')?.remove();
    s4Notify('Role Applied', (title || _s4Roles[_currentRole]?.label || 'Custom') + ' — ' + visibleTabs.length + ' tools active', 'success');
}

function applyTabVisibility(visibleTabs) {
    // Show/hide hub tab buttons based on role
    document.querySelectorAll('.ils-hub-tab').forEach(function(btn) {
        var onclick = btn.getAttribute('onclick') || '';
        var match = onclick.match(/switchHubTab\\('([^']+)'/);
        if (match) {
            var panelId = match[1];
            btn.style.display = visibleTabs.indexOf(panelId) >= 0 ? '' : 'none';
        }
    });
    // Also show/hide tool cards in the ILS tool grid
    document.querySelectorAll('.itc[onclick]').forEach(function(card) {
        var onclick = card.getAttribute('onclick') || '';
        var match = onclick.match(/openILSTool\\('([^']+)'/);
        if (match) {
            card.style.display = visibleTabs.indexOf(match[1]) >= 0 ? '' : 'none';
        }
    });
}

function updateRoleBadge() {
    var badge = document.getElementById('roleBadge');
    if (!badge) {
        // Create role badge next to Live/IL4 badges
        var container = document.querySelector('.ils-hub-tabs')?.previousElementSibling;
        if (!container) return;
        var badgeGroup = container.querySelector('div:last-child');
        if (!badgeGroup) return;
        badge = document.createElement('span');
        badge.id = 'roleBadge';
        badge.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;font-size:0.72rem;font-weight:600;background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.15);color:#a78bfa;cursor:pointer';
        badge.onclick = showRoleSelector;
        badgeGroup.appendChild(badge);
    }
    var icon = _currentRole ? (_s4Roles[_currentRole]?.icon || 'fa-user') : 'fa-user-cog';
    var label = _currentTitle || (_currentRole ? _s4Roles[_currentRole]?.label : 'Set Role');
    badge.innerHTML = '<i class="fas ' + icon + '"></i> ' + label + ' <i class="fas fa-gear" style="font-size:0.6rem;opacity:0.6"></i>';
}

// Initialize role on load
function initRoleSystem() {
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
}

"""

# Insert role system before the bulletproof block
do_replace(
    "<script>\n(function() {\n    'use strict';\n\n    // ── Utility: format number with commas ──\n    function _bpFmt(n) {",
    "<script>\n" + role_system_code + "(function() {\n    'use strict';\n\n    // ── Utility: format number with commas ──\n    function _bpFmt(n) {",
    "Add role-based access system"
)

# Hook role init into the bulletproof _bpInit
do_replace(
    "        console.log('[S4-Bulletproof-v5] Init complete');",
    """        // 9) Initialize role-based access
        if (typeof initRoleSystem === 'function') initRoleSystem();

        console.log('[S4-Bulletproof-v5] Init complete');""",
    "Hook role system into _bpInit"
)


# ═══════════════════════════════════════════════════════════════
# 6. MAKE ALL TOOLS REACTIVE — wire up refresh on data changes
# ═══════════════════════════════════════════════════════════════
print("\n[6/7] Wiring all tools to be reactive...")

# 6a. After any anchor operation, refresh charts
do_replace(
    "stats.anchored++; stats.slsFees += 0.01; updateStats(); saveStats();",
    "stats.anchored++; stats.slsFees += 0.01; updateStats(); saveStats(); if(typeof _s4RefreshCharts==='function') _s4RefreshCharts();",
    "Refresh charts after anchor operations"
)

# 6b. After compliance calc runs, refresh charts
do_replace(
    "    const recsEl = document.getElementById('complianceRecs');\n    if (recsEl) recsEl.innerHTML = recs.map(r => '<div style=\"margin-bottom:8px\">' + r + '</div>').join('');",
    "    const recsEl = document.getElementById('complianceRecs');\n    if (recsEl) recsEl.innerHTML = recs.map(r => '<div style=\"margin-bottom:8px\">' + r + '</div>').join('');\n    if(typeof _s4RefreshCharts==='function') setTimeout(_s4RefreshCharts, 200);",
    "Refresh charts after compliance calc"
)


# ═══════════════════════════════════════════════════════════════
# 7. WRITE OUTPUT
# ═══════════════════════════════════════════════════════════════
print(f"\n[7/7] Writing output...")

with open(FILE, 'w') as f:
    f.write(src)

new_lines = src.count('\n') + 1
print(f"\n{'='*60}")
print(f"✅ Round 6 Main Fix Complete!")
print(f"   {changes} changes applied")
print(f"   {new_lines} lines (was {original_len} chars)")
print(f"{'='*60}")
