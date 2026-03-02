// S4 Ledger Demo — onboarding
// Extracted from monolith lines 13013-13141
// 127 lines

var _onboardStep = 0;
var _onboardTier = localStorage.getItem('s4_selected_tier') || 'starter';
window._onboardTier = _onboardTier;
var _onboardTiers = {
    pilot: { label: 'Pilot (Free)', sls: 100, price: 'Free' },
    starter: { label: 'Starter ($999/mo)', sls: 25000, price: '$999/mo' },
    professional: { label: 'Professional ($2,499/mo)', sls: 100000, price: '$2,499/mo' },
    enterprise: { label: 'Enterprise ($9,999/mo)', sls: 500000, price: '$9,999/mo' }
};
window._onboardTiers = _onboardTiers;

function showOnboarding() {
    var overlay = document.getElementById('onboardOverlay');
    if (overlay) { overlay.style.display = 'flex'; if (typeof _s4TrapFocus === 'function') _s4TrapFocus(overlay); }
    _onboardStep = 0;
    updateOnboardStep();
    // Ensure tier cards are bound after overlay becomes visible
    setTimeout(function() {
        document.querySelectorAll('.onboard-tier').forEach(function(card) {
            if (card._s4ob) return;
            card._s4ob = true;
            card.addEventListener('click', function(e) {
                e.stopPropagation();
                var tier = this.getAttribute('data-tier') || 'starter';
                selectOnboardTier(this, tier);
            });
        });
        document.querySelectorAll('.onboard-btn').forEach(function(btn) {
            if (btn._s4ob) return;
            btn._s4ob = true;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var text = (this.textContent || '').toLowerCase();
                if (text.indexOf('enter') !== -1) {
                    sessionStorage.setItem('s4_entered', '1');
                    closeOnboarding();
                } else {
                    onboardNext();
                }
            });
        });
    }, 50);
}

function closeOnboarding() {
    var overlay = document.getElementById('onboardOverlay');
    if (overlay) overlay.style.display = 'none';
    if (typeof _s4ReleaseFocusTrap === 'function') _s4ReleaseFocusTrap();
    sessionStorage.setItem('s4_onboard_done', '1');
    // After onboarding, show role selector if no role set
    setTimeout(function() {
        if (!window._currentRole && typeof window.showRoleSelector === 'function') {
            window.showRoleSelector();
        }
    }, 500);
    // Store selected tier in localStorage so it persists across reloads
    var tierInfo = _onboardTiers[_onboardTier] || _onboardTiers['starter'];
    localStorage.setItem('s4_selected_tier', _onboardTier);
    // Clear BOTH module-scoped and window session so init uses the new tier
    if (typeof window._resetDemoSession === 'function') window._resetDemoSession();
    else window._demoSession = null;
    // Trigger demo session init with selected tier
    if (typeof window._initDemoSession === 'function') window._initDemoSession();
}

function onboardNext() {
    _onboardStep++;
    if (_onboardStep > 4) { closeOnboarding(); return; }
    updateOnboardStep();
    // Animate step content
    if (_onboardStep === 1) animateAccountCreation();
    if (_onboardStep === 2) animateWalletFunding();
}

function updateOnboardStep() {
    for (var i = 0; i <= 4; i++) {
        var step = document.getElementById('onboardStep' + i);
        if (step) step.classList.toggle('active', i === _onboardStep);
    }
    var dots = document.querySelectorAll('#onboardProgress .onboard-dot');
    dots.forEach(function(dot, idx) {
        dot.classList.remove('active', 'done');
        if (idx === _onboardStep) dot.classList.add('active');
        else if (idx < _onboardStep) dot.classList.add('done');
    });
}

function animateAccountCreation() {
    var statusEl = document.getElementById('onboardAcctStatus');
    var acctIdEl = document.getElementById('onboardAcctId');
    var doneEl = document.getElementById('onboardAcctDone');
    if (acctIdEl) acctIdEl.textContent = 'demo_' + Date.now().toString(36);
    setTimeout(function() {
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:var(--green)"></i> Active';
        if (doneEl) doneEl.style.display = 'block';
    }, 1200);
}

function animateWalletFunding() {
    var addrEl = document.getElementById('onboardWalletAddr');
    var xrpEl = document.getElementById('onboardXrpBal');
    var trustEl = document.getElementById('onboardTrustLine');
    var doneEl = document.getElementById('onboardWalletDone');
    // Simulate wallet address
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var addr = 'r';
    for (var i = 0; i < 28; i++) addr += chars[Math.floor(Math.random() * chars.length)];
    setTimeout(function() {
        if (addrEl) addrEl.textContent = addr.substring(0,8) + '...' + addr.slice(-4);
    }, 500);
    setTimeout(function() {
        if (xrpEl) xrpEl.textContent = '12.000000 XRP';
    }, 1200);
    setTimeout(function() {
        if (trustEl) trustEl.innerHTML = 'Credits <i class="fas fa-check-circle" style="color:var(--green);margin-left:4px"></i>';
        if (doneEl) doneEl.style.display = 'block';
    }, 1800);
}

