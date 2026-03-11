// =======================================================================
//  S4 Ledger - Acquisition Planner Tool
//  Multi-Year Service Craft/Vessel Acquisition Lifecycle Tracker
//  Full CRUD, status workflow, risk scoring, audit trail, bulk actions,
//  row detail expand, dashboard cards, print/PDF, Gantt timeline
// =======================================================================

(function () {
    'use strict';

    // -- Status Workflow States --
    var ACQ_STATUSES = ['Draft','Submitted','Under Review','Approved','In Execution','Complete'];
    var ACQ_STATUS_COLORS = {
        'Draft':'#8b949e','Submitted':'#00aaff','Under Review':'#c9a84c',
        'Approved':'#4ecb71','In Execution':'#a855f7','Complete':'#00cc88'
    };

    // -- Column Definitions --
    var ACQ_COLUMNS = [
        { key: 'status',              label: 'Status',              type: 'select',   width: '130px', options: ACQ_STATUSES },
        { key: 'hull_type',           label: 'Hull Type',           type: 'text',     width: '110px', required: true },
        { key: 'hull_number',         label: 'Hull #',              type: 'text',     width: '80px',  required: true },
        { key: 'action_need',         label: 'Need',                type: 'select',   width: '120px', options: ['Replacement','Disposal/Disposition','Addition/New Build','Service Life Extension','Transfer'] },
        { key: 'requestor',           label: 'Requestor',           type: 'text',     width: '130px' },
        { key: 'date_requested',      label: 'Date Requested',      type: 'date',     width: '120px' },
        { key: 'needed_completion',    label: 'Needed By',           type: 'date',     width: '120px' },
        { key: 'lifecycle_years',      label: 'Lifecycle (Yrs)',     type: 'number',   width: '90px' },
        { key: 'justification',       label: 'Justification',       type: 'textarea', width: '220px' },
        { key: 'pom_funded',          label: 'POM Funded',          type: 'select',   width: '100px', options: ['Yes','No','Partial','Pending'] },
        { key: 'navy_region',         label: 'Navy Region',         type: 'text',     width: '110px' },
        { key: 'custodian_activity',   label: 'Custodian Activity',  type: 'text',     width: '130px' },
        { key: 'resource_sponsor',     label: 'Resource Sponsor',    type: 'text',     width: '130px' },
        { key: 'sponsor_contact',      label: 'Sponsor Contact',     type: 'text',     width: '150px' },
        { key: 'ship_builder',         label: 'Ship Builder',        type: 'text',     width: '130px' },
        { key: 'last_roh_cost_k',      label: 'Last ROH Cost',      type: 'number',   width: '120px' },
        { key: 'est_next_fy_cost_k',   label: 'Est Next FY Cost',   type: 'number',   width: '130px' },
        { key: 'total_cost_k',         label: 'Total Cost',         type: 'number',   width: '120px' },
        { key: 'craft_age_years',      label: 'Age (Yrs)',          type: 'number',   width: '80px' },
        { key: 'last_roh',             label: 'Last ROH',           type: 'date',     width: '110px' },
        { key: 'planned_roh',          label: 'Planned ROH',        type: 'date',     width: '110px' },
        { key: 'planned_mi',           label: 'Planned MI',         type: 'date',     width: '110px' },
        { key: 'material_condition',   label: 'Material Condition',  type: 'select',   width: '120px', options: ['Excellent','Good','Fair','Poor','Critical'] },
        { key: 'last_dry_dock',        label: 'Last Dry Dock',      type: 'date',     width: '110px' }
    ];

    // -- State --
    var _acqData = [];
    var _acqSortCol = null;
    var _acqSortDir = 'asc';
    var _acqFilterText = '';
    var _acqEditingId = null;
    var _acqNextLocalId = 1;
    var _acqPrograms = [];
    var _acqSelectedPrograms = null;
    var _acqBulkSelected = {};
    var _acqExpandedRow = null;
    var _acqAuditLog = [];
    var _acqStatusFilter = null;

    // -- Helpers --
    function _formatDollar(val) {
        if (val === '' || val === null || val === undefined) return '';
        var n = Number(val);
        if (isNaN(n)) return val;
        return '$' + n.toLocaleString();
    }
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

    // -- Risk Score (0-100) --
    function _calculateRiskScore(row) {
        var score = 0;
        var condScores = { Critical: 30, Poor: 22, Fair: 12, Good: 5, Excellent: 0 };
        score += condScores[row.material_condition] || 0;
        var age = Number(row.craft_age_years) || 0;
        var lifecycle = Number(row.lifecycle_years) || 30;
        if (lifecycle > 0) score += Math.min(25, Math.round((age / lifecycle) * 25));
        if (row.needed_completion) {
            var daysLeft = (new Date(row.needed_completion) - new Date()) / 86400000;
            if (daysLeft < 0) score += 25;
            else if (daysLeft < 365) score += 20;
            else if (daysLeft < 730) score += 12;
            else if (daysLeft < 1460) score += 5;
        }
        var fundScores = { No: 20, Pending: 14, Partial: 8, Yes: 0 };
        score += fundScores[row.pom_funded] || 0;
        return Math.min(100, score);
    }
    function _riskColor(score) {
        if (score >= 75) return '#ff3333';
        if (score >= 50) return '#ff9500';
        if (score >= 25) return '#c9a84c';
        return '#4ecb71';
    }

    // -- Audit Trail --
    function _logAudit(action, rowId, details) {
        _acqAuditLog.push({ timestamp: new Date().toISOString(), action: action, rowId: String(rowId), details: details || '', user: sessionStorage.getItem('s4_user_email') || 'anonymous' });
    }

    function acqShowAuditLog(rowId) {
        var logs = rowId ? _acqAuditLog.filter(function(l) { return l.rowId === String(rowId); }) : _acqAuditLog;
        if (!logs.length) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('No audit history available.', 'info'); return; }
        var html = '<div style="max-height:400px;overflow:auto;font-size:0.8rem"><table style="width:100%;border-collapse:collapse">';
        html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:var(--steel)"><th style="padding:6px;text-align:left">Time</th><th style="padding:6px;text-align:left">Action</th><th style="padding:6px;text-align:left">Details</th><th style="padding:6px;text-align:left">User</th></tr>';
        logs.slice().reverse().forEach(function(l) {
            html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.04)"><td style="padding:4px 6px;color:var(--muted);white-space:nowrap">' + new Date(l.timestamp).toLocaleString() + '</td><td style="padding:4px 6px;color:#00aaff;font-weight:600">' + l.action + '</td><td style="padding:4px 6px;color:var(--steel)">' + (l.details || '').substring(0,80) + '</td><td style="padding:4px 6px;color:var(--muted)">' + l.user + '</td></tr>';
        });
        html += '</table></div>';
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
        overlay.onclick = function(e) { if (e.target === overlay) document.body.removeChild(overlay); };
        var inner = document.createElement('div');
        inner.style.cssText = 'background:#0d1117;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:20px;max-width:800px;width:90%;max-height:80vh;overflow:auto';
        inner.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:12px"><h3 style="color:#fff;margin:0"><i class="fas fa-history" style="color:#c9a84c;margin-right:8px"></i>Audit Log' + (rowId ? ' - Row ' + rowId : '') + '</h3></div>' + html;
        overlay.appendChild(inner);
        document.body.appendChild(overlay);
    }
    window.acqShowAuditLog = acqShowAuditLog;

    // -- Initialize --
    function initAcquisitionPlanner() {
        _loadAcqData(function () {
            _rebuildProgramList();
            _renderDashboardCards();
            _renderAcqGrid();
            _updateAcqStats();
        });
    }
    window.initAcquisitionPlanner = initAcquisitionPlanner;

    // -- Data Loading (Supabase -> local) --
    function _loadAcqData(cb) {
        if (window._sbClient) {
            window._sbClient.from('acquisition_plan').select('*').order('created_at', { ascending: true }).then(function (res) {
                if (res.data && res.data.length) {
                    _acqData = res.data.map(function (r) { r._persisted = true; return r; });
                    _acqNextLocalId = _acqData.length + 1;
                } else if (!_acqData.length) { _seedDemoData(); }
                if (cb) cb();
            }).catch(function () { if (!_acqData.length) _seedDemoData(); if (cb) cb(); });
        } else { if (!_acqData.length) _seedDemoData(); if (cb) cb(); }
    }

    function _seedDemoData() {
        var recs = _getDemoRecords();
        if (recs.length) { _acqData = recs; _acqNextLocalId = _acqData.length + 1; }
    }

    function _getDemoRecords() {
        // Production: no demo data - users import or create their own
        return [];
    }

    // -- Dashboard Summary Cards --
    function _renderDashboardCards() {
        var el = document.getElementById('acqDashboardCards');
        if (!el) return;
        var data = _acqData;
        if (!data.length) { el.innerHTML = ''; return; }
        var totalVessels = data.length;
        var totalCost = data.reduce(function(s,r){ return s + (Number(r.total_cost_k) || 0); }, 0);
        var avgAge = Math.round(data.reduce(function(s,r){ return s + (Number(r.craft_age_years) || 0); }, 0) / totalVessels);
        var pomYes = data.filter(function(r){ return r.pom_funded === 'Yes'; }).length;
        var pomPct = Math.round((pomYes / totalVessels) * 100);
        var condCounts = {};
        data.forEach(function(r){ var c = r.material_condition || 'Unknown'; condCounts[c] = (condCounts[c]||0)+1; });
        var statusCounts = {};
        data.forEach(function(r){ var s = r.status || 'Draft'; statusCounts[s] = (statusCounts[s]||0)+1; });
        var avgRisk = Math.round(data.reduce(function(s,r){ return s + _calculateRiskScore(r); }, 0) / totalVessels);

        var html = '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">';
        html += '<div class="stat-mini" style="text-align:center"><div class="stat-mini-val" style="color:#00aaff;font-size:1.4rem">' + totalVessels + '</div><div class="stat-mini-lbl">Total Vessels</div></div>';
        html += '<div class="stat-mini" style="text-align:center"><div class="stat-mini-val" style="color:#c9a84c;font-size:1.4rem">' + _formatDollar(totalCost) + '</div><div class="stat-mini-lbl">Total Cost</div></div>';
        html += '<div class="stat-mini" style="text-align:center"><div class="stat-mini-val" style="color:var(--steel);font-size:1.4rem">' + avgAge + ' yrs</div><div class="stat-mini-lbl">Avg Age</div></div>';
        html += '<div class="stat-mini" style="text-align:center"><div class="stat-mini-val" style="color:#4ecb71;font-size:1.4rem">' + pomPct + '%</div><div class="stat-mini-lbl">POM Funded</div></div>';
        html += '<div class="stat-mini" style="text-align:center"><div class="stat-mini-val" style="color:' + _riskColor(avgRisk) + ';font-size:1.4rem">' + avgRisk + '</div><div class="stat-mini-lbl">Avg Risk Score</div></div>';
        html += '</div>';
        // Status + Condition row as clean compact dropdowns
        html += '<div style="display:flex;gap:10px;margin-bottom:16px">';
        // Status breakdown dropdown
        html += '<div id="acqDDStatusTrigger" class="stat-mini" style="flex:1;position:relative;cursor:pointer;overflow:visible">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px"><div><span style="color:#00aaff;font-weight:700;font-size:1rem">' + totalVessels + '</span> <span style="color:var(--steel);font-size:0.82rem">across ' + Object.keys(statusCounts).length + ' statuses</span></div><i class="fas fa-chevron-down" style="color:var(--muted);font-size:0.7rem"></i></div>';
        html += '<div class="stat-mini-lbl" style="margin-top:4px">Status Breakdown</div>';
        html += '<div id="acqDDStatus" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:50;background:#0d1117;border:1px solid rgba(255,255,255,0.15);border-radius:3px;margin-top:4px;padding:6px 0;box-shadow:0 8px 24px rgba(0,0,0,0.5)">';
        ACQ_STATUSES.forEach(function(s) {
            var cnt = statusCounts[s] || 0;
            var sc = ACQ_STATUS_COLORS[s] || '#8b949e';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 12px;font-size:0.8rem" onmouseover="this.style.background=\'rgba(255,255,255,0.04)\'" onmouseout="this.style.background=\'transparent\'">';
            html += '<span style="display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:' + sc + ';display:inline-block"></span><span style="color:var(--steel)">' + s + '</span></span>';
            html += '<span style="color:' + sc + ';font-weight:700">' + cnt + '</span></div>';
        });
        html += '</div></div>';
        // Material condition dropdown
        var condColors = {Excellent:'#4ecb71',Good:'#00aaff',Fair:'#c9a84c',Poor:'#ff9500',Critical:'#ff3333',Unknown:'#555'};
        var condOrder = ['Excellent','Good','Fair','Poor','Critical'];
        html += '<div id="acqDDCondTrigger" class="stat-mini" style="flex:1;position:relative;cursor:pointer;overflow:visible">';
        var topCond = Object.keys(condCounts).sort(function(a,b){ return condCounts[b]-condCounts[a]; })[0] || '-';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px"><div><span style="color:' + (condColors[topCond]||'#555') + ';font-weight:700;font-size:1rem">' + topCond + '</span> <span style="color:var(--muted);font-size:0.82rem">most common (' + (condCounts[topCond]||0) + ')</span></div><i class="fas fa-chevron-down" style="color:var(--muted);font-size:0.7rem"></i></div>';
        html += '<div class="stat-mini-lbl" style="margin-top:4px">Material Condition</div>';
        html += '<div id="acqDDCond" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:50;background:#0d1117;border:1px solid rgba(255,255,255,0.15);border-radius:3px;margin-top:4px;padding:6px 0;box-shadow:0 8px 24px rgba(0,0,0,0.5)">';
        condOrder.forEach(function(c) {
            var cnt = condCounts[c] || 0;
            var cc = condColors[c] || '#555';
            var pct = totalVessels > 0 ? Math.round(cnt / totalVessels * 100) : 0;
            html += '<div style="padding:5px 12px;font-size:0.8rem" onmouseover="this.style.background=\'rgba(255,255,255,0.04)\'" onmouseout="this.style.background=\'transparent\'">';
            html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px"><span style="display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:' + cc + ';display:inline-block"></span><span style="color:var(--steel)">' + c + '</span></span><span style="color:' + cc + ';font-weight:700">' + cnt + '</span></div>';
            html += '<div style="height:3px;background:rgba(255,255,255,0.06);border-radius:2px"><div style="height:100%;width:' + pct + '%;background:' + cc + ';border-radius:2px"></div></div>';
            html += '</div>';
        });
        html += '</div></div>';
        html += '</div>';
        el.innerHTML = html;
        // Attach dropdown click handlers via DOM (no inline onclick)
        var statusTrigger = document.getElementById('acqDDStatusTrigger');
        var condTrigger = document.getElementById('acqDDCondTrigger');
        var statusPanel = document.getElementById('acqDDStatus');
        var condPanel = document.getElementById('acqDDCond');
        function closeAll() { if (statusPanel) statusPanel.style.display = 'none'; if (condPanel) condPanel.style.display = 'none'; }
        if (statusTrigger && statusPanel) {
            statusTrigger.addEventListener('click', function(e) {
                e.stopPropagation();
                var show = statusPanel.style.display !== 'block';
                closeAll();
                if (show) statusPanel.style.display = 'block';
            });
            statusPanel.addEventListener('click', function(e) { e.stopPropagation(); });
        }
        if (condTrigger && condPanel) {
            condTrigger.addEventListener('click', function(e) {
                e.stopPropagation();
                var show = condPanel.style.display !== 'block';
                closeAll();
                if (show) condPanel.style.display = 'block';
            });
            condPanel.addEventListener('click', function(e) { e.stopPropagation(); });
        }
        // Store closeAll on window so the single document listener can call it
        window._acqCloseAllDD = closeAll;
        if (!window._acqDDDocListenerAttached) {
            window._acqDDDocListenerAttached = true;
            document.addEventListener('click', function() { if (window._acqCloseAllDD) window._acqCloseAllDD(); });
        }
    }

    // -- Grid Rendering --
    function _renderAcqGrid() {
        var container = document.getElementById('acqGridContainer');
        if (!container) return;
        var filtered = _getFilteredData();
        var html = '<div class="acq-table-wrap"><table class="acq-table"><thead><tr>';
        // Checkbox header for bulk
        html += '<th class="acq-th" style="width:36px"><input type="checkbox" onchange="acqToggleBulkSelectAll(this.checked)" style="accent-color:#00aaff"></th>';
        html += '<th class="acq-th acq-th-rownum">#</th>';
        // Risk score header
        html += '<th class="acq-th" style="min-width:70px;cursor:pointer" onclick="acqSort(\'_risk\')">Risk</th>';
        ACQ_COLUMNS.forEach(function (col) {
            var sortIcon = '';
            if (_acqSortCol === col.key) sortIcon = _acqSortDir === 'asc' ? ' <i class="fas fa-sort-up"></i>' : ' <i class="fas fa-sort-down"></i>';
            html += '<th class="acq-th" style="min-width:' + col.width + ';cursor:pointer" onclick="acqSort(\'' + col.key + '\')">' + col.label + sortIcon + '</th>';
        });
        html += '<th class="acq-th" style="min-width:130px">Actions</th>';
        html += '</tr></thead><tbody>';

        if (!filtered.length) {
            html += '<tr><td colspan="' + (ACQ_COLUMNS.length + 4) + '" style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-ship" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.3"></i>No records found. Add a vessel or import data to get started.</td></tr>';
        } else {
            filtered.forEach(function (row, idx) {
                var rowKey = row.id || row._localId;
                var isEditing = _acqEditingId === rowKey;
                var isExpanded = _acqExpandedRow === rowKey;
                var risk = _calculateRiskScore(row);
                var rColor = _riskColor(risk);
                var isChecked = _acqBulkSelected[rowKey] ? ' checked' : '';
                html += '<tr class="acq-row' + (isEditing ? ' acq-row-editing' : '') + '" data-id="' + rowKey + '">';
                // Checkbox
                html += '<td class="acq-td"><input type="checkbox"' + isChecked + ' onchange="acqToggleBulkSelect(\'' + rowKey + '\',this.checked)" style="accent-color:#00aaff"></td>';
                html += '<td class="acq-td acq-td-rownum">' + (idx + 1) + '</td>';
                // Risk score
                html += '<td class="acq-td"><div style="display:inline-block;padding:3px 8px;border-radius:3px;font-weight:700;font-size:0.78rem;background:' + rColor + '22;color:' + rColor + ';border:1px solid ' + rColor + '44;min-width:36px;text-align:center">' + risk + '</div></td>';
                ACQ_COLUMNS.forEach(function (col) {
                    var val = row[col.key] || '';
                    if (isEditing) {
                        html += '<td class="acq-td">' + _renderEditCell(col, val, rowKey) + '</td>';
                    } else {
                        html += '<td class="acq-td">' + _renderDisplayCell(col, val) + '</td>';
                    }
                });
                // Actions
                if (isEditing) {
                    html += '<td class="acq-td"><button class="acq-btn acq-btn-save" onclick="acqSaveRow(\'' + rowKey + '\')"><i class="fas fa-check"></i></button> <button class="acq-btn acq-btn-cancel" onclick="acqCancelEdit()"><i class="fas fa-times"></i></button></td>';
                } else {
                    html += '<td class="acq-td" style="white-space:nowrap">';
                    html += '<button class="acq-btn acq-btn-edit" onclick="acqEditRow(\'' + rowKey + '\')" title="Edit"><i class="fas fa-pen"></i></button> ';
                    html += '<button class="acq-btn acq-btn-del" onclick="acqDeleteRow(\'' + rowKey + '\')" title="Delete"><i class="fas fa-trash"></i></button> ';
                    html += '<button class="acq-btn" onclick="acqToggleRowDetail(\'' + rowKey + '\')" title="Details" style="background:rgba(168,85,247,0.15);border-color:rgba(168,85,247,0.3);color:#a855f7;padding:3px 6px;font-size:0.7rem;border-radius:3px;cursor:pointer"><i class="fas fa-expand"></i></button> ';
                    html += '<button class="acq-btn" onclick="acqShowAuditLog(\'' + rowKey + '\')" title="History" style="background:rgba(201,168,76,0.12);border-color:rgba(201,168,76,0.25);color:#c9a84c;padding:3px 6px;font-size:0.7rem;border-radius:3px;cursor:pointer"><i class="fas fa-history"></i></button>';
                    html += '</td>';
                }
                html += '</tr>';
                // Expanded detail row
                if (isExpanded && !isEditing) {
                    html += '<tr><td colspan="' + (ACQ_COLUMNS.length + 4) + '" style="padding:0;border:none">' + _renderRowDetail(row) + '</td></tr>';
                }
            });
        }
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    function _renderDisplayCell(col, val) {
        if (!val && val !== 0) return '<span class="acq-empty">-</span>';
        if (col.type === 'date' && val) {
            try { return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return val; }
        }
        if (col.type === 'number' && val) {
            // Cost columns: format as dollar
            if (col.key.indexOf('cost') >= 0) return _formatDollar(val);
            return Number(val).toLocaleString();
        }
        if (col.key === 'status') {
            var sc = ACQ_STATUS_COLORS[val] || '#8b949e';
            return '<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:0.75rem;font-weight:600;background:' + sc + '22;color:' + sc + ';border:1px solid ' + sc + '44">' + val + '</span>';
        }
        if (col.key === 'pom_funded') {
            var cls = val === 'Yes' ? 'acq-badge-green' : val === 'No' ? 'acq-badge-red' : val === 'Partial' ? 'acq-badge-yellow' : 'acq-badge-blue';
            return '<span class="acq-badge ' + cls + '">' + val + '</span>';
        }
        if (col.key === 'material_condition') {
            var mc = { Excellent: 'acq-badge-green', Good: 'acq-badge-blue', Fair: 'acq-badge-yellow', Poor: 'acq-badge-red', Critical: 'acq-badge-critical' };
            return '<span class="acq-badge ' + (mc[val] || '') + '">' + val + '</span>';
        }
        if (col.key === 'action_need') {
            var an = { 'Replacement': 'acq-badge-yellow', 'Disposal/Disposition': 'acq-badge-red', 'Addition/New Build': 'acq-badge-green', 'Service Life Extension': 'acq-badge-blue', 'Transfer': 'acq-badge-purple' };
            return '<span class="acq-badge ' + (an[val] || '') + '">' + val + '</span>';
        }
        if (col.type === 'textarea') {
            var short = val.length > 80 ? val.substring(0, 80) + '...' : val;
            return '<span class="acq-justify" title="' + String(val).replace(/"/g, '&quot;') + '">' + short + '</span>';
        }
        return val;
    }

    function _renderEditCell(col, val, rowId) {
        var id = 'acq_' + col.key + '_' + rowId;
        if (col.type === 'select') {
            var opts = '<option value="">-</option>';
            (col.options || []).forEach(function (o) { opts += '<option value="' + o + '"' + (o === val ? ' selected' : '') + '>' + o + '</option>'; });
            return '<select id="' + id + '" class="acq-input">' + opts + '</select>';
        }
        if (col.type === 'textarea') {
            return '<textarea id="' + id + '" class="acq-input acq-textarea" rows="2">' + (val || '') + '</textarea>';
        }
        var inputType = col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text';
        return '<input id="' + id + '" type="' + inputType + '" class="acq-input" value="' + (val || '') + '">';
    }

    // -- Row Detail Expand --
    function acqToggleRowDetail(id) {
        _acqExpandedRow = (_acqExpandedRow === id) ? null : id;
        _renderAcqGrid();
    }
    window.acqToggleRowDetail = acqToggleRowDetail;

    function _renderRowDetail(row) {
        var risk = _calculateRiskScore(row);
        var rColor = _riskColor(risk);
        var html = '<div style="background:rgba(0,170,255,0.03);border:1px solid rgba(0,170,255,0.12);border-radius:3px;padding:16px;margin:4px 0 8px">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
        html += '<h4 style="margin:0;color:#fff"><i class="fas fa-ship" style="color:#c9a84c;margin-right:8px"></i>' + (row.hull_number || 'Unknown') + ' - ' + (row.hull_type || '') + '</h4>';
        html += '<div style="display:inline-block;padding:4px 12px;border-radius:3px;font-weight:700;font-size:0.88rem;background:' + rColor + '22;color:' + rColor + ';border:1px solid ' + rColor + '44">Risk: ' + risk + '/100</div>';
        html += '</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;font-size:0.82rem">';
        ACQ_COLUMNS.forEach(function(col) {
            var val = row[col.key] || '-';
            if (col.type === 'number' && col.key.indexOf('cost') >= 0 && val !== '-') val = _formatDollar(val);
            else if (col.type === 'date' && val !== '-') val = _fmtDate(val);
            else if (col.type === 'number' && val !== '-') val = Number(val).toLocaleString();
            html += '<div><span style="color:var(--muted);font-size:0.72rem;display:block">' + col.label + '</span><span style="color:#fff">' + val + '</span></div>';
        });
        html += '</div>';
        // Mini Gantt for this vessel
        if (row.date_requested && row.needed_completion) {
            html += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">';
            html += '<div style="font-size:0.78rem;color:var(--steel);margin-bottom:6px"><i class="fas fa-chart-gantt" style="margin-right:6px;color:#a855f7"></i>Timeline: ' + _fmtDate(row.date_requested) + ' - ' + _fmtDate(row.needed_completion) + '</div>';
            html += '<div style="height:8px;background:rgba(78,203,113,0.2);border-radius:4px;border:1px solid rgba(78,203,113,0.4);position:relative">';
            var now = new Date();
            var start = new Date(row.date_requested);
            var end = new Date(row.needed_completion);
            var progress = Math.min(100, Math.max(0, (now - start) / (end - start) * 100));
            html += '<div style="position:absolute;left:0;top:0;bottom:0;width:' + progress + '%;background:rgba(78,203,113,0.5);border-radius:4px"></div>';
            html += '</div></div>';
        }
        html += '</div>';
        return html;
    }

    // -- Bulk Actions --
    function acqToggleBulkSelect(id, checked) {
        if (checked) _acqBulkSelected[id] = true;
        else delete _acqBulkSelected[id];
        _updateBulkBar();
    }
    window.acqToggleBulkSelect = acqToggleBulkSelect;

    function acqToggleBulkSelectAll(checked) {
        _acqBulkSelected = {};
        if (checked) {
            _getFilteredData().forEach(function(r) { _acqBulkSelected[r.id || r._localId] = true; });
        }
        _renderAcqGrid();
        _updateBulkBar();
    }
    window.acqToggleBulkSelectAll = acqToggleBulkSelectAll;

    function _updateBulkBar() {
        var bar = document.getElementById('acqBulkBar');
        if (!bar) return;
        var count = Object.keys(_acqBulkSelected).length;
        bar.style.display = count > 0 ? 'flex' : 'none';
        var lbl = document.getElementById('acqBulkCount');
        if (lbl) lbl.textContent = count + ' selected';
    }

    function acqBulkDelete() {
        var keys = Object.keys(_acqBulkSelected);
        if (!keys.length) return;
        if (!confirm('Delete ' + keys.length + ' selected records? This cannot be undone.')) return;
        keys.forEach(function(id) {
            var idx = _acqData.findIndex(function(r) { return String(r.id || r._localId) === String(id); });
            if (idx >= 0) {
                var row = _acqData[idx];
                if (row.id && window._sbClient) window._sbClient.from('acquisition_plan').delete().eq('id', row.id);
                _logAudit('DELETE', id, 'Bulk delete: ' + (row.hull_number || ''));
                _acqData.splice(idx, 1);
            }
        });
        _acqBulkSelected = {};
        _rebuildProgramList();
        _renderDashboardCards();
        _renderAcqGrid();
        _updateAcqStats();
        _updateBulkBar();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast(keys.length + ' records deleted.', 'info');
    }
    window.acqBulkDelete = acqBulkDelete;

    function acqBulkSetStatus(status) {
        var keys = Object.keys(_acqBulkSelected);
        if (!keys.length) return;
        keys.forEach(function(id) {
            var row = _acqData.find(function(r) { return String(r.id || r._localId) === String(id); });
            if (row) {
                var old = row.status || 'Draft';
                row.status = status;
                row.updated_at = new Date().toISOString();
                _logAudit('STATUS_CHANGE', id, old + ' -> ' + status + ' (' + (row.hull_number || '') + ')');
                _persistRow(row);
            }
        });
        _acqBulkSelected = {};
        _renderDashboardCards();
        _renderAcqGrid();
        _updateAcqStats();
        _updateBulkBar();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast(keys.length + ' records updated to ' + status + '.', 'success');
    }
    window.acqBulkSetStatus = acqBulkSetStatus;

    function acqBulkExport() {
        var keys = Object.keys(_acqBulkSelected);
        if (!keys.length) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('No records selected.', 'warning'); return; }
        var data = _acqData.filter(function(r) { return _acqBulkSelected[r.id || r._localId]; });
        var headers = ACQ_COLUMNS.map(function(c) { return c.label; });
        var csvRows = [headers.join(',')];
        data.forEach(function(row) {
            var vals = ACQ_COLUMNS.map(function(c) { var v = String(row[c.key] || '').replace(/"/g, '""'); return '"' + v + '"'; });
            csvRows.push(vals.join(','));
        });
        var blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = 'acquisition_selected_' + new Date().toISOString().slice(0,10) + '.csv'; a.click(); URL.revokeObjectURL(url);
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast(data.length + ' selected records exported.', 'success');
    }
    window.acqBulkExport = acqBulkExport;

    // -- Filtering --
    function _getFilteredData() {
        var data = _acqData.slice();
        // Program filter
        if (_acqSelectedPrograms !== null && _acqSelectedPrograms !== undefined) {
            var sel = _acqSelectedPrograms;
            data = data.filter(function (r) {
                var p = r.program_name || r.custodian_activity || 'Default Program';
                return sel.indexOf(p) >= 0;
            });
        }
        // Status filter
        if (_acqStatusFilter) {
            data = data.filter(function(r) { return (r.status || 'Draft') === _acqStatusFilter; });
        }
        // Text filter
        if (_acqFilterText) {
            var term = _acqFilterText.toLowerCase();
            data = data.filter(function (r) {
                return ACQ_COLUMNS.some(function (col) { return String(r[col.key] || '').toLowerCase().indexOf(term) >= 0; });
            });
        }
        // Sort
        if (_acqSortCol) {
            if (_acqSortCol === '_risk') {
                data.sort(function(a,b) {
                    var av = _calculateRiskScore(a), bv = _calculateRiskScore(b);
                    return _acqSortDir === 'asc' ? av - bv : bv - av;
                });
            } else {
                var col = ACQ_COLUMNS.find(function (c) { return c.key === _acqSortCol; });
                data.sort(function (a, b) {
                    var av = a[_acqSortCol] || '', bv = b[_acqSortCol] || '';
                    if (col && col.type === 'number') { av = Number(av) || 0; bv = Number(bv) || 0; }
                    if (col && col.type === 'date') { av = new Date(av || 0).getTime(); bv = new Date(bv || 0).getTime(); }
                    if (av < bv) return _acqSortDir === 'asc' ? -1 : 1;
                    if (av > bv) return _acqSortDir === 'asc' ? 1 : -1;
                    return 0;
                });
            }
        }
        return data;
    }

    function acqFilter(val) { _acqFilterText = val || ''; _renderAcqGrid(); }
    window.acqFilter = acqFilter;

    function acqFilterByStatus(status) {
        _acqStatusFilter = (_acqStatusFilter === status) ? null : status;
        _renderAcqGrid();
        // Update status filter buttons visual
        var btns = document.querySelectorAll('.acq-status-filter-btn');
        btns.forEach(function(b) {
            b.style.opacity = (!_acqStatusFilter || b.getAttribute('data-status') === _acqStatusFilter) ? '1' : '0.4';
        });
    }
    window.acqFilterByStatus = acqFilterByStatus;

    // -- Sorting --
    function acqSort(colKey) {
        if (_acqSortCol === colKey) { _acqSortDir = _acqSortDir === 'asc' ? 'desc' : 'asc'; }
        else { _acqSortCol = colKey; _acqSortDir = 'asc'; }
        _renderAcqGrid();
    }
    window.acqSort = acqSort;

    // -- CRUD: Add Row --
    function acqAddRow() {
        var newRow = { _localId: _acqNextLocalId++, status: 'Draft' };
        ACQ_COLUMNS.forEach(function (col) { if (!newRow[col.key]) newRow[col.key] = ''; });
        newRow.status = 'Draft';
        _acqData.unshift(newRow);
        _acqEditingId = newRow._localId;
        _logAudit('CREATE', newRow._localId, 'New row created');
        _renderAcqGrid();
        _updateAcqStats();
        var wrap = document.querySelector('.acq-table-wrap');
        if (wrap) wrap.scrollTop = 0;
    }
    window.acqAddRow = acqAddRow;

    function acqEditRow(id) { _acqEditingId = id; _renderAcqGrid(); }
    window.acqEditRow = acqEditRow;

    function acqCancelEdit() {
        var idx = _acqData.findIndex(function (r) { return String(r.id || r._localId) === String(_acqEditingId); });
        if (idx >= 0 && !_acqData[idx]._persisted && !_acqData[idx].hull_type) { _acqData.splice(idx, 1); }
        _acqEditingId = null;
        _renderAcqGrid();
        _updateAcqStats();
    }
    window.acqCancelEdit = acqCancelEdit;

    function acqSaveRow(id) {
        var row = _acqData.find(function (r) { return String(r.id || r._localId) === String(id); });
        if (!row) return;
        var changes = [];
        ACQ_COLUMNS.forEach(function (col) {
            var el = document.getElementById('acq_' + col.key + '_' + id);
            if (el) {
                var oldVal = row[col.key] || '';
                var newVal = el.value;
                if (String(oldVal) !== String(newVal)) changes.push(col.label + ': ' + oldVal + ' -> ' + newVal);
                row[col.key] = newVal;
            }
        });
        if (!row.hull_type || !row.hull_number) {
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Hull Type and Hull # are required.', 'warning');
            return;
        }
        if (!row.status) row.status = 'Draft';
        row.updated_at = new Date().toISOString();
        if (!row.created_at) row.created_at = row.updated_at;
        _logAudit('SAVE', id, changes.length ? changes.join('; ') : 'Record saved: ' + row.hull_number);
        _persistRow(row);
        _acqEditingId = null;
        _rebuildProgramList();
        _renderDashboardCards();
        _renderAcqGrid();
        _updateAcqStats();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Record saved: ' + row.hull_number, 'success');
    }
    window.acqSaveRow = acqSaveRow;

    function acqDeleteRow(id) {
        if (!confirm('Delete this vessel record? This cannot be undone.')) return;
        var idx = _acqData.findIndex(function (r) { return String(r.id || r._localId) === String(id); });
        if (idx < 0) return;
        var row = _acqData[idx];
        _logAudit('DELETE', id, 'Deleted: ' + (row.hull_number || ''));
        if (row.id && window._sbClient) {
            window._sbClient.from('acquisition_plan').delete().eq('id', row.id).then(function () {
                if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Record deleted.', 'info');
            });
        }
        _acqData.splice(idx, 1);
        _rebuildProgramList();
        _renderDashboardCards();
        _renderAcqGrid();
        _updateAcqStats();
    }
    window.acqDeleteRow = acqDeleteRow;

    // -- Persistence --
    function _persistRow(row) {
        if (!window._sbClient) { row._persisted = true; return; }
        var payload = {};
        ACQ_COLUMNS.forEach(function (col) {
            var v = row[col.key];
            if (col.type === 'number' && v !== '' && v !== null && v !== undefined) v = Number(v);
            payload[col.key] = v || null;
        });
        payload.updated_at = row.updated_at;
        payload.created_at = row.created_at;
        payload.org_id = sessionStorage.getItem('s4_org_id') || '';
        payload.user_email = sessionStorage.getItem('s4_user_email') || '';
        if (row.id) {
            window._sbClient.from('acquisition_plan').update(payload).eq('id', row.id).then(function (res) { if (res.error) console.warn('ACQ update error:', res.error); });
        } else {
            window._sbClient.from('acquisition_plan').insert([payload]).select().then(function (res) {
                if (res.data && res.data[0]) { row.id = res.data[0].id; row._persisted = true; }
                if (res.error) console.warn('ACQ insert error:', res.error);
            });
        }
    }

    // -- Stats --
    function _updateAcqStats() {
        var total = _acqData.length;
        var funded = _acqData.filter(function (r) { return r.pom_funded === 'Yes'; }).length;
        var pending = _acqData.filter(function (r) { return r.pom_funded === 'Pending' || r.pom_funded === 'Partial'; }).length;
        var critical = _acqData.filter(function (r) { return r.material_condition === 'Critical' || r.material_condition === 'Poor'; }).length;
        var totalCost = _acqData.reduce(function (sum, r) { return sum + (Number(r.total_cost_k) || 0); }, 0);
        _setTxt('acqStatTotal', total);
        _setTxt('acqStatFunded', funded);
        _setTxt('acqStatPending', pending);
        _setTxt('acqStatCritical', critical);
        _setTxt('acqStatCost', _formatDollar(totalCost));
    }

    // -- Export: CSV --
    function acqExportCSV() {
        var data = _getFilteredData();
        if (!data.length) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('No data to export.', 'warning'); return; }
        var headers = ACQ_COLUMNS.map(function (c) { return c.label; });
        var csvRows = [headers.join(',')];
        data.forEach(function (row) {
            var vals = ACQ_COLUMNS.map(function (c) { var v = String(row[c.key] || '').replace(/"/g, '""'); return '"' + v + '"'; });
            csvRows.push(vals.join(','));
        });
        var blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = 'acquisition_plan_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); URL.revokeObjectURL(url);
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('CSV exported (' + data.length + ' records).', 'success');
    }
    window.acqExportCSV = acqExportCSV;

    // -- Export: XLSX --
    function acqExportXLSX() {
        var data = _getFilteredData();
        if (!data.length) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('No data to export.', 'warning'); return; }
        var xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
        xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
        xml += '<Worksheet ss:Name="Acquisition Plan"><Table>';
        xml += '<Row>';
        ACQ_COLUMNS.forEach(function (c) { xml += '<Cell><Data ss:Type="String">' + c.label + '</Data></Cell>'; });
        xml += '</Row>';
        data.forEach(function (row) {
            xml += '<Row>';
            ACQ_COLUMNS.forEach(function (c) {
                var v = row[c.key] || '';
                var type = (c.type === 'number' && v !== '') ? 'Number' : 'String';
                xml += '<Cell><Data ss:Type="' + type + '">' + String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</Data></Cell>';
            });
            xml += '</Row>';
        });
        xml += '</Table></Worksheet></Workbook>';
        var blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = 'acquisition_plan_' + new Date().toISOString().slice(0, 10) + '.xls'; a.click(); URL.revokeObjectURL(url);
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Excel exported (' + data.length + ' records).', 'success');
    }
    window.acqExportXLSX = acqExportXLSX;

    // -- Anchor Hash --
    function anchorAcquisitionPlan() {
        if (typeof window._anchorToXRPL === 'function') {
            if (typeof window.showAnchorAnimation === 'function') window.showAnchorAnimation();
            window._anchorToXRPL('Acquisition Plan Record', 'acquisition_plan').finally(function () {
                if (typeof window.hideAnchorAnimation === 'function') window.hideAnchorAnimation();
            });
        } else if (typeof S4 !== 'undefined' && S4.toast) { S4.toast('Acquisition plan prepared for XRPL anchoring.', 'info'); }
    }
    window.anchorAcquisitionPlan = anchorAcquisitionPlan;

    // -- Import CSV --
    function acqImportCSV() {
        var input = document.createElement('input');
        input.type = 'file'; input.accept = '.csv,.tsv,.txt';
        input.onchange = function (e) {
            var file = e.target.files[0]; if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) { _parseAndImportTabular(ev.target.result, file.name); };
            reader.readAsText(file);
        };
        input.click();
    }
    window.acqImportCSV = acqImportCSV;

    // -- Import eNVCR / Database File --
    function acqImportDatabase() {
        var input = document.createElement('input');
        input.type = 'file'; input.accept = '.csv,.tsv,.json,.xml,.xls,.xlsx,.txt';
        input.onchange = function (e) {
            var file = e.target.files[0]; if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) {
                var content = ev.target.result;
                var ext = file.name.split('.').pop().toLowerCase();
                if (ext === 'json') _importJSON(content, file.name);
                else if (ext === 'xml') _importXML(content, file.name);
                else _parseAndImportTabular(content, file.name);
            };
            reader.readAsText(file);
        };
        input.click();
    }
    window.acqImportDatabase = acqImportDatabase;

    function _parseAndImportTabular(text, filename) {
        var lines = text.split('\n').filter(function (l) { return l.trim(); });
        if (lines.length < 2) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('File appears empty.', 'warning'); return; }
        var delim = ',';
        if (lines[0].indexOf('\t') >= 0) delim = '\t';
        else if (lines[0].indexOf(';') >= 0) delim = ';';
        var headers = _splitRow(lines[0], delim);
        var imported = 0;
        var colMap = {};
        ACQ_COLUMNS.forEach(function (col) {
            var idx = headers.findIndex(function (h) {
                var hn = h.toLowerCase().replace(/[_\-\s]+/g, '');
                return hn === col.label.toLowerCase().replace(/[_\-\s]+/g, '') || hn === col.key.toLowerCase().replace(/[_\-\s]+/g, '') || _fuzzyMatch(hn, col);
            });
            if (idx >= 0) colMap[col.key] = idx;
        });
        for (var i = 1; i < lines.length; i++) {
            var vals = _splitRow(lines[i], delim);
            var newRow = { _localId: _acqNextLocalId++, status: 'Draft' };
            ACQ_COLUMNS.forEach(function (col) {
                if (colMap[col.key] !== undefined && vals[colMap[col.key]]) {
                    newRow[col.key] = vals[colMap[col.key]].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
                } else if (!newRow[col.key]) { newRow[col.key] = ''; }
            });
            if (!newRow.program_name && filename) newRow.program_name = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
            if (newRow.hull_type || newRow.hull_number) { _acqData.push(newRow); imported++; }
        }
        _logAudit('IMPORT', 'batch', 'Imported ' + imported + ' records from ' + (filename || 'file'));
        _rebuildProgramList();
        _renderDashboardCards();
        _renderAcqGrid();
        _updateAcqStats();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Imported ' + imported + ' records from ' + (filename || 'file') + '.', 'success');
    }

    function _splitRow(line, delim) {
        if (delim === ',') return (line.match(/("([^"]|"")*"|[^,]*)/g) || []).map(function(v) { return v.replace(/^"|"$/g,'').replace(/""/g,'"').trim(); });
        return line.split(delim).map(function(v) { return v.replace(/^"|"$/g,'').trim(); });
    }

    function _fuzzyMatch(headerNorm, col) {
        var aliases = {
            hull_type: ['hullclass','vesseltype','craftclass','hulltype','class','type'],
            hull_number: ['hullno','hullnum','hullnumber','vesselno','designation','hull'],
            action_need: ['actionneed','acquisitionneed','need','action','requirement'],
            material_condition: ['matcond','materialcond','condition','readiness'],
            pom_funded: ['pomfunded','funded','pomstatus','fundingstatus','pom'],
            craft_age_years: ['age','ageyrs','ageyears','vesselage','craftage'],
            total_cost_k: ['totalcost','cost','estimatedcost','programcost','totalcostk'],
            ship_builder: ['builder','shipyard','contractor','shipbuilder','vendor'],
            navy_region: ['region','navyregion','homeport','aor'],
            custodian_activity: ['custodian','activity','custodianactivity','command','uic'],
            last_roh: ['lastroh','lastoverhaul','lastmaint','lastrefit'],
            planned_roh: ['plannedroh','nextroh','scheduledoverhaul'],
            lifecycle_years: ['lifecycle','servicelife','designlife','usefullife'],
            requestor: ['requestor','requester','pointofcontact','poc','submittedby'],
            status: ['status','state','workflow','phase']
        };
        var list = aliases[col.key] || [];
        return list.indexOf(headerNorm) >= 0;
    }

    function _importJSON(content, filename) {
        try {
            var parsed = JSON.parse(content);
            var records = Array.isArray(parsed) ? parsed : (parsed.records || parsed.data || parsed.vessels || parsed.items || [parsed]);
            var imported = 0;
            records.forEach(function (rec) {
                var newRow = { _localId: _acqNextLocalId++, status: 'Draft' };
                ACQ_COLUMNS.forEach(function (col) { newRow[col.key] = rec[col.key] || rec[col.label] || rec[col.label.replace(/\s/g,'_').toLowerCase()] || ''; });
                if (!newRow.program_name && filename) newRow.program_name = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
                if (newRow.hull_type || newRow.hull_number || rec.hull || rec.vessel) {
                    if (!newRow.hull_number && rec.hull) newRow.hull_number = rec.hull;
                    if (!newRow.hull_number && rec.vessel) newRow.hull_number = rec.vessel;
                    _acqData.push(newRow); imported++;
                }
            });
            _logAudit('IMPORT', 'batch', 'JSON import: ' + imported + ' records');
            _rebuildProgramList(); _renderDashboardCards(); _renderAcqGrid(); _updateAcqStats();
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Imported ' + imported + ' records from JSON.', 'success');
        } catch (e) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Error parsing JSON: ' + e.message, 'error'); }
    }

    function _importXML(content, filename) {
        try {
            var parser = new DOMParser();
            var doc = parser.parseFromString(content, 'text/xml');
            var tags = ['record','vessel','row','item','entry','craft','hull','Row'];
            var nodes = [];
            for (var t = 0; t < tags.length; t++) { nodes = doc.getElementsByTagName(tags[t]); if (nodes.length > 0) break; }
            if (!nodes.length) nodes = doc.getElementsByTagName('Row');
            var imported = 0;
            for (var i = 0; i < nodes.length; i++) {
                var newRow = { _localId: _acqNextLocalId++, status: 'Draft' };
                ACQ_COLUMNS.forEach(function (col) {
                    var el = nodes[i].getElementsByTagName(col.key)[0] || nodes[i].getElementsByTagName(col.label.replace(/\s/g,'_'))[0] || nodes[i].getElementsByTagName(col.label.replace(/\s/g,''))[0];
                    newRow[col.key] = el ? (el.textContent || '').trim() : '';
                });
                if (!newRow.program_name && filename) newRow.program_name = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
                if (newRow.hull_type || newRow.hull_number) { _acqData.push(newRow); imported++; }
            }
            _logAudit('IMPORT', 'batch', 'XML import: ' + imported + ' records');
            _rebuildProgramList(); _renderDashboardCards(); _renderAcqGrid(); _updateAcqStats();
            if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Imported ' + imported + ' records from XML.', 'success');
        } catch (e) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Error parsing XML: ' + e.message, 'error'); }
    }

    // -- Summary View --
    function _renderAcqSummary() {
        var el = document.getElementById('acqSummaryView');
        if (!el) return;
        var groups = {};
        _getFilteredData().forEach(function (r) {
            var k = r.action_need || 'Unspecified';
            if (!groups[k]) groups[k] = [];
            groups[k].push(r);
        });
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">';
        Object.keys(groups).forEach(function (k) {
            var items = groups[k];
            var totalCost = items.reduce(function (s, r) { return s + (Number(r.total_cost_k) || 0); }, 0);
            html += '<div class="acq-summary-card">';
            html += '<div class="acq-summary-head"><span class="acq-summary-type">' + k + '</span><span class="acq-summary-count">' + items.length + ' vessel' + (items.length > 1 ? 's' : '') + '</span></div>';
            html += '<div class="acq-summary-cost">Total: ' + _formatDollar(totalCost) + '</div>';
            html += '<div class="acq-summary-list">';
            items.forEach(function (r) {
                var cond = r.material_condition || '-';
                var risk = _calculateRiskScore(r);
                html += '<div class="acq-summary-item"><strong>' + (r.hull_number || '-') + '</strong> <span style="color:var(--muted)">(' + (r.hull_type || '') + ')</span> - <span style="font-size:0.72rem;color:' + _riskColor(risk) + '">Risk: ' + risk + '</span> - <span style="font-size:0.78rem">' + cond + '</span></div>';
            });
            html += '</div></div>';
        });
        html += '</div>';
        el.innerHTML = html;
    }

    // -- Gantt Chart (Scrollable Wide Layout) --
    function acqToggleGantt() {
        var grid = document.getElementById('acqGridContainer');
        var summary = document.getElementById('acqSummaryView');
        var gantt = document.getElementById('acqGanttView');
        if (!gantt) return;
        if (gantt.style.display === 'block') { gantt.style.display = 'none'; if (grid) grid.style.display = 'block'; return; }
        if (grid) grid.style.display = 'none';
        if (summary) summary.style.display = 'none';
        gantt.style.display = 'block';
        _renderGantt();
    }
    window.acqToggleGantt = acqToggleGantt;

    function _renderGantt() {
        var el = document.getElementById('acqGanttView');
        if (!el) return;
        var data = _getFilteredData();
        if (!data.length) {
            el.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted)"><i class="fas fa-chart-gantt" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.3"></i>No vessel data to chart.</div>';
            return;
        }
        var now = new Date();
        var allDates = [];
        data.forEach(function (r) {
            ['date_requested','needed_completion','planned_roh','planned_mi'].forEach(function (k) {
                if (r[k]) { var d = new Date(r[k]); if (!isNaN(d.getTime())) allDates.push(d); }
            });
        });
        if (!allDates.length) {
            el.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted)">No dates found in vessel records.</div>';
            return;
        }
        var minDate = new Date(Math.min.apply(null, allDates));
        var maxDate = new Date(Math.max.apply(null, allDates));
        var yearStart = minDate.getFullYear() - 1;
        if (yearStart > now.getFullYear()) yearStart = now.getFullYear();
        var yearEnd = maxDate.getFullYear() + 2;
        if (yearEnd <= yearStart) yearEnd = yearStart + 3;
        var totalMonths = (yearEnd - yearStart) * 12;

        // Fixed pixel width per month for scrollable layout
        var MONTH_PX = 50;
        var totalWidth = totalMonths * MONTH_PX;
        var labelW = 200;

        function dateToPx(d) {
            if (!d || isNaN(d.getTime())) return -1;
            var monthsFromStart = (d.getFullYear() - yearStart) * 12 + d.getMonth() + d.getDate() / 30;
            return Math.round(monthsFromStart * MONTH_PX);
        }

        var html = '<div class="acq-gantt-wrap">';
        html += '<div class="acq-gantt-header" style="margin-bottom:8px"><i class="fas fa-chart-gantt"></i> Acquisition Timeline <span style="font-size:0.72rem;color:var(--muted);margin-left:8px">(scroll horizontally to see full timeline)</span></div>';
        // Legend
        html += '<div class="acq-gantt-legend" style="margin-bottom:8px">';
        html += '<span><span class="acq-gantt-dot" style="background:#4ecb71"></span> Lifecycle Span</span>';
        html += '<span><span class="acq-gantt-dot" style="background:#00aaff"></span> Date Requested</span>';
        html += '<span><span class="acq-gantt-dot" style="background:#c9a84c"></span> Planned ROH</span>';
        html += '<span><span class="acq-gantt-dot" style="background:#ff4444"></span> Needed By</span>';
        html += '<span><span class="acq-gantt-dot" style="background:#a855f7"></span> Planned MI</span>';
        html += '</div>';

        // Scrollable container
        html += '<div style="overflow-x:auto;border:1px solid rgba(255,255,255,0.08);border-radius:3px">';

        // Year/month ruler
        html += '<div style="display:flex">';
        html += '<div style="flex:0 0 ' + labelW + 'px;padding:6px 8px;font-size:0.72rem;color:var(--muted);background:#0d1117;border-bottom:2px solid var(--border);position:sticky;left:0;z-index:10">Vessel</div>';
        html += '<div style="width:' + totalWidth + 'px;position:relative;height:40px;background:rgba(0,0,0,0.15);border-bottom:2px solid var(--border)">';
        for (var y = yearStart; y <= yearEnd; y++) {
            var xYear = (y - yearStart) * 12 * MONTH_PX;
            var isNowYear = y === now.getFullYear();
            html += '<div style="position:absolute;left:' + xYear + 'px;top:0;height:100%;border-left:1px solid ' + (isNowYear ? 'rgba(0,170,255,0.4)' : 'rgba(255,255,255,0.1)') + '">';
            html += '<span style="position:absolute;top:2px;left:4px;font-size:0.78rem;font-weight:' + (isNowYear ? '700' : '400') + ';color:' + (isNowYear ? '#00aaff' : 'rgba(255,255,255,0.35)') + '">' + y + '</span></div>';
            // Month ticks
            for (var m = 0; m < 12; m++) {
                var xMonth = xYear + m * MONTH_PX;
                if (m > 0) html += '<div style="position:absolute;left:' + xMonth + 'px;top:24px;height:16px;border-left:1px solid rgba(255,255,255,0.04)"></div>';
            }
        }
        // Today marker
        var todayPx = dateToPx(now);
        if (todayPx >= 0) {
            html += '<div style="position:absolute;left:' + todayPx + 'px;top:0;height:100%;border-left:2px dashed rgba(0,170,255,0.6);z-index:5" title="Today: ' + _fmtDate(now.toISOString()) + '"><span style="position:absolute;top:2px;left:4px;font-size:0.62rem;color:#00aaff;white-space:nowrap">Today</span></div>';
        }
        html += '</div></div>';

        // Vessel rows
        data.forEach(function (r, idx) {
            var condCls = { Excellent: '#4ecb71', Good: '#00aaff', Fair: '#c9a84c', Poor: '#ff9500', Critical: '#ff3333' };
            var risk = _calculateRiskScore(r);
            var bgAlt = idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)';
            html += '<div style="display:flex;min-width:' + (labelW + totalWidth) + 'px;border-bottom:1px solid rgba(255,255,255,0.04);background:' + bgAlt + '">';
            // Label column
            var stickyBg = idx % 2 === 0 ? '#0d1117' : '#111820';
            html += '<div style="flex:0 0 ' + labelW + 'px;padding:10px 8px;font-size:0.8rem;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;background:' + stickyBg + ';position:sticky;left:0;z-index:10;border-right:1px solid rgba(255,255,255,0.06)">';
            html += '<strong style="color:#fff">' + (r.hull_number || '-') + '</strong>';
            if (r.material_condition) html += ' <span style="font-size:0.6rem;padding:1px 4px;border-radius:2px;background:' + (condCls[r.material_condition]||'#555') + '22;color:' + (condCls[r.material_condition]||'#555') + '">' + r.material_condition + '</span>';
            html += '<div style="font-size:0.65rem;color:var(--muted)">' + (r.hull_type || '') + ' | Risk: <span style="color:' + _riskColor(risk) + '">' + risk + '</span></div>';
            html += '</div>';
            // Timeline column
            html += '<div style="width:' + totalWidth + 'px;position:relative;min-height:48px">';
            // Year grid lines
            for (var y2 = yearStart; y2 <= yearEnd; y2++) {
                var xY2 = (y2 - yearStart) * 12 * MONTH_PX;
                html += '<div style="position:absolute;left:' + xY2 + 'px;top:0;bottom:0;border-left:1px solid rgba(255,255,255,0.03)"></div>';
            }
            // Today line in row
            if (todayPx >= 0) html += '<div style="position:absolute;left:' + todayPx + 'px;top:0;bottom:0;border-left:2px dashed rgba(0,170,255,0.15);z-index:2"></div>';
            // Lifecycle span bar (clamp start to 0 if before chart range)
            if (r.date_requested && r.needed_completion) {
                var startPx = dateToPx(new Date(r.date_requested));
                var endPx = dateToPx(new Date(r.needed_completion));
                if (startPx < 0) startPx = 0;
                if (endPx > 0 && endPx > startPx) {
                    html += '<div style="position:absolute;left:' + startPx + 'px;width:' + (endPx - startPx) + 'px;top:12px;height:10px;background:rgba(78,203,113,0.2);border:1px solid rgba(78,203,113,0.4);border-radius:3px" title="' + _fmtDate(r.date_requested) + ' to ' + _fmtDate(r.needed_completion) + '"></div>';
                }
            }
            // Milestone markers
            var markers = [
                { key: 'date_requested', color: '#00aaff', label: 'Requested' },
                { key: 'planned_roh', color: '#c9a84c', label: 'Planned ROH' },
                { key: 'needed_completion', color: '#ff4444', label: 'Needed By' },
                { key: 'planned_mi', color: '#a855f7', label: 'Planned MI' }
            ];
            markers.forEach(function (mk) {
                if (!r[mk.key]) return;
                var d = new Date(r[mk.key]);
                var px = dateToPx(d);
                if (px < 0) return;
                html += '<div style="position:absolute;left:' + (px-5) + 'px;top:8px;width:10px;height:10px;border-radius:50%;background:' + mk.color + ';border:2px solid rgba(0,0,0,0.4);z-index:3;cursor:pointer" title="' + mk.label + ': ' + _fmtDate(r[mk.key]) + '"></div>';
                html += '<div style="position:absolute;left:' + (px-30) + 'px;top:26px;width:70px;text-align:center;font-size:0.6rem;color:' + mk.color + ';white-space:nowrap;pointer-events:none;opacity:0.85">' + _fmtDate(r[mk.key]) + '</div>';
            });
            html += '</div></div>';
        });
        html += '</div></div>';
        el.innerHTML = html;
    }

    // -- Multi-Program Switcher --
    function _rebuildProgramList() {
        var progs = {};
        _acqData.forEach(function (r) { var p = r.program_name || r.custodian_activity || 'Default Program'; progs[p] = true; });
        _acqPrograms = Object.keys(progs).sort();
        _renderProgramSwitcher();
    }

    function _renderProgramSwitcher() {
        var el = document.getElementById('acqProgramSwitcher');
        if (!el) return;
        var selectedSet = _acqSelectedPrograms || null;
        var html = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
        html += '<label style="color:var(--steel);font-size:0.8rem;font-weight:600;white-space:nowrap"><i class="fas fa-sitemap" style="margin-right:4px"></i>Programs:</label>';
        html += '<div class="acq-prog-dropdown" style="position:relative;display:inline-block">';
        html += '<button class="acq-prog-btn acq-prog-active" onclick="acqToggleProgramDropdown()" style="min-width:200px;text-align:left;display:flex;justify-content:space-between;align-items:center">';
        var selLabel = !selectedSet ? 'All Programs (' + _acqPrograms.length + ')' : selectedSet.length + ' of ' + _acqPrograms.length + ' selected';
        html += '<span>' + selLabel + '</span> <i class="fas fa-chevron-down" style="font-size:0.65rem;margin-left:8px;opacity:0.6"></i></button>';
        html += '<div id="acqProgDropdownPanel" style="display:none;position:absolute;top:100%;left:0;z-index:100;min-width:280px;max-height:300px;overflow-y:auto;background:#0d1117;border:1px solid rgba(255,255,255,0.15);border-radius:3px;margin-top:4px;padding:8px 0;box-shadow:0 8px 24px rgba(0,0,0,0.5)">';
        html += '<label style="display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;font-size:0.82rem;color:#8b949e;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:4px"><input type="checkbox" ' + (!selectedSet ? 'checked' : '') + ' onchange="acqSelectAllPrograms(this.checked)" style="accent-color:#00aaff;width:15px;height:15px"> <strong style="color:#fff">All Programs</strong></label>';
        _acqPrograms.forEach(function (p) {
            var checked = !selectedSet || selectedSet.indexOf(p) >= 0;
            var safeP = p.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            html += '<label style="display:flex;align-items:center;gap:8px;padding:4px 12px;cursor:pointer;font-size:0.82rem;color:var(--steel)" onmouseover="this.style.background=\'rgba(0,170,255,0.06)\'" onmouseout="this.style.background=\'transparent\'">';
            html += '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="acqToggleProgram(\'' + safeP + '\',this.checked)" style="accent-color:#00aaff;width:15px;height:15px"> ' + p + '</label>';
        });
        html += '<div style="border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;padding:6px 12px"><div style="display:flex;gap:6px"><input id="acqNewProgInput" type="text" placeholder="Add new program..." style="flex:1;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:5px 8px;font-size:0.8rem" onkeydown="if(event.key===\'Enter\')acqAddProgram()">';
        html += '<button class="acq-prog-btn" onclick="acqAddProgram()" style="padding:4px 10px;font-size:0.78rem"><i class="fas fa-plus"></i></button></div></div>';
        html += '</div></div>';
        if (selectedSet && selectedSet.length < _acqPrograms.length) {
            selectedSet.forEach(function (p) {
                html += '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:3px;background:rgba(0,170,255,0.12);border:1px solid rgba(0,170,255,0.25);color:#00aaff;font-size:0.75rem;white-space:nowrap">' + p + ' <span onclick="acqToggleProgram(\'' + p.replace(/'/g, "\\'") + '\',false)" style="cursor:pointer;opacity:0.7;font-size:0.85rem">&times;</span></span>';
            });
        }
        html += '</div>';
        el.innerHTML = html;
    }

    function acqToggleProgramDropdown() {
        var panel = document.getElementById('acqProgDropdownPanel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        if (panel.style.display === 'block') {
            setTimeout(function () {
                function closeHandler(e) { if (!panel.contains(e.target) && !e.target.closest('.acq-prog-dropdown')) { panel.style.display = 'none'; document.removeEventListener('click', closeHandler); } }
                document.addEventListener('click', closeHandler);
            }, 0);
        }
    }
    window.acqToggleProgramDropdown = acqToggleProgramDropdown;

    function acqSelectAllPrograms(checked) {
        _acqSelectedPrograms = checked ? null : [];
        _renderProgramSwitcher(); _renderAcqGrid(); _updateAcqStats(); _renderDashboardCards();
    }
    window.acqSelectAllPrograms = acqSelectAllPrograms;

    function acqToggleProgram(prog, checked) {
        if (_acqSelectedPrograms === null) {
            if (checked) return;
            _acqSelectedPrograms = _acqPrograms.filter(function (p) { return p !== prog; });
        } else {
            if (checked) { if (_acqSelectedPrograms.indexOf(prog) < 0) _acqSelectedPrograms.push(prog); }
            else { _acqSelectedPrograms = _acqSelectedPrograms.filter(function (p) { return p !== prog; }); }
            if (_acqSelectedPrograms.length >= _acqPrograms.length) _acqSelectedPrograms = null;
        }
        _renderProgramSwitcher(); _renderAcqGrid(); _updateAcqStats(); _renderDashboardCards();
    }
    window.acqToggleProgram = acqToggleProgram;

    function acqAddProgram() {
        var input = document.getElementById('acqNewProgInput');
        if (!input || !input.value.trim()) return;
        var name = input.value.trim();
        if (_acqPrograms.indexOf(name) >= 0) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Program already exists.', 'warning'); return; }
        _acqPrograms.push(name); _acqPrograms.sort();
        if (_acqSelectedPrograms !== null) _acqSelectedPrograms.push(name);
        _renderProgramSwitcher();
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast('Program "' + name + '" added.', 'success');
    }
    window.acqAddProgram = acqAddProgram;

    // -- Print / PDF Report --
    function acqPrintReport() {
        var data = _getFilteredData();
        if (!data.length) { if (typeof S4 !== 'undefined' && S4.toast) S4.toast('No data to print.', 'warning'); return; }
        var totalCost = data.reduce(function(s,r){ return s + (Number(r.total_cost_k) || 0); }, 0);
        var w = window.open('', '_blank');
        var doc = w.document;
        doc.write('<!DOCTYPE html><html><head><title>Acquisition Plan Report</title>');
        doc.write('<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#222;margin:24px;font-size:11px}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}h2{font-size:14px;color:#555;margin-top:20px}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:10px}th{background:#f0f0f0;padding:6px 4px;text-align:left;border:1px solid #ccc;font-weight:600}td{padding:4px;border:1px solid #ddd}.risk-high{color:#c00;font-weight:700}.risk-med{color:#b80}.risk-low{color:#070}.stat{display:inline-block;margin:0 16px 8px 0;padding:6px 12px;border:1px solid #ccc;border-radius:4px;font-size:12px}@media print{body{margin:12px}}</style></head><body>');
        doc.write('<h1>S4 Ledger - Acquisition Plan Status Report</h1>');
        doc.write('<p>Generated: ' + new Date().toLocaleString() + ' | Records: ' + data.length + ' | Total Cost: ' + _formatDollar(totalCost) + '</p>');
        // Stats
        var funded = data.filter(function(r){ return r.pom_funded === 'Yes'; }).length;
        var critical = data.filter(function(r){ return r.material_condition === 'Critical' || r.material_condition === 'Poor'; }).length;
        doc.write('<div><span class="stat">Total: ' + data.length + '</span><span class="stat">POM Funded: ' + funded + '</span><span class="stat">Poor/Critical: ' + critical + '</span><span class="stat">Total Cost: ' + _formatDollar(totalCost) + '</span></div>');
        // Table
        doc.write('<h2>Vessel Register</h2><table><tr>');
        doc.write('<th>Risk</th>');
        ACQ_COLUMNS.forEach(function(c) { doc.write('<th>' + c.label + '</th>'); });
        doc.write('</tr>');
        data.forEach(function(r) {
            var risk = _calculateRiskScore(r);
            var rc = risk >= 75 ? 'risk-high' : risk >= 50 ? 'risk-med' : 'risk-low';
            doc.write('<tr><td class="' + rc + '">' + risk + '</td>');
            ACQ_COLUMNS.forEach(function(c) {
                var v = r[c.key] || '';
                if (c.type === 'number' && c.key.indexOf('cost') >= 0 && v) v = _formatDollar(v);
                else if (c.type === 'date' && v) try { v = new Date(v).toLocaleDateString(); } catch(e) {}
                else if (c.type === 'textarea' && v.length > 60) v = v.substring(0,60) + '...';
                doc.write('<td>' + v + '</td>');
            });
            doc.write('</tr>');
        });
        doc.write('</table>');
        doc.write('<p style="color:#999;font-size:9px;margin-top:24px">S4 Ledger - Immutable Defense Logistics on the XRP Ledger | Acquisition Planner Report | UNCLASSIFIED</p>');
        doc.write('</body></html>');
        doc.close();
        setTimeout(function() { w.print(); }, 500);
    }
    window.acqPrintReport = acqPrintReport;

    // -- View Toggle --
    function acqToggleView(view) {
        var grid = document.getElementById('acqGridContainer');
        var summary = document.getElementById('acqSummaryView');
        var gantt = document.getElementById('acqGanttView');
        if (!grid || !summary) return;
        if (view === 'summary') {
            grid.style.display = 'none'; if (gantt) gantt.style.display = 'none'; summary.style.display = 'block';
            _renderAcqSummary();
        } else if (view === 'gantt') {
            grid.style.display = 'none'; summary.style.display = 'none'; if (gantt) gantt.style.display = 'block';
            _renderGantt();
        } else {
            grid.style.display = 'block'; summary.style.display = 'none'; if (gantt) gantt.style.display = 'none';
        }
    }
    window.acqToggleView = acqToggleView;

})();
