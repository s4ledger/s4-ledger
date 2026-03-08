// S4 Ledger — Interactive Platform Walkthrough
// Split-screen guided tour with narrator + realistic tool mockups
// Manual advance — each step completes, then user clicks Next

(function() {
'use strict';

// ═══ Walkthrough Step Definitions ═══
var _steps = [
    {
        id: 'welcome', title: 'Welcome to S4 Ledger', icon: 'fas fa-shield-halved', cat: 'Overview',
        narr: 'Welcome to S4 Ledger \u2014 the integrity layer for defense logistics. This walkthrough demonstrates how the platform helps you track parts, verify records, and prove compliance under audit. Each step uses realistic defense data to show you exactly how the tools work.',
        mock: function() {
            return '<div class="wt-mock-welcome">'
                + '<div class="wt-mock-logo"><i class="fas fa-shield-halved" style="font-size:3rem;color:var(--accent);"></i></div>'
                + '<h2 style="color:#1d1d1f;font-size:1.4rem;font-weight:700;margin:16px 0 8px;">S4 Ledger Platform</h2>'
                + '<p style="color:var(--steel);font-size:0.9rem;margin-bottom:24px;">The integrity layer for defense logistics</p>'
                + '<div class="wt-stat-grid">'
                + '<div class="wt-stat"><span class="wt-stat-num" data-animate="20">0</span><span class="wt-stat-label">ILS Tools</span></div>'
                + '<div class="wt-stat"><span class="wt-stat-num" data-animate="500">0</span><span class="wt-stat-label">Defense Platforms</span></div>'
                + '<div class="wt-stat"><span class="wt-stat-num" data-animate="64">0</span><span class="wt-stat-label">Record Types</span></div>'
                + '<div class="wt-stat"><span class="wt-stat-num" data-animate="3">0</span><span class="wt-stat-label">Sec. to Anchor</span></div>'
                + '</div></div>';
        }
    },
    {
        id: 'anchor', title: 'Anchor a Record', icon: 'fas fa-anchor', cat: 'Core',
        narr: 'Every logistics record starts here. You enter or paste your supply chain data \u2014 a receipt, a custody transfer, a maintenance log \u2014 and the platform creates a unique digital fingerprint. That fingerprint is then permanently recorded on a secure verification ledger in under three seconds. Once anchored, the record cannot be altered without detection.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-anchor"></i> Anchor Record</div>'
                + '<div class="wt-mock-field"><label>Record Type</label><div class="wt-mock-select">Supply Chain Receipt</div></div>'
                + '<div class="wt-mock-field"><label>Record Data</label>'
                + '<div class="wt-mock-textarea" id="wtTypeTarget"></div></div>'
                + '<div class="wt-mock-field"><label>Classification</label><div class="wt-mock-select">UNCLASSIFIED // FOUO</div></div>'
                + '<button class="wt-mock-btn wt-mock-btn-primary" id="wtAnchorBtn" style="opacity:0.5;pointer-events:none;">Anchor Record <i class="fas fa-arrow-right"></i></button>'
                + '</div>';
        },
        onEnter: function(done) {
            var target = document.getElementById('wtTypeTarget');
            if (target) _mockTypeWriter(target, 'Supply Chain Receipt: NSN 5340-01-587-2963, Qty 200, MIL-STD-1388-2B compliant, received from DLA Philadelphia for USS Arleigh Burke (DDG-51). Inspector: J. Martinez, Lot #AAE-2026-0847.', 28, function() {
                var btn = document.getElementById('wtAnchorBtn');
                if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; btn.classList.add('wt-pulse'); }
            });
            done();
        }
    },
    {
        id: 'confirmation', title: 'Record Confirmed', icon: 'fas fa-check-circle', cat: 'Core',
        narr: 'In under three seconds, the record is permanently anchored. You receive a unique transaction hash, a timestamp, and the digital fingerprint of your record. This serves as your permanent proof that the record existed in its exact form at that moment. You can share this verification link with auditors, inspectors, or anyone who needs proof.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head" style="color:var(--green);"><i class="fas fa-check-circle"></i> Record Anchored</div>'
                + '<div class="wt-mock-result">'
                + '<div class="wt-mock-result-row"><span class="wt-mock-label">Status</span><span class="wt-mock-badge-green">CONFIRMED</span></div>'
                + '<div class="wt-mock-result-row"><span class="wt-mock-label">TX Hash</span><span class="wt-mock-hash">8A3F..B7E2</span></div>'
                + '<div class="wt-mock-result-row"><span class="wt-mock-label">Ledger Seq</span><span style="color:var(--accent);">#84,291,037</span></div>'
                + '<div class="wt-mock-result-row"><span class="wt-mock-label">Elapsed</span><span>2.4 seconds</span></div>'
                + '<div class="wt-mock-result-row"><span class="wt-mock-label">Credits Used</span><span>1 SLS</span></div>'
                + '<div class="wt-mock-result-row"><span class="wt-mock-label">SHA-256</span><span class="wt-mock-hash" id="wtHashReveal"></span></div>'
                + '</div>'
                + '<a class="wt-mock-link" href="javascript:void(0)"><i class="fas fa-external-link-alt"></i> View Verification Proof</a>'
                + '</div>';
        },
        onEnter: function(done) {
            var el = document.getElementById('wtHashReveal');
            if (el) _mockTypeWriter(el, 'e3b0c44298fc1c149afb...b855b4e04f1dceef71e23f0c208', 18);
            done();
        }
    },
    {
        id: 'verify', title: 'Verify a Record', icon: 'fas fa-check-double', cat: 'Core',
        narr: 'Verification works in the other direction. Paste the original record data along with the transaction reference and the platform recomputes the digital fingerprint. If it matches the fingerprint stored on the verification ledger, you have proof that the record has not been altered \u2014 not by a single character.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-check-double"></i> Verify Record</div>'
                + '<div class="wt-mock-field"><label>Original Record</label><div class="wt-mock-textarea" style="font-size:0.72rem;color:var(--steel);padding:8px;">Supply Chain Receipt: NSN 5340-01-587-2963, Qty 200, MIL-STD-1388-2B compliant...</div></div>'
                + '<div class="wt-mock-field"><label>Transaction ID</label><div class="wt-mock-select" style="font-family:monospace;font-size:0.72rem;">8A3F4D9E...B7E22C01</div></div>'
                + '<div class="wt-mock-verify-result" id="wtVerifyResult" style="opacity:0;">'
                + '<div style="text-align:center;padding:20px;">'
                + '<i class="fas fa-check-circle" style="font-size:2.5rem;color:var(--green);margin-bottom:8px;display:block;"></i>'
                + '<div style="color:var(--green);font-size:1.1rem;font-weight:700;">VERIFIED \u2014 MATCH</div>'
                + '<div style="color:var(--steel);font-size:0.78rem;margin-top:4px;">Record integrity confirmed. No modifications detected.</div>'
                + '</div></div></div>';
        },
        onEnter: function(done) {
            setTimeout(function() {
                var el = document.getElementById('wtVerifyResult');
                if (el) { el.style.opacity = '1'; el.style.transition = 'opacity 0.6s ease'; }
                done();
            }, 2000);
            return true;
        }
    },
    {
        id: 'tx-log', title: 'Transaction Log', icon: 'fas fa-list', cat: 'Core',
        narr: 'Every anchored record appears in your transaction log with a timestamp, record type, digital fingerprint, and verification link. You can export the full log as a spreadsheet for audit preparation or share individual records with stakeholders.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-list"></i> Transaction Log</div>'
                + '<table class="wt-mock-table"><thead><tr><th>Time</th><th>Type</th><th>Hash</th><th>Status</th></tr></thead><tbody>'
                + '<tr><td>14:32:07</td><td>Supply Chain Receipt</td><td class="wt-mock-hash">8A3F..B7E2</td><td><span class="wt-mock-badge-green">Confirmed</span></td></tr>'
                + '<tr><td>14:28:41</td><td>Custody Transfer</td><td class="wt-mock-hash">C1D4..9F3A</td><td><span class="wt-mock-badge-green">Confirmed</span></td></tr>'
                + '<tr><td>14:15:22</td><td>Maintenance Record</td><td class="wt-mock-hash">7B2E..A4C8</td><td><span class="wt-mock-badge-green">Confirmed</span></td></tr>'
                + '<tr><td>13:58:09</td><td>CDRL Submission</td><td class="wt-mock-hash">D9F1..6E5B</td><td><span class="wt-mock-badge-green">Confirmed</span></td></tr>'
                + '</tbody></table>'
                + '<button class="wt-mock-btn" style="margin-top:8px;"><i class="fas fa-download"></i> Export CSV</button></div>';
        }
    },
    {
        id: 'gap-analysis', title: 'Gap Analysis', icon: 'fas fa-search-plus', cat: 'Analysis',
        narr: 'Upload your program documents \u2014 DRL spreadsheets, technical manual indexes, or PDF packages. The Gap Analysis tool scans them against the applicable requirements, scores your overall coverage, and identifies exactly what is missing and what to address first.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-search-plus"></i> Gap Analysis \u2014 DDG-51 Program</div>'
                + '<div class="wt-mock-score-panel">'
                + '<div class="wt-mock-score-circle" id="wtGapScore"><span>0%</span></div>'
                + '<div style="margin-left:16px;"><div style="color:#1d1d1f;font-weight:700;font-size:0.95rem;">Program Coverage</div><div style="color:var(--steel);font-size:0.78rem;">42 of 54 required deliverables found</div></div>'
                + '</div>'
                + '<div class="wt-mock-gap-list">'
                + '<div class="wt-mock-gap critical"><span class="wt-mock-gap-sev">CRITICAL</span> Missing: DI-ILSS-81495 \u2014 Provisioning Technical Documentation</div>'
                + '<div class="wt-mock-gap critical"><span class="wt-mock-gap-sev">CRITICAL</span> Missing: DI-SESS-81514 \u2014 Failure Mode Analysis Report</div>'
                + '<div class="wt-mock-gap warning"><span class="wt-mock-gap-sev">WARNING</span> Incomplete: DI-ILSS-81497 \u2014 Repair Parts List (68% complete)</div>'
                + '<div class="wt-mock-gap info"><span class="wt-mock-gap-sev">INFO</span> Version mismatch: Tech Manual Index rev C vs. Contract rev D</div>'
                + '</div></div>';
        },
        onEnter: function(done) {
            _animateNumber(document.querySelector('#wtGapScore span'), 0, 78, 1500, '%');
            setTimeout(function() { done(); }, 1600);
            return true;
        }
    },
    {
        id: 'dmsms', title: 'DMSMS Tracker', icon: 'fas fa-microchip', cat: 'Analysis',
        narr: 'Enter a part number to check its obsolescence status instantly. The DMSMS Tracker flags parts that are discontinued, at risk, or have known alternatives \u2014 replacing days of manual GIDEP research with a two-second lookup.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-microchip"></i> DMSMS Tracker \u2014 Obsolescence Check</div>'
                + '<div class="wt-mock-field"><label>NSN / Part Number</label><div class="wt-mock-select" style="font-family:monospace;">5340-01-587-2963</div></div>'
                + '<table class="wt-mock-table"><thead><tr><th>Part</th><th>Status</th><th>Alternative</th><th>Lead Time</th></tr></thead><tbody>'
                + '<tr><td>5340-01-587-2963</td><td><span class="wt-mock-badge-green">Active</span></td><td>\u2014</td><td>45 days</td></tr>'
                + '<tr><td>5961-01-234-8901</td><td><span class="wt-mock-badge-red">Obsolete</span></td><td>5961-01-678-4321</td><td>120 days</td></tr>'
                + '<tr><td>6625-01-456-7890</td><td><span class="wt-mock-badge-yellow">At Risk</span></td><td>6625-01-890-1234</td><td>90 days</td></tr>'
                + '<tr><td>5895-01-345-6789</td><td><span class="wt-mock-badge-green">Active</span></td><td>\u2014</td><td>30 days</td></tr>'
                + '</tbody></table></div>';
        }
    },
    {
        id: 'readiness', title: 'Readiness Calculator', icon: 'fas fa-calculator', cat: 'Analysis',
        narr: 'Input your equipment reliability parameters \u2014 mean time between failures, mean time to repair, and administrative delay \u2014 to calculate operational availability using standard Department of Defense formulas. Results are instant and ready for briefings.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-calculator"></i> Readiness Calculator \u2014 F-35C Lightning II</div>'
                + '<div class="wt-mock-inputs">'
                + '<div class="wt-mock-input-row"><span>MTBF (hrs)</span><span class="wt-mock-input-val">340</span></div>'
                + '<div class="wt-mock-input-row"><span>MTTR (hrs)</span><span class="wt-mock-input-val">4.2</span></div>'
                + '<div class="wt-mock-input-row"><span>Admin Delay (hrs)</span><span class="wt-mock-input-val">1.8</span></div>'
                + '</div>'
                + '<div class="wt-mock-result-big">'
                + '<div class="wt-mock-result-label">Operational Availability (Ao)</div>'
                + '<div class="wt-mock-result-value" id="wtAoResult">\u2014</div>'
                + '<div style="color:var(--steel);font-size:0.75rem;margin-top:4px;">Ao = MTBF / (MTBF + MTTR + ADT) = 340 / (340 + 4.2 + 1.8)</div>'
                + '</div></div>';
        },
        onEnter: function(done) {
            setTimeout(function() {
                var el = document.getElementById('wtAoResult');
                if (el) { el.textContent = '0.983'; el.style.color = 'var(--green)'; el.classList.add('wt-fade-in'); }
                done();
            }, 1500);
            return true;
        }
    },
    {
        id: 'compliance', title: 'Compliance Scorecard', icon: 'fas fa-clipboard-check', cat: 'Compliance',
        narr: 'See your compliance posture at a glance. The Compliance Scorecard evaluates your program against CMMC Level 2, NIST 800-171, DFARS 252.204-7012, and other applicable frameworks \u2014 generating executive-ready letter grades with specific remediation guidance.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-clipboard-check"></i> Compliance Scorecard \u2014 DDG-51 FY26</div>'
                + '<div class="wt-mock-compliance-grid">'
                + '<div class="wt-mock-comp-card"><div class="wt-mock-comp-grade grade-a">A-</div><div class="wt-mock-comp-name">CMMC Level 2</div><div class="wt-mock-comp-pct">91%</div></div>'
                + '<div class="wt-mock-comp-card"><div class="wt-mock-comp-grade grade-b">B+</div><div class="wt-mock-comp-name">NIST 800-171</div><div class="wt-mock-comp-pct">87%</div></div>'
                + '<div class="wt-mock-comp-card"><div class="wt-mock-comp-grade grade-a">A</div><div class="wt-mock-comp-name">DFARS</div><div class="wt-mock-comp-pct">94%</div></div>'
                + '<div class="wt-mock-comp-card"><div class="wt-mock-comp-grade grade-b">B</div><div class="wt-mock-comp-name">ITAR/EAR</div><div class="wt-mock-comp-pct">83%</div></div>'
                + '</div>'
                + '<div style="color:var(--steel);font-size:0.78rem;margin-top:12px;"><i class="fas fa-info-circle" style="color:var(--accent);margin-right:4px;"></i>2 controls require remediation before next DCMA audit (est. April 2026)</div>'
                + '</div>';
        }
    },
    {
        id: 'supply-chain', title: 'Supply Chain Risk', icon: 'fas fa-exclamation-triangle', cat: 'Supply Chain',
        narr: 'Identify supply chain vulnerabilities before they become mission-critical failures. The risk engine flags single-source suppliers, geographic concentration, extended lead times, and obsolescence overlap across your entire program.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-exclamation-triangle"></i> Supply Chain Risk \u2014 V-22 Osprey Program</div>'
                + '<div class="wt-mock-risk-summary">'
                + '<div class="wt-mock-risk-item high"><span class="wt-mock-risk-count">3</span><span>Critical Risk</span></div>'
                + '<div class="wt-mock-risk-item med"><span class="wt-mock-risk-count">7</span><span>Moderate Risk</span></div>'
                + '<div class="wt-mock-risk-item low"><span class="wt-mock-risk-count">14</span><span>Low Risk</span></div>'
                + '</div>'
                + '<table class="wt-mock-table"><thead><tr><th>Supplier</th><th>Parts</th><th>Risk</th><th>Issue</th></tr></thead><tbody>'
                + '<tr><td>Kaman Aerospace</td><td>12</td><td><span class="wt-mock-badge-red">Critical</span></td><td>Single source, 180-day lead</td></tr>'
                + '<tr><td>Moog Inc.</td><td>8</td><td><span class="wt-mock-badge-yellow">Moderate</span></td><td>Disaster zone proximity</td></tr>'
                + '<tr><td>Curtiss-Wright</td><td>15</td><td><span class="wt-mock-badge-green">Low</span></td><td>\u2014</td></tr>'
                + '</tbody></table></div>';
        }
    },
    {
        id: 'actions', title: 'Action Items', icon: 'fas fa-tasks', cat: 'Operations',
        narr: 'Every analysis generates prioritized action items sorted by urgency \u2014 critical, warning, and informational. Each item includes a cost estimate and a recommended resolution so your team knows exactly what to do next.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-tasks"></i> Action Items \u2014 6 Open</div>'
                + '<div class="wt-mock-action critical"><div class="wt-mock-action-head"><span class="wt-mock-badge-red">CRITICAL</span> Resolve DMSMS obsolescence for NSN 5961-01-234-8901</div><div class="wt-mock-action-meta">Est. cost: $45,000 | Due: 30 days | Owner: Engineering</div></div>'
                + '<div class="wt-mock-action critical"><div class="wt-mock-action-head"><span class="wt-mock-badge-red">CRITICAL</span> Submit missing DI-ILSS-81495 to DCMA</div><div class="wt-mock-action-meta">Est. cost: $12,000 | Due: 14 days | Owner: ILS Lead</div></div>'
                + '<div class="wt-mock-action warning"><div class="wt-mock-action-head"><span class="wt-mock-badge-yellow">WARNING</span> Update tech manual index to rev D</div><div class="wt-mock-action-meta">Est. cost: $3,200 | Due: 45 days | Owner: Tech Pubs</div></div>'
                + '<div class="wt-mock-action info"><div class="wt-mock-action-head"><span class="wt-mock-badge-blue">INFO</span> Schedule quarterly compliance review</div><div class="wt-mock-action-meta">Est. cost: $0 | Due: 60 days | Owner: PM</div></div>'
                + '</div>';
        }
    },
    {
        id: 'predictive', title: 'Predictive Maintenance', icon: 'fas fa-chart-line', cat: 'Analysis',
        narr: 'Analyze failure patterns to predict when equipment will need maintenance before it fails. The predictive engine calculates remaining useful life and recommends optimal maintenance windows to prevent unplanned downtime.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-chart-line"></i> Predictive Maintenance \u2014 LCS-9 Main Engine</div>'
                + '<div class="wt-mock-pred-card">'
                + '<div class="wt-mock-pred-row"><span>Component</span><span style="color:#1d1d1f;">LM2500 Gas Turbine Engine</span></div>'
                + '<div class="wt-mock-pred-row"><span>Current Hours</span><span style="color:#1d1d1f;">12,847 hrs</span></div>'
                + '<div class="wt-mock-pred-row"><span>Est. RUL</span><span style="color:var(--gold);">2,153 hrs (\u00b1340)</span></div>'
                + '<div class="wt-mock-pred-row"><span>Confidence</span><span style="color:var(--green);">92%</span></div>'
                + '<div class="wt-mock-pred-row"><span>Recommended Action</span><span style="color:var(--accent);">Schedule overhaul by Aug 2026</span></div>'
                + '</div>'
                + '<div class="wt-mock-bar-chart">'
                + '<div class="wt-mock-bar-label">Remaining Useful Life</div>'
                + '<div class="wt-mock-bar-track"><div class="wt-mock-bar-fill" id="wtRulBar" style="width:0%;"></div></div>'
                + '<div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--steel);"><span>0 hrs</span><span>15,000 hrs</span></div>'
                + '</div></div>';
        },
        onEnter: function(done) {
            setTimeout(function() {
                var bar = document.getElementById('wtRulBar');
                if (bar) { bar.style.transition = 'width 1.5s ease'; bar.style.width = '85.6%'; }
                done();
            }, 500);
            return true;
        }
    },
    {
        id: 'lifecycle', title: 'Lifecycle Cost', icon: 'fas fa-dollar-sign', cat: 'Analysis',
        narr: 'Estimate the total cost of owning and maintaining a system over its entire service life \u2014 from acquisition through sustainment and disposal. The tool breaks down costs by phase and identifies the largest cost drivers.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-dollar-sign"></i> Lifecycle Cost \u2014 CVN-78 Gerald R. Ford</div>'
                + '<div class="wt-mock-cost-breakdown">'
                + '<div class="wt-mock-cost-row"><span>Acquisition</span><div class="wt-mock-cost-bar" style="width:30%;background:var(--accent);"></div><span>$13.3B</span></div>'
                + '<div class="wt-mock-cost-row"><span>Sustainment</span><div class="wt-mock-cost-bar" style="width:55%;background:var(--gold);"></div><span>$24.1B</span></div>'
                + '<div class="wt-mock-cost-row"><span>Personnel</span><div class="wt-mock-cost-bar" style="width:45%;background:var(--green);"></div><span>$19.8B</span></div>'
                + '<div class="wt-mock-cost-row"><span>Disposal</span><div class="wt-mock-cost-bar" style="width:8%;background:var(--red);"></div><span>$3.5B</span></div>'
                + '</div>'
                + '<div class="wt-mock-cost-total">Total Lifecycle Cost: <strong style="color:var(--accent);">$60.7B</strong> over 50-year service life</div>'
                + '</div>';
        }
    },
    {
        id: 'roi', title: 'ROI Calculator', icon: 'fas fa-chart-pie', cat: 'Analysis',
        narr: 'Calculate exactly how much time and money S4 Ledger saves your organization. Enter your current headcount and the hours your team spends on manual processes. The calculator produces briefing-ready return-on-investment figures for leadership.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-chart-pie"></i> ROI Calculator</div>'
                + '<div class="wt-mock-roi-grid">'
                + '<div class="wt-mock-roi-card"><div class="wt-mock-roi-label">Annual Savings</div><div class="wt-mock-roi-val green" id="wtRoiSave">$0</div></div>'
                + '<div class="wt-mock-roi-card"><div class="wt-mock-roi-label">S4 Ledger Cost</div><div class="wt-mock-roi-val">$24,000/yr</div></div>'
                + '<div class="wt-mock-roi-card"><div class="wt-mock-roi-label">ROI</div><div class="wt-mock-roi-val blue" id="wtRoiPct">0x</div></div>'
                + '<div class="wt-mock-roi-card"><div class="wt-mock-roi-label">Payback Period</div><div class="wt-mock-roi-val">9 days</div></div>'
                + '</div>'
                + '<div style="color:var(--steel);font-size:0.78rem;margin-top:10px;text-align:center;">Based on 8 ILS analysts spending 40% of time on manual tracking (GS-12 equivalent)</div>'
                + '</div>';
        },
        onEnter: function(done) {
            var el = document.getElementById('wtRoiSave');
            var el2 = document.getElementById('wtRoiPct');
            if (el) { setTimeout(function() { el.textContent = '$1.02M'; el.classList.add('wt-fade-in'); }, 800); }
            if (el2) { setTimeout(function() { el2.textContent = '42x'; el2.classList.add('wt-fade-in'); done(); }, 1200); }
            else { setTimeout(done, 1300); }
            return true;
        }
    },
    {
        id: 'vault', title: 'Audit Vault', icon: 'fas fa-vault', cat: 'Compliance',
        narr: 'Every record you anchor is automatically stored in the Audit Vault along with its verification proof. When an auditor requests documentation, you export it in one click \u2014 no searching through email chains or shared drives.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-vault"></i> Audit Vault \u2014 47 Records</div>'
                + '<table class="wt-mock-table"><thead><tr><th>Date</th><th>Record</th><th>Type</th><th>Proof</th></tr></thead><tbody>'
                + '<tr><td>Mar 5, 2026</td><td>Supply Chain Receipt \u2014 DDG-51</td><td>Supply Chain</td><td><a class="wt-mock-link-inline" href="javascript:void(0)"><i class="fas fa-external-link-alt"></i></a></td></tr>'
                + '<tr><td>Mar 4, 2026</td><td>Custody Transfer \u2014 Lot AAE-2026-0841</td><td>Custody</td><td><a class="wt-mock-link-inline" href="javascript:void(0)"><i class="fas fa-external-link-alt"></i></a></td></tr>'
                + '<tr><td>Mar 3, 2026</td><td>FMEA Report \u2014 F-35C Avionics</td><td>Maintenance</td><td><a class="wt-mock-link-inline" href="javascript:void(0)"><i class="fas fa-external-link-alt"></i></a></td></tr>'
                + '<tr><td>Mar 2, 2026</td><td>CDRL Acceptance \u2014 DI-ILSS-81495</td><td>CDRL</td><td><a class="wt-mock-link-inline" href="javascript:void(0)"><i class="fas fa-external-link-alt"></i></a></td></tr>'
                + '</tbody></table>'
                + '<button class="wt-mock-btn" style="margin-top:8px;"><i class="fas fa-file-export"></i> Export Audit Package</button></div>';
        }
    },
    {
        id: 'doc-library', title: 'Document Library', icon: 'fas fa-book', cat: 'Documents',
        narr: 'A searchable reference library of defense standards, MIL-STDs, regulations, and instructions. Your team never needs to hunt for the right document \u2014 search by number, title, or keyword and access it instantly.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-book"></i> Document Library \u2014 340+ References</div>'
                + '<div class="wt-mock-field"><div class="wt-mock-select" style="background:var(--surface);"><i class="fas fa-search" style="color:var(--steel);margin-right:6px;"></i>Search standards...</div></div>'
                + '<table class="wt-mock-table"><thead><tr><th>Document</th><th>Title</th><th>Rev</th></tr></thead><tbody>'
                + '<tr><td style="color:var(--accent);">MIL-STD-1388-2B</td><td>DOD Requirements for a Logistic Support Analysis Record</td><td>B</td></tr>'
                + '<tr><td style="color:var(--accent);">MIL-STD-1390D</td><td>Level of Repair Analysis</td><td>D</td></tr>'
                + '<tr><td style="color:var(--accent);">MIL-HDBK-502</td><td>Acquisition Logistics</td><td>A</td></tr>'
                + '<tr><td style="color:var(--accent);">DI-ILSS-81495</td><td>Provisioning Technical Documentation</td><td>\u2014</td></tr>'
                + '</tbody></table></div>';
        }
    },
    {
        id: 'reports', title: 'Report Generator', icon: 'fas fa-file-alt', cat: 'Compliance',
        narr: 'Generate formal audit reports automatically. Each report includes a tamper-proof verification stamp so recipients can confirm the report has not been modified. Choose from pre-built templates or customize your own, and export as PDF.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-file-alt"></i> Report Generator</div>'
                + '<div class="wt-mock-report-list">'
                + '<div class="wt-mock-report-item"><i class="fas fa-file-pdf" style="color:var(--red);"></i><div><div style="color:#1d1d1f;font-weight:600;">Quarterly Compliance Report</div><div style="color:var(--steel);font-size:0.72rem;">DDG-51 FY26 Q1 \u2014 12 pages, tamper-proof verified</div></div><span class="wt-mock-badge-green">Ready</span></div>'
                + '<div class="wt-mock-report-item"><i class="fas fa-file-pdf" style="color:var(--red);"></i><div><div style="color:#1d1d1f;font-weight:600;">Gap Analysis Summary</div><div style="color:var(--steel);font-size:0.72rem;">F-35C Program \u2014 8 pages, 6 critical findings</div></div><span class="wt-mock-badge-green">Ready</span></div>'
                + '<div class="wt-mock-report-item"><i class="fas fa-file-pdf" style="color:var(--red);"></i><div><div style="color:#1d1d1f;font-weight:600;">DMSMS Risk Assessment</div><div style="color:var(--steel);font-size:0.72rem;">V-22 Osprey \u2014 5 pages, 3 obsolete parts flagged</div></div><span class="wt-mock-badge-yellow">Generating...</span></div>'
                + '</div></div>';
        }
    },
    {
        id: 'submissions', title: 'Submissions & PTD', icon: 'fas fa-paper-plane', cat: 'Documents',
        narr: 'The submission review tool compares vendor-provided data against your program baselines. It flags discrepancies automatically, scores data quality, and assigns severity ratings \u2014 catching errors before they become audit findings.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-paper-plane"></i> Submissions & PTD \u2014 ILIE Review</div>'
                + '<div class="wt-mock-submission">'
                + '<div class="wt-mock-sub-header">Vendor Submission: Raytheon \u2014 LSAR Data Package (DI-ILSS-81495)</div>'
                + '<div class="wt-mock-sub-score"><span>Data Quality Score:</span><span style="color:var(--gold);font-weight:700;font-size:1.1rem;">84%</span></div>'
                + '<div class="wt-mock-sub-findings">'
                + '<div class="wt-mock-sub-finding"><span class="wt-mock-badge-red">Reject</span> Missing maintenance task intervals for 4 LRUs</div>'
                + '<div class="wt-mock-sub-finding"><span class="wt-mock-badge-yellow">Review</span> MTBF values differ from MIL-HDBK-217F predictions by >15%</div>'
                + '<div class="wt-mock-sub-finding"><span class="wt-mock-badge-green">Accept</span> NSN cross-references validated against FEDLOG</div>'
                + '</div></div></div>';
        }
    },
    {
        id: 'sbom', title: 'SBOM Viewer', icon: 'fas fa-sitemap', cat: 'Supply Chain',
        narr: 'View and analyze your Software Bill of Materials. The SBOM viewer identifies component dependencies, known vulnerabilities, and license compliance issues across your entire software supply chain.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-sitemap"></i> SBOM Viewer \u2014 Mission Computer v4.2.1</div>'
                + '<table class="wt-mock-table"><thead><tr><th>Component</th><th>Version</th><th>License</th><th>CVEs</th></tr></thead><tbody>'
                + '<tr><td>openssl</td><td>3.0.12</td><td>Apache-2.0</td><td><span class="wt-mock-badge-green">0</span></td></tr>'
                + '<tr><td>zlib</td><td>1.2.13</td><td>Zlib</td><td><span class="wt-mock-badge-green">0</span></td></tr>'
                + '<tr><td>curl</td><td>7.88.1</td><td>MIT</td><td><span class="wt-mock-badge-yellow">1</span></td></tr>'
                + '<tr><td>sqlite</td><td>3.41.0</td><td>Public Domain</td><td><span class="wt-mock-badge-green">0</span></td></tr>'
                + '</tbody></table>'
                + '<div style="color:var(--steel);font-size:0.75rem;margin-top:8px;">47 components scanned | 1 advisory found (CVE-2023-38545, Medium)</div></div>';
        }
    },
    {
        id: 'gfp', title: 'GFP Tracker', icon: 'fas fa-box', cat: 'Supply Chain',
        narr: 'Track Government-Furnished Property across your program \u2014 equipment, materials, and special tooling. Every custody transfer is recorded with a tamper-proof verification stamp, creating a complete chain of accountability.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-box"></i> GFP Tracker \u2014 23 Items</div>'
                + '<table class="wt-mock-table"><thead><tr><th>Item</th><th>Serial</th><th>Custodian</th><th>Status</th></tr></thead><tbody>'
                + '<tr><td>AN/SPS-73 Radar</td><td>SN-44821</td><td>BAE Systems</td><td><span class="wt-mock-badge-green">In Use</span></td></tr>'
                + '<tr><td>MK 45 Gun Mount</td><td>SN-10034</td><td>Huntington Ingalls</td><td><span class="wt-mock-badge-green">In Use</span></td></tr>'
                + '<tr><td>Test Equipment Set</td><td>SN-71290</td><td>DLA San Diego</td><td><span class="wt-mock-badge-yellow">In Transit</span></td></tr>'
                + '<tr><td>SPY-6 Array Panel</td><td>SN-55193</td><td>Raytheon</td><td><span class="wt-mock-badge-blue">Maintenance</span></td></tr>'
                + '</tbody></table></div>';
        }
    },
    {
        id: 'cdrl', title: 'CDRL Validator', icon: 'fas fa-file-check', cat: 'Documents',
        narr: 'Validate Contract Data Requirements List items against your delivery schedule. The tool checks that every required deliverable is accounted for, properly formatted, and submitted on time.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-file-circle-check"></i> CDRL Validator \u2014 N00024-26-C-5312</div>'
                + '<table class="wt-mock-table"><thead><tr><th>CDRL</th><th>DI Number</th><th>Due</th><th>Status</th></tr></thead><tbody>'
                + '<tr><td>A001</td><td>DI-ILSS-81495</td><td>15 Mar 2026</td><td><span class="wt-mock-badge-green">Submitted</span></td></tr>'
                + '<tr><td>A002</td><td>DI-SESS-81514</td><td>01 Apr 2026</td><td><span class="wt-mock-badge-yellow">In Progress</span></td></tr>'
                + '<tr><td>A003</td><td>DI-MGMT-81466</td><td>15 Apr 2026</td><td><span class="wt-mock-badge-yellow">In Progress</span></td></tr>'
                + '<tr><td>A004</td><td>DI-ILSS-81497</td><td>01 Jun 2026</td><td><span class="wt-mock-badge-blue">Not Started</span></td></tr>'
                + '</tbody></table></div>';
        }
    },
    {
        id: 'contract', title: 'Contract Extractor', icon: 'fas fa-file-contract', cat: 'Documents',
        narr: 'Upload a contract document and the extractor identifies key clauses, DFARS references, delivery requirements, and compliance obligations automatically. No more reading 200-page contracts line by line.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-file-contract"></i> Contract Extractor \u2014 N00024-26-C-5312</div>'
                + '<div class="wt-mock-extract-list">'
                + '<div class="wt-mock-extract-item"><span class="wt-mock-extract-tag">DFARS</span><div><strong>252.204-7012</strong> \u2014 Safeguarding Covered Defense Information</div></div>'
                + '<div class="wt-mock-extract-item"><span class="wt-mock-extract-tag">CDRL</span><div><strong>12 deliverables</strong> identified across 4 CLINs</div></div>'
                + '<div class="wt-mock-extract-item"><span class="wt-mock-extract-tag">Period</span><div><strong>Base + 4 Options</strong> \u2014 Oct 2025 through Sep 2030</div></div>'
                + '<div class="wt-mock-extract-item"><span class="wt-mock-extract-tag">Value</span><div><strong>$847M</strong> total estimated contract value</div></div>'
                + '<div class="wt-mock-extract-item"><span class="wt-mock-extract-tag">Security</span><div><strong>CMMC Level 2</strong> required by DFARS 252.204-7021</div></div>'
                + '</div></div>';
        }
    },
    {
        id: 'provenance', title: 'Provenance Chain', icon: 'fas fa-link', cat: 'Supply Chain',
        narr: 'Visualize the complete chain of custody for any tracked item \u2014 from manufacturer to end user. Every handoff carries a tamper-proof verification stamp, creating an unbroken record of who held what, and when.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-link"></i> Provenance Chain \u2014 NSN 5340-01-587-2963</div>'
                + '<div class="wt-mock-chain">'
                + '<div class="wt-mock-chain-node"><div class="wt-mock-chain-dot green"></div><div class="wt-mock-chain-info"><strong>Manufactured</strong><div>Northrop Grumman, Melbourne FL</div><div class="wt-mock-chain-date">12 Jan 2026</div></div><div class="wt-mock-chain-proof"><i class="fas fa-check-circle" style="color:var(--green);"></i></div></div>'
                + '<div class="wt-mock-chain-line"></div>'
                + '<div class="wt-mock-chain-node"><div class="wt-mock-chain-dot green"></div><div class="wt-mock-chain-info"><strong>Received by DLA</strong><div>DLA Philadelphia</div><div class="wt-mock-chain-date">28 Jan 2026</div></div><div class="wt-mock-chain-proof"><i class="fas fa-check-circle" style="color:var(--green);"></i></div></div>'
                + '<div class="wt-mock-chain-line"></div>'
                + '<div class="wt-mock-chain-node"><div class="wt-mock-chain-dot green"></div><div class="wt-mock-chain-info"><strong>Shipped to NNSY</strong><div>Norfolk Naval Shipyard</div><div class="wt-mock-chain-date">05 Feb 2026</div></div><div class="wt-mock-chain-proof"><i class="fas fa-check-circle" style="color:var(--green);"></i></div></div>'
                + '<div class="wt-mock-chain-line"></div>'
                + '<div class="wt-mock-chain-node"><div class="wt-mock-chain-dot accent"></div><div class="wt-mock-chain-info"><strong>Installed on DDG-51</strong><div>USS Arleigh Burke</div><div class="wt-mock-chain-date">05 Mar 2026</div></div><div class="wt-mock-chain-proof"><i class="fas fa-check-circle" style="color:var(--green);"></i></div></div>'
                + '</div></div>';
        }
    },
    {
        id: 'analytics', title: 'Cross-Program Analytics', icon: 'fas fa-chart-bar', cat: 'Analysis',
        narr: 'Compare performance, risk, and compliance metrics across multiple programs in a single dashboard. Identify trends, share best practices, and allocate resources where they will have the greatest impact.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-chart-bar"></i> Cross-Program Analytics</div>'
                + '<table class="wt-mock-table"><thead><tr><th>Program</th><th>Readiness</th><th>Compliance</th><th>Risk</th><th>Trend</th></tr></thead><tbody>'
                + '<tr><td>DDG-51 Flight III</td><td><span style="color:var(--green);">98.3%</span></td><td>A-</td><td><span class="wt-mock-badge-green">Low</span></td><td><i class="fas fa-arrow-up" style="color:var(--green);"></i></td></tr>'
                + '<tr><td>F-35C Lightning II</td><td><span style="color:var(--green);">94.7%</span></td><td>B+</td><td><span class="wt-mock-badge-yellow">Moderate</span></td><td><i class="fas fa-arrow-right" style="color:var(--gold);"></i></td></tr>'
                + '<tr><td>V-22 Osprey</td><td><span style="color:var(--gold);">89.1%</span></td><td>B</td><td><span class="wt-mock-badge-red">High</span></td><td><i class="fas fa-arrow-down" style="color:var(--red);"></i></td></tr>'
                + '<tr><td>CVN-78 Ford</td><td><span style="color:var(--green);">96.2%</span></td><td>A</td><td><span class="wt-mock-badge-green">Low</span></td><td><i class="fas fa-arrow-up" style="color:var(--green);"></i></td></tr>'
                + '</tbody></table></div>';
        }
    },
    {
        id: 'team', title: 'Team Management', icon: 'fas fa-users', cat: 'Operations',
        narr: 'Manage your team with role-based access control. Assign capabilities per user \u2014 administrators manage credit allocations, program managers oversee deliverables, and analysts focus on their assigned tools. Every permission change is logged.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-users"></i> Team Management \u2014 8 Members</div>'
                + '<table class="wt-mock-table"><thead><tr><th>Name</th><th>Role</th><th>Last Active</th><th>Credits Used</th></tr></thead><tbody>'
                + '<tr><td>CDR J. Martinez</td><td><span class="wt-mock-badge-blue">Admin</span></td><td>Today</td><td>1,240 SLS</td></tr>'
                + '<tr><td>LCDR S. Thompson</td><td><span class="wt-mock-badge-green">PM</span></td><td>Today</td><td>890 SLS</td></tr>'
                + '<tr><td>LT R. Chen</td><td><span class="wt-mock-badge-yellow">Analyst</span></td><td>Yesterday</td><td>456 SLS</td></tr>'
                + '<tr><td>LT K. Davis</td><td><span class="wt-mock-badge-yellow">Analyst</span></td><td>Today</td><td>312 SLS</td></tr>'
                + '</tbody></table></div>';
        }
    },
    {
        id: 'acquisition', title: 'Acquisition Planner', icon: 'fas fa-ship', cat: 'Operations',
        narr: 'The Acquisition Planner replaces fragile 30-year spreadsheets. Track every hull type, hull number, replacement need, POM funding status, material condition, ROH history, and ship builder in one auditable grid. Sort, filter, export to Excel, and anchor the full plan for tamper-proof verification.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-ship"></i> Acquisition Planner \u2014 6 Vessels</div>'
                + '<table class="wt-mock-table"><thead><tr><th>Hull #</th><th>Type</th><th>Need</th><th>POM</th><th>Condition</th><th>Total $K</th></tr></thead><tbody>'
                + '<tr><td>YP-703</td><td>YP</td><td><span class="wt-mock-badge-yellow">Replacement</span></td><td><span class="wt-mock-badge-green">Yes</span></td><td><span class="wt-mock-badge-red">Poor</span></td><td>$45,000</td></tr>'
                + '<tr><td>YP-705</td><td>YP</td><td><span class="wt-mock-badge-blue">SLE</span></td><td><span class="wt-mock-badge-yellow">Partial</span></td><td><span class="wt-mock-badge-yellow">Fair</span></td><td>$5,150</td></tr>'
                + '<tr><td>YTB-833</td><td>YTB</td><td><span class="wt-mock-badge-green">New Build</span></td><td><span class="wt-mock-badge-green">Yes</span></td><td>\u2014</td><td>$28,000</td></tr>'
                + '<tr><td>TWR-841</td><td>TWR</td><td><span class="wt-mock-badge-yellow">Replacement</span></td><td><span class="wt-mock-badge-blue">Pending</span></td><td><span class="wt-mock-badge-red">Poor</span></td><td>$18,500</td></tr>'
                + '</tbody></table></div>';
        }
    },
    {
        id: 'milestones', title: 'Program Milestones', icon: 'fas fa-flag-checkered', cat: 'Operations',
        narr: 'Track every vessel from contract award through delivery with the Program Milestone Tracker. Monitor construction starts, builder trials, acceptance trials, sail-away dates, and Obligation Work Limiting Dates across PMS 300, PMS 325, PMS 501, and Strategic Programs. Filter by program or status, view the Gantt timeline, and export to Excel.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-flag-checkered"></i> Program Milestones \u2014 10 Vessels</div>'
                + '<table class="wt-mock-table"><thead><tr><th>Hull #</th><th>Type</th><th>Program</th><th>Status</th><th>Contract Delivery</th><th>OWLD Date</th></tr></thead><tbody>'
                + '<tr><td>YRBM-44</td><td>YRBM</td><td>PMS 300</td><td><span class="wt-mock-badge-green">On Track</span></td><td>Mar 30, 2025</td><td>Feb 28, 2026</td></tr>'
                + '<tr><td>DDG-140</td><td>DDG</td><td>PMS 325</td><td><span class="wt-mock-badge-green">On Track</span></td><td>Dec 31, 2028</td><td>Nov 30, 2029</td></tr>'
                + '<tr><td>LCS-38</td><td>LCS</td><td>PMS 501</td><td><span class="wt-mock-badge-red">Delayed</span></td><td>Sep 30, 2025</td><td>Aug 30, 2026</td></tr>'
                + '<tr><td>YTB-830</td><td>YTB</td><td>PMS 300</td><td><span class="wt-mock-badge-red">Delayed</span></td><td>Jun 30, 2024</td><td>May 30, 2025</td></tr>'
                + '</tbody></table></div>';
        }
    },
    {
        id: 'brief', title: 'Program Brief Engine', icon: 'fas fa-briefcase', cat: 'Operations',
        narr: 'Create professional slide-based briefs from templates — Program Status, Milestone Review, POM, President\'s Budget, ILSMT, ILSMP, and IPR. The Brief Engine auto-populates platform data, provides formatting tools for fonts, colors, and images, and lets you import PPTX files. Set permissions, export printable HTML, and anchor briefs to the Ledger.',
        mock: function() {
            return '<div class="wt-mock-tool"><div class="wt-mock-tool-head"><i class="fas fa-briefcase"></i> Program Brief Engine — 7 Templates</div>'
                + '<table class="wt-mock-table"><thead><tr><th>Template</th><th>Type</th><th>Slides</th><th>Use Case</th></tr></thead><tbody>'
                + '<tr><td>Program Status Brief</td><td>STATUS</td><td>5</td><td>Weekly/monthly program updates</td></tr>'
                + '<tr><td>POM Brief</td><td>POM</td><td>4</td><td>PPBE resource allocation</td></tr>'
                + '<tr><td>ILSMT Brief</td><td>ILSMT</td><td>5</td><td>ILS management team meetings</td></tr>'
                + '<tr><td>IPR Brief</td><td>IPR</td><td>5</td><td>Interim progress reviews</td></tr>'
                + '</tbody></table></div>';
        }
    },
    {
        id: 'summary', title: 'Ready to Get Started?', icon: 'fas fa-rocket', cat: 'Summary',
        narr: 'That completes your tour of S4 Ledger \u2014 23+ integrated tools purpose-built for defense logistics. Every record is permanently verified, every action is auditable, and every handoff is proven. Whether you are tracking a single part or managing an entire fleet, the platform scales with your mission. Sign in to get started.',
        mock: function() {
            return '<div class="wt-mock-welcome">'
                + '<div class="wt-mock-logo"><i class="fas fa-rocket" style="font-size:3rem;color:var(--accent);"></i></div>'
                + '<h2 style="color:#1d1d1f;font-size:1.3rem;font-weight:700;margin:16px 0 8px;">Platform Tour Complete</h2>'
                + '<p style="color:var(--steel);font-size:0.88rem;margin-bottom:20px;max-width:400px;">S4 Ledger gives your team 23+ purpose-built defense logistics tools with tamper-proof verification. Every record. Every handoff. Proven.</p>'
                + '<div class="wt-stat-grid">'
                + '<div class="wt-stat"><span class="wt-stat-num">23+</span><span class="wt-stat-label">ILS Tools</span></div>'
                + '<div class="wt-stat"><span class="wt-stat-num">3 sec</span><span class="wt-stat-label">To Anchor</span></div>'
                + '<div class="wt-stat"><span class="wt-stat-num">42x</span><span class="wt-stat-label">ROI</span></div>'
                + '<div class="wt-stat"><span class="wt-stat-num">$1M+</span><span class="wt-stat-label">Savings/yr</span></div>'
                + '</div>'
                + '<div style="margin-top:24px;display:flex;gap:12px;justify-content:center;">'
                + '<button onclick="endWalkthrough();if(typeof startAuthFlow===\'function\')startAuthFlow();" class="wt-mock-btn wt-mock-btn-primary">Sign In <i class="fas fa-arrow-right"></i></button>'
                + '<button onclick="endWalkthrough();" class="wt-mock-btn">Continue Exploring</button>'
                + '</div></div>';
        }
    }
];

