#!/usr/bin/env python3
"""
Round 5 Comprehensive Fix Script
=================================
1. FIX CHARTS — Root cause: chart injection hooks in block 4 (lines 8985-10158) 
   are overwritten by function declaration in block 5 (line 10273). 
   Fix: Make bulletproof block also call injectChartContainers().
2. FIX ROI — programs/records now affect total savings via volume multiplier.
3. FIX WALLET SIDEBAR — overflow on Purchase SLS section.
4. FIX PLATFORM DROPDOWN — starts empty, custom option.
5. FIX METRICS — auto-load on session start.
6. ADD ACTION ITEMS CALENDAR — calendar widget inside Action Items panel.
"""

import re, sys, os

filepath = 'demo-app/index.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

original = content
changes = []

# ══════════════════════════════════════════════════════════════════
# FIX 1: CHARTS — Replace entire bulletproof block (10528-10767)
# Root cause: Script block 4 hooks openILSTool BEFORE it's declared
# in block 5. Block 5's function declaration overwrites block 4's hooks.
# Fix: New bulletproof block calls injectChartContainers() directly.
# ══════════════════════════════════════════════════════════════════

# Find the bulletproof script block
bp_start_marker = "// ── Utility: format number with commas ──"
bp_end_marker = "</body>"

# Find bounds
bp_start_idx = content.find(bp_start_marker)
if bp_start_idx == -1:
    print("ERROR: Could not find bulletproof block start marker")
    sys.exit(1)

# Find the <script> tag before it
script_before = content.rfind('<script>', 0, bp_start_idx)
if script_before == -1:
    print("ERROR: Could not find <script> before bulletproof block")
    sys.exit(1)

# Find </script> and </body></html> at end
# The block ends with })();\n</script>\n\n</body>\n</html>
bp_block_end = content.find('</body>', bp_start_idx)
if bp_block_end == -1:
    print("ERROR: Could not find </body> after bulletproof block")
    sys.exit(1)

# Extract from <script> through </script> before </body>
script_end = content.rfind('</script>', bp_start_idx, bp_block_end)
if script_end == -1:
    print("ERROR: Could not find </script> before </body>")
    sys.exit(1)
script_end_full = script_end + len('</script>')

old_bp_block = content[script_before:script_end_full]