function selectOnboardTier(el, tier) {
    _onboardTier = tier;
    window._onboardTier = tier;
    // Live-update SLS Allocated in flow box
    var _tierAlloc = (_onboardTiers[tier] || _onboardTiers['starter']).sls;
    var _s3s = document.getElementById('demoStep3Status');
    if (_s3s && _s3s.innerHTML.indexOf('Credits') !== -1) {
        _s3s.innerHTML = '<i class="fas fa-check" style="color:#00aaff;margin-right:3px;"></i> ' + _tierAlloc.toLocaleString() + ' Credits';
    }
    var _balEl = document.getElementById('demoSlsBalance');
    if (_balEl) _balEl.textContent = _tierAlloc.toLocaleString() + ' Credits';
    // Also update the session object
    if (window._demoSession && window._demoSession.subscription) {
        window._demoSession.subscription.sls_allocation = _tierAlloc;
        window._demoSession.subscription.label = (_onboardTiers[tier] || _onboardTiers['starter']).label;
    }
    document.querySelectorAll('.onboard-tier').forEach(function(t) { t.classList.remove('selected'); });
    el.classList.add('selected');
    var info = _onboardTiers[tier];
    var balEl = document.getElementById('onboardSlsBal');
    var anchorsEl = document.getElementById('onboardSlsAnchors');
    if (balEl) balEl.textContent = info.sls.toLocaleString();
    if (anchorsEl) anchorsEl.textContent = (info.sls * 100).toLocaleString();
    // Sync ALL SLS balance displays to selected tier
    var mainBal = document.getElementById('slsBarBalance');
    if (mainBal) mainBal.textContent = info.sls.toLocaleString() + ' Credits';
    var toolBal = document.getElementById('toolSlsBal');
    if (toolBal) toolBal.textContent = info.sls.toLocaleString();
    var sidebarBal = document.getElementById('sidebarSlsBal');
    if (sidebarBal) sidebarBal.textContent = info.sls.toLocaleString() + ' Credits';
    // Update wallet balance card in Ledger Account
    var walletBal = document.getElementById('walletSLSBalance');
    if (walletBal) walletBal.textContent = info.sls.toLocaleString();
    // Update plan label in balance bar
    var planEl = document.getElementById('slsBarPlan');
    if (planEl) planEl.textContent = info.label.replace(/\s*\(.*\)/, '');
    // Update navbar wallet trigger
    var triggerBal = document.getElementById('walletTriggerBal');
    if (triggerBal) triggerBal.textContent = info.sls.toLocaleString() + ' Credits';
    // Update anchors available
    var walletAnchors = document.getElementById('walletAnchors');
    if (walletAnchors) walletAnchors.textContent = (info.sls * 100).toLocaleString();
    // Persist to localStorage
    localStorage.setItem('s4_selected_tier', tier);
    localStorage.setItem('s4_tier_allocation', String(info.sls));
    localStorage.setItem('s4_tier_label', info.label);
}

// Auto-show onboarding on first visit — ONLY after entering platform (DOM check, not sessionStorage)
document.addEventListener('DOMContentLoaded', function() {
    var ws = document.getElementById('platformWorkspace');
    if (ws && ws.style.display === 'block' && !sessionStorage.getItem('s4_onboard_done')) {
        setTimeout(showOnboarding, 600);
    }
});

// === Window exports for inline event handlers ===
window.showOnboarding = showOnboarding;
window.closeOnboarding = closeOnboarding;
window.onboardNext = onboardNext;
window.selectOnboardTier = selectOnboardTier;

// === Direct event binding for onboarding buttons (CSP bypass) ===
(function _bindOnboardButtons() {
    function attach() {
        document.querySelectorAll('.onboard-btn').forEach(function(btn) {
            if (btn._s4ob) return;
            btn._s4ob = true;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var text = (this.textContent || '').toLowerCase();
                if (text.indexOf('enter') !== -1) {
                    sessionStorage.setItem('s4_entered', '1');
                    closeOnboarding();
                } else {
                    onboardNext();
                }
            });
        });
        document.querySelectorAll('.onboard-tier').forEach(function(card) {
            if (card._s4ob) return;
            card._s4ob = true;
            card.addEventListener('click', function(e) {
                e.stopPropagation();
                var tier = this.getAttribute('data-tier') || 'starter';
                selectOnboardTier(this, tier);
            });
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    } else {
        attach();
    }
    var _attachInterval = setInterval(function() {
        var ov = document.getElementById('onboardOverlay');
        if (ov && ov.style.display === 'flex') {
            attach();
            clearInterval(_attachInterval);
        }
    }, 200);
    setTimeout(function() { clearInterval(_attachInterval); }, 30000);
})();

// === Self-contained onboarding auto-trigger ===
(function _autoTriggerOnboarding() {
    if (sessionStorage.getItem('s4_onboard_done')) return;
    var _checkCount = 0;
    function _check() {
        _checkCount++;
        var ws = document.getElementById('platformWorkspace');
        if (ws && ws.style.display === 'block' && !sessionStorage.getItem('s4_onboard_done')) {
            showOnboarding();
            return;
        }
        if (_checkCount < 300) {
            setTimeout(_check, 100);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(_check, 200); });
    } else {
        setTimeout(_check, 200);
    }
})();
