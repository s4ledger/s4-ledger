#!/usr/bin/env python3
"""Replace demo.html one-liner samples with full realistic military documents.
Also update textarea CSS for monospaced pre-wrapped display."""

import re

FILE = 'demo-app/demo.html'

# ── 1. Full realistic military document samples ──────────────────────
NEW_SAMPLES = r"""    var samples = {
        'DD Form 1149': '═══════════════════════════════════════════════════════════════\n' +
            '                    DEPARTMENT OF DEFENSE\n' +
            '           REQUISITION AND INVOICE / SHIPPING DOCUMENT\n' +
            '                       DD FORM 1149\n' +
            '═══════════════════════════════════════════════════════════════\n' +
            'Document Number:   DD1149-2025-04821          Date: 14 APR 2025\n' +
            'Priority:          02 – URGENT                Requisitioner: SSgt A. Morales\n' +
            'Fund Code:         4A7 (O&M, Marine Corps)    Signal Code: A\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'FROM: Supply Battalion, 1st MLG\n' +
            '      Camp Pendleton, CA  92055\n' +
            '      DoDAAC: M67004\n' +
            '\n' +
            'TO:   3rd Maintenance Battalion, 1st MLG\n' +
            '      Camp Pendleton, CA  92055\n' +
            '      DoDAAC: M67399\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'LINE│ NSN                │ NOMENCLATURE            │ QTY │ UI │ UNIT PRICE │ TOTAL\n' +
            '────┼────────────────────┼─────────────────────────┼─────┼────┼────────────┼────────────\n' +
            ' 001│ 5820-01-234-5678   │ Receiver-Transmitter    │  48 │ EA │ $12,430.00 │ $596,640.00\n' +
            '    │                    │ RT-1523/SINCGARS        │     │    │            │\n' +
            ' 002│ 5985-01-451-9032   │ Antenna Group, VHF      │  48 │ EA │  $1,820.00 │  $87,360.00\n' +
            '    │                    │ OE-254/GRC              │     │    │            │\n' +
            ' 003│ 6130-01-399-7438   │ Battery, Lithium        │ 192 │ EA │    $347.50 │  $66,720.00\n' +
            '    │                    │ BA-5590/U               │     │    │            │\n' +
            '───────────────────────────────────────────────────────────────\n' +
            '                                          TOTAL: $750,720.00\n' +
            '\n' +
            'Contract:          W56HZV-24-C-0093\n' +
            'Transportation:    Government Bill of Lading – GBL 2025-44819\n' +
            'Required Delivery: NLT 28 APR 2025\n' +
            '\n' +
            '── Authorized Signature ──────────────────────────────────────\n' +
            'Name:  Capt. J. Rivera, USMC       Rank/Grade: O-3\n' +
            'Title: Supply Officer               Phone: DSN 312-725-4100\n' +
            '═══════════════════════════════════════════════════════════════',

        'DD Form 250': '═══════════════════════════════════════════════════════════════\n' +
            '                    DEPARTMENT OF DEFENSE\n' +
            '      MATERIAL INSPECTION AND RECEIVING REPORT (DD 250)\n' +
            '═══════════════════════════════════════════════════════════════\n' +
            'Report Number:  DD250-2025-07744            Date: 22 APR 2025\n' +
            'Shipment No.:   S-07744-2025\n' +
            'Contract No.:   N00024-23-C-5520            CAGE: 3R2Y7\n' +
            'Prime Contractor: L3Harris Technologies\n' +
            '                  1025 W NASA Blvd, Melbourne, FL 32919\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'SHIPPED FROM:   L3Harris – Plant 4, Melbourne FL\n' +
            'SHIPPED TO:     NAVSUP Weapon Systems Support\n' +
            '                5450 Carlisle Pike, Mechanicsburg, PA 17050\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'CLIN │ NSN                │ NOMENCLATURE              │ QTY│ UI│ UNIT PRICE   │ TOTAL\n' +
            '─────┼────────────────────┼───────────────────────────┼────┼───┼──────────────┼──────────────\n' +
            '0001 │ 5895-01-589-1027   │ AN/SLQ-32(V)6 EW Suite   │   2│ EA│ $4,200,000.00│ $8,400,000.00\n' +
            '0002 │ 5895-01-612-4401   │ Countermeasure Disp Set   │   4│ EA│   $185,000.00│   $740,000.00\n' +
            '0003 │ 5820-01-678-9921   │ SATCOM Terminal AN/USC-61│   2│ EA│   $890,000.00│ $1,780,000.00\n' +
            '0004 │ spare kit (CLIN 0001)│ Spare & Repair Parts    │   2│ LT│   $320,000.00│   $640,000.00\n' +
            '─────┼────────────────────┼───────────────────────────┼────┼───┼──────────────┼──────────────\n' +
            '                                                GRAND TOTAL: $11,560,000.00\n' +
            '\n' +
            'ACCEPTANCE:  ☑ Source   ☐ Destination\n' +
            'Inspector:   DCMA San Diego – J. Whitfield, GS-13\n' +
            'Signature:   /s/ J. Whitfield        Date: 22 APR 2025\n' +
            '\n' +
            'Contractor Rep: Mark Ellison, Dir. Quality Assurance\n' +
            'Signature:      /s/ M. Ellison        Date: 22 APR 2025\n' +
            '═══════════════════════════════════════════════════════════════',

        'WAWF Receipt': '═══════════════════════════════════════════════════════════════\n' +
            '           WIDE AREA WORKFLOW (WAWF) – RECEIVING REPORT\n' +
            '═══════════════════════════════════════════════════════════════\n' +
            'Document ID:    WAWF-RR-2025-19334          Status: ACCEPTED\n' +
            'Contract:       N00024-23-C-5520\n' +
            'Delivery Order: N00024-23-C-5520-DO-0012\n' +
            'CAGE Code:      3R2Y7 (L3Harris Technologies)\n' +
            'Vendor DUNS:    001368083\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'Ship To DoDAAC: N32253  (NAVSUP WSS Mechanicsburg)\n' +
            'Accept Point:   N32253\n' +
            'Inspect Point:  Source (DCMA San Diego)\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'LINE│ CLIN  │ NSN               │ DESCRIPTION              │ QTY│ UI│ AMT\n' +
            '────┼───────┼───────────────────┼──────────────────────────┼────┼───┼──────────────\n' +
            '  1 │ 0001  │ 5895-01-589-1027  │ EW Suite AN/SLQ-32(V)6  │   2│ EA│ $8,400,000.00\n' +
            '  2 │ 0002  │ 5895-01-612-4401  │ CM Dispensing Set        │   4│ EA│   $740,000.00\n' +
            '  3 │ 0003  │ 5820-01-678-9921  │ SATCOM AN/USC-61        │   2│ EA│ $1,780,000.00\n' +
            '  4 │ 0004  │ (CLIN 0001 spare) │ Spare & Repair Parts    │   2│ LT│   $640,000.00\n' +
            '────┼───────┼───────────────────┼──────────────────────────┼────┼───┼──────────────\n' +
            '                                            Invoice Total: $11,560,000.00\n' +
            '\n' +
            'GFM Receipt Confirmation:\n' +
            '  Received By:   PO2 T. Nakamura, USN\n' +
            '  Date Received: 24 APR 2025  0930Z\n' +
            '  Condition:     A (New / Serviceable)\n' +
            '  Discrepancies: NONE\n' +
            '\n' +
            'Acceptor:  Lt. Cmdr. S. Patel, USN (ACO)\n' +
            'Signature: /s/ S. Patel             Date: 24 APR 2025\n' +
            '═══════════════════════════════════════════════════════════════',

        'Container Manifest': '═══════════════════════════════════════════════════════════════\n' +
            '            MILITARY CONTAINER SHIPPING MANIFEST\n' +
            '         TRANSPORTATION COMMAND – USTRANSCOM / SDDC\n' +
            '═══════════════════════════════════════════════════════════════\n' +
            'Manifest ID:    CONT-USMIL-2025-5521       Date: 10 APR 2025\n' +
            'Container No.:  MSKU-7734219               Size: 20ft ISO\n' +
            'Seal Number:    4479218 (High-Security Bolt Seal)\n' +
            'Gross Weight:   14,200 kg  /  31,306 lbs\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'ORIGIN:      Naval Station Rota, Spain (DODAAC: SW3103)\n' +
            'DESTINATION: Naval Station Norfolk, VA  (DODAAC: N62788)\n' +
            'VESSEL:      USNS Bob Hope (T-AKR-300)\n' +
            'Voyage:      VBH-2025-018       ETD: 12 APR 2025\n' +
            '                                 ETA: 23 APR 2025\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'ITEM│ NSN               │ NOMENCLATURE            │ QTY│ WT(kg)│ HAZ\n' +
            '────┼───────────────────┼─────────────────────────┼────┼───────┼─────\n' +
            '  1 │ 2320-01-371-9577  │ HMMWV M1151 (engine)    │   4│  5,400│ N\n' +
            '  2 │ 2590-01-553-4810  │ HMMWV Armor Kit, B2     │   4│  3,600│ N\n' +
            '  3 │ 5895-01-589-1027  │ EW Spares (SLQ-32)      │ 1LT│  2,800│ N\n' +
            '  4 │ 1377-01-449-2990  │ Decoy Cartridge MK-214  │  20│  1,200│ Y (1.3G)\n' +
            '  5 │ 8140-01-487-3221  │ Barrier Material, HESCO │  40│  1,200│ N\n' +
            '────┼───────────────────┼─────────────────────────┼────┼───────┼─────\n' +
            '                                     Total Weight: 14,200 kg\n' +
            '\n' +
            'HAZMAT Cert:     IMDG Class 1.3G – Approved (Cert# HM-2025-0228)\n' +
            'Customs Decl:    NATO Form 302 – Ref# NF302-2025-1194\n' +
            'Security Class:  UNCLASSIFIED // FOUO\n' +
            '\n' +
            'Shipping Officer: MSgt R. Coleman, USMC\n' +
            'Signature:        /s/ R. Coleman       Date: 10 APR 2025\n' +
            '═══════════════════════════════════════════════════════════════',

        'Custody Transfer': '═══════════════════════════════════════════════════════════════\n' +
            '              CHAIN OF CUSTODY TRANSFER RECORD\n' +
            '         CONTROLLED CRYPTOGRAPHIC ITEM (CCI) TRANSFER\n' +
            '═══════════════════════════════════════════════════════════════\n' +
            'Transfer ID:   CT-2025-3389                Date: 18 APR 2025\n' +
            'Authorization: COMSEC Account 5A-7721\n' +
            'Classification: SECRET // NOFORN\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'ITEM DESCRIPTION:\n' +
            '  Nomenclature:   JTRS HMS Manpack Radio Set AN/PRC-155\n' +
            '  NSN:            5820-01-592-4202\n' +
            '  Serial No.:     PRC155-2019-003471\n' +
            '  COMSEC Acct#:   CCI-2023-88210\n' +
            '  Condition:      A (Serviceable)\n' +
            '  Last COMSEC Audit: 02 MAR 2025 – PASSED\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'RELEASING UNIT:\n' +
            '  Organization:   3rd Marine Division, Comm Co\n' +
            '  DoDAAC:         M00264\n' +
            '  Location:       MCB Camp Butler, Okinawa, Japan\n' +
            '  COMSEC Custodian: GySgt M. Tanaka\n' +
            '  Signature:      /s/ M. Tanaka         Date: 18 APR 2025\n' +
            '\n' +
            'RECEIVING UNIT:\n' +
            '  Organization:   MARCORLOGCOM, Comm Maint Div\n' +
            '  DoDAAC:         M67400\n' +
            '  Location:       MCLB Albany, GA 31704\n' +
            '  COMSEC Custodian: MSgt L. Washington\n' +
            '  Signature:      /s/ L. Washington     Date: 20 APR 2025\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'WITNESS:\n' +
            '  Name: Col. D. Reynolds, USMC\n' +
            '  Title: G-6, 3rd Marine Division\n' +
            '  Signature: /s/ D. Reynolds            Date: 18 APR 2025\n' +
            '\n' +
            'Transfer Method: Secure Air – AMC Channel Flight\n' +
            'Tracking:        TC-PRI-2025-00712\n' +
            'Two-Person Integrity: VERIFIED\n' +
            '═══════════════════════════════════════════════════════════════',

        'Maintenance Log': '═══════════════════════════════════════════════════════════════\n' +
            '              NAVAL AIR MAINTENANCE DISCREPANCY RECORD\n' +
            '                   VIDS/MAF – OPNAV 4790/2K\n' +
            '═══════════════════════════════════════════════════════════════\n' +
            'Work Order:     MX-2025-8812               Date: 25 APR 2025\n' +
            'Bureau No.:     168451                     Type/Model: CH-53K\n' +
            'Organization:   HMH-461 "Iron Horse", MAG-29, 2nd MAW\n' +
            'Location:       MCAS New River, NC\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'PHASE INSPECTION:  200-Hour Phase (Scheduled)\n' +
            'Aircraft Hours:    1,847.3 / Cycles: 923\n' +
            '───────────────────────────────────────────────────────────────\n' +
            'MAF│ WUC    │ DISCREPANCY                         │ ACTION\n' +
            '───┼────────┼─────────────────────────────────────┼──────────────────────────\n' +
            ' 1 │ 63A000 │ #1 TGB oil temp sensor reads high   │ R&R sensor P/N 70358-\n' +
            '   │        │ (238°F, limit 230°F)                │ 08300-043; ops check SAT\n' +
            ' 2 │ 14A200 │ FMC #2 Tail Rotor Servo Cyl         │ Replaced servo; leak/ops\n' +
            '   │        │ slight hydraulic seep noted          │ check SAT; RFI\n' +
            ' 3 │ 65C100 │ IFF Mode 5 self-test intermittent   │ Reseated crypto applique;\n' +
            '   │        │ failure on BIT during preflight      │ 3/3 BIT pass – RFI\n' +
            ' 4 │ 97A000 │ Blade erosion tape 3R, Sta 247-263  │ Applied erosion kit per\n' +
            '   │        │ delamination > 2in limit             │ AWR; limits restored\n' +
            '───┼────────┼─────────────────────────────────────┼──────────────────────────\n' +
            'Total Maintenance Man-Hours: 142.5\n' +
            'Aircraft Status:  FMC (Full Mission Capable)\n' +
            '\n' +
            'Quality Assurance:  SSgt D. Jimenez, CDI #447\n' +
            'Signature:          /s/ D. Jimenez        Date: 25 APR 2025\n' +
            '\n' +
            'Maintenance Officer: CWO3 K. Brooks\n' +
            'Signature:           /s/ K. Brooks        Date: 25 APR 2025\n' +
            '═══════════════════════════════════════════════════════════════'
    };"""

