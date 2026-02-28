// S4 Ledger — session-init
// Extracted from monolith lines 1940-1947

// Always auto-enter workspace on page load (skip landing page gate)
(function() {
    var landing = document.getElementById('platformLanding');
    var hero    = document.querySelector('.hero');
    var ws      = document.getElementById('platformWorkspace');
    if (landing) landing.style.display = 'none';
    if (hero)    hero.style.display    = 'none';
    if (ws)      ws.style.display      = 'block';
    sessionStorage.setItem('s4_entered', '1');
    sessionStorage.setItem('s4_onboard_done', '1');
})();
