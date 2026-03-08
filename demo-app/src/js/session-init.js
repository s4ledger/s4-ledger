// S4 Ledger — session-init
// Restore session if user has already clicked "Enter Platform" this session
// If s4_entered is set, show the workspace. Otherwise landing page remains visible.

if (sessionStorage.getItem('s4_entered') === '1') {
    var _landing = document.getElementById('platformLanding');
    var _hero = document.querySelector('.hero');
    var _ws = document.getElementById('platformWorkspace');
    if (_landing) _landing.style.display = 'none';
    if (_hero) _hero.style.display = 'none';
    if (_ws) _ws.style.display = 'block';
}