# ── 2. Read file ─────────────────────────────────────────────────────
with open(FILE, 'r') as f:
    content = f.read()

# ── 3. Replace the samples dict ─────────────────────────────────────
# Match from "var samples = {" through the closing "};"
pattern = re.compile(
    r'(\n    // Auto-fill sample content based on type\n)'
    r'    var samples = \{.*?\};',
    re.DOTALL
)

m = pattern.search(content)
if not m:
    print("ERROR: Could not find samples block")
    exit(1)

print(f"Found samples block at chars {m.start()}-{m.end()}")

# Build replacement: keep the comment, replace the dict
replacement = m.group(1) + NEW_SAMPLES
new_content = content[:m.start()] + replacement + content[m.end():]

# ── 4. Update textarea CSS for monospaced display ────────────────────
old_ta_css = '.demo-textarea {'
idx = new_content.find(old_ta_css)
if idx >= 0:
    # Find the closing brace of this CSS block
    brace_end = new_content.find('}', idx)
    old_block = new_content[idx:brace_end+1]
    new_block = """.demo-textarea {
            width: 100%;
            min-height: 400px;
            border: 2px solid var(--demo-border);
            border-radius: 12px;
            padding: 16px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.8rem;
            line-height: 1.4;
            white-space: pre-wrap;
            word-wrap: break-word;
            resize: vertical;
            transition: border-color 0.3s, box-shadow 0.3s;
            background: var(--demo-card-bg);
            color: var(--demo-text);
        }"""
    new_content = new_content.replace(old_block, new_block, 1)
    print("✅ Textarea CSS updated")
else:
    print("⚠️  Textarea CSS block not found")

# ── 5. Write file ───────────────────────────────────────────────────
with open(FILE, 'w') as f:
    f.write(new_content)

lines = new_content.count('\n') + 1
print(f"✅ demo.html updated – {lines} lines")
