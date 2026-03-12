// S4 Ledger — navigation
// Extracted from monolith lines 15066-15652
// 585 lines

// ═══ Platform Hub Navigation ═══
var _currentSection = null;
var _currentILSTool = null;
window._currentSection = null;
window._currentILSTool = null;

function showHub() {
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(function(p) { p.classList.remove('show','active'); p.style.display = 'none'; });
    // Hide systems hub
    var sh = document.getElementById('sectionSystems');
    if (sh) sh.style.display = 'none';
    // ── Clean up any open ILS tool panels ──
    document.querySelectorAll('.ils-hub-panel').forEach(function(p) { p.classList.remove('active'); p.style.display = 'none'; });
    var ilsBackBar = document.getElementById('ilsToolBackBar');
    if (ilsBackBar) ilsBackBar.style.display = 'none';
    var ilsSubHub = document.getElementById('ilsSubHub');
    if (ilsSubHub) ilsSubHub.style.display = 'grid';
    var hubTabs = document.querySelector('.ils-hub-tabs');
    if (hubTabs) hubTabs.style.display = 'none';
    _currentILSTool = null;
    window._currentILSTool = null;
    // Show hub
    var hub = document.getElementById('platformHub');
    if (hub) { hub.style.display = 'block'; hub.style.animation = 'fadeIn 0.3s ease'; }
    // Show stat strip (moved into Ledger Account sidebar)
    // var sr = document.getElementById('statsRow');
    // if (sr) sr.style.display = 'flex';
    // Only show hero + pre-platform landing if user hasn't entered yet
    if (!sessionStorage.getItem('s4_entered')) {
        var hero = document.querySelector('.hero');
        if (hero) hero.style.display = 'block';
        var landing = document.getElementById('platformLanding');
        if (landing) landing.style.display = 'block';
    }
    // Show Getting Started for first-time users
    _showGettingStartedIfNew();
    _currentSection = null;
    window._currentSection = null;
    // Update URL
    history.replaceState(null, '', window.location.pathname);
}

function showSection(sectionId) {
    var hub = document.getElementById('platformHub');
    if (hub) hub.style.display = 'none';
    // Hide hero + landing when inside any tool section
    var hero = document.querySelector('.hero');
    if (hero) hero.style.display = 'none';
    var landing = document.getElementById('platformLanding');
    if (landing) landing.style.display = 'none';
    
    // Hide all tab panes and systems hub
    document.querySelectorAll('.tab-pane').forEach(function(p) { p.classList.remove('show','active'); p.style.display = 'none'; });
    var sh = document.getElementById('sectionSystems');
    if (sh) sh.style.display = 'none';
    
    // Map sectionId to tab-pane ID
    var tabMap = {
        'sectionAnchor': 'tabAnchor',
        'sectionVerify': 'tabAnchor',
        'sectionLog': 'tabLog',
        'sectionILS': 'tabILS',
        'sectionSystems': 'sectionSystems',
        'sectionMetrics': 'tabMetrics',
        'sectionOffline': 'tabOffline'
    };
    
    if (sectionId === 'sectionSystems') {
        // Show Systems hub — must add show/active for Bootstrap fade to work
        if (sh) { sh.style.display = 'block'; sh.classList.add('show','active'); sh.style.animation = 'fadeIn 0.3s ease'; }
    } else {
        var tabId = tabMap[sectionId] || sectionId;
        var pane = document.getElementById(tabId);
        if (pane) {
            pane.style.display = 'block';
            pane.classList.add('show','active');
            pane.style.animation = 'fadeIn 0.3s ease';
        }
        // Also activate the hidden Bootstrap tab for JS compatibility
        var tabLink = document.querySelector('a[href="#' + tabId + '"]');
        if (tabLink) {
            try { new bootstrap.Tab(tabLink).show(); } catch(e) {}
        }
    }
    
    _currentSection = sectionId;
    window._currentSection = sectionId;
    
    // Auto-refresh data when entering specific sections
    if (sectionId === 'sectionVerify' && typeof window.refreshVerifyRecents === 'function') {
        try { window.refreshVerifyRecents(); } catch(e) {}
    }
    if (sectionId === 'sectionMetrics' && typeof window.loadPerformanceMetrics === 'function') {
        try { window.loadPerformanceMetrics(); } catch(e) {}
    }
    
    // For ILS section, show the sub-hub
    if (sectionId === 'sectionILS') {
        var subHub = document.getElementById('ilsSubHub');
        if (subHub) subHub.style.display = 'grid';
        var toolBack = document.getElementById('ilsToolBackBar');
        if (toolBack) toolBack.style.display = 'none';
        // Hide all ILS panels (clear both class AND inline display)
        document.querySelectorAll('.ils-hub-panel').forEach(function(p) { p.classList.remove('active'); p.style.display = 'none'; });
        _currentILSTool = null;
        window._currentILSTool = null;
    }
}

function showSystemsSub(tabId) {
    var sh = document.getElementById('sectionSystems');
    if (sh) sh.style.display = 'none';
    var pane = document.getElementById(tabId);
    if (pane) {
        pane.style.display = 'block';
        pane.classList.add('show','active');
        pane.style.animation = 'fadeIn 0.3s ease';
    }
    // Auto-load metrics data when entering the metrics tab
    if (tabId === 'tabMetrics' && typeof window.loadPerformanceMetrics === 'function') {
        try { window.loadPerformanceMetrics(); } catch(e) {}
    }
}

// ═══ ILS Tool Navigation ═══
/**
 * Open an ILS hub tool panel by ID.
 * Hides the tool card grid, shows the back bar, activates the target panel,
 * and triggers chart rendering and AI context update.
 * @param {string} toolId - Panel ID (e.g. 'hub-sbom', 'hub-risk', 'hub-analysis').
 */
function openILSTool(toolId) {
    var subHub = document.getElementById('ilsSubHub');
    if (subHub) subHub.style.display = 'none';
    var toolBack = document.getElementById('ilsToolBackBar');
    if (toolBack) toolBack.style.display = 'block';
    
    // Hide landing page when opening a tool
    var landing = document.getElementById('platformLanding');
    if (landing) landing.style.display = 'none';
    var hero = document.querySelector('.hero');
    if (hero) hero.style.display = 'none';
    
    // Activate the tool panel (hide all, then show target)
    document.querySelectorAll('.ils-hub-panel').forEach(function(p) { p.classList.remove('active'); p.style.display = 'none'; });
    var panel = document.getElementById(toolId);
    if (panel) { panel.style.display = 'block'; panel.classList.add('active'); panel.style.animation = 'fadeIn 0.3s ease'; }
    
    // Also click the hidden tab button for compatibility
    var tabBtn = document.querySelector('.ils-hub-tab[onclick*="' + toolId + '"]');
    if (tabBtn) {
        document.querySelectorAll('.ils-hub-tab').forEach(function(b) { b.classList.remove('active'); });
        tabBtn.classList.add('active');
    }
    
    // Load data for panels that need it (synced with switchHubTab)
    if (toolId === 'hub-actions') { if (typeof renderHubActions === 'function') renderHubActions(); if (typeof renderActionCalendar === 'function') { setTimeout(renderActionCalendar, 200); setTimeout(renderActionCalendar, 600); } }
    if (toolId === 'hub-vault') { if (typeof renderVault === 'function') renderVault(); }
    if (toolId === 'hub-docs') { if (typeof renderDocLibrary === 'function') renderDocLibrary(); }
    if (toolId === 'hub-compliance') { if (typeof calcCompliance === 'function') calcCompliance(); }
    if (toolId === 'hub-risk') { if (typeof loadRiskData === 'function') loadRiskData(); }
    if (toolId === 'hub-roi') { if (typeof calcROI === 'function') calcROI(); }
    if (toolId === 'hub-reports') { if (typeof loadReportPreview === 'function') loadReportPreview(); }
    if (toolId === 'hub-predictive') { if (typeof loadPredictiveData === 'function') loadPredictiveData(); }
    if (toolId === 'hub-submissions') { if (typeof loadSubmissionHistory === 'function') loadSubmissionHistory(); }
    if (toolId === 'hub-sbom') { if (typeof loadSBOMData === 'function') loadSBOMData(); }
    if (toolId === 'hub-dmsms') { if (typeof loadDMSMSData === 'function') loadDMSMSData(); }
    if (toolId === 'hub-readiness') { if (typeof loadReadinessData === 'function') loadReadinessData(); }
    if (toolId === 'hub-lifecycle') { if (typeof calcLifecycle === 'function') calcLifecycle(); }
    if (toolId === 'hub-analysis') { if (typeof initILSChecklist === 'function') initILSChecklist(); }
    if (toolId === 'hub-acquisition') { if (typeof initAcquisitionPlanner === 'function') initAcquisitionPlanner(); }
    if (toolId === 'hub-milestones') { if (typeof initMilestoneTracker === 'function') initMilestoneTracker(); }
    if (toolId === 'hub-brief') { if (typeof initBriefEngine === 'function') initBriefEngine(); }
    
    // Update floating AI agent context
    if (typeof updateAiContext === 'function') updateAiContext(toolId);
    
    // Ensure HIW ? button exists on this panel (re-inject if destroyed by re-render)
    _ensureHIWButton(toolId);

    _currentILSTool = toolId;
    window._currentILSTool = toolId;
}

