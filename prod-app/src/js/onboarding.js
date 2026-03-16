// S4 Ledger — onboarding
// Extracted from monolith lines 13392-13505
// 112 lines

var _onboardStep = 0;
var _onboardTier = localStorage.getItem('s4_selected_tier') || 'starter';
var _onboardTiers = {
    pilot: { label: 'Pilot (Free)', credits: 100, price: 'Free' },
    starter: { label: 'Starter ($999/mo)', credits: 25000, price: '$999/mo' },
    professional: { label: 'Professional ($2,499/mo)', credits: 100000, price: '$2,499/mo' },
    enterprise: { label: 'Enterprise ($9,999/mo)', credits: 500000, price: '$9,999/mo' }
};

function showOnboarding() {
    var overlay = document.getElementById('onboardOverlay');
    if (overlay) { overlay.style.display = 'flex'; if (typeof _s4TrapFocus === 'function') _s4TrapFocus(overlay); }
    _onboardStep = 0;
    // Reset tier selection — re-read localStorage (cleared by logout) to avoid stale module state
    _onboardTier = localStorage.getItem('s4_selected_tier') || 'starter';
    // Reset tier card visual state and highlight current default
    document.querySelectorAll('.onboard-tier').forEach(function(t) { t.classList.remove('selected'); });
    var defaultCard = document.querySelector('.onboard-tier[data-tier="' + _onboardTier + '"]');
    if (defaultCard) defaultCard.classList.add('selected');
    // Reset onboard preview balance displays to match default tier
    var tierInfo = _onboardTiers[_onboardTier] || _onboardTiers['starter'];
    var obBal = document.getElementById('onboardSlsBal');
    if (obBal) obBal.textContent = tierInfo.credits.toLocaleString();
    var obAnch = document.getElementById('onboardSlsAnchors');
    if (obAnch) obAnch.textContent = (tierInfo.credits * 100).toLocaleString();
    updateOnboardStep();
}

function closeOnboarding() {
    var overlay = document.getElementById('onboardOverlay');
    if (overlay) overlay.style.display = 'none';
    if (typeof _s4ReleaseFocusTrap === 'function') _s4ReleaseFocusTrap();
    sessionStorage.setItem('s4_onboard_done', '1');
    // Clear wallet sidebar cached content so next open gets fresh tier data
    var _wsBody = document.getElementById('walletSidebarBody');
    if (_wsBody) { _wsBody.innerHTML = ''; delete _wsBody.dataset.loaded; }
    // Store selected tier in localStorage so it persists across reloads
    var tierInfo = _onboardTiers[_onboardTier] || _onboardTiers['starter'];
    localStorage.setItem('s4_selected_tier', _onboardTier);
    // Propagate tier data to engine chunk (window globals + localStorage)
    window._s4TierAllocation = tierInfo.credits;
    window._s4TierLabel = tierInfo.label;
    localStorage.setItem('s4_tier_allocation', String(tierInfo.credits));
    localStorage.setItem('s4_tier_label', tierInfo.label);
    // Force immediate balance refresh across all displays
    if (typeof window._updateSlsBalance === 'function') {
        window._updateSlsBalance();
        setTimeout(function() { if (typeof window._updateSlsBalance === 'function') window._updateSlsBalance(); }, 500);
        setTimeout(function() { if (typeof window._updateSlsBalance === 'function') window._updateSlsBalance(); }, 2000);
    } else if (typeof window._syncSlsBar === 'function') {
        window._syncSlsBar();
    }
    // After onboarding, show role selector so user can configure their view
    if (typeof showRoleSelector === 'function') {
        showRoleSelector();
    } else if (typeof window.showRoleSelector === 'function') {
        window.showRoleSelector();
    }
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
    if (acctIdEl) acctIdEl.textContent = 'acct_' + Date.now().toString(36);
    setTimeout(function() {
        if (statusEl) statusEl.innerHTML = window._s4Safe('<i class="fas fa-check-circle" style="color:var(--green)"></i> Active');
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
        if (trustEl) trustEl.innerHTML = window._s4Safe('Credits <i class="fas fa-check-circle" style="color:var(--green);margin-left:4px"></i>');
        if (doneEl) doneEl.style.display = 'block';
    }, 1800);
}

