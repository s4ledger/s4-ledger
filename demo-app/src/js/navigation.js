// S4 Ledger Demo — navigation
// Extracted from monolith lines 14750-15331
// 580 lines

// ═══ Platform Hub Navigation ═══
var _currentSection = null;
var _currentILSTool = null;

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
    // Show hub
    var hub = document.getElementById('platformHub');
    if (hub) { hub.style.display = 'block'; hub.style.animation = 'fadeIn 0.3s ease'; }
    // Show stat strip
    var sr = document.getElementById('statsRow');
    if (sr) sr.style.display = 'flex';
    // Only show hero + pre-platform landing if user hasn't entered yet
    if (!sessionStorage.getItem('s4_entered')) {
        var hero = document.querySelector('.hero');
        if (hero) hero.style.display = 'block';
        var landing = document.getElementById('platformLanding');
        if (landing) landing.style.display = 'block';
    }
    _currentSection = null;
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
        'sectionVerify': 'tabVerify',
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
    
    // For ILS section, show the sub-hub
    if (sectionId === 'sectionILS') {
        var subHub = document.getElementById('ilsSubHub');
        if (subHub) subHub.style.display = 'grid';
        var toolBack = document.getElementById('ilsToolBackBar');
        if (toolBack) toolBack.style.display = 'none';
        // Hide all ILS panels
        document.querySelectorAll('.ils-hub-panel').forEach(function(p) { p.classList.remove('active'); });
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
}

// ═══ ILS Tool Navigation ═══
function openILSTool(toolId) {
    var subHub = document.getElementById('ilsSubHub');
    if (subHub) subHub.style.display = 'none';
    var toolBack = document.getElementById('ilsToolBackBar');
    if (toolBack) toolBack.style.display = 'block';
    
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
    
    // Update floating AI agent context
    if (typeof updateAiContext === 'function') updateAiContext(toolId);
    
    // How It Works: modal popup — first visit auto-shows, ? icon on return visits
    (function(){
        var panel = document.getElementById(toolId);
        if(!panel) return;
        var det = panel.querySelector('details');
        if(!det) return;
        det.style.display = 'none';
        var key = 's4_hiw_' + toolId;
        function showHIWModal(){
            var existing = document.querySelector('.hiw-modal-overlay');
            if(existing) existing.remove();
            var title = det.querySelector('summary') ? det.querySelector('summary').textContent.replace(/[▸▾▾]/g,'').trim() : 'How It Works';
            var body = '';
            det.querySelectorAll('p,ol,ul,li').forEach(function(el){ body += el.outerHTML; });
            if(!body) body = det.innerHTML.replace(/<summary[^>]*>.*?<\/summary>/i,'');
            var overlay = document.createElement('div');
            overlay.className = 'hiw-modal-overlay';
            overlay.innerHTML = '<div class="hiw-modal-box"><button class="hiw-close" title="Close">&times;</button><h4><i class="fas fa-info-circle" style="margin-right:6px"></i>' + title + '</h4><div class="hiw-body">' + body + '</div></div>';
            overlay.querySelector('.hiw-close').onclick = function(){ overlay.remove(); };
            overlay.onclick = function(e){ if(e.target === overlay) overlay.remove(); };
            document.body.appendChild(overlay);
        }
        if(!localStorage.getItem(key)){
            localStorage.setItem(key,'1');
            setTimeout(showHIWModal, 300);
        }
        var h3 = panel.querySelector('h3');
        if(h3 && !h3.querySelector('.hiw-help-btn')){
            var btn = document.createElement('button');
            btn.className = 'hiw-help-btn';
            btn.title = 'How It Works';
            btn.textContent = '?';
            btn.style.cssText = 'margin-left:8px;background:rgba(0,170,255,0.12);border:1px solid rgba(0,170,255,0.3);color:#00aaff;border-radius:50%;width:22px;height:22px;font-size:0.72rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;';
            btn.onclick = function(e){ e.stopPropagation(); showHIWModal(); };
            h3.appendChild(btn);
        }
    })();

    _currentILSTool = toolId;
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
    // Re-apply role visibility on tool cards
    if (_currentRole && typeof applyTabVisibility === 'function') {
        var vis = _customVisibleTabs || (_s4Roles[_currentRole] ? _s4Roles[_currentRole].tabs : _allHubTabs);
        applyTabVisibility(vis);
    }
}

// ═══ Drag-Reorder Tool Cards (iPhone-style) ═══
(function initToolCardDragReorder(){
    var STORAGE_KEY = 's4_demo_tool_card_order';
    function getHub(){ return document.getElementById('ilsSubHub'); }
    
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

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', function(){ restoreOrder(); setupDrag(); });
    } else {
        restoreOrder(); setupDrag();
    }
})();

