// S4 Ledger — session-init
// Always show landing page on load — user clicks "Enter Platform" to proceed
// No auto-enter: ensures the landing page is always the first thing users see
(function() {
    // Clear any stale entered flag so landing always shows
    sessionStorage.removeItem('s4_entered');
})();
