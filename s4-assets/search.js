// ═══════════════════════════════════════════════════════════════════════
// S4 LEDGER — SITE-WIDE SEARCH v2
// Comprehensive search across all pages, tools, docs, features, and content
// ═══════════════════════════════════════════════════════════════════════

const searchIndex = [
    // ═══ HOME PAGE ═══
    { title: 'S4 Ledger — Home', tags: 'home main landing defense logistics blockchain XRPL hash anchoring immutable verification tamper-proof', page: 'Home', url: 'home' },
    { title: 'How It Works — Hash → Anchor → Verify', tags: 'how it works SHA-256 hash anchor XRPL verify fingerprint 3 steps process', page: 'Home', url: 'home' },
    { title: '$SLS Token — Secure Logistics Standard', tags: 'SLS token XRPL utility usage credit micro-fee per-anchor governance tokenomics fiat conversion', page: 'Home', url: 'home' },

    // ═══ ABOUT US ═══
    { title: 'About S4 Ledger — Mission & Story', tags: 'about us mission story origin ILS professionals defense logistics Navy NAVSEA Charleston SC South Carolina team who built', page: 'About', url: 'about' },
    { title: 'What Makes Us Different', tags: 'about differentiators unique advantage public blockchain ILS cost zero data vendor lock-in XRP Ledger affordable', page: 'About', url: 'about' },
    { title: 'Technology Stack', tags: 'about technology stack XRPL SHA-256 Python SDK REST API architecture XRP Ledger decentralized', page: 'About', url: 'about' },
    { title: 'Location — Charleston, SC', tags: 'about location Charleston South Carolina SPAWAR NAVWAR Naval Weapons Station NAVSEA NAVAIR', page: 'About', url: 'about' },

    // ═══ USE CASES ═══
    { title: 'Supply Chain Provenance & Counterfeit Prevention', tags: 'supply chain counterfeit DFARS GIDEP IUID UII DLA parts OEM fraud fake suspect prevention provenance traceability', page: 'Use Cases', url: 'use-cases' },
    { title: 'Technical Data Package (TDP) Integrity', tags: 'TDP technical data package drawings ECP engineering change proposal tech manual IETM TDMIS revision configuration', page: 'Use Cases', url: 'use-cases' },
    { title: 'Maintenance Record Verification (3-M / PMCS)', tags: '3-M maintenance SCLSIS PMCS GCSS-Army INSURV gundecking timestamps falsified records preventive corrective', page: 'Use Cases', url: 'use-cases' },
    { title: 'CDRL & Contract Deliverable Tracking', tags: 'CDRL contract data requirements list DD-1423 DI-ILSS DI-SESS DCMA deliverable tracking SOW disputes', page: 'Use Cases', url: 'use-cases' },
    { title: 'Configuration Management & Baseline Verification', tags: 'configuration management baseline CDMD-OA CSA PDREP ECP functional allocated product CM', page: 'Use Cases', url: 'use-cases' },
    { title: 'Audit Readiness & Compliance', tags: 'audit readiness compliance DCMA Inspector General JAGMAN CMMC NIST DFARS prepared evidence', page: 'Use Cases', url: 'use-cases' },
    { title: 'TMDE Calibration Tracking', tags: 'TMDE test measurement diagnostic equipment calibration METCAL MEASURE certificates verification', page: 'Use Cases', url: 'use-cases' },
    { title: 'Training & Certification Verification', tags: 'training certification PQS personnel qualification standard NEC MOS FLTMPS ATRRS personnel', page: 'Use Cases', url: 'use-cases' },
    { title: 'PHS&T & Shelf-Life Tracking', tags: 'PHS&T packaging handling storage transportation shelf-life MIL-STD-2073 hazmat expiration', page: 'Use Cases', url: 'use-cases' },
    { title: 'Disposal & DEMIL Verification', tags: 'disposal DEMIL demilitarization DLA destruction end-of-life material disposition', page: 'Use Cases', url: 'use-cases' },
    { title: 'LSA & Provisioning Data Integrity', tags: 'LSA logistic support analysis LSAR GEIA-STD-0007 provisioning NAVSEA NAVSUP ICAPS PTD spares allowance', page: 'Use Cases', url: 'use-cases' },
    { title: 'Milestone & Decision Gate Verification', tags: 'milestone decision gate DoDI 5000.02 MS A B C IOC FOC acquisition lifecycle review', page: 'Use Cases', url: 'use-cases' },
    { title: 'U.S. Navy Systems', tags: 'Navy 3-M SCLSIS OARS CDMD-OA NTCSS NAVSUP NAVSEA INSURV DDG CVN SSN LCS ship submarine surface', page: 'Use Cases', url: 'use-cases' },
    { title: 'U.S. Army Systems', tags: 'Army GCSS-Army LMP PMCS TACOM property Abrams Bradley Stryker Apache Black Hawk', page: 'Use Cases', url: 'use-cases' },
    { title: 'U.S. Air Force Systems', tags: 'Air Force REMIS D200A PDM AFMC TMDE F-35 F-22 C-130 KC-46 B-21', page: 'Use Cases', url: 'use-cases' },
    { title: 'U.S. Marines Systems', tags: 'Marines GCSS-MC MIMMS expeditionary AAV ACV LAV MAGTF MEU', page: 'Use Cases', url: 'use-cases' },
    { title: 'DLA / DCMA', tags: 'DLA Defense Logistics Agency DCMA Defense Contract Management Agency distribution disposal DEMIL contractor audit oversight', page: 'Use Cases', url: 'use-cases' },
    { title: 'Coast Guard Systems', tags: 'Coast Guard USCG cutter NSC WMSL buoy Maritime Security', page: 'Use Cases', url: 'use-cases' },
    { title: 'Space Force Systems', tags: 'Space Force USSF satellite GPS constellation launch range', page: 'Use Cases', url: 'use-cases' },

    // ═══ PRICING ═══
    { title: 'Pricing — Pilot (Free)', tags: 'pricing free pilot beta test trial evaluation 1000 anchors SDK zero cost proof of concept POC', page: 'Pricing', url: 'pricing' },
    { title: 'Pricing — Standard ($499/mo)', tags: 'pricing standard 499 monthly 4990 annual 25000 anchors REST API CDRL supply chain small contractor', page: 'Pricing', url: 'pricing' },
    { title: 'Pricing — Professional ($1,499/mo)', tags: 'pricing professional 1499 monthly 14990 annual 100000 anchors mid-size contractor installation', page: 'Pricing', url: 'pricing' },
    { title: 'Pricing — Enterprise ($4,999/mo)', tags: 'pricing enterprise 4999 monthly 49990 annual unlimited custom integrations SLA prime contractor NAVSEA DLA', page: 'Pricing', url: 'pricing' },
    { title: 'Pricing — Government (Custom)', tags: 'pricing government site license NIST FedRAMP on-premise custom quote GSA Schedule SEWP', page: 'Pricing', url: 'pricing' },
    { title: '$SLS Token Details', tags: 'SLS token XRPL utility tokenomics governance fiat conversion staking treasury allocation circulating supply', page: 'Pricing', url: 'pricing-token' },

    // ═══ ROADMAP ═══
    { title: 'Phase 1 — Foundation (Complete)', tags: 'roadmap phase 1 foundation SDK hashing XRPL anchoring token website CLI complete done Q4 2025', page: 'Roadmap', url: 'roadmap' },
    { title: 'Phase 2 — Defense Platform (In Progress)', tags: 'roadmap phase 2 defense ILS CDRL pitch IRAD use case library partner DDIA Q1 Q2 2026', page: 'Roadmap', url: 'roadmap' },
    { title: 'Phase 3 — MVP & Pilot', tags: 'roadmap phase 3 MVP pilot NAVSEA SBIR STTR real contract data multi-language SDK Q3 Q4 2026', page: 'Roadmap', url: 'roadmap' },
    { title: 'Phase 4 — Partner Onboarding & SaaS', tags: 'roadmap phase 4 SaaS DIU NavalX partner REST API tiered dashboard webhook Q1 Q2 2027', page: 'Roadmap', url: 'roadmap' },
    { title: 'Phase 5 — Scale & Certification', tags: 'roadmap phase 5 NIST FedRAMP SBIR STTR production deployment NATO ally SHA-3 post-quantum Q3 2027', page: 'Roadmap', url: 'roadmap' },

    // ═══ FAQ ═══
    { title: 'FAQ — Does sensitive data go on blockchain?', tags: 'FAQ classified sensitive SHA-256 hash one-way CUI controlled unclassified no data on-chain zero privacy', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — How does it integrate with DoD systems?', tags: 'FAQ 3-M GCSS DPAS REST API Python SDK integrate integration existing systems ERP OARS', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — What is $SLS?', tags: 'FAQ SLS token utility micro-fee fiat USD usage credit stamps postage not cryptocurrency not security', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — Is it NIST 800-171 / CMMC compliant?', tags: 'FAQ NIST 800-171 CMMC Level 2 CUI FedRAMP compliance DFARS 252.204-7012 cybersecurity', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — Why XRP Ledger?', tags: 'FAQ XRPL XRP Ledger why not Ethereum Bitcoin private blockchain cost speed 3-5 seconds public decentralized', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — How is S4 Ledger funded?', tags: 'FAQ funded funding IRAD SBIR STTR investment partnership bootstrap self-funded', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — Can I try it for free?', tags: 'FAQ try free pilot beta test evaluation proof of concept demo no credit card', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — What is the Audit Vault?', tags: 'FAQ audit vault browser local storage client-side record evidence verify re-verify export search', page: 'FAQ', url: 'faq' },
    { title: 'FAQ — Do I need blockchain expertise?', tags: 'FAQ blockchain expertise technical knowledge no experience needed user-friendly simple one-click', page: 'FAQ', url: 'faq' },

    // ═══ CONTACT ═══
    { title: 'Contact — Request a Demo', tags: 'contact demo pilot partnership investment IRAD SBIR email Charleston sales inquiry talk reach out', page: 'Contact', url: 'contact' },

    // ═══ INVESTORS ═══
    { title: 'Investor Portal — Market Opportunity', tags: 'investor market opportunity $800B DoD budget counterfeit $2-3B addressable market TAM defense logistics', page: 'Investors', url: 'investors' },
    { title: 'Investor Portal — Revenue Model', tags: 'investor revenue SaaS subscription per-anchor fees breakeven ARR recurring MRR growth projections', page: 'Investors', url: 'investors' },
    { title: 'Investor Portal — Competitive Landscape', tags: 'investor competitive Guardtime SIMBA Chain Constellation manual audit SAP Oracle Hyperledger IBM VeChain Palantir Anduril', page: 'Investors', url: 'investors' },
    { title: 'Investor Portal — $SLS Tokenomics', tags: 'investor tokenomics SLS supply vesting lockup treasury multi-sig AMM pool 100M circulation', page: 'Investors', url: 'investors' },
    { title: 'Investor Portal — Growth Timeline', tags: 'investor growth timeline Q1 Q2 Q3 2026 2027 2028 MVP pilot revenue scale certification FedRAMP', page: 'Investors', url: 'investors' },
    { title: 'Investor Portal — Cost Savings Analysis', tags: 'investor cost savings ROI government labor reduction error audit DMSMS compliance 10x 100x return', page: 'Investors', url: 'investors' },

    // ═══ PARTNERS ═══
    { title: 'Partner Program — Defense Contractors', tags: 'partner defense contractor prime sub-tier small business CDRL proposal integration teaming', page: 'Partners', url: 'partners' },
    { title: 'Partner Program — System Integrators', tags: 'partner integrator SDK API logistics platform enterprise middleware ERP data exchange', page: 'Partners', url: 'partners' },
    { title: 'Partner Program — Government Agencies', tags: 'partner government agency program office fleet maintenance audit NAVSEA NAVAIR NAVSUP DLA', page: 'Partners', url: 'partners' },
    { title: 'Partner Program — Benefits & Integration', tags: 'partner benefits early access co-marketing volume pricing Python REST API SDK integration reseller', page: 'Partners', url: 'partners' },

    // ═══ DEMO APP — ILS WORKSPACE (20 Tools) ═══
    { title: 'ILS Workspace — Unified Command Center', tags: 'ILS workspace command center dashboard unified interface all tools 13 tools defense logistics management platform', page: 'Demo App', url: 'demo-app' },
    { title: 'Gap Analysis Engine', tags: 'gap analysis ILS data package completeness DRL data item J-attachment buylist vendor spares transfer book tech manual MIL-STD-1388 deficiency what is missing', page: 'Demo App', url: 'demo-app' },
    { title: 'DMSMS Tracker — Obsolescence Risk', tags: 'DMSMS diminishing manufacturing sources material shortages obsolescence end of life EOL alternate sources redesign risk parts going away discontinued', page: 'Demo App', url: 'demo-app' },
    { title: 'Readiness Calculator — Ao & Ai', tags: 'readiness availability operational Ao inherent Ai MTBF mean time between failures MTTR mean time to repair MLDT mean logistics delay time RAM reliability', page: 'Demo App', url: 'demo-app' },
    { title: 'Parts Cross-Reference — NSN Lookup', tags: 'parts NSN national stock number CAGE commercial government entity cross-reference alternate component lookup part number search interchangeable substitute', page: 'Demo App', url: 'demo-app' },
    { title: 'ROI Calculator — Return on Investment', tags: 'ROI return on investment savings FTE full-time equivalent labor reduction analytics cost benefit analysis break even payback', page: 'Demo App', url: 'demo-app' },
    { title: 'Lifecycle Cost Estimator — Total Ownership', tags: 'lifecycle cost total ownership sustainment acquisition DMSMS mitigation disposal DoD 5000.73 LCC TLCM O&S', page: 'Demo App', url: 'demo-app' },
    { title: 'Warranty & Contract Tracker', tags: 'warranty contract OEM original equipment manufacturer CLIN contract line item expiration renewal 90-day alert reminder', page: 'Demo App', url: 'demo-app' },
    { title: 'Action Items Manager', tags: 'action items task queue severity critical warning normal delegation personnel assignment schedule cost tracking CSV export to-do priority', page: 'Demo App', url: 'demo-app' },
    { title: 'ILS Calendar', tags: 'calendar schedule events milestones deadlines warranty expiry DMSMS review dates appointments .ics export Outlook Google', page: 'Demo App', url: 'demo-app' },
    { title: 'Audit Record Vault', tags: 'audit record vault browser local storage evidence proof hash SHA-256 transaction ID XRPL search filter verify re-verify CSV XLSX export client-side secure', page: 'Demo App', url: 'demo-app' },
    { title: 'Defense Document Library', tags: 'defense document library MIL-STD OPNAVINST DoD directive NAVSEA NAVAIR FAR DFARS NIST framework reference manual regulation standard', page: 'Demo App', url: 'demo-app' },
    { title: 'Compliance Scorecard — CMMC/NIST/DFARS', tags: 'compliance scorecard CMMC Level 2 NIST 800-171 DFARS FAR 46 MIL-STD-1388 DoDI 4245.15 grade A B C D F ring chart recommendations assessment', page: 'Demo App', url: 'demo-app' },
    { title: 'Provisioning & PTD Manager — ICAPS Replacement', tags: 'provisioning PTD provisioning technical documentation ICAPS replacement APL allowance parts list NSN cataloging all-branch Navy Army Air Force Marines DAU MIL-STD-1561', page: 'Demo App', url: 'demo-app' },
    { title: 'AI Supply Chain Risk Engine', tags: 'AI artificial intelligence supply chain risk engine ML machine learning supplier health GIDEP alerts DLA lead times financial distress single-source counterfeit prediction scoring', page: 'Demo App', url: 'demo-app' },
    { title: 'Audit Report Generator', tags: 'audit report generator one-click package full audit supply chain maintenance compliance chain of custody contract deliverables PDF time period configurable multi-format', page: 'Demo App', url: 'demo-app' },
    { title: 'Contract Lifecycle Management', tags: 'contract lifecycle management CDRL tracking modifications Class I II SOW statement of work deliverable status DI number FAR DFARS expiration alert', page: 'Demo App', url: 'demo-app' },
    { title: 'Digital Thread / Config Bridge', tags: 'digital thread configuration bridge engineering change ECP BOM bill of materials revision baseline functional allocated product TDP version MIL-STD-973 IEEE 828 digital twin', page: 'Demo App', url: 'demo-app' },
    { title: 'Predictive Maintenance AI', tags: 'predictive maintenance AI failure prediction MTBF trend analysis failure mode clustering component age fleet-wide confidence scoring cost-if-unplanned MIL-STD-1629 CBM+ condition-based', page: 'Demo App', url: 'demo-app' },
    { title: 'Defense Database Import', tags: 'defense database import GCSS-Army DPAS OMMS-NG DECKPLATE D200A REMIS DSS LMP 24 systems branch data migration', page: 'Demo App', url: 'demo-app' },
    { title: 'ILIE — Integrated Logistics Insights Engine', tags: 'ilie submission review upload cross-reference validate discrepancy analysis ecp cdrl vrs iuid bom upload drag drop sample download', page: 'Demo App', url: 'demo-app' },
    { title: 'AI Conversational Agent', tags: 'AI conversational agent chatbot assistant natural language question answer ILS guidance help report generate', page: 'Demo App', url: 'demo-app' },
    { title: 'Toast Alert System', tags: 'toast alert notification real-time warning warranty expiration DMSMS obsolescence readiness degradation popup banner', page: 'Demo App', url: 'demo-app' },
    { title: 'Hash & Anchor Records', tags: 'hash anchor record SHA-256 XRPL transaction memo fingerprint create record immutable proof stamp timestamp', page: 'Demo App', url: 'demo-app' },
    { title: 'Defense Platforms Database — 500+ Systems', tags: 'platforms database 500 DDG-51 CVN-78 F-35 F-22 Abrams Stryker Apache Black Hawk C-130 Navy Army Air Force Marines Coast Guard Space Force 9 branches weapon system vessel aircraft', page: 'Demo App', url: 'demo-app' },

    // ═══ SDK PLAYGROUND ═══
    { title: 'SDK Playground — Interactive Python SDK', tags: 'SDK playground Python interactive sandbox hash anchor verify batch record test try code live API browser run execute', page: 'SDK', url: 'sdk-playground' },
    { title: 'SDK — Hash Data Function', tags: 'SDK hash_data function SHA-256 hash create fingerprint Python code example', page: 'SDK', url: 'sdk-playground' },
    { title: 'SDK — Anchor Hash Function', tags: 'SDK anchor_hash function XRPL anchor blockchain record memo field transaction Python code', page: 'SDK', url: 'sdk-playground' },
    { title: 'SDK — Verify Hash Function', tags: 'SDK verify_hash function check compare match integrity verification tamper detection Python code', page: 'SDK', url: 'sdk-playground' },
    { title: 'SDK — Batch Anchor Function', tags: 'SDK batch_anchor function multiple records bulk batch parallel anchoring efficiency Python code', page: 'SDK', url: 'sdk-playground' },
    { title: 'SDK — Supply Chain Risk Function', tags: 'SDK analyze_supply_chain_risk function AI ML supplier risk scoring GIDEP DLA counterfeit prediction Python code', page: 'SDK', url: 'sdk-playground' },
    { title: 'SDK — Audit Report Function', tags: 'SDK generate_audit_report function one-click audit package PDF compliance scoring report types Python code', page: 'SDK', url: 'sdk-playground' },
    { title: 'SDK — Contract Lifecycle Function', tags: 'SDK manage_contracts function CDRL tracking modification status deliverables expiration Python code', page: 'SDK', url: 'sdk-playground' },
    { title: 'SDK — Digital Thread Function', tags: 'SDK get_digital_thread function configuration engineering change BOM baseline TDP version tracking Python code', page: 'SDK', url: 'sdk-playground' },
    { title: 'SDK — Predictive Maintenance Function', tags: 'SDK predict_maintenance function AI failure prediction MTBF component age fleet analysis Python code', page: 'SDK', url: 'sdk-playground' },
    { title: 'SDK — REST API Endpoints', tags: 'SDK REST API endpoint POST GET hash anchor verify batch supply-chain-risk audit-reports contracts digital-thread predictive-maintenance JSON curl', page: 'SDK', url: 'sdk-playground' },

    // ═══ LIVE METRICS ═══
    { title: 'Live Metrics Dashboard', tags: 'metrics dashboard charts hashes fees record types XRPL transactions network statistics real-time graphs line bar pie', page: 'Metrics', url: 'metrics' },

    // ═══ TRANSACTION BROWSER ═══
    { title: 'Transaction Browser — XRPL Explorer', tags: 'transactions XRPL explorer browser anchor verify hash ledger search filter paginate CSV export history', page: 'Transactions', url: 'transactions' },

    // ═══ SECURITY ═══
    { title: 'Security Policy', tags: 'security policy vulnerability disclosure responsible reporting threat model architecture review pentesting encryption TLS', page: 'Security', url: 'security' },

    // ═══ MARKETPLACE ═══
    { title: 'S4 Marketplace — Integrations & Plugins', tags: 'marketplace integrations plugins third-party apps tools extensions developer build custom workflow enterprise', page: 'Marketplace', url: 'marketplace' },

    // ═══ TERMS & PRIVACY ═══  
    { title: 'Terms of Service', tags: 'terms of service legal agreement user license acceptable use intellectual property liability', page: 'Terms', url: 'terms' },
    { title: 'Privacy Policy', tags: 'privacy policy data handling collection storage cookies analytics tracking personal information GDPR', page: 'Privacy', url: 'privacy' },

    // ═══ LOGIN ═══
    { title: 'Login / Sign In', tags: 'login sign in account access dashboard portal authentication email password SSO enterprise', page: 'Login', url: 'login' },

    // ═══ TECHNICAL CONCEPTS ═══
    { title: 'SHA-256 Hash — Digital Fingerprint', tags: 'SHA-256 hash digital fingerprint cryptographic one-way function 64 character hex string irreversible tamper detection', page: 'FAQ', url: 'faq' },
    { title: 'XRP Ledger — Public Blockchain', tags: 'XRP Ledger XRPL public blockchain decentralized consensus 3-5 seconds finality 99.99% uptime independent verification', page: 'FAQ', url: 'faq' },
    { title: 'Immutable Audit Trail', tags: 'immutable audit trail tamper-proof permanent record cannot be changed edited deleted blockchain proof verification integrity', page: 'FAQ', url: 'faq' },
    { title: 'Zero Data On-Chain', tags: 'zero data on-chain privacy hash-only architecture no sensitive data no PII no classified CUI safe CMMC compliant', page: 'FAQ', url: 'faq' },

    // ═══ COMPETITIVE / COMPARISON ═══
    { title: 'S4 Ledger vs SAP', tags: 'comparison competitive SAP S/4HANA ERP expensive 500K 5M months implementation enterprise heavy', page: 'Investors', url: 'investors' },
    { title: 'S4 Ledger vs Oracle', tags: 'comparison competitive Oracle NetSuite ERP expensive 200K 1M commercial retail adapted not defense native', page: 'Investors', url: 'investors' },
    { title: 'S4 Ledger vs Palantir', tags: 'comparison competitive Palantir data analytics intelligence expensive complex government defense platform', page: 'Investors', url: 'investors' },
    { title: 'S4 Ledger vs Anduril', tags: 'comparison competitive Anduril autonomous systems hardware drones not ILS not logistics management', page: 'Investors', url: 'investors' },
    { title: 'S4 Ledger vs Spreadsheets', tags: 'comparison competitive spreadsheets Excel SharePoint manual labor-intensive error-prone no audit trail no automation unscalable', page: 'About', url: 'about' },
    { title: 'S4 Ledger vs IBM Hyperledger', tags: 'comparison competitive IBM Hyperledger private blockchain expensive 500K infrastructure no defense focus complex setup', page: 'Investors', url: 'investors' },

    // ═══ COST SAVINGS / ROI ═══
    { title: 'Cost Savings — $1.02M–$2.6M per program', tags: 'cost savings per program 1.02M 2.6M annual labor reduction error audit compliance DMSMS ROI return 15x 100x', page: 'Investors', url: 'investors' },
    { title: 'Government ROI — 10–100x Return', tags: 'government ROI return on investment 10x 100x appropriations committee savings justified defensible math economics', page: 'Investors', url: 'investors' },
    { title: 'Pricing vs Competitors', tags: '0.01 per anchor 0.001 cost per record vs 25 150 manual vs 500K SAP 1500x cheaper affordable low-cost', page: 'Pricing', url: 'pricing' },

    // ═══ COMPLIANCE & STANDARDS ═══
    { title: 'CMMC Level 2 Compliance', tags: 'CMMC Cybersecurity Maturity Model Certification Level 2 assessment certification requirement contractor defense', page: 'Use Cases', url: 'use-cases' },
    { title: 'NIST SP 800-171', tags: 'NIST National Institute Standards Technology SP 800-171 CUI controlled unclassified information security controls', page: 'Use Cases', url: 'use-cases' },
    { title: 'DFARS 252.204-7012', tags: 'DFARS Defense Federal Acquisition Regulation Supplement 252.204-7012 safeguarding covered defense information cyber incident', page: 'Use Cases', url: 'use-cases' },
    { title: 'FedRAMP — Federal Cloud Security', tags: 'FedRAMP Federal Risk Authorization Management Program government cloud security certification IL2 IL4 IL5 ATO', page: 'Roadmap', url: 'roadmap' },
    { title: 'MIL-STD-1388 — ILS Elements', tags: 'MIL-STD-1388 ILS elements logistic support analysis LSA 12 elements defense standard requirements', page: 'Use Cases', url: 'use-cases' },

    // ═══ FUNDING & GRANTS ═══
    { title: 'SBIR/STTR Opportunity', tags: 'SBIR Small Business Innovation Research STTR Small Business Technology Transfer Phase I II III grant funding non-dilutive federal Navy Air Force DIU', page: 'Investors', url: 'investors' },
    { title: 'SBIR Phase I — Feasibility ($50K–$250K)', tags: 'SBIR Phase I feasibility proof concept 50K 250K grant award prototype completed already done', page: 'Investors', url: 'investors' },
    { title: 'SBIR Phase II — Development ($500K–$1.5M)', tags: 'SBIR Phase II development production build scale 500K 1.5M grant funding', page: 'Investors', url: 'investors' },
    { title: 'Defense Accelerators — AFWERX, NavalX, DIU', tags: 'AFWERX NavalX DIU Defense Innovation Unit accelerator defense innovation program application commercial technology bridge', page: 'Roadmap', url: 'roadmap' },
];

// Detect base path
function getBasePath() {
    var path = window.location.pathname;
    // If on a sub-page (s4-xxx/, demo-app/, sdk-playground/, security/, etc.), go up one level
    if (path.match(/\/(s4-|demo-app|sdk-playground|security|partners|about|contact|products|roadmap)/)) return '../';
    return '';
}

function resolveUrl(key) {
    var base = getBasePath();
    var map = {
        'home': base || './',
        'use-cases': base + 's4-use-cases/',
        'pricing': base + 's4-pricing/',
        'pricing-token': base + 's4-pricing/#token',
        'roadmap': base + 's4-roadmap/',
        'faq': base + 's4-faq/',
        'contact': base + 's4-contact/',
        'about': base + 's4-about/',
        'investors': base + 's4-investors/',
        'partners': base + 's4-partners/',
        'marketplace': base + 's4-marketplace/',
        'demo-app': base + 'demo-app/',
        'sdk-playground': base + 'sdk-playground/',
        'metrics': base + 'metrics.html',
        'transactions': base + 'transactions.html',
        'security': base + 'security/',
        'terms': base + 's4-terms/',
        'privacy': base + 's4-privacy/',
        'login': base + 's4-login/',
    };
    return map[key] || base;
}

// Inject search overlay HTML
function injectSearchOverlay() {
    if (document.getElementById('searchOverlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'searchOverlay';
    overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(5,8,16,0.96);backdrop-filter:blur(24px);z-index:2000;padding:20px;overflow-y:auto;';
    overlay.innerHTML = '<div style="max-width:640px;margin:60px auto 40px;">'
        + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">'
        + '<i class="fas fa-search" style="color:var(--accent,#00aaff);font-size:1.3rem;"></i>'
        + '<input type="text" id="searchInput" placeholder="Search everything on S4 Ledger..." oninput="runSearch(this.value)" style="background:rgba(255,255,255,0.07);border:1px solid rgba(0,170,255,0.3);color:#fff;padding:14px 18px;width:100%;border-radius:12px;font-size:1.05rem;font-family:inherit;outline:none;" autocomplete="off">'
        + '<button onclick="closeSearch()" style="background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;padding:5px 10px;" aria-label="Close search">&#x2715;</button>'
        + '</div>'
        + '<div style="text-align:center;color:rgba(255,255,255,0.4);font-size:0.78rem;margin-bottom:18px;"><kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;font-size:0.72rem;">&#x2318;K</kbd> to search &nbsp;|&nbsp; <kbd style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;font-size:0.72rem;">Esc</kbd> to close</div>'
        + '<div id="searchResults"></div>'
        + '</div>';
    document.body.appendChild(overlay);
    // Close on click outside
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeSearch(); });
}

function openSearch() {
    injectSearchOverlay();
    document.getElementById('searchOverlay').style.display = 'block';
    setTimeout(function(){ document.getElementById('searchInput').focus(); }, 80);
    document.body.style.overflow = 'hidden';
}

function closeSearch() {
    var overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
    var input = document.getElementById('searchInput');
    if (input) input.value = '';
    var results = document.getElementById('searchResults');
    if (results) results.innerHTML = '';
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeSearch();
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
});