new_bp_block = '''<script>
(function() {
    'use strict';

    // ── Utility: format number with commas ──
    function _bpFmt(n) {
        return Math.round(n).toString().replace(/\\B(?=(?:\\d{3})+(?!\\d))/g, ',');
    }

    // ══════════════════════════════════════════════════════
    // BULLETPROOF ROI CALCULATOR
    // Programs & records now visibly affect ALL outputs
    // ══════════════════════════════════════════════════════
    function _bpCalcROI() {
        try {
            var gv = function(id) { var e = document.getElementById(id); return e ? (parseFloat(e.value) || 0) : 0; };
            var programs  = gv('roiPrograms');
            var records   = gv('roiRecords');
            var ftes      = gv('roiFTEs');
            var rate      = gv('roiRate');
            var auditCost = gv('roiAudit');
            var errorCost = gv('roiError');
            var incidents = gv('roiIncidents');
            var license   = gv('roiLicense');

            // Volume multiplier — more programs/records = more manual work saved
            var monthlyRecords = programs * records;
            var volumeMultiplier = 1 + Math.sqrt(Math.max(0, monthlyRecords)) / 50;

            var annualLaborHours = ftes * 2080;
            var manualCost = annualLaborHours * rate;
            var laborSavings = manualCost * 0.65 * volumeMultiplier;
            var errorSavings = incidents * errorCost * 0.90;
            var auditSavings = auditCost * 0.70 * Math.max(1, programs / 5);
            var perRecordSavings = monthlyRecords > 0 ? (laborSavings / 12) / monthlyRecords : 0;
            var totalAnnualSavings = laborSavings + errorSavings + auditSavings;
            var netSavings = totalAnnualSavings - license;
            var roiPct = license > 0 ? ((netSavings / license) * 100) : 0;
            var paybackMonths = totalAnnualSavings > 0 ? Math.ceil((license / totalAnnualSavings) * 12) : 0;
            var fiveYearNet = (totalAnnualSavings * 5) - (license * 5);

            var set = function(id, val, color) {
                var e = document.getElementById(id);
                if (e) { e.textContent = val; if (color) e.style.color = color; }
            };
            set('roiSavings', '$' + _bpFmt(netSavings), netSavings > 0 ? '#00cc66' : '#ff4444');
            set('roiPercent', roiPct.toFixed(0) + '%', roiPct > 0 ? '#00cc66' : '#ff4444');
            set('roiPayback', paybackMonths + ' mo', null);
            set('roi5Year', '$' + _bpFmt(fiveYearNet), fiveYearNet > 0 ? '#00cc66' : '#ff4444');

            var output = document.getElementById('roiOutput');
            if (output) {
                output.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-top:12px">'
                    + '<div class="section-label"><i class="fas fa-chart-line"></i> ROI BREAKDOWN</div>'
                    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:0.85rem;margin-bottom:16px">'
                    + '<div><span style="color:var(--steel)">Labor Automation (65%)</span><br><strong style="color:#00cc66">$' + _bpFmt(laborSavings) + '</strong></div>'
                    + '<div><span style="color:var(--steel)">Error Reduction (90%)</span><br><strong style="color:#00cc66">$' + _bpFmt(errorSavings) + '</strong></div>'
                    + '<div><span style="color:var(--steel)">Audit Cost Reduction (70%)</span><br><strong style="color:#00cc66">$' + _bpFmt(auditSavings) + '</strong></div>'
                    + '<div><span style="color:var(--steel)">S4 Ledger License</span><br><strong style="color:#ff6b6b">-$' + _bpFmt(license) + '</strong></div>'
                    + '</div>'
                    + '<hr style="border-color:var(--border);margin:12px 0">'
                    + '<div style="display:flex;justify-content:space-between;align-items:center">'
                    + '<div><span style="color:var(--steel);font-size:0.82rem">Net Annual Savings</span><br><span style="font-size:1.5rem;font-weight:800;color:' + (netSavings > 0 ? '#00cc66' : '#ff4444') + '">$' + _bpFmt(netSavings) + '</span></div>'
                    + '<div><span style="color:var(--steel);font-size:0.82rem">Per-Record Savings</span><br><span style="font-size:1.1rem;font-weight:700;color:var(--accent)">$' + perRecordSavings.toFixed(2) + '/record</span></div>'
                    + '<div><span style="color:var(--steel);font-size:0.82rem">Volume Multiplier</span><br><span style="font-size:1.1rem;font-weight:700;color:var(--accent)">' + volumeMultiplier.toFixed(2) + 'x</span></div>'
                    + '</div></div>';
            }

            // Trigger chart rendering if available
            try { if (typeof renderROICharts === 'function') renderROICharts(); } catch(e) {}
        } catch (err) {
            console.error('[S4-BP-ROI] Error:', err);
        }
    }

    // Attach ROI listeners
    function _bpAttachROI() {
        var ids = ['roiPrograms','roiRecords','roiFTEs','roiRate','roiAudit','roiError','roiIncidents','roiLicense'];
        var n = 0;
        ids.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.removeAttribute('oninput');
                el.addEventListener('input', _bpCalcROI);
                n++;
            }
        });
        if (n > 0) { _bpCalcROI(); }
        return n;
    }

    // ══════════════════════════════════════════════════════
    // BULLETPROOF CHART RENDERING
    // Calls injectChartContainers() from block 4 first,
    // then renders charts into the injected canvases.
    // ══════════════════════════════════════════════════════
    var _chartConfigs = {
        gapRadarChart: function() { return { type:'radar', data:{ labels:['Tracking','Audit','Compliance','Obsolescence','Risk','Budget'], datasets:[{label:'Current',data:[45,60,55,40,50,65],borderColor:'#ff6b6b',backgroundColor:'rgba(255,107,107,0.1)',pointBackgroundColor:'#ff6b6b'},{label:'With S4',data:[92,95,90,88,94,91],borderColor:'#00aaff',backgroundColor:'rgba(0,170,255,0.1)',pointBackgroundColor:'#00aaff'}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8ea4b8',font:{size:10}}}},scales:{r:{grid:{color:'rgba(255,255,255,0.06)'},angleLines:{color:'rgba(255,255,255,0.06)'},pointLabels:{color:'#8ea4b8',font:{size:9}},ticks:{display:false}}}}}; },
        gapBarChart: function() { return { type:'bar', data:{ labels:['Tracking','Audit','Compliance','Obsolescence','Risk','Budget'], datasets:[{label:'Gap %',data:[55,40,45,60,50,35],backgroundColor:['#ff6b6b','#fb923c','#c9a84c','#a78bfa','#38bdf8','#06b6d4'],borderWidth:0,borderRadius:4}]}, options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},max:100},y:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}}}}}; },
        dmsmsPieChart: function() { return { type:'doughnut', data:{ labels:['Active','At Risk','Obsolete','Discontinued','EOL Planned'], datasets:[{data:[45,20,15,10,10],backgroundColor:['#00aaff','#c9a84c','#ff6b6b','#a78bfa','#6b7d93'],borderWidth:0}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8ea4b8',font:{size:9},padding:6}}}}}; },
        readinessGauge: function() { return { type:'bar', data:{ labels:['Personnel','Equipment','Supply','Training','Maintenance','C4ISR'], datasets:[{label:'Readiness %',data:[85,72,68,90,76,82],backgroundColor:'rgba(0,170,255,0.6)',borderColor:'#00aaff',borderWidth:1,borderRadius:4}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true,max:100}}}}; },
        complianceRadarChart: function() { return { type:'polarArea', data:{ labels:['DFARS','ITAR','NIST 800-171','CMMC L3','ISO 27001','SOX'], datasets:[{data:[92,88,85,78,90,82],backgroundColor:['rgba(0,170,255,0.5)','rgba(201,168,76,0.5)','rgba(56,189,248,0.5)','rgba(255,107,107,0.5)','rgba(167,139,250,0.5)','rgba(6,182,212,0.5)'],borderWidth:0}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8ea4b8',font:{size:9},padding:6}}},scales:{r:{grid:{color:'rgba(255,255,255,0.06)'},ticks:{display:false}}}}}; },
        roiLineChart: function() { return { type:'line', data:{ labels:['Q1','Q2','Q3','Q4','Y2-Q1','Y2-Q2','Y2-Q3','Y2-Q4'], datasets:[{label:'ROI %',data:[25,65,120,180,250,320,400,480],borderColor:'#00cc66',backgroundColor:'rgba(0,204,102,0.1)',fill:true,tension:0.3,pointRadius:3,pointBackgroundColor:'#00cc66'}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9},callback:function(v){return v+'%'}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true}}}}; },
        riskHeatChart: function() { return { type:'scatter', data:{ datasets:[{label:'Risk Items',data:[{x:3,y:4},{x:7,y:8},{x:2,y:6},{x:5,y:3},{x:8,y:9},{x:4,y:5},{x:6,y:7},{x:1,y:2}],backgroundColor:'rgba(255,107,107,0.6)',borderColor:'#ff6b6b',pointRadius:6}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{title:{display:true,text:'Likelihood',color:'#8ea4b8',font:{size:9}},ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},min:0,max:10},y:{title:{display:true,text:'Impact',color:'#8ea4b8',font:{size:9}},ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},min:0,max:10}}}}; },
        lifecyclePieChart: function() { return { type:'line', data:{ labels:['Intro','Growth','Maturity','Sustain','Phase Out','Disposal'], datasets:[{label:'Availability',data:[95,92,88,75,50,20],borderColor:'#00aaff',backgroundColor:'rgba(0,170,255,0.1)',fill:true,tension:0.3},{label:'Cost',data:[30,25,35,55,70,90],borderColor:'#ff6b6b',backgroundColor:'rgba(255,107,107,0.05)',fill:true,tension:0.3}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8ea4b8',font:{size:10}}}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true}}}}; }
    };

    function _bpRenderInPanel(panel) {
        if (typeof Chart === 'undefined') {
            console.warn('[S4-BP-Charts] Chart.js not loaded');
            return;
        }
        // CRITICAL: Inject chart containers first (the hook from block 4 never fires
        // because block 5's function declaration overwrites it).
        if (typeof injectChartContainers === 'function') {
            try { injectChartContainers(); } catch(e) { console.error('[S4-BP-Charts] injectChartContainers error:', e); }
        }
        // Now render charts in this panel
        var canvases = panel.querySelectorAll('canvas');
        if (canvases.length === 0) {
            console.log('[S4-BP-Charts] No canvases found in panel ' + panel.id);
            return;
        }
        canvases.forEach(function(canvas) {
            if (canvas.getAttribute('data-bp-rendered')) return;
            var cfg = _chartConfigs[canvas.id];
            if (!cfg) {
                console.log('[S4-BP-Charts] No config for canvas: ' + canvas.id);
                return;
            }
            try {
                var existing = Chart.getChart(canvas);
                if (existing) existing.destroy();
                // Ensure canvas has size
                if (!canvas.style.height && !canvas.getAttribute('height')) {
                    canvas.style.height = '220px';
                }
                canvas.style.width = '100%';
                canvas.style.display = 'block';
                // Show parent container
                var container = canvas.closest('.chart-container');
                if (container) {
                    container.style.display = 'block';
                    container.style.visibility = 'visible';
                }
                new Chart(canvas, cfg());
                canvas.setAttribute('data-bp-rendered', '1');
                console.log('[S4-BP-Charts] Rendered: ' + canvas.id);
            } catch(err) {
                console.error('[S4-BP-Charts] Failed ' + canvas.id + ':', err);
            }
        });
    }

    // ══════════════════════════════════════════════════════
    // INITIALIZATION — single clean init
    // ══════════════════════════════════════════════════════
    function _bpInit() {
        console.log('[S4-Bulletproof-v5] Initializing...');

        // 1) Attach ROI listeners (retry if inputs not in DOM yet)
        if (_bpAttachROI() === 0) {
            setTimeout(_bpAttachROI, 2000);
            setTimeout(_bpAttachROI, 5000);
        }

        // 2) Override global calcROI
        window.calcROI = _bpCalcROI;

        // 3) Hook openILSTool to inject charts + render
        if (typeof window.openILSTool === 'function') {
            var _prev = window.openILSTool;
            window.openILSTool = function(toolId) {
                _prev(toolId);
                // Inject + render at multiple timings for reliability
                setTimeout(function() {
                    var panel = document.getElementById(toolId);
                    if (panel) _bpRenderInPanel(panel);
                }, 300);
                setTimeout(function() {
                    var panel = document.getElementById(toolId);
                    if (panel) _bpRenderInPanel(panel);
                }, 800);
                setTimeout(function() {
                    var panel = document.getElementById(toolId);
                    if (panel) _bpRenderInPanel(panel);
                }, 2000);
            };
            console.log('[S4-Bulletproof-v5] Hooked openILSTool');
        }

        // 4) Also hook switchHubTab
        if (typeof window.switchHubTab === 'function') {
            var _prevSwitch = window.switchHubTab;
            window.switchHubTab = function(panelId, btn) {
                _prevSwitch(panelId, btn);
                setTimeout(function() {
                    var panel = document.getElementById(panelId);
                    if (panel) _bpRenderInPanel(panel);
                }, 400);
            };
        }

        // 5) MutationObserver for panels becoming visible
        document.querySelectorAll('.ils-hub-panel').forEach(function(panel) {
            var obs = new MutationObserver(function(muts) {
                muts.forEach(function(m) {
                    if (m.target.classList && m.target.classList.contains('active')) {
                        setTimeout(function() { _bpRenderInPanel(m.target); }, 400);
                    }
                });
            });
            obs.observe(panel, { attributes: true, attributeFilter: ['class', 'style'] });
        });

        // 6) Also render charts in any currently-active panel
        setTimeout(function() {
            document.querySelectorAll('.ils-hub-panel.active').forEach(function(p) {
                _bpRenderInPanel(p);
            });
        }, 2000);

        // 7) Auto-load metrics on session start
        setTimeout(function() {
            if (typeof loadPerformanceMetrics === 'function') {
                try { loadPerformanceMetrics(); } catch(e) {}
            }
        }, 1500);

        // 8) Safety net: re-attach ROI listeners
        setTimeout(_bpAttachROI, 3000);

        console.log('[S4-Bulletproof-v5] Init complete');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _bpInit);
    } else {
        _bpInit();
    }
})();
</script>'''

