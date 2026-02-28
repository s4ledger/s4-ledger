// S4 Ledger — session-init
// Extracted from monolith lines 1940-1947

// Auto-enter workspace if user has already entered this session
// Otherwise show the landing page so users see the platform intro first
(function() {
    var alreadyEntered = sessionStorage.getItem('s4_entered') === '1';
    if (alreadyEntered) {
        var landing = document.getElementById('platformLanding');
        var hero    = document.querySelector('.hero');
        var ws      = document.getElementById('platformWorkspace');
        if (landing) landing.style.display = 'none';
        if (hero)    hero.style.display    = 'none';
        if (ws)      ws.style.display      = 'block';
    }
})();