// ═══ State ═══
var _wtIdx = -1;
var _wtVoice = false;
var _wtStepDone = false;
var _wtNarrTimer = null;
var _mockTimers = [];
var _preferredVoice = null;

// ═══ Voice Selection ═══
// Select a natural-sounding male English voice
function _pickMaleVoice() {
    if (!('speechSynthesis' in window)) return null;
    var voices = speechSynthesis.getVoices();
    if (!voices.length) return null;

    // Preferred male voices ranked by natural quality (macOS, Chrome, Edge, etc.)
    var preferred = [
        'daniel', 'aaron', 'alex', 'tom', 'james', 'arthur',
        'google uk english male', 'microsoft mark', 'microsoft david',
        'microsoft guy', 'reed', 'rishi', 'oliver', 'thomas', 'malcolm',
        'english male', 'male'
    ];

    var enVoices = voices.filter(function(v) { return /^en[-_]/i.test(v.lang); });
    if (!enVoices.length) enVoices = voices.filter(function(v) { return /en/i.test(v.lang); });

    // Try preferred names first
    for (var p = 0; p < preferred.length; p++) {
        for (var i = 0; i < enVoices.length; i++) {
            if (enVoices[i].name.toLowerCase().indexOf(preferred[p]) !== -1) {
                return enVoices[i];
            }
        }
    }

    // Fallback: first English voice
    return enVoices.length ? enVoices[0] : voices[0];
}