content = content[:script_before] + new_bp_block + content[bp_block_end:]
changes.append("CHARTS+ROI: Replaced bulletproof block — now calls injectChartContainers() directly, ROI uses volume multiplier")

# ══════════════════════════════════════════════════════════════════
# FIX 2: WALLET SIDEBAR — Make body flex:1 so it fills remaining space
# and scrolls properly. The sidebar is flex-column but body needs flex:1.
# ══════════════════════════════════════════════════════════════════

old_wallet_css = '.wallet-sidebar-body { padding:20px; overflow-y:auto; max-height:calc(100vh - 70px); }'
new_wallet_css = '.wallet-sidebar-body { padding:20px; overflow-y:auto; flex:1; min-height:0; padding-bottom:40px; }'

if old_wallet_css in content:
    content = content.replace(old_wallet_css, new_wallet_css)
    changes.append("WALLET: sidebar body now flex:1 with min-height:0 for proper scrolling")
else:
    print("WARNING: Could not find wallet-sidebar-body CSS to replace")

# ══════════════════════════════════════════════════════════════════
# FIX 3: PLATFORM DROPDOWN — Start empty with a placeholder option
# Modify buildProgramOptions in platforms.js to add empty default
# ══════════════════════════════════════════════════════════════════
platforms_path = 's4-assets/platforms.js'
if os.path.exists(platforms_path):
    with open(platforms_path, 'r', encoding='utf-8') as f:
        platforms_content = f.read()
    
    old_options_fn = """    let html = '';
    if (includeAll) html += '<option value="all">All Programs</option>';"""
    
    new_options_fn = """    let html = '<option value="" disabled selected>-- Select a Program / Platform --</option>';
    if (includeAll) html += '<option value="all">All Programs</option>';"""
    
    if old_options_fn in platforms_content:
        platforms_content = platforms_content.replace(old_options_fn, new_options_fn)
        with open(platforms_path, 'w', encoding='utf-8') as f:
            f.write(platforms_content)
        changes.append("PLATFORM DROPDOWN: Now starts empty with '-- Select a Program / Platform --' placeholder")
    else:
        print("WARNING: Could not find buildProgramOptions html start in platforms.js")
