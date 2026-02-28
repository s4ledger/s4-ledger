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
    if (overlay) overlay.style.display = 'flex';
    _onboardStep = 0;
    updateOnboardStep();
}

function closeOnboarding() {
    var overlay = document.getElementById('onboardOverlay');
    if (overlay) overlay.style.display = 'none';
    sessionStorage.setItem('s4_onboard_done', '1');
    // Store selected tier in localStorage so it persists across reloads
    var tierInfo = _onboardTiers[_onboardTier] || _onboardTiers['starter'];
    localStorage.setItem('s4_selected_tier', _onboardTier);
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
}

// Onboarding is triggered by enterPlatformAfterAuth() in engine.js
// No DOMContentLoaded auto-show needed — the auth flow handles it

// Publish initial tier data to window so engine chunk can read it on load
(function() {
    var initTier = _onboardTiers[_onboardTier] || _onboardTiers['starter'];
    window._s4TierAllocation = initTier.credits;
    window._s4TierLabel = initTier.label;
    // Also store in localStorage for cross-session persistence
    if (!localStorage.getItem('s4_tier_allocation')) {
        localStorage.setItem('s4_tier_allocation', String(initTier.credits));
        localStorage.setItem('s4_tier_label', initTier.label);
    } else {
        // Restore from localStorage if already set
        window._s4TierAllocation = parseInt(localStorage.getItem('s4_tier_allocation')) || initTier.credits;
        window._s4TierLabel = localStorage.getItem('s4_tier_label') || initTier.label;
    }
})();

// === Window exports for inline event handlers ===
window.showOnboarding = showOnboarding;
window.closeOnboarding = closeOnboarding;
window.onboardNext = onboardNext;
window.selectOnboardTier = selectOnboardTier;