// Load voices (async on some browsers)
function _loadVoices() {
    _preferredVoice = _pickMaleVoice();
    if (!_preferredVoice && 'speechSynthesis' in window) {
        speechSynthesis.addEventListener('voiceschanged', function() {
            _preferredVoice = _pickMaleVoice();
        }, { once: true });
    }
}
_loadVoices();

// ═══ Engine ═══
function startWalkthrough() {
    _wtIdx = 0;
    _wtStepDone = false;
    var overlay = document.getElementById('s4WalkthroughOverlay');
    if (overlay) { overlay.style.display = 'flex'; }
    _loadVoices();
    _showWTStep();
}

function _showWTStep() {
    if (_wtIdx < 0 || _wtIdx >= _steps.length) { endWalkthrough(); return; }
    var step = _steps[_wtIdx];
    var overlay = document.getElementById('s4WalkthroughOverlay');
    if (!overlay) return;

    _wtStepDone = false;
    _clearAllTimers();

    // Update narrator panel
    var counter = overlay.querySelector('.wt-step-counter');
    var title = overlay.querySelector('.wt-step-title');
    var desc = overlay.querySelector('.wt-step-desc');
    var icon = overlay.querySelector('.wt-step-icon');
    var catBadge = overlay.querySelector('.wt-step-cat');
    var display = overlay.querySelector('.wt-display');
    var progressBar = overlay.querySelector('.wt-progress-fill');
    var progressText = overlay.querySelector('.wt-progress-text');
    var nextBtn = overlay.querySelector('.wt-btn-next');

    if (counter) counter.textContent = 'Step ' + (_wtIdx + 1) + ' of ' + _steps.length;
    if (title) title.textContent = step.title;
    if (icon) icon.className = step.icon;
    if (catBadge) catBadge.textContent = step.cat;
    if (progressBar) progressBar.style.width = ((_wtIdx + 1) / _steps.length * 100) + '%';
    if (progressText) progressText.textContent = (_wtIdx + 1) + ' / ' + _steps.length;

    // Dim next button until step finishes
    if (nextBtn) { nextBtn.style.opacity = '0.4'; nextBtn.style.pointerEvents = 'none'; }

    // Typewriter narrator text — mark step done when finished
    if (desc) {
        desc.textContent = '';
        _narrTypeWriter(desc, step.narr, 18, function() {
            _onNarrDone();
        });
    }

    // Render mock display
    if (display) {
        display.style.opacity = '0';
        display.innerHTML = step.mock();
        setTimeout(function() { display.style.opacity = '1'; }, 100);
    }

    // Run onEnter animations
    var defersDone = false;
    if (step.onEnter) {
        defersDone = step.onEnter(function() {
            // If onEnter called done(), it means it has a longer-running animation
            // The step will wait for BOTH narrator text AND this callback
        });
    }

    // Animate stat numbers if present
    var animNums = overlay.querySelectorAll('[data-animate]');
    animNums.forEach(function(el) {
        var target = parseInt(el.getAttribute('data-animate'), 10);
        _animateNumber(el, 0, target, 1200, '');
    });

    // Voice narration
    if (_wtVoice && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
        var utterance = new SpeechSynthesisUtterance(step.narr);
        if (_preferredVoice) utterance.voice = _preferredVoice;
        utterance.rate = 0.88;
        utterance.pitch = 0.95;
        utterance.volume = 1;
        speechSynthesis.speak(utterance);
    }
}