function closeILSTool() {
    // Hide ALL tool panels (remove active class AND force display)
    document.querySelectorAll('.ils-hub-panel').forEach(function(p) {
        p.classList.remove('active');
        p.style.display = 'none';
    });
    // Show tool grid
    var subHub = document.getElementById('ilsSubHub');
    if (subHub) { subHub.style.display = 'grid'; subHub.style.animation = 'fadeIn 0.3s ease'; }
    // Hide back bar
    var toolBack = document.getElementById('ilsToolBackBar');
    if (toolBack) toolBack.style.display = 'none';
    // Keep hub tabs row HIDDEN — card grid is the only navigation
    var hubTabs = document.querySelector('.ils-hub-tabs');
    if (hubTabs) hubTabs.style.display = 'none';
    _currentILSTool = null;
    window._currentILSTool = null;
    // Re-apply role visibility on tool cards
    if (_currentRole && typeof applyTabVisibility === 'function') {
        var vis = _customVisibleTabs || (_s4Roles[_currentRole] ? _s4Roles[_currentRole].tabs : _allHubTabs);
        applyTabVisibility(vis);
    }
}

// ═══ Drag-Reorder Tool Cards (iPhone-style) ═══
(function initToolCardDragReorder(){
    var STORAGE_KEY = 's4_tool_card_order';
    function getHub(){ return document.getElementById('ilsSubHub'); }
    
    // Restore saved order on load
    function restoreOrder(){
        var hub = getHub(); if(!hub) return;
        var saved = localStorage.getItem(STORAGE_KEY);
        if(!saved) return;
        try {
            var order = JSON.parse(saved);
            var cards = Array.from(hub.querySelectorAll('.ils-tool-card'));
            var map = {};
            cards.forEach(function(c){ 
                var m = c.getAttribute('onclick') || '';
                var id = (m.match(/openILSTool\('([^']+)'\)/) || [])[1];
                if(id) map[id] = c;
            });
            order.forEach(function(id){
                if(map[id]) hub.appendChild(map[id]);
            });
        } catch(e){}
    }

    // Save current order
    function saveOrder(){
        var hub = getHub(); if(!hub) return;
        var cards = hub.querySelectorAll('.ils-tool-card');
        var order = [];
        cards.forEach(function(c){
            var m = c.getAttribute('onclick') || '';
            var id = (m.match(/openILSTool\('([^']+)'\)/) || [])[1];
            if(id) order.push(id);
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    }

    // Setup drag handlers
    function setupDrag(){
        var hub = getHub(); if(!hub) return;
        var dragSrc = null;

        hub.querySelectorAll('.ils-tool-card').forEach(function(card){
            card.setAttribute('draggable', 'true');

            card.addEventListener('dragstart', function(e){
                dragSrc = this;
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
            });

            card.addEventListener('dragend', function(){
                this.classList.remove('dragging');
                hub.querySelectorAll('.ils-tool-card').forEach(function(c){ c.classList.remove('drag-over'); });
            });

            card.addEventListener('dragover', function(e){
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if(this !== dragSrc) this.classList.add('drag-over');
            });

            card.addEventListener('dragleave', function(){
                this.classList.remove('drag-over');
            });

            card.addEventListener('drop', function(e){
                e.preventDefault();
                this.classList.remove('drag-over');
                if(dragSrc && dragSrc !== this){
                    var allCards = Array.from(hub.querySelectorAll('.ils-tool-card'));
                    var fromIdx = allCards.indexOf(dragSrc);
                    var toIdx = allCards.indexOf(this);
                    if(fromIdx < toIdx){
                        hub.insertBefore(dragSrc, this.nextSibling);
                    } else {
                        hub.insertBefore(dragSrc, this);
                    }
                    saveOrder();
                    // Re-attach drag handlers after reorder
                    setupDrag();
                }
                dragSrc = null;
            });

            // Touch support for mobile (iPhone-style long-press)
            var touchTimer = null;
            var touchDragging = false;
            var touchClone = null;
            var touchSrc = null;

            card.addEventListener('touchstart', function(e){
                var self = this;
                touchTimer = setTimeout(function(){
                    touchDragging = true;
                    touchSrc = self;
                    self.classList.add('dragging');
                    // Create visual clone
                    touchClone = self.cloneNode(true);
                    touchClone.style.position = 'fixed';
                    touchClone.style.pointerEvents = 'none';
                    touchClone.style.opacity = '0.85';
                    touchClone.style.zIndex = '9999';
                    touchClone.style.width = self.offsetWidth + 'px';
                    touchClone.style.transform = 'scale(1.05)';
                    touchClone.style.boxShadow = '0 8px 32px rgba(0,170,255,0.3)';
                    document.body.appendChild(touchClone);
                }, 500);
            }, {passive:true});

            card.addEventListener('touchmove', function(e){
                if(!touchDragging || !touchClone) return;
                e.preventDefault();
                var touch = e.touches[0];
                touchClone.style.left = (touch.clientX - touchClone.offsetWidth/2) + 'px';
                touchClone.style.top = (touch.clientY - touchClone.offsetHeight/2) + 'px';
                // Highlight card under finger
                hub.querySelectorAll('.ils-tool-card').forEach(function(c){ c.classList.remove('drag-over'); });
                var elem = document.elementFromPoint(touch.clientX, touch.clientY);
                if(elem){
                    var target = elem.closest('.ils-tool-card');
                    if(target && target !== touchSrc) target.classList.add('drag-over');
                }
            }, {passive:false});

            card.addEventListener('touchend', function(e){
                clearTimeout(touchTimer);
                if(touchDragging && touchSrc){
                    var touch = e.changedTouches[0];
                    var elem = document.elementFromPoint(touch.clientX, touch.clientY);
                    var target = elem ? elem.closest('.ils-tool-card') : null;
                    if(target && target !== touchSrc){
                        var allCards = Array.from(hub.querySelectorAll('.ils-tool-card'));
                        var fromIdx = allCards.indexOf(touchSrc);
                        var toIdx = allCards.indexOf(target);
                        if(fromIdx < toIdx){
                            hub.insertBefore(touchSrc, target.nextSibling);
                        } else {
                            hub.insertBefore(touchSrc, target);
                        }
                        saveOrder();
                        setupDrag();
                    }
                    touchSrc.classList.remove('dragging');
                    hub.querySelectorAll('.ils-tool-card').forEach(function(c){ c.classList.remove('drag-over'); });
                }
                if(touchClone && touchClone.parentNode) touchClone.parentNode.removeChild(touchClone);
                touchDragging = false;
                touchClone = null;
                touchSrc = null;
            });

            card.addEventListener('touchcancel', function(){
                clearTimeout(touchTimer);
                if(touchClone && touchClone.parentNode) touchClone.parentNode.removeChild(touchClone);
                if(touchSrc) touchSrc.classList.remove('dragging');
                hub.querySelectorAll('.ils-tool-card').forEach(function(c){ c.classList.remove('drag-over'); });
                touchDragging = false;
                touchClone = null;
                touchSrc = null;
            });
        });
    }

    // Init after DOM ready
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', function(){ restoreOrder(); setupDrag(); });
    } else {
        restoreOrder(); setupDrag();
    }
})();

// ═══ Wallet Sidebar ═══
function _getCreditsData() {
    var _tFallback = (window._onboardTiers && window._onboardTier) ? (window._onboardTiers[window._onboardTier]?.sls || 25000) : (parseInt(localStorage.getItem('s4_tier_allocation')) || 25000);
    var _s = window._demoSession;
    var allocation = _s ? (_s.subscription?.sls_allocation || _tFallback) : _tFallback;
    var _stats = window._s4Stats || {anchored:0,verified:0,slsFees:0};
    var spent = _stats.slsFees || 0;
    var remaining = Math.round((allocation - spent) * 100) / 100;
    var anchored = _stats.anchored || 0;
    var plan = _s ? (_s.subscription?.label || 'Starter') : (localStorage.getItem('s4_tier_label') || 'Starter');
    var addr = _s?.wallet?.address || '';
    var pct = allocation > 0 ? Math.max(0, Math.min(100, (remaining / allocation) * 100)) : 100;
    return { allocation: allocation, spent: spent, remaining: remaining, anchored: anchored, plan: plan, addr: addr, pct: pct };
}

function _buildLedgerContent(body) {
    if (!body) return;

    var d = _getCreditsData();
    var stats = window._s4Stats || {anchored:0,verified:0,slsFees:0,types:new Set()};
    var verified = stats.verified || 0;
    var typesCount = stats.types ? (stats.types.size || 0) : 0;

    // Color logic: healthy (#007AFF), low/amber (#FF9500), critical (#FF3B30)
    var balColor = d.pct > 20 ? '#007AFF' : d.pct > 5 ? '#FF9500' : '#FF3B30';
    var barColor = balColor;
    var allPaid = d.anchored > 0;

    // Recent usage toast (only if anchors > 0)
    var usageToast = '';
    if (d.anchored > 0) {
        usageToast = '<div class="ws-usage-toast">'
            + '<i class="fas fa-bolt" style="color:#FF9500;margin-right:6px;font-size:0.7rem"></i>'
            + '<span>-' + d.spent.toFixed(2) + ' $SLS (' + d.anchored + ' record' + (d.anchored !== 1 ? 's' : '') + ' anchored)</span>'
            + '</div>';
    }

    // ── Build recent transactions list from s4Vault ──
    var txRows = '';
    var vault = (typeof s4Vault !== 'undefined') ? s4Vault : [];
    var recentTx = vault.slice(0, 5);
    if (recentTx.length > 0) {
        recentTx.forEach(function(r) {
            var shortHash = r.hash ? (r.hash.substring(0,10) + '...') : '—';
            var tLabel = r.label || r.type || 'Record';
            var tTime = r.timestamp ? new Date(r.timestamp).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : '';
            var tFee = (r.fee != null) ? r.fee.toFixed(2) : '0.01';
            txRows += '<div class="ws-tx-row">'
                + '<div class="ws-tx-icon"><i class="fas ' + (r.icon || 'fa-anchor') + '"></i></div>'
                + '<div class="ws-tx-detail">'
                +   '<div class="ws-tx-label">' + tLabel + '</div>'
                +   '<div class="ws-tx-hash">' + shortHash + '</div>'
                + '</div>'
                + '<div class="ws-tx-meta">'
                +   '<div class="ws-tx-fee">-' + tFee + '</div>'
                +   '<div class="ws-tx-time">' + tTime + '</div>'
                + '</div>'
                + '</div>';
        });
    } else {
        txRows = '<div class="ws-tx-empty"><i class="fas fa-inbox" style="font-size:1.1rem;margin-bottom:6px;display:block;opacity:0.35"></i>No transactions yet</div>';
    }

    // ── Build usage sparkline (last 7 days) ──
    var sparkBars = '';
    var dailyCounts = [0,0,0,0,0,0,0];
    var now = Date.now();
    vault.forEach(function(r) {
        if (!r.timestamp) return;
        var age = Math.floor((now - new Date(r.timestamp).getTime()) / 86400000);
        if (age >= 0 && age < 7) dailyCounts[6 - age]++;
    });
    var maxDay = Math.max.apply(null, dailyCounts) || 1;
    var dayLabels = [];
    for (var di = 6; di >= 0; di--) {
        var dd = new Date(now - di * 86400000);
        dayLabels.push(dd.toLocaleDateString(undefined,{weekday:'narrow'}));
    }
    dailyCounts.forEach(function(c, i) {
        var h = Math.max(4, Math.round((c / maxDay) * 48));
        sparkBars += '<div class="ws-spark-col">'
            + '<div class="ws-spark-bar" style="height:' + h + 'px;background:' + (c > 0 ? '#007AFF' : 'var(--border,rgba(0,0,0,0.08))') + '"></div>'
            + '<div class="ws-spark-day">' + dayLabels[i] + '</div>'
            + '</div>';
    });

    // ── Plan upgrade CTA ──
    var tierOrder = ['pilot','starter','professional','enterprise'];
    var tiers = window._onboardTiers || {};
    var currentTierKey = (localStorage.getItem('s4_selected_tier') || 'starter').toLowerCase();
    var currentIdx = tierOrder.indexOf(currentTierKey);
    var upgradeCTA = '';
    if (currentIdx >= 0 && currentIdx < tierOrder.length - 1) {
        var nextKey = tierOrder[currentIdx + 1];
        var nextTier = tiers[nextKey];
        if (nextTier) {
            var nextCredits = nextTier.credits || nextTier.sls || 0;
            upgradeCTA = '<div class="ws-upgrade-card">'
                + '<div class="ws-upgrade-header"><i class="fas fa-arrow-up" style="margin-right:6px"></i>Upgrade Available</div>'
                + '<div class="ws-upgrade-body">'
                +   '<strong>' + (nextTier.label || nextKey) + '</strong>'
                +   '<span class="ws-upgrade-credits">' + nextCredits.toLocaleString() + ' credits/mo</span>'
                + '</div>'
                + '<button class="ws-upgrade-btn" onclick="if(typeof showSection===\'function\'){showSection(\'sectionILS\');closeWalletSidebar();}">View Plans</button>'
                + '</div>';
        }
    }

    // ── Auto top-up threshold ──
    var savedThreshold = parseInt(localStorage.getItem('s4_topup_threshold')) || 0;
    var thresholdChecked = savedThreshold > 0 ? ' checked' : '';
    var thresholdVal = savedThreshold > 0 ? savedThreshold : Math.round(d.allocation * 0.1);

    body.innerHTML = ''
        // ── Hero: Credits Remaining ──
        + '<div class="ws-credits-hero">'
        +   '<div class="ws-credits-label">Credits Remaining</div>'
        +   '<div class="ws-credits-amount" style="color:' + balColor + ';">'
        +     '<span class="ws-credits-num">' + d.remaining.toLocaleString(undefined,{maximumFractionDigits:2}) + '</span>'
        +     ' <span class="ws-credits-unit">$SLS</span>'
        +   '</div>'
        +   '<div class="ws-credits-sub">'
        +     'Used Today: <strong>' + d.spent.toFixed(2) + '</strong>'
        +     '<span class="ws-credits-sep">|</span>'
        +     'Total Allocated: <strong>' + d.allocation.toLocaleString() + '</strong>'
        +   '</div>'
        // ── Progress bar ──
        +   '<div class="ws-progress-track">'
        +     '<div class="ws-progress-fill" style="width:' + d.pct.toFixed(1) + '%;background:' + barColor + ';"></div>'
        +   '</div>'
        + '</div>'

        // ── What are Credits? ──
        + '<div class="ws-explainer">'
        +   '<div class="ws-explainer-title"><i class="fas fa-question-circle" style="margin-right:5px;opacity:0.6"></i>What are Credits?</div>'
        +   '<div class="ws-explainer-body">Credits = <strong>$SLS</strong> (Secure Logistics Standard) — the utility token used to anchor records on the XRPL blockchain. Each anchor costs 0.01 $SLS. Credits are consumed when you create tamper-proof audit records.</div>'
        + '</div>'

        // ── Verified status ──
        + (allPaid
            ? '<div class="ws-verified-badge"><i class="fas fa-check-circle"></i> All Anchors Paid &amp; Verified</div>'
            : '<div class="ws-verified-badge ws-verified-empty"><i class="fas fa-info-circle"></i> No anchors yet — start anchoring to see activity</div>')

        // ── Usage toast ──
        + usageToast

        // ── Quick Stats ──
        + '<div class="ws-stats-grid ws-stats-5">'
        +   '<div class="ws-stat-card">'
        +     '<div class="ws-stat-icon" style="background:rgba(0,122,255,0.08);"><i class="fas fa-anchor" style="color:#007AFF;"></i></div>'
        +     '<div class="ws-stat-val">' + d.anchored + '</div>'
        +     '<div class="ws-stat-lbl">Anchors</div>'
        +   '</div>'
        +   '<div class="ws-stat-card">'
        +     '<div class="ws-stat-icon" style="background:rgba(52,199,89,0.08);"><i class="fas fa-check-double" style="color:#34C759;"></i></div>'
        +     '<div class="ws-stat-val">' + verified + '</div>'
        +     '<div class="ws-stat-lbl">Verified</div>'
        +   '</div>'
        +   '<div class="ws-stat-card">'
        +     '<div class="ws-stat-icon" style="background:rgba(88,86,214,0.08);"><i class="fas fa-layer-group" style="color:#5856D6;"></i></div>'
        +     '<div class="ws-stat-val">' + typesCount + '</div>'
        +     '<div class="ws-stat-lbl">Types</div>'
        +   '</div>'
        +   '<div class="ws-stat-card">'
        +     '<div class="ws-stat-icon" style="background:rgba(52,199,89,0.08);"><i class="fas fa-coins" style="color:#34C759;"></i></div>'
        +     '<div class="ws-stat-val">' + Math.floor(d.remaining / 0.01).toLocaleString() + '</div>'
        +     '<div class="ws-stat-lbl">Remaining</div>'
        +   '</div>'
        +   '<div class="ws-stat-card">'
        +     '<div class="ws-stat-icon" style="background:rgba(255,149,0,0.08);"><i class="fas fa-tag" style="color:#FF9500;"></i></div>'
        +     '<div class="ws-stat-val">' + d.plan + '</div>'
        +     '<div class="ws-stat-lbl">Plan</div>'
        +   '</div>'
        + '</div>'

        // ── Compliance & Security Assurance ──
        + '<div class="ws-compliance-card">'
        +   '<div class="ws-compliance-header"><i class="fas fa-shield-alt" style="margin-right:6px"></i>Your Data Is Protected</div>'
        +   '<div class="ws-compliance-body">'
        +     '<div class="ws-compliance-item"><i class="fas fa-lock" style="color:#34C759"></i><span>Every record is <strong>SHA-256 hashed</strong> and anchored to the XRP Ledger — tamper-proof and immutable</span></div>'
        +     '<div class="ws-compliance-item"><i class="fas fa-certificate" style="color:#007AFF"></i><span>Aligned with <strong>NIST 800-53</strong>, <strong>FedRAMP</strong>, and <strong>DFARS 252.204-7012</strong> compliance frameworks</span></div>'
        +     '<div class="ws-compliance-item"><i class="fas fa-eye" style="color:#5856D6"></i><span>Full <strong>audit trail</strong> — every action is logged, time-stamped, and independently verifiable</span></div>'
        +   '</div>'
        + '</div>'

        // ── 7-Day Usage Chart ──
        + '<div class="ws-section-label"><i class="fas fa-chart-bar" style="margin-right:5px;color:#007AFF;font-size:0.65rem"></i>7-Day Activity</div>'
        + '<div class="ws-spark-chart">' + sparkBars + '</div>'

        // ── Recent Transactions ──
        + '<div class="ws-section-label"><i class="fas fa-clock" style="margin-right:5px;color:#FF9500;font-size:0.65rem"></i>Recent Transactions</div>'
        + '<div class="ws-tx-list">' + txRows + '</div>'

        // ── Auto Top-Up Threshold ──
        + '<div class="ws-section-label"><i class="fas fa-bell" style="margin-right:5px;color:#FF9500;font-size:0.65rem"></i>Low-Balance Alert</div>'
        + '<div class="ws-threshold-card">'
        +   '<div class="ws-threshold-row">'
        +     '<label class="ws-threshold-toggle">'
        +       '<input type="checkbox" id="wsThresholdOn"' + thresholdChecked + '>'
        +       '<span class="ws-toggle-track"><span class="ws-toggle-thumb"></span></span>'
        +     '</label>'
        +     '<span class="ws-threshold-text">Alert when credits fall below</span>'
        +   '</div>'
        +   '<div class="ws-threshold-input-row">'
        +     '<input type="number" id="wsThresholdVal" class="ws-threshold-input" value="' + thresholdVal + '" min="1" max="' + d.allocation + '">'
        +     '<span class="ws-threshold-unit">$SLS</span>'
        +   '</div>'
        + '</div>'

        // ── Browser Push Notifications ──
        + '<div class="ws-section-label"><i class="fas fa-bell" style="margin-right:5px;color:#5856D6;font-size:0.65rem"></i>Notifications</div>'
        + '<div class="ws-notify-card">'
        +   '<div class="ws-notify-row">'
        +     '<label class="ws-threshold-toggle">'
        +       '<input type="checkbox" id="wsNotifyOn"' + (localStorage.getItem('s4_push_notify') === '1' ? ' checked' : '') + '>'
        +       '<span class="ws-toggle-track"><span class="ws-toggle-thumb"></span></span>'
        +     '</label>'
        +     '<span class="ws-notify-text">Browser Push Notifications</span>'
        +     '<span class="ws-notify-status" id="wsNotifyStatus"></span>'
        +   '</div>'
        +   '<div class="ws-notify-sub">Get notified when anchors complete, verifications finish, or credits run low.</div>'
        + '</div>'

        // ── iOS / Mobile App Coming Soon ──
        + '<div class="ws-ios-card">'
        +   '<div class="ws-ios-icon"><i class="fas fa-mobile-alt"></i></div>'
        +   '<div class="ws-ios-body">'
        +     '<div class="ws-ios-title">Mobile App</div>'
        +     '<div class="ws-ios-sub">Native iOS &amp; Android apps with real-time push notifications and offline anchoring.</div>'
        +   '</div>'
        +   '<span class="ws-ios-badge">Coming Soon</span>'
        + '</div>'

        // ── Plan Upgrade CTA ──
        + upgradeCTA

        // ── Wallet address ──
        + (d.addr ? '<div class="ws-wallet-addr">'
        +   '<div class="ws-addr-label"><i class="fas fa-link" style="margin-right:4px;color:#007AFF;font-size:0.65rem;"></i>XRPL Wallet</div>'
        +   '<div class="ws-addr-val">' + d.addr.substring(0,8) + '...' + d.addr.slice(-6) + '</div>'
        + '</div>' : '')

        // ── Export Statement + Top Up (side by side) ──
        + '<div class="ws-action-row">'
        +   '<button class="ws-export-btn" onclick="window._wsExportStatement()"><i class="fas fa-file-download" style="margin-right:6px;"></i>Statement</button>'
        +   '<button class="ws-topup-btn" onclick="if(typeof showSection===\'function\'){showSection(\'sectionILS\');closeWalletSidebar();}"><i class="fas fa-plus-circle" style="margin-right:6px;"></i>Top Up</button>'
        + '</div>'

        // ── Rate info ──
        + '<div class="ws-rate-footer">'
        +   '<span>0.01 $SLS per anchor</span><span class="ws-credits-sep">•</span><span>~$0.0001 per record</span>'
        + '</div>'

        // ── Legal disclaimer ──
        + '<div class="ws-legal">'
        +   '<i class="fas fa-shield-alt" style="margin-right:4px;opacity:0.5"></i>'
        +   '$SLS is a utility asset used exclusively for anchoring records on the S4 Ledger platform. '
        +   'It is <strong>not</strong> a security, equity, investment contract, or financial instrument. '
        +   'No promise of profit or return is made or implied.'
        + '</div>';

    // ── Wire threshold toggle ──
    var threshOn = body.querySelector('#wsThresholdOn');
    var threshVal = body.querySelector('#wsThresholdVal');
    if (threshOn && threshVal) {
        var saveThreshold = function() {
            if (threshOn.checked) {
                localStorage.setItem('s4_topup_threshold', threshVal.value);
            } else {
                localStorage.removeItem('s4_topup_threshold');
            }
        };
        threshOn.addEventListener('change', saveThreshold);
        threshVal.addEventListener('change', saveThreshold);
    }

    // ── Wire push notification toggle ──
    var notifyOn = body.querySelector('#wsNotifyOn');
    var notifyStatus = body.querySelector('#wsNotifyStatus');
    if (notifyOn && notifyStatus) {
        // Update status badge
        var _updateNotifyBadge = function() {
            if (!('Notification' in window)) {
                notifyStatus.textContent = 'Unsupported';
                notifyStatus.className = 'ws-notify-status ws-ns-unsupported';
                notifyOn.disabled = true;
            } else if (Notification.permission === 'granted' && notifyOn.checked) {
                notifyStatus.textContent = 'Active';
                notifyStatus.className = 'ws-notify-status ws-ns-on';
            } else if (Notification.permission === 'denied') {
                notifyStatus.textContent = 'Blocked';
                notifyStatus.className = 'ws-notify-status ws-ns-unsupported';
                notifyOn.disabled = true;
            } else {
                notifyStatus.textContent = 'Off';
                notifyStatus.className = 'ws-notify-status ws-ns-off';
            }
        };
        _updateNotifyBadge();
        notifyOn.addEventListener('change', function() {
            if (notifyOn.checked) {
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission().then(function(perm) {
                        if (perm === 'granted') {
                            localStorage.setItem('s4_push_notify', '1');
                        } else {
                            notifyOn.checked = false;
                            localStorage.removeItem('s4_push_notify');
                        }
                        _updateNotifyBadge();
                    });
                } else if ('Notification' in window && Notification.permission === 'granted') {
                    localStorage.setItem('s4_push_notify', '1');
                    _updateNotifyBadge();
                } else {
                    notifyOn.checked = false;
                }
            } else {
                localStorage.removeItem('s4_push_notify');
                _updateNotifyBadge();
            }
        });
    }

    // Trigger the count-up animation on the hero number
    requestAnimationFrame(function() {
        var numEl = body.querySelector('.ws-credits-num');
        if (numEl) {
            numEl.classList.add('ws-num-enter');
        }
    });

    body.dataset.loaded = 'true';
}

window._populateUnifiedLedger = function() {
    _buildLedgerContent(document.getElementById('s4UnifiedLedgerBody'));
};

function openWalletSidebar() {
    // Unified popover mode
    var unifiedBody = document.getElementById('s4UnifiedLedgerBody');
    if (unifiedBody) {
        _buildLedgerContent(unifiedBody);
        var pop = document.getElementById('s4AvatarPopover');
        if (pop && !pop.classList.contains('open') && typeof window._s4ToggleAvatar === 'function') {
            window._s4ToggleAvatar();
        }
        return;
    }
    // Legacy sidebar fallback
    var sidebar = document.getElementById('walletSidebar');
    var overlay = document.getElementById('walletOverlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('show');
    _buildLedgerContent(document.getElementById('walletSidebarBody'));
}

function closeWalletSidebar() {
    var sidebar = document.getElementById('walletSidebar');
    var overlay = document.getElementById('walletOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    var pop = document.getElementById('s4AvatarPopover');
    if (pop && pop.classList.contains('open')) {
        pop.classList.remove('open');
        var btn = document.getElementById('s4AvatarBtn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }
}

function updateWalletTrigger() {
    var d = _getCreditsData();
    var trigger = document.getElementById('walletTriggerBal');
    if (trigger) {
        trigger.textContent = d.remaining.toLocaleString(undefined,{maximumFractionDigits:2}) + ' Credits';
    }
}

// ═══ Initial State: Show Hub ═══
document.addEventListener('DOMContentLoaded', function() {
    // Start with hub visible
    setTimeout(function() {
        var hub = document.getElementById('platformHub');
        if (hub) hub.style.display = 'block';
        // Hide all tab panes initially
        document.querySelectorAll('.tab-pane').forEach(function(p) {
            p.classList.remove('show','active');
            p.style.display = 'none';
        });

    }, 100);
});

// Override Bootstrap tab activation to work with our navigation
document.addEventListener('shown.bs.tab', function(e) {
    updateWalletTrigger();
});


// ═══ Action Item Badge Updater ═══
(function() {
    function updateActionBadge() {
        var badge = document.getElementById('actionItemBadge');
        if (!badge) return;
        var openItems = 0;
        if (typeof s4ActionItems !== 'undefined' && Array.isArray(s4ActionItems)) {
            openItems = s4ActionItems.filter(function(a){ return !a.done; }).length;
        }
        if (openItems > 0) {
            badge.textContent = openItems;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Update on various events
    setInterval(updateActionBadge, 3000);
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(updateActionBadge, 2000);
    });
    
    // Hook showSection to update badge when entering ILS
    var _origShowSec2 = showSection;
    showSection = function(id) {
        _origShowSec2(id);
        setTimeout(updateActionBadge, 500);
    };
})();


// ═══ Tool Credit Balance Sync ═══
(function() {
    function syncToolSls() {
        var mainBal = document.getElementById('slsBarBalance');
        var mainAnch = document.getElementById('slsBarAnchors');
        var mainSpent = document.getElementById('slsBarSpent');
        var toolBal = document.getElementById('toolSlsBal');
        var toolAnch = document.getElementById('toolSlsAnch');
        var toolSpent = document.getElementById('toolSlsSpent');
        if (toolBal && mainBal) toolBal.textContent = mainBal.textContent.replace(' Credits','');
        if (toolAnch && mainAnch) toolAnch.textContent = mainAnch.textContent;
        if (toolSpent && mainSpent) toolSpent.textContent = mainSpent.textContent.replace(' Credits','');
    }
    setInterval(syncToolSls, 2000);
    // Also hook openILSTool
    var _origOpen3 = openILSTool;
    openILSTool = function(toolId) {
        _origOpen3(toolId);
        setTimeout(syncToolSls, 200);
    };
})();


// ═══ Post-Anchor Confirmation Display ═══
(function() {
    var _origHideAnchor = hideAnchorAnimation;
    hideAnchorAnimation = function() {
        _origHideAnchor();
        // Show confirmation in the active tool panel
        if (_currentILSTool) {
            var panel = document.getElementById(_currentILSTool);
            if (!panel) return;
            var existing = panel.querySelector('.anchor-confirm-banner');
            if (existing) existing.remove();
            
            // Get the last vault record for details
            var lastRec = s4Vault.length > 0 ? s4Vault[0] : null;
            if (!lastRec) return;
            
            var banner = document.createElement('div');
            banner.className = 'anchor-confirm-banner';
            banner.style.cssText = 'background:linear-gradient(135deg,rgba(0,204,102,0.08),rgba(0,170,255,0.06));border:1px solid rgba(0,204,102,0.2);border-radius:3px;padding:16px 20px;margin-bottom:16px;animation:panelSlideIn 0.4s ease;position:relative';
            banner.innerHTML = '<button onclick="this.parentElement.remove()" style="position:absolute;top:8px;right:12px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.85rem">&times;</button>'
                + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><i class="fas fa-check-circle" style="color:#00cc66;font-size:1.1rem"></i><strong style="color:var(--text,#1d1d1f);font-size:0.9rem">Record Anchored Successfully</strong></div>'
                + '<div style="font-size:0.78rem;color:var(--steel);display:grid;grid-template-columns:80px 1fr;gap:4px 12px">'
                + '<span style="color:var(--muted)">Type:</span><span>' + (lastRec.label || lastRec.type) + '</span>'
                + '<span style="color:var(--muted)">Hash:</span><span style="font-family:monospace;color:var(--accent);font-size:0.72rem;word-break:break-all">' + (lastRec.hash || '').substring(0,32) + '...</span>'
                + '<span style="color:var(--muted)">TX:</span><span>' + (lastRec.txHash ? '<a href="' + (lastRec.explorerUrl || '#') + '" target="_blank" style="color:var(--accent);text-decoration:none">' + lastRec.txHash.substring(0,16) + '... <i class="fas fa-external-link-alt" style="font-size:0.6rem"></i></a>' : 'Pending') + '</span>'
                + '<span style="color:var(--muted)">Fee:</span><span style="color:#c9a84c">0.01 Credits</span>'
                + '<span style="color:var(--muted)">Time:</span><span>' + new Date().toLocaleTimeString() + '</span>'
                + '</div>';
            
            var firstCard = panel.querySelector('.s4-card');
            if (firstCard) {
                firstCard.insertBefore(banner, firstCard.firstChild);
            }
            
            // Auto-remove after 15 seconds
            setTimeout(function(){ if (banner.parentElement) banner.remove(); }, 15000);
        }
    };
})();

// ═══ Wallet Export Statement ═══
window._wsExportStatement = function() {
    var d = _getCreditsData();
    var vault = (typeof s4Vault !== 'undefined') ? s4Vault : [];
    var lines = [
        'S4 LEDGER — CREDITS STATEMENT',
        'Generated: ' + new Date().toISOString(),
        'Plan: ' + d.plan,
        'Wallet: ' + (d.addr || 'N/A'),
        '',
        'SUMMARY',
        'Total Allocated: ' + d.allocation.toLocaleString() + ' $SLS',
        'Total Spent: ' + d.spent.toFixed(2) + ' $SLS',
        'Remaining: ' + d.remaining.toLocaleString(undefined,{maximumFractionDigits:2}) + ' $SLS',
        'Records Anchored: ' + d.anchored,
        '',
        'TRANSACTION DETAIL',
        'Type,Hash,TX Hash,Timestamp,Fee'
    ];
    vault.forEach(function(r) {
        lines.push(
            (r.label || r.type || 'Record') + ','
            + (r.hash || '') + ','
            + (r.txHash || '') + ','
            + (r.timestamp || '') + ','
            + ((r.fee != null) ? r.fee : 0.01)
        );
    });
    var blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 's4-credits-statement-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
};

// ═══ Session Stats Toast — fires after every anchor/verify ═══
(function() {
    var _toastTimer = null;
    var _prevAnchored = -1;

    function _showSessionToast() {
        var s = window._s4Stats || {anchored:0,verified:0,slsFees:0,types:new Set()};
        var d = _getCreditsData();

        // Only show if anchored count actually changed (skip initial load)
        if (_prevAnchored === -1) { _prevAnchored = s.anchored; return; }
        if (s.anchored === _prevAnchored) return;
        _prevAnchored = s.anchored;

        // Fire browser push notification if enabled
        if (localStorage.getItem('s4_push_notify') === '1' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('S4 Ledger — Record Anchored', {
                    body: 'Anchored: ' + s.anchored + ' | Verified: ' + (s.verified || 0) + ' | Credits: ' + d.remaining.toLocaleString(undefined,{maximumFractionDigits:0}) + ' $SLS',
                    icon: '/s4-assets/s4-icon-192.png',
                    tag: 's4-anchor-' + s.anchored
                });
            } catch(e) {}
        }

        // Remove existing toast
        var old = document.getElementById('wsSessionToast');
        if (old) old.remove();
        if (_toastTimer) clearTimeout(_toastTimer);

        var toast = document.createElement('div');
        toast.id = 'wsSessionToast';
        toast.className = 'ws-session-toast';
        toast.innerHTML = ''
            + '<div class="ws-st-row">'
            +   '<div class="ws-st-item"><i class="fas fa-anchor" style="color:#007AFF"></i><span class="ws-st-val">' + s.anchored + '</span><span class="ws-st-lbl">Anchored</span></div>'
            +   '<div class="ws-st-divider"></div>'
            +   '<div class="ws-st-item"><i class="fas fa-check-double" style="color:#34C759"></i><span class="ws-st-val">' + (s.verified || 0) + '</span><span class="ws-st-lbl">Verified</span></div>'
            +   '<div class="ws-st-divider"></div>'
            +   '<div class="ws-st-item"><i class="fas fa-layer-group" style="color:#5856D6"></i><span class="ws-st-val">' + (s.types ? s.types.size : 0) + '</span><span class="ws-st-lbl">Types</span></div>'
            +   '<div class="ws-st-divider"></div>'
            +   '<div class="ws-st-item"><i class="fas fa-coins" style="color:#FF9500"></i><span class="ws-st-val">' + d.remaining.toLocaleString(undefined,{maximumFractionDigits:0}) + '</span><span class="ws-st-lbl">Credits</span></div>'
            + '</div>';
        document.body.appendChild(toast);

        // Trigger enter animation
        requestAnimationFrame(function() { toast.classList.add('ws-st-enter'); });

        // Auto-dismiss after 4 seconds
        _toastTimer = setTimeout(function() {
            toast.classList.remove('ws-st-enter');
            toast.classList.add('ws-st-exit');
            setTimeout(function() { if (toast.parentElement) toast.remove(); }, 400);
        }, 4000);
    }

    // Hook updateStats
    if (typeof updateStats === 'function') {
        var _origUpdateStats = updateStats;
        updateStats = function() {
            _origUpdateStats();
            _showSessionToast();
        };
    }
})();

// === Window exports for inline event handlers ===
window.closeILSTool = closeILSTool;
window.closeWalletSidebar = closeWalletSidebar;
window.openILSTool = openILSTool;
window.openWalletSidebar = openWalletSidebar;
window.showHub = showHub;
window.showSection = showSection;
window.showSystemsSub = showSystemsSub;

// === HIW "?" popup — universal init for ALL panels ===
// Decoupled from openILSTool to avoid triple-fire / re-render destruction issues.
// Runs once at module init, with MutationObserver resilience.

var _hiwPanelIds = [
    'hub-analysis','hub-dmsms','hub-readiness','hub-compliance',
    'hub-risk','hub-actions','hub-predictive','hub-lifecycle',
    'hub-roi','hub-vault','hub-docs','hub-reports',
    'hub-submissions','hub-sbom','hub-gfp','hub-cdrl',
    'hub-contract','hub-provenance','hub-analytics','hub-team',
    'hub-acquisition','hub-milestones','hub-brief',
    'tabAnchor','tabAnchor'
];

function _showHIWModal(det) {
    var existing = document.querySelector('.hiw-modal-overlay');
    if (existing) existing.remove();
    var title = det.querySelector('summary')
        ? det.querySelector('summary').textContent.replace(/[▸▾▾]/g,'').trim()
        : 'How It Works';
    var body = '';
    det.querySelectorAll('p,ol,ul,li').forEach(function(el){ body += el.outerHTML; });
    if (!body) body = det.innerHTML.replace(/<summary[^>]*>.*?<\/summary>/i,'');
    var overlay = document.createElement('div');
    overlay.className = 'hiw-modal-overlay';
    overlay.innerHTML = '<div class="hiw-modal-box"><button class="hiw-close" title="Close">&times;</button>'
        + '<h4><i class="fas fa-info-circle" style="margin-right:6px"></i>' + title + '</h4>'
        + '<div class="hiw-body">' + body + '</div></div>';
    overlay.querySelector('.hiw-close').onclick = function(){ overlay.remove(); };
    overlay.onclick = function(e){ if(e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
}

function _ensureHIWButton(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var det = panel.querySelector('details');
    if (!det) return;
    det.style.display = 'none';
    // Find best heading
    var heading = panel.querySelector('h3')
        || panel.querySelector('h4')
        || panel.querySelector('.hub-tool-header h4')
        || panel.querySelector('h5');
    if (!heading) return;
    // Already has button? Skip.
    if (heading.querySelector('.hiw-help-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'hiw-help-btn';
    btn.title = 'How It Works';
    btn.textContent = '?';
    btn.style.cssText = 'margin-left:8px;background:rgba(0,170,255,0.12);border:1px solid rgba(0,170,255,0.3);color:#00aaff;border-radius:50%;width:24px;height:24px;font-size:0.75rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;flex-shrink:0;';
    btn.onclick = function(e){ e.stopPropagation(); _showHIWModal(det); };
    heading.appendChild(btn);
}

(function _initAllHIWButtons() {
    function initAll() {
        _hiwPanelIds.forEach(function(id) { _ensureHIWButton(id); });
        console.log('[S4-HIW] Initialized ? buttons for ' + _hiwPanelIds.length + ' panels');
    }

    // Run immediately (module is deferred, DOM should be ready)
    initAll();

    // Also run after brief delays to catch panels rendered late
    setTimeout(initAll, 500);
    setTimeout(initAll, 2000);

    // MutationObserver: re-inject if heading gets destroyed by re-render
    if (typeof MutationObserver !== 'undefined') {
        var observer = new MutationObserver(function(mutations) {
            var needsReinject = false;
            mutations.forEach(function(m) {
                if (m.type === 'childList' && m.removedNodes.length > 0) {
                    m.removedNodes.forEach(function(n) {
                        if (n.classList && n.classList.contains('hiw-help-btn')) needsReinject = true;
                        if (n.querySelector && n.querySelector('.hiw-help-btn')) needsReinject = true;
                    });
                }
            });
            if (needsReinject) {
                setTimeout(function() { _hiwPanelIds.forEach(_ensureHIWButton); }, 50);
            }
        });
        _hiwPanelIds.forEach(function(id) {
            var panel = document.getElementById(id);
            if (panel) observer.observe(panel, { childList: true, subtree: true });
        });
    }
})();

// === Programmatic click handlers for hub cards ===
// Fallback for environments where inline onclick is blocked (e.g. VS Code Simple Browser CSP)
(function _bindHubCardClicks() {
    function attach() {
        document.querySelectorAll('.hub-card[data-section]').forEach(function(card) {
            if (card._s4bound) return; // don't double-bind
            card._s4bound = true;
            card.addEventListener('click', function(e) {
                var sec = this.getAttribute('data-section');
                if (sec && typeof showSection === 'function') {
                    showSection(sec);
                }
            });
        });
    }
    // Bind now (DOM should be ready since module is deferred)
    attach();
    // Also bind after DOMContentLoaded in case DOM wasn't ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    }
})();

// ═══ ILS Tool Category Filter & Search ═══
var _activeFilter = 'all';

function filterILSTools(category, btn) {
    _activeFilter = category;
    var cards = document.querySelectorAll('#ilsSubHub .ils-tool-card');
    var search = (document.getElementById('ilsToolSearch') || {}).value || '';
    cards.forEach(function(card) {
        var roleHidden = card.style.display === 'none';
        var cat = card.getAttribute('data-category') || '';
        var matchCat = (category === 'all' || cat === category);
        var matchSearch = !search || _cardMatchesSearch(card, search);
        card.setAttribute('data-hidden', (roleHidden || !matchCat || !matchSearch) ? 'true' : 'false');
    });
    // Update active tab
    document.querySelectorAll('#ilsFilterTabs .filter-tab').forEach(function(t) { t.classList.remove('active'); });
    if (btn) btn.classList.add('active');
}

function searchILSTools(query) {
    var cards = document.querySelectorAll('#ilsSubHub .ils-tool-card');
    cards.forEach(function(card) {
        var roleHidden = card.style.display === 'none';
        var cat = card.getAttribute('data-category') || '';
        var matchCat = (_activeFilter === 'all' || cat === _activeFilter);
        var matchSearch = !query || _cardMatchesSearch(card, query);
        card.setAttribute('data-hidden', (roleHidden || !matchCat || !matchSearch) ? 'true' : 'false');
    });
}

function _cardMatchesSearch(card, query) {
    var text = (card.textContent || '').toLowerCase();
    return text.indexOf(query.toLowerCase()) !== -1;
}

// ═══ Demo Mode ═══
function enterDemoMode() {
    sessionStorage.setItem('s4_authenticated', '1');
    sessionStorage.setItem('s4_auth_method', 'demo');
    sessionStorage.setItem('s4_onboard_done', '1');
    sessionStorage.setItem('s4_demo_mode', '1');
    if (typeof window.enterPlatformAfterAuth === 'function') {
        window.enterPlatformAfterAuth();
    } else {
        // Fallback: directly show workspace
        var landing = document.getElementById('platformLanding');
        var hero = document.querySelector('.hero');
        var workspace = document.getElementById('platformWorkspace');
        if (landing) landing.style.display = 'none';
        if (hero) hero.style.display = 'none';
        if (workspace) workspace.style.display = 'block';
        sessionStorage.setItem('s4_entered', '1');
    }
    // Show demo banner
    var banner = document.getElementById('demoModeBanner');
    if (banner) banner.style.display = 'flex';
    // Show AI agent
    var aiWrap = document.getElementById('aiFloatWrapper');
    if (aiWrap) aiWrap.style.display = 'flex';
}

function exitDemoMode() {
    sessionStorage.removeItem('s4_demo_mode');
    sessionStorage.removeItem('s4_authenticated');
    sessionStorage.removeItem('s4_auth_method');
    sessionStorage.removeItem('s4_onboard_done');
    sessionStorage.removeItem('s4_entered');
    // Hide banner
    var banner = document.getElementById('demoModeBanner');
    if (banner) banner.style.display = 'none';
    // Trigger real auth flow
    if (typeof window.startAuthFlow === 'function') {
        window.startAuthFlow();
    }
}

// Restore demo banner on page load if demo mode active
(function _restoreDemoMode() {
    function check() {
        if (sessionStorage.getItem('s4_demo_mode') === '1') {
            var banner = document.getElementById('demoModeBanner');
            if (banner) banner.style.display = 'flex';
        }
        // Auto-enter demo mode + walkthrough via URL params (?demo=1&tour=1)
        var params = new URLSearchParams(window.location.search);
        if (params.get('demo') === '1') {
            // Clean URL without triggering reload
            if (window.history.replaceState) {
                var clean = window.location.pathname;
                window.history.replaceState({}, '', clean);
            }
            enterDemoMode();
            if (params.get('tour') === '1') {
                setTimeout(function() {
                    if (typeof window.startWalkthrough === 'function') window.startWalkthrough();
                }, 800);
            }
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', check);
    } else {
        check();
    }
})();
var _tourSteps = [
    { target: '#platformHub', title: 'Platform Hub', desc: 'Your command center. Select a module to begin — Anchor-S4 has 23+ defense tools.', position: 'bottom' },
    { target: '#ilsSubHub', title: 'Tool Grid', desc: 'Filter by category or search to find the right tool. Drag cards to reorder.', position: 'top' },
    { target: '.hub-card[data-section="sectionILS"]', title: 'Anchor-S4 Suite', desc: 'Gap analysis, compliance, risk, predictive maintenance, and 15+ more ILS tools.', position: 'right' },
    { target: '#walletTriggerBtn', title: 'Ledger Account', desc: 'Your XRPL wallet, Credit balance, and transaction history — all on-chain.', position: 'left' }
];
var _tourIdx = -1;

function startQuickTour() {
    _tourIdx = 0;
    _showTourStep();
}

function _showTourStep() {
    if (_tourIdx < 0 || _tourIdx >= _tourSteps.length) {
        _endTour();
        return;
    }
    var step = _tourSteps[_tourIdx];
    var el = document.querySelector(step.target);
    var overlay = document.getElementById('s4TourOverlay');
    var highlight = document.getElementById('s4TourHighlight');
    var tooltip = document.getElementById('s4TourTooltip');
    if (!overlay || !highlight || !tooltip) return;
    overlay.style.display = 'block';
    if (el) {
        var rect = el.getBoundingClientRect();
        highlight.style.cssText = 'position:fixed;top:' + (rect.top - 4) + 'px;left:' + (rect.left - 4) + 'px;width:' + (rect.width + 8) + 'px;height:' + (rect.height + 8) + 'px;border:2px solid var(--accent);border-radius:6px;z-index:100001;pointer-events:none;box-shadow:0 0 0 9999px rgba(0,0,0,0.4);transition:all 0.3s ease;';
        var tipTop = rect.bottom + 12;
        var tipLeft = Math.max(16, Math.min(rect.left, window.innerWidth - 340));
        tooltip.style.cssText = 'position:fixed;top:' + tipTop + 'px;left:' + tipLeft + 'px;z-index:100002;background:var(--card);border:1px solid var(--accent);border-radius:3px;padding:16px 20px;max-width:320px;box-shadow:0 12px 40px rgba(0,0,0,0.1);';
    }
    tooltip.innerHTML = '<div style="font-size:0.72rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Step ' + (_tourIdx + 1) + ' of ' + _tourSteps.length + '</div>'
        + '<h4 style="color:var(--text,#1d1d1f);font-size:0.95rem;font-weight:700;margin:0 0 6px;">' + step.title + '</h4>'
        + '<p style="color:var(--steel);font-size:0.82rem;line-height:1.5;margin:0 0 12px;">' + step.desc + '</p>'
        + '<div style="display:flex;gap:8px;justify-content:flex-end;">'
        + (_tourIdx > 0 ? '<button onclick="_tourPrev()" style="background:transparent;border:1px solid var(--border);color:var(--steel);border-radius:3px;padding:4px 12px;font-size:0.75rem;cursor:pointer;font-family:inherit;">Back</button>' : '')
        + '<button onclick="_tourNext()" style="background:var(--accent);color:#fff;border:none;border-radius:3px;padding:4px 14px;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:inherit;">' + (_tourIdx === _tourSteps.length - 1 ? 'Done' : 'Next') + '</button>'
        + '</div>';
}

function _tourNext() { _tourIdx++; _showTourStep(); }
function _tourPrev() { _tourIdx--; _showTourStep(); }
function _endTour() {
    _tourIdx = -1;
    var overlay = document.getElementById('s4TourOverlay');
    var highlight = document.getElementById('s4TourHighlight');
    var tooltip = document.getElementById('s4TourTooltip');
    if (overlay) overlay.style.display = 'none';
    if (highlight) highlight.style.cssText = '';
    if (tooltip) tooltip.innerHTML = '';
}

// ═══ Getting Started — Day One Flow ═══
function _showGettingStartedIfNew() {
    var gs = document.getElementById('gettingStartedSection');
    if (!gs) return;
    // Show only if user hasn't dismissed it and has completed onboarding
    var dismissed = localStorage.getItem('s4_getting_started_dismissed');
    var entered = sessionStorage.getItem('s4_entered');
    if (dismissed) { gs.style.display = 'none'; return; }
    if (entered) { gs.style.display = 'block'; }
}

function dismissGettingStarted() {
    localStorage.setItem('s4_getting_started_dismissed', '1');
    var gs = document.getElementById('gettingStartedSection');
    if (gs) { gs.style.opacity = '0'; gs.style.transition = 'opacity 0.3s ease'; setTimeout(function(){ gs.style.display = 'none'; }, 300); }
}

// Export new functions
window.enterDemoMode = enterDemoMode;
window.exitDemoMode = exitDemoMode;
window.filterILSTools = filterILSTools;
window.searchILSTools = searchILSTools;
window.startQuickTour = startQuickTour;
window._tourNext = _tourNext;
window._tourPrev = _tourPrev;
window.dismissGettingStarted = dismissGettingStarted;
