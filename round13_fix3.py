#!/usr/bin/env python3
"""Round 13 — Fix 3: Exact replacement for Gap Analysis How-It-Works"""
import os

DIR = os.path.dirname(os.path.abspath(__file__))
FILE = os.path.join(DIR, 'demo-app', 'index.html')

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

OLD = """How S4 Ledger Saves Money \u2014 Platform Overview</summary>
                            <div style="padding:0 0 12px;color:var(--steel);font-size:0.82rem;line-height:1.6;">
                                <p>S4 Ledger creates <strong>tamper-proof records</strong> for defense logistics by anchoring SHA-256 hashes to the XRP Ledger. The process: (1) A defense record is created in your existing system, (2) S4 Ledger computes a SHA-256 hash, (3) Only the hash is written to an XRPL transaction memo, (4) A micro-fee of 0.01 $SLS is paid per anchor, (5) Anyone with the original can verify it hasn\u2019t been altered. <strong>No sensitive data on-chain.</strong></p>
                                <p><strong style="color:#fff;">Supports 54+ Navy-specific record types</strong> \u2014 supply chain receipts, 3-M maintenance, ordnance tracking, CASREP, CDRL, depot repair, SUBSAFE, configuration management, and more. Custom record types can also be anchored.</p>
                                <p><strong style="color:#00aaff;">$SLS Token:</strong> Live on XRPL Mainnet | Total Supply: 100M | Circulating: ~15M | Anchor Fee: 0.01 $SLS | AMM pools and trustlines active.</p>
                            </div>"""

NEW = """How Gap Analysis Works</summary>
                            <div style="padding:0 0 12px;color:var(--steel);font-size:0.82rem;line-height:1.6;">
                                <p><strong style="color:#fff;">What this tool does:</strong> The ILS Gap Analysis Engine evaluates your program\u2019s compliance with <strong>MIL-STD-1388-1A/2B</strong> Integrated Logistics Support requirements. It scores 10 ILS element areas \u2014 Supply Support, Maintenance Planning, Technical Data, Training, Configuration Management, DMSMS, PHS&amp;T, Reliability, Support Equipment, and Manpower \u2014 to identify gaps, missing deliverables, and corrective actions.</p>
                                <p><strong style="color:#2ecc71;">Step-by-step:</strong> (1) Select your program and hull/tail number. (2) Review the generated ILS checklist and mark items as complete. (3) Upload DRL spreadsheets, CDRLs, or ILS documents for automated cross-reference. (4) Click \u201cRun Full Analysis\u201d \u2014 the engine scores your checklist (weighted: critical items \u00d72), cross-references uploaded documents against DRL requirements using fuzzy matching, and outputs a combined coverage score (60% checklist + 40% DRL). (5) Review critical gaps, action items, estimated remediation costs, and recommended owners.</p>
                                <p><strong style="color:#ff6b6b;">Action output:</strong> Gap Analysis generates a prioritized corrective action register (CAR) with severity ratings, cost estimates ($K), schedule targets, and assigned owners (government + contractor). Critical gaps are flagged for immediate attention. Every analysis result can be anchored to the XRP Ledger for tamper-proof audit trail.</p>
                                <p><strong style="color:#00aaff;">Charts:</strong> After analysis, a radar chart shows ILS element coverage and a horizontal bar chart shows individual element scores color-coded (green \u226580%, amber \u226550%, red &lt;50%). Charts update automatically when you re-run with different parameters.</p>
                            </div>"""

if OLD in c:
    c = c.replace(OLD, NEW, 1)
    print("[OK] Gap Analysis How-It-Works replaced")
else:
    print("[FAIL] Could not find old text")
    # Debug: find pieces
    pieces = [
        'How S4 Ledger Saves Money',
        'Platform Overview',
        'Supports 54+ Navy-specific',
        '$SLS Token:</strong> Live on XRPL'
    ]
    for p in pieces:
        if p in c:
            idx = c.index(p)
            print(f"  Found '{p}' at char {idx}")
        else:
            print(f"  '{p}' NOT found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    v = f.read()
print(f"Verify 'How Gap Analysis Works': {'FOUND' if 'How Gap Analysis Works' in v else 'NOT FOUND'}")
print(f"Verify 'MIL-STD-1388': {'FOUND' if 'MIL-STD-1388' in v else 'NOT FOUND'}")
print(f"Verify '_ilsElementMap': {'FOUND' if '_ilsElementMap' in v else 'NOT FOUND'}")
print(f"Lines: {v.count(chr(10))}")