function _onNarrDone() {
    _wtStepDone = true;
    var overlay = document.getElementById('s4WalkthroughOverlay');
    if (!overlay) return;
    var nextBtn = overlay.querySelector('.wt-btn-next');
    if (nextBtn) {
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
        nextBtn.classList.add('wt-fade-in');
    }
}

function _wtNext() {
    _wtIdx++;
    if (_wtIdx >= _steps.length) { endWalkthrough(); return; }
    _clearAllTimers();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    _showWTStep();
}

function _wtPrev() {
    if (_wtIdx > 0) {
        _wtIdx--;
        _clearAllTimers();
        if ('speechSynthesis' in window) speechSynthesis.cancel();
        _showWTStep();
    }
}

function _wtToggleVoice() {
    _wtVoice = !_wtVoice;
    var overlay = document.getElementById('s4WalkthroughOverlay');
    if (overlay) {
        var voiceBtn = overlay.querySelector('.wt-btn-voice i');
        if (voiceBtn) voiceBtn.className = _wtVoice ? 'fas fa-volume-up' : 'fas fa-volume-mute';
    }
    if (!_wtVoice && 'speechSynthesis' in window) { speechSynthesis.cancel(); }
    if (_wtVoice && _wtIdx >= 0 && _wtIdx < _steps.length) {
        _loadVoices();
        var step = _steps[_wtIdx];
        if ('speechSynthesis' in window) {
            var utterance = new SpeechSynthesisUtterance(step.narr);
            if (_preferredVoice) utterance.voice = _preferredVoice;
            utterance.rate = 0.88;
            utterance.pitch = 0.95;
            utterance.volume = 1;
            speechSynthesis.speak(utterance);
        }
    }
}

