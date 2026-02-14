// S4 Ledger — Site Search
const searchIndex = [
    { title: 'Supply Chain Provenance & Counterfeit Prevention', tags: 'supply chain counterfeit DFARS GIDEP IUID UII DLA parts OEM', page: 'Use Cases', url: 'use-cases' },
    { title: 'Technical Data Package (TDP) Integrity', tags: 'TDP drawings ECP tech manual IETM TDMIS revision engineering change', page: 'Use Cases', url: 'use-cases' },
    { title: 'Maintenance Record Verification (3-M / PMCS)', tags: '3-M maintenance SCLSIS PMCS GCSS-Army INSURV gundecking timestamps', page: 'Use Cases', url: 'use-cases' },
    { title: 'CDRL & Contract Deliverable Tracking', tags: 'CDRL DD-1423 DI-ILSS DI-SESS DCMA deliverable contract', page: 'Use Cases', url: 'use-cases' },
    { title: 'Configuration Management & Baseline Verification', tags: 'configuration baseline CDMD-OA CSA PDREP ECP', page: 'Use Cases', url: 'use-cases' },
    { title: 'Audit Readiness & Compliance', tags: 'audit DCMA Inspector General JAGMAN compliance DoW', page: 'Use Cases', url: 'use-cases' },
    { title: 'TMDE Calibration Tracking', tags: 'TMDE calibration METCAL MEASURE', page: 'Use Cases', url: 'use-cases' },
    { title: 'Training & Certification Verification', tags: 'training PQS NEC MOS FLTMPS ATRRS certification', page: 'Use Cases', url: 'use-cases' },
    { title: 'PHS&T & Shelf-Life Tracking', tags: 'PHS&T shelf-life MIL-STD-2073 hazmat packaging', page: 'Use Cases', url: 'use-cases' },
    { title: 'Disposal & DEMIL Verification', tags: 'disposal DEMIL DLA destruction', page: 'Use Cases', url: 'use-cases' },
    { title: 'LSA & Provisioning Data Integrity', tags: 'LSA LSAR GEIA-STD-0007 provisioning NAVSEA NAVSUP', page: 'Use Cases', url: 'use-cases' },
    { title: 'Milestone & Decision Gate Verification', tags: 'milestone DoWI 5000.02 MS A B C decision gate', page: 'Use Cases', url: 'use-cases' },
    { title: 'U.S. Navy Systems', tags: 'Navy 3-M SCLSIS OARS CDMD-OA NTCSS NAVSUP NAVSEA INSURV', page: 'Use Cases', url: 'use-cases' },
    { title: 'U.S. Army Systems', tags: 'Army GCSS-Army LMP PMCS TACOM property', page: 'Use Cases', url: 'use-cases' },
    { title: 'U.S. Air Force Systems', tags: 'Air Force REMIS D200A PDM AFMC TMDE', page: 'Use Cases', url: 'use-cases' },
    { title: 'U.S. Marines Systems', tags: 'Marines GCSS-MC MIMMS expeditionary', page: 'Use Cases', url: 'use-cases' },
    { title: 'DLA / DCMA', tags: 'DLA DCMA distribution disposal DEMIL contractor audit', page: 'Use Cases', url: 'use-cases' },
    { title: 'Pricing — Pilot (Free)', tags: 'pricing free pilot beta 1000 anchors SDK', page: 'Pricing', url: 'pricing' },
    { title: 'Pricing — Standard ($5K–$20K/yr)', tags: 'pricing standard 500K anchors REST API CDRL supply chain', page: 'Pricing', url: 'pricing' },
    { title: 'Pricing — Enterprise ($50K–$200K/yr)', tags: 'pricing enterprise unlimited custom integrations SLA', page: 'Pricing', url: 'pricing' },
    { title: 'Pricing — Government (Custom)', tags: 'pricing government site license NIST FedRAMP on-premise', page: 'Pricing', url: 'pricing' },
    { title: '$SLS Token — Secure Logistics Standard', tags: 'SLS token XRPL utility tokenomics governance fiat', page: 'Pricing', url: 'pricing-token' },
    { title: 'Phase 1 — Foundation', tags: 'roadmap phase 1 SDK hashing XRPL anchoring', page: 'Roadmap', url: 'roadmap' },
    { title: 'Phase 2 — Defense Platform Launch', tags: 'roadmap phase 2 defense ILS CDRL pitch IRAD', page: 'Roadmap', url: 'roadmap' },
    { title: 'Phase 3 — MVP & Pilot', tags: 'roadmap phase 3 MVP pilot NAVSEA demonstration', page: 'Roadmap', url: 'roadmap' },
    { title: 'Phase 4 — Partner Onboarding & SaaS', tags: 'roadmap phase 4 SaaS DIU NavalX partner', page: 'Roadmap', url: 'roadmap' },
    { title: 'Phase 5 — Scale & Certification', tags: 'roadmap phase 5 NIST FedRAMP SBIR STTR', page: 'Roadmap', url: 'roadmap' },
    { title: 'FAQ — Sensitive data on blockchain?', tags: 'FAQ classified sensitive SHA-256 hash one-way', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — DoW system integration?', tags: 'FAQ 3-M GCSS DPAS REST API Python SDK integrate', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — What is $SLS?', tags: 'FAQ SLS token utility micro-fee fiat USD', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — NIST 800-171 / CMMC?', tags: 'FAQ NIST CMMC CUI FedRAMP compliance', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — Why XRP Ledger?', tags: 'FAQ XRPL Ethereum private blockchain cost speed', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — How is S4 Ledger funded?', tags: 'FAQ funded IRAD SBIR STTR investment partnership', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — Try before committing?', tags: 'FAQ try pilot free beta test', page: 'FAQ', url: 'faq' },
    { title: 'Contact — Request a Demo', tags: 'contact demo pilot partnership investment IRAD SBIR email Charleston', page: 'Contact', url: 'contact' },
    { title: 'About Us — Mission & Story', tags: 'about mission story ILS Navy NAVSEA Charleston logistics professionals', page: 'About', url: 'about' },
    { title: 'About Us — Technology Stack', tags: 'about technology XRPL SHA-256 Python SDK REST API stack', page: 'About', url: 'about' },
    { title: 'About Us — What Makes Us Different', tags: 'about differentiators public blockchain ILS cost zero data vendor lock-in', page: 'About', url: 'about' },
    { title: 'Investor Portal — Market Opportunity', tags: 'investor market opportunity $400B DoW counterfeit $2-3B', page: 'Investors', url: 'investors' },
    { title: 'Investor Portal — Revenue Model', tags: 'investor revenue SaaS subscription per-anchor fees breakeven', page: 'Investors', url: 'investors' },
    { title: 'Investor Portal — Competitive Landscape', tags: 'investor competitive Guardtime SIMBA Chain Constellation manual audit', page: 'Investors', url: 'investors' },
    { title: 'Investor Portal — $SLS Tokenomics', tags: 'investor tokenomics SLS supply vesting lockup treasury multi-sig', page: 'Investors', url: 'investors' },
    { title: 'Investor Portal — Growth Timeline', tags: 'investor growth timeline Q1 Q2 Q3 2026 2027 MVP pilot revenue', page: 'Investors', url: 'investors' },
    { title: 'Partner Program — Defense Contractors', tags: 'partner defense contractor prime sub-tier CDRL proposal', page: 'Partners', url: 'partners' },
    { title: 'Partner Program — System Integrators', tags: 'partner integrator SDK API logistics platform enterprise', page: 'Partners', url: 'partners' },
    { title: 'Partner Program — Government Agencies', tags: 'partner government agency program office fleet maintenance audit', page: 'Partners', url: 'partners' },
    { title: 'Partner Program — Benefits & Integration', tags: 'partner benefits early access co-marketing volume pricing Python REST', page: 'Partners', url: 'partners' },
];

