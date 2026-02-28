// S4 Ledger — session-init
// Always show landing page and full auth flow on load
// Clears ALL session state so every page load starts fresh with:
// Landing page → Enter Platform → DoD Consent → CAC Login → Onboarding → Role Selector
(function() {
    sessionStorage.removeItem('s4_entered');
    sessionStorage.removeItem('s4_onboard_done');
    sessionStorage.removeItem('s4_authenticated');
    sessionStorage.removeItem('s4_auth_method');
    sessionStorage.removeItem('s4_user_role');
    sessionStorage.removeItem('s4_user_title');
    sessionStorage.removeItem('s4_visible_tabs');
})();