else:
    print("WARNING: platforms.js not found at " + platforms_path)

# ══════════════════════════════════════════════════════════════════
# FIX 4: ACTION ITEMS CALENDAR — Add calendar widget to hub-actions panel
# Insert after the stats row and before the action items list
# ══════════════════════════════════════════════════════════════════

# Find the action items list div and insert calendar before it
old_actions_list = '<div id="hubActionItemsList" style="max-height:600px;overflow-y:auto">'
calendar_html = '''<div id="actionCalendarSection" style="margin-bottom:16px">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                                        <h4 style="font-size:0.9rem;font-weight:700;color:#fff;margin:0"><i class="fas fa-calendar-alt" style="color:var(--accent);margin-right:6px"></i>Action Calendar</h4>
                                        <div style="display:flex;gap:6px">
                                            <button onclick="changeCalMonth(-1)" class="ai-quick-btn" style="padding:4px 10px;font-size:0.75rem"><i class="fas fa-chevron-left"></i></button>
                                            <span id="calMonthLabel" style="font-size:0.82rem;color:var(--steel);font-weight:600;min-width:120px;text-align:center;line-height:28px">June 2025</span>
                                            <button onclick="changeCalMonth(1)" class="ai-quick-btn" style="padding:4px 10px;font-size:0.75rem"><i class="fas fa-chevron-right"></i></button>
                                        </div>
                                    </div>
                                    <div id="actionCalendarGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:0.72rem;text-align:center"></div>
                                    <div id="calDayDetail" style="display:none;margin-top:8px;padding:10px;background:var(--surface);border-radius:8px;border:1px solid var(--border);font-size:0.82rem"></div>
                                </div>
                                <div id="hubActionItemsList" style="max-height:600px;overflow-y:auto">'''