// Detect base path (home page vs sub-page)
function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/s4-')) return '../';
    return '';
}

function resolveUrl(key) {
    const base = getBasePath();
    const map = {
        'use-cases': base + 's4-use-cases/',
        'pricing': base + 's4-pricing/',
        'pricing-token': base + 's4-pricing/#token',
        'roadmap': base + 's4-roadmap/',
        'faq': base + 's4-faq/',
        'contact': base + 's4-contact/',
        'about': base + 's4-about/',
        'investors': base + 's4-investors/',
        'partners': base + 's4-partners/',
    };
    return map[key] || base;
}

// Inject search overlay HTML
function injectSearchOverlay() {
    if (document.getElementById('searchOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'searchOverlay';
    overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(5,8,16,0.95);backdrop-filter:blur(20px);z-index:2000;padding:20px;';
    overlay.innerHTML = `
        <div style="max-width:600px;margin:80px auto 0;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                <i class="fas fa-search" style="color:var(--accent);font-size:1.3rem;"></i>
                <input type="text" id="searchInput" placeholder="Search S4 Ledger..." oninput="runSearch(this.value)" style="background:rgba(255,255,255,0.08);border:1px solid rgba(0,170,255,0.3);color:#fff;padding:14px 18px;width:100%;border-radius:12px;font-size:1.05rem;font-family:inherit;" autocomplete="off">
                <button onclick="closeSearch()" style="background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;padding:5px 10px;">✕</button>
            </div>
            <div style="text-align:center;color:var(--text-muted);font-size:0.8rem;margin-bottom:15px;"><kbd style="background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:4px;font-size:0.75rem;">⌘K</kbd> to search</div>
            <div id="searchResults"></div>
        </div>`;
    document.body.appendChild(overlay);
}

function openSearch() {
    injectSearchOverlay();
    document.getElementById('searchOverlay').style.display = 'block';
    setTimeout(() => document.getElementById('searchInput').focus(), 100);
    document.body.style.overflow = 'hidden';
}

function closeSearch() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    const results = document.getElementById('searchResults');
    if (results) results.innerHTML = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
});

function runSearch(q) {
    const results = document.getElementById('searchResults');
    if (!q.trim()) {
        results.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:20px;">Type to search across all pages</p>';
        return;
    }
    const terms = q.toLowerCase().split(/\s+/);
    const matches = searchIndex.filter(item => terms.every(t => (item.title + ' ' + item.tags).toLowerCase().includes(t)));
    if (!matches.length) {
        results.innerHTML = '<p style="color:var(--text-muted);text-align:center;margin-top:20px;">No results found</p>';
        return;
    }
    results.innerHTML = matches.map(m =>
        `<a href="${resolveUrl(m.url)}" style="display:block;padding:14px 18px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;margin-bottom:8px;text-decoration:none;color:#fff;transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(0,170,255,0.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)'"><strong>${m.title}</strong><span style="float:right;color:var(--text-muted);font-size:0.8rem;">${m.page}</span></a>`
    ).join('');
}
