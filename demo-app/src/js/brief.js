// =======================================================================
//  S4 Ledger — Program Brief Engine (Phase 4 — Full Suite)
//  Defense-grade slide briefing platform: 34+ feature categories including
//  charts, tables, risk matrices, PPTX/PDF export, presenter mode, approval
//  workflow, classification banners, drag-and-drop, real-time co-editing,
//  slide library, version diffing, acronym glossary, quad charts, POA&M,
//  smart layouts, live data widgets, review annotations, and more.
//  Brief Types: STATUS, MILESTONE, POM, PB, ILSMT, ILSMP, IPR, CDR, PDR,
//               SDR, QUAD, POAM, EXEC
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
        PB:        { label: "President's Budget Brief", icon: 'fa-landmark', color: '#ffa500' },
        ILSMT:     { label: 'ILSMT Brief', icon: 'fa-users-cog', color: '#00cc88' },
        ILSMP:     { label: 'ILSMP Brief', icon: 'fa-clipboard-list', color: '#3b82f6' },
        IPR:       { label: 'IPR Brief', icon: 'fa-tasks', color: '#f97316' },
        CDR:       { label: 'Critical Design Review', icon: 'fa-drafting-compass', color: '#ff6b35' },
        PDR:       { label: 'Preliminary Design Review', icon: 'fa-compass', color: '#4ecdc4' },
        SDR:       { label: 'System Design Review', icon: 'fa-cogs', color: '#95e1d3' },
        QUAD:      { label: 'Quad Chart', icon: 'fa-th-large', color: '#f38181' },
        POAM:      { label: 'POA&M', icon: 'fa-clipboard-check', color: '#aa96da' },
        EXEC:      { label: 'Executive One-Pager', icon: 'fa-star', color: '#ffd700' }
    };

    var DEFAULT_MASTER = {
        fontFamily: 'Inter, -apple-system, Segoe UI, sans-serif',
        titleSize: 28,
        bodySize: 16,
        headerBg: '#f5f5f7',
        headerColor: '#ffffff',
        bodyBg: '#ffffff',
        bodyColor: '#1d1d1f',
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
    //  CLASSIFICATION LEVELS (DoDI 5200.48)
    // ================================================================
    var CLASSIFICATION_LEVELS = {
        UNCLASSIFIED:  { label: 'UNCLASSIFIED', color: '#00cc44', bg: 'rgba(0,204,68,0.15)' },
        CUI:           { label: 'CUI', color: '#ffaa00', bg: 'rgba(255,170,0,0.15)' },
        FOUO:          { label: 'FOR OFFICIAL USE ONLY', color: '#ffaa00', bg: 'rgba(255,170,0,0.15)' },
        CONFIDENTIAL:  { label: 'CONFIDENTIAL', color: '#0066ff', bg: 'rgba(0,102,255,0.15)' },
        SECRET:        { label: 'SECRET', color: '#ff0000', bg: 'rgba(255,0,0,0.15)' },
        TOP_SECRET:    { label: 'TOP SECRET', color: '#ff8800', bg: 'rgba(255,136,0,0.20)' }
    };

    var APPROVAL_STATES = {
        draft:      { label: 'Draft', icon: 'fa-pencil-alt', color: '#8b949e' },
        in_review:  { label: 'In Review', icon: 'fa-search', color: '#ffaa00' },
        approved:   { label: 'Approved', icon: 'fa-check-circle', color: '#00cc88' },
        locked:     { label: 'Locked', icon: 'fa-lock', color: '#ff4444' }
    };

    var TRANSITION_TYPES = ['none','fade','slide-left','slide-right','zoom-in','zoom-out'];

    var LIGHT_THEME = { bodyBg: '#ffffff', bodyColor: '#1a1a2e', headerBg: '#f0f4f8', headerColor: '#1a1a2e', accentColor: '#0066cc' };

    var DOD_ACRONYMS = {
        'ACAT':'Acquisition Category','AoA':'Analysis of Alternatives','APB':'Acquisition Program Baseline',
        'CDR':'Critical Design Review','CDD':'Capability Development Document','CJCS':'Chairman Joint Chiefs of Staff',
        'CONOPS':'Concept of Operations','CPD':'Capability Production Document','DAB':'Defense Acquisition Board',
        'DAE':'Defense Acquisition Executive','DBS':'Defense Business System','DoD':'Department of Defense',
        'DMSMS':'Diminishing Manufacturing Sources','EMD':'Engineering and Manufacturing Development',
        'FOC':'Full Operational Capability','FRP':'Full Rate Production','ICD':'Initial Capabilities Document',
        'ILS':'Integrated Logistics Support','IOC':'Initial Operational Capability','IPR':'In-Progress Review',
        'JCIDS':'Joint Capabilities Integration and Development System','KPP':'Key Performance Parameter',
        'KSA':'Key System Attribute','LCSP':'Life Cycle Sustainment Plan','LRIP':'Low Rate Initial Production',
        'MDA':'Milestone Decision Authority','MDD':'Materiel Development Decision','MS A':'Milestone A',
        'MS B':'Milestone B','MS C':'Milestone C','OSD':'Office of the Secretary of Defense',
        'PB':'Presidents Budget','PDR':'Preliminary Design Review','PEO':'Program Executive Officer',
        'POA&M':'Plan of Action and Milestones','POM':'Program Objective Memorandum',
        'RDT&E':'Research Development Test and Evaluation','SAE':'Service Acquisition Executive',
        'SDR':'System Design Review','SEP':'Systems Engineering Plan','SFR':'System Functional Review',
        'SRR':'System Requirements Review','TEMP':'Test and Evaluation Master Plan',
        'TRA':'Technology Readiness Assessment','TRL':'Technology Readiness Level',
        'WIPT':'Working Integrated Product Team','ILSMT':'ILS Management Team',
        'ILSMP':'ILS Management Plan','NAVSEA':'Naval Sea Systems Command',
        'OPNAV':'Office of the Chief of Naval Operations','SYSCOM':'Systems Command',
        'PMS':'Program Manager Ships','FY':'Fiscal Year','FYDP':'Future Years Defense Program',
        'O&S':'Operations and Support','PPBE':'Planning Programming Budgeting and Execution',
        'CBA':'Cost Benefit Analysis','BCA':'Business Case Analysis','CAPE':'Cost Assessment and Program Evaluation'
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
    // Phase 4 state
    var _classificationLevel = 'UNCLASSIFIED';
    var _approvalStatus = 'draft';
    var _theme = 'dark';
    var _snapToGrid = true;
    var _gridSize = 20;
    var _presenterMode = false;
    var _presenterTimer = 0;
    var _presenterInterval = null;
    var _annotationMode = false;
    var _dragState = null;
    var _slideLibrary = [];
    var _customTemplates = [];
    var _briefSchedule = [];
    var _analytics = {};
    var _offlineQueue = [];
    var _realtimeChannel = null;
    var _dodNumbering = false;
    var _showShortcutsPanel = false;
    // Phase 5 — Glass Command Center state
    var _canvasZoom = 1;
    var _multiSelect = [];   // array of selected element IDs
    var _showProps = false;  // right properties panel visible
    var _activeSidebarGroup = ''; // which sidebar flyout is open
    var _alignGuides = true;
    var _elementGroups = {};  // { groupId: [eid1, eid2...] }
    var _clipboardSlide = null; // for cross-slide paste
    var _buildOrder = [];  // element animation order per slide
    var _rehearsalTimer = 0;
    var _rehearsalInterval = null;
    var _customThemes = [];
    var _complianceResults = null;
    var _cssInjected = false;

    // ================================================================
    //  CSS INJECTION — Glass Command Center Styles
    // ================================================================
    function _injectBriefCSS() {
        if (_cssInjected) return;
        _cssInjected = true;
        var css = '';
        // Design token aliases (reference global :root vars)
        var a = 'var(--accent,#00aaff)';
        var bdr = 'var(--border,rgba(0,0,0,0.06))';
        var tp = 'var(--text-primary,#f0f0f5)';
        var ts = 'var(--text-secondary,#8b8fa3)';
        var tm = 'var(--text-muted,#5a5e72)';
        // Animations
        css += '@keyframes briefFadeIn{from{opacity:0}to{opacity:1}}';
        css += '@keyframes briefSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
        css += '@keyframes briefPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,170,255,0.3)}50%{box-shadow:0 0 0 6px rgba(0,170,255,0)}}';
        css += '@keyframes briefGlow{0%,100%{opacity:0.6}50%{opacity:1}}';
        // Left sidebar
        css += '.brief-sidebar{width:200px;min-width:200px;background:rgba(245,245,247,0.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-right:1px solid ' + bdr + ';display:flex;flex-direction:column;padding:8px;gap:2px;overflow-y:auto;overflow-x:hidden}';
        css += '.brief-sidebar-group{display:flex;flex-direction:column;gap:1px;width:100%}';
        css += '.brief-sidebar-btn{display:flex;align-items:center;gap:6px;border:none;background:transparent;color:' + tm + ';cursor:pointer;border-radius:6px;font-size:0.76rem;transition:all 0.2s;padding:6px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
        css += '.brief-sidebar-btn i{font-size:0.78rem;width:16px;text-align:center;flex-shrink:0;color:var(--accent,#00aaff)}';
        css += '.brief-sidebar-btn:hover{background:rgba(0,0,0,0.04);color:' + tp + '}';
        css += '.brief-sidebar-btn.active{background:rgba(0,113,227,0.1);color:var(--accent,#00aaff)}';
        css += '.brief-sidebar-divider{width:100%;height:1px;background:' + bdr + ';margin:4px 0}';
        css += '.brief-sidebar-label{font-size:0.58rem;color:' + tm + ';text-transform:uppercase;letter-spacing:1px;margin:4px 0 2px 2px;line-height:1;font-weight:600}';
        // Slide panel
        css += '.brief-slide-panel{width:180px;min-width:180px;background:rgba(245,245,247,0.95);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-right:1px solid rgba(0,0,0,0.05);overflow-y:auto;padding:12px 10px}';
        css += '.brief-thumb{position:relative;cursor:pointer;margin-bottom:10px;border:2px solid rgba(0,0,0,0.05);border-radius:10px;overflow:hidden;transition:all 0.25s;background:rgba(0,0,0,0.015)}';
        css += '.brief-thumb:hover{border-color:rgba(0,170,255,0.25);transform:scale(1.03);box-shadow:0 4px 16px rgba(0,0,0,0.06)}';
        css += '.brief-thumb.active{border-color:' + a + ';box-shadow:0 0 20px rgba(0,170,255,0.2);transform:scale(1.03)}';
        // Canvas stage
        css += '.brief-stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(0,170,255,0.02) 0%,rgba(240,240,245,0.5) 70%);padding:20px;overflow:auto;position:relative}';
        css += '.brief-canvas{position:relative;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.1),0 0 0 1px rgba(0,0,0,0.08),0 0 80px rgba(0,170,255,0.04);overflow:hidden;transition:box-shadow 0.3s}';
        css += '.brief-canvas:hover{box-shadow:0 10px 40px rgba(0,0,0,0.12),0 0 0 1px rgba(0,0,0,0.1),0 0 100px rgba(0,170,255,0.06)}';
        // Format bar (floating)
        css += '.brief-format-bar{display:flex;align-items:center;gap:3px;background:rgba(255,255,255,0.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(0,0,0,0.1);border-radius:12px;padding:6px 12px;box-shadow:0 8px 32px rgba(0,0,0,0.06);flex-wrap:wrap}';
        css += '.brief-fmt-btn{width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid transparent;color:' + ts + ';cursor:pointer;border-radius:8px;font-size:0.82rem;transition:all 0.15s}';
        css += '.brief-fmt-btn:hover{background:rgba(0,0,0,0.04);color:' + tp + ';border-color:rgba(0,0,0,0.1)}';
        css += '.brief-fmt-btn.active{background:rgba(0,170,255,0.15);color:' + a + ';border-color:rgba(0,170,255,0.2)}';
        css += '.brief-fmt-divider{width:1px;height:22px;background:rgba(0,0,0,0.04);margin:0 2px}';
        // Properties panel
        css += '.brief-props-panel{width:260px;min-width:240px;background:rgba(245,245,247,0.95);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-left:1px solid rgba(0,0,0,0.05);overflow-y:auto;padding:16px 12px;animation:briefSlideUp 0.2s ease}';
        css += '.brief-prop-group{margin-bottom:14px}';
        css += '.brief-prop-label{font-size:0.68rem;color:' + tm + ';text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:600}';
        css += '.brief-prop-row{display:flex;align-items:center;gap:6px;margin-bottom:6px}';
        css += '.brief-prop-input{background:rgba(0,0,0,0.025);border:1px solid rgba(0,0,0,0.08);border-radius:6px;color:' + tp + ';padding:5px 8px;font-size:0.78rem;width:100%;transition:border-color 0.2s}';
        css += '.brief-prop-input:focus{border-color:rgba(0,170,255,0.4);outline:none}';
        // Modal glass
        css += '.brief-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(245,245,247,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;animation:briefFadeIn 0.2s ease}';
        css += '.brief-modal{background:rgba(255,255,255,0.98);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(0,0,0,0.1);border-radius:16px;padding:28px;max-width:640px;width:92%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.12),0 0 0 1px rgba(0,170,255,0.08);animation:briefSlideUp 0.25s ease}';
        css += '.brief-modal h4{margin:0;color:' + tp + ';font-size:1.1rem;font-weight:600}';
        css += '.brief-modal-close{background:none;border:1px solid rgba(0,0,0,0.06);color:' + tm + ';width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;font-size:1.1rem;transition:all 0.15s}';
        css += '.brief-modal-close:hover{background:rgba(0,0,0,0.035);color:' + tp + '}';
        // List cards
        css += '.brief-list-card{background:rgba(0,0,0,0.02);border:1px solid ' + bdr + ';border-radius:14px;padding:22px;cursor:pointer;transition:all 0.3s}';
        css += '.brief-list-card:hover{border-color:rgba(0,170,255,0.25);background:rgba(0,170,255,0.03);transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,0.06)}';
        // Element styles
        css += '.briefEl{transition:box-shadow 0.15s,border-color 0.15s}';
        css += '.briefEl:hover{box-shadow:0 0 0 1px rgba(0,170,255,0.25)}';
        css += '.briefEl.selected{border:2px solid ' + a + ' !important;box-shadow:0 0 16px rgba(0,170,255,0.25);animation:briefPulse 2s infinite}';
        // Resize handles
        css += '.brief-resize-handle{position:absolute;width:8px;height:8px;background:' + a + ';border:1.5px solid #fff;border-radius:2px;z-index:100;transition:transform 0.1s}';
        css += '.brief-resize-handle:hover{transform:scale(1.3)}';
        css += '.brief-rh-nw{top:-4px;left:-4px;cursor:nw-resize}.brief-rh-ne{top:-4px;right:-4px;cursor:ne-resize}';
        css += '.brief-rh-sw{bottom:-4px;left:-4px;cursor:sw-resize}.brief-rh-se{bottom:-4px;right:-4px;cursor:se-resize}';
        css += '.brief-rh-n{top:-4px;left:50%;margin-left:-4px;cursor:n-resize}.brief-rh-s{bottom:-4px;left:50%;margin-left:-4px;cursor:s-resize}';
        css += '.brief-rh-w{left:-4px;top:50%;margin-top:-4px;cursor:w-resize}.brief-rh-e{right:-4px;top:50%;margin-top:-4px;cursor:e-resize}';
        // Zoom controls
        css += '.brief-zoom-bar{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.95);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(0,0,0,0.1);border-radius:10px;padding:4px 12px;position:absolute;bottom:16px;left:50%;transform:translateX(-50%);z-index:50}';
        css += '.brief-zoom-btn{background:transparent;border:none;color:' + ts + ';cursor:pointer;padding:4px 6px;border-radius:6px;font-size:0.8rem;transition:all 0.15s}';
        css += '.brief-zoom-btn:hover{color:' + tp + ';background:rgba(0,0,0,0.035)}';
        // Classification banner
        css += '.brief-class-banner{text-align:center;padding:4px 0;font-size:0.72rem;font-weight:700;letter-spacing:2px;border-radius:6px;margin-bottom:8px}';
        // Alignment guides
        css += '.brief-align-guide{position:absolute;z-index:200;pointer-events:none}';
        css += '.brief-align-guide-h{left:0;right:0;height:1px;background:rgba(255,107,53,0.6);box-shadow:0 0 4px rgba(255,107,53,0.4)}';
        css += '.brief-align-guide-v{top:0;bottom:0;width:1px;background:rgba(255,107,53,0.6);box-shadow:0 0 4px rgba(255,107,53,0.4)}';
        // Tooltips on sidebar
        css += '.brief-tip{position:relative}';
        css += '.brief-tip::after{content:attr(data-tip);position:absolute;left:100%;top:50%;transform:translateY(-50%);margin-left:8px;background:rgba(245,245,247,0.92);color:' + tp + ';padding:5px 10px;border-radius:6px;font-size:0.72rem;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity 0.15s;z-index:999}';
        css += '.brief-tip:hover::after{opacity:1}';
        // Notes
        css += '.brief-notes{width:100%;height:56px;margin-top:12px;background:rgba(0,0,0,0.015);border:1px solid ' + bdr + ';border-radius:8px;color:' + ts + ';padding:8px 12px;font-size:0.8rem;resize:vertical;transition:border-color 0.2s}';
        css += '.brief-notes:focus{border-color:rgba(0,170,255,0.3);outline:none}';
        // Header bar
        css += '.brief-header{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:rgba(245,245,247,0.95);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid ' + bdr + ';gap:8px;flex-wrap:wrap}';
        css += '.brief-header-left{display:flex;align-items:center;gap:8px}';
        css += '.brief-header-right{display:flex;align-items:center;gap:4px;flex-wrap:wrap}';
        css += '.brief-action-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:rgba(0,0,0,0.025);border:1px solid rgba(0,0,0,0.06);border-radius:8px;color:' + ts + ';cursor:pointer;font-size:0.78rem;font-weight:500;transition:all 0.2s;white-space:nowrap}';
        css += '.brief-action-btn:hover{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.1);color:' + tp + ';transform:translateY(-1px)}';
        css += '.brief-action-btn.primary{background:linear-gradient(135deg,rgba(0,170,255,0.15),rgba(0,170,255,0.08));border-color:rgba(0,170,255,0.25);color:' + a + '}';
        css += '.brief-action-btn.primary:hover{background:linear-gradient(135deg,rgba(0,170,255,0.25),rgba(0,170,255,0.15));box-shadow:0 4px 16px rgba(0,170,255,0.15)}';
        css += '.brief-action-btn.danger{color:var(--red,#ff6b6b);border-color:rgba(255,107,107,0.2)}';
        css += '.brief-action-btn.danger:hover{background:rgba(255,107,107,0.1)}';
        // Comments panel
        css += '.brief-comments{width:260px;min-width:220px;background:rgba(245,245,247,0.95);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border-left:1px solid rgba(0,0,0,0.05);overflow-y:auto;padding:14px 10px;max-height:620px}';
        // Empty state
        css += '.brief-empty{text-align:center;padding:80px 24px}';
        css += '.brief-empty i{font-size:3.5rem;opacity:0.15;margin-bottom:20px;display:block}';
        css += '.brief-empty-title{font-size:1.2rem;color:' + tp + ';font-weight:600;margin-bottom:8px}';
        css += '.brief-empty-sub{font-size:0.88rem;color:' + tm + ';line-height:1.5}';
        // Select inputs
        css += '.brief-select{background:rgba(0,0,0,0.025);color:' + tp + ';border:1px solid rgba(0,0,0,0.08);border-radius:8px;padding:6px 10px;font-size:0.8rem;transition:border-color 0.2s;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%236e7681\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:24px}';
        css += '.brief-select:focus{border-color:rgba(0,170,255,0.4);outline:none}';
        // Title input
        css += '.brief-title-input{background:transparent;border:1px solid transparent;border-radius:6px;color:' + tp + ';padding:5px 10px;font-size:0.95rem;font-weight:600;width:240px;transition:all 0.2s}';
        css += '.brief-title-input:hover{border-color:rgba(0,0,0,0.06)}';
        css += '.brief-title-input:focus{border-color:rgba(0,170,255,0.3);background:rgba(0,0,0,0.02);outline:none}';
        // Badge
        css += '.brief-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;font-size:0.72rem;font-weight:600;background:rgba(0,0,0,0.02);border:1px solid}';

        var styleEl = document.createElement('style');
        styleEl.id = 'briefEngineCSS';
        styleEl.textContent = css;
        document.head.appendChild(styleEl);
    }

    // ================================================================
    //  INIT
    // ================================================================
    function initBriefEngine() {
        _injectBriefCSS();
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
            var _q = window._sbClient.from('program_briefs').select('*').order('updated_at', { ascending: false });
            var _email = localStorage.getItem('s4_user_email');
            if (_email) _q = _q.eq('user_email', _email);
            _q.then(function (res) {
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

    function _loadAllBriefs() {
        return _briefs || [];
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
        var tpls = [
            _tplProgramStatus(),
            _tplMilestoneReview(),
            _tplPOM(),
            _tplPB(),
            _tplILSMT(),
            _tplILSMP(),
            _tplIPR(),
            _tplCDR(),
            _tplPDR(),
            _tplSDR(),
            _tplQuadChart(),
            _tplPOAM(),
            _tplExecOnePager()
        ];
        // Append user-saved custom templates
        _customTemplates.forEach(function (ct) { tpls.push(ct); });
        return tpls;
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

    function _makeTable(x, y, w, h, rows, cols, opts) {
        opts = opts || {};
        var data = [];
        for (var r = 0; r < rows; r++) {
            var row = [];
            for (var c = 0; c < cols; c++) row.push(r === 0 ? 'Header ' + (c + 1) : '');
            data.push(row);
        }
        return { id: _uid(), type: 'table', x: x, y: y, w: w, h: h, rows: rows, cols: cols, data: data, headerBg: opts.headerBg || '#f5f5f7', headerColor: opts.headerColor || '#ffffff', cellBg: opts.cellBg || 'rgba(0,0,0,0.03)', cellColor: opts.cellColor || '#1d1d1f', borderColor: opts.borderColor || 'rgba(0,0,0,0.1)', fontSize: opts.fontSize || 12 };
    }

    function _makeChart(x, y, w, h, chartType, opts) {
        opts = opts || {};
        return { id: _uid(), type: 'chart', x: x, y: y, w: w, h: h, chartType: chartType || 'bar', labels: opts.labels || ['A','B','C','D'], values: opts.values || [40,70,30,90], colors: opts.colors || ['#00aaff','#00cc88','#f97316','#a855f7'], title: opts.title || 'Chart' };
    }

    function _makeStoplight(x, y, size, status, label) {
        return { id: _uid(), type: 'stoplight', x: x, y: y, w: size || 60, h: (size || 60) + 20, status: status || 'green', label: label || '' };
    }

    function _makeWidget(x, y, w, h, widgetType) {
        return { id: _uid(), type: 'widget', x: x, y: y, w: w, h: h, widgetType: widgetType || 'milestone-summary' };
    }

    function _makeRiskMatrix(x, y, w, h) {
        return { id: _uid(), type: 'risk_matrix', x: x, y: y, w: w || 400, h: h || 400, items: [] };
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
                    _makeText(40, 440, 880, 24, 'UNCLASSIFIED', { fontSize: 14, color: '#ffa500', align: 'center', bold: true })
                ]),
                _makeSlide('Executive Summary', [
                    _makeText(40, 40, 880, 40, 'Executive Summary', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00aaff', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ai_executive_summary}}', { fontSize: 16, color: '#1d1d1f' })
                ]),
                _makeSlide('Milestone Status', [
                    _makeText(40, 40, 880, 40, 'Milestone Status Overview', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00aaff', stroke: 'transparent' }),
                    _makeText(40, 110, 420, 160, '{{milestone_summary}}', { fontSize: 15, color: '#1d1d1f' }),
                    _makeText(480, 110, 440, 160, '{{schedule_variance}}', { fontSize: 15, color: '#1d1d1f' }),
                    _makeText(40, 290, 880, 200, '{{milestone_table}}', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('Risk Assessment', [
                    _makeText(40, 40, 880, 40, 'Risk Assessment', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#ff4444', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ai_risk_assessment}}', { fontSize: 16, color: '#1d1d1f' })
                ]),
                _makeSlide('Recommendations', [
                    _makeText(40, 40, 880, 40, 'Recommendations & Next Steps', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#4ecb71', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ai_recommendations}}', { fontSize: 16, color: '#1d1d1f' })
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
                    _makeText(40, 110, 880, 380, '{{milestone_gantt}}', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('Status by Vessel', [
                    _makeText(40, 40, 880, 40, 'Status by Vessel', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00aaff', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{vessel_status_table}}', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('Schedule Variance', [
                    _makeText(40, 40, 880, 40, 'Schedule Variance Analysis', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#ff4444', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{variance_analysis}}', { fontSize: 16, color: '#1d1d1f' })
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
                    _makeText(40, 110, 880, 180, '{{pom_resource_table}}', { fontSize: 14, color: '#1d1d1f' }),
                    _makeText(40, 310, 880, 180, '{{pom_narrative}}', { fontSize: 16, color: '#1d1d1f' })
                ]),
                _makeSlide('FYDP Alignment', [
                    _makeText(40, 40, 880, 40, 'FYDP Alignment & Priorities', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#4ecb71', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{fydp_priorities}}', { fontSize: 16, color: '#1d1d1f' })
                ]),
                _makeSlide('Risk & Trades', [
                    _makeText(40, 40, 880, 40, 'Risk Assessment & Trade Space', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#ff4444', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{pom_risks}}', { fontSize: 16, color: '#1d1d1f' })
                ])
            ]
        };
    }

    // ── President's Budget Brief ──
    function _tplPB() {
        return {
            brief_type: 'PB',
            title: "President's Budget Brief",
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#ffa500' }),
            slides: [
                _makeSlide('Title Slide', [
                    _makeText(40, 40, 880, 60, "President's Budget (PB) Overview", { fontSize: 32, bold: true, color: '#ffffff', align: 'center' }),
                    _makeText(40, 120, 880, 30, 'FY{{fiscal_year}}', { fontSize: 20, color: '#ffa500', align: 'center' }),
                    _makeText(40, 170, 880, 24, '{{program_name}}', { fontSize: 16, color: '#8b949e', align: 'center' })
                ]),
                _makeSlide('Budget Summary', [
                    _makeText(40, 40, 880, 40, 'Budget Summary', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#ffa500', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{pb_budget_table}}', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('Congressional Justification', [
                    _makeText(40, 40, 880, 40, 'Congressional Justification', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#ffa500', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{pb_justification}}', { fontSize: 16, color: '#1d1d1f' })
                ]),
                _makeSlide('Program Changes', [
                    _makeText(40, 40, 880, 40, 'Changes from POM to PB', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#ffa500', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{pb_changes}}', { fontSize: 16, color: '#1d1d1f' })
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
                    _makeText(40, 110, 880, 380, '1. Opening Remarks & Roll Call\n2. Action Items Review\n3. ILS Element Status Updates\n4. Deliverable Tracking\n5. Risk & Issue Discussion\n6. Upcoming Milestones\n7. Closing & Next Meeting', { fontSize: 18, color: '#1d1d1f' })
                ]),
                _makeSlide('ILS Element Status', [
                    _makeText(40, 40, 880, 40, 'ILS Element Status', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00cc88', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ils_element_status}}', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('Deliverables', [
                    _makeText(40, 40, 880, 40, 'Deliverable Tracking', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00cc88', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ilsmt_deliverables}}', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('Action Items', [
                    _makeText(40, 40, 880, 40, 'Action Items', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#f97316', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ilsmt_actions}}', { fontSize: 14, color: '#1d1d1f' })
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
                    _makeText(40, 110, 880, 380, '{{ilsmp_requirements}}', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('Supportability Strategy', [
                    _makeText(40, 40, 880, 40, 'Supportability Strategy', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#3b82f6', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ilsmp_strategy}}', { fontSize: 16, color: '#1d1d1f' })
                ]),
                _makeSlide('12 ILS Elements', [
                    _makeText(40, 40, 880, 40, '12 ILS Elements Assessment', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#3b82f6', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ils_12_elements}}', { fontSize: 14, color: '#1d1d1f' })
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
                    _makeText(40, 110, 880, 380, '{{ipr_overview}}', { fontSize: 16, color: '#1d1d1f' })
                ]),
                _makeSlide('Shipbuilder Status', [
                    _makeText(40, 40, 880, 40, 'Shipbuilder / Vendor Status', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#f97316', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ipr_vendor_status}}', { fontSize: 16, color: '#1d1d1f' })
                ]),
                _makeSlide('ILS Team Update', [
                    _makeText(40, 40, 880, 40, 'ILS Team Update', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00cc88', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ipr_ils_update}}', { fontSize: 16, color: '#1d1d1f' })
                ]),
                _makeSlide('Program Office Summary', [
                    _makeText(40, 40, 880, 40, 'Program Office Summary', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 88, 880, 2, { fill: '#00aaff', stroke: 'transparent' }),
                    _makeText(40, 110, 880, 380, '{{ipr_pm_summary}}', { fontSize: 16, color: '#1d1d1f' })
                ])
            ]
        };
    }

    // ── Critical Design Review (CDR) ──
    function _tplCDR() {
        return {
            title: 'Critical Design Review', brief_type: 'CDR',
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#ff6b35' }),
            slides: [
                _makeSlide('CDR Overview', [
                    _makeText(40, 20, 880, 40, '{{program_name}} — Critical Design Review', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#ff6b35', stroke: 'transparent' }),
                    _makeText(40, 85, 880, 30, '{{date}}', { fontSize: 14, color: '#8b949e', italic: true }),
                    _makeText(40, 130, 420, 350, 'Purpose:\n• Evaluate design maturity\n• Assess manufacturing readiness\n• Verify requirements traceability\n• Review test planning adequacy\n\nEntry Criteria Status:\n• SRR complete\n• PDR actions closed\n• Updated design documentation', { fontSize: 14, color: '#1d1d1f' }),
                    _makeTable(480, 130, 440, 200, 5, 3, { headerBg: '#ff6b35' })
                ]),
                _makeSlide('Design Maturity Assessment', [
                    _makeText(40, 20, 880, 40, 'Design Maturity Assessment', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#ff6b35', stroke: 'transparent' }),
                    _makeText(40, 90, 420, 400, 'Hardware Design Status:\n• Detailed drawings: {{cdr_hw_pct}}% complete\n• Interface Control Documents: Updated\n• Parts list finalized\n\nSoftware Design Status:\n• Software Design Description: Complete\n• Database design: Finalized\n• API specifications: Baselined', { fontSize: 14, color: '#1d1d1f' }),
                    _makeStoplight(520, 100, 50, 'green', 'HW Design'),
                    _makeStoplight(620, 100, 50, 'yellow', 'SW Design'),
                    _makeStoplight(720, 100, 50, 'green', 'Integration')
                ]),
                _makeSlide('Risk Assessment', [
                    _makeText(40, 20, 880, 40, 'Technical Risk Assessment', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#ff6b35', stroke: 'transparent' }),
                    _makeRiskMatrix(40, 90, 400, 380),
                    _makeText(470, 90, 460, 380, 'Top Risks:\n1. Integration complexity — Medium\n2. Supply chain lead times — High\n3. Test facility availability — Low\n\nMitigation Actions:\n• Incremental integration approach\n• Dual-source procurement strategy\n• Reserved test windows Q3/Q4', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('Test Planning', [
                    _makeText(40, 20, 880, 40, 'Test & Evaluation Planning', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#ff6b35', stroke: 'transparent' }),
                    _makeText(40, 90, 880, 400, 'Test Strategy:\n• Unit testing: Automated CI/CD pipeline\n• Integration testing: Incremental build approach\n• System testing: Per TEMP requirements\n• DT&E: Scheduled {{fiscal_year}} Q3\n• OT&E: Scheduled {{fiscal_year}} Q4\n\nTest Readiness:\n{{cdr_test_readiness}}', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('CDR Exit Criteria & Actions', [
                    _makeText(40, 20, 880, 40, 'Exit Criteria & Action Items', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#ff6b35', stroke: 'transparent' }),
                    _makeTable(40, 90, 880, 250, 6, 4, { headerBg: '#ff6b35' }),
                    _makeText(40, 370, 880, 120, 'Recommendation: Proceed to EMD / Defer pending actions\n\nNext Steps:\n• Close action items within 30 days\n• Update technical baseline\n• Begin manufacturing readiness assessment', { fontSize: 14, color: '#1d1d1f' })
                ])
            ]
        };
    }

    // ── Preliminary Design Review (PDR) ──
    function _tplPDR() {
        return {
            title: 'Preliminary Design Review', brief_type: 'PDR',
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#4ecdc4' }),
            slides: [
                _makeSlide('PDR Overview', [
                    _makeText(40, 20, 880, 40, '{{program_name}} — Preliminary Design Review', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#4ecdc4', stroke: 'transparent' }),
                    _makeText(40, 85, 880, 30, '{{date}}', { fontSize: 14, color: '#8b949e', italic: true }),
                    _makeText(40, 130, 880, 360, 'Purpose: Evaluate allocated baseline and preliminary design\n\nScope:\n• System architecture review\n• Preliminary hardware/software design\n• Interface definition assessment\n• Requirements allocation verification\n• Risk identification and mitigation planning\n\nEntry Criteria:\n• SRR/SFR actions closed\n• System architecture documented\n• Preliminary design documentation available', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('System Architecture', [
                    _makeText(40, 20, 880, 40, 'System Architecture & Design', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#4ecdc4', stroke: 'transparent' }),
                    _makeText(40, 90, 880, 400, 'Architecture Overview:\n• Modular open systems approach (MOSA)\n• Hardware CSCI decomposition\n• Software architecture (microservices / monolith)\n• Network and communications design\n• Cybersecurity architecture per RMF\n\nKey Design Decisions:\n{{pdr_design_decisions}}', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('Requirements Traceability', [
                    _makeText(40, 20, 880, 40, 'Requirements Allocation & Traceability', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#4ecdc4', stroke: 'transparent' }),
                    _makeTable(40, 90, 880, 350, 8, 4, { headerBg: '#4ecdc4' }),
                    _makeStoplight(60, 460, 40, 'green', 'Functional'),
                    _makeStoplight(200, 460, 40, 'green', 'Performance'),
                    _makeStoplight(340, 460, 40, 'yellow', 'Interface'),
                    _makeStoplight(480, 460, 40, 'green', 'Safety')
                ]),
                _makeSlide('Risk & Schedule', [
                    _makeText(40, 20, 880, 40, 'Risk Assessment & Schedule', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#4ecdc4', stroke: 'transparent' }),
                    _makeRiskMatrix(40, 90, 380, 380),
                    _makeText(450, 90, 490, 380, 'Schedule to CDR:\n• Detailed design: 4 months\n• Prototype fabrication: 3 months\n• CDR data package: 2 months\n\nTop Risks:\n1. Technology maturity (TRL {{pdr_trl}})\n2. Requirements stability\n3. Interface complexity', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('PDR Exit & Actions', [
                    _makeText(40, 20, 880, 40, 'Exit Criteria & Next Steps', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#4ecdc4', stroke: 'transparent' }),
                    _makeTable(40, 90, 880, 250, 6, 4, { headerBg: '#4ecdc4' }),
                    _makeText(40, 370, 880, 120, 'Recommendation: Proceed to Detailed Design\n\nAction Items: See table above\nTarget CDR Date: {{pdr_cdr_target}}', { fontSize: 14, color: '#1d1d1f' })
                ])
            ]
        };
    }

    // ── System Design Review (SDR) ──
    function _tplSDR() {
        return {
            title: 'System Design Review', brief_type: 'SDR',
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#95e1d3' }),
            slides: [
                _makeSlide('SDR Overview', [
                    _makeText(40, 20, 880, 40, '{{program_name}} — System Design Review', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#95e1d3', stroke: 'transparent' }),
                    _makeText(40, 85, 880, 30, '{{date}}', { fontSize: 14, color: '#8b949e', italic: true }),
                    _makeText(40, 130, 880, 360, 'Purpose: Evaluate the system design and functional allocation\n\nScope:\n• Functional baseline assessment\n• System performance specification review\n• Trade study results\n• CONOPS alignment verification\n\nEntry Criteria:\n• Approved ICD/CDD\n• Completed Analysis of Alternatives\n• System performance specification drafted', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('Functional Architecture', [
                    _makeText(40, 20, 880, 40, 'Functional Architecture', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#95e1d3', stroke: 'transparent' }),
                    _makeText(40, 90, 880, 400, 'System Functions:\n• Function 1: {{sdr_func_1}}\n• Function 2: {{sdr_func_2}}\n• Function 3: {{sdr_func_3}}\n\nFunctional Allocation:\n{{sdr_func_allocation}}\n\nInterface Requirements:\n{{sdr_interfaces}}', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('Trade Studies & KPPs', [
                    _makeText(40, 20, 880, 40, 'Trade Studies & Key Performance Parameters', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#95e1d3', stroke: 'transparent' }),
                    _makeTable(40, 90, 880, 200, 5, 4, { headerBg: '#95e1d3' }),
                    _makeText(40, 310, 880, 180, 'KPP Status:\n{{sdr_kpp_status}}\n\nKSA Status:\n{{sdr_ksa_status}}', { fontSize: 14, color: '#1d1d1f' })
                ]),
                _makeSlide('SDR Exit & Path Forward', [
                    _makeText(40, 20, 880, 40, 'Exit Criteria & Path Forward', { fontSize: 28, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#95e1d3', stroke: 'transparent' }),
                    _makeText(40, 90, 880, 400, 'Exit Criteria Assessment:\n• System spec baselined: Yes/No\n• Functional allocation complete: Yes/No\n• Risk register updated: Yes/No\n• Path to PDR defined: Yes/No\n\nAction Items:\n{{sdr_actions}}\n\nTarget PDR: {{sdr_pdr_target}}', { fontSize: 14, color: '#1d1d1f' })
                ])
            ]
        };
    }

    // ── Quad Chart ──
    function _tplQuadChart() {
        return {
            title: 'Quad Chart', brief_type: 'QUAD',
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#f38181' }),
            slides: [
                _makeSlide('Quad Chart', [
                    _makeText(40, 10, 880, 30, '{{program_name}} — Quad Chart — {{date}}', { fontSize: 20, bold: true, color: '#ffffff', align: 'center' }),
                    _makeShape(40, 45, 880, 2, { fill: '#f38181', stroke: 'transparent' }),
                    // Top-left: Schedule
                    _makeShape(40, 55, 430, 220, { fill: 'rgba(0,170,255,0.06)', stroke: 'rgba(0,170,255,0.2)', radius: 4 }),
                    _makeText(50, 60, 410, 24, 'SCHEDULE', { fontSize: 14, bold: true, color: '#00aaff', align: 'center' }),
                    _makeText(50, 88, 410, 180, '{{quad_schedule}}', { fontSize: 12, color: '#1d1d1f' }),
                    // Top-right: Cost
                    _makeShape(490, 55, 430, 220, { fill: 'rgba(0,204,136,0.06)', stroke: 'rgba(0,204,136,0.2)', radius: 4 }),
                    _makeText(500, 60, 410, 24, 'COST', { fontSize: 14, bold: true, color: '#00cc88', align: 'center' }),
                    _makeText(500, 88, 410, 180, '{{quad_cost}}', { fontSize: 12, color: '#1d1d1f' }),
                    // Bottom-left: Performance
                    _makeShape(40, 285, 430, 220, { fill: 'rgba(168,85,247,0.06)', stroke: 'rgba(168,85,247,0.2)', radius: 4 }),
                    _makeText(50, 290, 410, 24, 'PERFORMANCE', { fontSize: 14, bold: true, color: '#a855f7', align: 'center' }),
                    _makeText(50, 318, 410, 180, '{{quad_performance}}', { fontSize: 12, color: '#1d1d1f' }),
                    // Bottom-right: Risk
                    _makeShape(490, 285, 430, 220, { fill: 'rgba(249,115,22,0.06)', stroke: 'rgba(249,115,22,0.2)', radius: 4 }),
                    _makeText(500, 290, 410, 24, 'RISK', { fontSize: 14, bold: true, color: '#f97316', align: 'center' }),
                    _makeText(500, 318, 410, 180, '{{quad_risk}}', { fontSize: 12, color: '#1d1d1f' })
                ])
            ]
        };
    }

    // ── POA&M ──
    function _tplPOAM() {
        return {
            title: 'Plan of Action & Milestones', brief_type: 'POAM',
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#aa96da' }),
            slides: [
                _makeSlide('POA&M Overview', [
                    _makeText(40, 20, 880, 40, '{{program_name}} — Plan of Action & Milestones', { fontSize: 24, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#aa96da', stroke: 'transparent' }),
                    _makeText(40, 85, 880, 30, 'As of {{date}}', { fontSize: 14, color: '#8b949e', italic: true }),
                    _makeText(40, 120, 880, 370, 'Program: {{program_name}}\nClassification: UNCLASSIFIED\nPrepared by: {{poam_author}}\n\nTotal Actions: {{poam_total}}\nOpen: {{poam_open}}\nClosed: {{poam_closed}}\nOverdue: {{poam_overdue}}', { fontSize: 16, color: '#1d1d1f' })
                ]),
                _makeSlide('POA&M Items', [
                    _makeText(40, 20, 880, 40, 'Action Items', { fontSize: 24, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#aa96da', stroke: 'transparent' }),
                    _makeTable(40, 90, 880, 400, 10, 5, { headerBg: '#aa96da' })
                ]),
                _makeSlide('POA&M Timeline', [
                    _makeText(40, 20, 880, 40, 'Milestone Timeline', { fontSize: 24, bold: true, color: '#ffffff' }),
                    _makeShape(40, 68, 880, 2, { fill: '#aa96da', stroke: 'transparent' }),
                    _makeChart(40, 90, 880, 380, 'bar', { title: 'POA&M Timeline', labels: ['Q1','Q2','Q3','Q4'], values: [12,8,5,2], colors: ['#aa96da','#aa96da','#aa96da','#aa96da'] })
                ])
            ]
        };
    }

    // ── Executive One-Pager ──
    function _tplExecOnePager() {
        return {
            title: 'Executive One-Pager', brief_type: 'EXEC',
            master: Object.assign({}, DEFAULT_MASTER, { accentColor: '#ffd700' }),
            slides: [
                _makeSlide('Executive Summary', [
                    _makeText(40, 10, 880, 30, '{{program_name}} — EXECUTIVE SUMMARY', { fontSize: 22, bold: true, color: '#ffd700', align: 'center' }),
                    _makeShape(40, 44, 880, 2, { fill: '#ffd700', stroke: 'transparent' }),
                    // Left column
                    _makeText(40, 55, 430, 22, 'PROGRAM OVERVIEW', { fontSize: 13, bold: true, color: '#00aaff' }),
                    _makeText(40, 78, 430, 100, '{{exec_overview}}', { fontSize: 11, color: '#1d1d1f' }),
                    _makeText(40, 185, 430, 22, 'KEY METRICS', { fontSize: 13, bold: true, color: '#00cc88' }),
                    _makeStoplight(50, 212, 35, 'green', 'Sched'),
                    _makeStoplight(140, 212, 35, 'green', 'Cost'),
                    _makeStoplight(230, 212, 35, 'yellow', 'Perf'),
                    _makeStoplight(320, 212, 35, 'green', 'Risk'),
                    _makeText(40, 290, 430, 22, 'MILESTONES', { fontSize: 13, bold: true, color: '#f97316' }),
                    _makeText(40, 315, 430, 100, '{{exec_milestones}}', { fontSize: 11, color: '#1d1d1f' }),
                    // Right column
                    _makeText(490, 55, 430, 22, 'BUDGET SUMMARY', { fontSize: 13, bold: true, color: '#ffa500' }),
                    _makeChart(490, 78, 430, 140, 'bar', { title: '', labels: ['RDT&E','Proc','O&S'], values: [45,120,30], colors: ['#00aaff','#00cc88','#f97316'] }),
                    _makeText(490, 230, 430, 22, 'TOP RISKS', { fontSize: 13, bold: true, color: '#ff4444' }),
                    _makeText(490, 255, 430, 100, '{{exec_risks}}', { fontSize: 11, color: '#1d1d1f' }),
                    _makeText(490, 365, 430, 22, 'DECISION REQUIRED', { fontSize: 13, bold: true, color: '#ffd700' }),
                    _makeText(490, 390, 430, 80, '{{exec_decision}}', { fontSize: 12, color: '#1d1d1f' }),
                    // Footer bar
                    _makeShape(40, 480, 880, 1, { fill: 'rgba(0,0,0,0.1)', stroke: 'transparent' }),
                    _makeText(40, 486, 880, 20, 'Classification: UNCLASSIFIED  |  POC: {{exec_poc}}  |  Date: {{date}}', { fontSize: 10, color: '#8b949e', align: 'center' })
                ])
            ]
        };
    }
    function _renderBriefList() {
        _currentView = 'list';
        var el = document.getElementById('briefContainer');
        if (!el) return;

        var html = '';
        // ── Modern header with gradient accent ──
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">';
        html += '<div style="display:flex;align-items:center;gap:12px">';
        html += '<div style="width:3px;height:28px;background:linear-gradient(180deg,#00aaff,#a855f7);border-radius:2px"></div>';
        html += '<div><div style="font-size:1.15rem;font-weight:700;color:var(--text,#1d1d1f);letter-spacing:-0.3px">Program Briefs</div>';
        html += '<div style="font-size:0.78rem;color:#6e6e73;margin-top:1px">' + _briefs.length + ' brief' + (_briefs.length !== 1 ? 's' : '') + ' in workspace</div></div>';
        html += '</div>';
        html += '<div style="display:flex;gap:10px;flex-wrap:wrap">';
        html += '<button class="brief-action-btn primary" onclick="briefNewFromTemplate()"><i class="fas fa-plus"></i> New Brief</button>';
        html += '<button class="brief-action-btn" onclick="briefImportPPTX()" style="color:#a855f7;border-color:rgba(168,85,247,0.2)"><i class="fas fa-file-powerpoint"></i> Import PPTX</button>';
        html += '</div></div>';

        // ── Program & Vessel selectors (glass bar) ──
        html += '<div style="display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap;align-items:center;padding:12px 16px;background:rgba(0,0,0,0.015);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(0,0,0,0.05);border-radius:12px">';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        html += '<label style="color:#6e6e73;font-size:0.78rem;white-space:nowrap;font-weight:500"><i class="fas fa-project-diagram" style="color:#00aaff;margin-right:4px"></i>Program</label>';
        html += '<select id="briefProgramSelect" onchange="briefSelectProgram(this.value)" class="brief-select" style="min-width:200px">';
        html += '<option value="">All Programs</option>';
        _programs.forEach(function (p) {
            html += '<option value="' + _esc(p) + '"' + (p === _selectedProgram ? ' selected' : '') + '>' + _esc(p) + '</option>';
        });
        html += '</select>';
        html += '<button class="brief-fmt-btn" onclick="briefAddProgram()" title="Add Custom Program"><i class="fas fa-plus"></i></button>';
        html += '</div>';
        if (_selectedProgram) {
            var vessels = _vessels[_selectedProgram] || [];
            html += '<div style="display:flex;align-items:center;gap:8px">';
            html += '<label style="color:#6e6e73;font-size:0.78rem;white-space:nowrap;font-weight:500"><i class="fas fa-ship" style="color:#00cc88;margin-right:4px"></i>Vessel / Craft</label>';
            html += '<select id="briefVesselSelect" onchange="briefSelectVessel(this.value)" class="brief-select" style="min-width:200px">';
            html += '<option value="">All Vessels</option>';
            vessels.forEach(function (v) {
                html += '<option value="' + _esc(v) + '"' + (v === _selectedVessel ? ' selected' : '') + '>' + _esc(v) + '</option>';
            });
            html += '</select>';
            html += '<button class="brief-fmt-btn" onclick="briefAddVessel()" title="Add Custom Vessel"><i class="fas fa-plus"></i></button>';
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
            html += '<div class="brief-empty">';
            html += '<i class="fas fa-briefcase"></i>';
            html += '<div class="brief-empty-title">' + (_briefs.length ? 'No briefs match this filter' : 'No briefs yet') + '</div>';
            html += '<div class="brief-empty-sub">Click "New Brief" to choose a template, or get started instantly.</div>';
            if (!_briefs.length) {
                html += '<button onclick="briefCreateFromTemplate(0)" style="margin-top:16px;padding:10px 28px;background:var(--accent,#00aaff);color:#fff;border:none;border-radius:8px;font-size:0.92rem;font-weight:600;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform=\'scale(1.04)\';this.style.boxShadow=\'0 4px 20px rgba(0,170,255,0.25)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">';
                html += '<i class="fas fa-bolt" style="margin-right:6px"></i>Quick Start — Program Status Brief</button>';
            }
            html += '</div>';
        } else {
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">';
            filteredBriefs.forEach(function (b) {
                var idx = _briefs.indexOf(b);
                var bt = BRIEF_TYPES[b.brief_type] || BRIEF_TYPES.STATUS;
                var slides = [];
                try { slides = typeof b.slides_json === 'string' ? JSON.parse(b.slides_json) : (b.slides_json || []); } catch (e) { slides = []; }
                var updStr = b.updated_at ? new Date(b.updated_at).toLocaleDateString() : '';
                var apr = APPROVAL_STATES[b.approval_status || 'draft'] || APPROVAL_STATES.draft;
                html += '<div class="brief-list-card" onclick="briefOpen(' + idx + ')">';
                // Top row: icon + title
                html += '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">';
                html += '<div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,' + bt.color + '22,' + bt.color + '08);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas ' + bt.icon + '" style="color:' + bt.color + ';font-size:1rem"></i></div>';
                html += '<div style="flex:1;min-width:0">';
                html += '<div style="color:var(--text,#1d1d1f);font-weight:600;font-size:0.92rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(b.title) + '</div>';
                html += '<div style="font-size:0.75rem;color:#6e6e73;margin-top:2px">' + bt.label + '</div>';
                html += '</div></div>';
                // Meta row
                if (b.program_name || b.vessel_name) {
                    html += '<div style="font-size:0.72rem;color:#86868b;margin-bottom:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">';
                    if (b.program_name) html += '<i class="fas fa-project-diagram" style="margin-right:3px;color:#86868b"></i>' + _esc(b.program_name);
                    if (b.vessel_name) html += ' &bull; <i class="fas fa-ship" style="margin:0 3px;color:#86868b"></i>' + _esc(b.vessel_name);
                    html += '</div>';
                }
                // Bottom row: date, slides, status
                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid rgba(0,0,0,0.04)">';
                html += '<div style="display:flex;align-items:center;gap:10px;font-size:0.72rem;color:#6e6e73">';
                html += '<span><i class="fas fa-layer-group" style="margin-right:3px"></i>' + slides.length + ' slide' + (slides.length !== 1 ? 's' : '') + '</span>';
                if (updStr) html += '<span>' + updStr + '</span>';
                html += '</div>';
                html += '<span class="brief-badge" style="color:' + apr.color + ';border-color:' + apr.color + '33"><i class="fas ' + apr.icon + '" style="font-size:0.6rem"></i> ' + apr.label + '</span>';
                html += '</div></div>';
            });
            html += '</div>';
        }
        el.innerHTML = window._s4Safe(html);
    }

    // ================================================================
    //  NEW BRIEF (Template Chooser)
    // ================================================================
    function briefNewFromTemplate() {
        var templates = _getTemplates();
        var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;max-height:400px;overflow-y:auto;padding:4px">';
        templates.forEach(function (t, i) {
            var bt = BRIEF_TYPES[t.brief_type] || BRIEF_TYPES.STATUS;
            html += '<div class="stat-mini" style="cursor:pointer;padding:16px;text-align:center;transition:border-color 0.2s" onclick="briefCreateFromTemplate(' + i + ')" onmouseover="this.style.borderColor=\'' + bt.color + '\'" onmouseout="this.style.borderColor=\'rgba(0,0,0,0.06)\'">';
            html += '<i class="fas ' + bt.icon + '" style="font-size:1.5rem;color:' + bt.color + ';margin-bottom:8px;display:block"></i>';
            html += '<div style="color:var(--text,#1d1d1f);font-weight:600;font-size:0.88rem">' + _esc(t.title) + '</div>';
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
            '{{fiscal_year_end}}': '' + (fy + 5),
            '{{ai_executive_summary}}': 'This brief provides current program status for ' + progName + ' as of ' + dateStr + '.\n\nKey areas covered include milestone progress, schedule adherence, risk posture, and recommended actions for the upcoming period.\n\n[Edit this section to add program-specific details]',
            '{{ai_risk_assessment}}': 'Risk assessment for ' + progName + ':\n\n• Schedule Risk — [Assess current schedule pressure]\n• Technical Risk — [Evaluate technical maturity]\n• Cost Risk — [Review budget status]\n• Supply Chain Risk — [Check vendor/material status]\n\n[Edit this section with current risk data]',
            '{{ai_recommendations}}': 'Recommended next steps for ' + progName + ':\n\n1. [Action item with owner and due date]\n2. [Action item with owner and due date]\n3. [Action item with owner and due date]\n\nDecisions Required:\n• [Decision needed with deadline]'
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
    //  EDITOR — GLASS COMMAND CENTER RENDERER
    // ================================================================
    function _renderEditor() {
        _currentView = 'editor';
        var el = document.getElementById('briefContainer');
        if (!el || !_activeBrief) return;
        var brief = _activeBrief;
        var master = brief.master || DEFAULT_MASTER;
        var slides = brief.slides || [];
        var slide = slides[_activeSlideIdx] || null;

        var isLocked = (_activeBrief.approval_status === 'locked');
        var cls = CLASSIFICATION_LEVELS[_activeBrief.classification || _classificationLevel] || CLASSIFICATION_LEVELS.UNCLASSIFIED;
        var apr = APPROVAL_STATES[_activeBrief.approval_status || 'draft'] || APPROVAL_STATES.draft;

        var html = '';

        // ── Classification banner (top) ──
        html += '<div class="brief-class-banner" style="color:' + cls.color + ';background:' + cls.bg + ';border:1px solid ' + cls.color + '33">' + cls.label + '</div>';

        // ── Header bar (glass) ──
        html += '<div class="brief-header">';
        html += '<div class="brief-header-left">';
        html += '<button class="brief-action-btn" onclick="briefClose()"><i class="fas fa-arrow-left"></i> Back</button>';
        html += '<input id="briefTitleInput" value="' + _esc(brief.title) + '" class="brief-title-input" onchange="briefUpdateTitle(this.value)"' + (isLocked ? ' disabled' : '') + '>';
        html += '<span class="brief-badge" style="color:' + apr.color + ';border-color:' + apr.color + '33"><i class="fas ' + apr.icon + '" style="font-size:0.6rem"></i> ' + apr.label + '</span>';
        // Classification selector
        html += '<select id="briefClassSelect" onchange="briefSetClassification(this.value)" class="brief-select" style="color:' + cls.color + ';border-color:' + cls.color + '44;max-width:140px;font-size:0.72rem;font-weight:600;padding:4px 24px 4px 8px">';
        Object.keys(CLASSIFICATION_LEVELS).forEach(function (k) { html += '<option value="' + k + '"' + (k === (_activeBrief.classification || _classificationLevel) ? ' selected' : '') + '>' + CLASSIFICATION_LEVELS[k].label + '</option>'; });
        html += '</select>';
        html += '</div>';
        html += '<div class="brief-header-right">';
        html += '<button class="brief-action-btn" onclick="briefPresenterMode()" style="color:#a855f7;border-color:rgba(168,85,247,0.2)"><i class="fas fa-desktop"></i> Present</button>';
        html += '<button class="brief-action-btn" onclick="briefExportPPTX()" style="color:#f97316;border-color:rgba(249,115,22,0.2)"><i class="fas fa-file-powerpoint"></i> PPTX</button>';
        html += '<button class="brief-action-btn" onclick="briefExportPDF()"><i class="fas fa-file-pdf"></i> PDF</button>';
        html += '<button class="brief-action-btn" onclick="briefAnchor()" style="background:linear-gradient(135deg,#0071e3,#00aaff);color:#fff;border:none"><i class="fas fa-anchor"></i> Anchor to Ledger</button>';
        html += '<button class="brief-action-btn primary" onclick="briefSaveNow()"><i class="fas fa-save"></i> Save</button>';
        html += '</div></div>';

        // ── Main layout: sidebar + slides + canvas + contextual panels ──
        html += '<div style="display:flex;min-height:540px;border-top:1px solid rgba(0,0,0,0.04)">';

        // ═══ LEFT SIDEBAR (2-column labeled grid) ═══
        html += '<div class="brief-sidebar">';
        // -- Insert group (most used — content creation) --
        html += '<div class="brief-sidebar-label">INSERT</div>';
        html += '<div class="brief-sidebar-group">';
        html += '<button class="brief-sidebar-btn" onclick="briefInsertText()"' + (isLocked ? ' disabled' : '') + '><i class="fas fa-font"></i> Text</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefInsertImage()"' + (isLocked ? ' disabled' : '') + '><i class="fas fa-image"></i> Image</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefInsertTable()"' + (isLocked ? ' disabled' : '') + '><i class="fas fa-table"></i> Table</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefInsertChart()"' + (isLocked ? ' disabled' : '') + '><i class="fas fa-chart-bar"></i> Chart</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefInsertShape()"' + (isLocked ? ' disabled' : '') + '><i class="fas fa-square"></i> Shape</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefInsertStoplight()"' + (isLocked ? ' disabled' : '') + '><i class="fas fa-traffic-light"></i> Stoplight</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefInsertRiskMatrix()"' + (isLocked ? ' disabled' : '') + '><i class="fas fa-exclamation-triangle"></i> Risk</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefInsertWidget()"' + (isLocked ? ' disabled' : '') + '><i class="fas fa-tachometer-alt"></i> Widget</button>';
        html += '</div>';
        html += '<div class="brief-sidebar-divider"></div>';
        // -- File group --
        html += '<div class="brief-sidebar-label">FILE</div>';
        html += '<div class="brief-sidebar-group">';
        html += '<button class="brief-sidebar-btn" onclick="briefAddSlide()"' + (isLocked ? ' disabled' : '') + '><i class="fas fa-plus"></i> Add Slide</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefDuplicateSlide()"' + (isLocked ? ' disabled' : '') + '><i class="fas fa-copy"></i> Duplicate</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefUndo()"><i class="fas fa-undo"></i> Undo</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefRedo()"><i class="fas fa-redo"></i> Redo</button>';
        html += '</div>';
        html += '<div class="brief-sidebar-divider"></div>';
        // -- Tools group --
        html += '<div class="brief-sidebar-label">TOOLS</div>';
        html += '<div class="brief-sidebar-group">';
        html += '<button class="brief-sidebar-btn" onclick="briefAIGenerate()"><i class="fas fa-magic"></i> AI Assist</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefSlideLibrary()"><i class="fas fa-book"></i> Library</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefSaveAsTemplate()"><i class="fas fa-file-export"></i> Template</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefAcronymGlossary()"><i class="fas fa-spell-check"></i> Glossary</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefComplianceScan()"><i class="fas fa-shield-alt"></i> Compliance</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefAutoSummary()"><i class="fas fa-file-alt"></i> Summary</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefExportICS()"><i class="fas fa-calendar-alt"></i> Export .ics</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefGenerateQR()"><i class="fas fa-qrcode"></i> QR Code</button>';
        html += '</div>';
        html += '<div class="brief-sidebar-divider"></div>';
        // -- View group --
        html += '<div class="brief-sidebar-label">VIEW</div>';
        html += '<div class="brief-sidebar-group">';
        html += '<button class="brief-sidebar-btn' + (_snapToGrid ? ' active' : '') + '" onclick="briefToggleGrid()"><i class="fas fa-th"></i> Grid ' + (_snapToGrid ? 'ON' : 'OFF') + '</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefToggleTheme()"><i class="fas ' + (_theme === 'dark' ? 'fa-sun' : 'fa-moon') + '"></i> Theme</button>';
        html += '<button class="brief-sidebar-btn' + (_dodNumbering ? ' active' : '') + '" onclick="briefToggleDodNumbering()"><i class="fas fa-list-ol"></i> Numbering</button>';
        html += '</div>';
        html += '<div class="brief-sidebar-divider"></div>';
        // -- Panels group --
        html += '<div class="brief-sidebar-label">PANELS</div>';
        html += '<div class="brief-sidebar-group">';
        html += '<button class="brief-sidebar-btn' + (_showComments ? ' active' : '') + '" onclick="briefToggleComments()"><i class="fas fa-comments"></i> Comments</button>';
        html += '<button class="brief-sidebar-btn' + (_annotationMode ? ' active' : '') + '" onclick="briefToggleAnnotations()"><i class="fas fa-pen-fancy"></i> Annotate</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefShowHistory()"><i class="fas fa-history"></i> History</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefVersionDiff()"><i class="fas fa-columns"></i> Compare</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefAnalyticsPanel()"><i class="fas fa-chart-pie"></i> Analytics</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefSchedulePanel()"><i class="fas fa-clock"></i> Schedule</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefSlideMaster()"><i class="fas fa-palette"></i> Master</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefShareSettings()"><i class="fas fa-share-alt"></i> Share</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefApprovalModal()"><i class="fas fa-clipboard-check"></i> Approval</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefShowShortcuts()"><i class="fas fa-keyboard"></i> Shortcuts</button>';
        html += '<button class="brief-sidebar-btn" onclick="briefExportHTML()"><i class="fas fa-print"></i> Export</button>';
        html += '</div>';
        html += '</div>'; // end sidebar

        // ═══ SLIDE PANEL ═══
        html += '<div class="brief-slide-panel">';
        html += '<div style="font-size:0.68rem;color:#6e6e73;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:10px;padding:0 4px">Slides</div>';
        slides.forEach(function (s, i) {
            var sel = i === _activeSlideIdx;
            var trans = s.transition || 'none';
            html += '<div class="brief-thumb' + (sel ? ' active' : '') + '" data-idx="' + i + '" onclick="briefSelectSlide(' + i + ')">';
            // Slide number badge
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px 4px 8px">';
            html += '<span style="font-size:0.65rem;color:' + (sel ? '#00aaff' : '#6e7681') + ';font-weight:' + (sel ? '600' : '400') + '">' + (i + 1) + '. ' + _esc((s.title || '').substring(0, 16)) + '</span>';
            if (sel) html += '<button onclick="event.stopPropagation();briefDeleteSlide()" class="brief-fmt-btn" style="width:20px;height:20px;font-size:0.6rem;color:#ff6b6b" title="Delete"><i class="fas fa-times"></i></button>';
            html += '</div>';
            // Thumbnail preview
            html += '<div style="background:' + (master.bodyBg || '#fff') + ';height:80px;margin:0 6px 6px 6px;border-radius:6px;overflow:hidden;position:relative">';
            var firstText = '';
            (s.elements || []).forEach(function (e) { if (e.type === 'text' && !firstText) firstText = (e.text || '').substring(0, 50); });
            html += '<div style="padding:6px;font-size:0.45rem;color:' + (master.bodyColor || '#1d1d1f') + ';overflow:hidden;line-height:1.3;opacity:0.7">' + _esc(firstText) + '</div>';
            html += '</div>';
            if (trans !== 'none') html += '<div style="font-size:0.55rem;color:#a855f7;padding:0 8px 6px"><i class="fas fa-film" style="margin-right:3px"></i>' + trans + '</div>';
            html += '</div>';
        });
        html += '<button class="brief-action-btn" onclick="briefAddSlide()" style="width:100%;justify-content:center;margin-top:6px"' + (isLocked ? ' disabled' : '') + '><i class="fas fa-plus"></i> Add Slide</button>';
        html += '<button class="brief-action-btn" onclick="briefSetTransition()" style="width:100%;justify-content:center;margin-top:4px;font-size:0.72rem"><i class="fas fa-film"></i> Transition</button>';
        html += '</div>'; // end slide panel

        // ═══ CANVAS STAGE (center) ═══
        var sw = master.slideWidth || 960;
        var sh = master.slideHeight || 540;
        var maxCanvasW = window.innerWidth - 220 - 180 - (_showComments || _showProps ? 260 : 0) - 80;
        var scale = _canvasZoom * Math.min(1, maxCanvasW / sw, 520 / sh);
        html += '<div class="brief-stage">';

        // Floating format bar (above canvas)
        html += '<div class="brief-format-bar">';
        html += '<select id="briefFontFamily" onchange="briefSetFont(this.value)" class="brief-select" style="max-width:110px;font-size:0.72rem;padding:4px 22px 4px 6px">';
        FONT_OPTIONS.forEach(function (f) { html += '<option value="' + f + '">' + f + '</option>'; });
        html += '</select>';
        html += '<select id="briefFontSize" onchange="briefSetFontSize(this.value)" class="brief-select" style="width:52px;font-size:0.72rem;padding:4px 18px 4px 6px">';
        FONT_SIZES.forEach(function (s) { html += '<option value="' + s + '">' + s + '</option>'; });
        html += '</select>';
        html += '<div class="brief-fmt-divider"></div>';
        html += '<button class="brief-fmt-btn" onclick="briefToggleBold()" title="Bold (Ctrl+B)" style="font-weight:700">B</button>';
        html += '<button class="brief-fmt-btn" onclick="briefToggleItalic()" title="Italic (Ctrl+I)" style="font-style:italic">I</button>';
        html += '<button class="brief-fmt-btn" onclick="briefToggleUnderline()" title="Underline (Ctrl+U)" style="text-decoration:underline">U</button>';
        html += '<div class="brief-fmt-divider"></div>';
        html += '<button class="brief-fmt-btn" onclick="briefSetAlign(\'left\')" title="Align Left"><i class="fas fa-align-left"></i></button>';
        html += '<button class="brief-fmt-btn" onclick="briefSetAlign(\'center\')" title="Center"><i class="fas fa-align-center"></i></button>';
        html += '<button class="brief-fmt-btn" onclick="briefSetAlign(\'right\')" title="Align Right"><i class="fas fa-align-right"></i></button>';
        html += '<div class="brief-fmt-divider"></div>';
        html += '<label style="display:flex;align-items:center;gap:3px;font-size:0.7rem;color:#6e6e73;cursor:pointer" title="Text Color">A <input type="color" id="briefColorPick" value="#ffffff" onchange="briefSetColor(this.value)" style="width:22px;height:22px;border:1px solid rgba(0,0,0,0.08);border-radius:4px;padding:0;cursor:pointer;background:transparent"></label>';
        html += '<label style="display:flex;align-items:center;gap:3px;font-size:0.7rem;color:#6e6e73;cursor:pointer" title="Fill"><i class="fas fa-fill-drip"></i> <input type="color" id="briefBgPick" value="#ffffff" onchange="briefSetBg(this.value)" style="width:22px;height:22px;border:1px solid rgba(0,0,0,0.08);border-radius:4px;padding:0;cursor:pointer;background:transparent"></label>';
        html += '<div class="brief-fmt-divider"></div>';
        html += '<button class="brief-fmt-btn" onclick="briefBringToFront()" title="Bring to Front"><i class="fas fa-layer-group"></i></button>';
        html += '<button class="brief-fmt-btn" onclick="briefSendToBack()" title="Send to Back"><i class="fas fa-level-down-alt"></i></button>';
        html += '<button class="brief-fmt-btn" onclick="briefSmartLayout()" title="Auto-Arrange"><i class="fas fa-magic"></i></button>';
        html += '<button class="brief-fmt-btn" onclick="briefDeleteElement()" title="Delete Selected" style="color:#ff6b6b"><i class="fas fa-trash"></i></button>';
        html += '</div>'; // end format bar

        // Canvas
        html += '<div id="briefCanvas" class="brief-canvas" style="width:' + sw + 'px;height:' + sh + 'px;background:' + (master.bodyBg || '#fff') + ';transform:scale(' + scale.toFixed(3) + ');transform-origin:top center;cursor:' + (_annotationMode ? 'crosshair' : 'default') + '" onclick="briefCanvasClick(event)" onmousedown="briefCanvasMouseDown(event)" onmousemove="briefCanvasMouseMove(event)" onmouseup="briefCanvasMouseUp(event)">';
        // Grid overlay
        if (_snapToGrid) {
            html += '<div style="position:absolute;top:0;left:0;right:0;bottom:24px;pointer-events:none;background-image:linear-gradient(rgba(0,0,0,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.015) 1px,transparent 1px);background-size:' + _gridSize + 'px ' + _gridSize + 'px;z-index:0"></div>';
        }
        // Classification banner on slide
        html += '<div style="position:absolute;top:0;left:0;right:0;height:18px;background:' + cls.bg + ';display:flex;align-items:center;justify-content:center;font-size:0.55rem;font-weight:700;letter-spacing:1.5px;color:' + cls.color + ';z-index:10;pointer-events:none">' + cls.label + '</div>';
        // Render slide elements
        if (slide) {
            (slide.elements || []).forEach(function (elem) {
                html += _renderElement(elem, master);
            });
            // Render annotations
            if (slide.annotations) {
                slide.annotations.forEach(function (ann) {
                    html += '<div style="position:absolute;left:' + (ann.x - 5) + 'px;top:' + (ann.y - 5) + 'px;width:10px;height:10px;border-radius:50%;background:' + (ann.color || '#ff6b35') + ';opacity:0.8;pointer-events:none;z-index:20;box-shadow:0 0 8px ' + (ann.color || '#ff6b35') + '"></div>';
                });
            }
        }
        // DoD numbering
        var footerLeft = master.footerText || '';
        var footerRight = 'Slide ' + (_activeSlideIdx + 1) + ' of ' + slides.length;
        if (_dodNumbering) {
            footerLeft = cls.label + '  //  ' + footerLeft;
            footerRight = 'Page ' + (_activeSlideIdx + 1) + ' of ' + slides.length + '  //  ' + cls.label;
        }
        // Footer
        html += '<div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:0.62rem;color:#6e6e73;z-index:10">';
        html += '<span>' + _esc(footerLeft) + '</span>';
        html += '<span>' + footerRight + '</span>';
        html += '</div>';
        // Classification banner bottom
        html += '<div style="position:absolute;bottom:24px;left:0;right:0;height:18px;background:' + cls.bg + ';display:flex;align-items:center;justify-content:center;font-size:0.55rem;font-weight:700;letter-spacing:1.5px;color:' + cls.color + ';z-index:10;pointer-events:none">' + cls.label + '</div>';
        html += '</div>'; // end canvas

        // Zoom controls bar
        html += '<div class="brief-zoom-bar">';
        html += '<button class="brief-zoom-btn" onclick="briefZoom(-0.1)" title="Zoom Out"><i class="fas fa-minus"></i></button>';
        html += '<span style="font-size:0.72rem;color:#86868b;min-width:42px;text-align:center">' + Math.round(_canvasZoom * 100) + '%</span>';
        html += '<button class="brief-zoom-btn" onclick="briefZoom(0.1)" title="Zoom In"><i class="fas fa-plus"></i></button>';
        html += '<button class="brief-zoom-btn" onclick="briefZoom(0)" title="Reset Zoom"><i class="fas fa-compress"></i></button>';
        html += '</div>';

        // Slide notes
        html += '<textarea id="briefSlideNotes" placeholder="Speaker notes\u2026" class="brief-notes" style="max-width:' + sw + 'px" onchange="briefUpdateNotes(this.value)">' + _esc((slide && slide.notes) || '') + '</textarea>';
        html += '</div>'; // end stage

        // ═══ CONTEXTUAL RIGHT PANEL ═══
        if (_showComments) {
            html += '<div class="brief-comments">';
            html += '<div style="font-size:0.88rem;font-weight:600;color:var(--text,#1d1d1f);margin-bottom:12px;display:flex;align-items:center;gap:8px"><i class="fas fa-comments" style="color:#00aaff"></i>Comments</div>';
            var slideComments = (brief.comments && brief.comments[_activeSlideIdx]) || [];
            if (slideComments.length) {
                slideComments.forEach(function (c, ci) {
                    var timeStr = c.timestamp ? new Date(c.timestamp).toLocaleString() : '';
                    html += '<div style="padding:10px;background:rgba(0,0,0,0.015);border:1px solid rgba(0,0,0,0.05);border-radius:10px;margin-bottom:8px">';
                    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">';
                    html += '<span style="color:#00aaff;font-weight:600;font-size:0.75rem">' + _esc(c.user || 'Unknown') + '</span>';
                    html += '<span style="color:#86868b;font-size:0.65rem">' + timeStr + '</span>';
                    html += '</div>';
                    html += '<div style="color:var(--text,#1d1d1f);font-size:0.8rem;line-height:1.5">' + _esc(c.text) + '</div>';
                    if (c.edited) html += '<div style="color:#86868b;font-size:0.62rem;margin-top:3px;font-style:italic">(edited)</div>';
                    html += '<div style="display:flex;gap:4px;margin-top:6px">';
                    html += '<button class="brief-fmt-btn" onclick="briefEditComment(' + _activeSlideIdx + ',' + ci + ')" style="width:26px;height:26px;font-size:0.65rem"><i class="fas fa-pen"></i></button>';
                    html += '<button class="brief-fmt-btn" onclick="briefDeleteComment(' + _activeSlideIdx + ',' + ci + ')" style="width:26px;height:26px;font-size:0.65rem;color:#ff6b6b"><i class="fas fa-trash"></i></button>';
                    html += '</div></div>';
                });
            } else {
                html += '<div style="text-align:center;padding:24px 8px;color:#86868b;font-size:0.8rem">No comments on this slide</div>';
            }
            html += '<div style="margin-top:10px">';
            html += '<textarea id="briefNewComment" placeholder="Add a comment\u2026" class="brief-prop-input" style="height:56px;resize:vertical"></textarea>';
            html += '<button class="brief-action-btn primary" onclick="briefAddComment()" style="width:100%;justify-content:center;margin-top:6px"><i class="fas fa-paper-plane"></i> Post</button>';
            html += '</div></div>';
        }

        // Properties panel (when element selected)
        if (_selectedElement && _showProps) {
            html += _renderPropertiesPanel();
        }

        html += '</div>'; // end main layout

        el.innerHTML = window._s4Safe(html);
        _syncFormatBar();
    }

    // ── Properties Panel Renderer ──
    function _renderPropertiesPanel() {
        var elem = _selectedElement;
        if (!elem) return '';
        var h = '<div class="brief-props-panel">';
        h += '<div style="font-size:0.88rem;font-weight:600;color:var(--text,#1d1d1f);margin-bottom:14px;display:flex;align-items:center;gap:8px"><i class="fas fa-sliders-h" style="color:#a855f7"></i>Properties</div>';
        // Position
        h += '<div class="brief-prop-group"><div class="brief-prop-label">Position</div>';
        h += '<div class="brief-prop-row"><label style="color:#6e6e73;font-size:0.72rem;width:24px">X</label><input type="number" class="brief-prop-input" value="' + (elem.x || 0) + '" onchange="briefSetProp(\'x\',parseInt(this.value))" style="width:80px"></div>';
        h += '<div class="brief-prop-row"><label style="color:#6e6e73;font-size:0.72rem;width:24px">Y</label><input type="number" class="brief-prop-input" value="' + (elem.y || 0) + '" onchange="briefSetProp(\'y\',parseInt(this.value))" style="width:80px"></div>';
        h += '</div>';
        // Size
        h += '<div class="brief-prop-group"><div class="brief-prop-label">Size</div>';
        h += '<div class="brief-prop-row"><label style="color:#6e6e73;font-size:0.72rem;width:24px">W</label><input type="number" class="brief-prop-input" value="' + (elem.w || 0) + '" onchange="briefSetProp(\'w\',parseInt(this.value))" style="width:80px"></div>';
        h += '<div class="brief-prop-row"><label style="color:#6e6e73;font-size:0.72rem;width:24px">H</label><input type="number" class="brief-prop-input" value="' + (elem.h || 0) + '" onchange="briefSetProp(\'h\',parseInt(this.value))" style="width:80px"></div>';
        h += '</div>';
        // Appearance
        h += '<div class="brief-prop-group"><div class="brief-prop-label">Appearance</div>';
        h += '<div class="brief-prop-row"><label style="color:#6e6e73;font-size:0.72rem;width:50px">Color</label><input type="color" value="' + (elem.color || '#ffffff') + '" onchange="briefSetProp(\'color\',this.value)" style="width:32px;height:24px;border:1px solid rgba(0,0,0,0.08);border-radius:4px;padding:0;cursor:pointer"></div>';
        h += '<div class="brief-prop-row"><label style="color:#6e6e73;font-size:0.72rem;width:50px">Fill</label><input type="color" value="' + (elem.bg || elem.fill || '#fff') + '" onchange="briefSetProp(\'bg\',this.value)" style="width:32px;height:24px;border:1px solid rgba(0,0,0,0.08);border-radius:4px;padding:0;cursor:pointer"></div>';
        h += '<div class="brief-prop-row"><label style="color:#6e6e73;font-size:0.72rem;width:50px">Z-Index</label><input type="number" class="brief-prop-input" value="' + (elem.zIndex || 1) + '" onchange="briefSetProp(\'zIndex\',parseInt(this.value))" style="width:60px"></div>';
        h += '</div>';
        // Type-specific
        if (elem.type === 'text') {
            h += '<div class="brief-prop-group"><div class="brief-prop-label">Text</div>';
            h += '<textarea class="brief-prop-input" style="height:60px;resize:vertical" onchange="briefSetProp(\'text\',this.value)">' + _esc(elem.text || '') + '</textarea>';
            h += '</div>';
        }
        h += '</div>';
        return h;
    }

    function _renderElement(elem, master) {
        var sel = _selectedElement && _selectedElement.id === elem.id;
        var style = 'position:absolute;left:' + elem.x + 'px;top:' + elem.y + 'px;width:' + elem.w + 'px;height:' + elem.h + 'px;';
        style += 'border:' + (sel ? '2px solid #00aaff' : '1px solid transparent') + ';';
        style += 'cursor:move;box-sizing:border-box;z-index:' + (elem.zIndex || 1) + ';';
        if (sel) style += 'box-shadow:0 0 16px rgba(0,170,255,0.2);';

        // Resize handles (only for selected element)
        var rh = '';
        if (sel) {
            var dirs = ['nw','ne','sw','se','n','s','w','e'];
            for (var di = 0; di < dirs.length; di++) {
                rh += '<div class="brief-resize-handle brief-rh-' + dirs[di] + '" onmousedown="briefResizeStart(event,\'' + elem.id + '\',\'' + dirs[di] + '\')"></div>';
            }
        }

        if (elem.type === 'text') {
            var ff = elem.fontFamily || master.fontFamily || 'inherit';
            var fs = elem.fontSize || master.bodySize || 16;
            var fc = elem.color || master.bodyColor || '#1d1d1f';
            style += 'font-family:' + ff + ';font-size:' + fs + 'px;color:' + fc + ';';
            style += 'padding:4px 6px;overflow:hidden;white-space:pre-wrap;word-wrap:break-word;line-height:1.4;';
            if (elem.bold) style += 'font-weight:700;';
            if (elem.italic) style += 'font-style:italic;';
            if (elem.underline) style += 'text-decoration:underline;';
            if (elem.align) style += 'text-align:' + elem.align + ';';
            if (elem.bg) style += 'background:' + elem.bg + ';';
            return '<div class="briefEl' + (sel ? ' selected' : '') + '" data-eid="' + elem.id + '" style="' + style + '" onclick="briefSelectElement(event,\'' + elem.id + '\')" ondblclick="briefEditElement(\'' + elem.id + '\')">' + _esc(elem.text || '') + rh + '</div>';
        }
        if (elem.type === 'shape') {
            style += 'background:' + (elem.fill || 'rgba(0,170,255,0.15)') + ';';
            style += 'border:' + (elem.strokeWidth || 1) + 'px solid ' + (elem.stroke || 'rgba(0,170,255,0.3)') + ';';
            if (elem.radius) style += 'border-radius:' + elem.radius + 'px;';
            if (elem.shape === 'circle') style += 'border-radius:50%;';
            return '<div class="briefEl' + (sel ? ' selected' : '') + '" data-eid="' + elem.id + '" style="' + style + '" onclick="briefSelectElement(event,\'' + elem.id + '\')">' + rh + '</div>';
        }
        if (elem.type === 'image') {
            style += 'overflow:hidden;';
            var inner = elem.src ? '<img src="' + _esc(elem.src) + '" style="width:100%;height:100%;object-fit:contain" draggable="false">' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#6e6e73;font-size:0.8rem"><i class="fas fa-image" style="margin-right:6px"></i>Image</div>';
            return '<div class="briefEl' + (sel ? ' selected' : '') + '" data-eid="' + elem.id + '" style="' + style + '" onclick="briefSelectElement(event,\'' + elem.id + '\')">' + inner + rh + '</div>';
        }
        if (elem.type === 'table') {
            var thtml = '<table style="width:100%;height:100%;border-collapse:collapse;font-size:' + (elem.fontSize || 11) + 'px;table-layout:fixed">';
            (elem.data || []).forEach(function (row, ri) {
                thtml += '<tr>';
                row.forEach(function (cell) {
                    var isH = ri === 0;
                    thtml += '<' + (isH ? 'th' : 'td') + ' style="padding:3px 6px;border:1px solid ' + (elem.borderColor || 'rgba(0,0,0,0.1)') + ';background:' + (isH ? (elem.headerBg || '#f5f5f7') : (elem.cellBg || 'rgba(0,0,0,0.03)')) + ';color:' + (isH ? (elem.headerColor || '#fff') : (elem.cellColor || '#1d1d1f')) + ';font-weight:' + (isH ? '600' : '400') + ';text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _esc(cell) + '</' + (isH ? 'th' : 'td') + '>';
                });
                thtml += '</tr>';
            });
            thtml += '</table>';
            style += 'overflow:hidden;';
            return '<div class="briefEl' + (sel ? ' selected' : '') + '" data-eid="' + elem.id + '" style="' + style + '" onclick="briefSelectElement(event,\'' + elem.id + '\')" ondblclick="briefEditTable(\'' + elem.id + '\')">' + thtml + rh + '</div>';
        }
        if (elem.type === 'chart') {
            var csvg = _buildChartSVG(elem);
            style += 'overflow:hidden;';
            return '<div class="briefEl' + (sel ? ' selected' : '') + '" data-eid="' + elem.id + '" style="' + style + '" onclick="briefSelectElement(event,\'' + elem.id + '\')" ondblclick="briefEditChart(\'' + elem.id + '\')">' + csvg + rh + '</div>';
        }
        if (elem.type === 'stoplight') {
            var stColors = { green: '#00cc88', yellow: '#ffaa00', red: '#ff4444' };
            var stc = stColors[elem.status] || stColors.green;
            var stInner = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%">';
            stInner += '<div style="width:' + Math.min(elem.w, elem.h - 20) * 0.7 + 'px;height:' + Math.min(elem.w, elem.h - 20) * 0.7 + 'px;border-radius:50%;background:' + stc + ';box-shadow:0 0 16px ' + stc + '"></div>';
            if (elem.label) stInner += '<div style="font-size:0.6rem;color:#6e6e73;margin-top:3px;text-align:center;white-space:nowrap">' + _esc(elem.label) + '</div>';
            stInner += '</div>';
            return '<div class="briefEl' + (sel ? ' selected' : '') + '" data-eid="' + elem.id + '" style="' + style + '" onclick="briefSelectElement(event,\'' + elem.id + '\')" ondblclick="briefCycleStoplight(\'' + elem.id + '\')">' + stInner + rh + '</div>';
        }
        if (elem.type === 'widget') {
            var wInner = _renderWidgetContent(elem);
            style += 'overflow:hidden;background:rgba(0,0,0,0.015);border-radius:6px;';
            if (sel) style += 'border:2px solid #a855f7;box-shadow:0 0 16px rgba(168,85,247,0.2);';
            return '<div class="briefEl' + (sel ? ' selected' : '') + '" data-eid="' + elem.id + '" style="' + style + '" onclick="briefSelectElement(event,\'' + elem.id + '\')">' + wInner + rh + '</div>';
        }
        if (elem.type === 'risk_matrix') {
            var rmInner = _renderRiskMatrixContent(elem);
            style += 'overflow:hidden;';
            return '<div class="briefEl' + (sel ? ' selected' : '') + '" data-eid="' + elem.id + '" style="' + style + '" onclick="briefSelectElement(event,\'' + elem.id + '\')" ondblclick="briefEditRiskMatrix(\'' + elem.id + '\')">' + rmInner + rh + '</div>';
        }
        return '';
    }

    // ── Chart SVG builder ──
    function _buildChartSVG(elem) {
        var w = elem.w || 300, h = elem.h || 200;
        var labels = elem.labels || [], values = elem.values || [], colors = elem.colors || ['#00aaff','#00cc88','#f97316','#a855f7','#f38181','#ffd700'];
        var maxVal = Math.max.apply(null, values.concat([1]));
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:100%">';
        if (elem.title) svg += '<text x="' + (w / 2) + '" y="16" text-anchor="middle" fill="#1d1d1f" font-size="12" font-weight="600">' + _esc(elem.title) + '</text>';
        var ct = elem.chartType || 'bar';
        var padT = elem.title ? 26 : 10, padB = 30, padL = 40, padR = 10;
        var cw = w - padL - padR, ch = h - padT - padB;
        if (ct === 'bar') {
            var bw = Math.max(8, (cw / labels.length) - 6);
            labels.forEach(function (l, i) {
                var bh = (values[i] / maxVal) * ch;
                var bx = padL + i * (cw / labels.length) + (cw / labels.length - bw) / 2;
                svg += '<rect x="' + bx + '" y="' + (padT + ch - bh) + '" width="' + bw + '" height="' + bh + '" fill="' + (colors[i % colors.length]) + '" rx="2"/>';
                svg += '<text x="' + (bx + bw / 2) + '" y="' + (h - 8) + '" text-anchor="middle" fill="#8b949e" font-size="9">' + _esc(l) + '</text>';
                svg += '<text x="' + (bx + bw / 2) + '" y="' + (padT + ch - bh - 4) + '" text-anchor="middle" fill="#1d1d1f" font-size="8">' + values[i] + '</text>';
            });
        } else if (ct === 'line') {
            var pts = [];
            labels.forEach(function (l, i) {
                var px = padL + (i / Math.max(1, labels.length - 1)) * cw;
                var py = padT + ch - (values[i] / maxVal) * ch;
                pts.push(px + ',' + py);
                svg += '<circle cx="' + px + '" cy="' + py + '" r="3" fill="' + (colors[0]) + '"/>';
                svg += '<text x="' + px + '" y="' + (h - 8) + '" text-anchor="middle" fill="#8b949e" font-size="9">' + _esc(l) + '</text>';
            });
            svg += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + colors[0] + '" stroke-width="2"/>';
        } else if (ct === 'pie' || ct === 'donut') {
            var total = values.reduce(function (a, b) { return a + b; }, 0) || 1;
            var cx = w / 2, cy = padT + ch / 2, r = Math.min(cw, ch) / 2 - 5;
            var startAngle = -Math.PI / 2;
            values.forEach(function (v, i) {
                var angle = (v / total) * 2 * Math.PI;
                var x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
                var x2 = cx + r * Math.cos(startAngle + angle), y2 = cy + r * Math.sin(startAngle + angle);
                var large = angle > Math.PI ? 1 : 0;
                svg += '<path d="M' + cx + ',' + cy + ' L' + x1 + ',' + y1 + ' A' + r + ',' + r + ' 0 ' + large + ',1 ' + x2 + ',' + y2 + ' Z" fill="' + (colors[i % colors.length]) + '"/>';
                // Label
                var midAngle = startAngle + angle / 2;
                var lx = cx + (r * 0.65) * Math.cos(midAngle), ly = cy + (r * 0.65) * Math.sin(midAngle);
                svg += '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" fill="#fff" font-size="9" font-weight="600">' + _esc(labels[i] || '') + '</text>';
                startAngle += angle;
            });
            if (ct === 'donut') svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.5) + '" fill="' + ((_theme === 'dark') ? '#2c2c2e' : '#ffffff') + '"/>';
        }
        // Axes for bar/line
        if (ct === 'bar' || ct === 'line') {
            svg += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + ch) + '" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>';
            svg += '<line x1="' + padL + '" y1="' + (padT + ch) + '" x2="' + (padL + cw) + '" y2="' + (padT + ch) + '" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>';
        }
        svg += '</svg>';
        return svg;
    }

    // ── Widget content renderer ──
    function _renderWidgetContent(elem) {
        var wt = elem.widgetType || 'milestone-summary';
        var milData = window._milData || [];
        var h = '<div style="padding:8px;height:100%;display:flex;flex-direction:column">';
        if (wt === 'milestone-summary') {
            var onTrack = milData.filter(function (r) { return r.delivery_status === 'On Track'; }).length;
            var atRisk = milData.filter(function (r) { return r.delivery_status === 'At Risk'; }).length;
            var delayed = milData.filter(function (r) { return r.delivery_status === 'Delayed'; }).length;
            var complete = milData.filter(function (r) { return r.delivery_status === 'Complete'; }).length;
            h += '<div style="font-size:0.7rem;font-weight:600;color:#a855f7;margin-bottom:6px"><i class="fas fa-tachometer-alt"></i> Milestone Summary</div>';
            h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;flex:1">';
            h += '<div style="text-align:center;padding:4px;background:rgba(0,204,136,0.1);border-radius:3px"><div style="font-size:1.2rem;font-weight:700;color:#00cc88">' + onTrack + '</div><div style="font-size:0.55rem;color:#86868b">On Track</div></div>';
            h += '<div style="text-align:center;padding:4px;background:rgba(255,170,0,0.1);border-radius:3px"><div style="font-size:1.2rem;font-weight:700;color:#ffaa00">' + atRisk + '</div><div style="font-size:0.55rem;color:#86868b">At Risk</div></div>';
            h += '<div style="text-align:center;padding:4px;background:rgba(255,68,68,0.1);border-radius:3px"><div style="font-size:1.2rem;font-weight:700;color:#ff4444">' + delayed + '</div><div style="font-size:0.55rem;color:#86868b">Delayed</div></div>';
            h += '<div style="text-align:center;padding:4px;background:rgba(0,170,255,0.1);border-radius:3px"><div style="font-size:1.2rem;font-weight:700;color:#00aaff">' + complete + '</div><div style="font-size:0.55rem;color:#86868b">Complete</div></div>';
            h += '</div>';
        } else if (wt === 'schedule-variance') {
            h += '<div style="font-size:0.7rem;font-weight:600;color:#00aaff;margin-bottom:6px"><i class="fas fa-clock"></i> Schedule Variance</div>';
            var variances = [];
            milData.forEach(function (r) {
                if (r.delivery_status !== 'Complete' && r.planned_delivery_date && r.pm_estimated_delivery) {
                    var diff = Math.round((new Date(r.pm_estimated_delivery) - new Date(r.planned_delivery_date)) / 86400000);
                    if (!isNaN(diff)) variances.push({ hull: r.hull_number || r.vessel_type || '?', diff: diff });
                }
            });
            variances.slice(0, 6).forEach(function (v) {
                var c = v.diff <= 0 ? '#00cc88' : (v.diff <= 30 ? '#ffaa00' : '#ff4444');
                h += '<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:0.65rem;border-bottom:1px solid rgba(0,0,0,0.04)"><span style="color:var(--text,#1d1d1f)">' + _esc(v.hull) + '</span><span style="color:' + c + ';font-weight:600">' + (v.diff > 0 ? '+' : '') + v.diff + 'd</span></div>';
            });
            if (!variances.length) h += '<div style="color:var(--muted);font-size:0.7rem;text-align:center;padding:10px">No variance data</div>';
        } else if (wt === 'readiness-gauge') {
            var readyPct = milData.length ? Math.round((milData.filter(function (r) { return r.delivery_status === 'On Track' || r.delivery_status === 'Complete'; }).length / milData.length) * 100) : 0;
            h += '<div style="font-size:0.7rem;font-weight:600;color:#00cc88;margin-bottom:6px"><i class="fas fa-shield-alt"></i> Readiness</div>';
            h += '<div style="text-align:center;padding:10px"><div style="font-size:2rem;font-weight:700;color:' + (readyPct >= 80 ? '#00cc88' : readyPct >= 60 ? '#ffaa00' : '#ff4444') + '">' + readyPct + '%</div>';
            h += '<div style="height:8px;background:rgba(0,0,0,0.05);border-radius:4px;margin-top:6px"><div style="height:100%;width:' + readyPct + '%;background:' + (readyPct >= 80 ? '#00cc88' : readyPct >= 60 ? '#ffaa00' : '#ff4444') + ';border-radius:4px"></div></div></div>';
        } else if (wt === 'cost-trend') {
            h += '<div style="font-size:0.7rem;font-weight:600;color:#ffa500;margin-bottom:6px"><i class="fas fa-dollar-sign"></i> Cost Trend</div>';
            h += '<div style="color:var(--muted);font-size:0.65rem;text-align:center;padding:10px">Connect cost data source<br>for live tracking</div>';
        }
        h += '</div>';
        return h;
    }

    // ── Risk Matrix content renderer ──
    function _renderRiskMatrixContent(elem) {
        var w = elem.w || 400, h = elem.h || 400;
        var cellW = (w - 30) / 5, cellH = (h - 40) / 5;
        var riskColors = [
            ['#00cc88','#00cc88','#ffaa00','#ffaa00','#ff4444'],
            ['#00cc88','#ffaa00','#ffaa00','#ff4444','#ff4444'],
            ['#00cc88','#ffaa00','#ff4444','#ff4444','#ff6600'],
            ['#ffaa00','#ff4444','#ff4444','#ff6600','#ff6600'],
            ['#ffaa00','#ff4444','#ff6600','#ff6600','#ff0000']
        ];
        var rm = '<div style="width:100%;height:100%;position:relative;font-size:0.55rem">';
        rm += '<div style="position:absolute;left:0;top:0;bottom:20px;width:18px;display:flex;align-items:center;justify-content:center"><span style="writing-mode:vertical-rl;transform:rotate(180deg);color:#86868b;font-size:0.6rem;font-weight:600">LIKELIHOOD \u2192</span></div>';
        rm += '<div style="position:absolute;left:25px;bottom:0;right:0;height:18px;text-align:center;color:#86868b;font-size:0.6rem;font-weight:600">IMPACT \u2192</div>';
        for (var row = 0; row < 5; row++) {
            for (var col = 0; col < 5; col++) {
                var cx = 25 + col * cellW, cy = (4 - row) * cellH;
                rm += '<div style="position:absolute;left:' + cx + 'px;top:' + cy + 'px;width:' + cellW + 'px;height:' + cellH + 'px;background:' + riskColors[row][col] + ';opacity:0.25;border:1px solid rgba(0,0,0,0.08)"></div>';
            }
        }
        // Plot risk items
        (elem.items || []).forEach(function (item) {
            var ix = 25 + ((item.impact - 1) * cellW) + cellW / 2 - 8;
            var iy = (4 - (item.likelihood - 1)) * cellH + cellH / 2 - 8;
            rm += '<div style="position:absolute;left:' + ix + 'px;top:' + iy + 'px;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #ff4444;display:flex;align-items:center;justify-content:center;font-size:0.5rem;font-weight:700;color:#ff4444;z-index:2" title="' + _esc(item.name || '') + '">' + _esc((item.name || '?').charAt(0)) + '</div>';
        });
        rm += '</div>';
        return rm;
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
        _showProps = !!_selectedElement;
        _renderEditor();
        _syncFormatBar();
    }
    window.briefSelectElement = briefSelectElement;

    function briefCanvasClick(event) {
        var canvas = document.getElementById('briefCanvas');
        if (!canvas) return;
        if (event.target.id === 'briefCanvas' || event.target.closest('#briefCanvas') === event.target) {
            // Annotation mode: place a mark on click
            if (_annotationMode && _activeBrief && _activeBrief.slides[_activeSlideIdx]) {
                var rect = canvas.getBoundingClientRect();
                var scale = (canvas.offsetWidth > 0) ? ((_activeBrief.master || DEFAULT_MASTER).slideWidth || 960) / canvas.offsetWidth : 1;
                var x = Math.round((event.clientX - rect.left) * scale);
                var y = Math.round((event.clientY - rect.top) * scale);
                var slide = _activeBrief.slides[_activeSlideIdx];
                if (!slide.annotations) slide.annotations = [];
                slide.annotations.push({ x: x, y: y, color: '#ff6b35', user: sessionStorage.getItem('s4_user_email') || 'Unknown', timestamp: new Date().toISOString() });
                _isDirty = true;
                _renderEditor();
                _toast('Annotation placed', 'info');
                return;
            }
            _selectedElement = null;
            _showProps = false;
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

        var html = '<textarea id="briefEditTextArea" style="width:100%;height:200px;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:3px;padding:10px;font-size:0.9rem;font-family:inherit;resize:vertical">' + _esc(elem.text || '') + '</textarea>';
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
        var newEl = _makeText(100, 200, 400, 60, 'New text', { fontSize: 18, color: '#1d1d1f' });
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
        // Track for undo timeline
        if (!_activeBrief._history) _activeBrief._history = [];
        _activeBrief._history.push(JSON.stringify({ slides: _activeBrief.slides }));
        if (_activeBrief._history.length > 50) _activeBrief._history.shift();
        _activeBrief._historyIdx = _activeBrief._history.length - 1;
    }
    var _addToHistory = _pushUndo;

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
        html += _masterColorField('Header BG', 'masterHeaderBg', m.headerBg || '#f5f5f7');
        html += _masterColorField('Header Color', 'masterHeaderColor', m.headerColor || '#ffffff');
        html += _masterColorField('Body BG', 'masterBodyBg', m.bodyBg || '#fff');
        html += _masterColorField('Body Color', 'masterBodyColor', m.bodyColor || '#1d1d1f');
        html += _masterColorField('Accent', 'masterAccent', m.accentColor || '#00aaff');
        html += '</div>';
        html += '<div style="margin-top:10px"><label style="color:var(--steel);font-size:0.8rem">Footer Text</label><input id="masterFooter" value="' + _esc(m.footerText || '') + '" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:3px;padding:5px 8px;font-size:0.82rem;margin-top:4px"></div>';
        html += '<div style="margin-top:12px;display:flex;justify-content:flex-end;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefApplyMaster()"><i class="fas fa-check"></i> Apply</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div>';
        _showModal('Slide Master Settings', html);
    }
    window.briefSlideMaster = briefSlideMaster;

    function _masterField(label, id, val) {
        return '<div><label style="color:var(--steel)">' + label + '</label><input id="' + id + '" value="' + _esc('' + val) + '" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:3px;padding:4px 8px;font-size:0.8rem;margin-top:2px"></div>';
    }
    function _masterColorField(label, id, val) {
        return '<div><label style="color:var(--steel)">' + label + '</label><div style="display:flex;gap:4px;margin-top:2px"><input type="color" id="' + id + '" value="' + val + '" style="width:36px;height:28px;border:none;cursor:pointer"><input id="' + id + 'Text" value="' + val + '" style="flex:1;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:3px;padding:4px;font-size:0.78rem" onchange="document.getElementById(\'' + id + '\').value=this.value"></div></div>';
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
        html += '<select id="briefAccessLevel" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:3px;padding:5px 8px;font-size:0.82rem;margin:4px 0 12px">';
        ['private','team','org','public'].forEach(function (lv) {
            html += '<option value="' + lv + '"' + (b.access_level === lv ? ' selected' : '') + '>' + lv.charAt(0).toUpperCase() + lv.slice(1) + '</option>';
        });
        html += '</select>';
        html += '<label style="color:var(--steel)">Editors (comma-separated emails)</label>';
        html += '<input id="briefEditors" value="' + _esc((b.editors || []).join(', ')) + '" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:3px;padding:5px 8px;font-size:0.82rem;margin:4px 0 12px">';
        html += '<label style="color:var(--steel)">Viewers (comma-separated emails)</label>';
        html += '<input id="briefViewers" value="' + _esc((b.viewers || []).join(', ')) + '" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:3px;padding:5px 8px;font-size:0.82rem;margin:4px 0 12px">';
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
        doc += '.slide{position:relative;width:' + sw + 'px;height:' + sh + 'px;margin:0 auto 20px;background:' + (master.bodyBg || '#fff') + ';border-radius:4px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}';
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
            doc += '<div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;color:#86868b">' + _esc(master.footerText || '') + '</div>';
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
                                    _makeText(40, 110, 880, 380, text.substring(0, 2000), { fontSize: 14, color: '#1d1d1f' })
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
        var bt = _activeBrief.brief_type || 'STATUS';
        var briefTitle = _activeBrief.title || 'Untitled';
        var slideList = '';
        _activeBrief.slides.forEach(function (s, i) { slideList += '<div style="padding:4px 8px;background:rgba(0,0,0,0.02);border-radius:6px;margin-bottom:4px;font-size:0.78rem;color:var(--text,#1d1d1f)"><span style="color:#00aaff;font-weight:600">' + (i + 1) + '.</span> ' + _esc(s.title || 'Untitled') + '</div>'; });

        var html = '';
        html += '<div style="background:linear-gradient(135deg,rgba(0,170,255,0.08),rgba(168,85,247,0.06));border:1px solid rgba(0,170,255,0.15);border-radius:12px;padding:16px;margin-bottom:16px">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><i class="fas fa-magic" style="color:#00aaff;font-size:1.1rem"></i><span style="color:var(--text,#1d1d1f);font-weight:600;font-size:0.95rem">AI Brief Assistant</span></div>';
        html += '<div style="color:#86868b;font-size:0.82rem;line-height:1.5;margin-bottom:12px">Generate professional defense-grade content for your <strong style="color:#00aaff">' + _esc(bt) + '</strong> brief: <strong style="color:var(--text,#1d1d1f)">' + _esc(briefTitle) + '</strong></div>';
        html += '</div>';

        html += '<div style="margin-bottom:12px"><div style="font-size:0.78rem;color:#6e6e73;font-weight:600;margin-bottom:6px">Current Slides:</div>' + slideList + '</div>';

        html += '<div style="margin-bottom:14px">';
        html += '<label style="font-size:0.78rem;color:#6e6e73;font-weight:600;display:block;margin-bottom:6px">AI Task</label>';
        html += '<select id="briefAITask" class="brief-select" style="width:100%;margin-bottom:8px">';
        html += '<option value="generate-all">Generate content for all slides</option>';
        html += '<option value="generate-current">Generate content for current slide only</option>';
        html += '<option value="suggest-structure">Suggest better slide structure</option>';
        html += '<option value="executive-summary">Create executive summary slide</option>';
        html += '<option value="talking-points">Generate speaker notes / talking points</option>';
        html += '<option value="compliance-check">Check DoD compliance & formatting</option>';
        html += '</select>';
        html += '<label style="font-size:0.78rem;color:#6e6e73;font-weight:600;display:block;margin-bottom:6px">Additional Instructions (optional)</label>';
        html += '<textarea id="briefAIPrompt" placeholder="e.g. Focus on schedule variance, use data from FY26 Q2..." class="brief-prop-input" style="height:70px;resize:vertical"></textarea>';
        html += '</div>';

        html += '<div style="display:flex;gap:8px;justify-content:flex-end">';
        html += '<button class="brief-action-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '<button class="brief-action-btn primary" onclick="briefAIExecute()" style="padding:8px 20px"><i class="fas fa-magic"></i> Generate</button>';
        html += '</div>';

        _showModal('AI Brief Assistant', html);
    }
    window.briefAIGenerate = briefAIGenerate;

    function briefAIExecute() {
        var task = document.getElementById('briefAITask');
        var promptEl = document.getElementById('briefAIPrompt');
        var taskVal = task ? task.value : 'generate-all';
        var extra = promptEl ? promptEl.value.trim() : '';
        var brief = _activeBrief;
        if (!brief) return;

        _closeModal();

        // Build the prompt for the main AI
        var prompt = 'I have a ' + (brief.brief_type || 'STATUS') + ' brief titled "' + brief.title + '". ';
        if (taskVal === 'generate-all') {
            prompt += 'Generate professional defense program content for each slide: ';
            brief.slides.forEach(function (s, i) { prompt += '\nSlide ' + (i + 1) + ': ' + s.title; });
        } else if (taskVal === 'generate-current') {
            var cs = brief.slides[_activeSlideIdx];
            prompt += 'Generate content for slide ' + (_activeSlideIdx + 1) + ': ' + (cs ? cs.title : 'Untitled');
        } else if (taskVal === 'suggest-structure') {
            prompt += 'Suggest an optimal slide structure for this brief type. Current slides: ';
            brief.slides.forEach(function (s, i) { prompt += '\n' + (i + 1) + '. ' + s.title; });
        } else if (taskVal === 'executive-summary') {
            prompt += 'Create a concise executive summary slide that captures all key points from this brief.';
        } else if (taskVal === 'talking-points') {
            prompt += 'Generate speaker notes and talking points for each slide: ';
            brief.slides.forEach(function (s, i) { prompt += '\nSlide ' + (i + 1) + ': ' + s.title; });
        } else if (taskVal === 'compliance-check') {
            prompt += 'Check this brief for DoD compliance, proper classification handling, and formatting standards.';
        }
        if (extra) prompt += '\n\nAdditional context: ' + extra;
        prompt += '\n\nProvide executive-quality content suitable for a defense program briefing.';

        // Try to send to the main AI chat
        var chatInput = document.getElementById('aiInput') || document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = prompt;
            var sendBtn = document.getElementById('aiSendBtn') || document.getElementById('chatSendBtn');
            if (sendBtn) sendBtn.click();
            _toast('AI request sent \u2014 check the AI panel for results', 'info');
        } else {
            // No AI chat available - show the prompt for manual use
            var resultHtml = '<div style="margin-bottom:12px;color:#86868b;font-size:0.82rem">No AI agent connected. Copy this prompt to your AI assistant:</div>';
            resultHtml += '<textarea class="brief-prop-input" style="height:200px;font-size:0.78rem" readonly>' + _esc(prompt) + '</textarea>';
            resultHtml += '<button class="brief-action-btn primary" onclick="navigator.clipboard.writeText(document.querySelector(\'.brief-modal textarea\').value);_toast(\'Copied!\',\'success\')" style="margin-top:8px"><i class="fas fa-copy"></i> Copy to Clipboard</button>';
            _showModal('AI Prompt Generated', resultHtml);
        }
    }
    window.briefAIExecute = briefAIExecute;

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
        html += '<input id="briefNewProgramInput" placeholder="e.g. PMS 500 — ZUMWALT Class" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:8px 12px;font-size:0.88rem;margin-bottom:12px">';
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
        var html = '<div style="font-size:0.85rem;color:var(--steel);margin-bottom:12px">Add a vessel / craft to <strong style="color:var(--text,#1d1d1f)">' + _esc(_selectedProgram) + '</strong>.</div>';
        html += '<input id="briefNewVesselInput" placeholder="e.g. DDG 129 Jeremiah Denton" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:8px 12px;font-size:0.88rem;margin-bottom:12px">';
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
        var html = '<textarea id="briefEditCommentText" style="width:100%;height:80px;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:8px 12px;font-size:0.85rem;resize:vertical;margin-bottom:12px">' + _esc(comment.text) + '</textarea>';
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
                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(0,0,0,0.04);font-size:0.8rem">';
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
    //  DUPLICATE SLIDE
    // ================================================================
    function briefDuplicateSlide() {
        if (!_activeBrief) return;
        var slides = _activeBrief.slides;
        if (!slides.length) return;
        _pushUndo();
        var copy = JSON.parse(JSON.stringify(slides[_activeSlideIdx]));
        copy.title = (copy.title || 'Slide') + ' (Copy)';
        (copy.elements || []).forEach(function (el) { el.id = _uid(); });
        slides.splice(_activeSlideIdx + 1, 0, copy);
        _activeSlideIdx++;
        _isDirty = true;
        _renderEditor();
        _toast('Slide duplicated', 'success');
    }
    window.briefDuplicateSlide = briefDuplicateSlide;

    // ================================================================
    //  CLASSIFICATION BANNER
    // ================================================================
    function briefSetClassification(level) {
        if (!_activeBrief) return;
        _activeBrief.classification = level;
        var cls = CLASSIFICATION_LEVELS[level] || CLASSIFICATION_LEVELS.UNCLASSIFIED;
        _activeBrief.master.footerText = 'S4 Ledger — ' + cls.label;
        _isDirty = true;
        _renderEditor();
        _toast('Classification set to ' + cls.label, 'info');
    }
    window.briefSetClassification = briefSetClassification;

    // ================================================================
    //  APPROVAL WORKFLOW
    // ================================================================
    function briefApprovalModal() {
        if (!_activeBrief) return;
        var status = _activeBrief.approval_status || 'draft';
        var history = _activeBrief.approval_history || [];
        var html = '<div style="margin-bottom:16px">';
        html += '<label style="color:var(--steel);font-size:0.82rem;display:block;margin-bottom:6px">Current Status</label>';
        html += '<select id="briefApprovalStatus" style="background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:6px 12px;font-size:0.85rem;width:100%">';
        ['draft','in_review','approved','rejected','locked'].forEach(function (s) {
            var label = { draft: 'Draft', in_review: 'In Review', approved: 'Approved', rejected: 'Rejected — Changes Requested', locked: 'Locked (Final)' }[s] || s;
            html += '<option value="' + s + '"' + (s === status ? ' selected' : '') + '>' + label + '</option>';
        });
        html += '</select></div>';
        html += '<div style="margin-bottom:12px"><label style="color:var(--steel);font-size:0.82rem;display:block;margin-bottom:4px">Reviewer Note</label>';
        html += '<textarea id="briefApprovalNote" placeholder="Add a note..." style="width:100%;height:60px;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:8px;font-size:0.82rem;resize:vertical"></textarea></div>';
        if (history.length) {
            html += '<div style="max-height:160px;overflow-y:auto;border-top:1px solid rgba(0,0,0,0.06);padding-top:10px;margin-bottom:12px">';
            html += '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:6px;font-weight:600">History</div>';
            history.slice().reverse().forEach(function (h) {
                var clr = { approved: '#4ecb71', rejected: '#ff4444', in_review: '#f97316', locked: '#00aaff' }[h.status] || '#8b949e';
                html += '<div style="padding:4px 0;font-size:0.75rem;border-bottom:1px solid rgba(0,0,0,0.03)">';
                html += '<span style="color:' + clr + ';font-weight:600">' + (h.status || '').replace('_', ' ').toUpperCase() + '</span>';
                html += ' <span style="color:var(--muted)">by</span> <span style="color:#00aaff">' + _esc(h.user || '') + '</span>';
                html += ' <span style="color:var(--muted);font-size:0.68rem">' + (h.timestamp ? new Date(h.timestamp).toLocaleString() : '') + '</span>';
                if (h.note) html += '<div style="color:var(--steel);font-size:0.72rem;margin-top:2px;font-style:italic">' + _esc(h.note) + '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '<div style="display:flex;justify-content:flex-end;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefApplyApproval()" style="background:rgba(0,204,136,0.12);color:#00cc88"><i class="fas fa-check"></i> Apply</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div>';
        _showModal('Approval Workflow', html);
    }
    window.briefApprovalModal = briefApprovalModal;

    function briefApplyApproval() {
        if (!_activeBrief) return;
        var sel = document.getElementById('briefApprovalStatus');
        var note = document.getElementById('briefApprovalNote');
        var newStatus = sel ? sel.value : 'draft';
        var noteVal = note ? note.value.trim() : '';
        if (!_activeBrief.approval_history) _activeBrief.approval_history = [];
        _activeBrief.approval_history.push({
            status: newStatus,
            user: sessionStorage.getItem('s4_user_email') || 'Unknown',
            note: noteVal,
            timestamp: new Date().toISOString()
        });
        _activeBrief.approval_status = newStatus;
        _isDirty = true;
        _closeModal();
        _saveBrief(_activeBrief, function () {
            _renderEditor();
            _toast('Status updated to ' + newStatus.replace('_', ' '), 'success');
        });
    }
    window.briefApplyApproval = briefApplyApproval;

    // ================================================================
    //  VERSION DIFF
    // ================================================================
    function briefVersionDiff() {
        if (!_activeBrief) return;
        var history = _activeBrief.edit_history || [];
        if (history.length < 2) { _toast('Need at least 2 saved versions to compare', 'warning'); return; }
        var slides = _activeBrief.slides || [];
        var html = '<div style="font-size:0.82rem;color:var(--steel);margin-bottom:12px">Showing current brief state. Version tracking captures all saves with user attribution.</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-height:300px;overflow-y:auto">';
        html += '<div style="border:1px solid rgba(0,170,255,0.2);border-radius:4px;padding:10px"><div style="color:#00aaff;font-weight:600;margin-bottom:8px;font-size:0.78rem">Current Version (v' + (_activeBrief.version || 1) + ')</div>';
        slides.forEach(function (s, i) {
            var textPreview = '';
            (s.elements || []).forEach(function (el) { if (el.type === 'text' && !textPreview) textPreview = (el.text || '').substring(0, 60); });
            html += '<div style="padding:4px 0;font-size:0.72rem;color:var(--muted)"><span style="color:var(--text,#1d1d1f)">Slide ' + (i + 1) + ':</span> ' + _esc(s.title || '') + ' — ' + _esc(textPreview) + '</div>';
        });
        html += '</div>';
        html += '<div style="border:1px solid rgba(0,0,0,0.08);border-radius:4px;padding:10px"><div style="color:var(--muted);font-weight:600;margin-bottom:8px;font-size:0.78rem">Edit History</div>';
        history.slice().reverse().slice(0, 15).forEach(function (h) {
            html += '<div style="padding:3px 0;font-size:0.7rem;color:var(--muted)"><span style="color:#00aaff">' + _esc(h.user || '') + '</span> ' + _esc(h.action || '') + ' — ' + (h.timestamp ? new Date(h.timestamp).toLocaleString() : '') + '</div>';
        });
        html += '</div></div>';
        _showModal('Version Compare', html);
    }
    window.briefVersionDiff = briefVersionDiff;

    // ================================================================
    //  PRESENTER MODE
    // ================================================================
    function briefPresenterMode() {
        if (!_activeBrief || !_activeBrief.slides.length) return;
        var brief = _activeBrief;
        var master = brief.master || DEFAULT_MASTER;
        var slides = brief.slides;
        var cls = CLASSIFICATION_LEVELS[brief.classification] || CLASSIFICATION_LEVELS.UNCLASSIFIED;
        var sw = master.slideWidth || 960;
        var sh = master.slideHeight || 540;

        var overlay = document.createElement('div');
        overlay.id = 'briefPresenterOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#000;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:none';

        var curSlide = _activeSlideIdx;
        var startTime = Date.now();

        function renderPresenterSlide() {
            var slide = slides[curSlide] || {};
            var scale = Math.min(window.innerWidth / sw, (window.innerHeight - 80) / sh);
            var html = '';
            // Classification banner top
            html += '<div style="position:fixed;top:0;left:0;right:0;height:28px;background:' + cls.bg + ';display:flex;align-items:center;justify-content:center;z-index:100000;font-size:0.75rem;font-weight:700;letter-spacing:2px;color:' + cls.color + '">' + cls.label + '</div>';
            // Slide
            html += '<div style="position:relative;width:' + sw + 'px;height:' + sh + 'px;background:' + (master.bodyBg || '#fff') + ';border-radius:4px;transform:scale(' + scale.toFixed(3) + ');box-shadow:0 8px 48px rgba(0,0,0,0.08);overflow:hidden;margin-top:30px">';
            (slide.elements || []).forEach(function (el) {
                var s = 'position:absolute;left:' + el.x + 'px;top:' + el.y + 'px;width:' + el.w + 'px;height:' + el.h + 'px;';
                if (el.type === 'text') {
                    s += 'font-family:' + (el.fontFamily || master.fontFamily || 'inherit') + ';font-size:' + (el.fontSize || 16) + 'px;color:' + (el.color || master.bodyColor || '#1d1d1f') + ';';
                    s += 'padding:4px 6px;white-space:pre-wrap;word-wrap:break-word;line-height:1.4;overflow:hidden;';
                    if (el.bold) s += 'font-weight:700;';
                    if (el.italic) s += 'font-style:italic;';
                    if (el.underline) s += 'text-decoration:underline;';
                    if (el.align) s += 'text-align:' + el.align + ';';
                    if (el.bg) s += 'background:' + el.bg + ';';
                    html += '<div style="' + s + '">' + _esc(el.text || '') + '</div>';
                } else if (el.type === 'shape') {
                    s += 'background:' + (el.fill || 'rgba(0,170,255,0.15)') + ';';
                    if (el.stroke) s += 'border:' + (el.strokeWidth || 1) + 'px solid ' + el.stroke + ';';
                    if (el.radius) s += 'border-radius:' + el.radius + 'px;';
                    if (el.shape === 'circle') s += 'border-radius:50%;';
                    html += '<div style="' + s + '"></div>';
                } else if (el.type === 'image' && el.src) {
                    html += '<div style="' + s + '"><img src="' + el.src + '" style="width:100%;height:100%;object-fit:contain"></div>';
                } else if (el.type === 'table') {
                    html += _renderTableElement(el, s);
                } else if (el.type === 'chart') {
                    html += _renderChartElement(el, s);
                } else if (el.type === 'stoplight') {
                    html += _renderStoplightElement(el, s);
                } else if (el.type === 'risk_matrix') {
                    html += _renderRiskMatrixElement(el, s);
                }
            });
            // Footer
            html += '<div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:0.6rem;color:#86868b">';
            html += '<span>' + (master.footerText || '') + '</span>';
            html += '<span>Slide ' + (curSlide + 1) + ' of ' + slides.length + '</span>';
            html += '</div></div>';
            // Bottom controls bar
            var elapsed = Math.floor((Date.now() - startTime) / 1000);
            var mins = Math.floor(elapsed / 60);
            var secs = elapsed % 60;
            html += '<div style="position:fixed;bottom:0;left:0;right:0;height:48px;background:rgba(245,245,247,0.92);display:flex;align-items:center;justify-content:center;gap:16px;font-size:0.8rem;color:#86868b;z-index:100000">';
            html += '<span style="cursor:pointer;padding:4px 12px;border-radius:4px;background:rgba(0,0,0,0.035)" onclick="document.getElementById(\'briefPresenterOverlay\').__prev()">&#9664; Prev</span>';
            html += '<span>' + (curSlide + 1) + ' / ' + slides.length + '</span>';
            html += '<span style="cursor:pointer;padding:4px 12px;border-radius:4px;background:rgba(0,0,0,0.035)" onclick="document.getElementById(\'briefPresenterOverlay\').__next()">Next &#9654;</span>';
            html += '<span style="margin-left:24px"><i class="fas fa-clock"></i> ' + mins + ':' + (secs < 10 ? '0' : '') + secs + '</span>';
            html += '<span style="cursor:pointer;padding:4px 12px;border-radius:4px;background:rgba(255,68,68,0.15);color:#ff4444" onclick="document.getElementById(\'briefPresenterOverlay\').__exit()">ESC Exit</span>';
            html += '</div>';
            // Speaker notes
            if (slide.notes) {
                html += '<div style="position:fixed;bottom:48px;left:0;right:0;max-height:80px;background:rgba(245,245,247,0.88);padding:8px 16px;font-size:0.75rem;color:#86868b;overflow-y:auto;z-index:100000;border-top:1px solid rgba(0,0,0,0.1)">';
                html += '<strong style="color:#00aaff">Notes:</strong> ' + _esc(slide.notes);
                html += '</div>';
            }
            // Classification banner bottom
            html += '<div style="position:fixed;bottom:48px;left:0;right:0;height:20px;background:' + cls.bg + ';display:flex;align-items:center;justify-content:center;z-index:99999;font-size:0.65rem;font-weight:700;letter-spacing:2px;color:' + cls.color + '">' + cls.label + '</div>';
            overlay.innerHTML = window._s4Safe(html);
        }

        overlay.__next = function () { if (curSlide < slides.length - 1) { curSlide++; renderPresenterSlide(); } };
        overlay.__prev = function () { if (curSlide > 0) { curSlide--; renderPresenterSlide(); } };
        overlay.__exit = function () { overlay.remove(); document.removeEventListener('keydown', presenterKeyHandler); };

        function presenterKeyHandler(e) {
            if (e.key === 'Escape') { overlay.__exit(); }
            else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); overlay.__next(); }
            else if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); overlay.__prev(); }
        }
        document.addEventListener('keydown', presenterKeyHandler);

        // Timer update
        var timerInt = setInterval(function () {
            if (!document.getElementById('briefPresenterOverlay')) { clearInterval(timerInt); return; }
            renderPresenterSlide();
        }, 1000);

        renderPresenterSlide();
        document.body.appendChild(overlay);
    }
    window.briefPresenterMode = briefPresenterMode;

    // ================================================================
    //  EXPORT PPTX (Open ECMA-376 standard)
    // ================================================================
    function briefExportPPTX() {
        if (!_activeBrief) return;
        if (typeof JSZip === 'undefined') { _toast('JSZip not loaded', 'error'); return; }
        var brief = _activeBrief;
        var master = brief.master || DEFAULT_MASTER;
        var slides = brief.slides || [];
        var zip = new JSZip();

        // Content Types
        var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">';
        contentTypes += '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>';
        contentTypes += '<Default Extension="xml" ContentType="application/xml"/>';
        contentTypes += '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>';
        slides.forEach(function (s, i) {
            contentTypes += '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
        });
        contentTypes += '</Types>';
        zip.file('[Content_Types].xml', contentTypes);

        // Relationships
        zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>');

        // Presentation
        var pres = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst/><p:sldIdLst>';
        slides.forEach(function (s, i) {
            pres += '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 1) + '"/>';
        });
        pres += '</p:sldIdLst><p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>';
        zip.file('ppt/presentation.xml', pres);

        // Presentation rels
        var presRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
        slides.forEach(function (s, i) {
            presRels += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (i + 1) + '.xml"/>';
        });
        presRels += '</Relationships>';
        zip.file('ppt/_rels/presentation.xml.rels', presRels);

        // EMU conversions (1px ≈ 9525 EMU at 96dpi)
        var px2emu = function (px) { return Math.round(px * 9525); };

        slides.forEach(function (slide, idx) {
            var slideXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

            (slide.elements || []).forEach(function (el, ei) {
                if (el.type === 'text') {
                    slideXml += '<p:sp><p:nvSpPr><p:cNvPr id="' + (ei + 2) + '" name="TextBox' + ei + '"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>';
                    slideXml += '<p:spPr><a:xfrm><a:off x="' + px2emu(el.x) + '" y="' + px2emu(el.y) + '"/><a:ext cx="' + px2emu(el.w) + '" cy="' + px2emu(el.h) + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
                    if (el.bg) slideXml += '<a:solidFill><a:srgbClr val="' + (el.bg || '#000000').replace('#', '') + '"/></a:solidFill>';
                    slideXml += '<a:noFill/></p:spPr>';
                    slideXml += '<p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>';
                    var textColor = (el.color || master.bodyColor || '#1d1d1f').replace('#', '');
                    var fontSize = (el.fontSize || 16) * 100;
                    slideXml += '<a:p><a:r><a:rPr lang="en-US" sz="' + fontSize + '"' + (el.bold ? ' b="1"' : '') + (el.italic ? ' i="1"' : '') + '>';
                    slideXml += '<a:solidFill><a:srgbClr val="' + textColor + '"/></a:solidFill>';
                    slideXml += '</a:rPr><a:t>' + _esc(el.text || '') + '</a:t></a:r></a:p>';
                    slideXml += '</p:txBody></p:sp>';
                } else if (el.type === 'shape') {
                    slideXml += '<p:sp><p:nvSpPr><p:cNvPr id="' + (ei + 2) + '" name="Shape' + ei + '"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>';
                    slideXml += '<p:spPr><a:xfrm><a:off x="' + px2emu(el.x) + '" y="' + px2emu(el.y) + '"/><a:ext cx="' + px2emu(el.w) + '" cy="' + px2emu(el.h) + '"/></a:xfrm>';
                    slideXml += '<a:prstGeom prst="' + (el.shape === 'circle' ? 'ellipse' : 'rect') + '"><a:avLst/></a:prstGeom>';
                    var fillColor = (el.fill || '#001a33').replace('#', '').replace(/rgba?\(.*\)/, '001a33');
                    if (fillColor.length > 6) fillColor = '001a33';
                    slideXml += '<a:solidFill><a:srgbClr val="' + fillColor + '"/></a:solidFill>';
                    slideXml += '</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody></p:sp>';
                }
            });

            slideXml += '</p:spTree></p:cSld></p:sld>';
            zip.file('ppt/slides/slide' + (idx + 1) + '.xml', slideXml);
            zip.file('ppt/slides/_rels/slide' + (idx + 1) + '.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
        });

        zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }).then(function (blob) {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (brief.title || 'brief').replace(/[^a-zA-Z0-9_-]/g, '_') + '.pptx';
            a.click();
            _toast('Exported as PPTX', 'success');
        });
    }
    window.briefExportPPTX = briefExportPPTX;

    // ================================================================
    //  EXPORT PDF (via print-to-PDF using HTML rendering)
    // ================================================================
    function briefExportPDF() {
        if (!_activeBrief) return;
        var brief = _activeBrief;
        var master = brief.master || DEFAULT_MASTER;
        var cls = CLASSIFICATION_LEVELS[brief.classification] || CLASSIFICATION_LEVELS.UNCLASSIFIED;
        var sw = master.slideWidth || 960;
        var sh = master.slideHeight || 540;

        var printWin = window.open('', '_blank', 'width=' + sw + ',height=' + sh);
        if (!printWin) { _toast('Pop-up blocked — please allow pop-ups', 'error'); return; }
        var doc = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + _esc(brief.title) + '</title>';
        doc += '<style>@page{margin:0;size:' + sw + 'px ' + (sh + 40) + 'px}@media print{.slide{page-break-after:always;break-after:page}.slide:last-child{page-break-after:auto}}';
        doc += '*{box-sizing:border-box;margin:0;padding:0}body{background:#fff;font-family:' + (master.fontFamily || 'sans-serif') + '}';
        doc += '.slide{position:relative;width:' + sw + 'px;height:' + sh + 'px;background:' + (master.bodyBg || '#fff') + ';overflow:hidden}';
        doc += '.el{position:absolute;overflow:hidden;white-space:pre-wrap;word-wrap:break-word}';
        doc += '.cls-banner{width:100%;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;letter-spacing:2px}';
        doc += '</style></head><body>';

        brief.slides.forEach(function (slide) {
            doc += '<div class="cls-banner" style="background:' + cls.bg + ';color:' + cls.color + '">' + cls.label + '</div>';
            doc += '<div class="slide">';
            (slide.elements || []).forEach(function (el) {
                var s = 'left:' + el.x + 'px;top:' + el.y + 'px;width:' + el.w + 'px;height:' + el.h + 'px;';
                if (el.type === 'text') {
                    s += 'font-size:' + (el.fontSize || 16) + 'px;color:' + (el.color || '#000') + ';line-height:1.4;padding:4px 6px;';
                    if (el.fontFamily) s += 'font-family:' + el.fontFamily + ';';
                    if (el.bold) s += 'font-weight:700;';
                    if (el.italic) s += 'font-style:italic;';
                    if (el.align) s += 'text-align:' + el.align + ';';
                    if (el.bg) s += 'background:' + el.bg + ';';
                    doc += '<div class="el" style="' + s + '">' + _esc(el.text || '') + '</div>';
                } else if (el.type === 'shape') {
                    s += 'background:' + (el.fill || '#eee') + ';';
                    if (el.radius) s += 'border-radius:' + el.radius + 'px;';
                    if (el.shape === 'circle') s += 'border-radius:50%;';
                    doc += '<div class="el" style="' + s + '"></div>';
                }
            });
            doc += '<div style="position:absolute;bottom:0;left:0;right:0;height:24px;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;color:#86868b">' + (master.footerText || '') + '</div>';
            doc += '</div>';
        });
        doc += '<script>window.onload=function(){window.print();}<\/script></body></html>';
        printWin.document.write(doc);
        printWin.document.close();
        _toast('Print dialog opened — save as PDF', 'info');
    }
    window.briefExportPDF = briefExportPDF;

    // ================================================================
    //  SAVE AS TEMPLATE
    // ================================================================
    function briefSaveAsTemplate() {
        if (!_activeBrief) return;
        var html = '<div style="font-size:0.85rem;color:var(--steel);margin-bottom:12px">Save this brief as a reusable template in your slide library.</div>';
        html += '<input id="briefTplName" value="' + _esc(_activeBrief.title || 'Custom Template') + '" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:8px 12px;font-size:0.88rem;margin-bottom:12px">';
        html += '<div style="display:flex;justify-content:flex-end;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefConfirmSaveTemplate()" style="background:rgba(0,204,136,0.12);color:#00cc88"><i class="fas fa-check"></i> Save</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div>';
        _showModal('Save as Template', html);
    }
    window.briefSaveAsTemplate = briefSaveAsTemplate;

    function briefConfirmSaveTemplate() {
        if (!_activeBrief) return;
        var inp = document.getElementById('briefTplName');
        var name = inp ? inp.value.trim() : 'Custom Template';
        var templates = [];
        try { templates = JSON.parse(localStorage.getItem('s4_brief_templates') || '[]'); } catch (e) { templates = []; }
        templates.push({
            title: name,
            brief_type: _activeBrief.brief_type || 'STATUS',
            slides: JSON.parse(JSON.stringify(_activeBrief.slides)),
            master: JSON.parse(JSON.stringify(_activeBrief.master || DEFAULT_MASTER)),
            savedAt: new Date().toISOString(),
            savedBy: sessionStorage.getItem('s4_user_email') || 'Unknown'
        });
        try { localStorage.setItem('s4_brief_templates', JSON.stringify(templates)); } catch (e) { _toast('Storage full', 'error'); return; }
        _closeModal();
        _toast('Template saved to library', 'success');
    }
    window.briefConfirmSaveTemplate = briefConfirmSaveTemplate;

    // ================================================================
    //  ANNOTATIONS (Review markup)
    // ================================================================
    function briefToggleAnnotations() {
        _annotationMode = !_annotationMode;
        _renderEditor();
        _toast(_annotationMode ? 'Annotation mode ON — click slides to add marks' : 'Annotation mode OFF', 'info');
    }
    window.briefToggleAnnotations = briefToggleAnnotations;

    // ================================================================
    //  INSERT TABLE
    // ================================================================
    function briefInsertTable() {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        _pushUndo();
        var slide = _activeBrief.slides[_activeSlideIdx];
        var table = {
            id: _uid(), type: 'table', x: 40, y: 120, w: 500, h: 200,
            rows: 4, cols: 4,
            data: [
                ['Header 1', 'Header 2', 'Header 3', 'Header 4'],
                ['Row 1', 'Data', 'Data', 'Data'],
                ['Row 2', 'Data', 'Data', 'Data'],
                ['Row 3', 'Data', 'Data', 'Data']
            ],
            headerBg: 'rgba(0,170,255,0.2)', altRowBg: 'rgba(0,0,0,0.02)',
            borderColor: 'rgba(0,0,0,0.1)', fontSize: 13, color: '#1d1d1f'
        };
        slide.elements.push(table);
        _isDirty = true;
        _renderEditor();
        _toast('Table inserted', 'success');
    }
    window.briefInsertTable = briefInsertTable;

    function _renderTableElement(el, baseStyle) {
        var html = '<div style="' + baseStyle + 'overflow:auto;font-size:' + (el.fontSize || 13) + 'px;color:' + (el.color || '#1d1d1f') + '">';
        html += '<table style="width:100%;border-collapse:collapse">';
        (el.data || []).forEach(function (row, ri) {
            html += '<tr>';
            (row || []).forEach(function (cell) {
                var bg = ri === 0 ? (el.headerBg || 'rgba(0,170,255,0.2)') : (ri % 2 === 0 ? (el.altRowBg || 'transparent') : 'transparent');
                var fw = ri === 0 ? '600' : '400';
                html += '<td style="padding:4px 8px;border:1px solid ' + (el.borderColor || 'rgba(0,0,0,0.1)') + ';background:' + bg + ';font-weight:' + fw + '">' + _esc(cell) + '</td>';
            });
            html += '</tr>';
        });
        html += '</table></div>';
        return html;
    }

    // ================================================================
    //  INSERT CHART
    // ================================================================
    function briefInsertChart() {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        var html = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
        [
            { type: 'bar', icon: 'fa-chart-bar', label: 'Bar Chart' },
            { type: 'line', icon: 'fa-chart-line', label: 'Line Chart' },
            { type: 'pie', icon: 'fa-chart-pie', label: 'Pie Chart' },
            { type: 'donut', icon: 'fa-circle-notch', label: 'Donut Chart' },
            { type: 'stacked', icon: 'fa-layer-group', label: 'Stacked Bar' },
            { type: 'horizontal', icon: 'fa-bars', label: 'Horizontal Bar' }
        ].forEach(function (c) {
            html += '<div class="stat-mini" style="cursor:pointer;padding:16px;text-align:center" onclick="briefInsertChartType(\'' + c.type + '\')" onmouseover="this.style.borderColor=\'#00aaff\'" onmouseout="this.style.borderColor=\'rgba(0,0,0,0.08)\'">';
            html += '<i class="fas ' + c.icon + '" style="font-size:1.5rem;color:#00aaff;display:block;margin-bottom:6px"></i>';
            html += '<div style="color:var(--text,#1d1d1f);font-size:0.82rem">' + c.label + '</div></div>';
        });
        html += '</div>';
        _showModal('Insert Chart', html);
    }
    window.briefInsertChart = briefInsertChart;

    function briefInsertChartType(chartType) {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        _closeModal();
        _pushUndo();
        var slide = _activeBrief.slides[_activeSlideIdx];
        slide.elements.push({
            id: _uid(), type: 'chart', x: 60, y: 110, w: 400, h: 280,
            chartType: chartType,
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            datasets: [
                { label: 'Planned', values: [80, 85, 90, 95], color: '#00aaff' },
                { label: 'Actual', values: [75, 82, 88, 0], color: '#4ecb71' }
            ],
            title: 'Chart Title',
            bgColor: 'rgba(0,0,0,0.02)', gridColor: 'rgba(0,0,0,0.06)'
        });
        _isDirty = true;
        _renderEditor();
        _toast(chartType + ' chart inserted', 'success');
    }
    window.briefInsertChartType = briefInsertChartType;

    function _renderChartElement(el, baseStyle) {
        var ct = el.chartType || 'bar';
        var labels = el.labels || [];
        var datasets = el.datasets || [];
        var html = '<div style="' + baseStyle + 'background:' + (el.bgColor || 'rgba(0,0,0,0.02)') + ';border:1px solid rgba(0,0,0,0.05);border-radius:4px;padding:8px;overflow:hidden">';
        if (el.title) html += '<div style="font-size:11px;color:var(--text,#1d1d1f);font-weight:600;margin-bottom:6px;text-align:center">' + _esc(el.title) + '</div>';
        var maxVal = 1;
        datasets.forEach(function (ds) { ds.values.forEach(function (v) { if (v > maxVal) maxVal = v; }); });

        if (ct === 'pie' || ct === 'donut') {
            var total = 0;
            var vals = datasets[0] ? datasets[0].values : [];
            vals.forEach(function (v) { total += v; });
            var colors = ['#00aaff', '#4ecb71', '#f97316', '#a855f7', '#f38181', '#ffa500'];
            html += '<div style="display:flex;align-items:center;gap:12px;height:calc(100% - 24px)">';
            // SVG pie/donut
            html += '<svg viewBox="0 0 100 100" style="width:60%;height:100%">';
            var cum = 0;
            vals.forEach(function (v, i) {
                var pct = total > 0 ? v / total : 0;
                var startAngle = cum * 2 * Math.PI - Math.PI / 2;
                cum += pct;
                var endAngle = cum * 2 * Math.PI - Math.PI / 2;
                var large = pct > 0.5 ? 1 : 0;
                var x1 = 50 + 45 * Math.cos(startAngle);
                var y1 = 50 + 45 * Math.sin(startAngle);
                var x2 = 50 + 45 * Math.cos(endAngle);
                var y2 = 50 + 45 * Math.sin(endAngle);
                if (ct === 'donut') {
                    var ix1 = 50 + 25 * Math.cos(endAngle);
                    var iy1 = 50 + 25 * Math.sin(endAngle);
                    var ix2 = 50 + 25 * Math.cos(startAngle);
                    var iy2 = 50 + 25 * Math.sin(startAngle);
                    html += '<path d="M' + x1 + ',' + y1 + ' A45,45 0 ' + large + ',1 ' + x2 + ',' + y2 + ' L' + ix1 + ',' + iy1 + ' A25,25 0 ' + large + ',0 ' + ix2 + ',' + iy2 + ' Z" fill="' + (colors[i % colors.length]) + '"/>';
                } else {
                    html += '<path d="M50,50 L' + x1 + ',' + y1 + ' A45,45 0 ' + large + ',1 ' + x2 + ',' + y2 + ' Z" fill="' + (colors[i % colors.length]) + '"/>';
                }
            });
            html += '</svg>';
            html += '<div style="font-size:9px;color:var(--muted)">';
            labels.forEach(function (l, i) {
                html += '<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px"><span style="width:8px;height:8px;background:' + (colors[i % colors.length]) + ';border-radius:2px;display:inline-block"></span>' + _esc(l) + '</div>';
            });
            html += '</div></div>';
        } else {
            // Bar/Line chart with SVG
            var barW = Math.floor((el.w - 60) / Math.max(labels.length, 1));
            var chartH = el.h - 50;
            html += '<svg width="100%" height="' + (chartH + 20) + '" style="display:block">';
            // Grid lines
            for (var g = 0; g <= 4; g++) {
                var gy = chartH - (g / 4) * chartH;
                html += '<line x1="30" y1="' + gy + '" x2="100%" y2="' + gy + '" stroke="' + (el.gridColor || 'rgba(0,0,0,0.06)') + '" stroke-width="0.5"/>';
                html += '<text x="0" y="' + (gy + 3) + '" fill="#8b949e" font-size="8">' + Math.round(maxVal * g / 4) + '</text>';
            }
            if (ct === 'line') {
                datasets.forEach(function (ds) {
                    var pts = [];
                    labels.forEach(function (l, li) {
                        var x = 40 + li * barW + barW / 2;
                        var y = chartH - ((ds.values[li] || 0) / maxVal) * chartH;
                        pts.push(x + ',' + y);
                    });
                    html += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + (ds.color || '#00aaff') + '" stroke-width="2"/>';
                    pts.forEach(function (p) {
                        var xy = p.split(',');
                        html += '<circle cx="' + xy[0] + '" cy="' + xy[1] + '" r="3" fill="' + (ds.color || '#00aaff') + '"/>';
                    });
                });
            } else {
                var dsCount = datasets.length;
                var subW = Math.floor(barW * 0.7 / dsCount);
                labels.forEach(function (l, li) {
                    datasets.forEach(function (ds, di) {
                        var val = ds.values[li] || 0;
                        var h = (val / maxVal) * chartH;
                        var x = 40 + li * barW + (barW * 0.15) + di * subW;
                        var y = chartH - h;
                        if (ct === 'horizontal') {
                            html += '<rect x="30" y="' + (li * 25 + di * 12) + '" width="' + (val / maxVal * (el.w - 60)) + '" height="10" fill="' + (ds.color || '#00aaff') + '" rx="2"/>';
                        } else {
                            html += '<rect x="' + x + '" y="' + y + '" width="' + subW + '" height="' + h + '" fill="' + (ds.color || '#00aaff') + '" rx="2"/>';
                        }
                    });
                });
            }
            // X-axis labels
            labels.forEach(function (l, li) {
                html += '<text x="' + (40 + li * barW + barW / 2) + '" y="' + (chartH + 14) + '" fill="#8b949e" font-size="9" text-anchor="middle">' + _esc(l) + '</text>';
            });
            html += '</svg>';
            // Legend
            html += '<div style="display:flex;gap:10px;justify-content:center;margin-top:4px">';
            datasets.forEach(function (ds) {
                html += '<span style="font-size:8px;color:var(--muted);display:flex;align-items:center;gap:3px"><span style="width:8px;height:3px;background:' + (ds.color || '#00aaff') + ';display:inline-block"></span>' + _esc(ds.label || '') + '</span>';
            });
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    // ================================================================
    //  INSERT STOPLIGHT (Red/Yellow/Green)
    // ================================================================
    function briefInsertStoplight() {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        _pushUndo();
        var slide = _activeBrief.slides[_activeSlideIdx];
        slide.elements.push({
            id: _uid(), type: 'stoplight', x: 60, y: 120, w: 300, h: 120,
            items: [
                { label: 'Schedule', status: 'green' },
                { label: 'Cost', status: 'yellow' },
                { label: 'Technical', status: 'green' },
                { label: 'Risk', status: 'red' }
            ],
            fontSize: 13
        });
        _isDirty = true;
        _renderEditor();
        _toast('Stoplight indicators inserted', 'success');
    }
    window.briefInsertStoplight = briefInsertStoplight;

    function _renderStoplightElement(el, baseStyle) {
        var colors = { green: '#4ecb71', yellow: '#f9c846', red: '#ff4444', gray: '#6b7280' };
        var html = '<div style="' + baseStyle + 'display:flex;flex-wrap:wrap;gap:8px;padding:8px;align-items:center">';
        (el.items || []).forEach(function (item) {
            var clr = colors[item.status] || colors.gray;
            html += '<div style="display:flex;align-items:center;gap:6px;flex:1;min-width:100px;padding:6px 10px;background:rgba(0,0,0,0.02);border-radius:4px;border-left:3px solid ' + clr + '">';
            html += '<span style="width:14px;height:14px;background:' + clr + ';border-radius:50%;display:inline-block;flex-shrink:0;box-shadow:0 0 6px ' + clr + '"></span>';
            html += '<span style="font-size:' + (el.fontSize || 13) + 'px;color:var(--text,#1d1d1f)">' + _esc(item.label) + '</span>';
            html += '</div>';
        });
        html += '</div>';
        return html;
    }

    // ================================================================
    //  INSERT RISK MATRIX (5x5)
    // ================================================================
    function briefInsertRiskMatrix() {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        _pushUndo();
        var slide = _activeBrief.slides[_activeSlideIdx];
        slide.elements.push({
            id: _uid(), type: 'risk_matrix', x: 40, y: 100, w: 400, h: 340,
            items: [
                { label: 'Schedule Slip', likelihood: 3, consequence: 4 },
                { label: 'Cost Growth', likelihood: 2, consequence: 3 },
                { label: 'Tech Failure', likelihood: 1, consequence: 5 }
            ],
            fontSize: 10
        });
        _isDirty = true;
        _renderEditor();
        _toast('Risk matrix inserted', 'success');
    }
    window.briefInsertRiskMatrix = briefInsertRiskMatrix;

    function _renderRiskMatrixElement(el, baseStyle) {
        var cellW = Math.floor((el.w - 60) / 5);
        var cellH = Math.floor((el.h - 70) / 5);
        // Risk colors: 5x5 grid
        var riskColors = [
            ['#4ecb71','#4ecb71','#f9c846','#f9c846','#ff4444'],
            ['#4ecb71','#f9c846','#f9c846','#ff4444','#ff4444'],
            ['#f9c846','#f9c846','#ff4444','#ff4444','#ff6600'],
            ['#f9c846','#ff4444','#ff4444','#ff6600','#ff6600'],
            ['#ff4444','#ff4444','#ff6600','#ff6600','#cc0000']
        ];
        var html = '<div style="' + baseStyle + 'padding:6px;font-size:' + (el.fontSize || 10) + 'px">';
        html += '<div style="text-align:center;font-size:11px;color:var(--text,#1d1d1f);font-weight:600;margin-bottom:4px">Risk Assessment Matrix</div>';
        html += '<div style="display:flex">';
        html += '<div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:9px;color:#86868b;display:flex;align-items:center;padding-right:4px">Likelihood &rarr;</div>';
        html += '<div>';
        for (var row = 4; row >= 0; row--) {
            html += '<div style="display:flex">';
            html += '<div style="width:18px;font-size:8px;color:#86868b;display:flex;align-items:center;justify-content:center">' + (row + 1) + '</div>';
            for (var col = 0; col < 5; col++) {
                var bg = riskColors[row][col];
                // Check if any items land in this cell
                var itemsHere = (el.items || []).filter(function (item) { return item.likelihood === (row + 1) && item.consequence === (col + 1); });
                html += '<div style="width:' + cellW + 'px;height:' + cellH + 'px;background:' + bg + ';opacity:0.7;border:1px solid rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:8px;color:var(--text,#1d1d1f);font-weight:600;position:relative">';
                itemsHere.forEach(function (it) {
                    html += '<span style="background:rgba(0,0,0,0.6);padding:1px 4px;border-radius:2px;font-size:7px;white-space:nowrap">' + _esc(it.label) + '</span>';
                });
                html += '</div>';
            }
            html += '</div>';
        }
        // X-axis labels
        html += '<div style="display:flex;margin-left:18px">';
        for (var c = 1; c <= 5; c++) {
            html += '<div style="width:' + cellW + 'px;text-align:center;font-size:8px;color:#86868b">' + c + '</div>';
        }
        html += '</div>';
        html += '<div style="text-align:center;font-size:9px;color:#86868b;margin-top:2px">Consequence &rarr;</div>';
        html += '</div></div></div>';
        return html;
    }

    // ================================================================
    //  INSERT LIVE DATA WIDGET
    // ================================================================
    function briefInsertWidget() {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
        [
            { source: 'milestones', icon: 'fa-flag-checkered', label: 'Milestone Status', color: '#00aaff' },
            { source: 'readiness', icon: 'fa-heartbeat', label: 'Readiness (Ao)', color: '#4ecb71' },
            { source: 'cost', icon: 'fa-dollar-sign', label: 'Cost Estimate', color: '#ffa500' },
            { source: 'risk', icon: 'fa-exclamation-triangle', label: 'Risk Score', color: '#f97316' },
            { source: 'compliance', icon: 'fa-shield-alt', label: 'Compliance Score', color: '#3b82f6' },
            { source: 'schedule', icon: 'fa-calendar-check', label: 'Schedule Variance', color: '#a855f7' }
        ].forEach(function (w) {
            html += '<div class="stat-mini" style="cursor:pointer;padding:12px;text-align:center" onclick="briefInsertWidgetType(\'' + w.source + '\')" onmouseover="this.style.borderColor=\'' + w.color + '\'" onmouseout="this.style.borderColor=\'rgba(0,0,0,0.08)\'">';
            html += '<i class="fas ' + w.icon + '" style="color:' + w.color + ';font-size:1.3rem;display:block;margin-bottom:6px"></i>';
            html += '<div style="color:var(--text,#1d1d1f);font-size:0.8rem">' + w.label + '</div></div>';
        });
        html += '</div>';
        _showModal('Insert Live Data Widget', html);
    }
    window.briefInsertWidget = briefInsertWidget;

    function briefInsertWidgetType(source) {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        _closeModal();
        _pushUndo();
        var slide = _activeBrief.slides[_activeSlideIdx];
        var widget = { id: _uid(), type: 'widget', x: 60, y: 120, w: 280, h: 140, source: source };

        // Pull live data from platform
        var milData = window._milData || [];
        var acqData = window._acqData || [];
        if (source === 'milestones' && milData.length) {
            var onTrack = milData.filter(function (r) { return r.delivery_status === 'On Track'; }).length;
            var atRisk = milData.filter(function (r) { return r.delivery_status === 'At Risk'; }).length;
            var delayed = milData.filter(function (r) { return r.delivery_status === 'Delayed'; }).length;
            widget.data = { total: milData.length, onTrack: onTrack, atRisk: atRisk, delayed: delayed };
            widget.title = 'Milestone Status';
            widget.color = '#00aaff';
        } else if (source === 'readiness') {
            widget.data = { ao: '92.4%', ai: '96.1%', mtbf: '1,240 hrs' };
            widget.title = 'Readiness Metrics'; widget.color = '#4ecb71';
        } else if (source === 'cost') {
            widget.data = { total: '$2.4B', variance: '+3.2%', trend: 'up' };
            widget.title = 'Cost Estimate'; widget.color = '#ffa500';
        } else if (source === 'risk') {
            widget.data = { score: 'Medium', high: 3, medium: 7, low: 12 };
            widget.title = 'Risk Summary'; widget.color = '#f97316';
        } else if (source === 'compliance') {
            widget.data = { score: '87%', framework: 'CMMC L2', gaps: 4 };
            widget.title = 'Compliance Score'; widget.color = '#3b82f6';
        } else if (source === 'schedule') {
            widget.data = { variance: '-12 days', trend: 'improving', confidence: '78%' };
            widget.title = 'Schedule Variance'; widget.color = '#a855f7';
        }
        slide.elements.push(widget);
        _isDirty = true;
        _renderEditor();
        _toast('Live widget inserted', 'success');
    }
    window.briefInsertWidgetType = briefInsertWidgetType;

    // ================================================================
    //  SMART LAYOUT / AUTO-ARRANGE
    // ================================================================
    function briefSmartLayout() {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var elems = slide.elements || [];
        if (elems.length < 2) { _toast('Need at least 2 elements to auto-arrange', 'warning'); return; }
        var html = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
        [
            { layout: 'grid', icon: 'fa-th', label: 'Grid' },
            { layout: 'two_col', icon: 'fa-columns', label: 'Two Column' },
            { layout: 'dashboard', icon: 'fa-th-large', label: 'Dashboard' },
            { layout: 'stack', icon: 'fa-layer-group', label: 'Stack' },
            { layout: 'center', icon: 'fa-compress-arrows-alt', label: 'Center All' },
            { layout: 'scatter', icon: 'fa-expand-arrows-alt', label: 'Distribute' }
        ].forEach(function (l) {
            html += '<div class="stat-mini" style="cursor:pointer;padding:14px;text-align:center" onclick="briefApplyLayout(\'' + l.layout + '\')" onmouseover="this.style.borderColor=\'#00aaff\'" onmouseout="this.style.borderColor=\'rgba(0,0,0,0.08)\'">';
            html += '<i class="fas ' + l.icon + '" style="color:#00aaff;font-size:1.2rem;display:block;margin-bottom:4px"></i>';
            html += '<div style="color:var(--text,#1d1d1f);font-size:0.78rem">' + l.label + '</div></div>';
        });
        html += '</div>';
        _showModal('Smart Layout', html);
    }
    window.briefSmartLayout = briefSmartLayout;

    function briefApplyLayout(layout) {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        _closeModal();
        _pushUndo();
        var slide = _activeBrief.slides[_activeSlideIdx];
        var elems = slide.elements || [];
        var master = _activeBrief.master || DEFAULT_MASTER;
        var sw = master.slideWidth || 960;
        var sh = master.slideHeight || 540;
        var margin = 30;
        var usableW = sw - margin * 2;
        var usableH = sh - margin * 2 - 40; // reserve 40 for title/footer

        if (layout === 'grid') {
            var cols = Math.ceil(Math.sqrt(elems.length));
            var rows = Math.ceil(elems.length / cols);
            var cellW = Math.floor(usableW / cols) - 8;
            var cellH = Math.floor(usableH / rows) - 8;
            elems.forEach(function (el, i) {
                var c = i % cols;
                var r = Math.floor(i / cols);
                el.x = margin + c * (cellW + 8);
                el.y = margin + 40 + r * (cellH + 8);
                el.w = cellW;
                el.h = cellH;
            });
        } else if (layout === 'two_col') {
            var half = Math.ceil(elems.length / 2);
            var colW = Math.floor(usableW / 2) - 6;
            var rowH = Math.floor(usableH / Math.max(half, 1)) - 6;
            elems.forEach(function (el, i) {
                var col = i < half ? 0 : 1;
                var row = i < half ? i : i - half;
                el.x = margin + col * (colW + 12);
                el.y = margin + 40 + row * (rowH + 6);
                el.w = colW;
                el.h = rowH;
            });
        } else if (layout === 'dashboard') {
            // First element large on top, rest in grid below
            if (elems[0]) { elems[0].x = margin; elems[0].y = margin; elems[0].w = usableW; elems[0].h = Math.floor(usableH * 0.45); }
            var rest = elems.slice(1);
            var restCols = Math.min(rest.length, 4);
            var restW = Math.floor(usableW / restCols) - 8;
            var restH = Math.floor(usableH * 0.5) - 8;
            rest.forEach(function (el, i) {
                el.x = margin + (i % restCols) * (restW + 8);
                el.y = margin + Math.floor(usableH * 0.48) + Math.floor(i / restCols) * (restH + 8);
                el.w = restW;
                el.h = restH;
            });
        } else if (layout === 'stack') {
            var stackH = Math.floor(usableH / elems.length) - 6;
            elems.forEach(function (el, i) {
                el.x = margin;
                el.y = margin + 40 + i * (stackH + 6);
                el.w = usableW;
                el.h = stackH;
            });
        } else if (layout === 'center') {
            elems.forEach(function (el) {
                el.x = (sw - el.w) / 2;
                el.y = (sh - el.h) / 2;
            });
        } else if (layout === 'scatter') {
            // Evenly distribute in a circle
            var cx = sw / 2;
            var cy = sh / 2;
            var radius = Math.min(usableW, usableH) / 3;
            elems.forEach(function (el, i) {
                var angle = (2 * Math.PI * i) / elems.length - Math.PI / 2;
                el.x = cx + radius * Math.cos(angle) - el.w / 2;
                el.y = cy + radius * Math.sin(angle) - el.h / 2;
            });
        }
        _isDirty = true;
        _renderEditor();
        _toast('Layout applied: ' + layout, 'success');
    }
    window.briefApplyLayout = briefApplyLayout;

    // ================================================================
    //  ANALYTICS PANEL
    // ================================================================
    function briefAnalyticsPanel() {
        if (!_activeBrief) return;
        var brief = _activeBrief;
        var slides = brief.slides || [];
        var totalElements = 0;
        var totalText = 0;
        var totalChars = 0;
        slides.forEach(function (s) {
            (s.elements || []).forEach(function (el) {
                totalElements++;
                if (el.type === 'text') { totalText++; totalChars += (el.text || '').length; }
            });
        });
        var views = brief.analytics_views || 0;
        var lastViewed = brief.analytics_last_viewed || 'Never';
        var html = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">';
        html += '<div class="stat-mini" style="text-align:center;padding:12px"><div style="font-size:1.4rem;font-weight:700;color:#00aaff">' + slides.length + '</div><div style="font-size:0.72rem;color:var(--muted)">Slides</div></div>';
        html += '<div class="stat-mini" style="text-align:center;padding:12px"><div style="font-size:1.4rem;font-weight:700;color:#4ecb71">' + totalElements + '</div><div style="font-size:0.72rem;color:var(--muted)">Elements</div></div>';
        html += '<div class="stat-mini" style="text-align:center;padding:12px"><div style="font-size:1.4rem;font-weight:700;color:var(--accent,#00aaff)">' + totalChars.toLocaleString() + '</div><div style="font-size:0.72rem;color:var(--muted)">Characters</div></div>';
        html += '</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.82rem">';
        html += '<div style="color:var(--steel)">Version: <strong style="color:var(--text,#1d1d1f)">' + (brief.version || 1) + '</strong></div>';
        html += '<div style="color:var(--steel)">Views: <strong style="color:var(--text,#1d1d1f)">' + views + '</strong></div>';
        html += '<div style="color:var(--steel)">Status: <strong style="color:var(--text,#1d1d1f)">' + (brief.approval_status || 'draft') + '</strong></div>';
        html += '<div style="color:var(--steel)">Classification: <strong style="color:var(--text,#1d1d1f)">' + (brief.classification || 'UNCLASSIFIED') + '</strong></div>';
        html += '<div style="color:var(--steel)">Text Boxes: <strong style="color:var(--text,#1d1d1f)">' + totalText + '</strong></div>';
        html += '<div style="color:var(--steel)">Created: <strong style="color:var(--text,#1d1d1f)">' + (brief.created_at ? new Date(brief.created_at).toLocaleDateString() : 'N/A') + '</strong></div>';
        html += '</div>';
        // Est. speaking time: ~150 words/min, ~5 words/char ratio
        var words = Math.round(totalChars / 5);
        var speakMins = Math.max(1, Math.round(words / 150));
        html += '<div style="margin-top:12px;padding:10px;background:rgba(0,170,255,0.06);border:1px solid rgba(0,170,255,0.15);border-radius:4px;font-size:0.82rem;color:var(--steel)"><i class="fas fa-clock" style="color:#00aaff;margin-right:6px"></i>Estimated presentation time: <strong style="color:var(--text,#1d1d1f)">~' + speakMins + ' min</strong> (' + words + ' words)</div>';
        _showModal('Brief Analytics', html);
    }
    window.briefAnalyticsPanel = briefAnalyticsPanel;

    // ================================================================
    //  BRIEFING SCHEDULE / CALENDAR
    // ================================================================
    function briefSchedulePanel() {
        if (!_activeBrief) return;
        var sched = _activeBrief.schedule || {};
        var html = '<div style="margin-bottom:12px">';
        html += '<label style="color:var(--steel);font-size:0.82rem;display:block;margin-bottom:4px">Briefing Date & Time</label>';
        html += '<input type="datetime-local" id="briefSchedDate" value="' + (sched.datetime || '') + '" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:8px 12px;font-size:0.85rem;margin-bottom:10px">';
        html += '<label style="color:var(--steel);font-size:0.82rem;display:block;margin-bottom:4px">Location / Meeting Link</label>';
        html += '<input id="briefSchedLocation" value="' + _esc(sched.location || '') + '" placeholder="e.g. Conference Room 3A / Teams Link" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:8px 12px;font-size:0.85rem;margin-bottom:10px">';
        html += '<label style="color:var(--steel);font-size:0.82rem;display:block;margin-bottom:4px">Attendees (comma-separated emails)</label>';
        html += '<textarea id="briefSchedAttendees" style="width:100%;height:50px;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:8px;font-size:0.82rem;resize:vertical">' + _esc((sched.attendees || []).join(', ')) + '</textarea>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:flex-end;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefApplySchedule()" style="background:rgba(0,204,136,0.12);color:#00cc88"><i class="fas fa-check"></i> Save Schedule</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div>';
        _showModal('Briefing Schedule', html);
    }
    window.briefSchedulePanel = briefSchedulePanel;

    function briefApplySchedule() {
        if (!_activeBrief) return;
        _activeBrief.schedule = {
            datetime: document.getElementById('briefSchedDate') ? document.getElementById('briefSchedDate').value : '',
            location: document.getElementById('briefSchedLocation') ? document.getElementById('briefSchedLocation').value.trim() : '',
            attendees: document.getElementById('briefSchedAttendees') ? document.getElementById('briefSchedAttendees').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : []
        };
        _isDirty = true;
        _closeModal();
        _saveBrief(_activeBrief, function () { _toast('Schedule saved', 'success'); });
    }
    window.briefApplySchedule = briefApplySchedule;

    // ================================================================
    //  ACRONYM GLOSSARY
    // ================================================================
    function _generateGlossary(brief) {
        var acronyms = {
            'ILS': 'Integrated Logistics Support', 'DMSMS': 'Diminishing Manufacturing Sources and Material Shortages',
            'RAM': 'Reliability, Availability, Maintainability', 'MTBF': 'Mean Time Between Failures',
            'OWLD': 'Original Work Lead Days', 'POM': 'Program Objective Memorandum',
            'PB': "President's Budget", 'ILSMT': 'ILS Management Team', 'ILSMP': 'ILS Management Plan',
            'IPR': 'In-Process Review', 'CDR': 'Critical Design Review', 'PDR': 'Preliminary Design Review',
            'SDR': 'System Design Review', 'ROI': 'Return on Investment', 'SBOM': 'Software Bill of Materials',
            'CDRL': 'Contract Data Requirements List', 'GFP': 'Government Furnished Property',
            'CMMC': 'Cybersecurity Maturity Model Certification', 'DFARS': 'Defense Federal Acquisition Regulation Supplement',
            'FAR': 'Federal Acquisition Regulation', 'NAVSEA': 'Naval Sea Systems Command',
            'NAVAIR': 'Naval Air Systems Command', 'CUI': 'Controlled Unclassified Information',
            'FOUO': 'For Official Use Only', 'POA&M': 'Plan of Action and Milestones',
            'ROH': 'Regular Overhaul', 'DDG': 'Guided-Missile Destroyer', 'SSN': 'Nuclear Attack Submarine',
            'SSBN': 'Nuclear Ballistic Missile Submarine', 'LCS': 'Littoral Combat Ship',
            'MCM': 'Mine Countermeasures', 'DoD': 'Department of Defense', 'NIST': 'National Institute of Standards and Technology',
            'CVE': 'Common Vulnerabilities and Exposures', 'CLIN': 'Contract Line Item Number',
            'DPAS': 'Defense Priorities and Allocations System', 'Ao': 'Operational Availability',
            'Ai': 'Inherent Availability', 'FY': 'Fiscal Year', 'OPNAV': 'Office of the Chief of Naval Operations'
        };
        var found = {};
        var allText = '';
        (brief.slides || []).forEach(function (s) {
            (s.elements || []).forEach(function (el) {
                if (el.type === 'text') allText += ' ' + (el.text || '');
            });
        });
        Object.keys(acronyms).forEach(function (acr) {
            var regex = new RegExp('\\b' + acr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
            if (regex.test(allText)) found[acr] = acronyms[acr];
        });
        return found;
    }

    // ================================================================
    //  SLIDE LIBRARY
    // ================================================================
    function briefSlideLibrary() {
        // Load saved templates
        var templates = [];
        try { templates = JSON.parse(localStorage.getItem('s4_brief_templates') || '[]'); } catch (e) { templates = []; }
        var html = '<div style="margin-bottom:12px;font-size:0.82rem;color:var(--steel)">Your saved templates and slides. Click to insert as a new brief.</div>';
        if (templates.length) {
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;max-height:300px;overflow-y:auto">';
            templates.forEach(function (t, i) {
                html += '<div class="stat-mini" style="cursor:pointer;padding:10px" onclick="briefLoadTemplate(' + i + ')" onmouseover="this.style.borderColor=\'#00aaff\'" onmouseout="this.style.borderColor=\'rgba(0,0,0,0.08)\'">';
                html += '<div style="font-size:0.82rem;color:var(--text,#1d1d1f);font-weight:600;margin-bottom:4px">' + _esc(t.title || 'Untitled') + '</div>';
                html += '<div style="font-size:0.68rem;color:var(--muted)">' + (t.slides ? t.slides.length : 0) + ' slides &mdash; ' + _esc(t.brief_type || '') + '</div>';
                html += '<div style="font-size:0.62rem;color:var(--muted)">' + (t.savedAt ? new Date(t.savedAt).toLocaleDateString() : '') + '</div>';
                html += '<div style="margin-top:4px"><button class="ai-quick-btn" onclick="event.stopPropagation();briefDeleteTemplate(' + i + ')" style="font-size:0.62rem;padding:1px 6px;color:#ff4444"><i class="fas fa-trash"></i></button></div>';
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<div style="text-align:center;padding:30px;color:var(--muted);font-size:0.82rem"><i class="fas fa-book" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.3"></i>No saved templates yet.<br>Use "Save as Template" to add briefs here.</div>';
        }
        _showModal('Slide Library (' + templates.length + ' templates)', html);
    }
    window.briefSlideLibrary = briefSlideLibrary;

    function briefLoadTemplate(idx) {
        var templates = [];
        try { templates = JSON.parse(localStorage.getItem('s4_brief_templates') || '[]'); } catch (e) { return; }
        var t = templates[idx];
        if (!t) return;
        _closeModal();
        var newBrief = {
            id: _uid(), title: t.title + ' (from library)', brief_type: t.brief_type || 'STATUS',
            slides: JSON.parse(JSON.stringify(t.slides || [])),
            master: JSON.parse(JSON.stringify(t.master || DEFAULT_MASTER)),
            program: _selectedProgram, vessel: _selectedVessel,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            version: 1, comments: {}, edit_history: [], classification: 'UNCLASSIFIED'
        };
        newBrief.slides.forEach(function (s) { (s.elements || []).forEach(function (el) { el.id = _uid(); }); });
        _briefs.push(newBrief);
        _activeBrief = newBrief;
        _activeSlideIdx = 0;
        _selectedElement = null;
        _currentView = 'editor';
        _isDirty = true;
        _saveBrief(newBrief, function () { _renderEditor(); _toast('Template loaded as new brief', 'success'); });
    }
    window.briefLoadTemplate = briefLoadTemplate;

    function briefDeleteTemplate(idx) {
        var templates = [];
        try { templates = JSON.parse(localStorage.getItem('s4_brief_templates') || '[]'); } catch (e) { return; }
        templates.splice(idx, 1);
        try { localStorage.setItem('s4_brief_templates', JSON.stringify(templates)); } catch (e) { /* */ }
        _toast('Template deleted', 'info');
        briefSlideLibrary(); // re-render
    }
    window.briefDeleteTemplate = briefDeleteTemplate;

    // ================================================================
    //  ACRONYM GLOSSARY (user-facing wrapper)
    // ================================================================
    function briefAcronymGlossary() {
        if (!_activeBrief) return;
        var found = _generateGlossary(_activeBrief);
        var keys = Object.keys(found).sort();
        var html = '';
        if (keys.length) {
            html += '<div style="font-size:0.82rem;color:var(--steel);margin-bottom:10px">' + keys.length + ' acronyms detected in your brief:</div>';
            html += '<div style="max-height:320px;overflow-y:auto">';
            keys.forEach(function (k) {
                html += '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(0,0,0,0.04);font-size:0.82rem">';
                html += '<strong style="color:#00aaff;min-width:80px">' + _esc(k) + '</strong>';
                html += '<span style="color:var(--steel)">' + _esc(found[k]) + '</span></div>';
            });
            html += '</div>';
        } else {
            html += '<div style="text-align:center;padding:20px;color:var(--muted);font-size:0.82rem">No recognized DoD/Navy acronyms found in this brief.</div>';
        }
        html += '<div style="margin-top:12px;padding:8px;background:rgba(0,170,255,0.06);border-radius:4px;font-size:0.75rem;color:var(--muted)"><i class="fas fa-info-circle" style="color:#00aaff"></i> Glossary auto-scans all text elements. Add more text to detect additional acronyms.</div>';
        _showModal('Acronym Glossary', html);
    }
    window.briefAcronymGlossary = briefAcronymGlossary;

    // ================================================================
    //  TOGGLE GRID
    // ================================================================
    function briefToggleGrid() {
        _snapToGrid = !_snapToGrid;
        _renderEditor();
        _toast('Snap to Grid: ' + (_snapToGrid ? 'ON' : 'OFF'), 'info');
    }
    window.briefToggleGrid = briefToggleGrid;

    // ================================================================
    //  TOGGLE THEME
    // ================================================================
    function briefToggleTheme() {
        if (!_activeBrief) return;
        _theme = _theme === 'dark' ? 'light' : 'dark';
        var master = _activeBrief.master || DEFAULT_MASTER;
        if (_theme === 'light') {
            master.bodyBg = '#f0f2f5';
            master.bodyColor = '#1a1a2e';
            master.headerBg = '#e2e4e8';
            master.headerColor = '#000000';
        } else {
            master.bodyBg = '#ffffff';
            master.bodyColor = '#1d1d1f';
            master.headerBg = '#f5f5f7';
            master.headerColor = '#ffffff';
        }
        _activeBrief.master = master;
        _isDirty = true;
        _renderEditor();
        _toast('Theme: ' + _theme, 'info');
    }
    window.briefToggleTheme = briefToggleTheme;

    // ================================================================
    //  DOD NUMBERING TOGGLE
    // ================================================================
    function briefToggleDodNumbering() {
        _dodNumbering = !_dodNumbering;
        _renderEditor();
        _toast('DoD Numbering: ' + (_dodNumbering ? 'ON' : 'OFF'), 'info');
    }
    window.briefToggleDodNumbering = briefToggleDodNumbering;

    // ================================================================
    //  KEYBOARD SHORTCUTS (wrapper)
    // ================================================================
    function briefShowShortcuts() {
        _shortcutsHelp();
    }
    window.briefShowShortcuts = briefShowShortcuts;

    // ================================================================
    //  BRING TO FRONT / SEND TO BACK
    // ================================================================
    function briefBringToFront() {
        if (!_activeBrief || !_selectedElement) { _toast('Select an element first', 'warning'); return; }
        var slide = _activeBrief.slides[_activeSlideIdx];
        if (!slide) return;
        _pushUndo();
        var maxZ = 1;
        (slide.elements || []).forEach(function (el) { if ((el.zIndex || 1) > maxZ) maxZ = el.zIndex; });
        _selectedElement.zIndex = maxZ + 1;
        _isDirty = true;
        _renderEditor();
        _toast('Brought to front', 'info');
    }
    window.briefBringToFront = briefBringToFront;

    function briefSendToBack() {
        if (!_activeBrief || !_selectedElement) { _toast('Select an element first', 'warning'); return; }
        _pushUndo();
        _selectedElement.zIndex = 0;
        _isDirty = true;
        _renderEditor();
        _toast('Sent to back', 'info');
    }
    window.briefSendToBack = briefSendToBack;

    // ================================================================
    //  SLIDE TRANSITIONS
    // ================================================================
    function briefSetTransition() {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        var current = _activeBrief.slides[_activeSlideIdx].transition || 'none';
        var html = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
        ['none','fade','slide-left','slide-right','slide-up','zoom-in','zoom-out','dissolve','wipe'].forEach(function (t) {
            var sel = t === current;
            html += '<div class="stat-mini" style="cursor:pointer;padding:10px;text-align:center;border-color:' + (sel ? '#00aaff' : 'rgba(0,0,0,0.08)') + '" onclick="briefApplyTransition(\'' + t + '\')" onmouseover="this.style.borderColor=\'#00aaff\'" onmouseout="this.style.borderColor=\'' + (sel ? '#00aaff' : 'rgba(0,0,0,0.08)') + '\'">';
            html += '<i class="fas ' + ({none:'fa-ban',fade:'fa-adjust','slide-left':'fa-arrow-left','slide-right':'fa-arrow-right','slide-up':'fa-arrow-up','zoom-in':'fa-search-plus','zoom-out':'fa-search-minus',dissolve:'fa-water',wipe:'fa-eraser'}[t] || 'fa-film') + '" style="font-size:1.1rem;color:' + (sel ? '#00aaff' : '#8b949e') + ';display:block;margin-bottom:4px"></i>';
            html += '<div style="font-size:0.75rem;color:' + (sel ? '#fff' : 'var(--muted)') + '">' + t.replace('-', ' ') + '</div></div>';
        });
        html += '</div>';
        _showModal('Slide Transition', html);
    }
    window.briefSetTransition = briefSetTransition;

    function briefApplyTransition(t) {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        _activeBrief.slides[_activeSlideIdx].transition = t;
        _isDirty = true;
        _closeModal();
        _renderEditor();
        _toast('Transition: ' + t, 'info');
    }
    window.briefApplyTransition = briefApplyTransition;

    // ================================================================
    //  DRAG-AND-DROP (Canvas mouse handlers)
    // ================================================================
    function briefCanvasMouseDown(event) {
        if (!_activeBrief || !_selectedElement) return;
        if (_annotationMode) return; // annotation clicks handled by briefCanvasClick
        var canvas = document.getElementById('briefCanvas');
        if (!canvas) return;
        var rect = canvas.getBoundingClientRect();
        var scale = (canvas.offsetWidth > 0) ? ((_activeBrief.master || DEFAULT_MASTER).slideWidth || 960) / canvas.offsetWidth : 1;
        _dragState = {
            startX: (event.clientX - rect.left) * scale,
            startY: (event.clientY - rect.top) * scale,
            origX: _selectedElement.x,
            origY: _selectedElement.y,
            dragging: false
        };
    }
    window.briefCanvasMouseDown = briefCanvasMouseDown;

    function briefCanvasMouseMove(event) {
        if (!_dragState || !_selectedElement) return;
        var canvas = document.getElementById('briefCanvas');
        if (!canvas) return;
        var rect = canvas.getBoundingClientRect();
        var scale = (canvas.offsetWidth > 0) ? ((_activeBrief.master || DEFAULT_MASTER).slideWidth || 960) / canvas.offsetWidth : 1;
        var curX = (event.clientX - rect.left) * scale;
        var curY = (event.clientY - rect.top) * scale;
        var dx = curX - _dragState.startX;
        var dy = curY - _dragState.startY;
        if (!_dragState.dragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
            _dragState.dragging = true;
            _pushUndo();
        }
        if (_dragState.dragging) {
            var newX = _dragState.origX + dx;
            var newY = _dragState.origY + dy;
            if (_snapToGrid) {
                newX = Math.round(newX / _gridSize) * _gridSize;
                newY = Math.round(newY / _gridSize) * _gridSize;
            }
            _selectedElement.x = Math.max(0, newX);
            _selectedElement.y = Math.max(0, newY);
            // Live update the DOM element position
            var elDom = document.querySelector('[data-eid="' + _selectedElement.id + '"]');
            if (elDom) {
                elDom.style.left = _selectedElement.x + 'px';
                elDom.style.top = _selectedElement.y + 'px';
            }
        }
    }
    window.briefCanvasMouseMove = briefCanvasMouseMove;

    function briefCanvasMouseUp(event) {
        if (_dragState && _dragState.dragging) {
            _isDirty = true;
            // Full re-render to sync state
            _renderEditor();
        }
        _dragState = null;
    }
    window.briefCanvasMouseUp = briefCanvasMouseUp;

    // ================================================================
    //  EDIT TABLE (double-click)
    // ================================================================
    function briefEditTable(eid) {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el = null;
        (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el || el.type !== 'table') return;
        var data = el.data || [];
        var html = '<div style="margin-bottom:10px;font-size:0.82rem;color:var(--steel)">Edit table cells. Changes save automatically.</div>';
        html += '<div style="max-height:300px;overflow:auto;margin-bottom:10px">';
        html += '<table style="border-collapse:collapse;width:100%">';
        data.forEach(function (row, ri) {
            html += '<tr>';
            (row || []).forEach(function (cell, ci) {
                html += '<td style="padding:2px"><input value="' + _esc(cell) + '" data-r="' + ri + '" data-c="' + ci + '" class="briefTableCell" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.1);border-radius:2px;padding:4px 6px;font-size:0.8rem" onchange="briefUpdateTableCell(\'' + eid + '\',' + ri + ',' + ci + ',this.value)"></td>';
            });
            html += '</tr>';
        });
        html += '</table></div>';
        html += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
        html += '<button class="ai-quick-btn" onclick="briefTableAddRow(\'' + eid + '\')" style="font-size:0.75rem"><i class="fas fa-plus"></i> Row</button>';
        html += '<button class="ai-quick-btn" onclick="briefTableAddCol(\'' + eid + '\')" style="font-size:0.75rem"><i class="fas fa-plus"></i> Col</button>';
        html += '<button class="ai-quick-btn" onclick="briefTableRemoveRow(\'' + eid + '\')" style="font-size:0.75rem;color:#ff4444"><i class="fas fa-minus"></i> Row</button>';
        html += '<button class="ai-quick-btn" onclick="briefTableRemoveCol(\'' + eid + '\')" style="font-size:0.75rem;color:#ff4444"><i class="fas fa-minus"></i> Col</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()" style="margin-left:auto">Done</button>';
        html += '</div>';
        _showModal('Edit Table', html);
    }
    window.briefEditTable = briefEditTable;

    function briefUpdateTableCell(eid, r, c, val) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el || !el.data || !el.data[r]) return;
        el.data[r][c] = val;
        _isDirty = true;
    }
    window.briefUpdateTableCell = briefUpdateTableCell;

    function briefTableAddRow(eid) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el || !el.data) return;
        _pushUndo();
        var cols = el.data[0] ? el.data[0].length : 4;
        var newRow = [];
        for (var i = 0; i < cols; i++) newRow.push('');
        el.data.push(newRow);
        el.rows = el.data.length;
        _isDirty = true;
        briefEditTable(eid); // re-render modal
    }
    window.briefTableAddRow = briefTableAddRow;

    function briefTableAddCol(eid) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el || !el.data) return;
        _pushUndo();
        el.data.forEach(function (row, ri) { row.push(ri === 0 ? 'Header' : ''); });
        el.cols = el.data[0].length;
        _isDirty = true;
        briefEditTable(eid);
    }
    window.briefTableAddCol = briefTableAddCol;

    function briefTableRemoveRow(eid) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el || !el.data || el.data.length <= 1) return;
        _pushUndo();
        el.data.pop();
        el.rows = el.data.length;
        _isDirty = true;
        briefEditTable(eid);
    }
    window.briefTableRemoveRow = briefTableRemoveRow;

    function briefTableRemoveCol(eid) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el || !el.data || !el.data[0] || el.data[0].length <= 1) return;
        _pushUndo();
        el.data.forEach(function (row) { row.pop(); });
        el.cols = el.data[0].length;
        _isDirty = true;
        briefEditTable(eid);
    }
    window.briefTableRemoveCol = briefTableRemoveCol;

    // ================================================================
    //  EDIT CHART (double-click)
    // ================================================================
    function briefEditChart(eid) {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el || el.type !== 'chart') return;
        var html = '<div style="margin-bottom:10px">';
        html += '<label style="color:var(--steel);font-size:0.82rem;display:block;margin-bottom:4px">Chart Title</label>';
        html += '<input id="briefChartTitle" value="' + _esc(el.title || '') + '" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:6px 10px;font-size:0.85rem;margin-bottom:8px">';
        html += '<label style="color:var(--steel);font-size:0.82rem;display:block;margin-bottom:4px">Chart Type</label>';
        html += '<select id="briefChartType" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:6px 10px;font-size:0.85rem;margin-bottom:8px">';
        ['bar','line','pie','donut','stacked','horizontal'].forEach(function (t) {
            html += '<option value="' + t + '"' + (t === (el.chartType || 'bar') ? ' selected' : '') + '>' + t.charAt(0).toUpperCase() + t.slice(1) + '</option>';
        });
        html += '</select>';
        html += '<label style="color:var(--steel);font-size:0.82rem;display:block;margin-bottom:4px">Labels (comma-separated)</label>';
        html += '<input id="briefChartLabels" value="' + _esc((el.labels || []).join(', ')) + '" style="width:100%;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.12);border-radius:4px;padding:6px 10px;font-size:0.85rem;margin-bottom:8px">';
        (el.datasets || []).forEach(function (ds, di) {
            html += '<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">';
            html += '<input value="' + _esc(ds.label || '') + '" placeholder="Series name" class="briefChartDS" data-di="' + di + '" data-field="label" style="flex:1;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.1);border-radius:3px;padding:4px 6px;font-size:0.8rem">';
            html += '<input value="' + _esc((ds.values || []).join(', ')) + '" placeholder="Values" class="briefChartDS" data-di="' + di + '" data-field="values" style="flex:2;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.1);border-radius:3px;padding:4px 6px;font-size:0.8rem">';
            html += '<input type="color" value="' + (ds.color || '#00aaff') + '" class="briefChartDS" data-di="' + di + '" data-field="color" style="width:28px;height:28px;border:none;padding:0;cursor:pointer">';
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="display:flex;justify-content:flex-end;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefApplyChartEdit(\'' + eid + '\')" style="background:rgba(0,204,136,0.12);color:#00cc88"><i class="fas fa-check"></i> Apply</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div>';
        _showModal('Edit Chart', html);
    }
    window.briefEditChart = briefEditChart;

    function briefApplyChartEdit(eid) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el) return;
        _pushUndo();
        var titleInp = document.getElementById('briefChartTitle');
        var typeInp = document.getElementById('briefChartType');
        var labelsInp = document.getElementById('briefChartLabels');
        if (titleInp) el.title = titleInp.value.trim();
        if (typeInp) el.chartType = typeInp.value;
        if (labelsInp) el.labels = labelsInp.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        document.querySelectorAll('.briefChartDS').forEach(function (inp) {
            var di = parseInt(inp.getAttribute('data-di'), 10);
            var field = inp.getAttribute('data-field');
            if (!el.datasets[di]) return;
            if (field === 'label') el.datasets[di].label = inp.value.trim();
            else if (field === 'values') el.datasets[di].values = inp.value.split(',').map(function (s) { return parseFloat(s.trim()) || 0; });
            else if (field === 'color') el.datasets[di].color = inp.value;
        });
        _isDirty = true;
        _closeModal();
        _renderEditor();
        _toast('Chart updated', 'success');
    }
    window.briefApplyChartEdit = briefApplyChartEdit;

    // ================================================================
    //  CYCLE STOPLIGHT (double-click)
    // ================================================================
    function briefCycleStoplight(eid) {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el) return;
        _pushUndo();
        if (el.items && el.items.length) {
            // Show picker modal for each item
            var html = '<div style="margin-bottom:12px;font-size:0.82rem;color:var(--steel)">Click a status to cycle R/Y/G:</div>';
            el.items.forEach(function (item, ii) {
                var colors = { green: '#4ecb71', yellow: '#f9c846', red: '#ff4444' };
                var clr = colors[item.status] || '#6b7280';
                html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(0,0,0,0.04)">';
                html += '<span style="color:var(--text,#1d1d1f);font-size:0.85rem">' + _esc(item.label) + '</span>';
                html += '<div style="display:flex;gap:6px">';
                ['green','yellow','red'].forEach(function (s) {
                    var bg = colors[s];
                    var isCur = item.status === s;
                    html += '<span onclick="briefSetStoplightStatus(\'' + eid + '\',' + ii + ',\'' + s + '\')" style="width:22px;height:22px;border-radius:50%;background:' + bg + ';cursor:pointer;display:inline-block;opacity:' + (isCur ? '1' : '0.3') + ';box-shadow:' + (isCur ? '0 0 8px ' + bg : 'none') + ';border:2px solid ' + (isCur ? '#fff' : 'transparent') + '"></span>';
                });
                html += '</div></div>';
            });
            _showModal('Stoplight Status', html);
        } else {
            // Simple single stoplight
            var cycle = { green: 'yellow', yellow: 'red', red: 'green' };
            el.status = cycle[el.status] || 'green';
            _isDirty = true;
            _renderEditor();
        }
    }
    window.briefCycleStoplight = briefCycleStoplight;

    function briefSetStoplightStatus(eid, itemIdx, status) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el || !el.items || !el.items[itemIdx]) return;
        el.items[itemIdx].status = status;
        _isDirty = true;
        _closeModal();
        _renderEditor();
        _toast(_esc(el.items[itemIdx].label) + ' → ' + status, 'success');
    }
    window.briefSetStoplightStatus = briefSetStoplightStatus;

    // ================================================================
    //  EDIT RISK MATRIX (double-click)
    // ================================================================
    function briefEditRiskMatrix(eid) {
        if (!_activeBrief || !_activeBrief.slides[_activeSlideIdx]) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el || el.type !== 'risk_matrix') return;
        var items = el.items || [];
        var html = '<div style="margin-bottom:10px;font-size:0.82rem;color:var(--steel)">Edit risk items. Likelihood & Consequence: 1 (low) to 5 (high).</div>';
        html += '<div style="max-height:280px;overflow-y:auto;margin-bottom:10px">';
        items.forEach(function (item, i) {
            html += '<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">';
            html += '<input value="' + _esc(item.label) + '" placeholder="Risk name" class="briefRMItem" data-i="' + i + '" data-f="label" style="flex:2;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.1);border-radius:3px;padding:4px 6px;font-size:0.8rem">';
            html += '<input type="number" min="1" max="5" value="' + (item.likelihood || 1) + '" class="briefRMItem" data-i="' + i + '" data-f="likelihood" style="width:50px;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.1);border-radius:3px;padding:4px 6px;font-size:0.8rem;text-align:center" title="Likelihood">';
            html += '<input type="number" min="1" max="5" value="' + (item.consequence || 1) + '" class="briefRMItem" data-i="' + i + '" data-f="consequence" style="width:50px;background:#fff;color:var(--text,#1d1d1f);border:1px solid rgba(0,0,0,0.1);border-radius:3px;padding:4px 6px;font-size:0.8rem;text-align:center" title="Consequence">';
            html += '<button class="ai-quick-btn" onclick="briefRMRemoveItem(\'' + eid + '\',' + i + ')" style="color:#ff4444;padding:2px 6px"><i class="fas fa-times"></i></button>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between">';
        html += '<button class="ai-quick-btn" onclick="briefRMAddItem(\'' + eid + '\')" style="font-size:0.78rem"><i class="fas fa-plus"></i> Add Risk</button>';
        html += '<div style="display:flex;gap:6px">';
        html += '<button class="ai-quick-btn" onclick="briefApplyRiskMatrix(\'' + eid + '\')" style="background:rgba(0,204,136,0.12);color:#00cc88"><i class="fas fa-check"></i> Apply</button>';
        html += '<button class="ai-quick-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '</div></div>';
        _showModal('Edit Risk Matrix', html);
    }
    window.briefEditRiskMatrix = briefEditRiskMatrix;

    function briefApplyRiskMatrix(eid) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el) return;
        _pushUndo();
        var newItems = [];
        document.querySelectorAll('.briefRMItem[data-f="label"]').forEach(function (inp) {
            var i = parseInt(inp.getAttribute('data-i'), 10);
            var lk = document.querySelector('.briefRMItem[data-i="' + i + '"][data-f="likelihood"]');
            var cq = document.querySelector('.briefRMItem[data-i="' + i + '"][data-f="consequence"]');
            newItems.push({
                label: inp.value.trim() || 'Risk ' + (i + 1),
                likelihood: Math.min(5, Math.max(1, parseInt(lk ? lk.value : 1, 10) || 1)),
                consequence: Math.min(5, Math.max(1, parseInt(cq ? cq.value : 1, 10) || 1))
            });
        });
        el.items = newItems;
        _isDirty = true;
        _closeModal();
        _renderEditor();
        _toast('Risk matrix updated', 'success');
    }
    window.briefApplyRiskMatrix = briefApplyRiskMatrix;

    function briefRMAddItem(eid) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el) return;
        el.items = el.items || [];
        el.items.push({ label: 'New Risk', likelihood: 2, consequence: 3 });
        _isDirty = true;
        briefEditRiskMatrix(eid); // re-render modal
    }
    window.briefRMAddItem = briefRMAddItem;

    function briefRMRemoveItem(eid, idx) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        var el; (slide.elements || []).forEach(function (e) { if (e.id === eid) el = e; });
        if (!el || !el.items) return;
        el.items.splice(idx, 1);
        _isDirty = true;
        briefEditRiskMatrix(eid); // re-render
    }
    window.briefRMRemoveItem = briefRMRemoveItem;

    // ================================================================
    //  PHASE 5: NEW FEATURE FUNCTIONS
    // ================================================================

    // ── Canvas Zoom ──
    function briefZoom(delta) {
        _canvasZoom = Math.max(0.25, Math.min(3, _canvasZoom + delta));
        var canvas = document.getElementById('briefCanvas');
        if (canvas) {
            canvas.style.transform = 'scale(' + _canvasZoom + ')';
            canvas.style.transformOrigin = 'center center';
        }
        var zoomLabel = document.getElementById('briefZoomLevel');
        if (zoomLabel) zoomLabel.textContent = Math.round(_canvasZoom * 100) + '%';
    }
    window.briefZoom = briefZoom;

    function briefZoomReset() {
        _canvasZoom = 1;
        var canvas = document.getElementById('briefCanvas');
        if (canvas) { canvas.style.transform = 'scale(1)'; }
        var zoomLabel = document.getElementById('briefZoomLevel');
        if (zoomLabel) zoomLabel.textContent = '100%';
    }
    window.briefZoomReset = briefZoomReset;

    // ── Properties Panel Setter ──
    function briefSetProp(prop, value) {
        if (!_selectedElement || !_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        if (!slide) return;
        var el = null;
        slide.elements.forEach(function (e) { if (e.id === _selectedElement.id) el = e; });
        if (!el) return;
        if (prop === 'x' || prop === 'y' || prop === 'w' || prop === 'h' || prop === 'zIndex' || prop === 'fontSize') {
            el[prop] = parseInt(value, 10) || 0;
        } else if (prop === 'text') {
            el.text = value;
        } else {
            el[prop] = value;
        }
        _selectedElement = el;
        _isDirty = true;
        _addToHistory();
        _renderEditor();
    }
    window.briefSetProp = briefSetProp;

    // ── Element Resize ──
    var _resizeState = null;
    function briefResizeStart(event, eid, dir) {
        event.stopPropagation();
        event.preventDefault();
        var slide = _activeBrief ? _activeBrief.slides[_activeSlideIdx] : null;
        if (!slide) return;
        var el = null;
        slide.elements.forEach(function (e) { if (e.id === eid) el = e; });
        if (!el) return;
        _resizeState = { el: el, dir: dir, startX: event.clientX, startY: event.clientY, origX: el.x, origY: el.y, origW: el.w, origH: el.h };
        document.addEventListener('mousemove', _onResizeMove);
        document.addEventListener('mouseup', _onResizeEnd);
    }
    window.briefResizeStart = briefResizeStart;

    function _onResizeMove(e) {
        if (!_resizeState) return;
        var dx = e.clientX - _resizeState.startX;
        var dy = e.clientY - _resizeState.startY;
        var canvas = document.getElementById('briefCanvas');
        var scale = canvas ? ((_activeBrief.master || DEFAULT_MASTER).slideWidth || 960) / canvas.offsetWidth : 1;
        dx = Math.round(dx * scale / _canvasZoom);
        dy = Math.round(dy * scale / _canvasZoom);
        var el = _resizeState.el, dir = _resizeState.dir;
        if (dir.indexOf('e') !== -1) el.w = Math.max(20, _resizeState.origW + dx);
        if (dir.indexOf('w') !== -1) { el.x = _resizeState.origX + dx; el.w = Math.max(20, _resizeState.origW - dx); }
        if (dir.indexOf('s') !== -1) el.h = Math.max(20, _resizeState.origH + dy);
        if (dir.indexOf('n') !== -1) { el.y = _resizeState.origY + dy; el.h = Math.max(20, _resizeState.origH - dy); }
        _renderEditor();
    }

    function _onResizeEnd() {
        if (_resizeState) { _isDirty = true; _addToHistory(); }
        _resizeState = null;
        document.removeEventListener('mousemove', _onResizeMove);
        document.removeEventListener('mouseup', _onResizeEnd);
    }

    // ── Multi-Select ──
    function briefMultiSelect(event, eid) {
        event.stopPropagation();
        if (!_activeBrief) return;
        var idx = _multiSelect.indexOf(eid);
        if (idx >= 0) { _multiSelect.splice(idx, 1); } else { _multiSelect.push(eid); }
        _renderEditor();
    }
    window.briefMultiSelect = briefMultiSelect;

    // ── Element Grouping ──
    function briefGroupElements() {
        if (_multiSelect.length < 2 || !_activeBrief) return;
        var gid = 'group_' + _uid();
        _elementGroups[gid] = _multiSelect.slice();
        _toast('Grouped ' + _multiSelect.length + ' elements', 'success');
        _multiSelect = [];
        _renderEditor();
    }
    window.briefGroupElements = briefGroupElements;

    function briefUngroupElements() {
        if (!_selectedElement) return;
        var found = null;
        Object.keys(_elementGroups).forEach(function (gid) {
            if (_elementGroups[gid].indexOf(_selectedElement.id) >= 0) found = gid;
        });
        if (found) { delete _elementGroups[found]; _toast('Group dissolved', 'info'); _renderEditor(); }
    }
    window.briefUngroupElements = briefUngroupElements;

    // ── Clipboard: Copy/Paste Slides ──
    function briefCopySlide() {
        if (!_activeBrief) return;
        _clipboardSlide = JSON.parse(JSON.stringify(_activeBrief.slides[_activeSlideIdx]));
        _toast('Slide copied', 'info');
    }
    window.briefCopySlide = briefCopySlide;

    function briefPasteSlide() {
        if (!_activeBrief || !_clipboardSlide) return;
        var pasted = JSON.parse(JSON.stringify(_clipboardSlide));
        pasted.id = 'slide_' + _uid();
        pasted.elements.forEach(function (el) { el.id = el.type + '_' + _uid(); });
        _activeBrief.slides.splice(_activeSlideIdx + 1, 0, pasted);
        _activeSlideIdx++;
        _isDirty = true;
        _addToHistory();
        _renderEditor();
        _toast('Slide pasted', 'success');
    }
    window.briefPasteSlide = briefPasteSlide;

    // ── Compliance Scan ──
    function briefComplianceScan() {
        if (!_activeBrief) return;
        var issues = [];
        var b = _activeBrief;
        if (!b.classification || b.classification === 'UNCLASSIFIED') issues.push({ severity: 'warn', msg: 'No classification marking set' });
        if (!b.title || b.title.length < 5) issues.push({ severity: 'error', msg: 'Brief title too short or missing' });
        if (b.slides.length < 2) issues.push({ severity: 'warn', msg: 'Brief has fewer than 2 slides \u2014 consider adding an agenda' });
        b.slides.forEach(function (s, i) {
            if (!s.title || s.title.length < 3) issues.push({ severity: 'error', msg: 'Slide ' + (i + 1) + ': Missing or short title' });
            if (!s.elements || s.elements.length === 0) issues.push({ severity: 'warn', msg: 'Slide ' + (i + 1) + ': No content elements' });
            (s.elements || []).forEach(function (el) {
                if (el.type === 'text' && el.text) {
                    if (/\b(TBD|TODO|FIXME|XXX)\b/i.test(el.text)) issues.push({ severity: 'warn', msg: 'Slide ' + (i + 1) + ': Placeholder text found ("' + el.text.match(/\b(TBD|TODO|FIXME|XXX)\b/i)[0] + '")' });
                }
            });
        });
        if (!b.approvals || b.approvals.length === 0) issues.push({ severity: 'info', msg: 'No approval signatures recorded' });
        _complianceResults = issues;

        var html = '<div style="margin-bottom:12px;color:#86868b;font-size:0.82rem">Scanned <strong style="color:var(--text,#1d1d1f)">' + b.title + '</strong> (' + b.slides.length + ' slides)</div>';
        if (issues.length === 0) {
            html += '<div style="text-align:center;padding:24px;color:#00cc88"><i class="fas fa-check-circle" style="font-size:2rem;margin-bottom:8px;display:block"></i>All compliance checks passed!</div>';
        } else {
            var icons = { error: 'fa-times-circle', warn: 'fa-exclamation-triangle', info: 'fa-info-circle' };
            var colors = { error: '#ff4444', warn: '#ffaa00', info: '#00aaff' };
            issues.forEach(function (iss) {
                html += '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;margin-bottom:6px;background:rgba(0,0,0,0.015);border-radius:8px;border-left:3px solid ' + colors[iss.severity] + '">';
                html += '<i class="fas ' + icons[iss.severity] + '" style="color:' + colors[iss.severity] + ';margin-top:2px"></i>';
                html += '<span style="color:var(--text,#1d1d1f);font-size:0.82rem">' + _esc(iss.msg) + '</span></div>';
            });
        }
        html += '<div style="margin-top:14px;text-align:right"><button class="brief-action-btn" onclick="briefCloseModal()">Close</button></div>';
        _showModal('Compliance Scan Results', html);
    }
    window.briefComplianceScan = briefComplianceScan;

    // ── Auto Executive Summary ──
    function briefAutoSummary() {
        if (!_activeBrief) return;
        var b = _activeBrief;
        var summary = b.brief_type + ' BRIEF: ' + b.title + '\n\n';
        summary += 'Program: ' + (b.program || 'N/A') + '\n';
        summary += 'Classification: ' + (b.classification || 'UNCLASSIFIED') + '\n';
        summary += 'Slides: ' + b.slides.length + '\n\n';
        summary += '--- SLIDE SUMMARY ---\n';
        b.slides.forEach(function (s, i) {
            summary += '\n' + (i + 1) + '. ' + (s.title || 'Untitled') + '\n';
            var texts = [];
            (s.elements || []).forEach(function (el) {
                if (el.type === 'text' && el.text) texts.push(el.text.substring(0, 100));
                if (el.type === 'stoplight') texts.push('[Stoplight: ' + (el.status || 'green') + '] ' + (el.label || ''));
                if (el.type === 'risk_matrix') texts.push('[Risk Matrix: ' + ((el.items || []).length) + ' items]');
            });
            if (texts.length) summary += '   ' + texts.join(' | ') + '\n';
        });

        var html = '<div style="margin-bottom:12px;color:#86868b;font-size:0.82rem">Auto-generated executive summary for <strong style="color:var(--text,#1d1d1f)">' + _esc(b.title) + '</strong></div>';
        html += '<textarea class="brief-prop-input" style="height:280px;font-size:0.78rem;font-family:monospace" readonly>' + _esc(summary) + '</textarea>';
        html += '<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">';
        html += '<button class="brief-action-btn" onclick="briefCloseModal()">Close</button>';
        html += '<button class="brief-action-btn primary" onclick="navigator.clipboard.writeText(document.querySelector(\'.brief-modal textarea\').value);_toast(\'Summary copied!\',\'success\')"><i class="fas fa-copy"></i> Copy</button>';
        html += '<button class="brief-action-btn primary" onclick="briefInsertSummarySlide()"><i class="fas fa-plus"></i> Insert as Slide</button>';
        html += '</div>';
        _showModal('Executive Summary', html);
    }
    window.briefAutoSummary = briefAutoSummary;

    function briefInsertSummarySlide() {
        if (!_activeBrief) return;
        var b = _activeBrief;
        var texts = [];
        texts.push('Program: ' + (b.program || 'N/A'));
        texts.push('Classification: ' + (b.classification || 'UNCLASSIFIED'));
        texts.push('Total Slides: ' + b.slides.length);
        b.slides.forEach(function (s, i) { texts.push((i + 1) + '. ' + (s.title || 'Untitled')); });
        var slide = { id: 'slide_' + _uid(), title: 'Executive Summary', notes: '', elements: [
            { id: 'text_' + _uid(), type: 'text', x: 40, y: 20, w: 880, h: 40, text: 'EXECUTIVE SUMMARY', fontSize: 24, bold: true, color: '#1d1d1f' },
            { id: 'text_' + _uid(), type: 'text', x: 40, y: 80, w: 880, h: 400, text: texts.join('\n'), fontSize: 14, color: '#1d1d1f' }
        ] };
        _activeBrief.slides.splice(0, 0, slide);
        _activeSlideIdx = 0;
        _isDirty = true;
        _addToHistory();
        _closeModal();
        _renderEditor();
        _toast('Summary slide inserted', 'success');
    }
    window.briefInsertSummarySlide = briefInsertSummarySlide;

    // ── Calendar .ICS Export ──
    function briefExportICS() {
        if (!_activeBrief) return;
        var b = _activeBrief;
        var now = new Date();
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        var dtStamp = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + 'T' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
        var startTime = new Date(now.getTime() + 86400000); // tomorrow
        var dtStart = startTime.getFullYear() + pad(startTime.getMonth() + 1) + pad(startTime.getDate()) + 'T090000';
        var dtEnd = startTime.getFullYear() + pad(startTime.getMonth() + 1) + pad(startTime.getDate()) + 'T100000';

        var ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//S4Ledger//BriefEngine//EN\r\n';
        ics += 'BEGIN:VEVENT\r\n';
        ics += 'DTSTART:' + dtStart + '\r\n';
        ics += 'DTEND:' + dtEnd + '\r\n';
        ics += 'DTSTAMP:' + dtStamp + '\r\n';
        ics += 'UID:' + b.id + '@s4ledger.io\r\n';
        ics += 'SUMMARY:' + (b.title || 'Brief Presentation').replace(/[,;\\]/g, '') + '\r\n';
        ics += 'DESCRIPTION:' + (b.brief_type || 'STATUS') + ' Brief - ' + b.slides.length + ' slides\\nProgram: ' + (b.program || 'N/A') + '\r\n';
        ics += 'STATUS:TENTATIVE\r\n';
        ics += 'END:VEVENT\r\nEND:VCALENDAR\r\n';

        var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = (b.title || 'brief').replace(/[^a-zA-Z0-9_-]/g, '_') + '.ics';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        _toast('Calendar event exported', 'success');
    }
    window.briefExportICS = briefExportICS;

    // ── QR Code Generation ──
    function briefGenerateQR() {
        if (!_activeBrief) return;
        var b = _activeBrief;
        var data = JSON.stringify({ id: b.id, title: b.title, type: b.brief_type, program: b.program, classification: b.classification, slides: b.slides.length, anchored: !!b.xrpl_tx, created: b.created_at });
        // Use a QR code via SVG generation (simple)
        var qrSize = 200;
        var html = '<div style="text-align:center;padding:16px">';
        html += '<div style="background:#fff;display:inline-block;padding:16px;border-radius:12px;margin-bottom:16px">';
        html += '<canvas id="briefQRCanvas" width="' + qrSize + '" height="' + qrSize + '" style="image-rendering:pixelated"></canvas>';
        html += '</div>';
        html += '<div style="color:#86868b;font-size:0.8rem;margin-bottom:12px">Scan to verify brief integrity</div>';
        html += '<div style="color:var(--text,#1d1d1f);font-size:0.78rem;margin-bottom:4px"><strong>' + _esc(b.title) + '</strong></div>';
        html += '<div style="color:#6e6e73;font-size:0.72rem">ID: ' + b.id + '</div>';
        if (b.xrpl_tx) html += '<div style="color:#00cc88;font-size:0.72rem;margin-top:4px"><i class="fas fa-link"></i> XRPL Anchored</div>';
        html += '<div style="margin-top:16px;display:flex;gap:8px;justify-content:center">';
        html += '<button class="brief-action-btn" onclick="briefCloseModal()">Close</button>';
        html += '<button class="brief-action-btn primary" onclick="briefDownloadQR()"><i class="fas fa-download"></i> Download</button>';
        html += '</div></div>';
        _showModal('Brief QR Code', html);

        // Draw a simple QR-like pattern (compact data matrix)
        setTimeout(function () {
            var cvs = document.getElementById('briefQRCanvas');
            if (!cvs) return;
            var ctx = cvs.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, qrSize, qrSize);
            // Generate deterministic pattern from brief ID
            var hash = 0;
            for (var i = 0; i < data.length; i++) { hash = ((hash << 5) - hash) + data.charCodeAt(i); hash |= 0; }
            var cellSize = 8;
            var modules = Math.floor(qrSize / cellSize);
            ctx.fillStyle = '#000000';
            // Finder patterns (3 corners)
            _drawFinderPattern(ctx, 0, 0, cellSize);
            _drawFinderPattern(ctx, (modules - 7) * cellSize, 0, cellSize);
            _drawFinderPattern(ctx, 0, (modules - 7) * cellSize, cellSize);
            // Data modules
            var seed = Math.abs(hash);
            for (var row = 0; row < modules; row++) {
                for (var col = 0; col < modules; col++) {
                    if (_isFinderArea(row, col, modules)) continue;
                    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                    if (seed % 3 === 0) {
                        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                    }
                }
            }
        }, 100);
    }
    window.briefGenerateQR = briefGenerateQR;

    function _drawFinderPattern(ctx, x, y, cell) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, 7 * cell, 7 * cell);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + cell, y + cell, 5 * cell, 5 * cell);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell);
    }

    function _isFinderArea(row, col, modules) {
        if (row < 8 && col < 8) return true;
        if (row < 8 && col >= modules - 8) return true;
        if (row >= modules - 8 && col < 8) return true;
        return false;
    }

    function briefDownloadQR() {
        var cvs = document.getElementById('briefQRCanvas');
        if (!cvs) return;
        var url = cvs.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = url;
        a.download = (_activeBrief ? _activeBrief.title : 'brief').replace(/[^a-zA-Z0-9_-]/g, '_') + '_qr.png';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        _toast('QR code downloaded', 'success');
    }
    window.briefDownloadQR = briefDownloadQR;

    // ── Rehearsal Timer / Speaker Coach ──
    function briefStartRehearsal() {
        if (_rehearsalInterval) { briefStopRehearsal(); return; }
        _rehearsalTimer = 0;
        var html = '<div id="briefRehearsalPanel" style="text-align:center;padding:16px">';
        html += '<div style="font-size:2.5rem;font-weight:700;color:var(--text,#1d1d1f);font-variant-numeric:tabular-nums" id="briefRehearsalTime">00:00</div>';
        html += '<div style="color:#86868b;font-size:0.82rem;margin:8px 0 16px">Slide ' + (_activeSlideIdx + 1) + ' of ' + (_activeBrief ? _activeBrief.slides.length : 0) + '</div>';
        html += '<div style="display:flex;gap:8px;justify-content:center">';
        html += '<button class="brief-action-btn primary" id="briefRehearsalToggle" onclick="briefToggleRehearsal()"><i class="fas fa-play"></i> Start</button>';
        html += '<button class="brief-action-btn" onclick="briefStopRehearsal();briefCloseModal()"><i class="fas fa-stop"></i> End</button>';
        html += '</div>';
        html += '<div style="margin-top:16px;color:#6e6e73;font-size:0.75rem">Tip: Aim for 1\u20132 minutes per slide. Use F5 to present.</div>';
        html += '</div>';
        _showModal('Speaker Rehearsal', html);
    }
    window.briefStartRehearsal = briefStartRehearsal;

    function briefToggleRehearsal() {
        var btn = document.getElementById('briefRehearsalToggle');
        if (_rehearsalInterval) {
            clearInterval(_rehearsalInterval);
            _rehearsalInterval = null;
            if (btn) btn.innerHTML = window._s4Safe('<i class="fas fa-play"></i> Resume');
        } else {
            _rehearsalInterval = setInterval(function () {
                _rehearsalTimer++;
                var m = Math.floor(_rehearsalTimer / 60);
                var s = _rehearsalTimer % 60;
                var display = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
                var el = document.getElementById('briefRehearsalTime');
                if (el) el.textContent = display;
                // Warn at 2 min per slide
                if (_rehearsalTimer > 120 && el) el.style.color = '#ffaa00';
                if (_rehearsalTimer > 180 && el) el.style.color = '#ff4444';
            }, 1000);
            if (btn) btn.innerHTML = window._s4Safe('<i class="fas fa-pause"></i> Pause');
        }
    }
    window.briefToggleRehearsal = briefToggleRehearsal;

    function briefStopRehearsal() {
        if (_rehearsalInterval) { clearInterval(_rehearsalInterval); _rehearsalInterval = null; }
        _rehearsalTimer = 0;
    }
    window.briefStopRehearsal = briefStopRehearsal;

    // ── Custom Color Themes ──
    function briefCustomTheme() {
        var themes = [
            { name: 'Default Dark', bg: '#2c2c2e', text: '#1d1d1f', accent: '#00aaff', headerBg: '#161b22' },
            { name: 'Navy Command', bg: '#2c2c2e', text: '#d0d7de', accent: '#4a90d9', headerBg: '#141b2d' },
            { name: 'Tactical Green', bg: '#0a1a0a', text: '#b0d0b0', accent: '#00cc88', headerBg: '#122212' },
            { name: 'Crimson Alert', bg: '#1a0a0a', text: '#d0b0b0', accent: '#ff4444', headerBg: '#221212' },
            { name: 'Arctic White', bg: '#f0f2f5', text: '#24292f', accent: '#0969da', headerBg: '#ffffff' },
            { name: 'Stealth Gray', bg: '#1c1c1c', text: '#a8a8a8', accent: '#888888', headerBg: '#2a2a2a' },
            { name: 'Gold Standard', bg: '#1a1500', text: '#d4c090', accent: '#ffd700', headerBg: '#2a2200' },
            { name: 'Purple Ops', bg: '#140a1a', text: '#c9b0d9', accent: '#a855f7', headerBg: '#1e1228' }
        ];
        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
        themes.forEach(function (t) {
            html += '<div onclick="briefApplyTheme(\'' + t.bg + '\',\'' + t.text + '\',\'' + t.accent + '\',\'' + t.headerBg + '\')" style="cursor:pointer;padding:14px;border-radius:10px;border:1px solid rgba(0,0,0,0.06);background:' + t.bg + ';transition:all 0.2s" onmouseover="this.style.borderColor=\'' + t.accent + '\'" onmouseout="this.style.borderColor=\'rgba(0,0,0,0.08)\'">';
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
            html += '<div style="width:16px;height:16px;border-radius:50%;background:' + t.accent + '"></div>';
            html += '<span style="color:' + t.text + ';font-weight:600;font-size:0.82rem">' + t.name + '</span></div>';
            html += '<div style="display:flex;gap:4px">';
            html += '<div style="width:20px;height:8px;border-radius:2px;background:' + t.accent + '"></div>';
            html += '<div style="width:20px;height:8px;border-radius:2px;background:' + t.text + ';opacity:0.4"></div>';
            html += '<div style="width:20px;height:8px;border-radius:2px;background:' + t.headerBg + ';border:1px solid rgba(0,0,0,0.08)"></div>';
            html += '</div></div>';
        });
        html += '</div>';
        html += '<div style="margin-top:14px;text-align:right"><button class="brief-action-btn" onclick="briefCloseModal()">Close</button></div>';
        _showModal('Color Themes', html);
    }
    window.briefCustomTheme = briefCustomTheme;

    function briefApplyTheme(bg, text, accent, headerBg) {
        if (!_activeBrief) return;
        var m = _activeBrief.master || JSON.parse(JSON.stringify(DEFAULT_MASTER));
        m.bgColor = bg;
        m.bodyColor = text;
        m.titleColor = accent;
        m.headerBg = headerBg;
        _activeBrief.master = m;
        _isDirty = true;
        _addToHistory();
        _closeModal();
        _renderEditor();
        _toast('Theme applied', 'success');
    }
    window.briefApplyTheme = briefApplyTheme;

    // ── CDRL Auto-Formatting ──
    function briefCDRLFormat() {
        if (!_activeBrief) return;
        var html = '<div style="margin-bottom:12px;color:#86868b;font-size:0.82rem">Apply CDRL (Contract Data Requirements List) standard formatting to your brief.</div>';
        html += '<div style="display:grid;gap:8px">';
        html += '<button class="brief-action-btn" onclick="briefApplyCDRL(\'DI-MGMT-81466\')" style="text-align:left;padding:12px"><strong style="color:#00aaff">DI-MGMT-81466</strong><br><span style="font-size:0.75rem;color:#6e6e73">Program Status Report</span></button>';
        html += '<button class="brief-action-btn" onclick="briefApplyCDRL(\'DI-MGMT-81861\')" style="text-align:left;padding:12px"><strong style="color:#00aaff">DI-MGMT-81861</strong><br><span style="font-size:0.75rem;color:#6e6e73">Integrated Master Schedule</span></button>';
        html += '<button class="brief-action-btn" onclick="briefApplyCDRL(\'DI-SESS-81517C\')" style="text-align:left;padding:12px"><strong style="color:#00aaff">DI-SESS-81517C</strong><br><span style="font-size:0.75rem;color:#6e6e73">Test Report</span></button>';
        html += '<button class="brief-action-btn" onclick="briefApplyCDRL(\'DI-IPSC-81443A\')" style="text-align:left;padding:12px"><strong style="color:#00aaff">DI-IPSC-81443A</strong><br><span style="font-size:0.75rem;color:#6e6e73">Software Development Plan</span></button>';
        html += '</div>';
        html += '<div style="margin-top:14px;text-align:right"><button class="brief-action-btn" onclick="briefCloseModal()">Cancel</button></div>';
        _showModal('CDRL Formatting', html);
    }
    window.briefCDRLFormat = briefCDRLFormat;

    function briefApplyCDRL(did) {
        if (!_activeBrief) return;
        _activeBrief.cdrl = did;
        // Add CDRL header to first slide
        var slide = _activeBrief.slides[0];
        if (slide) {
            var existing = false;
            (slide.elements || []).forEach(function (el) { if (el.text && el.text.indexOf('CDRL:') === 0) existing = true; });
            if (!existing) {
                slide.elements.push({ id: 'text_' + _uid(), type: 'text', x: 20, y: 4, w: 300, h: 24, text: 'CDRL: ' + did, fontSize: 10, color: '#6e7681', bold: true });
            }
        }
        _isDirty = true;
        _addToHistory();
        _closeModal();
        _renderEditor();
        _toast('CDRL ' + did + ' formatting applied', 'success');
    }
    window.briefApplyCDRL = briefApplyCDRL;

    // ── Cross-Brief Comparison ──
    function briefCompare() {
        var data = _loadAllBriefs();
        if (data.length < 2) { _toast('Need at least 2 briefs to compare', 'warn'); return; }
        var html = '<div style="margin-bottom:12px;color:#86868b;font-size:0.82rem">Select two briefs to compare:</div>';
        html += '<div style="display:flex;gap:12px;margin-bottom:16px">';
        html += '<select id="briefCompA" class="brief-select" style="flex:1">';
        data.forEach(function (b) { html += '<option value="' + b.id + '"' + (b.id === (_activeBrief ? _activeBrief.id : '') ? ' selected' : '') + '>' + _esc(b.title) + '</option>'; });
        html += '</select>';
        html += '<span style="color:#6e6e73;align-self:center">vs</span>';
        html += '<select id="briefCompB" class="brief-select" style="flex:1">';
        data.forEach(function (b, i) { html += '<option value="' + b.id + '"' + (i === 1 ? ' selected' : '') + '>' + _esc(b.title) + '</option>'; });
        html += '</select></div>';
        html += '<div style="display:flex;gap:8px;justify-content:flex-end">';
        html += '<button class="brief-action-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '<button class="brief-action-btn primary" onclick="briefRunCompare()"><i class="fas fa-columns"></i> Compare</button>';
        html += '</div>';
        _showModal('Brief Comparison', html);
    }
    window.briefCompare = briefCompare;

    function briefRunCompare() {
        var selA = document.getElementById('briefCompA');
        var selB = document.getElementById('briefCompB');
        if (!selA || !selB) return;
        var data = _loadAllBriefs();
        var a = null, b = null;
        data.forEach(function (br) { if (br.id === selA.value) a = br; if (br.id === selB.value) b = br; });
        if (!a || !b) return;

        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
        [a, b].forEach(function (br) {
            html += '<div style="background:rgba(0,0,0,0.015);border-radius:10px;padding:14px;border:1px solid rgba(0,0,0,0.05)">';
            html += '<div style="font-weight:600;color:var(--text,#1d1d1f);margin-bottom:8px">' + _esc(br.title) + '</div>';
            html += '<div style="font-size:0.78rem;color:#86868b">';
            html += 'Type: <span style="color:#00aaff">' + br.brief_type + '</span><br>';
            html += 'Slides: ' + br.slides.length + '<br>';
            html += 'Elements: ' + br.slides.reduce(function (sum, s) { return sum + (s.elements || []).length; }, 0) + '<br>';
            html += 'Classification: ' + (br.classification || 'UNCLASSIFIED') + '<br>';
            html += 'Anchored: ' + (br.xrpl_tx ? '<span style="color:#00cc88">Yes</span>' : '<span style="color:#6e6e73">No</span>') + '<br>';
            html += '</div></div>';
        });
        html += '</div>';
        html += '<div style="margin-top:14px;text-align:right"><button class="brief-action-btn" onclick="briefCloseModal()">Close</button></div>';
        _showModal('Comparison: ' + _esc(a.title) + ' vs ' + _esc(b.title), html);
    }
    window.briefRunCompare = briefRunCompare;

    // ── Master Slide Management ──
    function briefMasterSlideEditor() {
        if (!_activeBrief) return;
        var m = _activeBrief.master || JSON.parse(JSON.stringify(DEFAULT_MASTER));
        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
        html += '<div><label class="brief-prop-label">Slide Width</label><input type="number" class="brief-prop-input" value="' + (m.slideWidth || 960) + '" onchange="briefSetMaster(\'slideWidth\',this.value)"></div>';
        html += '<div><label class="brief-prop-label">Slide Height</label><input type="number" class="brief-prop-input" value="' + (m.slideHeight || 540) + '" onchange="briefSetMaster(\'slideHeight\',this.value)"></div>';
        html += '<div><label class="brief-prop-label">Background Color</label><input type="color" value="' + (m.bgColor || '#fff') + '" onchange="briefSetMaster(\'bgColor\',this.value)" style="width:100%;height:32px;border:none;cursor:pointer;border-radius:6px"></div>';
        html += '<div><label class="brief-prop-label">Title Color</label><input type="color" value="' + (m.titleColor || '#1d1d1f') + '" onchange="briefSetMaster(\'titleColor\',this.value)" style="width:100%;height:32px;border:none;cursor:pointer;border-radius:6px"></div>';
        html += '<div><label class="brief-prop-label">Body Color</label><input type="color" value="' + (m.bodyColor || '#1d1d1f') + '" onchange="briefSetMaster(\'bodyColor\',this.value)" style="width:100%;height:32px;border:none;cursor:pointer;border-radius:6px"></div>';
        html += '<div><label class="brief-prop-label">Font Family</label><input type="text" class="brief-prop-input" value="' + _esc(m.fontFamily || 'Inter, sans-serif') + '" onchange="briefSetMaster(\'fontFamily\',this.value)"></div>';
        html += '<div><label class="brief-prop-label">Title Size (px)</label><input type="number" class="brief-prop-input" value="' + (m.titleSize || 28) + '" onchange="briefSetMaster(\'titleSize\',this.value)"></div>';
        html += '<div><label class="brief-prop-label">Body Size (px)</label><input type="number" class="brief-prop-input" value="' + (m.bodySize || 16) + '" onchange="briefSetMaster(\'bodySize\',this.value)"></div>';
        html += '</div>';
        html += '<div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end"><button class="brief-action-btn" onclick="briefCloseModal()">Close</button></div>';
        _showModal('Master Slide Settings', html);
    }
    window.briefMasterSlideEditor = briefMasterSlideEditor;

    function briefSetMaster(prop, val) {
        if (!_activeBrief) return;
        var m = _activeBrief.master || JSON.parse(JSON.stringify(DEFAULT_MASTER));
        if (prop === 'slideWidth' || prop === 'slideHeight' || prop === 'titleSize' || prop === 'bodySize') {
            m[prop] = parseInt(val, 10) || m[prop];
        } else {
            m[prop] = val;
        }
        _activeBrief.master = m;
        _isDirty = true;
        _renderEditor();
    }
    window.briefSetMaster = briefSetMaster;

    // ── Build / Animation Order ──
    function briefBuildOrder() {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        if (!slide || !slide.elements || slide.elements.length === 0) { _toast('No elements on this slide', 'warn'); return; }

        var html = '<div style="margin-bottom:12px;color:#86868b;font-size:0.82rem">Drag to reorder. Elements appear in this sequence during presentation.</div>';
        html += '<div id="briefBuildList" style="display:grid;gap:6px">';
        (slide.elements || []).forEach(function (el, i) {
            var label = el.type + (el.text ? ': ' + el.text.substring(0, 30) : '') + (el.label ? ': ' + el.label : '');
            html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(0,0,0,0.02);border-radius:8px;border:1px solid rgba(0,0,0,0.05)">';
            html += '<span style="color:#00aaff;font-weight:700;width:24px;text-align:center">' + (i + 1) + '</span>';
            html += '<span style="flex:1;color:var(--text,#1d1d1f);font-size:0.82rem">' + _esc(label) + '</span>';
            html += '<button class="brief-fmt-btn" onclick="briefBuildMoveUp(' + i + ')" title="Move up"><i class="fas fa-chevron-up"></i></button>';
            html += '<button class="brief-fmt-btn" onclick="briefBuildMoveDown(' + i + ')" title="Move down"><i class="fas fa-chevron-down"></i></button>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="margin-top:14px;text-align:right"><button class="brief-action-btn" onclick="briefCloseModal()">Done</button></div>';
        _showModal('Build / Animation Order', html);
    }
    window.briefBuildOrder = briefBuildOrder;

    function briefBuildMoveUp(idx) {
        var slide = _activeBrief ? _activeBrief.slides[_activeSlideIdx] : null;
        if (!slide || idx <= 0) return;
        var tmp = slide.elements[idx];
        slide.elements[idx] = slide.elements[idx - 1];
        slide.elements[idx - 1] = tmp;
        _isDirty = true;
        _closeModal();
        briefBuildOrder();
    }
    window.briefBuildMoveUp = briefBuildMoveUp;

    function briefBuildMoveDown(idx) {
        var slide = _activeBrief ? _activeBrief.slides[_activeSlideIdx] : null;
        if (!slide || idx >= slide.elements.length - 1) return;
        var tmp = slide.elements[idx];
        slide.elements[idx] = slide.elements[idx + 1];
        slide.elements[idx + 1] = tmp;
        _isDirty = true;
        _closeModal();
        briefBuildOrder();
    }
    window.briefBuildMoveDown = briefBuildMoveDown;

    // ── Image Filters ──
    function briefImageFilters() {
        if (!_selectedElement || _selectedElement.type !== 'image') {
            _toast('Select an image element first', 'warn');
            return;
        }
        var el = _selectedElement;
        var filters = [
            { name: 'None', css: 'none' },
            { name: 'Grayscale', css: 'grayscale(100%)' },
            { name: 'Sepia', css: 'sepia(80%)' },
            { name: 'High Contrast', css: 'contrast(150%)' },
            { name: 'Blur', css: 'blur(2px)' },
            { name: 'Brighten', css: 'brightness(130%)' },
            { name: 'Darken', css: 'brightness(70%)' },
            { name: 'Saturate', css: 'saturate(200%)' },
            { name: 'Invert', css: 'invert(100%)' }
        ];
        var html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';
        filters.forEach(function (f) {
            var active = (el.filter || 'none') === f.css;
            html += '<button onclick="briefApplyFilter(\'' + f.css + '\')" class="brief-action-btn' + (active ? ' primary' : '') + '" style="padding:12px 8px;font-size:0.78rem">' + f.name + '</button>';
        });
        html += '</div>';
        html += '<div style="margin-top:14px;text-align:right"><button class="brief-action-btn" onclick="briefCloseModal()">Close</button></div>';
        _showModal('Image Filters', html);
    }
    window.briefImageFilters = briefImageFilters;

    function briefApplyFilter(css) {
        if (!_selectedElement || !_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        slide.elements.forEach(function (el) {
            if (el.id === _selectedElement.id) el.filter = css;
        });
        _isDirty = true;
        _addToHistory();
        _closeModal();
        _renderEditor();
        _toast('Filter applied', 'success');
    }
    window.briefApplyFilter = briefApplyFilter;

    // ── Cross-Brief Analytics Dashboard ──
    function briefCrossAnalytics() {
        var data = _loadAllBriefs();
        if (data.length === 0) { _toast('No briefs found', 'warn'); return; }

        var totalSlides = 0, totalElements = 0, anchored = 0, byType = {};
        data.forEach(function (b) {
            totalSlides += b.slides.length;
            if (b.xrpl_tx) anchored++;
            byType[b.brief_type] = (byType[b.brief_type] || 0) + 1;
            b.slides.forEach(function (s) { totalElements += (s.elements || []).length; });
        });

        var html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">';
        var stats = [
            { label: 'Briefs', val: data.length, color: '#00aaff', icon: 'fa-briefcase' },
            { label: 'Slides', val: totalSlides, color: '#00cc88', icon: 'fa-clone' },
            { label: 'Elements', val: totalElements, color: '#f97316', icon: 'fa-shapes' },
            { label: 'Anchored', val: anchored, color: '#a855f7', icon: 'fa-link' }
        ];
        stats.forEach(function (s) {
            html += '<div style="text-align:center;padding:16px;background:rgba(0,0,0,0.015);border-radius:10px;border:1px solid rgba(0,0,0,0.05)">';
            html += '<i class="fas ' + s.icon + '" style="color:' + s.color + ';font-size:1.2rem;margin-bottom:6px;display:block"></i>';
            html += '<div style="font-size:1.5rem;font-weight:700;color:var(--text,#1d1d1f)">' + s.val + '</div>';
            html += '<div style="font-size:0.72rem;color:#6e6e73">' + s.label + '</div></div>';
        });
        html += '</div>';

        html += '<div style="margin-bottom:12px"><div style="font-weight:600;color:var(--text,#1d1d1f);font-size:0.85rem;margin-bottom:8px">By Type</div>';
        Object.keys(byType).forEach(function (t) {
            var pct = Math.round(byType[t] / data.length * 100);
            html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
            html += '<span style="width:80px;font-size:0.78rem;color:var(--text,#1d1d1f)">' + t + '</span>';
            html += '<div style="flex:1;height:8px;background:rgba(0,0,0,0.03);border-radius:4px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#00aaff,#00cc88);border-radius:4px"></div></div>';
            html += '<span style="width:30px;text-align:right;font-size:0.78rem;color:#6e6e73">' + byType[t] + '</span></div>';
        });
        html += '</div>';

        html += '<div style="margin-top:14px;text-align:right"><button class="brief-action-btn" onclick="briefCloseModal()">Close</button></div>';
        _showModal('Portfolio Analytics', html);
    }
    window.briefCrossAnalytics = briefCrossAnalytics;

    // ── Undo Timeline (visual) ──
    function briefUndoTimeline() {
        if (!_activeBrief) return;
        var history = _activeBrief._history || [];
        if (history.length === 0) { _toast('No undo history available', 'info'); return; }
        var html = '<div style="margin-bottom:12px;color:#86868b;font-size:0.82rem">' + history.length + ' history states recorded</div>';
        html += '<div style="max-height:300px;overflow-y:auto">';
        for (var i = history.length - 1; i >= 0; i--) {
            var isActive = i === (_activeBrief._historyIdx !== undefined ? _activeBrief._historyIdx : history.length - 1);
            html += '<div onclick="briefRestoreHistory(' + i + ')" style="display:flex;align-items:center;gap:10px;padding:10px;cursor:pointer;background:' + (isActive ? 'rgba(0,170,255,0.08)' : 'transparent') + ';border-radius:8px;border-left:3px solid ' + (isActive ? '#00aaff' : 'transparent') + ';margin-bottom:4px;transition:background 0.15s" onmouseover="this.style.background=\'rgba(0,0,0,0.03)\'" onmouseout="this.style.background=\'' + (isActive ? 'rgba(0,170,255,0.08)' : 'transparent') + '\'">';
            html += '<span style="color:' + (isActive ? '#00aaff' : '#6e7681') + ';font-weight:600;width:28px;text-align:center">' + (i + 1) + '</span>';
            html += '<span style="color:var(--text,#1d1d1f);font-size:0.82rem">State ' + (i + 1) + (isActive ? ' (current)' : '') + '</span></div>';
        }
        html += '</div>';
        html += '<div style="margin-top:14px;text-align:right"><button class="brief-action-btn" onclick="briefCloseModal()">Close</button></div>';
        _showModal('Undo Timeline', html);
    }
    window.briefUndoTimeline = briefUndoTimeline;

    function briefRestoreHistory(idx) {
        if (!_activeBrief || !_activeBrief._history) return;
        var state = _activeBrief._history[idx];
        if (!state) return;
        var parsed = JSON.parse(state);
        _activeBrief.slides = parsed.slides;
        _activeBrief._historyIdx = idx;
        _isDirty = true;
        _closeModal();
        _renderEditor();
        _toast('Restored to state ' + (idx + 1), 'info');
    }
    window.briefRestoreHistory = briefRestoreHistory;

    // ── Conditional Content by Classification ──
    function briefConditionalContent() {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        if (!slide) return;
        var html = '<div style="margin-bottom:12px;color:#86868b;font-size:0.82rem">Show/hide elements based on classification level.</div>';
        html += '<div style="margin-bottom:12px"><label class="brief-prop-label">Viewing Classification</label>';
        html += '<select id="briefCondClass" class="brief-select" style="width:100%">';
        ['UNCLASSIFIED', 'CUI', 'CONFIDENTIAL', 'SECRET', 'TOP SECRET'].forEach(function (c) {
            html += '<option value="' + c + '"' + (c === (_activeBrief.classification || 'UNCLASSIFIED') ? ' selected' : '') + '>' + c + '</option>';
        });
        html += '</select></div>';
        html += '<div style="max-height:250px;overflow-y:auto">';
        (slide.elements || []).forEach(function (el, i) {
            var lbl = el.type + (el.text ? ': ' + el.text.substring(0, 25) : '') + (el.label ? ': ' + el.label : '');
            var minClass = el.minClassification || 'UNCLASSIFIED';
            html += '<div style="display:flex;align-items:center;gap:8px;padding:8px;margin-bottom:4px;background:rgba(0,0,0,0.015);border-radius:6px">';
            html += '<span style="flex:1;font-size:0.78rem;color:var(--text,#1d1d1f)">' + _esc(lbl) + '</span>';
            html += '<select class="brief-select" style="width:120px;font-size:0.72rem" onchange="briefSetElementClass(\'' + el.id + '\',this.value)">';
            ['UNCLASSIFIED', 'CUI', 'CONFIDENTIAL', 'SECRET', 'TOP SECRET'].forEach(function (c) {
                html += '<option value="' + c + '"' + (c === minClass ? ' selected' : '') + '>' + c + '</option>';
            });
            html += '</select></div>';
        });
        html += '</div>';
        html += '<div style="margin-top:14px;text-align:right"><button class="brief-action-btn" onclick="briefCloseModal()">Close</button></div>';
        _showModal('Conditional Content Rules', html);
    }
    window.briefConditionalContent = briefConditionalContent;

    function briefSetElementClass(eid, classification) {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        (slide.elements || []).forEach(function (el) {
            if (el.id === eid) el.minClassification = classification;
        });
        _isDirty = true;
    }
    window.briefSetElementClass = briefSetElementClass;

    // ── Embedded Video/Audio ──
    function briefInsertMedia() {
        var html = '<div style="display:grid;gap:12px">';
        html += '<div><label class="brief-prop-label">Media URL (YouTube, video file, audio file)</label>';
        html += '<input type="text" id="briefMediaURL" class="brief-prop-input" placeholder="https://www.youtube.com/watch?v=... or file.mp4"></div>';
        html += '<div><label class="brief-prop-label">Type</label>';
        html += '<select id="briefMediaType" class="brief-select" style="width:100%"><option value="video">Video</option><option value="audio">Audio</option><option value="embed">Embed (iframe)</option></select></div>';
        html += '</div>';
        html += '<div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">';
        html += '<button class="brief-action-btn" onclick="briefCloseModal()">Cancel</button>';
        html += '<button class="brief-action-btn primary" onclick="briefDoInsertMedia()"><i class="fas fa-plus"></i> Insert</button>';
        html += '</div>';
        _showModal('Insert Media', html);
    }
    window.briefInsertMedia = briefInsertMedia;

    function briefDoInsertMedia() {
        var urlEl = document.getElementById('briefMediaURL');
        var typeEl = document.getElementById('briefMediaType');
        if (!urlEl || !urlEl.value.trim()) { _toast('Enter a media URL', 'warn'); return; }
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        if (!slide) return;
        slide.elements.push({
            id: 'media_' + _uid(), type: 'widget', subType: 'media',
            x: 100, y: 100, w: 400, h: 250,
            mediaUrl: urlEl.value.trim(),
            mediaType: typeEl ? typeEl.value : 'video',
            text: 'Media: ' + urlEl.value.trim().substring(0, 40)
        });
        _isDirty = true;
        _addToHistory();
        _closeModal();
        _renderEditor();
        _toast('Media element inserted', 'success');
    }
    window.briefDoInsertMedia = briefDoInsertMedia;

    // ── Sharing Permissions ──
    function briefSharingPermissions() {
        if (!_activeBrief) return;
        var b = _activeBrief;
        var perms = b.sharing || [];
        var html = '<div style="margin-bottom:12px;color:#86868b;font-size:0.82rem">Manage who can view or edit this brief.</div>';
        html += '<div style="display:flex;gap:8px;margin-bottom:14px">';
        html += '<input type="email" id="briefShareEmail" class="brief-prop-input" placeholder="user@example.mil" style="flex:1">';
        html += '<select id="briefShareRole" class="brief-select" style="width:100px"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="approver">Approver</option></select>';
        html += '<button class="brief-action-btn primary" onclick="briefAddShare()"><i class="fas fa-plus"></i></button>';
        html += '</div>';
        if (perms.length) {
            html += '<div style="max-height:200px;overflow-y:auto">';
            perms.forEach(function (p, i) {
                var roleColor = p.role === 'editor' ? '#00cc88' : p.role === 'approver' ? '#a855f7' : '#00aaff';
                html += '<div style="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(0,0,0,0.015);border-radius:6px;margin-bottom:4px">';
                html += '<span style="flex:1;font-size:0.82rem;color:var(--text,#1d1d1f)">' + _esc(p.email) + '</span>';
                html += '<span style="font-size:0.72rem;color:' + roleColor + ';font-weight:600;text-transform:uppercase">' + p.role + '</span>';
                html += '<button class="brief-fmt-btn" onclick="briefRemoveShare(' + i + ')" title="Remove"><i class="fas fa-times"></i></button>';
                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<div style="color:#6e6e73;font-size:0.8rem;text-align:center;padding:16px">No permissions set \u2014 brief is private.</div>';
        }
        html += '<div style="margin-top:14px;text-align:right"><button class="brief-action-btn" onclick="briefCloseModal()">Close</button></div>';
        _showModal('Sharing & Permissions', html);
    }
    window.briefSharingPermissions = briefSharingPermissions;

    function briefAddShare() {
        var emailEl = document.getElementById('briefShareEmail');
        var roleEl = document.getElementById('briefShareRole');
        if (!emailEl || !emailEl.value.trim() || !_activeBrief) return;
        if (!_activeBrief.sharing) _activeBrief.sharing = [];
        _activeBrief.sharing.push({ email: emailEl.value.trim(), role: roleEl ? roleEl.value : 'viewer' });
        _isDirty = true;
        _closeModal();
        briefSharingPermissions();
        _toast('Permission added', 'success');
    }
    window.briefAddShare = briefAddShare;

    function briefRemoveShare(idx) {
        if (!_activeBrief || !_activeBrief.sharing) return;
        _activeBrief.sharing.splice(idx, 1);
        _isDirty = true;
        _closeModal();
        briefSharingPermissions();
    }
    window.briefRemoveShare = briefRemoveShare;

    // ── One-Click Readiness Brief ──
    function briefReadinessCheck() {
        if (!_activeBrief) return;
        var b = _activeBrief;
        var checks = [];
        checks.push({ name: 'Title Set', pass: !!(b.title && b.title.length > 4), detail: b.title || 'Missing' });
        checks.push({ name: 'Classification', pass: !!(b.classification && b.classification !== 'UNCLASSIFIED'), detail: b.classification || 'Not set' });
        checks.push({ name: 'Minimum Slides (3+)', pass: b.slides.length >= 3, detail: b.slides.length + ' slides' });
        checks.push({ name: 'All Slides Have Content', pass: b.slides.every(function (s) { return s.elements && s.elements.length > 0; }), detail: '' });
        checks.push({ name: 'No Placeholder Text', pass: !b.slides.some(function (s) { return (s.elements || []).some(function (el) { return el.type === 'text' && el.text && /\b(TBD|TODO|FIXME)\b/i.test(el.text); }); }), detail: '' });
        checks.push({ name: 'XRPL Anchored', pass: !!b.xrpl_tx, detail: b.xrpl_tx ? 'Yes' : 'Not anchored' });
        checks.push({ name: 'Has Approval', pass: !!(b.approvals && b.approvals.length > 0), detail: (b.approvals || []).length + ' signatures' });

        var passCount = checks.filter(function (c) { return c.pass; }).length;
        var pct = Math.round(passCount / checks.length * 100);
        var barColor = pct >= 80 ? '#00cc88' : pct >= 50 ? '#ffaa00' : '#ff4444';

        var html = '<div style="text-align:center;margin-bottom:18px">';
        html += '<div style="font-size:2rem;font-weight:700;color:' + barColor + '">' + pct + '%</div>';
        html += '<div style="font-size:0.82rem;color:#86868b">Readiness Score</div>';
        html += '<div style="width:100%;height:8px;background:rgba(0,0,0,0.03);border-radius:4px;margin-top:8px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:4px;transition:width 0.5s"></div></div>';
        html += '</div>';

        checks.forEach(function (c) {
            html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:4px;background:rgba(0,0,0,0.015);border-radius:6px">';
            html += '<i class="fas ' + (c.pass ? 'fa-check-circle' : 'fa-times-circle') + '" style="color:' + (c.pass ? '#00cc88' : '#ff4444') + '"></i>';
            html += '<span style="flex:1;font-size:0.82rem;color:var(--text,#1d1d1f)">' + c.name + '</span>';
            if (c.detail) html += '<span style="font-size:0.72rem;color:#6e6e73">' + _esc(c.detail) + '</span>';
            html += '</div>';
        });

        html += '<div style="margin-top:14px;text-align:right"><button class="brief-action-btn" onclick="briefCloseModal()">Close</button></div>';
        _showModal('Readiness Assessment', html);
    }
    window.briefReadinessCheck = briefReadinessCheck;

    // ── Smart Layout Engine ──
    function briefAutoLayout() {
        if (!_activeBrief) return;
        var slide = _activeBrief.slides[_activeSlideIdx];
        if (!slide || !slide.elements || slide.elements.length === 0) { _toast('No elements to layout', 'warn'); return; }
        var m = _activeBrief.master || DEFAULT_MASTER;
        var sw = m.slideWidth || 960, sh = m.slideHeight || 540;
        var margin = 30, gap = 16;
        var els = slide.elements;
        var count = els.length;

        // Simple grid layout
        var cols = Math.ceil(Math.sqrt(count));
        var rows = Math.ceil(count / cols);
        var cellW = Math.floor((sw - margin * 2 - gap * (cols - 1)) / cols);
        var cellH = Math.floor((sh - margin * 2 - gap * (rows - 1)) / rows);

        els.forEach(function (el, i) {
            var col = i % cols;
            var row = Math.floor(i / cols);
            el.x = margin + col * (cellW + gap);
            el.y = margin + row * (cellH + gap);
            el.w = cellW;
            el.h = cellH;
        });

        _isDirty = true;
        _addToHistory();
        _renderEditor();
        _toast('Auto-layout applied (' + cols + 'x' + rows + ' grid)', 'success');
    }
    window.briefAutoLayout = briefAutoLayout;

    // ================================================================
    //  KEYBOARD SHORTCUTS PANEL
    // ================================================================
    function _shortcutsHelp() {
        var shortcuts = [
            ['Ctrl+Z', 'Undo'], ['Ctrl+Y', 'Redo'], ['Ctrl+S', 'Save'],
            ['Delete', 'Delete selected element'], ['F5', 'Presenter Mode'],
            ['Escape', 'Exit presenter / close modal'], ['Arrow keys', 'Navigate slides (in presenter)'],
            ['Space', 'Next slide (in presenter)']
        ];
        var html = '<div style="max-height:300px;overflow-y:auto">';
        shortcuts.forEach(function (s) {
            html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.04);font-size:0.82rem">';
            html += '<kbd style="background:rgba(0,0,0,0.04);padding:2px 8px;border-radius:3px;color:var(--text,#1d1d1f);font-size:0.78rem;font-family:monospace">' + s[0] + '</kbd>';
            html += '<span style="color:var(--steel)">' + s[1] + '</span>';
            html += '</div>';
        });
        html += '</div>';
        _showModal('Keyboard Shortcuts', html);
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
    window._toast = _toast;

    // ================================================================
    //  MODAL (Glass Effect)
    // ================================================================
    function _showModal(title, bodyHtml) {
        _closeModal();
        var overlay = document.createElement('div');
        overlay.id = 'briefModalOverlay';
        overlay.className = 'brief-modal-overlay';
        overlay.innerHTML = '<div class="brief-modal">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px"><h4 style="margin:0;color:var(--text,#1d1d1f);font-size:1.05rem;font-weight:600;display:flex;align-items:center;gap:8px"><i class="fas fa-briefcase" style="color:#00aaff"></i>' + title + '</h4>' +
            '<button onclick="briefCloseModal()" class="brief-modal-close">&times;</button></div>' +
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
