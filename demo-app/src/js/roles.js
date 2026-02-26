// S4 Ledger Demo — roles
// Extracted from monolith lines 15335-15878
// 542 lines


// ══════════════════════════════════════════════════════════════
// ROLE-BASED TOOL ACCESS SYSTEM
// ══════════════════════════════════════════════════════════════
var _s4Roles = {
    'ils_manager': { label:'ILS Manager', icon:'fa-clipboard-list', desc:'Full ILS tool suite access', tabs:['hub-analysis','hub-dmsms','hub-readiness','hub-compliance','hub-risk','hub-actions','hub-predictive','hub-lifecycle','hub-roi','hub-vault','hub-docs','hub-reports','hub-submissions','hub-sbom','hub-gfp','hub-cdrl','hub-contract','hub-provenance','hub-analytics','hub-team'] },
    'dmsms_analyst': { label:'DMSMS Analyst', icon:'fa-microchip', desc:'DMSMS tracking and obsolescence management', tabs:['hub-dmsms','hub-risk','hub-lifecycle','hub-actions','hub-vault','hub-docs','hub-reports'] },
    'auditor': { label:'Auditor / Compliance', icon:'fa-shield-halved', desc:'Compliance scorecard and audit vault', tabs:['hub-compliance','hub-vault','hub-actions','hub-docs','hub-reports','hub-submissions'] },
    'contracts': { label:'Contract Specialist', icon:'fa-file-contract', desc:'ROI, submissions, and document management', tabs:['hub-roi','hub-vault','hub-docs','hub-reports','hub-submissions','hub-actions','hub-cdrl','hub-contract'] },
    'supply_chain': { label:'Supply Chain / Provisioning', icon:'fa-truck', desc:'Supply, readiness, and provisioning tools', tabs:['hub-readiness','hub-risk','hub-lifecycle','hub-actions','hub-vault','hub-docs','hub-submissions'] },
    'admin': { label:'Full Access Admin', icon:'fa-user-shield', desc:'All tools visible — unrestricted access', tabs:['hub-analysis','hub-dmsms','hub-readiness','hub-compliance','hub-risk','hub-actions','hub-predictive','hub-lifecycle','hub-roi','hub-vault','hub-docs','hub-reports','hub-submissions','hub-sbom','hub-gfp','hub-cdrl','hub-contract','hub-provenance','hub-analytics','hub-team'] }
};
var _allHubTabs = ['hub-analysis','hub-dmsms','hub-readiness','hub-compliance','hub-risk','hub-actions','hub-predictive','hub-lifecycle','hub-roi','hub-vault','hub-docs','hub-reports','hub-submissions','hub-sbom','hub-gfp','hub-cdrl','hub-contract','hub-provenance','hub-analytics','hub-team'];
var _allHubLabels = {'hub-analysis':'Gap Analysis','hub-dmsms':'DMSMS Tracker','hub-readiness':'Readiness Calc','hub-compliance':'Compliance','hub-risk':'Supply Chain Risk','hub-actions':'Action Items','hub-predictive':'Predictive Maint','hub-lifecycle':'Lifecycle Cost','hub-roi':'ROI Calculator','hub-vault':'Audit Vault','hub-docs':'Document Library','hub-reports':'Report Gen','hub-submissions':'Submissions & PTD','hub-sbom':'SBOM Viewer','hub-gfp':'GFP Tracker','hub-cdrl':'CDRL Validator','hub-contract':'Contract Extractor','hub-provenance':'Provenance Chain','hub-analytics':'Cross-Program Analytics','hub-team':'Team Management'};

var _currentRole = sessionStorage.getItem('s4_user_role') || '';
var _currentTitle = sessionStorage.getItem('s4_user_title') || '';
var _customVisibleTabs = JSON.parse(sessionStorage.getItem('s4_visible_tabs') || 'null');

