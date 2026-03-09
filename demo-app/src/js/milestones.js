// =======================================================================
//  S4 Ledger — Program Milestone Tracker (Phase 2)
//  Per-program vessel milestone lifecycle: contract award → delivery
//  Full CRUD, editable vessel-type registry, Gantt, dashboard, AI hooks
// =======================================================================

(function () {
    'use strict';

    // -- Delivery Status States --
    var MIL_STATUSES = ['On Track','At Risk','Delayed','Complete','Cancelled'];
    var MIL_STATUS_COLORS = {
        'On Track':'#4ecb71','At Risk':'#c9a84c','Delayed':'#ff4444',
        'Complete':'#00cc88','Cancelled':'#8b949e'
    };

    // -- Column Definitions --
    var MIL_COLUMNS = [
        { key: 'delivery_status',          label: 'Status',              type: 'select',   width: '120px', options: MIL_STATUSES },
        { key: 'program_name',             label: 'Program',             type: 'text',     width: '130px', required: true },
        { key: 'vessel_type',              label: 'Vessel Type',         type: 'select',   width: '110px', options: [], dynamic: true },
        { key: 'hull_number',              label: 'Hull #',              type: 'text',     width: '100px', required: true },
        { key: 'contract_number',          label: 'Contract #',          type: 'text',     width: '120px' },
        { key: 'ship_builder',             label: 'Ship Builder',        type: 'text',     width: '130px' },
        { key: 'fy_appropriation',         label: 'FY Approp',           type: 'text',     width: '90px' },
        { key: 'uic_code',                 label: 'UIC',                 type: 'text',     width: '80px' },
        { key: 'contract_award_date',      label: 'Contract Award',      type: 'date',     width: '120px' },
        { key: 'construction_start_date',  label: 'Construction Start',  type: 'date',     width: '130px' },
        { key: 'launch_date',              label: 'Launch',              type: 'date',     width: '110px' },
        { key: 'builders_trials_date',     label: 'Builders Trials',     type: 'date',     width: '120px' },
        { key: 'acceptance_trials_date',   label: 'Acceptance Trials',   type: 'date',     width: '130px' },
        { key: 'contract_delivery_date',   label: 'Contract Delivery',   type: 'date',     width: '130px' },
        { key: 'planned_delivery_date',    label: 'Planned Delivery',    type: 'date',     width: '130px' },
        { key: 'pm_estimated_delivery',    label: 'PM Est Delivery',     type: 'date',     width: '130px' },
        { key: 'sail_away_date',           label: 'Sail Away',           type: 'date',     width: '110px' },
        { key: 'arrival_date',             label: 'Arrival',             type: 'date',     width: '110px' },
        { key: 'owld_date',                label: 'OWLD Date',           type: 'date',     width: '120px' },
        { key: 'notes',                    label: 'Notes',               type: 'textarea', width: '200px' }
    ];

    // -- Per-Program Vessel Type Registry (editable) --
    var _milVesselTypes = {
        'PMS 300': ['YRBM','APL','YP','YC','AFDM','YON','YT','YTL','YTB','YR','YFB','YFNB','YFN','YNG'],
        'PMS 325': ['DDG','CG','FFG'],
        'PMS 501': ['LCS','LPD','LHA'],
        'Strategic Programs': ['SSBN','SSN','SSGN'],
        'Default Program': ['Generic']
    };

    // -- State --
    var _milData = [];
    var _milSortCol = null;
    var _milSortDir = 'asc';
    var _milFilterText = '';
    var _milEditingId = null;
    var _milNextLocalId = 1;
    var _milPrograms = [];
    var _milSelectedPrograms = null;
    var _milBulkSelected = {};
    var _milExpandedRow = null;
    var _milAuditLog = [];
    var _milStatusFilter = null;

    // -- Helpers --
    function _fmtDate(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }
    function _setTxt(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    // -- OWLD calculation (Obligation Work Limiting Date — ~11 months after contract delivery) --
    function _calcOWLD(row) {
        var cd = row.contract_delivery_date ? new Date(row.contract_delivery_date) : null;
        if (!cd || isNaN(cd.getTime())) return '';
        var owld = new Date(cd);
        owld.setMonth(owld.getMonth() + 11);
        return owld.toISOString().slice(0, 10);
    }

    // -- Audit Trail --
    function _logMilAudit(action, rowId, details) {
        _milAuditLog.push({ timestamp: new Date().toISOString(), action: action, rowId: String(rowId), details: details || '', user: sessionStorage.getItem('s4_user_email') || 'anonymous' });
    }

    function milShowAuditLog(rowId) {
        var logs = rowId ? _milAuditLog.filter(function(l) { return l.rowId === String(rowId); }) : _milAuditLog;
        if (!logs.length) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('No milestone audit history.', 'info'); return; }
        var html = '<div style="max-height:400px;overflow:auto;font-size:0.8rem"><table style="width:100%;border-collapse:collapse">';
        html += '<tr style="border-bottom:1px solid rgba(0,0,0,0.1);color:var(--steel)"><th style="padding:6px;text-align:left">Time</th><th style="padding:6px;text-align:left">Action</th><th style="padding:6px;text-align:left">Details</th><th style="padding:6px;text-align:left">User</th></tr>';
        logs.slice().reverse().forEach(function(l) {
            html += '<tr style="border-bottom:1px solid rgba(0,0,0,0.04)"><td style="padding:4px 6px;color:var(--muted);white-space:nowrap">' + new Date(l.timestamp).toLocaleString() + '</td><td style="padding:4px 6px;color:#00aaff;font-weight:600">' + l.action + '</td><td style="padding:4px 6px;color:var(--steel)">' + (l.details || '').substring(0,80) + '</td><td style="padding:4px 6px;color:var(--muted)">' + l.user + '</td></tr>';
        });
        html += '</table></div>';
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(245,245,247,0.88);z-index:9999;display:flex;align-items:center;justify-content:center';
        overlay.innerHTML = '<div style="background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:6px;padding:24px;max-width:700px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.12)"><div style="display:flex;justify-content:space-between;margin-bottom:16px"><h4 style="margin:0;color:#1d1d1f"><i class="fas fa-history" style="color:#c9a84c;margin-right:8px"></i>Milestone Audit Log</h4><button style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer">&times;</button></div>' + html + '</div>';
        overlay.querySelector('button').addEventListener('click', function() { overlay.remove(); });
        overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    }
    window.milShowAuditLog = milShowAuditLog;

    // ============================================================
    //  INIT + DATA LOADING
    // ============================================================
    function initMilestoneTracker() {
        _loadMilData(function () {
            _rebuildMilProgramList();
            _renderMilDashboard();
            _renderMilGrid();
            _updateMilStats();
        });
    }
    window.initMilestoneTracker = initMilestoneTracker;

    function _loadMilData(cb) {
        if (window._sbClient) {
            window._sbClient.from('program_milestones').select('*').order('created_at', { ascending: true }).then(function (res) {
                if (res.data && res.data.length) {
                    _milData = res.data.map(function (r) { r._persisted = true; return r; });
                    _milNextLocalId = _milData.length + 1;
                } else if (!_milData.length) { _seedMilDemo(); }
                if (cb) cb();
            }).catch(function () { if (!_milData.length) _seedMilDemo(); if (cb) cb(); });
        } else { if (!_milData.length) _seedMilDemo(); if (cb) cb(); }
    }

    function _seedMilDemo() {
        var recs = _getMilDemoRecords();
        if (recs.length) { _milData = recs; _milNextLocalId = _milData.length + 1; }
    }

    function _getMilDemoRecords() {
        // Production: no demo data - users import or create their own
        return [];
    }

    // ============================================================
    //  VESSEL TYPE REGISTRY (per-program, editable)
    // ============================================================
    function _getVesselTypesForProgram(progName) {
        return _milVesselTypes[progName] || _milVesselTypes['Default Program'] || ['Generic'];
    }

    function milAddVesselType(progName, vtype) {
        if (!progName || !vtype) return;
        vtype = vtype.trim().toUpperCase();
        if (!_milVesselTypes[progName]) _milVesselTypes[progName] = [];
        if (_milVesselTypes[progName].indexOf(vtype) >= 0) {
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Vessel type "' + vtype + '" already exists for ' + progName + '.', 'warning');
            return;
        }
        _milVesselTypes[progName].push(vtype);
        _milVesselTypes[progName].sort();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Added "' + vtype + '" to ' + progName + '.', 'success');
        _logMilAudit('ADD_VESSEL_TYPE', '-', progName + ': ' + vtype);
        _renderMilGrid();
    }
    window.milAddVesselType = milAddVesselType;

    function milRemoveVesselType(progName, vtype) {
        if (!_milVesselTypes[progName]) return;
        _milVesselTypes[progName] = _milVesselTypes[progName].filter(function(v){ return v !== vtype; });
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Removed "' + vtype + '" from ' + progName + '.', 'info');
        _logMilAudit('REMOVE_VESSEL_TYPE', '-', progName + ': ' + vtype);
    }
    window.milRemoveVesselType = milRemoveVesselType;

    function milShowVesselTypeEditor() {
        var selectedProg = (_milSelectedPrograms && _milSelectedPrograms.length === 1) ? _milSelectedPrograms[0] : (_milPrograms[0] || 'PMS 300');
        var types = _getVesselTypesForProgram(selectedProg);
        var html = '<div style="margin-bottom:12px"><label style="color:var(--steel);font-size:0.82rem">Program: <select id="milVTEProgSelect" style="background:#fff;color:#1d1d1f;border:1px solid rgba(0,0,0,0.12);border-radius:3px;padding:4px 8px;font-size:0.8rem;margin-left:6px">';
        _milPrograms.forEach(function(p) {
            html += '<option value="' + p.replace(/"/g,'&quot;') + '"' + (p === selectedProg ? ' selected' : '') + '>' + p + '</option>';
        });
        html += '</select></label></div>';
        html += '<div id="milVTEList" style="max-height:300px;overflow-y:auto;margin-bottom:12px">';
        types.forEach(function(v) {
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;border-bottom:1px solid rgba(0,0,0,0.04)">';
            html += '<span style="color:#1d1d1f;font-size:0.85rem"><i class="fas fa-ship" style="color:var(--accent);margin-right:6px;font-size:0.7rem"></i>' + v + '</span>';
            html += '<button style="background:rgba(255,51,51,0.12);border:1px solid rgba(255,51,51,0.25);color:#ff3333;border-radius:3px;padding:2px 8px;font-size:0.7rem;cursor:pointer" data-vtype="' + v + '">&times;</button>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="display:flex;gap:6px"><input id="milVTENewInput" type="text" placeholder="New vessel type..." style="flex:1;background:#fff;color:#1d1d1f;border:1px solid rgba(0,0,0,0.12);border-radius:3px;padding:5px 8px;font-size:0.8rem"><button id="milVTEAddBtn" style="background:rgba(0,170,255,0.2);border:1px solid rgba(0,170,255,0.3);color:#00aaff;border-radius:3px;padding:5px 12px;cursor:pointer;font-size:0.8rem;font-weight:600"><i class="fas fa-plus"></i> Add</button></div>';

        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(245,245,247,0.88);z-index:9999;display:flex;align-items:center;justify-content:center';
        overlay.innerHTML = '<div style="background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:6px;padding:24px;max-width:500px;width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.12)"><div style="display:flex;justify-content:space-between;margin-bottom:16px"><h4 style="margin:0;color:#1d1d1f"><i class="fas fa-ship" style="color:#c9a84c;margin-right:8px"></i>Vessel Type Editor</h4><button class="milVTEClose" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer">&times;</button></div>' + html + '</div>';
        document.body.appendChild(overlay);

        // Wire events
        overlay.querySelector('.milVTEClose').addEventListener('click', function() { overlay.remove(); });
        overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

        var progSelect = overlay.querySelector('#milVTEProgSelect');
        progSelect.addEventListener('change', function() { overlay.remove(); milShowVesselTypeEditor(); });

        overlay.querySelectorAll('[data-vtype]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                milRemoveVesselType(progSelect.value, btn.getAttribute('data-vtype'));
                overlay.remove();
                milShowVesselTypeEditor();
            });
        });

        var addBtn = overlay.querySelector('#milVTEAddBtn');
        var addInput = overlay.querySelector('#milVTENewInput');
        addBtn.addEventListener('click', function() {
            if (addInput.value.trim()) {
                milAddVesselType(progSelect.value, addInput.value.trim());
                overlay.remove();
                milShowVesselTypeEditor();
            }
        });
        addInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && addInput.value.trim()) {
                milAddVesselType(progSelect.value, addInput.value.trim());
                overlay.remove();
                milShowVesselTypeEditor();
            }
        });
    }
    window.milShowVesselTypeEditor = milShowVesselTypeEditor;

    // ============================================================
    //  FILTERED DATA
    // ============================================================
    function _getMilFiltered() {
        var data = _milData;
        if (_milSelectedPrograms) {
            data = data.filter(function(r) { return _milSelectedPrograms.indexOf(r.program_name) >= 0; });
        }
        if (_milStatusFilter) {
            data = data.filter(function(r) { return r.delivery_status === _milStatusFilter; });
        }
        if (_milFilterText) {
            var lower = _milFilterText.toLowerCase();
            data = data.filter(function(r) {
                return MIL_COLUMNS.some(function(c) {
                    var v = r[c.key];
                    return v && String(v).toLowerCase().indexOf(lower) >= 0;
                });
            });
        }
        if (_milSortCol) {
            var dir = _milSortDir === 'desc' ? -1 : 1;
            data = data.slice().sort(function(a, b) {
                var va = a[_milSortCol] || '', vb = b[_milSortCol] || '';
                if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
                return String(va).localeCompare(String(vb)) * dir;
            });
        }
        return data;
    }

    // ============================================================
    //  DASHBOARD KPI CARDS
    // ============================================================
    function _renderMilDashboard() {
        var el = document.getElementById('milDashboardCards');
        if (!el) return;
        var data = _milData;
        if (!data.length) { el.innerHTML = ''; return; }

        var total = data.length;
        var statusCounts = {};
        MIL_STATUSES.forEach(function(s) { statusCounts[s] = 0; });
        data.forEach(function(r) { statusCounts[r.delivery_status] = (statusCounts[r.delivery_status] || 0) + 1; });

        var onTrack = statusCounts['On Track'] || 0;
        var atRisk = statusCounts['At Risk'] || 0;
        var delayed = statusCounts['Delayed'] || 0;
        var complete = statusCounts['Complete'] || 0;
        var nextMilestone = '';
        var milDateKeys = ['construction_start_date','launch_date','builders_trials_date','acceptance_trials_date','contract_delivery_date','planned_delivery_date','pm_estimated_delivery','sail_away_date','arrival_date'];
        var now = new Date();
        var nearestDate = null;
        var nearestLabel = '';
        data.forEach(function(r) {
            if (r.delivery_status === 'Complete' || r.delivery_status === 'Cancelled') return;
            milDateKeys.forEach(function(k) {
                if (!r[k]) return;
                var d = new Date(r[k]);
                if (isNaN(d.getTime()) || d <= now) return;
                if (!nearestDate || d < nearestDate) {
                    nearestDate = d;
                    nearestLabel = (r.hull_number || r.vessel_type || '?') + ' — ' + _fmtDate(r[k]);
                }
            });
        });
        nextMilestone = nearestLabel || '—';
        var activeData = data.filter(function(r){ return r.delivery_status !== 'Complete' && r.delivery_status !== 'Cancelled'; });
        var programs = {};
        data.forEach(function(r) { programs[r.program_name] = true; });
        var progCount = Object.keys(programs).length;

        var html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px">';
        html += '<div class="stat-mini" style="text-align:center"><div class="stat-mini-val" style="color:#00aaff;font-size:1.4rem">' + total + '</div><div class="stat-mini-lbl">Total Milestones</div></div>';
        html += '<div class="stat-mini" style="text-align:center"><div class="stat-mini-val" style="color:#4ecb71;font-size:1.4rem">' + onTrack + '</div><div class="stat-mini-lbl">On Track</div></div>';
        html += '<div class="stat-mini" style="text-align:center"><div class="stat-mini-val" style="color:#c9a84c;font-size:1.4rem">' + atRisk + '</div><div class="stat-mini-lbl">At Risk</div></div>';
        html += '<div class="stat-mini" style="text-align:center"><div class="stat-mini-val" style="color:#ff4444;font-size:1.4rem">' + delayed + '</div><div class="stat-mini-lbl">Delayed</div></div>';
        html += '</div>';
        html += '<div class="stat-mini" style="margin-bottom:16px;display:flex;align-items:center;gap:12px;padding:10px 14px"><div class="stat-mini-lbl" style="margin:0;white-space:nowrap"><i class="fas fa-calendar-check" style="color:#c9a84c;margin-right:6px"></i>Next Milestone</div><div style="color:#c9a84c;font-size:0.95rem;font-weight:600">' + nextMilestone + '</div></div>';

        // Status + Program row with dropdowns
        html += '<div style="display:flex;gap:10px;margin-bottom:16px">';
        // Status breakdown
        html += '<div id="milDDStatusTrigger" class="stat-mini" style="flex:1;position:relative;cursor:pointer;overflow:visible">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px"><div><span style="color:#00aaff;font-weight:700;font-size:1rem">' + total + '</span> <span style="color:var(--steel);font-size:0.82rem">across ' + MIL_STATUSES.length + ' statuses</span></div><i class="fas fa-chevron-down" style="color:var(--muted);font-size:0.7rem"></i></div>';
        html += '<div class="stat-mini-lbl" style="margin-top:4px">Delivery Status</div>';
        html += '<div id="milDDStatus" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:50;background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:3px;margin-top:4px;padding:6px 0;box-shadow:0 8px 24px rgba(0,0,0,0.1)">';
        MIL_STATUSES.forEach(function(s) {
            var cnt = statusCounts[s] || 0;
            var sc = MIL_STATUS_COLORS[s] || '#8b949e';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 12px;font-size:0.8rem" onmouseover="this.style.background=\'rgba(0,0,0,0.04)\'" onmouseout="this.style.background=\'transparent\'">';
            html += '<span style="display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:' + sc + ';display:inline-block"></span><span style="color:var(--steel)">' + s + '</span></span>';
            html += '<span style="color:' + sc + ';font-weight:700">' + cnt + '</span></div>';
        });
        html += '</div></div>';

        // Programs summary
        html += '<div id="milDDProgTrigger" class="stat-mini" style="flex:1;position:relative;cursor:pointer;overflow:visible">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px"><div><span style="color:#c9a84c;font-weight:700;font-size:1rem">' + progCount + '</span> <span style="color:var(--steel);font-size:0.82rem">active programs</span></div><i class="fas fa-chevron-down" style="color:var(--muted);font-size:0.7rem"></i></div>';
        html += '<div class="stat-mini-lbl" style="margin-top:4px">Programs</div>';
        html += '<div id="milDDProg" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:50;background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:3px;margin-top:4px;padding:6px 0;box-shadow:0 8px 24px rgba(0,0,0,0.1)">';
        Object.keys(programs).sort().forEach(function(p) {
            var cnt = data.filter(function(r){ return r.program_name === p; }).length;
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 12px;font-size:0.8rem" onmouseover="this.style.background=\'rgba(0,0,0,0.04)\'" onmouseout="this.style.background=\'transparent\'">';
            html += '<span style="color:var(--steel)">' + p + '</span>';
            html += '<span style="color:#c9a84c;font-weight:700">' + cnt + '</span></div>';
        });
        html += '</div></div>';
        html += '</div>';
        el.innerHTML = html;

        // Attach dropdown handlers via DOM
        var statusTrigger = document.getElementById('milDDStatusTrigger');
        var statusPanel = document.getElementById('milDDStatus');
        var progTrigger = document.getElementById('milDDProgTrigger');
        var progPanel = document.getElementById('milDDProg');
        function closeAll() { if (statusPanel) statusPanel.style.display = 'none'; if (progPanel) progPanel.style.display = 'none'; }
        if (statusTrigger && statusPanel) {
            statusTrigger.addEventListener('click', function(e) {
                e.stopPropagation();
                var show = statusPanel.style.display !== 'block';
                closeAll();
                if (show) statusPanel.style.display = 'block';
            });
        }
        if (progTrigger && progPanel) {
            progTrigger.addEventListener('click', function(e) {
                e.stopPropagation();
                var show = progPanel.style.display !== 'block';
                closeAll();
                if (show) progPanel.style.display = 'block';
            });
        }
        document.addEventListener('click', function() { closeAll(); });
    }

    // ============================================================
    //  STATS BAR
    // ============================================================
    function _updateMilStats() {
        var data = _getMilFiltered();
        _setTxt('milStatTotal', data.length);
        _setTxt('milStatOnTrack', data.filter(function(r){ return r.delivery_status === 'On Track'; }).length);
        _setTxt('milStatAtRisk', data.filter(function(r){ return r.delivery_status === 'At Risk'; }).length);
        _setTxt('milStatDelayed', data.filter(function(r){ return r.delivery_status === 'Delayed'; }).length);
        var avgBehind = (function(){
            var diffs = [];
            data.forEach(function(r){
                if (r.delivery_status === 'Complete' || r.delivery_status === 'Cancelled') return;
                var planned = r.planned_delivery_date ? new Date(r.planned_delivery_date) : null;
                var est = r.pm_estimated_delivery ? new Date(r.pm_estimated_delivery) : null;
                if (planned && est && !isNaN(planned.getTime()) && !isNaN(est.getTime())) {
                    var diff = Math.round((est - planned) / 86400000);
                    if (diff > 0) diffs.push(diff);
                }
            });
            if (!diffs.length) return '0d';
            var avg = Math.round(diffs.reduce(function(a,b){ return a+b; }, 0) / diffs.length);
            return avg + 'd';
        })();
        _setTxt('milStatAvgBehind', avgBehind);
    }

    // ============================================================
    //  DATA GRID (CRUD)
    // ============================================================
    function _renderMilGrid() {
        var container = document.getElementById('milGridContainer');
        if (!container) return;
        var data = _getMilFiltered();
        if (!data.length && !_milData.length) {
            container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted)"><i class="fas fa-flag-checkered" style="font-size:2rem;margin-bottom:12px;display:block;opacity:0.3"></i>No milestone data. Click <strong>Add Milestone</strong> to begin.</div>';
            return;
        }
        if (!data.length) {
            container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted)">No milestones match your current filters.</div>';
            return;
        }

        var html = '<div style="overflow-x:auto">';
        html += '<table class="mil-grid-table" style="width:100%;border-collapse:collapse;font-size:0.78rem">';
        // Header
        html += '<thead><tr style="background:rgba(0,0,0,0.02);border-bottom:2px solid var(--border)">';
        html += '<th style="padding:8px 4px;width:36px"><input type="checkbox" id="milSelectAll" style="accent-color:#00aaff"></th>';
        MIL_COLUMNS.forEach(function(c) {
            var sortIcon = '';
            if (_milSortCol === c.key) sortIcon = _milSortDir === 'asc' ? ' ▲' : ' ▼';
            html += '<th data-sort="' + c.key + '" style="padding:8px 4px;text-align:left;color:var(--steel);font-weight:600;cursor:pointer;white-space:nowrap;min-width:' + c.width + '">' + c.label + sortIcon + '</th>';
        });
        html += '<th style="padding:8px 4px;width:80px;text-align:center;color:var(--steel)">Actions</th>';
        html += '</tr></thead>';

        // Body
        html += '<tbody>';
        data.forEach(function(row) {
            var rid = row.id || row._localId;
            var isEditing = _milEditingId === rid;
            var sc = MIL_STATUS_COLORS[row.delivery_status] || '#8b949e';
            var bgRow = _milBulkSelected[rid] ? 'rgba(0,170,255,0.06)' : 'transparent';
            html += '<tr data-rid="' + rid + '" style="border-bottom:1px solid rgba(0,0,0,0.04);background:' + bgRow + '">';
            html += '<td style="padding:6px 4px;text-align:center"><input type="checkbox" class="milRowCb" data-rid="' + rid + '"' + (_milBulkSelected[rid] ? ' checked' : '') + ' style="accent-color:#00aaff"></td>';
            MIL_COLUMNS.forEach(function(c) {
                var val = row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '';
                if (isEditing) {
                    if (c.type === 'select') {
                        var opts = c.dynamic ? _getVesselTypesForProgram(row.program_name || 'PMS 300') : (c.options || []);
                        html += '<td style="padding:4px 2px"><select class="milEditField" data-key="' + c.key + '" style="background:#fff;color:#1d1d1f;border:1px solid rgba(0,170,255,0.3);border-radius:2px;padding:3px 4px;width:100%;font-size:0.78rem">';
                        opts.forEach(function(o) {
                            html += '<option value="' + o + '"' + (val === o ? ' selected' : '') + '>' + o + '</option>';
                        });
                        html += '</select></td>';
                    } else if (c.type === 'textarea') {
                        html += '<td style="padding:4px 2px"><textarea class="milEditField" data-key="' + c.key + '" rows="2" style="background:#fff;color:#1d1d1f;border:1px solid rgba(0,170,255,0.3);border-radius:2px;padding:3px 4px;width:100%;font-size:0.78rem;resize:vertical">' + val + '</textarea></td>';
                    } else {
                        html += '<td style="padding:4px 2px"><input type="' + (c.type === 'date' ? 'date' : c.type === 'number' ? 'number' : 'text') + '" class="milEditField" data-key="' + c.key + '" value="' + val + '" style="background:#fff;color:#1d1d1f;border:1px solid rgba(0,170,255,0.3);border-radius:2px;padding:3px 4px;width:100%;font-size:0.78rem"></td>';
                    }
                } else {
                    var display = val;
                    if (c.type === 'date' && val) display = _fmtDate(val);
                    if (c.key === 'delivery_status') {
                        display = '<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:' + sc + ';display:inline-block"></span>' + val + '</span>';
                    }
                    if (c.key === 'owld_date' && val) {
                        var owldD = new Date(val);
                        var now = new Date();
                        var owldColor = owldD < now ? '#ff4444' : '#c9a84c';
                        display = '<span style="color:' + owldColor + ';font-weight:600">' + _fmtDate(val) + '</span>';
                    }
                    html += '<td style="padding:6px 4px;color:var(--steel);white-space:nowrap;max-width:' + c.width + ';overflow:hidden;text-overflow:ellipsis" title="' + String(val).replace(/"/g,'&quot;') + '">' + display + '</td>';
                }
            });
            // Actions
            html += '<td style="padding:6px 4px;text-align:center;white-space:nowrap">';
            if (isEditing) {
                html += '<button class="milSaveBtn" data-rid="' + rid + '" style="background:rgba(0,204,136,0.15);border:1px solid rgba(0,204,136,0.3);color:#00cc88;border-radius:2px;padding:3px 8px;cursor:pointer;font-size:0.72rem;margin-right:2px" title="Save"><i class="fas fa-check"></i></button>';
                html += '<button class="milCancelBtn" data-rid="' + rid + '" style="background:rgba(0,0,0,0.035);border:1px solid rgba(0,0,0,0.08);color:var(--muted);border-radius:2px;padding:3px 8px;cursor:pointer;font-size:0.72rem" title="Cancel"><i class="fas fa-times"></i></button>';
            } else {
                html += '<button class="milEditBtn" data-rid="' + rid + '" style="background:rgba(0,170,255,0.1);border:1px solid rgba(0,170,255,0.2);color:#00aaff;border-radius:2px;padding:3px 8px;cursor:pointer;font-size:0.72rem;margin-right:2px" title="Edit"><i class="fas fa-pen"></i></button>';
                html += '<button class="milDeleteBtn" data-rid="' + rid + '" style="background:rgba(255,51,51,0.1);border:1px solid rgba(255,51,51,0.2);color:#ff3333;border-radius:2px;padding:3px 8px;cursor:pointer;font-size:0.72rem" title="Delete"><i class="fas fa-trash"></i></button>';
            }
            html += '</td></tr>';

            // Expanded detail row
            if (_milExpandedRow === rid) {
                html += '<tr><td colspan="' + (MIL_COLUMNS.length + 2) + '" style="padding:12px 16px;background:rgba(0,170,255,0.03);border-bottom:1px solid rgba(0,170,255,0.1)">';
                html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:0.82rem">';
                MIL_COLUMNS.forEach(function(c) {
                    var v = row[c.key] || '-';
                    if (c.type === 'date' && row[c.key]) v = _fmtDate(row[c.key]);
                    html += '<div><span style="color:var(--muted);font-size:0.72rem">' + c.label + '</span><div style="color:#1d1d1f">' + v + '</div></div>';
                });
                html += '</div>';
                if (row.acquisition_plan_id) {
                    html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,0.06);font-size:0.78rem"><i class="fas fa-link" style="color:var(--accent);margin-right:4px"></i><span style="color:var(--steel)">Linked to Acquisition Plan record: </span><span style="color:#00aaff">' + row.acquisition_plan_id + '</span></div>';
                }
                html += '</td></tr>';
            }
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;

        // Wire event listeners via DOM
        _wireGridEvents(container);
    }

    function _wireGridEvents(container) {
        // Select All
        var selectAll = container.querySelector('#milSelectAll');
        if (selectAll) {
            selectAll.addEventListener('change', function() {
                var checked = this.checked;
                _milBulkSelected = {};
                if (checked) {
                    _getMilFiltered().forEach(function(r) { _milBulkSelected[r.id || r._localId] = true; });
                }
                _renderMilGrid();
                _updateBulkBar();
            });
        }

        // Row checkboxes
        container.querySelectorAll('.milRowCb').forEach(function(cb) {
            cb.addEventListener('change', function() {
                var rid = this.getAttribute('data-rid');
                if (this.checked) _milBulkSelected[rid] = true;
                else delete _milBulkSelected[rid];
                _updateBulkBar();
            });
        });

        // Sort headers
        container.querySelectorAll('th[data-sort]').forEach(function(th) {
            th.addEventListener('click', function() {
                var key = this.getAttribute('data-sort');
                if (_milSortCol === key) _milSortDir = _milSortDir === 'asc' ? 'desc' : 'asc';
                else { _milSortCol = key; _milSortDir = 'asc'; }
                _renderMilGrid();
            });
        });

        // Edit buttons
        container.querySelectorAll('.milEditBtn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                _milEditingId = this.getAttribute('data-rid');
                _renderMilGrid();
            });
        });

        // Save buttons
        container.querySelectorAll('.milSaveBtn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var rid = this.getAttribute('data-rid');
                var row = _findRow(rid);
                if (!row) return;
                var tr = container.querySelector('tr[data-rid="' + rid + '"]');
                if (!tr) return;
                tr.querySelectorAll('.milEditField').forEach(function(field) {
                    var key = field.getAttribute('data-key');
                    row[key] = field.value;
                });
                // Auto-calc OWLD
                row.owld_date = _calcOWLD(row);
                _logMilAudit('EDIT', rid, 'Updated milestone for ' + row.hull_number);
                _milEditingId = null;
                _saveMilRow(row);
                _renderMilGrid();
                _renderMilDashboard();
                _updateMilStats();
            });
        });

        // Cancel buttons
        container.querySelectorAll('.milCancelBtn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                _milEditingId = null;
                _renderMilGrid();
            });
        });

        // Delete buttons
        container.querySelectorAll('.milDeleteBtn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var rid = this.getAttribute('data-rid');
                var row = _findRow(rid);
                if (!row) return;
                if (!confirm('Delete milestone for ' + (row.hull_number || 'this record') + '?')) return;
                _milData = _milData.filter(function(r) { return (r.id || r._localId) !== rid && String(r.id || r._localId) !== String(rid); });
                _logMilAudit('DELETE', rid, 'Deleted ' + (row.hull_number || ''));
                if (row._persisted && row.id && window._sbClient) {
                    window._sbClient.from('program_milestones').delete().eq('id', row.id);
                }
                _renderMilGrid();
                _renderMilDashboard();
                _updateMilStats();
                _rebuildMilProgramList();
            });
        });

        // Row click for expand
        container.querySelectorAll('tbody tr[data-rid]').forEach(function(tr) {
            tr.addEventListener('dblclick', function() {
                var rid = tr.getAttribute('data-rid');
                _milExpandedRow = _milExpandedRow === rid ? null : rid;
                _renderMilGrid();
            });
        });
    }

    function _findRow(rid) {
        return _milData.find(function(r) { return String(r.id || r._localId) === String(rid); });
    }

    function _updateBulkBar() {
        var bar = document.getElementById('milBulkBar');
        var cnt = Object.keys(_milBulkSelected).length;
        if (bar) {
            bar.style.display = cnt > 0 ? 'flex' : 'none';
            var countEl = document.getElementById('milBulkCount');
            if (countEl) countEl.textContent = cnt + ' selected';
        }
    }

    // ============================================================
    //  SUPABASE PERSISTENCE
    // ============================================================
    function _saveMilRow(row) {
        if (!window._sbClient) return;
        var payload = {};
        MIL_COLUMNS.forEach(function(c) { if (row[c.key] !== undefined) payload[c.key] = row[c.key]; });
        payload.program_name = row.program_name;
        payload.owld_date = row.owld_date;
        payload.org_id = row.org_id || sessionStorage.getItem('s4_org_id') || '';
        payload.user_email = row.user_email || sessionStorage.getItem('s4_user_email') || '';
        if (row.acquisition_plan_id) payload.acquisition_plan_id = row.acquisition_plan_id;

        if (row._persisted && row.id) {
            payload.updated_at = new Date().toISOString();
            window._sbClient.from('program_milestones').update(payload).eq('id', row.id);
        } else {
            window._sbClient.from('program_milestones').insert(payload).select().then(function(res) {
                if (res.data && res.data[0]) { row.id = res.data[0].id; row._persisted = true; }
            });
        }
    }

    // ============================================================
    //  ADD / IMPORT / EXPORT
    // ============================================================
    function milAddRow() {
        var prog = (_milSelectedPrograms && _milSelectedPrograms.length === 1) ? _milSelectedPrograms[0] : (_milPrograms[0] || 'PMS 300');
        var types = _getVesselTypesForProgram(prog);
        var newRow = {
            _localId: _milNextLocalId++,
            delivery_status: 'On Track',
            program_name: prog,
            vessel_type: types[0] || '',
            hull_number: '',
            contract_number: '',
            ship_builder: '',
            fy_appropriation: '',
            uic_code: '',
            contract_award_date: '',
            construction_start_date: '',
            launch_date: '',
            builders_trials_date: '',
            acceptance_trials_date: '',
            contract_delivery_date: '',
            planned_delivery_date: '',
            pm_estimated_delivery: '',
            sail_away_date: '',
            arrival_date: '',
            owld_date: '',
            notes: ''
        };
        _milData.push(newRow);
        _milEditingId = newRow._localId;
        _logMilAudit('ADD', newRow._localId, 'New milestone row');
        _rebuildMilProgramList();
        _renderMilGrid();
        _updateMilStats();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('New milestone row added — fill in details.', 'success');
    }
    window.milAddRow = milAddRow;

    function milExportCSV() {
        var data = _getMilFiltered();
        if (!data.length) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('No data to export.', 'warning'); return; }
        var headers = MIL_COLUMNS.map(function(c) { return c.label; });
        var rows = data.map(function(r) {
            return MIL_COLUMNS.map(function(c) {
                var v = r[c.key] !== undefined ? r[c.key] : '';
                return '"' + String(v).replace(/"/g, '""') + '"';
            }).join(',');
        });
        var csv = headers.join(',') + '\n' + rows.join('\n');
        var blob = new Blob([csv], { type: 'text/csv' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'program_milestones_' + new Date().toISOString().slice(0,10) + '.csv';
        a.click();
        URL.revokeObjectURL(a.href);
        _logMilAudit('EXPORT_CSV', '-', data.length + ' records');
    }
    window.milExportCSV = milExportCSV;

    function milExportXLSX() {
        if (typeof XLSX === 'undefined') {
            var s = document.createElement('script');
            s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
            s.onload = function() { _doMilXLSX(); };
            document.head.appendChild(s);
        } else { _doMilXLSX(); }
    }
    window.milExportXLSX = milExportXLSX;

    function _doMilXLSX() {
        var data = _getMilFiltered();
        if (!data.length) return;
        var ws_data = [MIL_COLUMNS.map(function(c) { return c.label; })];
        data.forEach(function(r) {
            ws_data.push(MIL_COLUMNS.map(function(c) { return r[c.key] !== undefined ? r[c.key] : ''; }));
        });
        var wb = XLSX.utils.book_new();
        var ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, 'Milestones');
        XLSX.writeFile(wb, 'program_milestones_' + new Date().toISOString().slice(0,10) + '.xlsx');
        _logMilAudit('EXPORT_XLSX', '-', data.length + ' records');
    }

    function milImportCSV() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.addEventListener('change', function() {
            if (!input.files[0]) return;
            var reader = new FileReader();
            reader.onload = function(e) {
                var lines = e.target.result.split('\n').filter(function(l) { return l.trim(); });
                if (lines.length < 2) return;
                var headers = lines[0].split(',').map(function(h) { return h.replace(/"/g,'').trim(); });
                var keyMap = {};
                MIL_COLUMNS.forEach(function(c) { keyMap[c.label.toLowerCase()] = c.key; });
                for (var i = 1; i < lines.length; i++) {
                    var vals = lines[i].match(/(".*?"|[^,]+)/g) || [];
                    var row = { _localId: _milNextLocalId++ };
                    headers.forEach(function(h, idx) {
                        var key = keyMap[h.toLowerCase()];
                        if (key && vals[idx]) row[key] = vals[idx].replace(/^"|"$/g,'');
                    });
                    if (!row.delivery_status) row.delivery_status = 'On Track';
                    if (!row.program_name) row.program_name = 'PMS 300';
                    _milData.push(row);
                }
                _logMilAudit('IMPORT_CSV', '-', (lines.length - 1) + ' records imported');
                _rebuildMilProgramList();
                _renderMilDashboard();
                _renderMilGrid();
                _updateMilStats();
                if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Imported ' + (lines.length - 1) + ' milestones.', 'success');
            };
            reader.readAsText(input.files[0]);
        });
        input.click();
    }
    window.milImportCSV = milImportCSV;

    // ============================================================
    //  GANTT CHART (Diamond Milestones)
    // ============================================================
    function milToggleGantt() {
        var grid = document.getElementById('milGridContainer');
        var gantt = document.getElementById('milGanttView');
        if (!gantt) return;
        if (gantt.style.display === 'block') { gantt.style.display = 'none'; if (grid) grid.style.display = 'block'; return; }
        if (grid) grid.style.display = 'none';
        gantt.style.display = 'block';
        _renderMilGantt();
    }
    window.milToggleGantt = milToggleGantt;

    function milToggleView(view) {
        var grid = document.getElementById('milGridContainer');
        var gantt = document.getElementById('milGanttView');
        if (view === 'gantt') {
            if (grid) grid.style.display = 'none';
            if (gantt) { gantt.style.display = 'block'; _renderMilGantt(); }
        } else {
            if (grid) grid.style.display = 'block';
            if (gantt) gantt.style.display = 'none';
        }
    }
    window.milToggleView = milToggleView;

    function _renderMilGantt() {
        var el = document.getElementById('milGanttView');
        if (!el) return;
        var data = _getMilFiltered();
        if (!data.length) {
            el.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted)"><i class="fas fa-chart-gantt" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.3"></i>No milestone data to chart.</div>';
            return;
        }

        var milestoneKeys = [
            { key:'contract_award_date', color:'#8b949e', label:'Contract Award', symbol:'◆' },
            { key:'construction_start_date', color:'#00aaff', label:'Construction Start', symbol:'◆' },
            { key:'launch_date', color:'#a855f7', label:'Launch', symbol:'◆' },
            { key:'builders_trials_date', color:'#c9a84c', label:'Builders Trials', symbol:'◆' },
            { key:'acceptance_trials_date', color:'#ff9500', label:'Acceptance Trials', symbol:'◆' },
            { key:'contract_delivery_date', color:'#ff4444', label:'Contract Delivery', symbol:'▼' },
            { key:'planned_delivery_date', color:'#4ecb71', label:'Planned Delivery', symbol:'●' },
            { key:'pm_estimated_delivery', color:'#00cc88', label:'PM Est Delivery', symbol:'●' },
            { key:'sail_away_date', color:'#00aaff', label:'Sail Away', symbol:'►' },
            { key:'arrival_date', color:'#c9a84c', label:'Arrival', symbol:'★' }
        ];

        var now = new Date();
        var allDates = [];
        data.forEach(function(r) {
            milestoneKeys.forEach(function(mk) {
                if (r[mk.key]) { var d = new Date(r[mk.key]); if (!isNaN(d.getTime())) allDates.push(d); }
            });
        });
        if (!allDates.length) {
            el.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted)">No dates found in milestone records.</div>';
            return;
        }

        var minDate = new Date(Math.min.apply(null, allDates));
        var maxDate = new Date(Math.max.apply(null, allDates));
        var yearStart = minDate.getFullYear() - 1;
        if (yearStart > now.getFullYear()) yearStart = now.getFullYear();
        var yearEnd = maxDate.getFullYear() + 2;
        if (yearEnd <= yearStart) yearEnd = yearStart + 3;
        var totalMonths = (yearEnd - yearStart) * 12;
        var MONTH_PX = 50;
        var totalWidth = totalMonths * MONTH_PX;
        var labelW = 200;

        function dateToPx(d) {
            if (!d || isNaN(d.getTime())) return -1;
            var monthsFromStart = (d.getFullYear() - yearStart) * 12 + d.getMonth() + d.getDate() / 30;
            return Math.round(monthsFromStart * MONTH_PX);
        }

        var html = '<div class="mil-gantt-wrap">';
        html += '<div style="font-size:0.88rem;font-weight:700;color:#1d1d1f;margin-bottom:8px"><i class="fas fa-chart-gantt" style="color:#a855f7;margin-right:6px"></i>Milestone Timeline <span style="font-size:0.72rem;color:var(--muted);margin-left:8px">(scroll horizontally)</span></div>';

        // Legend
        html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:0.72rem">';
        milestoneKeys.forEach(function(mk) {
            html += '<span style="display:flex;align-items:center;gap:3px"><span style="color:' + mk.color + '">' + mk.symbol + '</span><span style="color:var(--muted)">' + mk.label + '</span></span>';
        });
        html += '</div>';

        // Scrollable container
        html += '<div style="overflow-x:auto;border:1px solid rgba(0,0,0,0.06);border-radius:3px">';

        // Year/month ruler
        html += '<div style="display:flex">';
        html += '<div style="flex:0 0 ' + labelW + 'px;padding:6px 8px;font-size:0.72rem;color:var(--muted);background:#fff;border-bottom:2px solid var(--border);position:sticky;left:0;z-index:10">Vessel</div>';
        html += '<div style="width:' + totalWidth + 'px;position:relative;height:40px;background:rgba(0,0,0,0.15);border-bottom:2px solid var(--border)">';
        for (var y = yearStart; y <= yearEnd; y++) {
            var xYear = (y - yearStart) * 12 * MONTH_PX;
            var isNowYear = y === now.getFullYear();
            html += '<div style="position:absolute;left:' + xYear + 'px;top:0;height:100%;border-left:1px solid ' + (isNowYear ? 'rgba(0,170,255,0.4)' : 'rgba(0,0,0,0.1)') + '">';
            html += '<span style="position:absolute;top:2px;left:4px;font-size:0.78rem;font-weight:' + (isNowYear ? '700' : '400') + ';color:' + (isNowYear ? '#00aaff' : 'rgba(0,0,0,0.35)') + '">' + y + '</span></div>';
            for (var m = 0; m < 12; m++) {
                var xMonth = xYear + m * MONTH_PX;
                if (m > 0) html += '<div style="position:absolute;left:' + xMonth + 'px;top:24px;height:16px;border-left:1px solid rgba(0,0,0,0.04)"></div>';
            }
        }
        // Today marker
        var todayPx = dateToPx(now);
        if (todayPx >= 0) {
            html += '<div style="position:absolute;left:' + todayPx + 'px;top:0;height:100%;border-left:2px dashed rgba(0,170,255,0.6);z-index:5" title="Today: ' + _fmtDate(now.toISOString()) + '"><span style="position:absolute;top:2px;left:4px;font-size:0.62rem;color:#00aaff;white-space:nowrap">Today</span></div>';
        }
        html += '</div></div>';

        // Vessel rows
        data.forEach(function(r, idx) {
            var sc = MIL_STATUS_COLORS[r.delivery_status] || '#8b949e';
            var bgAlt = idx % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'rgba(0,0,0,0.03)';
            html += '<div style="display:flex;min-width:' + (labelW + totalWidth) + 'px;border-bottom:1px solid rgba(0,0,0,0.04);background:' + bgAlt + '">';
            // Label
            var stickyBg = idx % 2 === 0 ? '#f5f5f7' : '#eeeef0';
            html += '<div style="flex:0 0 ' + labelW + 'px;padding:10px 8px;font-size:0.8rem;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;background:' + stickyBg + ';position:sticky;left:0;z-index:10;border-right:1px solid rgba(0,0,0,0.06)">';
            html += '<strong style="color:#1d1d1f">' + (r.hull_number || '-') + '</strong>';
            html += ' <span style="font-size:0.6rem;padding:1px 4px;border-radius:2px;background:' + sc + '22;color:' + sc + '">' + (r.delivery_status || '') + '</span>';
            html += '<div style="font-size:0.65rem;color:var(--muted)">' + (r.vessel_type || '') + ' | ' + (r.ship_builder || '') + '</div>';
            html += '</div>';
            // Timeline
            html += '<div style="width:' + totalWidth + 'px;position:relative;min-height:52px">';
            // Year grid lines
            for (var y2 = yearStart; y2 <= yearEnd; y2++) {
                var xY2 = (y2 - yearStart) * 12 * MONTH_PX;
                html += '<div style="position:absolute;left:' + xY2 + 'px;top:0;bottom:0;border-left:1px solid rgba(0,0,0,0.03)"></div>';
            }
            if (todayPx >= 0) html += '<div style="position:absolute;left:' + todayPx + 'px;top:0;bottom:0;border-left:2px dashed rgba(0,170,255,0.15);z-index:2"></div>';

            // Contract → delivery span bar
            var startPx = r.contract_award_date ? dateToPx(new Date(r.contract_award_date)) : -1;
            var endPx = r.planned_delivery_date ? dateToPx(new Date(r.planned_delivery_date)) : (r.contract_delivery_date ? dateToPx(new Date(r.contract_delivery_date)) : -1);
            if (startPx < 0) startPx = 0;
            if (endPx > 0 && endPx > startPx) {
                html += '<div style="position:absolute;left:' + startPx + 'px;width:' + (endPx - startPx) + 'px;top:18px;height:8px;background:rgba(0,170,255,0.15);border:1px solid rgba(0,170,255,0.3);border-radius:3px" title="Contract → Delivery"></div>';
            }

            // Milestone diamond markers
            milestoneKeys.forEach(function(mk) {
                if (!r[mk.key]) return;
                var d = new Date(r[mk.key]);
                var px = dateToPx(d);
                if (px < 0) return;
                // Diamond shape via rotated square
                html += '<div style="position:absolute;left:' + (px - 6) + 'px;top:14px;width:12px;height:12px;background:' + mk.color + ';transform:rotate(45deg);border:1px solid rgba(0,0,0,0.15);z-index:3;cursor:pointer;border-radius:1px" title="' + mk.label + ': ' + _fmtDate(r[mk.key]) + '"></div>';
            });
            html += '</div></div>';
        });
        html += '</div></div>';
        el.innerHTML = html;
    }

    // ============================================================
    //  MULTI-PROGRAM SWITCHER
    // ============================================================
    function _rebuildMilProgramList() {
        var progs = {};
        _milData.forEach(function(r) { progs[r.program_name || 'Default Program'] = true; });
        _milPrograms = Object.keys(progs).sort();
        _renderMilProgSwitcher();
    }

    function _renderMilProgSwitcher() {
        var el = document.getElementById('milProgramSwitcher');
        if (!el) return;
        var selectedSet = _milSelectedPrograms || null;
        var html = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
        html += '<label style="color:var(--steel);font-size:0.8rem;font-weight:600;white-space:nowrap"><i class="fas fa-sitemap" style="margin-right:4px"></i>Programs:</label>';
        html += '<div class="mil-prog-dropdown" style="position:relative;display:inline-block">';
        html += '<button class="acq-prog-btn acq-prog-active" id="milProgDDBtnTrigger" style="min-width:200px;text-align:left;display:flex;justify-content:space-between;align-items:center">';
        var selLabel = !selectedSet ? 'All Programs (' + _milPrograms.length + ')' : selectedSet.length + ' of ' + _milPrograms.length + ' selected';
        html += '<span>' + selLabel + '</span> <i class="fas fa-chevron-down" style="font-size:0.65rem;margin-left:8px;opacity:0.6"></i></button>';
        html += '<div id="milProgDropdownPanel" style="display:none;position:absolute;top:100%;left:0;z-index:100;min-width:280px;max-height:300px;overflow-y:auto;background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:3px;margin-top:4px;padding:8px 0;box-shadow:0 8px 24px rgba(0,0,0,0.1)">';
        html += '<label style="display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;font-size:0.82rem;color:#86868b;border-bottom:1px solid rgba(0,0,0,0.06);margin-bottom:4px"><input type="checkbox" id="milProgAll"' + (!selectedSet ? ' checked' : '') + ' style="accent-color:#00aaff;width:15px;height:15px"> <strong style="color:#1d1d1f">All Programs</strong></label>';
        _milPrograms.forEach(function(p) {
            var checked = !selectedSet || selectedSet.indexOf(p) >= 0;
            html += '<label style="display:flex;align-items:center;gap:8px;padding:4px 12px;cursor:pointer;font-size:0.82rem;color:var(--steel)" data-prog="' + p.replace(/"/g, '&quot;') + '" onmouseover="this.style.background=\'rgba(0,170,255,0.06)\'" onmouseout="this.style.background=\'transparent\'">';
            html += '<input type="checkbox" class="milProgCb" data-prog="' + p.replace(/"/g, '&quot;') + '"' + (checked ? ' checked' : '') + ' style="accent-color:#00aaff;width:15px;height:15px"> ' + p + '</label>';
        });
        html += '<div style="border-top:1px solid rgba(0,0,0,0.06);margin-top:4px;padding:6px 12px"><div style="display:flex;gap:6px"><input id="milNewProgInput" type="text" placeholder="Add new program..." style="flex:1;background:#fff;color:#1d1d1f;border:1px solid rgba(0,0,0,0.12);border-radius:3px;padding:5px 8px;font-size:0.8rem">';
        html += '<button id="milAddProgBtn" class="acq-prog-btn" style="padding:4px 10px;font-size:0.78rem"><i class="fas fa-plus"></i></button></div></div>';
        html += '</div></div>';
        if (selectedSet && selectedSet.length < _milPrograms.length) {
            selectedSet.forEach(function(p) {
                html += '<span class="milProgTag" data-prog="' + p.replace(/"/g,'&quot;') + '" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:3px;background:rgba(0,170,255,0.12);border:1px solid rgba(0,170,255,0.25);color:#00aaff;font-size:0.75rem;white-space:nowrap">' + p + ' <span class="milProgTagX" data-prog="' + p.replace(/"/g,'&quot;') + '" style="cursor:pointer;opacity:0.7;font-size:0.85rem">&times;</span></span>';
            });
        }
        html += '</div>';
        el.innerHTML = html;

        // Wire events
        var trigger = document.getElementById('milProgDDBtnTrigger');
        var panel = document.getElementById('milProgDropdownPanel');
        if (trigger && panel) {
            trigger.addEventListener('click', function() {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                if (panel.style.display === 'block') {
                    setTimeout(function() {
                        function closeH(e) { if (!panel.contains(e.target) && !e.target.closest('.mil-prog-dropdown')) { panel.style.display = 'none'; document.removeEventListener('click', closeH); } }
                        document.addEventListener('click', closeH);
                    }, 0);
                }
            });
        }

        var allCb = document.getElementById('milProgAll');
        if (allCb) {
            allCb.addEventListener('change', function() {
                _milSelectedPrograms = this.checked ? null : [];
                _renderMilProgSwitcher(); _renderMilGrid(); _updateMilStats(); _renderMilDashboard();
            });
        }

        el.querySelectorAll('.milProgCb').forEach(function(cb) {
            cb.addEventListener('change', function() {
                var prog = this.getAttribute('data-prog');
                if (_milSelectedPrograms === null) {
                    if (this.checked) return;
                    _milSelectedPrograms = _milPrograms.filter(function(p) { return p !== prog; });
                } else {
                    if (this.checked) { if (_milSelectedPrograms.indexOf(prog) < 0) _milSelectedPrograms.push(prog); }
                    else { _milSelectedPrograms = _milSelectedPrograms.filter(function(p) { return p !== prog; }); }
                    if (_milSelectedPrograms.length >= _milPrograms.length) _milSelectedPrograms = null;
                }
                _renderMilProgSwitcher(); _renderMilGrid(); _updateMilStats(); _renderMilDashboard();
            });
        });

        el.querySelectorAll('.milProgTagX').forEach(function(x) {
            x.addEventListener('click', function() {
                var prog = this.getAttribute('data-prog');
                if (_milSelectedPrograms === null) {
                    _milSelectedPrograms = _milPrograms.filter(function(p) { return p !== prog; });
                } else {
                    _milSelectedPrograms = _milSelectedPrograms.filter(function(p) { return p !== prog; });
                }
                _renderMilProgSwitcher(); _renderMilGrid(); _updateMilStats(); _renderMilDashboard();
            });
        });

        var addBtn = document.getElementById('milAddProgBtn');
        var addInput = document.getElementById('milNewProgInput');
        if (addBtn && addInput) {
            addBtn.addEventListener('click', function() { _milAddProgram(addInput); });
            addInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') _milAddProgram(addInput); });
        }
    }

    function _milAddProgram(input) {
        if (!input || !input.value.trim()) return;
        var name = input.value.trim();
        if (_milPrograms.indexOf(name) >= 0) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Program already exists.', 'warning'); return; }
        _milPrograms.push(name); _milPrograms.sort();
        if (_milSelectedPrograms !== null) _milSelectedPrograms.push(name);
        if (!_milVesselTypes[name]) _milVesselTypes[name] = ['Generic'];
        _renderMilProgSwitcher();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Program "' + name + '" added.', 'success');
    }

    // ============================================================
    //  FILTER / SEARCH
    // ============================================================
    function milFilter(text) {
        _milFilterText = text;
        _renderMilGrid();
        _updateMilStats();
    }
    window.milFilter = milFilter;

    function milFilterByStatus(status) {
        _milStatusFilter = _milStatusFilter === status ? null : status;
        // Highlight active button
        document.querySelectorAll('.mil-status-filter-btn').forEach(function(btn) {
            var s = btn.getAttribute('data-status');
            btn.style.outline = s === _milStatusFilter ? '2px solid currentColor' : 'none';
            btn.style.outlineOffset = '1px';
        });
        _renderMilGrid();
        _updateMilStats();
    }
    window.milFilterByStatus = milFilterByStatus;

    // ============================================================
    //  BULK ACTIONS
    // ============================================================
    function milBulkSetStatus(status) {
        var ids = Object.keys(_milBulkSelected);
        if (!ids.length) return;
        ids.forEach(function(rid) {
            var row = _findRow(rid);
            if (row) { row.delivery_status = status; row.owld_date = _calcOWLD(row); _saveMilRow(row); _logMilAudit('BULK_STATUS', rid, status); }
        });
        _milBulkSelected = {};
        _renderMilGrid(); _renderMilDashboard(); _updateMilStats();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast(ids.length + ' milestones set to ' + status + '.', 'success');
    }
    window.milBulkSetStatus = milBulkSetStatus;

    function milBulkDelete() {
        var ids = Object.keys(_milBulkSelected);
        if (!ids.length) return;
        if (!confirm('Delete ' + ids.length + ' selected milestones?')) return;
        ids.forEach(function(rid) {
            var row = _findRow(rid);
            if (row && row._persisted && row.id && window._sbClient) {
                window._sbClient.from('program_milestones').delete().eq('id', row.id);
            }
            _milData = _milData.filter(function(r) { return String(r.id || r._localId) !== String(rid); });
            _logMilAudit('BULK_DELETE', rid, '');
        });
        _milBulkSelected = {};
        _rebuildMilProgramList();
        _renderMilGrid(); _renderMilDashboard(); _updateMilStats();
    }
    window.milBulkDelete = milBulkDelete;

    // ============================================================
    //  PRINT REPORT
    // ============================================================
    function milPrintReport() {
        var data = _getMilFiltered();
        if (!data.length) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('No data to print.', 'warning'); return; }
        var w = window.open('', '_blank');
        var doc = w.document;
        doc.write('<!DOCTYPE html><html><head><title>Program Milestone Report</title>');
        doc.write('<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#222;margin:24px;font-size:11px}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:9px}th{background:#f0f0f0;padding:5px 3px;text-align:left;border:1px solid #ccc;font-weight:600}td{padding:3px;border:1px solid #ddd}.delayed{color:#c00;font-weight:700}.at-risk{color:#b80}.on-track{color:#070}@media print{body{margin:12px}}</style></head><body>');
        doc.write('<h1>S4 Ledger — Program Milestone Status Report</h1>');
        doc.write('<p>Generated: ' + new Date().toLocaleString() + ' | Records: ' + data.length + '</p>');
        doc.write('<table><tr>');
        MIL_COLUMNS.forEach(function(c) { doc.write('<th>' + c.label + '</th>'); });
        doc.write('</tr>');
        data.forEach(function(r) {
            var cls = r.delivery_status === 'Delayed' ? 'delayed' : r.delivery_status === 'At Risk' ? 'at-risk' : 'on-track';
            doc.write('<tr>');
            MIL_COLUMNS.forEach(function(c) {
                var v = r[c.key] || '';
                if (c.type === 'date' && v) try { v = new Date(v).toLocaleDateString(); } catch(e) {}
                if (c.key === 'delivery_status') v = '<span class="' + cls + '">' + v + '</span>';
                doc.write('<td>' + v + '</td>');
            });
            doc.write('</tr>');
        });
        doc.write('</table>');
        doc.write('<p style="color:#999;font-size:9px;margin-top:24px">S4 Ledger — Immutable Defense Logistics | Program Milestone Report | UNCLASSIFIED</p>');
        doc.write('</body></html>');
        doc.close();
        setTimeout(function() { w.print(); }, 500);
    }
    window.milPrintReport = milPrintReport;

    // ============================================================
    //  AI AUTO-UPDATE INFRASTRUCTURE
    //  When comms mention date changes, this function can be called
    //  to automatically update milestone fields.
    // ============================================================
    function milAiUpdateMilestone(hullNumber, fieldKey, newValue, reason) {
        if (!hullNumber || !fieldKey || !newValue) return false;
        var row = _milData.find(function(r) { return r.hull_number === hullNumber; });
        if (!row) return false;
        var colDef = MIL_COLUMNS.find(function(c) { return c.key === fieldKey; });
        if (!colDef) return false;
        var oldVal = row[fieldKey];
        row[fieldKey] = newValue;
        row.owld_date = _calcOWLD(row);
        _logMilAudit('AI_UPDATE', row.id || row._localId, 'AI changed ' + colDef.label + ' from "' + (oldVal || '') + '" to "' + newValue + '" — ' + (reason || 'auto-detected'));
        _saveMilRow(row);
        _renderMilGrid(); _renderMilDashboard(); _updateMilStats();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('AI updated ' + row.hull_number + ' ' + colDef.label + '.', 'info');
        return true;
    }
    window.milAiUpdateMilestone = milAiUpdateMilestone;

    // Scan comms text for date change mentions and apply updates
    function milAiScanComms(commText, senderContext) {
        if (!commText) return [];
        var updates = [];
        // Pattern: "[hull] [field keyword] changed/moved/shifted to [date]"
        var hullPattern = /\b([A-Z]{2,6}-\d{1,4})\b/g;
        var datePattern = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g;
        var changeWords = /\b(changed|moved|shifted|delayed|updated|revised|pushed|slipped|now)\b/i;

        if (!changeWords.test(commText)) return updates;

        var hulls = commText.match(hullPattern) || [];
        var dates = commText.match(datePattern) || [];
        if (!hulls.length || !dates.length) return updates;

        // Keyword mapping to milestone fields
        var fieldKeywords = {
            'delivery': 'planned_delivery_date',
            'deliver': 'planned_delivery_date',
            'sail away': 'sail_away_date',
            'sail-away': 'sail_away_date',
            'launch': 'launch_date',
            'arrival': 'arrival_date',
            'trials': 'acceptance_trials_date',
            'acceptance': 'acceptance_trials_date',
            'builder': 'builders_trials_date',
            'construction': 'construction_start_date',
            'award': 'contract_award_date'
        };

        var detectedField = 'planned_delivery_date'; // default
        var lowerComm = commText.toLowerCase();
        Object.keys(fieldKeywords).forEach(function(kw) {
            if (lowerComm.indexOf(kw) >= 0) detectedField = fieldKeywords[kw];
        });

        hulls.forEach(function(hull) {
            if (dates.length > 0) {
                var applied = milAiUpdateMilestone(hull, detectedField, dates[0], 'From comm: ' + (senderContext || 'auto'));
                if (applied) updates.push({ hull: hull, field: detectedField, newDate: dates[0] });
            }
        });
        return updates;
    }
    window.milAiScanComms = milAiScanComms;

    // ============================================================
    //  ANCHOR TO XRPL
    // ============================================================
    function anchorMilestones() {
        if (typeof anchorToXRPL === 'function') {
            var payload = JSON.stringify(_milData.map(function(r) {
                var clean = {};
                MIL_COLUMNS.forEach(function(c) { clean[c.key] = r[c.key] || ''; });
                clean.program_name = r.program_name;
                clean.owld_date = r.owld_date;
                return clean;
            }));
            anchorToXRPL(payload, 'Program Milestones');
        } else if (typeof S4 !== 'undefined' && S4.toast) {
            S4.toast('XRPL anchor function not available.', 'warning');
        }
    }
    window.anchorMilestones = anchorMilestones;

    // ============================================================
    //  PPTX BRIEF UPLOAD — Extract text, feed to AI agent
    // ============================================================
    function milUploadPPTX() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pptx';
        input.onchange = async function(e) {
            var file = e.target.files[0];
            if (!file) return;
            if (!file.name.toLowerCase().endsWith('.pptx')) {
                if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Please select a .pptx file.', 'warning');
                return;
            }
            if (typeof JSZip === 'undefined') {
                if (typeof S4 !== 'undefined' && S4.toast) S4.toast('JSZip library not loaded. Please refresh and try again.', 'error');
                return;
            }
            try {
                if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Extracting brief content...', 'info');
                var arrayBuf = await file.arrayBuffer();
                var zip = await JSZip.loadAsync(arrayBuf);
                var slideTexts = [];
                var slideFiles = Object.keys(zip.files).filter(function(f) {
                    return /^ppt\/slides\/slide\d+\.xml$/i.test(f);
                }).sort();
                for (var i = 0; i < slideFiles.length; i++) {
                    var xml = await zip.files[slideFiles[i]].async('text');
                    var textContent = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    if (textContent.length > 10) slideTexts.push('--- Slide ' + (i + 1) + ' ---\n' + textContent);
                }
                if (!slideTexts.length) {
                    if (typeof S4 !== 'undefined' && S4.toast) S4.toast('No text content found in the PPTX file.', 'warning');
                    return;
                }
                var briefText = slideTexts.join('\n\n');
                // Show confirmation overlay
                var overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(245,245,247,0.85);z-index:10001;display:flex;align-items:center;justify-content:center';
                var modal = document.createElement('div');
                modal.style.cssText = 'background:#fff;border:1px solid rgba(168,85,247,0.3);border-radius:6px;padding:24px;max-width:700px;width:90%;max-height:80vh;display:flex;flex-direction:column';
                modal.innerHTML = '<div style="color:#a855f7;font-weight:700;font-size:1.1rem;margin-bottom:12px"><i class="fas fa-file-powerpoint" style="margin-right:8px"></i>Brief Extracted: ' + file.name + '</div>'
                    + '<div style="color:var(--steel);font-size:0.82rem;margin-bottom:12px">' + slideFiles.length + ' slides extracted (' + briefText.length + ' characters). The AI agent will scan this content for vessel names, milestone dates, and schedule updates.</div>'
                    + '<div style="flex:1;overflow:auto;background:rgba(0,0,0,0.02);border:1px solid var(--border);border-radius:3px;padding:12px;margin-bottom:16px;font-size:0.78rem;color:var(--muted);white-space:pre-wrap;max-height:300px">' + briefText.substring(0, 3000).replace(/</g, '&lt;') + (briefText.length > 3000 ? '\n\n[... truncated for preview ...]' : '') + '</div>'
                    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
                    + '<button id="milPptxCancel" style="background:var(--surface);border:1px solid var(--border);color:var(--steel);border-radius:3px;padding:8px 20px;cursor:pointer;font-family:inherit">Cancel</button>'
                    + '<button id="milPptxSend" style="background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;border:none;border-radius:3px;padding:8px 20px;cursor:pointer;font-family:inherit;font-weight:600"><i class="fas fa-robot" style="margin-right:6px"></i>Send to AI Agent</button>'
                    + '</div>';
                overlay.appendChild(modal);
                document.body.appendChild(overlay);
                overlay.addEventListener('click', function(ev) { if (ev.target === overlay) overlay.remove(); });
                modal.querySelector('#milPptxCancel').addEventListener('click', function() { overlay.remove(); });
                modal.querySelector('#milPptxSend').addEventListener('click', function() {
                    overlay.remove();
                    // Send to AI agent via the chat input
                    var prompt = 'I uploaded a program milestone briefing (PPTX). Please scan the following content and identify any vessel/hull names, milestone dates (delivery, trials, launch, sail-away, construction start), and schedule changes. Compare against current milestone data and suggest specific updates. Here is the briefing content:\n\n' + briefText.substring(0, 8000);
                    var chatInput = document.getElementById('aiInput') || document.getElementById('chatInput');
                    if (chatInput) {
                        chatInput.value = prompt;
                        var sendBtn = chatInput.parentElement.querySelector('button') || document.getElementById('aiSend');
                        if (sendBtn) sendBtn.click();
                    } else if (typeof window.handleAIResponse === 'function') {
                        window.handleAIResponse(prompt);
                    }
                    if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Brief sent to AI agent for analysis.', 'success');
                });
            } catch (err) {
                console.error('PPTX parse error:', err);
                if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Error reading PPTX: ' + err.message, 'error');
            }
        };
        input.click();
    }
    window.milUploadPPTX = milUploadPPTX;

})();