function runSearch(q) {
    var results = document.getElementById('searchResults');
    if (!q.trim()) {
        results.innerHTML = '<p style="color:rgba(255,255,255,0.35);text-align:center;margin-top:30px;font-size:0.95rem;">Search across all pages, tools, features, and topics</p>';
        return;
    }
    var terms = q.toLowerCase().split(/\s+/);
    // Score matches to rank results
    var scored = [];
    searchIndex.forEach(function(item) {
        var text = (item.title + ' ' + item.tags).toLowerCase();
        var allMatch = terms.every(function(t){ return text.includes(t); });
        if (!allMatch) return;
        // Score: title matches worth more
        var score = 0;
        terms.forEach(function(t) {
            if (item.title.toLowerCase().includes(t)) score += 3;
            if (item.tags.toLowerCase().includes(t)) score += 1;
        });
        scored.push({ item: item, score: score });
    });
    // Sort by score descending
    scored.sort(function(a, b) { return b.score - a.score; });

    if (!scored.length) {
        results.innerHTML = '<p style="color:rgba(255,255,255,0.35);text-align:center;margin-top:30px;">No results found for &ldquo;' + q.replace(/</g,'&lt;') + '&rdquo;</p>';
        return;
    }
    var pageColors = {
        'Home': '#00aaff', 'About': '#00aaff', 'Use Cases': '#14f195', 'Pricing': '#c9a84c',
        'Roadmap': '#9b59b6', 'FAQ': '#00e5ff', 'Contact': '#c9a84c', 'Investors': '#14f195',
        'Partners': '#00aaff', 'Demo App': '#00aaff', 'SDK': '#c9a84c', 'Metrics': '#14f195',
        'Transactions': '#00e5ff', 'Security': '#9b59b6', 'Marketplace': '#c9a84c',
        'Terms': '#666', 'Privacy': '#666', 'Login': '#00aaff'
    };
    results.innerHTML = scored.slice(0, 20).map(function(s) {
        var m = s.item;
        var dotColor = pageColors[m.page] || '#00aaff';
        return '<a href="' + resolveUrl(m.url) + '" style="display:block;padding:14px 18px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:8px;text-decoration:none;color:#fff;transition:all 0.2s;" onmouseover="this.style.borderColor=\'rgba(0,170,255,0.4)\';this.style.background=\'rgba(255,255,255,0.07)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.08)\';this.style.background=\'rgba(255,255,255,0.04)\'">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;">'
            + '<strong style="font-size:0.95rem;">' + m.title + '</strong>'
            + '<span style="color:' + dotColor + ';font-size:0.75rem;white-space:nowrap;margin-left:12px;opacity:0.8;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + dotColor + ';margin-right:5px;vertical-align:middle;"></span>' + m.page + '</span>'
            + '</div></a>';
    }).join('');
}