function showRoleSelector() {
    var modal = document.createElement('div');
    modal.id = 'roleModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.3s ease';
    var html = '<div style="background:var(--card);border:1px solid var(--border);border-radius:3px;padding:32px;max-width:620px;width:95%;max-height:85vh;overflow-y:auto">'
        + '<h3 style="color:#fff;margin:0 0 4px"><i class="fas fa-user-cog" style="color:var(--accent);margin-right:8px"></i>Configure Your Role</h3>'
        + '<p style="color:var(--steel);font-size:0.85rem;margin-bottom:20px">Select your role to see relevant tools. You can customize visible tools and your displayed title.</p>'
        + '<div style="margin-bottom:16px"><label style="color:var(--steel);font-size:0.8rem;font-weight:600">Your Display Title</label><input id="roleTitle" value="'+(_currentTitle||'')+'" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:10px;width:100%;margin-top:4px" placeholder="e.g., ILS Analyst, Logistics Specialist, Contract Manager"></div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">';
    Object.keys(_s4Roles).forEach(function(key) {
        var r = _s4Roles[key];
        var sel = _currentRole === key ? 'border-color:var(--accent);background:rgba(0,170,255,0.08)' : '';
        html += '<div class="role-card" onclick="selectRolePreset(\'' + key + '\')" style="border:2px solid '+(sel?'var(--accent)':'var(--border)')+';border-radius:3px;padding:14px;cursor:pointer;transition:all 0.2s;'+(sel?'background:rgba(0,170,255,0.08)':'')+'" data-role="'+key+'">'
            + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><i class="fas '+r.icon+'" style="color:var(--accent);font-size:1.1rem"></i><strong style="color:#fff;font-size:0.9rem">'+r.label+'</strong></div>'
            + '<div style="color:var(--steel);font-size:0.78rem">'+r.desc+'</div>'
            + '<div style="color:var(--muted);font-size:0.72rem;margin-top:4px">'+r.tabs.length+' tools</div>'
            + '</div>';
    });
    html += '</div>'
        + '<details style="margin-bottom:20px;background:rgba(0,170,255,0.03);border:1px solid rgba(0,170,255,0.12);border-radius:3px;padding:0 16px"><summary style="cursor:pointer;color:var(--accent);font-weight:600;font-size:0.85rem;padding:12px 0;list-style:none;display:flex;align-items:center;gap:8px"><i class="fas fa-sliders-h"></i> Customize Visible Tools <i class="fas fa-chevron-down" style="font-size:0.7rem;margin-left:auto;opacity:0.5"></i></summary>'
        + '<div id="roleToolChecks" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 0 16px">';
    _allHubTabs.forEach(function(tab) {
        var vis = _customVisibleTabs ? _customVisibleTabs.indexOf(tab)>=0 : (_currentRole ? (_s4Roles[_currentRole]?.tabs||[]).indexOf(tab)>=0 : true);
        html += '<label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--steel);cursor:pointer;padding:6px 10px;border-radius:3px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:all 0.2s"><input type="checkbox" data-tab="'+tab+'" '+(vis?'checked':'')+' onchange="onRoleToolToggle()" style="accent-color:#00aaff;width:16px;height:16px;flex-shrink:0"> <span>' + (_allHubLabels[tab]||tab) + '</span></label>';
    });
    html += '</div></details>'
        + '<div style="display:flex;gap:10px;justify-content:flex-end">'
        + '<button onclick="document.getElementById(\'roleModal\').remove()" style="background:rgba(255,255,255,0.06);color:var(--steel);border:1px solid var(--border);border-radius:3px;padding:8px 20px;cursor:pointer">Cancel</button>'
        + '<button onclick="applyRole()" style="background:var(--accent);color:#fff;border:none;border-radius:3px;padding:8px 24px;cursor:pointer;font-weight:600">Apply Role</button>'
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
    sessionStorage.setItem('s4_user_role', _currentRole);
    sessionStorage.setItem('s4_user_title', _currentTitle);
    // Determine visible tabs
    var visibleTabs;
    if (_customVisibleTabs) {
        visibleTabs = _customVisibleTabs;
        sessionStorage.setItem('s4_visible_tabs', JSON.stringify(_customVisibleTabs));
    } else if (_currentRole && _s4Roles[_currentRole]) {
        visibleTabs = _s4Roles[_currentRole].tabs;
        sessionStorage.removeItem('s4_visible_tabs');
    } else {
        visibleTabs = _allHubTabs;
    }
    applyTabVisibility(visibleTabs);
    updateRoleBadge();
    // Reload vault for this role so each user sees only their own records
    if (typeof reloadVaultForRole === 'function') reloadVaultForRole();
    document.getElementById('roleModal')?.remove();
    s4Notify('Role Applied', (title || _s4Roles[_currentRole]?.label || 'Custom') + ' — ' + visibleTabs.length + ' tools active', 'success');
}