function selectOnboardTier(el, tier) {
    _onboardTier = tier;
    var info = _onboardTiers[tier] || _onboardTiers['starter'];
    // Publish tier data to window so engine chunk can read it
    window._s4TierAllocation = info.credits;
    window._s4TierLabel = info.label;
    localStorage.setItem('s4_tier_allocation', String(info.credits));
    localStorage.setItem('s4_tier_label', info.label);
    document.querySelectorAll('.onboard-tier').forEach(function(t) { t.classList.remove('selected'); });
    el.classList.add('selected');
    var balEl = document.getElementById('onboardSlsBal');
    var anchorsEl = document.getElementById('onboardSlsAnchors');
    if (balEl) balEl.textContent = info.credits.toLocaleString();
    if (anchorsEl) anchorsEl.textContent = (info.credits * 100).toLocaleString();
    // Sync ALL Credit balance displays to selected tier
    var mainBal = document.getElementById('slsBarBalance');
    if (mainBal) mainBal.textContent = info.credits.toLocaleString() + ' Credits';
    var toolBal = document.getElementById('toolSlsBal');
    if (toolBal) toolBal.textContent = info.credits.toLocaleString();
    var sidebarBal = document.getElementById('sidebarSlsBal');
    if (sidebarBal) sidebarBal.textContent = info.credits.toLocaleString() + ' Credits';
    var walletBal = document.getElementById('walletSLSBalance');
    if (walletBal) walletBal.textContent = info.credits.toLocaleString();
    var planEl = document.getElementById('slsBarPlan');
    if (planEl) planEl.textContent = info.label.replace(/\s*\(.*\)/, '');
    // Update wallet trigger balance
    var triggerBal = document.getElementById('walletTriggerBal');
    if (triggerBal) triggerBal.textContent = info.credits.toLocaleString() + ' Credits';
    // Update anchors available (credits * 100 at 0.01 per anchor)
    var walletAnchors = document.getElementById('walletAnchors');
    if (walletAnchors) walletAnchors.textContent = (info.credits * 100).toLocaleString();
}

// Onboarding is triggered by enterPlatformAfterAuth() in engine.js
// No DOMContentLoaded auto-show needed — the auth flow handles it

// Publish initial tier data to window so engine chunk can read it on load
(function() {
    var initTier = _onboardTiers[_onboardTier] || _onboardTiers['starter'];
    window._s4TierAllocation = initTier.credits;
    window._s4TierLabel = initTier.label;
    // Restore from localStorage if user previously completed onboarding
    // Do NOT pre-write to localStorage — let closeOnboarding() handle that
    if (localStorage.getItem('s4_tier_allocation')) {
        window._s4TierAllocation = parseInt(localStorage.getItem('s4_tier_allocation')) || initTier.credits;
        window._s4TierLabel = localStorage.getItem('s4_tier_label') || initTier.label;
    }
})();

// === Window exports for inline event handlers ===
window.showOnboarding = showOnboarding;
window.closeOnboarding = closeOnboarding;
window.onboardNext = onboardNext;
window.selectOnboardTier = selectOnboardTier;
// Bridge function so logout() in engine.js can reset module-scoped _onboardTier
window._resetOnboardTier = function() {
    _onboardTier = localStorage.getItem('s4_selected_tier') || 'starter';
};

// === Direct event binding for onboarding buttons (CSP bypass) ===
// onclick attributes may be blocked by Content Security Policy in VS Code Simple Browser.
// Bind click listeners directly to ensure buttons work regardless of CSP.
(function _bindOnboardButtons() {
    function attach() {
        // "Start Setup" and "Continue" buttons
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
        // Tier selection cards
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
    // Re-attach after overlay becomes visible (in case DOM wasn't ready)
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
// This fires from WITHIN the navigation chunk — no cross-chunk polling needed.
// When platformWorkspace becomes visible and onboarding hasn't been seen, show it.
(function _autoTriggerOnboarding() {
    // If onboarding was already completed in this session, skip
    if (sessionStorage.getItem('s4_onboard_done')) return;
    // Watch for the platform workspace becoming visible (user just logged in)
    var _checkCount = 0;
    function _check() {
        _checkCount++;
        var ws = document.getElementById('platformWorkspace');
        if (ws && ws.style.display === 'block' && !sessionStorage.getItem('s4_onboard_done')) {
            // Platform is visible and onboarding not done — show it!
            showOnboarding();
            return;
        }
        // Keep checking for up to 30 seconds (300 checks × 100ms)
        if (_checkCount < 300) {
            setTimeout(_check, 100);
        }
    }
    // Start checking after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(_check, 200); });
    } else {
        setTimeout(_check, 200);
    }
})();
