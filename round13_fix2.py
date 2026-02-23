#!/usr/bin/env python3
"""Round 13 — Fix 2: Apply the 2 missing patches (Gap Analysis title + ilsResults.elements)"""
import os

DIR = os.path.dirname(os.path.abspath(__file__))
FILE = os.path.join(DIR, 'demo-app', 'index.html')

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

print(f"Lines before: {c.count(chr(10))}")

# ── PATCH 1: Replace "How S4 Ledger Works — Platform Overview" with "How Gap Analysis Works" ──
OLD1 = '''<summary style="cursor:pointer;padding:10px 0;color:#00aaff;font-weight:600;font-size:0.85rem;"><i class="fas fa-info-circle"></i> How S4 Ledger Works \u2014 Platform Overview</summary>
                                <div style="padding:0 0 12px;color:var(--steel);font-size:0.82rem;line-height:1.6;">
                                    <p>S4 Ledger creates <strong>tamper-proof records</strong> for defense logistics by anchoring SHA-256 hashes to the XRP Ledger. The process: (1) A defense record is created in your existing system, (2) S4 Ledger computes a SHA-256 hash, (3) Only the hash is written to an XRPL transaction memo, (4) A micro-fee of 0.01 $SLS is paid per anchor, (5) Anyone with the original can verify it hasn\u2019t been altered. <strong>No sensitive data on-chain.</strong></p>
                                    <p><strong style="color:#fff;">Supports any defense record type \u2014 156+ pre-built templates across 9 branches</strong> \u2014 Navy (54), Army (20), Air Force (18), Marines (14), Coast Guard (12), DLA (12), Joint (10), SOCOM (8), Space Force (11). Any custom record type can also be anchored.</p>
                                    <p><strong style="color:#c9a84c;">$SLS Token:</strong> Live on XRPL Mainnet | Total Supply: 100M | Circulating: ~15M | Anchor Fee: 0.01 $SLS | AMM pools and trustlines active.</p>
                                </div>'''

NEW1 = '''<summary style="cursor:pointer;padding:10px 0;color:#00aaff;font-weight:600;font-size:0.85rem;"><i class="fas fa-info-circle"></i> How Gap Analysis Works</summary>
                                <div style="padding:0 0 12px;color:var(--steel);font-size:0.82rem;line-height:1.6;">
                                    <p><strong style="color:#fff;">What this tool does:</strong> The ILS Gap Analysis Engine evaluates your program\u2019s compliance with <strong>MIL-STD-1388-1A/2B</strong> Integrated Logistics Support requirements. It scores 10 ILS element areas \u2014 Supply Support, Maintenance Planning, Technical Data, Training, Configuration Management, DMSMS, PHS&amp;T, Reliability, Support Equipment, and Manpower \u2014 to identify gaps, missing deliverables, and corrective actions.</p>
                                    <p><strong style="color:#2ecc71;">Step-by-step:</strong> (1) Select your program and hull/tail number. (2) Review the generated ILS checklist and mark items as complete. (3) Upload DRL spreadsheets, CDRLs, or ILS documents for automated cross-reference. (4) Click \u201cRun Full Analysis\u201d \u2014 the engine scores your checklist (weighted: critical items \u00d72), cross-references uploaded documents against DRL requirements using fuzzy matching, and outputs a combined coverage score (60% checklist + 40% DRL). (5) Review critical gaps, action items, estimated remediation costs, and recommended owners.</p>
                                    <p><strong style="color:#ff6b6b;">Action output:</strong> Gap Analysis generates a prioritized corrective action register (CAR) with severity ratings, cost estimates ($K), schedule targets, and assigned owners (government + contractor). Critical gaps are flagged for immediate attention. Every analysis result can be anchored to the XRP Ledger for tamper-proof audit trail.</p>
                                    <p><strong style="color:#00aaff;">Charts:</strong> After analysis, a radar chart shows ILS element coverage and a horizontal bar chart shows individual element scores color-coded (green \u226580%, amber \u226550%, red &lt;50%). Charts update automatically when you re-run with different parameters.</p>
                                </div>'''

if OLD1 in c:
    c = c.replace(OLD1, NEW1, 1)
    print("[OK] Patch 1: Gap Analysis How-It-Works replaced")
else:
    print("[WARN] Patch 1: Could not find old text")
    # Try a simpler approach — find by unique line
    old_line = 'How S4 Ledger Works'
    if old_line in c:
        # Find the line and get context
        idx = c.index(old_line)
        print(f"  Found '{old_line}' at char {idx}")
        # Get surrounding context
        start = max(0, idx - 100)
        end = min(len(c), idx + 200)
        print(f"  Context: ...{repr(c[start:end])}...")


# ── PATCH 2: Add ilsResults.elements derivation ──
OLD2 = '    ilsResults = { clItems, clPct, drlResults, drlPct, drlFound, drlTotal, pct, actions, critGaps, totalCost, prog, hull, phase, progKey, cl };'

NEW2 = '''    // Derive per-element scores for chart reactivity
    const _ilsElementMap = {};
    const _ilsElementGroups = {
        'Supply Support': ['supply','spares','provisioning','pica','sica','allowance','apl','cosal','repairables'],
        'Maintenance Planning': ['maintenance','pms','mrc','3-m','rmc','depot','overhaul','avail','maint_plan'],
        'Technical Data': ['tech_data','technical','tm','ecp','drawing','specification','navsea_drawing','tdp'],
        'Training': ['training','course','trainee','curriculum','simulation','ntsp','ctt'],
        'Config Management': ['config','configuration','baseline','change_control','ecp_review','audit'],
        'DMSMS': ['dmsms','obsolescence','diminishing','replacement','alternate','lifecycle_buy'],
        'PHS&T': ['packaging','handling','storage','transport','phst','container','shipping'],
        'Reliability': ['reliability','mtbf','mttr','ram','failure','fracas','rma','rcm'],
        'Support Equipment': ['support_equip','se','test_equip','calibration','tmde','tools'],
        'Manpower': ['manpower','personnel','manning','billet','rate','mos','navy_rate']
    };
    Object.keys(_ilsElementGroups).forEach(function(elName) {
        var keywords = _ilsElementGroups[elName];
        var relevant = clItems.filter(function(item) {
            var txt = (item.l + ' ' + item.id + ' ' + (item.el || '')).toLowerCase();
            return keywords.some(function(kw) { return txt.indexOf(kw) >= 0; });
        });
        if (relevant.length === 0) {
            _ilsElementMap[elName] = { score: clPct, items: 0 };
        } else {
            var checked = relevant.filter(function(i) { return i.checked; }).length;
            _ilsElementMap[elName] = { score: relevant.length > 0 ? Math.round((checked / relevant.length) * 100) : 0, items: relevant.length };
        }
    });

    ilsResults = { clItems, clPct, drlResults, drlPct, drlFound, drlTotal, pct, actions, critGaps, totalCost, prog, hull, phase, progKey, cl, elements: _ilsElementMap };'''

if OLD2 in c:
    c = c.replace(OLD2, NEW2, 1)
    print("[OK] Patch 2: ilsResults.elements derivation added")
else:
    print("[WARN] Patch 2: Could not find old text — may already be applied")
    if '_ilsElementMap' in c:
        print("  -> Already applied (found _ilsElementMap)")
    else:
        # Debug
        import re
        m = re.search(r'ilsResults\s*=\s*\{', c)
        if m:
            print(f"  Found ilsResults assignment at char {m.start()}")
            print(f"  Context: {repr(c[m.start():m.start()+200])}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

print(f"Lines after: {c.count(chr(10))}")