function applyTabVisibility(visibleTabs) {
    // Show/hide hub tab buttons based on role
    document.querySelectorAll('.ils-hub-tab').forEach(function(btn) {
        var onclick = btn.getAttribute('onclick') || '';
        var match = onclick.match(/switchHubTab\('([^']+)'/);
        if (match) {
            var panelId = match[1];
            btn.style.display = visibleTabs.indexOf(panelId) >= 0 ? '' : 'none';
        }
    });
    // Also show/hide tool cards in the ILS tool grid
    document.querySelectorAll('.ils-tool-card[onclick]').forEach(function(card) {
        var onclick = card.getAttribute('onclick') || '';
        var match = onclick.match(/openILSTool\('([^']+)'/);
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
        badge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:3px;font-size:0.75rem;font-weight:600;background:rgba(0,170,255,0.1);border:1px solid rgba(0,170,255,0.25);color:#00aaff;cursor:pointer;transition:all 0.2s;hover:background:rgba(0,170,255,0.2)';badge.title='Click to change your role';
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
        // Load the vault scoped to this role
        if (typeof reloadVaultForRole === 'function') reloadVaultForRole();
    }
    updateRoleBadge();
    // Show role selector ONLY when user is inside the platform (not landing page or demo)
    if (!_currentRole) {
        setTimeout(function() {
            // Must have entered platform AND onboarding must be done — check DOM visibility, not sessionStorage
            var ws = document.getElementById('platformWorkspace');
            if (ws && ws.style.display === 'block' && sessionStorage.getItem('s4_onboard_done')) {
                showRoleSelector();
            }
        }, 2500);
    }
}

(function() {
    'use strict';

    // ── Utility: format number with commas ──
    function _bpFmt(n) {
        return Math.round(n).toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
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
                output.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:3px;padding:20px;margin-top:12px">'
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
    // ── Helper: pull live data from tool state ──
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
        },
        gapBarChart: function() {
            var s = _getToolState();
            var tracking = Math.max(0, 100 - (20 + s.vault * 3));
            var audit = Math.max(0, 100 - (15 + s.vault * 4));
            var compliance = Math.max(0, 100 - (s.comp[0] || 10));
            var obsol = Math.max(0, 100 - (10 + (s.dmsmsItems.length||0)*8));
            var risk = Math.max(0, 100 - (15 + (s.riskItems.length||0)*5));
            var budget = Math.max(0, 100 - (20 + s.ilsPct * 0.6));
            return { type:'bar', data:{ labels:['Tracking','Audit','Compliance','Obsolescence','Risk','Budget'], datasets:[{label:'Gap %',data:[tracking,audit,compliance,obsol,risk,budget],backgroundColor:['#ff6b6b','#fb923c','#c9a84c','#00aaff','#38bdf8','#06b6d4'],borderWidth:0,borderRadius:4}]}, options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},max:100},y:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}}}}};
        },
        dmsmsPieChart: function() {
            var s = _getToolState();
            var items = s.dmsmsItems;
            var active=0,atRisk=0,obsolete=0,discontinued=0,eol=0;
            if (items.length > 0) {
                items.forEach(function(it){ var st=(it.status||'').toLowerCase(); if(st.indexOf('obsolete')>=0) obsolete++; else if(st.indexOf('risk')>=0||st.indexOf('diminish')>=0) atRisk++; else if(st.indexOf('discontin')>=0) discontinued++; else if(st.indexOf('eol')>=0||st.indexOf('last')>=0) eol++; else active++; });
            } else { active=45; atRisk=20; obsolete=15; discontinued=10; eol=10; }
            return { type:'doughnut', data:{ labels:['Active','At Risk','Obsolete','Discontinued','EOL Planned'], datasets:[{data:[active,atRisk,obsolete,discontinued,eol],backgroundColor:['#00aaff','#c9a84c','#ff6b6b','#00aaff','#6b7d93'],borderWidth:0}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8ea4b8',font:{size:9},padding:6}}}}};
        },
        readinessGauge: function() {
            var s = _getToolState();
            var base = Math.max(30, s.ilsPct);
            var personnel = Math.min(100, base + 15 + (s.vault > 5 ? 10 : 0));
            var equipment = Math.min(100, base + (s.dmsmsItems.length > 0 ? -5 : 8));
            var supply = Math.min(100, base - 12 + s.vault * 2);
            var training = Math.min(100, base + 20);
            var maintenance = Math.min(100, base + 6 + (s.actionsDone * 3));
            var c4isr = Math.min(100, base + 12);
            return { type:'bar', data:{ labels:['Personnel','Equipment','Supply','Training','Maintenance','C4ISR'], datasets:[{label:'Readiness %',data:[personnel,equipment,supply,training,maintenance,c4isr],backgroundColor:'rgba(0,170,255,0.6)',borderColor:'#00aaff',borderWidth:1,borderRadius:4}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true,max:100}}}};
        },
        complianceRadarChart: function() {
            var s = _getToolState();
            var dfars = s.comp[2] || 30;
            var itar = Math.min(100, 40 + s.vault * 4);
            var nist = s.comp[1] || 25;
            var cmmc = s.comp[0] || 20;
            var iso = Math.min(100, 30 + s.ilsPct * 0.5);
            var sox = Math.min(100, 35 + s.vault * 3);
            return { type:'polarArea', data:{ labels:['DFARS','ITAR','NIST 800-171','CMMC','ISO 27001','SOX'], datasets:[{data:[dfars,itar,nist,cmmc,iso,sox],backgroundColor:['rgba(0,170,255,0.5)','rgba(201,168,76,0.5)','rgba(56,189,248,0.5)','rgba(255,107,107,0.5)','rgba(0,170,255,0.5)','rgba(6,182,212,0.5)'],borderWidth:0}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8ea4b8',font:{size:9},padding:6}}},scales:{r:{grid:{color:'rgba(255,255,255,0.06)'},ticks:{display:false}}}}};
        },
        roiLineChart: function() {
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
            }
            // Always use the visually appealing default curve when no real inputs
            if (!hasInput || data.length === 0 || data.every(function(v){return v===0;})) {
                labels = []; data = [];
                for (var y2 = 1; y2 <= 5; y2++) { for (var q2 = 1; q2 <= 4; q2++) {
                    labels.push('Y'+y2+'-Q'+q2);
                    var qtr = (y2-1)*4+q2;
                    // Exponential growth curve: starts negative, crosses zero ~Q5, grows to ~350%
                    data.push(Math.round(-15 + 3.5 * qtr + 0.8 * Math.pow(qtr, 1.45)));
                }}
            }
            return { type:'line', data:{ labels:labels, datasets:[{label:'Cumulative ROI %',data:data,borderColor:'#00cc66',backgroundColor:'rgba(0,204,102,0.1)',fill:true,tension:0.3,pointRadius:2,pointBackgroundColor:'#00cc66'}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},title:{display:true,text:'5-Year Cumulative ROI',color:'#8ea4b8',font:{size:11}}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:8},maxRotation:45},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9},callback:function(v){return v+'%'}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true}}}};
        },
        riskHeatChart: function() {
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
        },
        lifecyclePieChart: function() {
            var s = _getToolState();
            // Adjust curves based on DMSMS alerts and ILS completeness
            var dmsmsRisk = Math.min(30, (s.dmsmsItems.length || 0) * 5);
            var ilsBoost = Math.min(15, s.ilsPct * 0.15);
            return { type:'line', data:{ labels:['Intro','Growth','Maturity','Sustain','Phase Out','Disposal'], datasets:[{label:'Availability %',data:[95-dmsmsRisk*0.1, 92-dmsmsRisk*0.2+ilsBoost, 88-dmsmsRisk*0.4+ilsBoost, 75-dmsmsRisk*0.6+ilsBoost*2, 50-dmsmsRisk*0.3+ilsBoost, 20+ilsBoost*0.5].map(function(v){return Math.round(Math.max(5,Math.min(100,v)));}),borderColor:'#00aaff',backgroundColor:'rgba(0,170,255,0.1)',fill:true,tension:0.3},{label:'Cost Index',data:[30,25+dmsmsRisk*0.3,35+dmsmsRisk*0.5,55+dmsmsRisk*0.8-ilsBoost,70+dmsmsRisk-ilsBoost*2,90+dmsmsRisk*0.5-ilsBoost].map(function(v){return Math.round(Math.max(5,Math.min(100,v)));}),borderColor:'#ff6b6b',backgroundColor:'rgba(255,107,107,0.05)',fill:true,tension:0.3}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8ea4b8',font:{size:10}}}},scales:{x:{ticks:{color:'#8ea4b8',font:{size:9}},grid:{display:false}},y:{ticks:{color:'#6b7d93',font:{size:9}},grid:{color:'rgba(255,255,255,0.04)'},beginAtZero:true}}}};
        }
    };

    window._bpRenderInPanel = _bpRenderInPanel;
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
                canvas.setAttribute('data-bp-ts', Date.now());
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

        // 9) Initialize role-based access
        if (typeof initRoleSystem === 'function') initRoleSystem();

        console.log('[S4-Bulletproof-v5] Init complete');
    }


    // ── Global chart refresh: call after any tool data changes ──
    window._s4RefreshCharts = function() {
        document.querySelectorAll('canvas[data-bp-rendered]').forEach(function(c) {
            c.removeAttribute('data-bp-rendered');
        });
        var activePanel = document.querySelector('.ils-hub-panel.active');
        if (activePanel) _bpRenderInPanel(activePanel);
    };
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _bpInit);
    } else {
        _bpInit();
    }
})();