if old_actions_list in content:
    content = content.replace(old_actions_list, calendar_html, 1)
    changes.append("ACTION ITEMS: Added calendar widget above action items list")
else:
    print("WARNING: Could not find hubActionItemsList div")

# Now add the calendar JavaScript — inject it into the metrics+charts block
# right before the closing </script> of block 4 (line ~10158)
# Find the last part of block 4
cal_js = '''

// ═══ ACTION ITEMS CALENDAR ═══
var _calYear, _calMonth;
(function initCal() {
    var now = new Date();
    _calYear = now.getFullYear();
    _calMonth = now.getMonth();
})();

function changeCalMonth(delta) {
    _calMonth += delta;
    if (_calMonth > 11) { _calMonth = 0; _calYear++; }
    if (_calMonth < 0) { _calMonth = 11; _calYear--; }
    renderActionCalendar();
}

function renderActionCalendar() {
    var grid = document.getElementById('actionCalendarGrid');
    var label = document.getElementById('calMonthLabel');
    if (!grid || !label) return;
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    label.textContent = months[_calMonth] + ' ' + _calYear;

    var firstDay = new Date(_calYear, _calMonth, 1).getDay();
    var daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
    var today = new Date();
    var isCurrentMonth = (today.getFullYear() === _calYear && today.getMonth() === _calMonth);

    // Collect action item due dates from sessionStorage
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
    } catch(e) {}

    // Also generate some demo action dates for visual appeal
    if (Object.keys(actionDates).length === 0) {
        var demoActions = [
            {day:3, title:'DMSMS Review — AN/SPS-49 Radar', severity:'critical'},
            {day:7, title:'ILS Gap Analysis — DDG-51 FY25', severity:'warning'},
            {day:10, title:'Parts Order Deadline — CVN-78', severity:'critical'},
            {day:12, title:'Compliance Audit Prep', severity:'info'},
            {day:15, title:'Warranty Expiry — GE LM2500', severity:'warning'},
            {day:18, title:'Lifecycle Cost Review', severity:'info'},
            {day:21, title:'Risk Assessment Update', severity:'warning'},
            {day:24, title:'Readiness Report Due', severity:'critical'},
            {day:27, title:'Obsolescence Check — MIL-STD-1553', severity:'info'}
        ];
        demoActions.forEach(function(a) {
            if (a.day <= daysInMonth) {
                if (!actionDates[a.day]) actionDates[a.day] = [];
                actionDates[a.day].push(a);
            }
        });
    }

    var html = '';
    // Day headers
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(function(d) {
        html += '<div style="padding:4px;font-weight:700;color:var(--steel);font-size:0.7rem">' + d + '</div>';
    });
    // Empty cells before first day
    for (var i = 0; i < firstDay; i++) {
        html += '<div style="padding:6px"></div>';
    }
    // Day cells
    for (var d = 1; d <= daysInMonth; d++) {
        var isToday = isCurrentMonth && d === today.getDate();
        var hasActions = actionDates[d];
        var bg = isToday ? 'rgba(0,170,255,0.2)' : (hasActions ? 'rgba(0,170,255,0.06)' : 'var(--surface)');
        var border = isToday ? '1px solid var(--accent)' : (hasActions ? '1px solid rgba(0,170,255,0.15)' : '1px solid var(--border)');
        var dots = '';
        if (hasActions) {
            hasActions.forEach(function(a) {
                var col = a.severity === 'critical' ? '#ff3333' : (a.severity === 'warning' ? '#ffa500' : '#00aaff');
                dots += '<span style="display:inline-block;width:4px;height:4px;border-radius:50%;background:' + col + ';margin:0 1px"></span>';
            });
        }
        html += '<div onclick="showCalDay(' + d + ')" style="padding:4px 2px;background:' + bg + ';border:' + border + ';border-radius:4px;cursor:' + (hasActions ? 'pointer' : 'default') + ';min-height:32px">'
            + '<div style="color:' + (isToday ? '#00aaff' : '#fff') + ';font-weight:' + (isToday ? '800' : '400') + '">' + d + '</div>'
            + (dots ? '<div style="margin-top:2px">' + dots + '</div>' : '')
            + '</div>';
    }
    grid.innerHTML = html;
}

function showCalDay(day) {
    var detail = document.getElementById('calDayDetail');
    if (!detail) return;
    // Get actions for this day
    var actionDates = {};
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
    } catch(e) {}
    // Demo data fallback
    var demoActions = {
        3: [{title:'DMSMS Review — AN/SPS-49 Radar', severity:'critical', owner:'NAVSEA 04'}],
        7: [{title:'ILS Gap Analysis — DDG-51 FY25', severity:'warning', owner:'PMS 400'}],
        10: [{title:'Parts Order Deadline — CVN-78', severity:'critical', owner:'PMS 312'}],
        12: [{title:'Compliance Audit Prep', severity:'info', owner:'ILS Manager'}],
        15: [{title:'Warranty Expiry — GE LM2500', severity:'warning', owner:'PMS 300'}],
        18: [{title:'Lifecycle Cost Review', severity:'info', owner:'CAPE'}],
        21: [{title:'Risk Assessment Update', severity:'warning', owner:'PMS 400'}],
        24: [{title:'Readiness Report Due', severity:'critical', owner:'TYCOM'}],
        27: [{title:'Obsolescence Check — MIL-STD-1553', severity:'info', owner:'NAVSEA 04'}]
    };
    var items = actionDates[day] || demoActions[day] || [];
    if (items.length === 0) { detail.style.display = 'none'; return; }
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var html = '<div style="font-weight:700;color:#fff;margin-bottom:6px"><i class="fas fa-calendar-day" style="color:var(--accent);margin-right:4px"></i>' + months[_calMonth] + ' ' + day + ', ' + _calYear + '</div>';
    items.forEach(function(item) {
        var col = item.severity === 'critical' ? '#ff3333' : (item.severity === 'warning' ? '#ffa500' : '#00aaff');
        html += '<div style="padding:6px 8px;background:rgba(0,0,0,0.2);border-left:3px solid ' + col + ';border-radius:4px;margin-bottom:4px">'
            + '<div style="font-weight:600;color:#fff;font-size:0.8rem">' + (item.title || 'Action Item') + '</div>'
            + (item.owner ? '<div style="font-size:0.72rem;color:var(--steel)">Owner: ' + item.owner + '</div>' : '')
            + '</div>';
    });
    detail.innerHTML = html;
    detail.style.display = 'block';
}

// Render calendar on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(renderActionCalendar, 500); });
} else {
    setTimeout(renderActionCalendar, 500);
}
'''

