// =======================================================================
//  S4 Ledger — Program Brief Engine (Phase 3)
//  Slide-based brief generator with templates, editing, permissions,
//  Supabase persistence, PPTX import, printable export, and Anchor to Ledger.
//  Brief Types: Program Status, Milestone Review, POM, PB, ILSMT, ILSMP, IPR
// =======================================================================

(function () {
    'use strict';

    // ================================================================
    //  CONSTANTS
    // ================================================================
    var BRIEF_TYPES = {
        STATUS:    { label: 'Program Status Brief', icon: 'fa-chart-bar', color: '#00aaff' },
        MILESTONE: { label: 'Milestone Review', icon: 'fa-flag-checkered', color: '#00aaff' },
        POM:       { label: 'POM Brief', icon: 'fa-file-invoice-dollar', color: '#4ecb71' },
        PB:        { label: "President's Budget Brief", icon: 'fa-landmark', color: '#c9a84c' },
        ILSMT:     { label: 'ILSMT Brief', icon: 'fa-users-cog', color: '#00cc88' },
        ILSMP:     { label: 'ILSMP Brief', icon: 'fa-clipboard-list', color: '#3b82f6' },
        IPR:       { label: 'IPR Brief', icon: 'fa-tasks', color: '#f97316' }
    };

    var DEFAULT_MASTER = {
        fontFamily: 'Inter, -apple-system, Segoe UI, sans-serif',
        titleSize: 28,
        bodySize: 16,
        headerBg: '#0a1628',
        headerColor: '#ffffff',
        bodyBg: '#0d1117',
        bodyColor: '#c9d1d9',
        accentColor: '#00aaff',
        footerText: 'S4 Ledger — UNCLASSIFIED',
        slideWidth: 960,
        slideHeight: 540
    };

    var FONT_OPTIONS = ['Inter','Arial','Helvetica','Georgia','Times New Roman','Courier New','Verdana','Trebuchet MS','Tahoma'];
    var FONT_SIZES = [10,12,14,16,18,20,24,28,32,36,42,48,60,72];

    var DEFAULT_PROGRAMS = [
        'PMS 300 \u2014 DDG 51 Class',
        'PMS 325 \u2014 LCS',
        'PMS 377 \u2014 Mine Countermeasures',
        'PMS 400 \u2014 VIRGINIA Class',
        'PMS 501 \u2014 Columbia Class',
        'Strategic Programs'
    ];

    var DEFAULT_VESSELS = {
        'PMS 300 \u2014 DDG 51 Class': ['DDG 125 Jack H. Lucas', 'DDG 126 Sam Nunn', 'DDG 127 Patrick Gallagher', 'DDG 128 Ted Stevens'],
        'PMS 325 \u2014 LCS': ['LCS 31 Cleveland', 'LCS 32 Santa Barbara', 'LCS 33 Williamsport'],
        'PMS 377 \u2014 Mine Countermeasures': ['MCM 14 Chief', 'MCM Avenger Class'],
        'PMS 400 \u2014 VIRGINIA Class': ['SSN 800 Arkansas', 'SSN 801 Utah', 'SSN 802 Oklahoma'],
        'PMS 501 \u2014 Columbia Class': ['SSBN 826 District of Columbia', 'SSBN 827 Wisconsin'],
        'Strategic Programs': ['Fleet-wide', 'Shore-based Systems']
    };

    // ================================================================
    //  STATE
    // ================================================================
    var _briefs = [];           // all loaded briefs for this user/org
    var _activeBrief = null;    // currently open brief object
    var _activeSlideIdx = 0;    // which slide is selected
    var _selectedElement = null; // currently selected element on canvas
    var _clipboard = null;      // copied element
    var _undoStack = [];
    var _redoStack = [];
    var _isDirty = false;
    var _currentView = 'list';  // 'list' | 'editor'
    var _programs = [];
    var _vessels = {};
    var _selectedProgram = '';
    var _selectedVessel = '';
    var _showComments = false;

    // ================================================================
    //  INIT
    // ================================================================
    function initBriefEngine() {
        _loadProgramsAndVessels();
        _loadBriefs(function () {
            _renderBriefList();
        });
    }
    window.initBriefEngine = initBriefEngine;

    // ================================================================
    //  DATA LOADING
    // ================================================================
    function _loadBriefs(cb) {
        if (window._sbClient) {
            window._sbClient.from('program_briefs').select('*').order('updated_at', { ascending: false }).then(function (res) {
                if (res.data && res.data.length) {
                    _briefs = res.data;
                } else {
                    _briefs = [];
                }
                if (cb) cb();
            }).catch(function () { _briefs = []; if (cb) cb(); });
        } else {
            _briefs = [];
            if (cb) cb();
        }
    }

    function _saveBrief(brief, cb) {
        if (!window._sbClient) { if (cb) cb(); return; }
        var userEmail = brief.user_email || sessionStorage.getItem('s4_user_email') || '';
        // Track edit history
        if (!brief.edit_history) brief.edit_history = [];
        brief.edit_history.push({ user: userEmail, action: 'saved', timestamp: new Date().toISOString() });
        if (brief.edit_history.length > 200) brief.edit_history = brief.edit_history.slice(-200);

        var payload = {
            title: brief.title,
            brief_type: brief.brief_type,
            program_name: brief.program_name || '',
            vessel_name: brief.vessel_name || '',
            slides_json: JSON.stringify(brief.slides),
            slide_master: JSON.stringify(brief.master || DEFAULT_MASTER),
            access_level: brief.access_level || 'private',
            editors: brief.editors || [],
            viewers: brief.viewers || [],
            version: brief.version || 1,
            anchor_hash: brief.anchor_hash || '',
            anchor_tx: brief.anchor_tx || '',
            org_id: brief.org_id || sessionStorage.getItem('s4_org_id') || '',
            user_email: userEmail,
            updated_at: new Date().toISOString()
        };
        if (brief.id) {
            window._sbClient.from('program_briefs').update(payload).eq('id', brief.id).then(function () {
                _notifyProgramUsers(brief, userEmail);
                if (cb) cb();
            });
        } else {
            window._sbClient.from('program_briefs').insert(payload).select().then(function (res) {
                if (res.data && res.data[0]) { brief.id = res.data[0].id; }
                if (cb) cb();
            });
        }
    }

    function _deleteBrief(briefId, cb) {
        if (!window._sbClient) { if (cb) cb(); return; }
        window._sbClient.from('program_briefs').delete().eq('id', briefId).then(function () { if (cb) cb(); });
    }

    // ================================================================
    //  TEMPLATE LIBRARY
    // ================================================================
    function _getTemplates() {
        return [
            _tplProgramStatus(),
            _tplMilestoneReview(),
            _tplPOM(),
            _tplPB(),
            _tplILSMT(),
            _tplILSMP(),
            _tplIPR()
        ];
    }

    function _makeSlide(title, elements) {
        return { id: _uid(), title: title, elements: elements || [], notes: '' };
    }

    function _makeText(x, y, w, h, text, opts) {
        opts = opts || {};
        return {
            id: _uid(), type: 'text', x: x, y: y, w: w, h: h,
            text: text,
            fontSize: opts.fontSize || 16,
            fontFamily: opts.fontFamily || '',
            color: opts.color || '',
            bold: opts.bold || false,
            italic: opts.italic || false,
            underline: opts.underline || false,
            align: opts.align || 'left',
            bg: opts.bg || ''
        };
    }

    function _makeShape(x, y, w, h, opts) {
        opts = opts || {};
        return {
            id: _uid(), type: 'shape', x: x, y: y, w: w, h: h,
            shape: opts.shape || 'rect',
            fill: opts.fill || 'rgba(0,170,255,0.15)',
            stroke: opts.stroke || 'rgba(0,170,255,0.3)',
            strokeWidth: opts.strokeWidth || 1,
            radius: opts.radius || 0
        };
    }

    function _makeImage(x, y, w, h, src) {
        return { id: _uid(), type: 'image', x: x, y: y, w: w, h: h, src: src || '' };
    }

    // ── Program Status Brief ──
    function _tplProgramStatus() {
        return {
            brief_type: 'STATUS',
            title: 'Program Status Brief',
            master: Object.assign({}, DEFAULT_MASTER),
            slides: [
                _makeSlide('Title Slide', [
                    _makeText(40, 40, 880, 60, 'Program Status Brief', { fontSize: 36, bold: true, color: '#ffffff', align: 'center' }),
                    _makeText(40, 120, 880, 30, '{{program_name}}', { fontSize: 20, color: '#00aaff', align: 'center' }),
                    _makeText(40, 170, 880, 24, '{{date}}', { fontSize: 16, color: '#8b949e', align: 'center' }),
                    _makeText(40, 440, 880, 24, 'UNCLASSIFIED', { fontSize: 14, color: '#c9a84c', align: 'center', bold: true })
                ]),
                _makeSlide('Executive Summary', [
                    _makeText(40, 40, 880, 40, 'Executive Summary', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00aaff', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ai_executive_summary}}', { fontSize: 16, color: '#c9d1d9' })
                ]),
                _makeSlide('Milestone Status', [
                    _makeText(40, 40, 880, 40, 'Milestone Status Overview', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00aaff', stroke: 'transparent' }),
                    _makeText(40, 110, 420, 160, '{{milestone_summary}}', { fontSize: 15, color: '#c9d1d9' }),
                    _makeText(480, 110, 440, 160, '{{schedule_variance}}', { fontSize: 15, color: '#c9d1d9' }),
                    _makeText(40, 290, 880, 200, '{{milestone_table}}', { fontSize: 14, color: '#c9d1d9' })
                ]),
                _makeSlide('Risk Assessment', [
                    _makeText(40, 40, 880, 40, 'Risk Assessment', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#ff4444', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ai_risk_assessment}}', { fontSize: 16, color: '#c9d1d9' })
                ]),
                _makeSlide('Recommendations', [
                    _makeText(40, 40, 880, 40, 'Recommendations & Next Steps', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#4ecb71', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ai_recommendations}}', { fontSize: 16, color: '#c9d1d9' })
                ])
            ]
        };
    }

    // ── Milestone Review Brief ──
    function _tplMilestoneReview() {
        return {
            brief_type: 'MILESTONE',
            title: 'Milestone Review Brief',
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#00aaff' }),
            slides: [
                _makeSlide('Title Slide', [
                    _makeText(40, 40, 880, 60, 'Milestone Review', { fontSize: 36, bold: true, color: '#ffffff', align: 'center' }),
                    _makeText(40, 120, 880, 30, '{{program_name}}', { fontSize: 20, color: '#00aaff', align: 'center' }),
                    _makeText(40, 170, 880, 24, '{{date}}', { fontSize: 16, color: '#8b949e', align: 'center' })
                ]),
                _makeSlide('Delivery Timeline', [
                    _makeText(40, 40, 880, 40, 'Delivery Timeline', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00aaff', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{milestone_gantt}}', { fontSize: 14, color: '#c9d1d9' })
                ]),
                _makeSlide('Status by Vessel', [
                    _makeText(40, 40, 880, 40, 'Status by Vessel', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00aaff', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{vessel_status_table}}', { fontSize: 14, color: '#c9d1d9' })
                ]),
                _makeSlide('Schedule Variance', [
                    _makeText(40, 40, 880, 40, 'Schedule Variance Analysis', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#ff4444', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{variance_analysis}}', { fontSize: 16, color: '#c9d1d9' })
                ])
            ]
        };
    }

    // ── POM Brief ──
    function _tplPOM() {
        return {
            brief_type: 'POM',
            title: 'POM Brief',
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#4ecb71' }),
            slides: [
                _makeSlide('Title Slide', [
                    _makeText(40, 40, 880, 60, 'Program Objective Memorandum (POM)', { fontSize: 32, bold: true, color: '#ffffff', align: 'center' }),
                    _makeText(40, 120, 880, 30, 'FY{{fiscal_year}} — FY{{fiscal_year_end}}', { fontSize: 20, color: '#4ecb71', align: 'center' }),
                    _makeText(40, 170, 880, 24, '{{program_name}}', { fontSize: 16, color: '#8b949e', align: 'center' })
                ]),
                _makeSlide('Resource Allocation', [
                    _makeText(40, 40, 880, 40, 'Resource Allocation Plan', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#4ecb71', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 180, '{{pom_resource_table}}', { fontSize: 14, color: '#c9d1d9' }),
                    _makeText(40, 310, 880, 180, '{{pom_narrative}}', { fontSize: 16, color: '#c9d1d9' })
                ]),
                _makeSlide('FYDP Alignment', [
                    _makeText(40, 40, 880, 40, 'FYDP Alignment & Priorities', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#4ecb71', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{fydp_priorities}}', { fontSize: 16, color: '#c9d1d9' })
                ]),
                _makeSlide('Risk & Trades', [
                    _makeText(40, 40, 880, 40, 'Risk Assessment & Trade Space', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#ff4444', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{pom_risks}}', { fontSize: 16, color: '#c9d1d9' })
                ])
            ]
        };
    }

    // ── President's Budget Brief ──
    function _tplPB() {
        return {
            brief_type: 'PB',
            title: "President's Budget Brief",
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#c9a84c' }),
            slides: [
                _makeSlide('Title Slide', [
                    _makeText(40, 40, 880, 60, "President's Budget (PB) Overview", { fontSize: 32, bold: true, color: '#ffffff', align: 'center' }),
                    _makeText(40, 120, 880, 30, 'FY{{fiscal_year}}', { fontSize: 20, color: '#c9a84c', align: 'center' }),
                    _makeText(40, 170, 880, 24, '{{program_name}}', { fontSize: 16, color: '#8b949e', align: 'center' })
                ]),
                _makeSlide('Budget Summary', [
                    _makeText(40, 40, 880, 40, 'Budget Summary', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#c9a84c', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{pb_budget_table}}', { fontSize: 14, color: '#c9d1d9' })
                ]),
                _makeSlide('Congressional Justification', [
                    _makeText(40, 40, 880, 40, 'Congressional Justification', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#c9a84c', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{pb_justification}}', { fontSize: 16, color: '#c9d1d9' })
                ]),
                _makeSlide('Program Changes', [
                    _makeText(40, 40, 880, 40, 'Changes from POM to PB', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#c9a84c', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{pb_changes}}', { fontSize: 16, color: '#c9d1d9' })
                ])
            ]
        };
    }

    // ── ILSMT Brief ──
    function _tplILSMT() {
        return {
            brief_type: 'ILSMT',
            title: 'ILSMT Brief',
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#00cc88' }),
            slides: [
                _makeSlide('Title Slide', [
                    _makeText(40, 40, 880, 60, 'Integrated Logistics Support Management Team', { fontSize: 30, bold: true, color: '#ffffff', align: 'center' }),
                    _makeText(40, 120, 880, 30, '{{program_name}}', { fontSize: 20, color: '#00cc88', align: 'center' }),
                    _makeText(40, 170, 880, 24, '{{date}}', { fontSize: 16, color: '#8b949e', align: 'center' })
                ]),
                _makeSlide('Agenda', [
                    _makeText(40, 40, 880, 40, 'Meeting Agenda', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00cc88', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '1. Opening Remarks & Roll Call\n2. Action Items Review\n3. ILS Element Status Updates\n4. Deliverable Tracking\n5. Risk & Issue Discussion\n6. Upcoming Milestones\n7. Closing & Next Meeting', { fontSize: 18, color: '#c9d1d9' })
                ]),
                _makeSlide('ILS Element Status', [
                    _makeText(40, 40, 880, 40, 'ILS Element Status', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00cc88', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ils_element_status}}', { fontSize: 14, color: '#c9d1d9' })
                ]),
                _makeSlide('Deliverables', [
                    _makeText(40, 40, 880, 40, 'Deliverable Tracking', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00cc88', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ilsmt_deliverables}}', { fontSize: 14, color: '#c9d1d9' })
                ]),
                _makeSlide('Action Items', [
                    _makeText(40, 40, 880, 40, 'Action Items', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#f97316', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ilsmt_actions}}', { fontSize: 14, color: '#c9d1d9' })
                ])
            ]
        };
    }

    // ── ILSMP Brief ──
    function _tplILSMP() {
        return {
            brief_type: 'ILSMP',
            title: 'ILSMP Brief',
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#3b82f6' }),
            slides: [
                _makeSlide('Title Slide', [
                    _makeText(40, 40, 880, 60, 'Integrated Logistics Support Management Plan', { fontSize: 28, bold: true, color: '#ffffff', align: 'center' }),
                    _makeText(40, 120, 880, 30, '{{program_name}}', { fontSize: 20, color: '#3b82f6', align: 'center' }),
                    _makeText(40, 170, 880, 24, '{{date}}', { fontSize: 16, color: '#8b949e', align: 'center' })
                ]),
                _makeSlide('ILS Requirements', [
                    _makeText(40, 40, 880, 40, 'ILS Requirements Summary', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#3b82f6', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ilsmp_requirements}}', { fontSize: 14, color: '#c9d1d9' })
                ]),
                _makeSlide('Supportability Strategy', [
                    _makeText(40, 40, 880, 40, 'Supportability Strategy', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#3b82f6', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ilsmp_strategy}}', { fontSize: 16, color: '#c9d1d9' })
                ]),
                _makeSlide('12 ILS Elements', [
                    _makeText(40, 40, 880, 40, '12 ILS Elements Assessment', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#3b82f6', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ils_12_elements}}', { fontSize: 14, color: '#c9d1d9' })
                ])
            ]
        };
    }

    // ── IPR Brief ──
    function _tplIPR() {
        return {
            brief_type: 'IPR',
            title: 'IPR Brief',
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#f97316' }),
            slides: [
                _makeSlide('Title Slide', [
                    _makeText(40, 40, 880, 60, 'Interim Progress Review (IPR)', { fontSize: 32, bold: true, color: '#ffffff', align: 'center' }),
                    _makeText(40, 120, 880, 30, '{{program_name}}', { fontSize: 20, color: '#f97316', align: 'center' }),
                    _makeText(40, 170, 880, 24, '{{date}}', { fontSize: 16, color: '#8b949e', align: 'center' })
                ]),
                _makeSlide('Program Overview', [
                    _makeText(40, 40, 880, 40, 'Program Overview & Status', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#f97316', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ipr_overview}}', { fontSize: 16, color: '#c9d1d9' })
                ]),
                _makeSlide('Shipbuilder Status', [
                    _makeText(40, 40, 880, 40, 'Shipbuilder / Vendor Status', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#f97316', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ipr_vendor_status}}', { fontSize: 16, color: '#c9d1d9' })
                ]),
                _makeSlide('ILS Team Update', [
                    _makeText(40, 40, 880, 40, 'ILS Team Update', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00cc88', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ipr_ils_update}}', { fontSize: 16, color: '#c9d1d9' })
                ]),
                _makeSlide('Program Office Summary', [
                    _makeText(40, 40, 880, 40, 'Program Office Summary', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00aaff', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ipr_pm_summary}}', { fontSize: 16, color: '#c9d1d9' })
                ])
            ]
        };
    }

    // ================================================================
    //  BRIEF LIST VIEW
    // ================================================================
    function _renderBriefList() {
        _currentView = 'list';
        var el = document.getElementById('briefContainer');
        if (!el) return;

        var html = '';
        // Header toolbar
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        html += '<span style="color:var(--steel);font-size:0.85rem">' + _briefs.length + ' brief' + (_briefs.length !== 1 ? 's' : '') + '</span>';
        html += '</div>';
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
        html += '<button class="ai-quick-btn" onclick="briefNewFromTemplate()" style="background:rgba(0,170,255,0.15);border-color:rgba(0,170,255,0.3);color:#00aaff"><i class="fas fa-plus"></i> New Brief</button>';
        html += '<button class="ai-quick-btn" onclick="briefImportPPTX()" style="background:rgba(168,85,247,0.12);border-color:rgba(168,85,247,0.25);color:#a855f7"><i class="fas fa-file-powerpoint"></i> Import PPTX</button>';
        html += '</div></div>';

        // ── Program & Vessel selectors ──
        html += '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center;padding:10px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px">';
        html += '<div style="display:flex;align-items:center;gap:6px">';
        html += '<label style="color:var(--muted);font-size:0.78rem;white-space:nowrap"><i class="fas fa-project-diagram" style="color:#00aaff;margin-right:4px"></i>Program</label>';
        html += '<select id="briefProgramSelect" onchange="briefSelectProgram(this.value)" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:5px 10px;font-size:0.8rem;min-width:200px">';
        html += '<option value="">All Programs</option>';
        _programs.forEach(function (p) {
            html += '<option value="' + _esc(p) + '"' + (p === _selectedProgram ? ' selected' : '') + '>' + _esc(p) + '</option>';
        });
        html += '</select>';
        html += '<button class="ai-quick-btn" onclick="briefAddProgram()" title="Add Custom Program" style="min-width:28px;padding:4px 6px"><i class="fas fa-plus"></i></button>';
        html += '</div>';
        if (_selectedProgram) {
            var vessels = _vessels[_selectedProgram] || [];
            html += '<div style="display:flex;align-items:center;gap:6px">';
            html += '<label style="color:var(--muted);font-size:0.78rem;white-space:nowrap"><i class="fas fa-ship" style="color:#00cc88;margin-right:4px"></i>Vessel / Craft</label>';
            html += '<select id="briefVesselSelect" onchange="briefSelectVessel(this.value)" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:5px 10px;font-size:0.8rem;min-width:200px">';
            html += '<option value="">All Vessels</option>';
            vessels.forEach(function (v) {
                html += '<option value="' + _esc(v) + '"' + (v === _selectedVessel ? ' selected' : '') + '>' + _esc(v) + '</option>';
            });
            html += '</select>';
            html += '<button class="ai-quick-btn" onclick="briefAddVessel()" title="Add Custom Vessel" style="min-width:28px;padding:4px 6px"><i class="fas fa-plus"></i></button>';
            html += '</div>';
        }
        html += '</div>';

        // Filter briefs by selected program/vessel
        var filteredBriefs = _briefs;
        if (_selectedProgram) {
            filteredBriefs = filteredBriefs.filter(function (b) { return b.program_name === _selectedProgram; });
        }
        if (_selectedVessel) {
            filteredBriefs = filteredBriefs.filter(function (b) { return b.vessel_name === _selectedVessel; });
        }

        if (!filteredBriefs.length) {
            html += '<div style="text-align:center;padding:60px 20px;color:var(--muted)">';
            html += '<i class="fas fa-briefcase" style="font-size:3rem;margin-bottom:16px;opacity:0.3"></i>';
            html += '<p style="font-size:1.1rem;margin-bottom:8px">' + (_briefs.length ? 'No briefs match this filter' : 'No briefs yet') + '</p>';
            html += '<p style="font-size:0.85rem">Click "New Brief" to create from a template, or import an existing PPTX.</p>';
            html += '</div>';
        } else {
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">';
            filteredBriefs.forEach(function (b) {
                var idx = _briefs.indexOf(b);
                var bt = BRIEF_TYPES[b.brief_type] || BRIEF_TYPES.STATUS;
                var slides = [];
                try { slides = typeof b.slides_json === 'string' ? JSON.parse(b.slides_json) : (b.slides_json || []); } catch (e) { slides = []; }
                var updStr = b.updated_at ? new Date(b.updated_at).toLocaleDateString() : '';
                html += '<div class="stat-mini" style="cursor:pointer;padding:16px;transition:border-color 0.2s" onclick="briefOpen(' + idx + ')" onmouseover="this.style.borderColor=\'' + bt.color + '\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.08)\'">';
                html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
                html += '<i class="fas ' + bt.icon + '" style="color:' + bt.color + '"></i>';
                html += '<span style="color:#fff;font-weight:600;font-size:0.9rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(b.title) + '</span>';
                html += '</div>';
                html += '<div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--muted)">';
                html += '<span>' + bt.label + '</span>';
                html += '<span>' + slides.length + ' slide' + (slides.length !== 1 ? 's' : '') + '</span>';
                html += '</div>';
                if (b.program_name || b.vessel_name) {
                    html += '<div style="font-size:0.7rem;color:var(--muted);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">';
                    if (b.program_name) html += '<i class="fas fa-project-diagram" style="margin-right:3px"></i>' + _esc(b.program_name);
                    if (b.vessel_name) html += ' &bull; <i class="fas fa-ship" style="margin-right:3px"></i>' + _esc(b.vessel_name);
                    html += '</div>';
                }
                html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:0.72rem;color:var(--muted)">';
                html += '<span>' + updStr + '</span>';
                html += '<span style="padding:2px 6px;border-radius:3px;background:rgba(255,255,255,0.05)">' + (b.access_level || 'private') + '</span>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        el.innerHTML = html;
    }

    // ================================================================
    //  NEW BRIEF (Template Chooser)
    // ================================================================
    function briefNewFromTemplate() {
        var templates = _getTemplates();
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;max-height:400px;overflow-y:auto;padding:4px">';
        templates.forEach(function (t, i) {
            var bt = BRIEF_TYPES[t.brief_type] || BRIEF_TYPES.STATUS;
            html += '<div class="stat-mini" style="cursor:pointer;padding:16px;text-align:center;transition:border-color 0.2s" onclick="briefCreateFromTemplate(' + i + ')" onmouseover="this.style.borderColor=\'' + bt.color + '\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.08)\'">';
            html += '<i class="fas ' + bt.icon + '" style="font-size:1.5rem;color:' + bt.color + ';margin-bottom:8px;display:block"></i>';
            html += '<div style="color:#fff;font-weight:600;font-size:0.88rem">' + _esc(t.title) + '</div>';
            html += '<div style="color:var(--muted);font-size:0.72rem;margin-top:4px">' + t.slides.length + ' slides</div>';
            html += '</div>';
        });
        html += '</div>';

        _showModal('Choose a Brief Template', html);
    }
    window.briefNewFromTemplate = briefNewFromTemplate;

    function briefCreateFromTemplate(idx) {
        var templates = _getTemplates();
        var tpl = templates[idx];
        if (!tpl) return;
        _closeModal();

        var brief = {
            title: tpl.title + ' — ' + new Date().toLocaleDateString(),
            brief_type: tpl.brief_type,
            program_name: _selectedProgram || '',
            vessel_name: _selectedVessel || '',
            slides: JSON.parse(JSON.stringify(tpl.slides)),
            master: JSON.parse(JSON.stringify(tpl.master)),
            access_level: 'private',
            editors: [],
            viewers: [],
            version: 1,
            comments: {},
            edit_history: [{ user: sessionStorage.getItem('s4_user_email') || 'unknown', action: 'created', timestamp: new Date().toISOString() }]
        };

        // Auto-populate template variables from platform data
        _populateTemplateVars(brief);

        _activeBrief = brief;
        _activeSlideIdx = 0;
        _isDirty = true;
        _undoStack = [];
        _redoStack = [];
        _briefs.unshift(brief);
        _saveBrief(brief, function () {
            _renderEditor();
        });
    }
    window.briefCreateFromTemplate = briefCreateFromTemplate;

    // ================================================================
    //  TEMPLATE VARIABLE AUTO-POPULATION
    // ================================================================
    function _populateTemplateVars(brief) {
        var now = new Date();
        var dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        var fy = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
        var progName = brief.program_name || _getDefaultProgram();

        var vars = {
            '{{date}}': dateStr,
            '{{program_name}}': progName,
            '{{fiscal_year}}': '' + fy,
            '{{fiscal_year_end}}': '' + (fy + 5)
        };

        // Pull milestone data if available
        var milData = window._milData || [];
        if (milData.length) {
            var active = milData.filter(function (r) { return r.delivery_status !== 'Complete' && r.delivery_status !== 'Cancelled'; });
            var onTrack = milData.filter(function (r) { return r.delivery_status === 'On Track'; }).length;
            var atRisk = milData.filter(function (r) { return r.delivery_status === 'At Risk'; }).length;
            var delayed = milData.filter(function (r) { return r.delivery_status === 'Delayed'; }).length;
            var complete = milData.filter(function (r) { return r.delivery_status === 'Complete'; }).length;

            vars['{{milestone_summary}}'] = 'Total Milestones: ' + milData.length + '\nOn Track: ' + onTrack + '\nAt Risk: ' + atRisk + '\nDelayed: ' + delayed + '\nComplete: ' + complete;

            // Build variance info
            var variances = [];
            active.forEach(function (r) {
                var planned = r.planned_delivery_date ? new Date(r.planned_delivery_date) : null;
                var est = r.pm_estimated_delivery ? new Date(r.pm_estimated_delivery) : null;
                if (planned && est && !isNaN(planned.getTime()) && !isNaN(est.getTime())) {
                    var diff = Math.round((est - planned) / 86400000);
                    if (diff !== 0) variances.push((r.hull_number || r.vessel_type) + ': ' + (diff > 0 ? '+' : '') + diff + ' days');
                }
            });
            vars['{{schedule_variance}}'] = variances.length ? 'Schedule Variance:\n' + variances.join('\n') : 'All active milestones on schedule.';

            // Milestone table
            var tableLines = ['Hull | Status | Planned | PM Est.', '---|---|---|---'];
            milData.slice(0, 12).forEach(function (r) {
                tableLines.push((r.hull_number || '—') + ' | ' + r.delivery_status + ' | ' + (r.planned_delivery_date || '—') + ' | ' + (r.pm_estimated_delivery || '—'));
            });
            vars['{{milestone_table}}'] = tableLines.join('\n');
            vars['{{vessel_status_table}}'] = tableLines.join('\n');
        }

        // Replace all {{vars}} in slide elements
        brief.slides.forEach(function (slide) {
            slide.elements.forEach(function (el) {
                if (el.type === 'text' && el.text) {
                    Object.keys(vars).forEach(function (key) {
                        el.text = el.text.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), vars[key]);
                    });
                }
            });
        });
    }

    function _getDefaultProgram() {
        var milData = window._milData || [];
        if (milData.length) {
            var progs = {};
            milData.forEach(function (r) { progs[r.program_name] = (progs[r.program_name] || 0) + 1; });
            var best = ''; var bestCnt = 0;
            Object.keys(progs).forEach(function (p) { if (progs[p] > bestCnt) { best = p; bestCnt = progs[p]; } });
            return best || 'PMS 300';
        }
        return 'PMS 300';
    }

    // ================================================================
    //  BRIEF OPEN / CLOSE
    // ================================================================
    function briefOpen(idx) {
        var b = _briefs[idx];
        if (!b) return;
        _activeBrief = b;
        try { _activeBrief.slides = typeof b.slides_json === 'string' ? JSON.parse(b.slides_json) : (b.slides_json || []); } catch (e) { _activeBrief.slides = []; }
        try { _activeBrief.master = typeof b.slide_master === 'string' ? JSON.parse(b.slide_master) : (b.slide_master || Object.assign({}, DEFAULT_MASTER)); } catch (e) { _activeBrief.master = Object.assign({}, DEFAULT_MASTER); }
        if (!_activeBrief.comments) _activeBrief.comments = {};
        if (!_activeBrief.edit_history) _activeBrief.edit_history = [];
        _activeSlideIdx = 0;
        _selectedElement = null;
        _undoStack = [];
        _redoStack = [];
        _isDirty = false;
        _showComments = false;
        _renderEditor();
    }
    window.briefOpen = briefOpen;

    function briefClose() {
        if (_isDirty) {
            _saveBrief(_activeBrief, function () {
                _activeBrief = null;
                _currentView = 'list';
                _loadBriefs(function () { _renderBriefList(); });
            });
        } else {
            _activeBrief = null;
            _currentView = 'list';
            _loadBriefs(function () { _renderBriefList(); });
        }
    }
    window.briefClose = briefClose;

    // ================================================================
    //  EDITOR — MAIN RENDERER
    // ================================================================
    function _renderEditor() {
        _currentView = 'editor';
        var el = document.getElementById('briefContainer');
        if (!el || !_activeBrief) return;
        var brief = _activeBrief;
        var master = brief.master || DEFAULT_MASTER;
        var slides = brief.slides || [];
        var slide = slides[_activeSlideIdx] || null;

        var html = '';
        // ── Top toolbar ──
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px">';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        html += '<button class="ai-quick-btn" onclick="briefClose()" style="background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);color:var(--steel)"><i class="fas fa-arrow-left"></i> Back</button>';
        html += '<input id="briefTitleInput" value="' + _esc(brief.title) + '" style="background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:3px;color:#fff;padding:4px 10px;font-size:0.9rem;font-weight:600;width:280px" onchange="briefUpdateTitle(this.value)">';
        html += '</div>';
        html += '<div style="display:flex;gap:4px;flex-wrap:wrap">';
        html += '<button class="ai-quick-btn" onclick="briefAddSlide()" title="Add Slide"><i class="fas fa-plus"></i> Slide</button>';
        html += '<button class="ai-quick-btn" onclick="briefUndo()" title="Undo"><i class="fas fa-undo"></i></button>';
        html += '<button class="ai-quick-btn" onclick="briefRedo()" title="Redo"><i class="fas fa-redo"></i></button>';
        html += '<button class="ai-quick-btn" onclick="briefSlideMaster()" title="Slide Master"><i class="fas fa-palette"></i> Master</button>';
        html += '<button class="ai-quick-btn" onclick="briefShareSettings()" title="Share"><i class="fas fa-share-alt"></i></button>';
        html += '<button class="ai-quick-btn" onclick="briefExportHTML()" title="Export HTML"><i class="fas fa-print"></i></button>';
        html += '<button class="ai-quick-btn" onclick="briefAnchor()" title="Anchor to Ledger" style="background:rgba(201,168,76,0.12);border-color:rgba(201,168,76,0.25);color:#c9a84c"><i class="fas fa-link"></i> Anchor</button>';
        html += '<button class="ai-quick-btn" onclick="briefToggleComments()" title="Comments" style="' + (_showComments ? 'background:rgba(0,170,255,0.15);border-color:rgba(0,170,255,0.3);color:#00aaff' : '') + '"><i class="fas fa-comments"></i></button>';
        html += '<button class="ai-quick-btn" onclick="briefShowHistory()" title="Edit History"><i class="fas fa-history"></i></button>';
        html += '<button class="ai-quick-btn" onclick="briefSaveNow()" title="Save" style="background:rgba(0,204,136,0.12);border-color:rgba(0,204,136,0.25);color:#00cc88"><i class="fas fa-save"></i></button>';
        html += '</div></div>';

        // ── Formatting toolbar ──
        html += '<div id="briefFormatBar" style="display:flex;align-items:center;gap:4px;padding:6px 8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:4px;margin-bottom:10px;flex-wrap:wrap;min-height:36px">';
        html += '<select id="briefFontFamily" onchange="briefSetFont(this.value)" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:3px;padding:3px 6px;font-size:0.75rem;max-width:130px">';
        FONT_OPTIONS.forEach(function (f) { html += '<option value="' + f + '">' + f + '</option>'; });
        html += '</select>';
        html += '<select id="briefFontSize" onchange="briefSetFontSize(this.value)" style="background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.12);border-radius:3px;padding:3px 4px;font-size:0.75rem;width:50px">';
        FONT_SIZES.forEach(function (s) { html += '<option value="' + s + '">' + s + '</option>'; });
        html += '</select>';
        html += '<div style="width:1px;height:20px;background:rgba(255,255,255,0.1);margin:0 2px"></div>';
        html += '<button class="ai-quick-btn" onclick="briefToggleBold()" title="Bold" style="font-weight:700;min-width:28px">B</button>';
        html += '<button class="ai-quick-btn" onclick="briefToggleItalic()" title="Italic" style="font-style:italic;min-width:28px">I</button>';
        html += '<button class="ai-quick-btn" onclick="briefToggleUnderline()" title="Underline" style="text-decoration:underline;min-width:28px">U</button>';
        html += '<div style="width:1px;height:20px;background:rgba(255,255,255,0.1);margin:0 2px"></div>';
        html += '<button class="ai-quick-btn" onclick="briefSetAlign(\'left\')" title="Align Left"><i class="fas fa-align-left"></i></button>';
        html += '<button class="ai-quick-btn" onclick="briefSetAlign(\'center\')" title="Center"><i class="fas fa-align-center"></i></button>';
        html += '<button class="ai-quick-btn" onclick="briefSetAlign(\'right\')" title="Align Right"><i class="fas fa-align-right"></i></button>';
        html += '<div style="width:1px;height:20px;background:rgba(255,255,255,0.1);margin:0 2px"></div>';
        html += '<label style="display:flex;align-items:center;gap:3px;font-size:0.72rem;color:var(--muted)" title="Text Color">A <input type="color" id="briefColorPick" value="#ffffff" onchange="briefSetColor(this.value)" style="width:22px;height:22px;border:none;padding:0;cursor:pointer"></label>';
        html += '<label style="display:flex;align-items:center;gap:3px;font-size:0.72rem;color:var(--muted)" title="Fill"><i class="fas fa-fill-drip"></i> <input type="color" id="briefBgPick" value="#0d1117" onchange="briefSetBg(this.value)" style="width:22px;height:22px;border:none;padding:0;cursor:pointer"></label>';
        html += '<div style="width:1px;height:20px;background:rgba(255,255,255,0.1);margin:0 2px"></div>';
        html += '<button class="ai-quick-btn" onclick="briefInsertText()" title="Insert Text Box"><i class="fas fa-font"></i></button>';
        html += '<button class="ai-quick-btn" onclick="briefInsertShape()" title="Insert Shape"><i class="fas fa-square"></i></button>';
        html += '<button class="ai-quick-btn" onclick="briefInsertImage()" title="Insert Image"><i class="fas fa-image"></i></button>';
        html += '<button class="ai-quick-btn" onclick="briefDeleteElement()" title="Delete Selected" style="color:#ff4444"><i class="fas fa-trash"></i></button>';
        html += '</div>';

        // ── Main layout: slide panel + canvas ──
        html += '<div style="display:flex;gap:10px;min-height:500px">';

        // Slide thumbnails panel
        html += '<div id="briefSlidePanel" style="width:140px;min-width:140px;overflow-y:auto;max-height:560px;border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:6px;background:rgba(255,255,255,0.02)">';
        slides.forEach(function (s, i) {
            var sel = i === _activeSlideIdx;
            html += '<div class="briefThumb" data-idx="' + i + '" onclick="briefSelectSlide(' + i + ')" style="position:relative;cursor:pointer;margin-bottom:6px;border:2px solid ' + (sel ? master.accentColor || '#00aaff' : 'rgba(255,255,255,0.06)') + ';border-radius:3px;padding:4px;background:' + (sel ? 'rgba(0,170,255,0.06)' : 'transparent') + ';transition:border-color 0.15s">';
            html += '<div style="font-size:0.62rem;color:var(--muted);margin-bottom:2px">' + (i + 1) + '. ' + _esc((s.title || '').substring(0, 18)) + '</div>';
            html += '<div style="background:' + (master.bodyBg || '#0d1117') + ';height:70px;border-radius:2px;overflow:hidden;position:relative">';
            // Mini preview: just show first text element
            var firstText = '';
            (s.elements || []).forEach(function (e) { if (e.type === 'text' && !firstText) firstText = (e.text || '').substring(0, 40); });
            html += '<div style="padding:4px;font-size:0.45rem;color:' + (master.bodyColor || '#c9d1d9') + ';overflow:hidden;line-height:1.3">' + _esc(firstText) + '</div>';
            html += '</div>';
            html += '</div>';
        });
        html += '<button class="ai-quick-btn" onclick="briefAddSlide()" style="width:100%;font-size:0.72rem;margin-top:4px"><i class="fas fa-plus"></i></button>';
        html += '</div>';

        // Canvas area
        var sw = master.slideWidth || 960;
        var sh = master.slideHeight || 540;
        var scale = Math.min(1, (window.innerWidth - 300) / sw, 560 / sh);
        html += '<div style="flex:1;overflow:auto;display:flex;flex-direction:column;align-items:center">';
        html += '<div id="briefCanvas" style="position:relative;width:' + sw + 'px;height:' + sh + 'px;background:' + (master.bodyBg || '#0d1117') + ';border:1px solid rgba(255,255,255,0.1);border-radius:4px;box-shadow:0 4px 24px rgba(0,0,0,0.4);transform:scale(' + scale.toFixed(3) + ');transform-origin:top center;overflow:hidden;cursor:crosshair" onclick="briefCanvasClick(event)">';
        // Render slide elements
        if (slide) {
            (slide.elements || []).forEach(function (elem) {
                html += _renderElement(elem, master);
            });
        }
        // Footer
        html += '<div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:0.6rem;color:var(--muted)">';
        html += '<span>' + (master.footerText || '') + '</span>';
        html += '<span>Slide ' + (_activeSlideIdx + 1) + ' of ' + slides.length + '</span>';
        html += '</div>';
        html += '</div>';

        // Slide notes
        html += '<textarea id="briefSlideNotes" placeholder="Speaker notes..." style="width:100%;max-width:' + sw + 'px;height:60px;margin-top:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:3px;color:var(--steel);padding:6px 10px;font-size:0.78rem;resize:vertical" onchange="briefUpdateNotes(this.value)">' + _esc((slide && slide.notes) || '') + '</textarea>';
        html += '</div>';

        // ── Comments panel (collapsible right side) ──
        if (_showComments) {
            html += '<div id="briefCommentsPanel" style="width:260px;min-width:220px;border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:10px;background:rgba(255,255,255,0.02);overflow-y:auto;max-height:620px">';
            html += '<div style="font-size:0.82rem;font-weight:600;color:#fff;margin-bottom:10px"><i class="fas fa-comments" style="color:#00aaff;margin-right:6px"></i>Slide Comments</div>';
            var slideComments = (brief.comments && brief.comments[_activeSlideIdx]) || [];
            if (slideComments.length) {
                slideComments.forEach(function (c, ci) {
                    var timeStr = c.timestamp ? new Date(c.timestamp).toLocaleString() : '';
                    html += '<div style="padding:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:4px;margin-bottom:6px;font-size:0.78rem">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
                    html += '<span style="color:#00aaff;font-weight:600;font-size:0.72rem">' + _esc(c.user || 'Unknown') + '</span>';
                    html += '<span style="color:var(--muted);font-size:0.65rem">' + timeStr + '</span>';
                    html += '</div>';
                    html += '<div style="color:var(--steel);line-height:1.4">' + _esc(c.text) + '</div>';
                    if (c.edited) html += '<div style="color:var(--muted);font-size:0.62rem;margin-top:2px;font-style:italic">(edited)</div>';
                    html += '<div style="display:flex;gap:4px;margin-top:4px">';
                    html += '<button class="ai-quick-btn" onclick="briefEditComment(' + _activeSlideIdx + ',' + ci + ')" style="font-size:0.65rem;padding:2px 6px"><i class="fas fa-pen"></i></button>';
                    html += '<button class="ai-quick-btn" onclick="briefDeleteComment(' + _activeSlideIdx + ',' + ci + ')" style="font-size:0.65rem;padding:2px 6px;color:#ff4444"><i class="fas fa-trash"></i></button>';
                    html += '</div></div>';
                });
            } else {
                html += '<div style="text-align:center;padding:20px 8px;color:var(--muted);font-size:0.78rem">No comments on this slide</div>';
            }
            html += '<div style="margin-top:8px">';
            html += '<textarea id="briefNewComment" placeholder="Add a comment..." style="width:100%;height:50px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:3px;color:var(--steel);padding:6px 8px;font-size:0.78rem;resize:vertical"></textarea>';
            html += '<button class="ai-quick-btn" onclick="briefAddComment()" style="width:100%;margin-top:4px;background:rgba(0,170,255,0.12);border-color:rgba(0,170,255,0.25);color:#00aaff"><i class="fas fa-paper-plane"></i> Post Comment</button>';
            html += '</div></div>';
        }

        html += '</div>'; // end main layout

        el.innerHTML = html;
    }

    function _renderElement(elem, master) {
        var sel = _selectedElement && _selectedElement.id === elem.id;
        var style = 'position:absolute;left:' + elem.x + 'px;top:' + elem.y + 'px;width:' + elem.w + 'px;height:' + elem.h + 'px;';
        style += 'border:' + (sel ? '2px solid #00aaff' : '1px solid transparent') + ';';
        style += 'cursor:move;box-sizing:border-box;';

        if (elem.type === 'text') {
            var ff = elem.fontFamily || master.fontFamily || 'inherit';
            var fs = elem.fontSize || master.bodySize || 16;
            var fc = elem.color || master.bodyColor || '#c9d1d9';
            style += 'font-family:' + ff + ';font-size:' + fs + 'px;color:' + fc + ';';
            style += 'padding:4px 6px;overflow:hidden;white-space:pre-wrap;word-wrap:break-word;line-height:1.4;';
            if (elem.bold) style += 'font-weight:700;';
            if (elem.italic) style += 'font-style:italic;';
            if (elem.underline) style += 'text-decoration:underline;';
            if (elem.align) style += 'text-align:' + elem.align + ';';
            if (elem.bg) style += 'background:' + elem.bg + ';';
            return '<div class="briefEl" data-eid="' + elem.id + '" style="' + style + '" onclick="briefSelectElement(event,\'' + elem.id + '\')" ondblclick="briefEditElement(\'' + elem.id + '\')">' + _esc(elem.text || '') + '</div>';
        }
        if (elem.type === 'shape') {
            style += 'background:' + (elem.fill || 'rgba(0,170,255,0.15)') + ';';
            style += 'border:' + (elem.strokeWidth || 1) + 'px solid ' + (elem.stroke || 'rgba(0,170,255,0.3)') + ';';
            if (elem.radius) style += 'border-radius:' + elem.radius + 'px;';
            if (elem.shape === 'circle') style += 'border-radius:50%;';
            return '<div class="briefEl" data-eid="' + elem.id + '" style="' + style + '" onclick="briefSelectElement(event,\'' + elem.id + '\')"></div>';
        }
        if (elem.type === 'image') {
            style += 'overflow:hidden;';
            var inner = elem.src ? '<img src="' + _esc(elem.src) + '" style="width:100%;height:100%;object-fit:contain" draggable="false">' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:0.8rem"><i class="fas fa-image" style="margin-right:6px"></i>Image</div>';
            return '<div class="briefEl" data-eid="' + elem.id + '" style="' + style + '" onclick="briefSelectElement(event,\'' + elem.id + '\')">' + inner + '</div>';
        }
        return '';
    }

    // ================================================================
    //  SLIDE OPERATIONS
    // ================================================================
    function briefSelectSlide(idx) {
        _activeSlideIdx = idx;
        _selectedElement = null;
        _renderEditor();
    }
    window.briefSelectSlide = briefSelectSlide;

    function briefAddSlide() {
        if (!_activeBrief) return;
        _pushUndo();
        var newSlide = _makeSlide('Slide ' + (_activeBrief.slides.length + 1), [
            _makeText(40, 40, 880, 40, 'New Slide', { fontSize: 28, bold: true, color: '#ffffff' }),
            _makeShape(40, 88, 880, 2, { fill: (_activeBrief.master || DEFAULT_MASTER).accentColor || '#00aaff', stroke: 'transparent' })
        ]);
        _activeBrief.slides.push(newSlide);
        _activeSlideIdx = _activeBrief.slides.length - 1;
        _isDirty = true;
        _renderEditor();
    }
    window.briefAddSlide = briefAddSlide;

    function briefDeleteSlide() {
        if (!_activeBrief || _activeBrief.slides.length <= 1) return;
        _pushUndo();
        _activeBrief.slides.splice(_activeSlideIdx, 1);
        if (_activeSlideIdx >= _activeBrief.slides.length) _activeSlideIdx = _activeBrief.slides.length - 1;
        _isDirty = true;
        _renderEditor();
    }
    window.briefDeleteSlide = briefDeleteSlide;

    // ================================================================
    //  ELEMENT OPERATIONS
    // ================================================================
    function briefSelectElement(event, eid) {
        event.stopPropagation();
        var slide = (_activeBrief && _activeBrief.slides) ? _activeBrief.slides[_activeSlideIdx] : null;
        if (!slide) return;
        _selectedElement = null;
        slide.elements.forEach(function (el) { if (el.id === eid) _selectedElement = el; });
        _renderEditor();
        _syncFormatBar();
    }
    window.briefSelectElement = briefSelectElement;

    function briefCanvasClick(event) {
        if (event.target.id === 'briefCanvas' || event.target.closest('#briefCanvas') === event.target) {
            _selectedElement = null;
            _renderEditor();
        }
    }
    window.briefCanvasClick = briefCanvasClick;

    function briefEditElement(eid) {
        var slide = (_activeBrief && _activeBrief.slides) ? _activeBrief.slides[_activeSlideIdx] : null;
        if (!slide) return;
        var elem = null;
        slide.elements.forEach(function (el) { if (el.id === eid) elem = el; });
        if (!elem || elem.type !== 'text') return;

        var html = '<textarea id="briefEditTextArea" style="width:100%;height:200px;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:10px;font-size:0.9rem;font-family:inherit;resize:vertical">' + _esc(elem.text || '') + '</textarea>';
        html += '<div style="margin-top:10px;display:flex;justify-content:flex-end;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefApplyTextEdit(\'' + eid + '\')"><i class="fas fa-check"></i> Apply</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div>';
        _showModal('Edit Text', html);
    }
    window.briefEditElement = briefEditElement;

    function briefApplyTextEdit(eid) {
        var ta = document.getElementById('briefEditTextArea');
        if (!ta) return;
        _pushUndo();
        var slide = _activeBrief.slides[_activeSlideIdx];
        slide.elements.forEach(function (el) { if (el.id === eid) el.text = ta.value; });
        _isDirty = true;
        _closeModal();
        _renderEditor();
    }
    window.briefApplyTextEdit = briefApplyTextEdit;

    function briefInsertText() {
        if (!_activeBrief) return;
        _pushUndo();
        var slide = _activeBrief.slides[_activeSlideIdx];
        var newEl = _makeText(100, 200, 400, 60, 'New text', { fontSize: 18, color: '#c9d1d9' });
        slide.elements.push(newEl);
        _selectedElement = newEl;
        _isDirty = true;
        _renderEditor();
    }
    window.briefInsertText = briefInsertText;

    function briefInsertShape() {
        if (!_activeBrief) return;
        _pushUndo();
        var slide = _activeBrief.slides[_activeSlideIdx];
        var newEl = _makeShape(200, 200, 200, 120, { fill: 'rgba(0,170,255,0.15)', stroke: 'rgba(0,170,255,0.3)' });
        slide.elements.push(newEl);
        _selectedElement = newEl;
        _isDirty = true;
        _renderEditor();
    }
    window.briefInsertShape = briefInsertShape;

    function briefInsertImage() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function () {
            if (!input.files || !input.files[0]) return;
            var reader = new FileReader();
            reader.onload = function (e) {
                _pushUndo();
                var slide = _activeBrief.slides[_activeSlideIdx];
                var newEl = _makeImage(100, 100, 300, 200, e.target.result);
                slide.elements.push(newEl);
                _selectedElement = newEl;
                _isDirty = true;
                _renderEditor();
            };
            reader.readAsDataURL(input.files[0]);
        };
        input.click();
    }
    window.briefInsertImage = briefInsertImage;

    function briefDeleteElement() {
        if (!_selectedElement || !_activeBrief) return;
        _pushUndo();
        var slide = _activeBrief.slides[_activeSlideIdx];
        var eid = _selectedElement.id;
        slide.elements = slide.elements.filter(function (el) { return el.id !== eid; });
        _selectedElement = null;
        _isDirty = true;
        _renderEditor();
    }
    window.briefDeleteElement = briefDeleteElement;

    // ================================================================
    //  FORMAT BAR ACTIONS
    // ================================================================
    function _syncFormatBar() {
        if (!_selectedElement || _selectedElement.type !== 'text') return;
        var ff = document.getElementById('briefFontFamily');
        var fs = document.getElementById('briefFontSize');
        var cp = document.getElementById('briefColorPick');
        if (ff) ff.value = _selectedElement.fontFamily || FONT_OPTIONS[0];
        if (fs) fs.value = _selectedElement.fontSize || 16;
        if (cp) cp.value = _selectedElement.color || '#ffffff';
    }

    function _applyToSelected(prop, val) {
        if (!_selectedElement) { _toast('Select an element first', 'warning'); return; }
        _pushUndo();
        _selectedElement[prop] = val;
        _isDirty = true;
        _renderEditor();
        _syncFormatBar();
    }

    function briefSetFont(v) { _applyToSelected('fontFamily', v); }
    window.briefSetFont = briefSetFont;
    function briefSetFontSize(v) { _applyToSelected('fontSize', parseInt(v, 10)); }
    window.briefSetFontSize = briefSetFontSize;
    function briefToggleBold() { if (_selectedElement) _applyToSelected('bold', !_selectedElement.bold); }
    window.briefToggleBold = briefToggleBold;
    function briefToggleItalic() { if (_selectedElement) _applyToSelected('italic', !_selectedElement.italic); }
    window.briefToggleItalic = briefToggleItalic;
    function briefToggleUnderline() { if (_selectedElement) _applyToSelected('underline', !_selectedElement.underline); }
    window.briefToggleUnderline = briefToggleUnderline;
    function briefSetAlign(v) { _applyToSelected('align', v); }
    window.briefSetAlign = briefSetAlign;
    function briefSetColor(v) { _applyToSelected('color', v); }
    window.briefSetColor = briefSetColor;
    function briefSetBg(v) { _applyToSelected('bg', v); }
    window.briefSetBg = briefSetBg;

    // ================================================================
    //  UNDO / REDO
    // ================================================================
    function _pushUndo() {
        if (!_activeBrief) return;
        _undoStack.push(JSON.stringify(_activeBrief.slides));
        if (_undoStack.length > 50) _undoStack.shift();
        _redoStack = [];
    }

    function briefUndo() {
        if (!_undoStack.length || !_activeBrief) return;
        _redoStack.push(JSON.stringify(_activeBrief.slides));
        _activeBrief.slides = JSON.parse(_undoStack.pop());
        _isDirty = true;
        _renderEditor();
    }
    window.briefUndo = briefUndo;

    function briefRedo() {
        if (!_redoStack.length || !_activeBrief) return;
        _undoStack.push(JSON.stringify(_activeBrief.slides));
        _activeBrief.slides = JSON.parse(_redoStack.pop());
        _isDirty = true;
        _renderEditor();
    }
    window.briefRedo = briefRedo;

    // ================================================================
    //  TITLE / NOTES
    // ================================================================
    function briefUpdateTitle(val) {
        if (!_activeBrief) return;
        _activeBrief.title = val;
        _isDirty = true;
    }
    window.briefUpdateTitle = briefUpdateTitle;

    function briefUpdateNotes(val) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        if (slide) { slide.notes = val; _isDirty = true; }
    }
    window.briefUpdateNotes = briefUpdateNotes;

    // ================================================================
    //  SLIDE MASTER
    // ================================================================
    function briefSlideMaster() {
        if (!_activeBrief) return;
        var m = _activeBrief.master || DEFAULT_MASTER;
        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.82rem">';
        html += _masterField('Font Family', 'masterFont', m.fontFamily || 'Inter');
        html += _masterField('Title Size', 'masterTitleSize', m.titleSize || 28);
        html += _masterField('Body Size', 'masterBodySize', m.bodySize || 16);
        html += _masterColorField('Header BG', 'masterHeaderBg', m.headerBg || '#0a1628');
        html += _masterColorField('Header Color', 'masterHeaderColor', m.headerColor || '#ffffff');
        html += _masterColorField('Body BG', 'masterBodyBg', m.bodyBg || '#0d1117');
        html += _masterColorField('Body Color', 'masterBodyColor', m.bodyColor || '#c9d1d9');
        html += _masterColorField('Accent', 'masterAccent', m.accentColor || '#00aaff');
        html += '</div>';
        html += '<div style="margin-top:10px"><label style="color:var(--steel);font-size:0.8rem">Footer Text</label><input id="masterFooter" value="' + _esc(m.footerText || '') + '" style="width:100%;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:5px 8px;font-size:0.82rem;margin-top:4px"></div>';
        html += '<div style="margin-top:12px;display:flex;justify-content:flex-end;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefApplyMaster()"><i class="fas fa-check"></i> Apply</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div>';
        _showModal('Slide Master Settings', html);
    }
    window.briefSlideMaster = briefSlideMaster;

    function _masterField(label, id, val) {
        return '<div><label style="color:var(--steel)">' + label + '</label><input id="' + id + '" value="' + _esc('' + val) + '" style="width:100%;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:4px 8px;font-size:0.8rem;margin-top:2px"></div>';
    }
    function _masterColorField(label, id, val) {
        return '<div><label style="color:var(--steel)">' + label + '</label><div style="display:flex;gap:4px;margin-top:2px"><input type="color" id="' + id + '" value="' + val + '" style="width:36px;height:28px;border:none;cursor:pointer"><input id="' + id + 'Text" value="' + val + '" style="flex:1;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:4px;font-size:0.78rem" onchange="document.getElementById(\'' + id + '\').value=this.value"></div></div>';
    }

    function briefApplyMaster() {
        if (!_activeBrief) return;
        _pushUndo();
        var m = _activeBrief.master;
        m.fontFamily = document.getElementById('masterFont').value;
        m.titleSize = parseInt(document.getElementById('masterTitleSize').value) || 28;
        m.bodySize = parseInt(document.getElementById('masterBodySize').value) || 16;
        m.headerBg = document.getElementById('masterHeaderBg').value;
        m.headerColor = document.getElementById('masterHeaderColor').value;
        m.bodyBg = document.getElementById('masterBodyBg').value;
        m.bodyColor = document.getElementById('masterBodyColor').value;
        m.accentColor = document.getElementById('masterAccent').value;
        m.footerText = document.getElementById('masterFooter').value;
        _isDirty = true;
        _closeModal();
        _renderEditor();
    }
    window.briefApplyMaster = briefApplyMaster;

    // ================================================================
    //  SHARE / PERMISSIONS
    // ================================================================
    function briefShareSettings() {
        if (!_activeBrief) return;
        var b = _activeBrief;
        var html = '<div style="font-size:0.82rem">';
        html += '<label style="color:var(--steel)">Access Level</label>';
        html += '<select id="briefAccessLevel" style="width:100%;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:5px 8px;font-size:0.82rem;margin:4px 0 12px">';
        ['private','team','org','public'].forEach(function (lv) {
            html += '<option value="' + lv + '"' + (b.access_level === lv ? ' selected' : '') + '>' + lv.charAt(0).toUpperCase() + lv.slice(1) + '</option>';
        });
        html += '</select>';
        html += '<label style="color:var(--steel)">Editors (comma-separated emails)</label>';
        html += '<input id="briefEditors" value="' + _esc((b.editors || []).join(', ')) + '" style="width:100%;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:5px 8px;font-size:0.82rem;margin:4px 0 12px">';
        html += '<label style="color:var(--steel)">Viewers (comma-separated emails)</label>';
        html += '<input id="briefViewers" value="' + _esc((b.viewers || []).join(', ')) + '" style="width:100%;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:5px 8px;font-size:0.82rem;margin:4px 0 12px">';
        html += '</div>';
        html += '<div style="display:flex;justify-content:flex-end;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefApplyShare()"><i class="fas fa-check"></i> Apply</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div>';
        _showModal('Share & Permissions', html);
    }
    window.briefShareSettings = briefShareSettings;

    function briefApplyShare() {
        if (!_activeBrief) return;
        _activeBrief.access_level = document.getElementById('briefAccessLevel').value;
        _activeBrief.editors = document.getElementById('briefEditors').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        _activeBrief.viewers = document.getElementById('briefViewers').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        _isDirty = true;
        _closeModal();
        _toast('Permissions updated', 'success');
    }
    window.briefApplyShare = briefApplyShare;

    // ================================================================
    //  SAVE
    // ================================================================
    function briefSaveNow() {
        if (!_activeBrief) return;
        _saveBrief(_activeBrief, function () {
            _isDirty = false;
            _toast('Brief saved', 'success');
        });
    }
    window.briefSaveNow = briefSaveNow;

    // ================================================================
    //  DELETE BRIEF
    // ================================================================
    function briefDeleteCurrent() {
        if (!_activeBrief || !_activeBrief.id) return;
        _deleteBrief(_activeBrief.id, function () {
            _briefs = _briefs.filter(function (b) { return b.id !== _activeBrief.id; });
            _activeBrief = null;
            _toast('Brief deleted', 'info');
            _renderBriefList();
        });
    }
    window.briefDeleteCurrent = briefDeleteCurrent;

    // ================================================================
    //  EXPORT — Printable HTML
    // ================================================================
    function briefExportHTML() {
        if (!_activeBrief) return;
        var brief = _activeBrief;
        var master = brief.master || DEFAULT_MASTER;
        var sw = master.slideWidth || 960;
        var sh = master.slideHeight || 540;

        var doc = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + _esc(brief.title) + '</title>';
        doc += '<style>@media print{.slide{page-break-after:always}.slide:last-child{page-break-after:auto}}';
        doc += 'body{margin:0;padding:20px;background:#1a1a2e;font-family:' + (master.fontFamily || 'sans-serif') + '}';
        doc += '.slide{position:relative;width:' + sw + 'px;height:' + sh + 'px;margin:0 auto 20px;background:' + (master.bodyBg || '#0d1117') + ';border-radius:4px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4)}';
        doc += '.el{position:absolute;box-sizing:border-box;overflow:hidden;white-space:pre-wrap;word-wrap:break-word}';
        doc += '</style></head><body>';

        brief.slides.forEach(function (slide) {
            doc += '<div class="slide">';
            (slide.elements || []).forEach(function (el) {
                var s = 'left:' + el.x + 'px;top:' + el.y + 'px;width:' + el.w + 'px;height:' + el.h + 'px;';
                if (el.type === 'text') {
                    s += 'font-size:' + (el.fontSize || 16) + 'px;color:' + (el.color || master.bodyColor || '#fff') + ';';
                    s += 'line-height:1.4;padding:4px 6px;';
                    if (el.fontFamily) s += 'font-family:' + el.fontFamily + ';';
                    if (el.bold) s += 'font-weight:700;';
                    if (el.italic) s += 'font-style:italic;';
                    if (el.underline) s += 'text-decoration:underline;';
                    if (el.align) s += 'text-align:' + el.align + ';';
                    if (el.bg) s += 'background:' + el.bg + ';';
                    doc += '<div class="el" style="' + s + '">' + _esc(el.text || '') + '</div>';
                } else if (el.type === 'shape') {
                    s += 'background:' + (el.fill || 'rgba(0,170,255,0.15)') + ';';
                    if (el.stroke) s += 'border:' + (el.strokeWidth || 1) + 'px solid ' + el.stroke + ';';
                    if (el.radius) s += 'border-radius:' + el.radius + 'px;';
                    if (el.shape === 'circle') s += 'border-radius:50%;';
                    doc += '<div class="el" style="' + s + '"></div>';
                } else if (el.type === 'image' && el.src) {
                    doc += '<div class="el" style="' + s + '"><img src="' + el.src + '" style="width:100%;height:100%;object-fit:contain"></div>';
                }
            });
            doc += '<div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;color:#8b949e">' + _esc(master.footerText || '') + '</div>';
            doc += '</div>';
        });

        doc += '</body></html>';
        var blob = new Blob([doc], { type: 'text/html' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (brief.title || 'brief').replace(/[^a-zA-Z0-9_-]/g, '_') + '.html';
        a.click();
        _toast('Exported as HTML', 'success');
    }
    window.briefExportHTML = briefExportHTML;

    // ================================================================
    //  IMPORT PPTX
    // ================================================================
    function briefImportPPTX() {
        if (typeof JSZip === 'undefined') { _toast('JSZip not loaded', 'error'); return; }
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pptx';
        input.onchange = function () {
            if (!input.files || !input.files[0]) return;
            var reader = new FileReader();
            reader.onload = function (e) {
                try {
                    JSZip.loadAsync(e.target.result).then(function (zip) {
                        var slideFiles = [];
                        zip.forEach(function (path) {
                            if (/^ppt\/slides\/slide\d+\.xml$/i.test(path)) slideFiles.push(path);
                        });
                        slideFiles.sort();
                        var slidePromises = slideFiles.map(function (f) { return zip.file(f).async('string'); });
                        Promise.all(slidePromises).then(function (xmlArr) {
                            var slides = xmlArr.map(function (xml, i) {
                                var text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                                return _makeSlide('Slide ' + (i + 1), [
                                    _makeText(40, 40, 880, 40, 'Imported Slide ' + (i + 1), { fontSize: 28, bold: true, color: '#ffffff' }),
                                    _makeShape(40, 88, 880, 2, { fill: '#00aaff', stroke: 'transparent' }),
                                    _makeText(40, 110, 880, 380, text.substring(0, 2000), { fontSize: 14, color: '#c9d1d9' })
                                ]);
                            });
                            var brief = {
                                title: (input.files[0].name || 'Imported Brief').replace('.pptx', ''),
                                brief_type: 'STATUS',
                                program_name: '',
                                slides: slides,
                                master: Object.assign({}, DEFAULT_MASTER),
                                access_level: 'private',
                                editors: [],
                                viewers: [],
                                version: 1
                            };
                            _activeBrief = brief;
                            _activeSlideIdx = 0;
                            _isDirty = true;
                            _briefs.unshift(brief);
                            _saveBrief(brief, function () { _renderEditor(); });
                            _toast('Imported ' + slides.length + ' slides', 'success');
                        });
                    });
                } catch (err) {
                    _toast('PPTX import error: ' + err.message, 'error');
                }
            };
            reader.readAsArrayBuffer(input.files[0]);
        };
        input.click();
    }
    window.briefImportPPTX = briefImportPPTX;

    // ================================================================
    //  ANCHOR TO LEDGER
    // ================================================================
    function briefAnchor() {
        if (!_activeBrief) return;
        var content = JSON.stringify(_activeBrief.slides);
        if (typeof window.anchorRecord === 'function') {
            var hash = _sha256(content);
            _activeBrief.anchor_hash = hash;
            _isDirty = true;
            _saveBrief(_activeBrief, function () {
                window.anchorRecord('brief', hash, { title: _activeBrief.title, type: _activeBrief.brief_type, slides: _activeBrief.slides.length });
                _toast('Brief anchored to Ledger', 'success');
            });
        } else {
            _toast('Anchor function not available', 'warning');
        }
    }
    window.briefAnchor = briefAnchor;

    function _sha256(str) {
        // Simple hash for display — real anchoring uses engine.js anchorRecord
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var ch = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + ch;
            hash |= 0;
        }
        return 'BRIEF-' + Math.abs(hash).toString(16).toUpperCase().padStart(12, '0');
    }

    // ================================================================
    //  AI GENERATE
    // ================================================================
    function briefAIGenerate() {
        if (!_activeBrief) return;
        var prompt = 'I have a ' + (_activeBrief.brief_type || 'STATUS') + ' brief titled "' + _activeBrief.title + '". ';
        prompt += 'Generate professional content for each slide. Current slides: ';
        _activeBrief.slides.forEach(function (s, i) { prompt += '\nSlide ' + (i + 1) + ': ' + s.title; });
        prompt += '\n\nPlease provide executive-quality content suitable for a defense program briefing.';

        var chatInput = document.getElementById('aiInput') || document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = prompt;
            var sendBtn = document.getElementById('aiSendBtn') || document.getElementById('chatSendBtn');
            if (sendBtn) sendBtn.click();
            _toast('Sent to AI Agent', 'info');
        }
    }
    window.briefAIGenerate = briefAIGenerate;

    // ================================================================
    //  PROGRAM & VESSEL MANAGEMENT
    // ================================================================
    function _loadProgramsAndVessels() {
        try {
            var stored = localStorage.getItem('s4_brief_programs');
            _programs = stored ? JSON.parse(stored) : DEFAULT_PROGRAMS.slice();
        } catch (e) { _programs = DEFAULT_PROGRAMS.slice(); }
        try {
            var storedV = localStorage.getItem('s4_brief_vessels');
            _vessels = storedV ? JSON.parse(storedV) : JSON.parse(JSON.stringify(DEFAULT_VESSELS));
        } catch (e) { _vessels = JSON.parse(JSON.stringify(DEFAULT_VESSELS)); }
    }

    function _saveProgramsAndVessels() {
        try {
            localStorage.setItem('s4_brief_programs', JSON.stringify(_programs));
            localStorage.setItem('s4_brief_vessels', JSON.stringify(_vessels));
        } catch (e) { /* storage full */ }
    }

    function briefSelectProgram(val) {
        _selectedProgram = val;
        _selectedVessel = '';
        _renderBriefList();
    }
    window.briefSelectProgram = briefSelectProgram;

    function briefSelectVessel(val) {
        _selectedVessel = val;
        _renderBriefList();
    }
    window.briefSelectVessel = briefSelectVessel;

    function briefAddProgram() {
        var html = '<div style="font-size:0.85rem;color:var(--steel);margin-bottom:12px">Add a custom program to the dropdown.</div>';
        html += '<input id="briefNewProgramInput" placeholder="e.g. PMS 500 — ZUMWALT Class" style="width:100%;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:8px 12px;font-size:0.88rem;margin-bottom:12px">';
        html += '<div style="display:flex;justify-content:flex-end;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefConfirmAddProgram()"><i class="fas fa-check"></i> Add</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div>';
        _showModal('Add Custom Program', html);
        setTimeout(function () { var inp = document.getElementById('briefNewProgramInput'); if (inp) inp.focus(); }, 100);
    }
    window.briefAddProgram = briefAddProgram;

    function briefConfirmAddProgram() {
        var inp = document.getElementById('briefNewProgramInput');
        var val = inp ? inp.value.trim() : '';
        if (!val) { _toast('Enter a program name', 'warning'); return; }
        if (_programs.indexOf(val) !== -1) { _toast('Program already exists', 'warning'); return; }
        _programs.push(val);
        _vessels[val] = [];
        _saveProgramsAndVessels();
        _closeModal();
        _selectedProgram = val;
        _selectedVessel = '';
        _renderBriefList();
        _toast('Program added', 'success');
    }
    window.briefConfirmAddProgram = briefConfirmAddProgram;

    function briefAddVessel() {
        if (!_selectedProgram) { _toast('Select a program first', 'warning'); return; }
        var html = '<div style="font-size:0.85rem;color:var(--steel);margin-bottom:12px">Add a vessel / craft to <strong style="color:#fff">' + _esc(_selectedProgram) + '</strong>.</div>';
        html += '<input id="briefNewVesselInput" placeholder="e.g. DDG 129 Jeremiah Denton" style="width:100%;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:8px 12px;font-size:0.88rem;margin-bottom:12px">';
        html += '<div style="display:flex;justify-content:flex-end;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefConfirmAddVessel()"><i class="fas fa-check"></i> Add</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div>';
        _showModal('Add Custom Vessel / Craft', html);
        setTimeout(function () { var inp = document.getElementById('briefNewVesselInput'); if (inp) inp.focus(); }, 100);
    }
    window.briefAddVessel = briefAddVessel;

    function briefConfirmAddVessel() {
        var inp = document.getElementById('briefNewVesselInput');
        var val = inp ? inp.value.trim() : '';
        if (!val) { _toast('Enter a vessel name', 'warning'); return; }
        if (!_vessels[_selectedProgram]) _vessels[_selectedProgram] = [];
        if (_vessels[_selectedProgram].indexOf(val) !== -1) { _toast('Vessel already exists', 'warning'); return; }
        _vessels[_selectedProgram].push(val);
        _saveProgramsAndVessels();
        _closeModal();
        _selectedVessel = val;
        _renderBriefList();
        _toast('Vessel added', 'success');
    }
    window.briefConfirmAddVessel = briefConfirmAddVessel;

    // ================================================================
    //  COMMENTS
    // ================================================================
    function briefToggleComments() {
        _showComments = !_showComments;
        _renderEditor();
    }
    window.briefToggleComments = briefToggleComments;

    function briefAddComment() {
        if (!_activeBrief) return;
        var textarea = document.getElementById('briefNewComment');
        var text = textarea ? textarea.value.trim() : '';
        if (!text) { _toast('Enter a comment', 'warning'); return; }
        if (!_activeBrief.comments) _activeBrief.comments = {};
        if (!_activeBrief.comments[_activeSlideIdx]) _activeBrief.comments[_activeSlideIdx] = [];
        var user = sessionStorage.getItem('s4_user_email') || 'Unknown User';
        _activeBrief.comments[_activeSlideIdx].push({
            id: _uid(),
            user: user,
            text: text,
            timestamp: new Date().toISOString(),
            edited: false
        });
        _isDirty = true;
        // Auto-save to persist comment
        _saveBrief(_activeBrief, function () {
            _renderEditor();
            _toast('Comment added', 'success');
        });
    }
    window.briefAddComment = briefAddComment;

    function briefEditComment(slideIdx, commentIdx) {
        if (!_activeBrief || !_activeBrief.comments || !_activeBrief.comments[slideIdx]) return;
        var comment = _activeBrief.comments[slideIdx][commentIdx];
        if (!comment) return;
        var html = '<textarea id="briefEditCommentText" style="width:100%;height:80px;background:#0a0e1a;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:8px 12px;font-size:0.85rem;resize:vertical;margin-bottom:12px">' + _esc(comment.text) + '</textarea>';
        html += '<div style="display:flex;justify-content:flex-end;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefConfirmEditComment(' + slideIdx + ',' + commentIdx + ')"><i class="fas fa-check"></i> Save</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div>';
        _showModal('Edit Comment', html);
    }
    window.briefEditComment = briefEditComment;

    function briefConfirmEditComment(slideIdx, commentIdx) {
        var textarea = document.getElementById('briefEditCommentText');
        var text = textarea ? textarea.value.trim() : '';
        if (!text) { _toast('Comment cannot be empty', 'warning'); return; }
        var comment = _activeBrief.comments[slideIdx][commentIdx];
        comment.text = text;
        comment.edited = true;
        comment.editedAt = new Date().toISOString();
        _isDirty = true;
        _closeModal();
        _saveBrief(_activeBrief, function () {
            _renderEditor();
            _toast('Comment updated', 'success');
        });
    }
    window.briefConfirmEditComment = briefConfirmEditComment;

    function briefDeleteComment(slideIdx, commentIdx) {
        if (!_activeBrief || !_activeBrief.comments || !_activeBrief.comments[slideIdx]) return;
        _activeBrief.comments[slideIdx].splice(commentIdx, 1);
        _isDirty = true;
        _saveBrief(_activeBrief, function () {
            _renderEditor();
            _toast('Comment removed', 'info');
        });
    }
    window.briefDeleteComment = briefDeleteComment;

    // ================================================================
    //  EDIT HISTORY
    // ================================================================
    function briefShowHistory() {
        if (!_activeBrief) return;
        var history = _activeBrief.edit_history || [];
        var html = '';
        if (!history.length) {
            html += '<div style="text-align:center;padding:20px;color:var(--muted)">No edit history yet</div>';
        } else {
            html += '<div style="max-height:350px;overflow-y:auto">';
            // Show most recent first
            var recent = history.slice().reverse().slice(0, 50);
            recent.forEach(function (entry) {
                var timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.8rem">';
                html += '<div><span style="color:#00aaff;font-weight:600">' + _esc(entry.user || 'Unknown') + '</span> <span style="color:var(--muted)">' + _esc(entry.action || '') + '</span></div>';
                html += '<span style="color:var(--muted);font-size:0.72rem;white-space:nowrap">' + timeStr + '</span>';
                html += '</div>';
            });
            html += '</div>';
        }
        _showModal('Edit History', html);
    }
    window.briefShowHistory = briefShowHistory;

    // ================================================================
    //  NOTIFICATIONS
    // ================================================================
    function _notifyProgramUsers(brief, currentUser) {
        var recipients = [];
        (brief.editors || []).forEach(function (e) { if (e && e !== currentUser) recipients.push(e); });
        (brief.viewers || []).forEach(function (v) { if (v && v !== currentUser && recipients.indexOf(v) === -1) recipients.push(v); });
        if (!recipients.length) return;
        _toast('Notified ' + recipients.length + ' collaborator' + (recipients.length !== 1 ? 's' : '') + ' of your changes', 'info');
    }

    // ================================================================
    //  UTILITIES
    // ================================================================
    var _uidCounter = 0;
    function _uid() { return 'be_' + Date.now().toString(36) + '_' + (++_uidCounter).toString(36); }

    function _esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function _toast(msg, type) {
        if (typeof S4 !== 'undefined' && S4.toast) S4.toast(msg, type);
    }

    // ================================================================
    //  MODAL
    // ================================================================
    function _showModal(title, bodyHtml) {
        _closeModal();
        var overlay = document.createElement('div');
        overlay.id = 'briefModalOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
        overlay.innerHTML = '<div style="background:#0d1117;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:24px;max-width:600px;width:92%;max-height:80vh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,0.6)">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h4 style="margin:0;color:#fff"><i class="fas fa-briefcase" style="color:#00aaff;margin-right:8px"></i>' + title + '</h4>' +
            '<button onclick="briefCloseModal()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer">&times;</button></div>' +
            bodyHtml + '</div>';
        overlay.addEventListener('click', function (e) { if (e.target === overlay) _closeModal(); });
        document.body.appendChild(overlay);
    }

    function _closeModal() {
        var old = document.getElementById('briefModalOverlay');
        if (old) old.remove();
    }
    window.briefCloseModal = _closeModal;

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        if (_currentView !== 'editor' || !_activeBrief) return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); briefUndo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); briefRedo(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); briefSaveNow(); }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (_selectedElement && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                briefDeleteElement();
            }
        }
    });

})();
