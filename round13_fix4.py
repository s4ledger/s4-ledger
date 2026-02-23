#!/usr/bin/env python3
"""Round 13 — Fix 4: Use line-number-based replacement for Gap Analysis"""
import os

DIR = os.path.dirname(os.path.abspath(__file__))
FILE = os.path.join(DIR, 'demo-app', 'index.html')

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Lines: {len(lines)}")

# Find the line with "How S4 Ledger Saves Money"
target_idx = None
for i, line in enumerate(lines):
    if 'How S4 Ledger Saves Money' in line and 'Platform Overview' in line:
        target_idx = i
        break

if target_idx is None:
    print("[FAIL] Could not find 'How S4 Ledger Saves Money — Platform Overview'")
    exit(1)

print(f"Found target at line {target_idx + 1}")

# Find the closing </div> for this details block
# The structure is: <summary>...</summary>\n <div>...</div>\n </details>
# We need to find the </div> that closes this block
end_idx = None
for i in range(target_idx + 1, min(target_idx + 15, len(lines))):
    stripped = lines[i].strip()
    if stripped == '</div>':
        end_idx = i
        break

if end_idx is None:
    print("[FAIL] Could not find closing </div>")
    exit(1)

print(f"Block spans lines {target_idx + 1} to {end_idx + 1}")

# Get the indentation from the summary line
indent = lines[target_idx][:len(lines[target_idx]) - len(lines[target_idx].lstrip())]

# Build replacement lines
new_lines = [
    f'{indent}<summary style="cursor:pointer;padding:10px 0;color:#00aaff;font-weight:600;font-size:0.85rem;"><i class="fas fa-info-circle"></i> How Gap Analysis Works</summary>\n',
    f'{indent}    <div style="padding:0 0 12px;color:var(--steel);font-size:0.82rem;line-height:1.6;">\n',
    f'{indent}        <p><strong style="color:#fff;">What this tool does:</strong> The ILS Gap Analysis Engine evaluates your program\u2019s compliance with <strong>MIL-STD-1388-1A/2B</strong> Integrated Logistics Support requirements. It scores 10 ILS element areas \u2014 Supply Support, Maintenance Planning, Technical Data, Training, Configuration Management, DMSMS, PHS&amp;T, Reliability, Support Equipment, and Manpower \u2014 to identify gaps, missing deliverables, and corrective actions.</p>\n',
    f'{indent}        <p><strong style="color:#2ecc71;">Step-by-step:</strong> (1) Select your program and hull/tail number. (2) Review the generated ILS checklist and mark items as complete. (3) Upload DRL spreadsheets, CDRLs, or ILS documents for automated cross-reference. (4) Click \u201cRun Full Analysis\u201d \u2014 the engine scores your checklist (weighted: critical items \u00d72), cross-references uploaded documents against DRL requirements using fuzzy matching, and outputs a combined coverage score (60% checklist + 40% DRL). (5) Review critical gaps, action items, estimated remediation costs, and recommended owners.</p>\n',
    f'{indent}        <p><strong style="color:#ff6b6b;">Action output:</strong> Gap Analysis generates a prioritized corrective action register (CAR) with severity ratings, cost estimates ($K), schedule targets, and assigned owners (government + contractor). Critical gaps are flagged for immediate attention. Every analysis result can be anchored to the XRP Ledger for tamper-proof audit trail.</p>\n',
    f'{indent}        <p><strong style="color:#00aaff;">Charts:</strong> After analysis, a radar chart shows ILS element coverage and a horizontal bar chart shows individual element scores color-coded (green \u226580%, amber \u226550%, red &lt;50%). Charts update automatically when you re-run with different parameters.</p>\n',
    f'{indent}    </div>\n',
]

# Replace the block
lines[target_idx:end_idx + 1] = new_lines

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

checks = {
    'How Gap Analysis Works': 'How Gap Analysis Works' in content,
    'MIL-STD-1388-1A/2B': 'MIL-STD-1388-1A/2B' in content,
    'combined coverage score': 'combined coverage score' in content,
    'radar chart shows ILS element': 'radar chart shows ILS element coverage' in content,
    '_ilsElementMap': '_ilsElementMap' in content,
    '_ilsElementGroups': '_ilsElementGroups' in content,
    'elements: _ilsElementMap': 'elements: _ilsElementMap' in content,
    'Old title GONE': 'How S4 Ledger Saves Money' not in content or 'Platform Overview' not in content,
}

all_pass = True
for name, ok in checks.items():
    status = 'PASS' if ok else 'FAIL'
    if not ok:
        all_pass = False
    print(f"  [{status}] {name}")

print(f"\nLines: {content.count(chr(10))}")
if all_pass:
    print("ALL CRITICAL CHECKS PASSED")