function endWalkthrough() {
    _wtIdx = -1;
    _wtStepDone = false;
    _clearAllTimers();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    var overlay = document.getElementById('s4WalkthroughOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ═══ Helpers ═══
function _clearAllTimers() {
    if (_wtNarrTimer) { clearTimeout(_wtNarrTimer); _wtNarrTimer = null; }
    _mockTimers.forEach(function(t) { clearTimeout(t); });
    _mockTimers = [];
}

// Narrator typewriter — dedicated timer, completion enables Next
function _narrTypeWriter(el, text, speed, cb) {
    if (_wtNarrTimer) { clearTimeout(_wtNarrTimer); _wtNarrTimer = null; }
    var i = 0;
    el.textContent = '';
    function tick() {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
            _wtNarrTimer = setTimeout(tick, speed || 30);
        } else {
            _wtNarrTimer = null;
            if (cb) cb();
        }
    }
    tick();
}

// Mock display typewriter — independent timer, never touches narrator
function _mockTypeWriter(el, text, speed, cb) {
    var i = 0;
    el.textContent = '';
    function tick() {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
            var tid = setTimeout(tick, speed || 30);
            _mockTimers.push(tid);
        } else if (cb) { cb(); }
    }
    tick();
}

function _animateNumber(el, start, end, duration, suffix) {
    if (!el) return;
    var range = end - start;
    var startTime = performance.now();
    function update(now) {
        var elapsed = now - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = Math.floor(start + range * eased);
        el.textContent = value + (suffix || '');
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ═══ Feedback System ═══
function openFeedbackDrawer() {
    var drawer = document.getElementById('s4FeedbackDrawer');
    if (drawer) {
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
    }
}

function closeFeedbackDrawer() {
    var drawer = document.getElementById('s4FeedbackDrawer');
    if (drawer) {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
    }
}

function submitFeedback() {
    var drawer = document.getElementById('s4FeedbackDrawer');
    if (!drawer) return;
    var stars = drawer.querySelector('.fb-stars');
    var cat = drawer.querySelector('.fb-category');
    var comment = drawer.querySelector('.fb-comment');
    var rating = stars ? parseInt(stars.getAttribute('data-rating') || '0', 10) : 0;
    var category = cat ? cat.value : '';
    var text = comment ? comment.value.trim() : '';

    if (rating === 0) {
        _fbFlash(drawer, 'Please select a rating.');
        return;
    }

    var feedback = {
        rating: rating,
        category: category,
        comment: text,
        page: window.location.pathname,
        tool: window._currentILSTool || '',
        ts: new Date().toISOString()
    };

    var stored = [];
    try { stored = JSON.parse(localStorage.getItem('s4_feedback') || '[]'); } catch(e) { stored = []; }
    stored.push(feedback);
    localStorage.setItem('s4_feedback', JSON.stringify(stored));

    var body = drawer.querySelector('.fb-body');
    if (body) {
        body.innerHTML = '<div style="text-align:center;padding:40px 20px;">'
            + '<i class="fas fa-check-circle" style="font-size:2.5rem;color:var(--green);margin-bottom:12px;display:block;"></i>'
            + '<div style="color:#1d1d1f;font-weight:700;font-size:1rem;margin-bottom:4px;">Thank you!</div>'
            + '<div style="color:var(--steel);font-size:0.82rem;">Your feedback helps us improve S4 Ledger.</div>'
            + '</div>';
    }
    setTimeout(function() {
        closeFeedbackDrawer();
        setTimeout(function() { _resetFeedbackForm(); }, 400);
    }, 2000);
}

function _fbFlash(drawer, msg) {
    var err = drawer.querySelector('.fb-error');
    if (err) { err.textContent = msg; err.style.display = 'block'; setTimeout(function() { err.style.display = 'none'; }, 3000); }
}

function _resetFeedbackForm() {
    var drawer = document.getElementById('s4FeedbackDrawer');
    if (!drawer) return;
    var body = drawer.querySelector('.fb-body');
    if (body) {
        body.innerHTML = _feedbackFormHTML();
        _initStarRating();
    }
}

function _feedbackFormHTML() {
    return '<div class="fb-field"><label class="fb-label">Rating</label>'
        + '<div class="fb-stars" data-rating="0">'
        + '<i class="far fa-star" data-star="1"></i>'
        + '<i class="far fa-star" data-star="2"></i>'
        + '<i class="far fa-star" data-star="3"></i>'
        + '<i class="far fa-star" data-star="4"></i>'
        + '<i class="far fa-star" data-star="5"></i>'
        + '</div></div>'
        + '<div class="fb-field"><label class="fb-label">Category</label>'
        + '<select class="fb-category"><option value="general">General</option><option value="bug">Bug Report</option><option value="feature">Feature Request</option><option value="praise">Praise</option><option value="other">Other</option></select>'
        + '</div>'
        + '<div class="fb-field"><label class="fb-label">Comment <span style="color:var(--muted);">(optional)</span></label>'
        + '<textarea class="fb-comment" rows="3" placeholder="Tell us more..."></textarea>'
        + '</div>'
        + '<div class="fb-error" style="display:none;color:var(--red);font-size:0.75rem;margin-bottom:8px;"></div>'
        + '<button class="fb-submit" onclick="submitFeedback()">Submit Feedback</button>';
}

function _initStarRating() {
    var container = document.querySelector('#s4FeedbackDrawer .fb-stars');
    if (!container) return;
    container.querySelectorAll('i').forEach(function(star) {
        star.addEventListener('click', function() {
            var val = parseInt(this.getAttribute('data-star'), 10);
            container.setAttribute('data-rating', val);
            container.querySelectorAll('i').forEach(function(s) {
                var sv = parseInt(s.getAttribute('data-star'), 10);
                s.className = sv <= val ? 'fas fa-star' : 'far fa-star';
            });
        });
        star.addEventListener('mouseenter', function() {
            var val = parseInt(this.getAttribute('data-star'), 10);
            container.querySelectorAll('i').forEach(function(s) {
                var sv = parseInt(s.getAttribute('data-star'), 10);
                s.className = sv <= val ? 'fas fa-star' : 'far fa-star';
            });
        });
    });
    container.addEventListener('mouseleave', function() {
        var rating = parseInt(container.getAttribute('data-rating'), 10);
        container.querySelectorAll('i').forEach(function(s) {
            var sv = parseInt(s.getAttribute('data-star'), 10);
            s.className = sv <= rating ? 'fas fa-star' : 'far fa-star';
        });
    });
}

function thumbFeedback(toolId, isPositive) {
    var stored = [];
    try { stored = JSON.parse(localStorage.getItem('s4_tool_feedback') || '[]'); } catch(e) { stored = []; }
    stored.push({ tool: toolId, positive: isPositive, ts: new Date().toISOString() });
    localStorage.setItem('s4_tool_feedback', JSON.stringify(stored));

    var btn = document.querySelector('.s4-thumb[data-tool="' + toolId + '"][data-positive="' + isPositive + '"]');
    if (btn) {
        btn.classList.add('thumb-selected');
        var sibling = btn.parentElement.querySelector('.s4-thumb:not(.thumb-selected)');
        if (sibling) sibling.classList.remove('thumb-selected');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    _initStarRating();
});

// ═══ Exports ═══
window.startWalkthrough = startWalkthrough;
window.startQuickTour = startWalkthrough;
window.endWalkthrough = endWalkthrough;
window._wtNext = _wtNext;
window._wtPrev = _wtPrev;
window._wtToggleVoice = _wtToggleVoice;
window.openFeedbackDrawer = openFeedbackDrawer;
window.closeFeedbackDrawer = closeFeedbackDrawer;
window.submitFeedback = submitFeedback;
window.thumbFeedback = thumbFeedback;

})();