// ═══ Wallet Sidebar ═══
function openWalletSidebar() {
    var sidebar = document.getElementById('walletSidebar');
    var overlay = document.getElementById('walletOverlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('show');
    
    // Move wallet content into sidebar on first open
    var body = document.getElementById('walletSidebarBody');
    var walletPane = document.getElementById('tabWallet');
    if (body && walletPane && !body.dataset.loaded) {
        body.innerHTML = walletPane.innerHTML;
        body.dataset.loaded = 'true';
        // Trigger wallet data load
        if (typeof loadWalletData === 'function') loadWalletData();
        
        // Fix: Rewire flow details button to show INSIDE the sidebar
        _rewireWalletFlowDetails(body);
    }
    
    // Update wallet trigger balance
    updateWalletTrigger();
}

function _rewireWalletFlowDetails(sidebarBody) {
    // Find the "Flow Details" button inside the sidebar copy
    var flowBtn = sidebarBody.querySelector('#slsToggleBtn');
    if (!flowBtn) return;
    
    // Remove the original onclick which toggles external demoPanel
    flowBtn.removeAttribute('onclick');
    
    // Create inline flow details panel for the sidebar
    var flowPanel = document.createElement('div');
    flowPanel.id = 'sidebarFlowPanel';
    flowPanel.style.cssText = 'display:none;margin-top:12px;background:linear-gradient(135deg,rgba(0,170,255,0.06),rgba(201,168,76,0.04));border:1px solid rgba(0,170,255,0.25);border-radius:3px;padding:16px 18px;';
    flowPanel.innerHTML = '<div style="position:relative">'
        + '<div style="position:absolute;top:-4px;right:0;background:linear-gradient(135deg,#00aaff,#c9a84c);padding:3px 12px;border-radius:0 10px 0 8px;font-size:0.62rem;font-weight:700;color:#050810;letter-spacing:0.5px">LIVE PREVIEW</div>'
        + '<h4 style="margin:0 0 4px;font-size:0.95rem;color:#fff"><i class="fas fa-flask" style="color:#00aaff;margin-right:6px"></i>SLS Economic Flow</h4>'
        + '<p style="color:#8ea4b8;font-size:0.72rem;margin:0 0 12px">See how the $SLS token economy works. <strong style="color:#c9a84c">Every anchor costs 0.01 $SLS.</strong></p>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        + '<div style="background:rgba(0,170,255,0.08);border:1px solid rgba(0,170,255,0.2);border-radius:3px;padding:10px;text-align:center"><div style="width:28px;height:28px;border-radius:50%;background:rgba(0,170,255,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:6px"><i class="fas fa-user-plus" style="color:#00aaff;font-size:0.75rem"></i></div><div style="font-size:0.68rem;font-weight:700;color:#fff">1. Account</div><div style="font-size:0.62rem;color:#8ea4b8">Created &amp; provisioned</div></div>'
        + '<div style="background:rgba(0,170,255,0.08);border:1px solid rgba(0,170,255,0.2);border-radius:3px;padding:10px;text-align:center"><div style="width:28px;height:28px;border-radius:50%;background:rgba(0,170,255,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:6px"><i class="fas fa-wallet" style="color:#00aaff;font-size:0.75rem"></i></div><div style="font-size:0.68rem;font-weight:700;color:#fff">2. Wallet Funded</div><div style="font-size:0.62rem;color:#8ea4b8">12 XRP reserve</div></div>'
        + '<div style="background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:3px;padding:10px;text-align:center"><div style="width:28px;height:28px;border-radius:50%;background:rgba(201,168,76,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:6px"><i class="fas fa-coins" style="color:#c9a84c;font-size:0.75rem"></i></div><div style="font-size:0.68rem;font-weight:700;color:#fff">3. $SLS Allocated</div><div style="font-size:0.62rem;color:#8ea4b8">Based on plan tier</div></div>'
        + '<div style="background:rgba(0,170,255,0.08);border:1px solid rgba(0,170,255,0.2);border-radius:3px;padding:10px;text-align:center"><div style="width:28px;height:28px;border-radius:50%;background:rgba(0,170,255,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:6px"><i class="fas fa-arrow-right" style="color:#00aaff;font-size:0.75rem"></i></div><div style="font-size:0.68rem;font-weight:700;color:#fff">4. 0.01 SLS &rarr; Treasury</div><div style="font-size:0.62rem;color:#8ea4b8">Per anchor fee</div></div>'
        + '</div>'
        + '<div style="margin-top:10px;padding:8px 12px;background:rgba(0,0,0,0.25);border-radius:3px;font-size:0.7rem">'
        + '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px">'
        + '<div><span style="color:#8ea4b8">Wallet:</span> <span style="color:#00aaff;font-family:monospace" id="sidebarWalletAddr">rMLmk...f1KLqJ</span></div>'
        + '<div><span style="color:#8ea4b8">Balance:</span> <span style="color:#c9a84c;font-weight:700" id="sidebarSlsBal">' + (document.getElementById('slsBarBalance') ? document.getElementById('slsBarBalance').textContent : '25,000') + ' SLS</span></div>'
        + '</div></div>'
        + '</div>';
    
    // Insert flow panel after the slsBalanceBar in sidebar
    var slsBar = sidebarBody.querySelector('#slsBalanceBar');
    if (slsBar) {
        slsBar.parentNode.insertBefore(flowPanel, slsBar.nextSibling);
    } else {
        sidebarBody.insertBefore(flowPanel, sidebarBody.firstChild ? sidebarBody.firstChild.nextSibling : null);
    }
    
    // Wire up the button to toggle the SIDEBAR flow panel
    var _sidebarFlowShown = false;
    flowBtn.addEventListener('click', function() {
        _sidebarFlowShown = !_sidebarFlowShown;
        flowPanel.style.display = _sidebarFlowShown ? 'block' : 'none';
        flowBtn.innerHTML = _sidebarFlowShown 
            ? '<i class="fas fa-chevron-up" style="margin-right:4px"></i>Hide Flow Details'
            : '<i class="fas fa-chart-simple" style="margin-right:4px"></i>Show Flow Details';
    });
}

function closeWalletSidebar() {
    var sidebar = document.getElementById('walletSidebar');
    var overlay = document.getElementById('walletOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
}

function updateWalletTrigger() {
    var bal = document.getElementById('slsBarBalance');
    var trigger = document.getElementById('walletTriggerBal');
    if (bal && trigger) {
        trigger.textContent = bal.textContent || '--';
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
        // Hide demoPanel (SLS flow) — merged into wallet sidebar
        var dp = document.getElementById('demoPanel');
        if (dp) dp.style.display = 'none';
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



// ═══ Tool SLS Balance Sync ═══
(function() {
    function syncToolSls() {
        var mainBal = document.getElementById('slsBarBalance');
        var mainAnch = document.getElementById('slsBarAnchors');
        var mainSpent = document.getElementById('slsBarSpent');
        var toolBal = document.getElementById('toolSlsBal');
        var toolAnch = document.getElementById('toolSlsAnch');
        var toolSpent = document.getElementById('toolSlsSpent');
        if (toolBal && mainBal) toolBal.textContent = mainBal.textContent.replace(' SLS','');
        if (toolAnch && mainAnch) toolAnch.textContent = mainAnch.textContent;
        if (toolSpent && mainSpent) toolSpent.textContent = mainSpent.textContent.replace(' SLS','');
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
                + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><i class="fas fa-check-circle" style="color:#00cc66;font-size:1.1rem"></i><strong style="color:#fff;font-size:0.9rem">Record Anchored Successfully</strong></div>'
                + '<div style="font-size:0.78rem;color:var(--steel);display:grid;grid-template-columns:80px 1fr;gap:4px 12px">'
                + '<span style="color:var(--muted)">Type:</span><span>' + (lastRec.label || lastRec.type) + '</span>'
                + '<span style="color:var(--muted)">Hash:</span><span style="font-family:monospace;color:var(--accent);font-size:0.72rem;word-break:break-all">' + (lastRec.hash || '').substring(0,32) + '...</span>'
                + '<span style="color:var(--muted)">TX:</span><span>' + (lastRec.txHash ? '<a href="' + (lastRec.explorerUrl || '#') + '" target="_blank" style="color:var(--accent);text-decoration:none">' + lastRec.txHash.substring(0,16) + '... <i class="fas fa-external-link-alt" style="font-size:0.6rem"></i></a>' : 'Pending') + '</span>'
                + '<span style="color:var(--muted)">Fee:</span><span style="color:#c9a84c">0.01 $SLS</span>'
                + '<span style="color:var(--muted)">Time:</span><span>' + new Date().toLocaleTimeString() + '</span>'
                + '</div>';
            
            var firstCard = panel.querySelector('.demo-card');
            if (firstCard) {
                firstCard.insertBefore(banner, firstCard.firstChild);
            }
            
            // Auto-remove after 15 seconds
            setTimeout(function(){ if (banner.parentElement) banner.remove(); }, 15000);
        }
    };
})();

// === Window exports for inline event handlers ===
window.closeILSTool = closeILSTool;
window.closeWalletSidebar = closeWalletSidebar;
window.openILSTool = openILSTool;
window.openWalletSidebar = openWalletSidebar;
window.showHub = showHub;
window.showSection = showSection;
window.showSystemsSub = showSystemsSub;
