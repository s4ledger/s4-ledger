#!/usr/bin/env python3
"""Round 13 QA verification"""
import re

import os
fpath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'demo-app', 'index.html')
print(f'Reading: {fpath}')
with open(fpath,'r') as f:
    c = f.read()

checks = [
    ('Gap Analysis title', 'How Gap Analysis Works'),
    ('Gap Analysis MIL-STD', 'MIL-STD-1388-1A/2B'),
    ('Gap Analysis scoring', 'combined coverage score'),
    ('Gap Analysis charts desc', 'radar chart shows ILS element coverage'),
    ('ilsResults elements map', '_ilsElementMap'),
    ('Element groups', '_ilsElementGroups'),
    ('Elements in ilsResults', 'elements: _ilsElementMap'),
    ('Chart data binding fix', 'Object.keys(ilsResults.elements).length > 0'),
    ('Threat MutationObserver', 'riskTableBody'),
    ('Timeline MutationObserver', 'pdmTableBody'),
    ('Vault MutationObserver', 'vaultList'),
    ('Hook dedup', '_s4ThreatHooked'),
    ('SBOM boot', 'sbomSel.options'),
    ('Master boot seq', '_bootCharts'),
    ('Boot competitive', '_bootCompetitive'),
    ('Boot tab hook', '_bootTabHook'),
    ('Boot tool hook', '_bootToolHook'),
    ('Boot calc hooks', '_bootCalcHooks'),
    ('Stripe tiers', 'S4_SUBSCRIPTION_TIERS'),
    ('createCheckoutSession', 'async function createCheckoutSession'),
    ('handleSubscriptionCallback', 'handleSubscriptionCallback'),
    ('getActiveSubscription', 'getActiveSubscription'),
    ('verifySubscription', 'async function verifySubscription'),
    ('purchaseAdditionalSLS', 'purchaseAdditionalSLS'),
    ('productionAnchor', 'async function productionAnchor'),
    ('R13 boot log', 'Round-13'),
    ('Old platform overview GONE', 'How S4 Ledger Works.*Platform Overview'),
]

passed = 0
failed = 0
for name, pattern in checks:
    if name == 'Old platform overview GONE':
        found = not bool(re.search(pattern, c))
    elif '*' in pattern:
        found = bool(re.search(pattern.replace('*', '.*'), c))
    else:
        found = pattern in c
    status = 'PASS' if found else 'FAIL'
    if found:
        passed += 1
    else:
        failed += 1
    print(f'  [{status}] {name}')

print(f'\n{passed}/{passed+failed} checks passed')
if failed == 0:
    print('ALL CHECKS PASSED')
print(f'Lines: {c.count(chr(10))}')
