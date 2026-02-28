// S4 Ledger — onboarding
// Extracted from monolith lines 13392-13505
// 112 lines

var _onboardStep = 0;
var _onboardTier = localStorage.getItem('s4_selected_tier') || 'starter';
var _onboardTiers = {
    pilot: { label: 'Pilot (Free)', sls: 100, price: 'Free' },
    starter: { label: 'Starter ($999/mo)', sls: 25000, price: '$999/mo' },
    professional: { label: 'Professional ($2,499/mo)', sls: 100000, price: '$2,499/mo' },
    enterprise: { label: 'Enterprise ($9,999/mo)', sls: 500000, price: '$9,999/mo' }
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
    var _tierAlloc = (_onboardTiers[tier] || _onboardTiers['starter']).sls;
    document.querySelectorAll('.onboard-tier').forEach(function(t) { t.classList.remove('selected'); });
    el.classList.add('selected');
    var info = _onboardTiers[tier];
    var balEl = document.getElementById('onboardSlsBal');
    var anchorsEl = document.getElementById('onboardSlsAnchors');
    if (balEl) balEl.textContent = info.sls.toLocaleString();
    if (anchorsEl) anchorsEl.textContent = (info.sls * 100).toLocaleString();
    // Sync ALL Credit balance displays to selected tier
    var mainBal = document.getElementById('slsBarBalance');
    if (mainBal) mainBal.textContent = info.sls.toLocaleString() + ' Credits';
    var toolBal = document.getElementById('toolSlsBal');
    if (toolBal) toolBal.textContent = info.sls.toLocaleString();
    var sidebarBal = document.getElementById('sidebarSlsBal');
    if (sidebarBal) sidebarBal.textContent = info.sls.toLocaleString() + ' Credits';
}

// Onboarding is available via manual trigger — do not auto-show on page load
// The onboarding wizard can still be launched via showOnboarding() if needed

// === Window exports for inline event handlers ===
window.closeOnboarding = closeOnboarding;
window.onboardNext = onboardNext;
window.selectOnboardTier = selectOnboardTier;