# Insert the calendar JS right before the closing of block 4
# Block 4 ends around the DOM transform engine
# Find a good insertion point — just before the last closing of block 4
block4_close_marker = "// Auto-refresh metrics every 30 seconds when metrics tab is visible"
block4_insert_pos = content.find(block4_close_marker)
if block4_insert_pos != -1:
    # Find the next </script> after this
    next_script_close = content.find('</script>', block4_insert_pos)
    if next_script_close != -1:
        content = content[:next_script_close] + cal_js + '\n' + content[next_script_close:]
        changes.append("CALENDAR JS: Added renderActionCalendar, changeCalMonth, showCalDay functions")
    else:
        print("WARNING: Could not find </script> after auto-refresh metrics")
else:
    print("WARNING: Could not find auto-refresh metrics marker for calendar JS insertion")

# ══════════════════════════════════════════════════════════════════
# FIX 5: METRICS AUTO-REFRESH — already added in bulletproof init above
# (setTimeout loadPerformanceMetrics at 1500ms)
# Also ensure it fires when entering platform workspace
# ══════════════════════════════════════════════════════════════════

# Find the platform entry button and add metrics load after enter
# The initILSEngine call and populateAllDropdowns should also trigger metrics
# Let's add it to the DOMContentLoaded in block 4
block4_dcl = "document.addEventListener('shown.bs.tab', function(e) {"
block4_dcl_pos = content.find(block4_dcl)
if block4_dcl_pos != -1:
    # Add metrics auto-load right before this
    metrics_autoload = """// Auto-load metrics on session start
setTimeout(function() {
    if (typeof loadPerformanceMetrics === 'function') {
        try { loadPerformanceMetrics(); } catch(e) {}
        console.log('[S4] Auto-loaded metrics on session start');
    }
}, 2000);

"""
    content = content[:block4_dcl_pos] + metrics_autoload + content[block4_dcl_pos:]
    changes.append("METRICS: Added auto-load on session start (2s delay)")
else:
    print("WARNING: Could not find shown.bs.tab listener for metrics insertion")

# ══════════════════════════════════════════════════════════════════
# Write the result
# ══════════════════════════════════════════════════════════════════

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

new_lines = content.count('\n') + 1
orig_lines = original.count('\n') + 1

print(f"\n{'='*60}")
print(f"Round 5 Fix Script Complete")
print(f"{'='*60}")
print(f"Original: {orig_lines} lines")
print(f"Modified: {new_lines} lines")
print(f"Changes applied ({len(changes)}):")
for i, c in enumerate(changes, 1):
    print(f"  {i}. {c}")
print(f"{'='*60}")
