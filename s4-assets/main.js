// S4 Ledger — Shared Scripts

// Scroll progress bar
window.addEventListener('scroll', () => {
    const scroll = window.scrollY;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const bar = document.getElementById('scrollProgress');
    if (bar) bar.style.width = (height > 0 ? (scroll / height * 100) : 0) + '%';
    const btn = document.getElementById('backToTop');
    if (btn) { scroll > 400 ? btn.classList.add('visible') : btn.classList.remove('visible'); }
});

// Reveal on scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Background animation loaded from s4-assets/s4-background.js (blockchain anchor canvas)

// ── Persistent Auth State (cross-page login awareness) ──
document.addEventListener('DOMContentLoaded', () => {
    try {
        const user = JSON.parse(localStorage.getItem('s4_user') || 'null');
        if (user && Date.now() - user.loginTime < 86400000) { // 24 hour session
            // Find login link in navbar and update to show logged-in state
            const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
            navLinks.forEach(link => {
                if (link.href && link.href.includes('s4-login')) {
                    link.innerHTML = '<i class="fas fa-user-circle"></i> ' + user.name;
                    link.style.color = '#14f195';
                    link.style.fontWeight = '700';
                }
            });
        }
    } catch(e) { /* ignore parse errors */ }
});
