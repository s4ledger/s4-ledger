#!/usr/bin/env python3
"""Round 13 — Fix 5: Broader search for Gap Analysis replacement"""
import os

DIR = os.path.dirname(os.path.abspath(__file__))
FILE = os.path.join(DIR, 'demo-app', 'index.html')

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find the line with "How S4 Ledger Saves Money" - broader search
target_idx = None
for i, line in enumerate(lines):
    if 'How S4 Ledger Saves Money' in line:
        target_idx = i
        print(f"Found 'How S4 Ledger Saves Money' at line {i+1}")
        print(f"  repr: {repr(line[:120])}")
        break

if target_idx is None:
    print("[FAIL] Could not find target line")
    # Try even broader
    for i, line in enumerate(lines):
        if 'Saves Money' in line:
            print(f"  Partial match 'Saves Money' at line {i+1}: {repr(line[:80])}")
    exit(1)

# Find the end of the content div - look for </div> after the summary
end_idx = None
for i in range(target_idx + 1, min(target_idx + 20, len(lines))):
    if '</div>' in lines[i]:
        end_idx = i
        print(f"Found </div> at line {i+1}")
        break

if end_idx is None:
    print("[FAIL] Could not find end of block")
    for i in range(target_idx, min(target_idx + 15, len(lines))):
        print(f"  L{i+1}: {repr(lines[i][:80])}")
    exit(1)

# Show what we're replacing
print(f"\nReplacing lines {target_idx+1} to {end_idx+1}:")
for i in range(target_idx, end_idx + 1):
    print(f"  L{i+1}: {lines[i].rstrip()[:100]}")

# Get the indentation from the target line
indent = '                                '  # 32 spaces (matching the file)

# Build replacement
new_block = [
    lines[target_idx][:lines[target_idx].index('How S4 Ledger')] + 'How Gap Analysis Works</summary>\n',
    indent + '<div style="padding:0 0 12px;color:var(--steel);font-size:0.82rem;line-height:1.6;">\n',
    indent + '    <p><strong style="color:#fff;">What this tool does:</strong> The ILS Gap Analysis Engine evaluates your program\u2019s compliance with <strong>MIL-STD-1388-1A/2B</strong> Integrated Logistics Support requirements. It scores 10 ILS element areas \u2014 Supply Support, Maintenance Planning, Technical Data, Training, Configuration Management, DMSMS, PHS&amp;T, Reliability, Support Equipment, and Manpower \u2014 to identify gaps, missing deliverables, and corrective actions.</p>\n',
    indent + '    <p><strong style="color:#2ecc71;">Step-by-step:</strong> (1) Select your program and hull/tail number. (2) Review the generated ILS checklist and mark items as complete. (3) Upload DRL spreadsheets, CDRLs, or ILS documents for automated cross-reference. (4) Click \u201cRun Full Analysis\u201d \u2014 the engine scores your checklist (weighted: critical items \u00d72), cross-references uploaded documents against DRL requirements using fuzzy matching, and outputs a combined coverage score (60% checklist + 40% DRL). (5) Review critical gaps, action items, estimated remediation costs, and recommended owners.</p>\n',
    indent + '    <p><strong style="color:#ff6b6b;">Action output:</strong> Gap Analysis generates a prioritized corrective action register (CAR) with severity ratings, cost estimates ($K), schedule targets, and assigned owners (government + contractor). Critical gaps are flagged for immediate attention. Every analysis result can be anchored to the XRP Ledger for tamper-proof audit trail.</p>\n',
    indent + '    <p><strong style="color:#00aaff;">Charts:</strong> After analysis, a radar chart shows ILS element coverage and a horizontal bar chart shows individual element scores color-coded (green \u226580%, amber \u226550%, red &lt;50%). Charts update automatically when you re-run with different parameters.</p>\n',
    indent + '</div>\n',
]

lines[target_idx:end_idx + 1] = new_block

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"\nVerification:")
for check in ['How Gap Analysis Works', 'MIL-STD-1388-1A/2B', 'combined coverage score', 'radar chart shows ILS element coverage', '_ilsElementMap', 'elements: _ilsElementMap']:
    ok = check in content
    print(f"  [{'PASS' if ok else 'FAIL'}] {check}")

print(f"\nFinal line count: {content.count(chr(10))}")
