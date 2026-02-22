#!/usr/bin/env python3
"""Round 6 Part 1: Expand demo.html with 20 realistic military/logistics documents.
Each document is a full multi-page ASCII representation with realistic-looking data."""

import re

FILE = 'demo-app/demo.html'

# ══════════════════════════════════════════════════════════════════════
# 20 FULL REALISTIC MILITARY ILS DOCUMENTS
# ══════════════════════════════════════════════════════════════════════

DOCS = {}

# ── 1. DD Form 1149 (existing, enhanced) ─────────────────────────────
DOCS['DD Form 1149'] = r"""═══════════════════════════════════════════════════════════════
                    DEPARTMENT OF DEFENSE
           REQUISITION AND INVOICE / SHIPPING DOCUMENT
                       DD FORM 1149
═══════════════════════════════════════════════════════════════
Document Number:   DD1149-2025-04821          Date: 14 APR 2025
Priority:          02 – URGENT                Requisitioner: SSgt A. Morales
Fund Code:         4A7 (O&M, Marine Corps)    Signal Code: A
───────────────────────────────────────────────────────────────
FROM: Supply Battalion, 1st MLG
      Camp Pendleton, CA  92055
      DoDAAC: M67004

TO:   3rd Maintenance Battalion, 1st MLG
      Camp Pendleton, CA  92055
      DoDAAC: M67399
───────────────────────────────────────────────────────────────
LINE│ NSN                │ NOMENCLATURE            │ QTY │ UI │ UNIT PRICE │ TOTAL
────┼────────────────────┼─────────────────────────┼─────┼────┼────────────┼────────────
 001│ 5820-01-234-5678   │ Receiver-Transmitter    │  48 │ EA │ $12,430.00 │ $596,640.00
    │                    │ RT-1523/SINCGARS        │     │    │            │
 002│ 5985-01-451-9032   │ Antenna Group, VHF      │  48 │ EA │  $1,820.00 │  $87,360.00
    │                    │ OE-254/GRC              │     │    │            │
 003│ 6130-01-399-7438   │ Battery, Lithium        │ 192 │ EA │    $347.50 │  $66,720.00
    │                    │ BA-5590/U               │     │    │            │
 004│ 5895-01-553-2100   │ GPS Receiver AN/PSN-13  │  24 │ EA │  $8,750.00 │ $210,000.00
 005│ 5820-01-512-3344   │ Handset H-250/U         │  96 │ EA │    $142.00 │  $13,632.00
 006│ 6135-01-423-9876   │ Cable Assembly CX-4722  │  96 │ EA │     $89.00 │   $8,544.00
───────────────────────────────────────────────────────────────
                                          TOTAL: $982,896.00

Contract:          W56HZV-24-C-0093
MILSTRIP:          M67004-5042-B231
Transportation:    Government Bill of Lading – GBL 2025-44819
Required Delivery: NLT 28 APR 2025
Mode of Shipment:  Motor Freight, CONUS

PACKAGING:         MIL-STD-2073-1E, Level A, Method 10
MARKING:           MIL-STD-129R
HAZMAT:            None applicable

── Authorized Signature ──────────────────────────────────────
Name:  Capt. J. Rivera, USMC       Rank/Grade: O-3
Title: Supply Officer               Phone: DSN 312-725-4100
Date:  14 APR 2025
═══════════════════════════════════════════════════════════════"""

# ── 2. DD Form 250 (existing, enhanced) ──────────────────────────────
DOCS['DD Form 250'] = r"""═══════════════════════════════════════════════════════════════
                    DEPARTMENT OF DEFENSE
      MATERIAL INSPECTION AND RECEIVING REPORT (DD 250)
═══════════════════════════════════════════════════════════════
Report Number:  DD250-2025-07744            Date: 22 APR 2025
Shipment No.:   S-07744-2025
Contract No.:   N00024-23-C-5520            CAGE: 3R2Y7
Prime Contractor: L3Harris Technologies
                  1025 W NASA Blvd, Melbourne, FL 32919
───────────────────────────────────────────────────────────────
SHIPPED FROM:   L3Harris – Plant 4, Melbourne FL
SHIPPED TO:     NAVSUP Weapon Systems Support
                5450 Carlisle Pike, Mechanicsburg, PA 17050
───────────────────────────────────────────────────────────────
CLIN │ NSN                │ NOMENCLATURE              │ QTY│ UI│ UNIT PRICE   │ TOTAL
─────┼────────────────────┼───────────────────────────┼────┼───┼──────────────┼──────────────
0001 │ 5895-01-589-1027   │ AN/SLQ-32(V)6 EW Suite   │   2│ EA│ $4,200,000.00│ $8,400,000.00
0002 │ 5895-01-612-4401   │ Countermeasure Disp Set   │   4│ EA│   $185,000.00│   $740,000.00
0003 │ 5820-01-678-9921   │ SATCOM Terminal AN/USC-61│   2│ EA│   $890,000.00│ $1,780,000.00
0004 │ spare kit CLIN 0001│ Spare & Repair Parts      │   2│ LT│   $320,000.00│   $640,000.00
0005 │ 5895-01-701-3382   │ Radar Warning Receiver    │   4│ EA│   $175,000.00│   $700,000.00
0006 │ 6625-01-715-4410   │ Test Equipment Set        │   1│ KT│    $95,000.00│    $95,000.00
─────┼────────────────────┼───────────────────────────┼────┼───┼──────────────┼──────────────
                                                GRAND TOTAL: $12,355,000.00

ACCEPTANCE:  ☑ Source   ☐ Destination
Inspector:   DCMA San Diego – J. Whitfield, GS-13
Signature:   /s/ J. Whitfield        Date: 22 APR 2025

Contractor Rep: Mark Ellison, Dir. Quality Assurance
Signature:      /s/ M. Ellison        Date: 22 APR 2025

DISTRIBUTION:
  Copy 1 – DCMA San Diego (Inspection Office)
  Copy 2 – DFAS Columbus (Payment Office)
  Copy 3 – N00024 (Contracting Officer)
  Copy 4 – NAVSUP WSS (Receiving Activity)
  Copy 5 – L3Harris (Contractor File)
═══════════════════════════════════════════════════════════════"""

# ── 3. WAWF Receipt ──────────────────────────────────────────────────
DOCS['WAWF Receipt'] = r"""═══════════════════════════════════════════════════════════════
           WIDE AREA WORKFLOW (WAWF) – RECEIVING REPORT
═══════════════════════════════════════════════════════════════
Document ID:    WAWF-RR-2025-19334          Status: ACCEPTED
Contract:       N00024-23-C-5520
Delivery Order: N00024-23-C-5520-DO-0012
CAGE Code:      3R2Y7 (L3Harris Technologies)
Vendor DUNS:    001368083
───────────────────────────────────────────────────────────────
Ship To DoDAAC: N32253  (NAVSUP WSS Mechanicsburg)
Accept Point:   N32253
Inspect Point:  Source (DCMA San Diego)
───────────────────────────────────────────────────────────────
LINE│ CLIN  │ NSN               │ DESCRIPTION              │ QTY│ UI│ AMT
────┼───────┼───────────────────┼──────────────────────────┼────┼───┼──────────────
  1 │ 0001  │ 5895-01-589-1027  │ EW Suite AN/SLQ-32(V)6  │   2│ EA│ $8,400,000.00
  2 │ 0002  │ 5895-01-612-4401  │ CM Dispensing Set        │   4│ EA│   $740,000.00
  3 │ 0003  │ 5820-01-678-9921  │ SATCOM AN/USC-61        │   2│ EA│ $1,780,000.00
  4 │ 0004  │ (CLIN 0001 spare) │ Spare & Repair Parts    │   2│ LT│   $640,000.00
────┼───────┼───────────────────┼──────────────────────────┼────┼───┼──────────────
                                            Invoice Total: $11,560,000.00

GFM Receipt Confirmation:
  Received By:   PO2 T. Nakamura, USN
  Date Received: 24 APR 2025  0930Z
  Condition:     A (New / Serviceable)
  Discrepancies: NONE

WAWF Processing Timestamps:
  Submitted:     24 APR 2025  0945Z
  Govt Review:   24 APR 2025  1400Z
  Accepted:      24 APR 2025  1515Z
  Forwarded to DFAS: 24 APR 2025  1520Z

Acceptor:  Lt. Cmdr. S. Patel, USN (ACO)
Signature: /s/ S. Patel             Date: 24 APR 2025
═══════════════════════════════════════════════════════════════"""

# ── 4. Container Manifest ────────────────────────────────────────────
DOCS['Container Manifest'] = r"""═══════════════════════════════════════════════════════════════
            MILITARY CONTAINER SHIPPING MANIFEST
         TRANSPORTATION COMMAND – USTRANSCOM / SDDC
═══════════════════════════════════════════════════════════════
Manifest ID:    CONT-USMIL-2025-5521       Date: 10 APR 2025
Container No.:  MSKU-7734219               Size: 20ft ISO
Seal Number:    4479218 (High-Security Bolt Seal)
Gross Weight:   14,200 kg  /  31,306 lbs
───────────────────────────────────────────────────────────────
ORIGIN:      Naval Station Rota, Spain (DODAAC: SW3103)
DESTINATION: Naval Station Norfolk, VA  (DODAAC: N62788)
VESSEL:      USNS Bob Hope (T-AKR-300)
Voyage:      VBH-2025-018       ETD: 12 APR 2025
                                 ETA: 23 APR 2025
───────────────────────────────────────────────────────────────
ITEM│ NSN               │ NOMENCLATURE            │ QTY│ WT(kg)│ HAZ
────┼───────────────────┼─────────────────────────┼────┼───────┼─────
  1 │ 2320-01-371-9577  │ HMMWV M1151 (engine)    │   4│  5,400│ N
  2 │ 2590-01-553-4810  │ HMMWV Armor Kit, B2     │   4│  3,600│ N
  3 │ 5895-01-589-1027  │ EW Spares (SLQ-32)      │ 1LT│  2,800│ N
  4 │ 1377-01-449-2990  │ Decoy Cartridge MK-214  │  20│  1,200│ Y (1.3G)
  5 │ 8140-01-487-3221  │ Barrier Material, HESCO │  40│  1,200│ N
────┼───────────────────┼─────────────────────────┼────┼───────┼─────
                                     Total Weight: 14,200 kg

HAZMAT Cert:     IMDG Class 1.3G – Approved (Cert# HM-2025-0228)
Customs Decl:    NATO Form 302 – Ref# NF302-2025-1194
Security Class:  UNCLASSIFIED // FOUO

Shipping Officer: MSgt R. Coleman, USMC
Signature:        /s/ R. Coleman       Date: 10 APR 2025
═══════════════════════════════════════════════════════════════"""

# ── 5. Custody Transfer ──────────────────────────────────────────────
DOCS['Custody Transfer'] = r"""═══════════════════════════════════════════════════════════════
              CHAIN OF CUSTODY TRANSFER RECORD
         CONTROLLED CRYPTOGRAPHIC ITEM (CCI) TRANSFER
═══════════════════════════════════════════════════════════════
Transfer ID:   CT-2025-3389                Date: 18 APR 2025
Authorization: COMSEC Account 5A-7721
Classification: SECRET // NOFORN
───────────────────────────────────────────────────────────────
ITEM DESCRIPTION:
  Nomenclature:   JTRS HMS Manpack Radio Set AN/PRC-155
  NSN:            5820-01-592-4202
  Serial No.:     PRC155-2019-003471
  COMSEC Acct#:   CCI-2023-88210
  Condition:      A (Serviceable)
  Last COMSEC Audit: 02 MAR 2025 – PASSED
───────────────────────────────────────────────────────────────
RELEASING UNIT:
  Organization:   3rd Marine Division, Comm Co
  DoDAAC:         M00264
  Location:       MCB Camp Butler, Okinawa, Japan
  COMSEC Custodian: GySgt M. Tanaka
  Signature:      /s/ M. Tanaka         Date: 18 APR 2025

RECEIVING UNIT:
  Organization:   MARCORLOGCOM, Comm Maint Div
  DoDAAC:         M67400
  Location:       MCLB Albany, GA 31704
  COMSEC Custodian: MSgt L. Washington
  Signature:      /s/ L. Washington     Date: 20 APR 2025
───────────────────────────────────────────────────────────────
WITNESS:
  Name: Col. D. Reynolds, USMC
  Title: G-6, 3rd Marine Division
  Signature: /s/ D. Reynolds            Date: 18 APR 2025

Transfer Method: Secure Air – AMC Channel Flight
Tracking:        TC-PRI-2025-00712
Two-Person Integrity: VERIFIED
═══════════════════════════════════════════════════════════════"""

# ── 6. Maintenance Log ───────────────────────────────────────────────
DOCS['Maintenance Log'] = r"""═══════════════════════════════════════════════════════════════
              NAVAL AIR MAINTENANCE DISCREPANCY RECORD
                   VIDS/MAF – OPNAV 4790/2K
═══════════════════════════════════════════════════════════════
Work Order:     MX-2025-8812               Date: 25 APR 2025
Bureau No.:     168451                     Type/Model: CH-53K
Organization:   HMH-461 "Iron Horse", MAG-29, 2nd MAW
Location:       MCAS New River, NC
───────────────────────────────────────────────────────────────
PHASE INSPECTION:  200-Hour Phase (Scheduled)
Aircraft Hours:    1,847.3 / Cycles: 923
───────────────────────────────────────────────────────────────
MAF│ WUC    │ DISCREPANCY                         │ ACTION
───┼────────┼─────────────────────────────────────┼──────────────────────────
 1 │ 63A000 │ #1 TGB oil temp sensor reads high   │ R&R sensor P/N 70358-
   │        │ (238°F, limit 230°F)                │ 08300-043; ops check SAT
 2 │ 14A200 │ FMC #2 Tail Rotor Servo Cyl         │ Replaced servo; leak/ops
   │        │ slight hydraulic seep noted          │ check SAT; RFI
 3 │ 65C100 │ IFF Mode 5 self-test intermittent   │ Reseated crypto applique;
   │        │ failure on BIT during preflight      │ 3/3 BIT pass – RFI
 4 │ 97A000 │ Blade erosion tape 3R, Sta 247-263  │ Applied erosion kit per
   │        │ delamination > 2in limit             │ AWR; limits restored
 5 │ 42A000 │ Canopy seal LH – minor moisture     │ Replaced seal P/N GS301-
   │        │ intrusion noted after rain ops       │ 1025; leak check SAT
 6 │ 71A000 │ APU exhaust temp elevated +15°C     │ Cleaned compressor inlet;
   │        │ above baseline during ground run     │ performance within limits
───┼────────┼─────────────────────────────────────┼──────────────────────────
Total Maintenance Man-Hours: 186.5
Aircraft Downtime:  4.2 days
Aircraft Status:  FMC (Full Mission Capable)

Quality Assurance:  SSgt D. Jimenez, CDI #447
Signature:          /s/ D. Jimenez        Date: 25 APR 2025

Maintenance Officer: CWO3 K. Brooks
Signature:           /s/ K. Brooks        Date: 25 APR 2025
═══════════════════════════════════════════════════════════════"""

# ── 7. Contract Modification (multi-page) ────────────────────────────
DOCS['Contract Modification'] = r"""═══════════════════════════════════════════════════════════════
              STANDARD FORM 30 – AMENDMENT OF SOLICITATION /
                    MODIFICATION OF CONTRACT
═══════════════════════════════════════════════════════════════
                                                  Page 1 of 8

1. CONTRACT ID CODE:  A (Fixed-Price)
2. AMENDMENT/MODIFICATION NO.: P00017
3. EFFECTIVE DATE: 15 MAR 2025
4. REQUISITION/PURCHASE REQ. NO.: N/A
5. PROJECT NO.: N/A
6. ISSUED BY:               7. ADMINISTERED BY (If other):
   NAVSEA                      DCMA San Diego
   1333 Isaac Hull Ave SE      9174 Sky Park Court
   Washington, DC 20376        San Diego, CA 92123
   Code: SEA 02                Code: S2101A

8. NAME AND ADDRESS OF CONTRACTOR:
   L3Harris Technologies, Inc.
   1025 W NASA Blvd
   Melbourne, FL 32919
   CAGE: 3R2Y7    DUNS: 001368083

9. TYPE OF MODIFICATION:
   ☑ Bilateral – Signed by both parties
   ☐ Unilateral – Signed only by Contracting Officer

10. CONTRACT NO.: N00024-23-C-5520     TASK ORDER: N/A
11. ORIGINAL CONTRACT DATE: 28 SEP 2023
═══════════════════════════════════════════════════════════════
                                                  Page 2 of 8

12. DESCRIPTION OF MODIFICATION:

SECTION I – ADMINISTRATIVE CHANGES
────────────────────────────────────────────────────────────
a) The Period of Performance is hereby extended from
   30 SEP 2025 to 31 MAR 2026 (6-month extension).
b) The Contracting Officer Representative (COR) is changed:
   FROM: Mr. David Chen, Code 521
   TO:   Ms. Sarah Kim, Code 521, sarah.kim@navy.mil
c) The Government Furnished Property (GFP) list at
   Attachment J-008 is updated per Attachment A hereto.

SECTION II – SCOPE CHANGES
────────────────────────────────────────────────────────────
a) CLIN 0001 – AN/SLQ-32(V)6 EW Suite:
   Quantity increased from 8 EA to 10 EA (+2 units)
   Unit Price unchanged: $4,200,000.00
   CLIN 0001 Total: FROM $33,600,000.00 TO $42,000,000.00

b) NEW CLIN 0007 is hereby added:
   CLIN 0007 – Engineering Change Proposal (ECP) N-2025-041
   "Software Update v4.2.1 – Threat Library Expansion"
   ───────────────────────────────────────────────
   Qty: 10 EA (applied to all delivered units)
   Unit Price: $185,000.00
   CLIN Total: $1,850,000.00
   Delivery:   NLT 90 days ARO

c) NEW CLIN 0008:
   CLIN 0008 – Field Service Representative Support
   ───────────────────────────────────────────────
   12 months × 2 FSRs × $28,500/mo = $684,000.00
═══════════════════════════════════════════════════════════════
                                                  Page 3 of 8

SECTION III – FINANCIAL SUMMARY
────────────────────────────────────────────────────────────
                            Previous       This Mod      New Total
CLIN 0001 (EW Suite)     $33,600,000.00  +$8,400,000.00  $42,000,000.00
CLIN 0002 (CM Disp)        $740,000.00           $0.00     $740,000.00
CLIN 0003 (SATCOM)       $1,780,000.00           $0.00   $1,780,000.00
CLIN 0004 (Spares)         $640,000.00           $0.00     $640,000.00
CLIN 0005 (RWR)            $700,000.00           $0.00     $700,000.00
CLIN 0006 (Test Equip)      $95,000.00           $0.00      $95,000.00
CLIN 0007 (SW Update)             $0.00  +$1,850,000.00   $1,850,000.00
CLIN 0008 (FSR Support)           $0.00    +$684,000.00     $684,000.00
─────────────────────────────────────────────────────────────
CONTRACT TOTAL           $37,555,000.00 +$10,934,000.00  $48,489,000.00

FUNDING:
  Previous Obligated:  $37,555,000.00
  This Action:        +$10,934,000.00
  Total Obligated:     $48,489,000.00
  Appropriation:       1711319  (SCN – Shipbuilding & Conv, Navy)
  ACRN: AA             PR No.: N00024-25-NR-00412

                                                  Page 4 of 8
SECTION IV – DELIVERY SCHEDULE (REVISED)
────────────────────────────────────────────────────────────
CLIN │ Description          │ Qty │ Original     │ Revised
─────┼──────────────────────┼─────┼──────────────┼──────────────
0001 │ EW Suite (Units 1-8) │   8 │ 30 SEP 2025  │ 30 SEP 2025
0001 │ EW Suite (Units 9-10)│   2 │ N/A          │ 31 MAR 2026
0002 │ CM Dispensing Sets   │   4 │ 30 SEP 2025  │ 30 SEP 2025
0003 │ SATCOM Terminals     │   2 │ 30 SEP 2025  │ 30 SEP 2025
0004 │ Spares Kits          │   2 │ 30 SEP 2025  │ 30 SEP 2025
0005 │ Radar Warning Rcvrs  │   4 │ 15 AUG 2025  │ 15 AUG 2025
0006 │ Test Equipment       │   1 │ 15 AUG 2025  │ 15 AUG 2025
0007 │ SW Update v4.2.1     │  10 │ N/A          │ 15 JUN 2025
0008 │ FSR Support (Start)  │ 12mo│ N/A          │ 01 APR 2025
═══════════════════════════════════════════════════════════════
                                                  Page 5 of 8

SECTION V – SPECIAL PROVISIONS
────────────────────────────────────────────────────────────
H-101: ITAR RESTRICTIONS – All technical data, software,
and defense articles under this contract are controlled
under the International Traffic in Arms Regulations (ITAR),
22 CFR 120-130. No export or re-transfer is authorized
without prior written approval of DDTC.

H-102: CYBERSECURITY – The Contractor shall comply with
DFARS 252.204-7012 (Safeguarding Covered Defense Info)
and maintain CMMC Level 2 certification throughout the
period of performance.

H-103: COUNTERFEIT PARTS PREVENTION – The Contractor
shall comply with DFARS 252.246-7008 and maintain a
counterfeit parts prevention program per SAE AS6174.
All parts shall be procured from OCM/OEM or authorized
distributors only.

H-104: WARRANTY – The Contractor provides a 24-month
warranty from date of Government acceptance per CLIN.
Warranty repair turnaround: NTE 30 calendar days.

                                                  Page 6 of 8
SECTION VI – GOVERNMENT FURNISHED PROPERTY (UPDATED)
────────────────────────────────────────────────────────────
GFP│ NSN               │ DESCRIPTION               │ QTY│ VALUE
───┼───────────────────┼───────────────────────────┼────┼──────────
 1 │ 5895-01-544-0012  │ AN/SLQ-32 Test Fixture    │   1│ $890,000
 2 │ 6625-01-580-3311  │ RF Signal Generator       │   2│ $125,000
 3 │ 7025-01-601-2209  │ EW Simulation Computer    │   1│ $340,000
 4 │ 5895-01-620-7788  │ CW Antenna Coupler (NEW)  │   2│ $78,000
───┼───────────────────┼───────────────────────────┼────┼──────────
                                         GFP Total: $1,433,000

                                                  Page 7 of 8
SECTION VII – POINTS OF CONTACT
────────────────────────────────────────────────────────────
Contracting Officer:    Ms. Rebecca Torres
                        NAVSEA SEA 02
                        rebecca.torres@navy.mil
                        (202) 781-4100

COR (New):              Ms. Sarah Kim
                        PMS 500, Code 521
                        sarah.kim@navy.mil
                        (619) 553-7200

Contractor Program Mgr: Mr. James Harrington
                        L3Harris Technologies
                        james.harrington@l3harris.com
                        (321) 727-9100 x4412

DCMA ACO:               Mr. Paul Ogawa
                        DCMA San Diego
                        paul.ogawa@dcma.mil
                        (858) 537-6200

                                                  Page 8 of 8
═══════════════════════════════════════════════════════════════
13. CONTRACTOR SIGNATURE:
    Name:  James Harrington, Program Manager
    Signed: /s/ J. Harrington        Date: 12 MAR 2025

14. GOVERNMENT SIGNATURE:
    Name:  Rebecca Torres, Contracting Officer
    Title: PCO, NAVSEA SEA 02
    Signed: /s/ R. Torres            Date: 15 MAR 2025
═══════════════════════════════════════════════════════════════"""

# ── 8. Spares Spreadsheet ────────────────────────────────────────────
DOCS['Spares Spreadsheet'] = r"""═══════════════════════════════════════════════════════════════
     VENDOR RECOMMENDED SPARES LIST (VRSL) – DDG-51 CLASS
         AN/SLQ-32(V)6 ELECTRONIC WARFARE SUITE
═══════════════════════════════════════════════════════════════
Contract: N00024-23-C-5520    CAGE: 3R2Y7     Date: 18 APR 2025
Program:  DDG-51 Flight III   Prepared By: L3Harris ILS Dept
Document: VRSL-SLQ32-2025-R3  Status: APPROVED

ITEM│ NSN               │ PART NUMBER     │ NOMENCLATURE                   │ QTY│ UI│ UM PRICE   │ EXT PRICE   │ SRC│ SMR   │ ESSENTIALITY│ MTBF(hrs)│ NOTES
────┼───────────────────┼─────────────────┼────────────────────────────────┼────┼───┼────────────┼─────────────┼────┼───────┼─────────────┼──────────┼──────────
  1 │ 5961-01-589-2001  │ 73-10-0201-003  │ RF Amplifier Module, High-Power│   4│ EA│  $42,500.00│  $170,000.00│ DLA│ PAOZZ │ Critical    │    2,200 │ Long Lead
  2 │ 5961-01-589-2002  │ 73-10-0201-007  │ RF Amplifier Module, Low-Noise │   4│ EA│  $18,900.00│   $75,600.00│ DLA│ PAOZZ │ Critical    │    3,500 │ DMSMS Alert
  3 │ 5962-01-589-3001  │ 73-20-0350-001  │ Digital Signal Processor Board │   3│ EA│  $67,200.00│  $201,600.00│ DLA│ PAOZZ │ Critical    │    5,000 │ ECP-041 Rev
  4 │ 5998-01-589-4001  │ 73-30-0400-012  │ Power Supply Module, 28VDC     │   6│ EA│   $4,800.00│   $28,800.00│ DLA│ PAOZZ │ Essential   │    8,000 │
  5 │ 5999-01-589-5001  │ 73-30-0410-004  │ Cable Assembly, RF Coaxial     │  12│ EA│   $1,250.00│   $15,000.00│ DLA│ PAOZB │ Essential   │   25,000 │
  6 │ 5985-01-589-6001  │ 73-40-0500-001  │ Antenna Element, Broadband     │   2│ EA│  $31,400.00│   $62,800.00│ DLA│ PAOZZ │ Critical    │   12,000 │
  7 │ 5985-01-589-6002  │ 73-40-0500-008  │ Antenna Rotary Joint           │   2│ EA│  $12,700.00│   $25,400.00│ DLA│ PAOZZ │ Essential   │   15,000 │
  8 │ 5895-01-589-7001  │ 73-50-0600-003  │ Countermeasure Controller PCB  │   3│ EA│  $28,600.00│   $85,800.00│ DLA│ PAOZZ │ Critical    │    4,500 │
  9 │ 5820-01-589-8001  │ 73-50-0610-001  │ SATCOM Interface Module        │   2│ EA│  $22,100.00│   $44,200.00│ DLA│ PAOZZ │ Essential   │    6,000 │
 10 │ 6625-01-589-9001  │ 73-60-0700-002  │ Built-In Test Module           │   2│ EA│  $15,300.00│   $30,600.00│ DLA│ PAPZZ │ Essential   │    9,000 │
 11 │ 6110-01-590-0001  │ 73-70-0100-005  │ Cooling Fan Assembly           │   8│ EA│   $2,100.00│   $16,800.00│ DLA│ PAOZB │ Desirable   │   12,000 │
 12 │ 5340-01-590-0002  │ 73-70-0100-012  │ EMI Gasket Set                 │  20│ EA│     $340.00│    $6,800.00│ DLA│ XBOZB │ Desirable   │   50,000 │
 13 │ 5999-01-590-0003  │ 73-70-0100-019  │ Fiber Optic Cable, 2m         │   8│ EA│     $890.00│    $7,120.00│ DLA│ PAOZB │ Essential   │   40,000 │
 14 │ 5905-01-590-1001  │ 73-80-0200-003  │ RF Connector SMA-N Adapter    │  24│ EA│     $125.00│    $3,000.00│ COM│ XAOZB │ Desirable   │  100,000 │
 15 │ 6135-01-590-1002  │ 73-80-0200-010  │ Wiring Harness, Main          │   2│ EA│   $8,450.00│   $16,900.00│ DLA│ PAOZZ │ Essential   │   20,000 │
 16 │ 5962-01-590-2001  │ 73-20-0350-008  │ FPGA Processor Card           │   2│ EA│  $54,300.00│  $108,600.00│ DLA│ PAOZZ │ Critical    │    6,000 │ DMSMS Alert
 17 │ 5895-01-590-3001  │ 73-50-0620-004  │ Threat ID Correlation Module  │   2│ EA│  $38,900.00│   $77,800.00│ DLA│ PAOZZ │ Critical    │    5,500 │
 18 │ 5820-01-590-4001  │ 73-90-0300-001  │ GPS Timing Module             │   2│ EA│  $11,200.00│   $22,400.00│ DLA│ PAOZZ │ Essential   │    8,500 │
 19 │ 5961-01-590-5001  │ 73-10-0201-015  │ Traveling Wave Tube (TWT)     │   4│ EA│  $56,700.00│  $226,800.00│ DLA│ PAOZD │ Critical    │    3,000 │ Long Lead
 20 │ 5998-01-590-6001  │ 73-30-0400-020  │ UPS Battery Pack              │   6│ EA│   $2,850.00│   $17,100.00│ DLA│ PAOZB │ Essential   │    4,000 │
 21 │ 6695-01-590-7001  │ 73-60-0710-002  │ Environmental Sensor Module   │   4│ EA│   $3,200.00│   $12,800.00│ DLA│ XAOZB │ Desirable   │   15,000 │
 22 │ 5895-01-590-8001  │ 73-50-0630-001  │ Jammer Transmitter Module     │   3│ EA│  $89,400.00│  $268,200.00│ DLA│ PAOZD │ Critical    │    2,500 │ Long Lead
 23 │ 5998-01-590-9001  │ 73-30-0410-009  │ Fiber Optic Transceiver       │   6│ EA│   $4,100.00│   $24,600.00│ DLA│ PAOZZ │ Essential   │    7,500 │
 24 │ 5895-01-591-0001  │ 73-50-0640-002  │ ECM Controller Card           │   2│ EA│  $41,200.00│   $82,400.00│ DLA│ PAOZZ │ Critical    │    4,800 │
 25 │ 5820-01-591-1001  │ 73-90-0310-005  │ Freq Synthesizer Module       │   2│ EA│  $33,700.00│   $67,400.00│ DLA│ PAOZZ │ Critical    │    5,200 │
────┼───────────────────┼─────────────────┼────────────────────────────────┼────┼───┼────────────┼─────────────┼────┼───────┼─────────────┼──────────┼──────────
                                                                VRSL TOTAL:                        $1,678,220.00

SMR CODE KEY:  PA=Procure/Assemble  XA=Not Reparable  XB=Bench Repair  D=Depot  O=Org  Z=Non-Reparable  B=Bench
ESSENTIALITY:  Critical=Mission-essential  Essential=Needed for ops  Desirable=Nice-to-have
SRC:           DLA=Defense Logistics Agency  COM=Commercial Source

APPROVED BY:
  L3Harris ILS Manager: T. Rodriguez    Date: 18 APR 2025
  NAVSUP WSS POC:       Lt. A. Foster   Date: 22 APR 2025
═══════════════════════════════════════════════════════════════"""

# ── 9. COTS Manual (excerpt) ─────────────────────────────────────────
DOCS['COTS Manual'] = r"""═══════════════════════════════════════════════════════════════
         COMMERCIAL-OFF-THE-SHELF (COTS) EQUIPMENT MANUAL
                   OPERATOR/MAINTENANCE GUIDE
═══════════════════════════════════════════════════════════════

                    L3HARRIS TECHNOLOGIES
                    DEFENSE ELECTRONIC SYSTEMS

           AN/SLQ-32(V)6 ELECTRONIC WARFARE SUITE
            OPERATOR AND INTERMEDIATE MAINTENANCE
                     TECHNICAL MANUAL

     Publication No.: TM-SLQ32-V6-001      Rev: D
     Date:            15 JAN 2025
     Classification:  UNCLASSIFIED // FOUO
     Distribution:    Statement D – DoD and U.S. DoD
                      Contractors Only

═══════════════════════════════════════════════════════════════
                     TABLE OF CONTENTS
═══════════════════════════════════════════════════════════════
Chapter 1 – General Information ................ Page 1-1
  1.1  Equipment Description ................... Page 1-1
  1.2  Intended Use ............................ Page 1-3
  1.3  Technical Characteristics ............... Page 1-4
  1.4  Equipment Data .......................... Page 1-8
Chapter 2 – Operating Instructions ............. Page 2-1
  2.1  Controls and Indicators ................. Page 2-1
  2.2  System Power-Up Procedures .............. Page 2-6
  2.3  Normal Operating Procedures ............. Page 2-12
  2.4  Tactical Modes of Operation ............. Page 2-18
  2.5  Emergency Procedures .................... Page 2-24
Chapter 3 – Operator Maintenance ............... Page 3-1
  3.1  Preventive Maintenance Checks ........... Page 3-1
  3.2  Cleaning and Inspection ................. Page 3-4
Chapter 4 – Troubleshooting .................... Page 4-1
  4.1  Fault Isolation Procedures .............. Page 4-1
  4.2  Built-In Test (BIT) Description ......... Page 4-8
  4.3  Troubleshooting Procedures .............. Page 4-12
Chapter 5 – Intermediate Maintenance ........... Page 5-1
  5.1  Module Removal and Replacement .......... Page 5-1
  5.2  Alignment and Calibration ............... Page 5-15
  5.3  Parts Replacement ....................... Page 5-22
Appendix A – Parts List ....................... Page A-1
Appendix B – Wiring Diagrams .................. Page B-1
Appendix C – Illustrated Parts Breakdown ....... Page C-1
═══════════════════════════════════════════════════════════════
                    CHAPTER 1
              GENERAL INFORMATION
═══════════════════════════════════════════════════════════════
1.1  EQUIPMENT DESCRIPTION

1.1.1  The AN/SLQ-32(V)6 is the latest variant of the
Surface Electronic Warfare Improvement Program (SEWIP)
Block 3 system. It provides passive Electronic Support
(ES), active Electronic Attack (EA), and integrated
countermeasures control for DDG-51 Flight III class
destroyers and other surface combatants.

1.1.2  The system consists of the following major
components:

  a) Antenna Group (4 arrays, topside mounted)
     - Broadband DF/Intercept Arrays (2)
     - Active EA Transmit Arrays (2)
     - Operating Frequency: 0.5 – 40 GHz

  b) Below Decks Equipment Group
     - Equipment Cabinet A (Signal Processor)
     - Equipment Cabinet B (Threat Evaluation)
     - Equipment Cabinet C (EA Controller)
     - Equipment Cabinet D (Power Distribution)
     - Operator Console OJ-794/SLQ-32

  c) Countermeasure Dispensing System
     - MK-36 SRBOC Launchers (4 stations)
     - MK-53 Decoy Launching System (Nulka)
     - Integrated CM Controller

1.1.3  PHYSICAL CHARACTERISTICS:
  Weight (Total Installed):    4,200 kg (9,259 lbs)
  Power Required:              440V 3-Phase, 60Hz, 45kVA
  Cooling:                     Seawater-to-chilled water
  Operating Temperature:       0°C to +50°C
  Storage Temperature:         -40°C to +65°C
  Humidity:                    0–95% RH (non-condensing)
  MIL-STD-810H:                Method 514.8 (Vibration)
  EMI/EMC:                     MIL-STD-461G compliant

═══════════════════════════════════════════════════════════════
1.2  INTENDED USE

This equipment provides shipboard electronic warfare
capability to detect, identify, locate, and counter
radio frequency threats including:
  • Anti-ship cruise missiles (ASCM)
  • Surface-to-air missile seekers
  • Fire control and target tracking radars
  • Surveillance and early warning radars
  • Communication intercept and DF

The system operates autonomously or under operator
control, with threat library updates received via
the SEWIP Program Office distribution channel.

═══════════════════════════════════════════════════════════════
1.4  EQUIPMENT DATA

TABLE 1-1: SYSTEM PERFORMANCE PARAMETERS
─────────────────────────────────────────────────────────
Parameter                │ Specification
─────────────────────────┼───────────────────────────────
Frequency Coverage       │ 0.5 – 40 GHz
Sensitivity              │ -65 dBm (typical)
Dynamic Range            │ > 80 dB
DF Accuracy              │ < 2° RMS
Simultaneous Track Cap.  │ > 256 emitters
Threat ID Time           │ < 1.5 sec (known threats)
Reaction Time (EA)       │ < 0.5 sec
MTBF (System)            │ > 1,200 hours
MTTR (Org Level)         │ < 0.5 hours
Availability             │ > 99.2%
─────────────────────────────────────────────────────────

TABLE 1-2: POWER REQUIREMENTS BY CABINET
─────────────────────────────────────────────────────────
Cabinet    │ Voltage│ Phase│ Freq │ Max Draw │ Breaker
───────────┼────────┼──────┼──────┼──────────┼─────────
Cabinet A  │ 440V   │  3Ø  │ 60Hz │ 12 kVA   │ 30A
Cabinet B  │ 440V   │  3Ø  │ 60Hz │ 10 kVA   │ 25A
Cabinet C  │ 440V   │  3Ø  │ 60Hz │ 15 kVA   │ 40A
Cabinet D  │ 440V   │  3Ø  │ 60Hz │  8 kVA   │ 20A
Console    │ 115V   │  1Ø  │ 60Hz │  2 kVA   │ 15A
───────────┼────────┼──────┼──────┼──────────┼─────────
                              Total: 47 kVA
═══════════════════════════════════════════════════════════════"""

# ── 10. Tech Manual ──────────────────────────────────────────────────
DOCS['Tech Manual'] = r"""═══════════════════════════════════════════════════════════════
              NAVSEA TECHNICAL MANUAL
    OPERATION AND MAINTENANCE INSTRUCTIONS WITH IPB
═══════════════════════════════════════════════════════════════

TMINS: S9593-BC-MMI-010/SLQ-32(V)6   Volume: 1 of 3
Rev:   7                              Date: 01 FEB 2025
Classification: UNCLASSIFIED // FOUO
Dist Statement: C – USG Agencies & Contractors

═════════════════════════════════════════
 CHAPTER 5 – MODULE REMOVAL & REPLACEMENT
═════════════════════════════════════════

5.1  RF AMPLIFIER MODULE (HIGH-POWER)
     P/N: 73-10-0201-003    NSN: 5961-01-589-2001

5.1.1  REMOVAL PROCEDURE

  WARNING: HIGH VOLTAGE. Ensure power supply is
  de-energized and DANGER tag applied per
  NAVSEA ST000-AB-GYD-010 before performing
  any maintenance on RF amplifier modules.

  WARNING: RF RADIATION. Verify all antenna
  emissions are secured. Obtain RADHAZ clearance
  from Weapons Officer before opening Cabinet C.

  CAUTION: ESD-sensitive components. Wear grounded
  wrist strap at all times during this procedure.

  STEP 1:  De-energize Cabinet C per Section 2.2.4.
           Verify all status indicators are OFF on
           front panel. Wait 5 minutes for capacitor
           discharge.

  STEP 2:  Open Cabinet C front access door.
           Remove 8x Dzus fasteners (1/4 turn CCW).
           Stow door in open/locked position.

  STEP 3:  Disconnect the following cables from
           Module A3 (RF Amplifier, High-Power):
           a) RF Input   – W301 (SMA connector)
           b) RF Output  – W302 (N-type connector)
           c) Power      – W303 (28VDC, Cannon plug)
           d) Control    – W304 (37-pin D-sub)
           e) Cooling    – Disconnect quick-disconnect
              fittings on coolant inlet/outlet lines

  STEP 4:  Remove 4x captive mounting screws
           (Phillips #3, torque: 45 in-lb).
           Module weight: 8.2 kg (18 lbs).
           Support module during extraction.

  STEP 5:  Carefully slide module straight out on
           guide rails. Place on ESD-safe work surface.

  STEP 6:  Install protective caps on all connectors:
           a) RF ports – SMA/N-type dust caps
           b) Electrical – connector savers
           c) Coolant – line plugs (prevent drip)

5.1.2  INSTALLATION PROCEDURE

  STEP 1:  Inspect replacement module:
           a) Verify P/N and S/N on data plate
           b) Check for shipping damage
           c) Remove protective caps (save for reuse)
           d) Verify configuration per TDMIS

  STEP 2:  Align module on guide rails.
           Slide fully into position until
           locking detents engage (audible click).

  STEP 3:  Secure 4x captive mounting screws.
           Torque: 45 in-lb ± 5 in-lb.
           Torque pattern: diagonal, 2-pass.

  STEP 4:  Reconnect cables:
           a) W301 – RF Input (SMA, 8 in-lb)
           b) W302 – RF Output (N-type, 12 in-lb)
           c) W303 – Power (bayonet, verify pin align)
           d) W304 – Control (D-sub, jackscrews finger
              tight + 1/4 turn)
           e) Coolant lines – push QD fittings until
              locked. Verify no leaks.

  STEP 5:  Perform post-installation BIT:
           a) Energize Cabinet C per Section 2.2.3
           b) Initiate Module BIT from Console:
              MENU > MAINTENANCE > BIT > A3 MODULE
           c) Verify BIT PASS indication
           d) Record BIT results in OMMS-NG

  STEP 6:  Perform Operational Test:
           a) Select TEST mode from Operator Console
           b) Run RF Power Output test per Section 4.3.2
           c) Verify output within +/- 1 dB of nominal
           d) Record results in 2K VIDS/MAF

═══════════════════════════════════════════
 5.2  DIGITAL SIGNAL PROCESSOR BOARD
      P/N: 73-20-0350-001    NSN: 5962-01-589-3001
═══════════════════════════════════════════

  [Similar R&R procedures for all modules continue
   through Sections 5.3 – 5.14, covering all 25
   VRSL line items. Total manual: 847 pages.]

═══════════════════════════════════════════
 APPENDIX A – PARTS LIST (EXCERPT)
═══════════════════════════════════════════

FIG│ IDX│ NSN               │ PART NUMBER     │ DESCRIPTION              │ QTY
───┼────┼───────────────────┼─────────────────┼──────────────────────────┼────
 1 │  1 │ 5961-01-589-2001  │ 73-10-0201-003  │ RF Amplifier, HP         │   1
 1 │  2 │ 5961-01-589-2002  │ 73-10-0201-007  │ RF Amplifier, LN         │   1
 1 │  3 │ 5962-01-589-3001  │ 73-20-0350-001  │ DSP Board                │   1
 1 │  4 │ 5998-01-589-4001  │ 73-30-0400-012  │ Power Supply, 28VDC      │   1
 1 │  5 │ 5999-01-589-5001  │ 73-30-0410-004  │ Cable Assy, RF Coax      │   2
 1 │  6 │ 5985-01-589-6001  │ 73-40-0500-001  │ Antenna Element          │   1
 1 │  7 │ 5895-01-589-7001  │ 73-50-0600-003  │ CM Controller PCB        │   1
 1 │  8 │ 5820-01-589-8001  │ 73-50-0610-001  │ SATCOM Interface Mod     │   1
 1 │  9 │ 6110-01-590-0001  │ 73-70-0100-005  │ Cooling Fan Assy         │   2
 1 │ 10 │ 5340-01-590-0002  │ 73-70-0100-012  │ EMI Gasket Set           │   1
 1 │ 11 │ 5999-01-590-0003  │ 73-70-0100-019  │ Fiber Optic Cable, 2m    │   2
───┼────┼───────────────────┼─────────────────┼──────────────────────────┼────
═══════════════════════════════════════════════════════════════"""

# ── 11. Tech Manual Index Spreadsheet ────────────────────────────────
DOCS['TM Index'] = r"""═══════════════════════════════════════════════════════════════
         TECHNICAL MANUAL INDEX – DDG-51 FLIGHT III CLASS
            NAVSEA / NSWCCD-SSES TECHNICAL PUBLICATIONS
═══════════════════════════════════════════════════════════════
As of:  01 APR 2025          Prepared By: PMS 400D ILS Team
Classification: UNCLASSIFIED  Total Manuals: 47

TMINS                          │ TITLE                                    │ VOL │ PAGES│ REV │ DATE      │ FORMAT │ STATUS
───────────────────────────────┼──────────────────────────────────────────┼─────┼──────┼─────┼───────────┼────────┼──────────
S9593-BC-MMI-010/SLQ-32(V)6   │ EW Suite – O&I Level Maintenance         │ 1/3 │   847│  7  │ 01FEB2025 │ IETM   │ Current
S9593-BC-MMI-010/SLQ-32(V)6   │ EW Suite – Depot Level Maintenance       │ 2/3 │   412│  5  │ 15DEC2024 │ IETM   │ Current
S9593-BC-MMI-010/SLQ-32(V)6   │ EW Suite – Illustrated Parts Breakdown   │ 3/3 │   298│  6  │ 01FEB2025 │ IETM   │ Current
S9086-KC-STM-010              │ NSTM Ch 400 – Electronics               │ 1/1 │   340│ 12  │ 01OCT2024 │ PDF    │ Current
S9086-S3-STM-010              │ NSTM Ch 300 – Electric Plant             │ 1/1 │   520│ 14  │ 15SEP2024 │ PDF    │ Current
S9086-TX-STM-010              │ NSTM Ch 583 – Boats & Small Craft        │ 1/1 │   180│  8  │ 01JUL2024 │ PDF    │ Current
S9593-A2-MMI-010/DDG-51-FIII  │ Combat System – Operational Procedure    │ 1/2 │   620│  3  │ 01MAR2025 │ IETM   │ Current
S9593-A2-MMI-010/DDG-51-FIII  │ Combat System – Maintenance Plan         │ 2/2 │   445│  3  │ 01MAR2025 │ IETM   │ Current
S9593-AL-MMI-010/SPY-6(V)1    │ AN/SPY-6 Radar – O&I Maintenance        │ 1/4 │ 1,240│  2  │ 15JAN2025 │ IETM   │ Current
S9593-AL-MMI-010/SPY-6(V)1    │ AN/SPY-6 Radar – Depot Maintenance      │ 2/4 │   680│  2  │ 15JAN2025 │ IETM   │ Current
S9593-AL-MMI-010/SPY-6(V)1    │ AN/SPY-6 Radar – IPB                    │ 3/4 │   510│  2  │ 15JAN2025 │ IETM   │ Current
S9593-AL-MMI-010/SPY-6(V)1    │ AN/SPY-6 Radar – Software Maintenance   │ 4/4 │   220│  2  │ 15JAN2025 │ IETM   │ Current
S9593-BB-MMI-010/MK45-MOD4    │ 5in/62 Gun Mount – Maintenance          │ 1/2 │   890│  9  │ 01NOV2024 │ IETM   │ Current
S9593-BB-MMI-010/MK45-MOD4    │ 5in/62 Gun Mount – IPB                  │ 2/2 │   340│  8  │ 01NOV2024 │ IETM   │ Current
SW060-AF-MMI-010              │ Gas Turbine Engine LM2500+G4             │ 1/1 │   480│ 11  │ 01AUG2024 │ PDF    │ Under Rev
S9593-CN-MMI-010/VLS          │ MK41 VLS – O&I Maintenance              │ 1/2 │   710│  6  │ 15SEP2024 │ IETM   │ Current
S9593-CN-MMI-010/VLS          │ MK41 VLS – IPB                          │ 2/2 │   280│  5  │ 15SEP2024 │ IETM   │ Current
S9593-CD-MMI-010/CIWS         │ Phalanx CIWS Block 1B – Maintenance     │ 1/1 │   560│ 10  │ 01DEC2024 │ IETM   │ Current
S9086-H8-STM-010              │ NSTM Ch 244 – Pollution Prevention      │ 1/1 │   210│  6  │ 15JUN2024 │ PDF    │ Current
S9593-DE-MMI-010/SSDS         │ SSDS MK 2 – Combat System Maintenance   │ 1/2 │   380│  4  │ 01FEB2025 │ IETM   │ Current
S9086-GV-STM-010              │ NSTM Ch 505 – Piping Systems            │ 1/1 │   440│ 13  │ 01SEP2024 │ PDF    │ Superceded
───────────────────────────────┼──────────────────────────────────────────┼─────┼──────┼─────┼───────────┼────────┼──────────
                                                            Total Pages:           10,602

NOTES:
1. IETM = Interactive Electronic Technical Manual (NAVSEA XML Standard)
2. PDF manuals scheduled for IETM conversion FY26-FY28
3. Superceded manuals retained for 24 months after replacement
4. All IETMs hosted on NTMMS (Navy TM Management System)
═══════════════════════════════════════════════════════════════"""

# ── 12. Purchase Order Index ─────────────────────────────────────────
DOCS['PO Index'] = r"""═══════════════════════════════════════════════════════════════
       PURCHASE ORDER INDEX & TRACKING REGISTER
        DDG-51 FLIGHT III – ILS PROCUREMENT LOG
═══════════════════════════════════════════════════════════════
Program: DDG-51 Flt III (DDG-133/134)  As Of: 25 APR 2025
Prepared By: ILS Contracts Team, PMS 400D

PO NUMBER       │ VENDOR              │ CAGE  │ DESCRIPTION                       │ CLIN  │ PO VALUE      │ FUNDED    │ OBLIGATED    │ EXPENDED     │ STATUS      │ DEL DATE   │ SHIP TO
────────────────┼─────────────────────┼───────┼───────────────────────────────────┼───────┼───────────────┼───────────┼──────────────┼──────────────┼─────────────┼────────────┼──────────
N00024-24-P-0101│ L3Harris Tech       │ 3R2Y7 │ AN/SLQ-32(V)6 Spares, Initial    │ 0001  │  $1,678,220.00│ $1,678,220│ $1,678,220.00│  $1,200,400.00│ In Progress │ 30SEP2025  │ N32253
N00024-24-P-0102│ Raytheon Missiles   │ 7S695 │ AN/SPY-6(V)1 LRU Spares          │ 0001  │  $4,250,000.00│ $4,250,000│ $4,250,000.00│  $3,890,000.00│ In Progress │ 15AUG2025  │ N32253
N00024-24-P-0103│ BAE Systems         │ K4895 │ MK45 Mod 4 Barrel Assembly       │ 0001  │    $890,000.00│   $890,000│   $890,000.00│    $890,000.00│ Complete    │ 01MAR2025  │ N62788
N00024-24-P-0104│ GE Marine           │ 0DKM0 │ LM2500+G4 Hot Section Spares     │ 0002  │  $2,100,000.00│ $2,100,000│ $2,100,000.00│         $0.00│ Awarded     │ 31DEC2025  │ N32253
N00024-24-P-0105│ Lockheed Martin     │ 64547 │ MK41 VLS Canister Seals          │ 0001  │    $340,000.00│   $340,000│   $340,000.00│    $320,000.00│ In Progress │ 30JUN2025  │ N62788
N00024-24-P-0106│ Huntington Ingalls  │ 2Y197 │ Hull Structural Repair Kit       │ 0003  │  $1,450,000.00│ $1,450,000│ $1,450,000.00│    $725,000.00│ In Progress │ 30SEP2025  │ NNSY
N00024-24-P-0107│ Rolls-Royce Naval   │ U7390 │ Controllable Pitch Prop Blades   │ 0001  │  $3,200,000.00│ $3,200,000│ $3,200,000.00│  $1,600,000.00│ In Progress │ 31OCT2025  │ PSNS
N00024-24-P-0108│ Curtiss-Wright      │ 74628 │ DRSVM Valve Actuator Set         │ 0001  │    $560,000.00│   $560,000│   $560,000.00│    $560,000.00│ Complete    │ 15FEB2025  │ N32253
N00024-24-P-0109│ Raytheon IDS        │ 7S695 │ Phalanx Block 1B Barrel Assy     │ 0002  │    $420,000.00│   $420,000│   $420,000.00│    $210,000.00│ In Progress │ 30JUL2025  │ N32253
N00024-24-P-0110│ DRS Defense Soln    │ 5K575 │ Power Conversion Module (PCM)    │ 0001  │    $780,000.00│   $780,000│   $780,000.00│    $390,000.00│ In Progress │ 31AUG2025  │ N62788
N00024-24-P-0111│ Elbit Systems       │ 8B825 │ Ship Self-Defense System SW Lic  │ 0001  │    $220,000.00│   $220,000│   $220,000.00│    $220,000.00│ Complete    │ 01JAN2025  │ N/A Digital
N00024-24-P-0112│ Thales Defense      │ F4835 │ SonarTAS Array Spares            │ 0001  │  $1,890,000.00│ $1,890,000│ $1,890,000.00│    $945,000.00│ In Progress │ 30NOV2025  │ N32253
N00024-24-P-0113│ Northrop Grumman    │ 27539 │ Navigation System Upgrade Kit    │ 0001  │    $650,000.00│   $650,000│   $650,000.00│         $0.00│ Awarded     │ 31MAR2026  │ N62788
N00024-24-P-0114│ General Dynamics    │ 77040 │ MK110 CIGS 57mm Barrel           │ 0002  │    $380,000.00│   $380,000│   $380,000.00│    $380,000.00│ Complete    │ 28FEB2025  │ N32253
N00024-24-P-0115│ Harris Corp         │ 3R2Y7 │ SATCOM AN/USC-61 Crypto Module   │ 0003  │    $290,000.00│   $290,000│   $290,000.00│    $145,000.00│ In Progress │ 30SEP2025  │ N32253
────────────────┼─────────────────────┼───────┼───────────────────────────────────┼───────┼───────────────┼───────────┼──────────────┼──────────────┼─────────────┼────────────┼──────────
                                                                        TOTALS:         │ $19,098,220.00│$19,098,220│$19,098,220.00│ $11,475,400.00│

SUMMARY:
  Total POs: 15       Complete: 4       In Progress: 9       Awarded: 2
  Total Value: $19,098,220.00
  Expended:    $11,475,400.00  (60.1%)
  Remaining:    $7,622,820.00  (39.9%)
═══════════════════════════════════════════════════════════════"""

# ── 13. Engineering Change Proposal (ECP) ────────────────────────────
DOCS['ECP'] = r"""═══════════════════════════════════════════════════════════════
           ENGINEERING CHANGE PROPOSAL (ECP)
              MIL-STD-480B / EIA-649-1
═══════════════════════════════════════════════════════════════
ECP Number:      N-2025-041            Priority: URGENT
Originator:      L3Harris Technologies (CAGE: 3R2Y7)
Date Submitted:  10 MAR 2025
Classification:  Class I (Requires Government Approval)
Justification:   Safety, Performance, Logistics

═══════════════════════════════════════════════════════════════
                   SECTION I – IDENTIFICATION
═══════════════════════════════════════════════════════════════
1.1  Title: Software Update v4.2.1 – Threat Library
     Expansion and Processing Enhancement

1.2  System: AN/SLQ-32(V)6 Electronic Warfare Suite
1.3  Contract: N00024-23-C-5520
1.4  Affected Configuration Item: CI-003 (Signal Processor)
     Configuration Baseline: FCA-2024-003, Rev C
1.5  Affected NSN: 5962-01-589-3001 (DSP Board)
                   5895-01-589-7001 (CM Controller PCB)

═══════════════════════════════════════════════════════════════
                   SECTION II – NEED / DESCRIPTION
═══════════════════════════════════════════════════════════════
2.1  STATEMENT OF NEED:

Recent intelligence (TECHEVAL-2024-377) has identified 14
new threat emitter modes not currently in the AN/SLQ-32(V)6
threat library. Additionally, fleet feedback (CASREP DDG-118
#2024-0847) reported a 0.3-second latency increase in threat
identification during high-density emitter environments
(>100 simultaneous signals).

This ECP addresses both deficiencies by:
  a) Expanding the threat library from 1,847 to 2,094
     emitter modes (+13.4% coverage increase)
  b) Optimizing the DSP correlation algorithm to reduce
     worst-case ID time from 1.5s to 0.8s
  c) Adding new Mode 5 IFF deconfliction logic

2.2  DESCRIPTION OF CHANGE:

Block diagram affected: Figure 3-2, Signal Processing Flow

  COMPONENT         │ CURRENT (Rev C)    │ PROPOSED (Rev D)
  ──────────────────┼────────────────────┼────────────────────
  Threat Library    │ 1,847 modes        │ 2,094 modes
  DSP Algorithm     │ FFT-based, v4.1.3  │ Hybrid FFT/ML v4.2.1
  Processing Cores  │ 4 active, 2 spare  │ 6 active (all used)
  Memory Allocation │ 2 GB threat DB     │ 3.2 GB threat DB
  FPGA Image        │ Build 1184         │ Build 1247
  IFF Logic         │ Mode 4/5 basic     │ Mode 5 enhanced
  BIT Coverage      │ 94.2%              │ 96.8%

2.3  RISK ASSESSMENT:
  Technical Risk: LOW – Algorithm validated in lab (>10,000
  scenarios, 99.7% positive ID rate)
  Schedule Risk: LOW – 90-day implementation from approval
  Cost Risk: MEDIUM – Requires FPGA reflash at depot level

═══════════════════════════════════════════════════════════════
                   SECTION III – IMPACT ANALYSIS
═══════════════════════════════════════════════════════════════
3.1  HARDWARE IMPACT:
  - No hardware changes required
  - Existing DSP Board and FPGA Card are compatible
  - Memory margin: 3.2 GB of 4 GB available (80% utilization)

3.2  SOFTWARE IMPACT:
  - CSCI-001: Threat Processor Software – MAJOR update
  - CSCI-003: BIT Software – MINOR update (new test vectors)
  - CSCI-005: Display Software – MINOR update (new symbology)

3.3  LOGISTICS IMPACT:
  a) Technical Manuals: Sections 4.2, 4.3, 5.2 require update
     (estimated 45 pages of changes)
  b) Training: 2-hour fleet sailor familiarization brief
  c) Spares: No impact – same hardware
  d) Support Equipment: SE software v2.1 update required
  e) VRSL Update: Items 3, 8, 16 – FPGA image change only

3.4  COST IMPACT:
  NRE (Non-Recurring Engineering):    $1,240,000
  Unit Recurring Cost Change:              $0.00 (SW only)
  Retrofit Cost (10 units × $185K):   $1,850,000
  TM Update Cost:                        $95,000
  Training Development:                  $45,000
  ────────────────────────────────────────────────
  TOTAL ECP COST:                     $3,230,000

3.5  SCHEDULE:
  Approval to CDR:       30 days
  CDR to TRR:            45 days
  TRR to Fleet Release:  15 days
  Total Implementation:  90 days

═══════════════════════════════════════════════════════════════
                   SECTION IV – APPROVAL
═══════════════════════════════════════════════════════════════
Submitted By:
  L3Harris Chief Engineer: Dr. Angela Torres
  Date: 10 MAR 2025      Signature: /s/ A. Torres

Reviewed By:
  NAVSEA Config Mgr: Mr. Steven Barker
  Date: 18 MAR 2025      Signature: /s/ S. Barker

Approved By:
  PMS 500 Program Mgr: CAPT William Chen, USN
  Date: 22 MAR 2025      Signature: /s/ W. Chen

  CCB Decision: APPROVED with conditions
  Condition: Fleet release NLT 01 JUL 2025
═══════════════════════════════════════════════════════════════"""

# ── 14. Life Cycle Sustainment Plan (LCSP) ───────────────────────────
DOCS['LCSP'] = r"""═══════════════════════════════════════════════════════════════
             LIFE CYCLE SUSTAINMENT PLAN (LCSP)
          DoDI 5000.02 / DoD Instruction 5000.85
═══════════════════════════════════════════════════════════════
System:   AN/SLQ-32(V)6 Electronic Warfare Suite
Program:  SEWIP Block 3, PMS 500
Document: LCSP-SLQ32V6-2025-R2    Date: 01 MAR 2025
Classification: UNCLASSIFIED // FOUO
Approved By: PMS 500 / SEA 04

                     TABLE OF CONTENTS
═══════════════════════════════════════════════════════════════
Section 1  – Executive Summary ................ Page 3
Section 2  – System Description ............... Page 5
Section 3  – Sustainment Strategy ............. Page 8
Section 4  – Reliability & Maintainability .... Page 12
Section 5  – Supply Support ................... Page 16
Section 6  – Maintenance Planning ............. Page 20
Section 7  – Technical Data ................... Page 24
Section 8  – Support Equipment ................ Page 27
Section 9  – Training & Training Devices ...... Page 30
Section 10 – Manpower & Personnel ............. Page 33
Section 11 – Facilities ....................... Page 35
Section 12 – DMSMS Management ................. Page 37
Section 13 – Cost Estimates ................... Page 40
Annex A    – Product Support BCA .............. Page 44
Annex B    – KPP/KSA Matrix .................. Page 48
═══════════════════════════════════════════════════════════════

SECTION 1 – EXECUTIVE SUMMARY

1.1  The AN/SLQ-32(V)6 is the primary surface electronic
warfare system for DDG-51 Flight III class destroyers.
Initial operational capability (IOC) was achieved in FY2024
with USS Jack H. Lucas (DDG-125). Full operational
capability (FOC) is planned for FY2028 across 22 hulls.

1.2  SUSTAINMENT KEY METRICS:
  ┌───────────────────────────────────┬─────────────┐
  │ KPP/KSA                          │ Threshold   │
  ├───────────────────────────────────┼─────────────┤
  │ Operational Availability (Ao)     │ ≥ 0.992     │
  │ Mean Time Between Failure (MTBF)  │ ≥ 1,200 hrs │
  │ Mean Time To Repair (MTTR)        │ ≤ 0.5 hrs   │
  │ Mission Capable Rate              │ ≥ 95%       │
  │ Supply Response Time              │ ≤ 48 hrs    │
  │ Total Ownership Cost (TOC) Ratio  │ ≤ 0.35      │
  └───────────────────────────────────┴─────────────┘

1.3  LIFE CYCLE COST ESTIMATE (20-YEAR):
  ┌────────────────────────────┬──────────────────┐
  │ Cost Category              │ Estimate ($M)    │
  ├────────────────────────────┼──────────────────┤
  │ RDT&E (completed)         │      $1,240      │
  │ Procurement (22 units)    │      $3,850      │
  │ Sustainment (20 years)    │      $2,180      │
  │ Disposal                  │         $45      │
  ├────────────────────────────┼──────────────────┤
  │ TOTAL LIFE CYCLE COST     │      $7,315      │
  └────────────────────────────┴──────────────────┘

═══════════════════════════════════════════════════════════════
SECTION 3 – SUSTAINMENT STRATEGY

3.1  PRODUCT SUPPORT STRATEGY:
The sustainment strategy employs a Performance-Based
Logistics (PBL) approach with L3Harris Technologies as
the Product Support Integrator (PSI). Key elements:

  a) Contractor Logistics Support (CLS) – Initial 5-year
     period (FY2024-FY2028) covering:
     - On-site FSRs at homeports (2 per squadron)
     - 24/7 technical reach-back support
     - Software updates (quarterly releases)
     - Depot repair at Melbourne, FL facility

  b) Organic Transition Plan – FY2029-FY2032:
     - Progressive transfer to NSWC facilities
     - Navy depot repair at Tobyhanna Army Depot
     - Sailor self-sufficiency for O/I-level
     - CLS retained for depot-unique capabilities

  c) Steady-State Organic (FY2033+):
     - Full organic maintenance through I-level
     - Depot split: 60% organic / 40% CLS
     - Threat library updates remain CLS

3.2  MAINTENANCE CONCEPT:
  Level       │ Location         │ Responsibility     │ Scope
  ────────────┼──────────────────┼────────────────────┼───────────────
  Org (O)     │ Ship             │ Ship's Force       │ BIT/Op checks
  Int (I)     │ Shore/TYCOM      │ Regional Maint     │ Module R&R
  Depot (D)   │ Tobyhanna/OEM    │ Organic + CLS      │ Full repair
  Software    │ OEM facility     │ L3Harris CLS       │ Updates/patches

═══════════════════════════════════════════════════════════════
SECTION 5 – SUPPLY SUPPORT

5.1  PROVISIONING APPROACH:
  a) Initial Outfitting: 2 APLs per hull (1 installed, 1 shore)
  b) VRSL approved: 25 line items, $1.68M per ship set
  c) Wholesale stock level: 6 ship-sets at DLA minimum
  d) Total provisioning budget: $36.9M (FY24-FY28)

5.2  SUPPLY PERFORMANCE TARGETS:
  ┌──────────────────────────────┬────────────┬────────────┐
  │ Metric                       │ Objective  │ Threshold  │
  ├──────────────────────────────┼────────────┼────────────┤
  │ Material Availability        │ ≥ 95%      │ ≥ 90%      │
  │ Avg Customer Wait Time       │ ≤ 30 days  │ ≤ 48 days  │
  │ Backorder Rate               │ ≤ 5%       │ ≤ 10%      │
  │ APL Effectiveness            │ ≥ 85%      │ ≥ 75%      │
  │ NIIN Fill Rate               │ ≥ 90%      │ ≥ 80%      │
  └──────────────────────────────┴────────────┴────────────┘

═══════════════════════════════════════════════════════════════
SECTION 12 – DMSMS MANAGEMENT

12.1  DMSMS RISK ITEMS (Current):
  NSN               │ P/N             │ Item                │ Status         │ Resolution
  ──────────────────┼─────────────────┼─────────────────────┼────────────────┼──────────────────
  5961-01-589-2002  │ 73-10-0201-007  │ RF Amplifier, LN    │ LAST TIME BUY  │ LTB Q3 FY2025
  5962-01-590-2001  │ 73-20-0350-008  │ FPGA Processor Card │ DIMINISHING    │ Redesign FY2026
  5895-01-590-3001  │ 73-50-0620-004  │ Threat ID Module    │ DIMINISHING    │ ECP under eval
  5961-01-590-5001  │ 73-10-0201-015  │ Traveling Wave Tube │ LAST TIME BUY  │ LTB Q4 FY2025

12.2  DMSMS MITIGATION BUDGET: $4.2M / year (FY2025-FY2035)
═══════════════════════════════════════════════════════════════
ANNEX B – KPP / KSA MATRIX

                    Requirement        │ Threshold │ Objective │ Current  │ Status
  ─────────────────────────────────────┼───────────┼───────────┼──────────┼────────
  Ao (Operational Availability)        │  0.992    │  0.998    │  0.996   │  MET
  MTBF                                 │  1,200 hr │  1,800 hr │  1,547   │  MET
  MTTR                                 │  0.5 hr   │  0.25 hr  │  0.38    │  MET
  Mission Capable Rate                 │  95%      │  98%      │  96.2%   │  MET
  Supply Response Time                 │  48 hr    │  24 hr    │  36 hr   │  MET
  TOC Ratio                            │  0.35     │  0.25     │  0.31    │  MET
  SW Update Deployment Time            │  30 days  │  14 days  │  21 days │  MET
  DMSMS Resolution Lead Time           │  18 mo    │  12 mo    │  14 mo   │  MET
  ─────────────────────────────────────┼───────────┼───────────┼──────────┼────────
                                         ALL KPPs/KSAs: MET
═══════════════════════════════════════════════════════════════"""

# ── 15. Engineering Drawing ──────────────────────────────────────────
DOCS['Engineering Drawing'] = r"""═══════════════════════════════════════════════════════════════
           ENGINEERING DRAWING / TECHNICAL DATA PACKAGE
                  NAVAIR / NAVSEA STANDARD
═══════════════════════════════════════════════════════════════
Drawing No.:   73-10-0201-003-DWG       Sheet: 1 of 4
Title:         RF AMPLIFIER MODULE, HIGH-POWER – ASSEMBLY
System:        AN/SLQ-32(V)6    Config Item: CI-003
Rev:           D               Date: 15 FEB 2025
Scale:         1:2             Size: D (22" × 34")
CAGE:          3R2Y7           Classification: UNCLASSIFIED

═══════════════════════════════════════════════════════════════
                    TITLE BLOCK
───────────────────────────────────────────────────────────────
Designed By:     R. Vasquez          Date: 12 JAN 2024
Checked By:      M. Nguyen           Date: 18 JAN 2024
Stress Analyst:  K. Patel            Date: 20 JAN 2024
Approved By:     Dr. A. Torres       Date: 25 JAN 2024
Rev D Approved:  S. Barker (NAVSEA)  Date: 15 FEB 2025
───────────────────────────────────────────────────────────────

SHEET 1/4 – TOP ASSEMBLY VIEW
═══════════════════════════════════════════════════════════════
                ┌─────────────────────────────────────┐
                │          RF AMPLIFIER MODULE         │
                │         P/N: 73-10-0201-003          │
                │     ┌───────────────────────────┐    │
                │     │  POWER AMP STAGE          │    │
                │     │  ┌─────┐  ┌─────┐         │    │
  RF IN ════════╪═════╪══│ LNA │──│ DRV │──┐      │    │
  (SMA)         │     │  └─────┘  └─────┘  │      │    │
                │     │              ┌──────┘      │    │
                │     │              ▼             │    │
                │     │         ┌─────────┐       │    │
                │     │         │  SSPA    │       │    │
                │     │         │  (GaN)   │       │    │══════ RF OUT
                │     │         └─────────┘       │    │ (N-Type)
                │     │              │             │    │
                │     └───────────────────────────┘    │
                │     ┌───────────┐  ┌───────────┐     │
                │     │ POWER     │  │ CONTROL   │     │
                │     │ SUPPLY    │  │ LOGIC     │     │
  28VDC ════════╪═════│ (DC-DC)   │  │ (FPGA)    │═════╪════ CTRL
  (Cannon)      │     └───────────┘  └───────────┘     │ (37-pin)
                │          │              │             │
                │     ┌────┴──────────────┴────┐       │
  COOLANT IN ═══╪═════│    COLD PLATE / HEATSINK│══════╪═══ COOLANT OUT
                │     │    (Aluminum 6061-T6)   │      │
                │     └────────────────────────┘       │
                └─────────────────────────────────────┘

  Overall: 12.5" × 8.0" × 3.2"   Weight: 8.2 kg (18.0 lbs)

SHEET 2/4 – DIMENSIONS & TOLERANCES
═══════════════════════════════════════════════════════════════
  GENERAL TOLERANCES (ASME Y14.5-2018):
  ────────────────────────────────────────
  Linear:     ±0.005" (unless noted)
  Angular:    ±0°30'
  Surface:    125 μin Ra (machined)
              32 μin Ra (mating surfaces)
  Flatness:   0.002" over 8" span (cold plate)
  True Position: 0.003" dia (mounting holes)

  CRITICAL DIMENSIONS:
  ───────────────────────────────────────────────
  A) Module Envelope:  12.500 ±0.010 × 8.000 ±0.010 × 3.200 ±0.005
  B) Mounting Holes:   4× ∅0.250 +0.001/-0.000 THRU
                       Bolt Circle: 11.500 × 7.000 (true pos ∅0.003)
  C) RF SMA Port CL:  6.250 from datum A, 1.600 from datum B
  D) RF N-Type Port:   6.250 from datum A, on opposite face
  E) Coolant Ports:    QD fittings, 1/4" NPT, center of baseplate
  F) Cannon Connector: MIL-DTL-38999 Series III, backshell 90°

SHEET 3/4 – BILL OF MATERIALS
═══════════════════════════════════════════════════════════════
ITEM│ PART NUMBER      │ DESCRIPTION                  │ QTY│ MATERIAL
────┼──────────────────┼──────────────────────────────┼────┼────────────
  1 │ 73-10-0201-100   │ Housing Assembly, Machined    │   1│ Al 6061-T6
  2 │ 73-10-0201-110   │ Cold Plate, Brazed Assembly   │   1│ Al/Cu
  3 │ 73-10-0201-120   │ LNA Module, GaAs              │   1│ (procured)
  4 │ 73-10-0201-130   │ Driver Amp Module              │   1│ (procured)
  5 │ 73-10-0201-140   │ SSPA Module, GaN               │   1│ (procured)
  6 │ 73-10-0201-150   │ DC-DC Converter, 28V→Multi    │   1│ (procured)
  7 │ 73-10-0201-160   │ FPGA Control Board            │   1│ FR-4/HDI
  8 │ 73-10-0201-170   │ EMI Gasket Set                │   1│ BeCu/Silicone
  9 │ 73-10-0201-180   │ RF Cable Assembly, Internal   │   3│ Semi-rigid
 10 │ 73-10-0201-190   │ Hardware Kit (screws, inserts)│   1│ SS/Ti
 11 │ 73-10-0201-200   │ Conformal Coating Material    │   1│ MIL-I-46058C
────┼──────────────────┼──────────────────────────────┼────┼────────────

SHEET 4/4 – NOTES & SPECIFICATIONS
═══════════════════════════════════════════════════════════════
NOTES:
1. All dimensions in inches unless noted.
2. Deburr all machined edges 0.010-0.020 R.
3. Anodize per MIL-A-8625F, Type III, Class 1.
4. Apply conformal coating per MIL-I-46058C, Type UR.
5. Torque all module mounting screws to 45 ±5 in-lb.
6. RF connectors: Torque SMA to 8 in-lb, N-type to 12 in-lb.
7. Leak test coolant circuit at 50 PSI for 30 min, zero leaks.
8. All solder joints per J-STD-001 Class 3 (Space/Military).
9. Cleanliness: MIL-STD-1246D, Level 300.

APPLICABLE SPECIFICATIONS:
  MIL-STD-810H    – Environmental Test Methods
  MIL-STD-461G    – EMI/EMC Requirements
  MIL-STD-1275E   – 28VDC Power Quality
  MIL-DTL-38999   – Connector, Cannon Plug
  ASME Y14.5-2018 – GD&T Standard
═══════════════════════════════════════════════════════════════"""

# ── 16. Configuration Status Accounting ──────────────────────────────
DOCS['Configuration Status'] = r"""═══════════════════════════════════════════════════════════════
         CONFIGURATION STATUS ACCOUNTING (CSA) REPORT
              MIL-STD-3046 / EIA-649-1 / ANSI/EIA-836
═══════════════════════════════════════════════════════════════
System:    AN/SLQ-32(V)6 Electronic Warfare Suite
Program:   SEWIP Block 3, PMS 500
Baseline:  FCA-2024-003, Rev C (Functional Config Audit)
Date:      01 APR 2025
Prepared:  L3Harris Configuration Mgmt Office

═══════════════════════════════════════════════════════════════
     SECTION 1 – CONFIGURATION IDENTIFICATION STATUS
═══════════════════════════════════════════════════════════════

CI#  │ CI NAME                    │ P/N              │ CURR REV│ BASELINE │ STATUS
─────┼────────────────────────────┼──────────────────┼─────────┼──────────┼──────────
CI-001│ Antenna Group Assembly     │ 73-40-0500-ASSY  │ Rev B   │ FCA-001  │ Current
CI-002│ Below-Decks Cabinet Set    │ 73-70-0100-ASSY  │ Rev C   │ FCA-002  │ Current
CI-003│ Signal Processor (HW)     │ 73-20-0350-ASSY  │ Rev C   │ FCA-003  │ ECP Pending
CI-004│ Signal Processor (SW)     │ CSCI-001         │ v4.1.3  │ FCA-004  │ ECP-041 Appr
CI-005│ EA Controller             │ 73-50-0600-ASSY  │ Rev B   │ FCA-005  │ Current
CI-006│ Power Distribution        │ 73-30-0400-ASSY  │ Rev A   │ FCA-006  │ Current
CI-007│ Operator Console          │ OJ-794-ASSY      │ Rev B   │ FCA-007  │ Current
CI-008│ CM Dispensing Controller  │ 73-50-0630-ASSY  │ Rev A   │ FCA-008  │ Current
CI-009│ BIT Software              │ CSCI-003         │ v2.8.1  │ FCA-009  │ ECP-041 Minor
CI-010│ Display Software          │ CSCI-005         │ v3.2.0  │ FCA-010  │ ECP-041 Minor
─────┼────────────────────────────┼──────────────────┼─────────┼──────────┼──────────

═══════════════════════════════════════════════════════════════
     SECTION 2 – ENGINEERING CHANGE STATUS
═══════════════════════════════════════════════════════════════

ECP#          │ TITLE                           │ CLASS│ STATUS    │ CCB DATE  │ IMPL TARGET
──────────────┼─────────────────────────────────┼──────┼───────────┼───────────┼────────────
N-2024-038    │ EMI Filter Upgrade              │ II   │ COMPLETED │ 15AUG2024 │ Completed
N-2024-039    │ Cooling System Enhancement      │ I    │ COMPLETED │ 01OCT2024 │ Completed
N-2024-040    │ Console Display Resolution      │ II   │ COMPLETED │ 15DEC2024 │ Completed
N-2025-041    │ SW v4.2.1 Threat Library        │ I    │ APPROVED  │ 22MAR2025 │ 01JUL2025
N-2025-042    │ Antenna Radome Material Change  │ I    │ IN REVIEW │ TBD       │ FY2026 Q1
N-2025-043    │ GaN Amplifier Second Source     │ I    │ SUBMITTED │ TBD       │ FY2026 Q2
──────────────┼─────────────────────────────────┼──────┼───────────┼───────────┼────────────

DEVIATION/WAIVER LOG:
DEV#          │ DESCRIPTION                     │ AUTHORIZED │ EXPIRY
──────────────┼─────────────────────────────────┼────────────┼──────────
DW-2024-015   │ Temp use of alternate RF gasket  │ 01NOV2024  │ 30APR2025
DW-2025-001   │ FPGA rev B1 instead of B2        │ 15JAN2025  │ 01JUL2025
──────────────┼─────────────────────────────────┼────────────┼──────────

═══════════════════════════════════════════════════════════════
     SECTION 3 – DOCUMENT/DATA STATUS
═══════════════════════════════════════════════════════════════

DOCUMENT                          │ CURRENT │ REVIEW DUE │ CUSTODIAN
──────────────────────────────────┼─────────┼────────────┼──────────────
System Specification (SS)          │ Rev D   │ 01OCT2025  │ L3Harris SE
HW Development Spec               │ Rev C   │ 01OCT2025  │ L3Harris HW
SW Requirements Spec (SRS)        │ Rev E   │ 01JUL2025  │ L3Harris SW
Interface Control Doc (ICD)       │ Rev C   │ 01OCT2025  │ L3Harris/Navy
Test & Evaluation Master Plan     │ Rev B   │ 01JAN2026  │ PMS 500
LCSP                              │ Rev B   │ 01MAR2026  │ PMS 500 ILS
ILSP                              │ Rev C   │ 01OCT2025  │ L3Harris ILS
Technical Manuals (Set of 3)      │ Rev 7   │ 01FEB2026  │ L3Harris TP
──────────────────────────────────┼─────────┼────────────┼──────────────

APPROVED BY:
  L3Harris CM Manager: J. Whitfield    Date: 01 APR 2025
  Navy Config Mgr:     S. Barker       Date: 03 APR 2025
═══════════════════════════════════════════════════════════════"""

# ── 17. Outfitting List ──────────────────────────────────────────────
DOCS['Outfitting List'] = r"""═══════════════════════════════════════════════════════════════
        SHIP OUTFITTING LIST / ALLOWANCE PARTS LIST (APL)
         INITIAL OUTFITTING – DDG-133 (DDG-51 FLT III)
═══════════════════════════════════════════════════════════════
APL Number:   APL-SLQ32V6-001       Date: 01 APR 2025
System:       AN/SLQ-32(V)6         Hull: DDG-133
Prepared By:  NAVSUP WSS / L3Harris ILS
Approved By:  PMS 400D Provisioning

INITIAL OUTFITTING ALLOWANCE (Installed + On-Board Spares)

ITEM│ NSN               │ PART NUMBER     │ NOMENCLATURE                   │ APL QTY│ ONBD│ SHORE│ UNIT$     │ EXT$
────┼───────────────────┼─────────────────┼────────────────────────────────┼────────┼─────┼──────┼───────────┼────────────
  1 │ 5961-01-589-2001  │ 73-10-0201-003  │ RF Amplifier Module, HP        │      2 │   1 │    1 │ $42,500.00│  $85,000.00
  2 │ 5961-01-589-2002  │ 73-10-0201-007  │ RF Amplifier Module, LN        │      2 │   1 │    1 │ $18,900.00│  $37,800.00
  3 │ 5962-01-589-3001  │ 73-20-0350-001  │ Digital Signal Processor Bd    │      2 │   1 │    1 │ $67,200.00│ $134,400.00
  4 │ 5998-01-589-4001  │ 73-30-0400-012  │ Power Supply Module, 28VDC     │      3 │   1 │    2 │  $4,800.00│  $14,400.00
  5 │ 5999-01-589-5001  │ 73-30-0410-004  │ Cable Assembly, RF Coaxial     │      6 │   2 │    4 │  $1,250.00│   $7,500.00
  6 │ 5985-01-589-6001  │ 73-40-0500-001  │ Antenna Element, Broadband     │      1 │   0 │    1 │ $31,400.00│  $31,400.00
  7 │ 5985-01-589-6002  │ 73-40-0500-008  │ Antenna Rotary Joint           │      1 │   0 │    1 │ $12,700.00│  $12,700.00
  8 │ 5895-01-589-7001  │ 73-50-0600-003  │ CM Controller PCB              │      2 │   1 │    1 │ $28,600.00│  $57,200.00
  9 │ 5820-01-589-8001  │ 73-50-0610-001  │ SATCOM Interface Module        │      1 │   0 │    1 │ $22,100.00│  $22,100.00
 10 │ 6625-01-589-9001  │ 73-60-0700-002  │ Built-In Test Module           │      1 │   0 │    1 │ $15,300.00│  $15,300.00
 11 │ 6110-01-590-0001  │ 73-70-0100-005  │ Cooling Fan Assembly           │      4 │   2 │    2 │  $2,100.00│   $8,400.00
 12 │ 5340-01-590-0002  │ 73-70-0100-012  │ EMI Gasket Set                 │     10 │   4 │    6 │    $340.00│   $3,400.00
 13 │ 5999-01-590-0003  │ 73-70-0100-019  │ Fiber Optic Cable, 2m          │      4 │   2 │    2 │    $890.00│   $3,560.00
 14 │ 5905-01-590-1001  │ 73-80-0200-003  │ RF Connector Adapter SMA-N     │     12 │   6 │    6 │    $125.00│   $1,500.00
 15 │ 6135-01-590-1002  │ 73-80-0200-010  │ Wiring Harness, Main           │      1 │   0 │    1 │  $8,450.00│   $8,450.00
 16 │ 5962-01-590-2001  │ 73-20-0350-008  │ FPGA Processor Card            │      1 │   0 │    1 │ $54,300.00│  $54,300.00
 17 │ 5895-01-590-3001  │ 73-50-0620-004  │ Threat ID Correlation Module   │      1 │   0 │    1 │ $38,900.00│  $38,900.00
 18 │ 5820-01-590-4001  │ 73-90-0300-001  │ GPS Timing Module              │      1 │   0 │    1 │ $11,200.00│  $11,200.00
 19 │ 5961-01-590-5001  │ 73-10-0201-015  │ Traveling Wave Tube (TWT)      │      2 │   1 │    1 │ $56,700.00│ $113,400.00
 20 │ 5998-01-590-6001  │ 73-30-0400-020  │ UPS Battery Pack               │      3 │   1 │    2 │  $2,850.00│   $8,550.00
 21 │ 5895-01-590-8001  │ 73-50-0630-001  │ Jammer Transmitter Module      │      2 │   1 │    1 │ $89,400.00│ $178,800.00
 22 │ 5895-01-591-0001  │ 73-50-0640-002  │ ECM Controller Card            │      1 │   0 │    1 │ $41,200.00│  $41,200.00
 23 │ 5820-01-591-1001  │ 73-90-0310-005  │ Freq Synthesizer Module        │      1 │   0 │    1 │ $33,700.00│  $33,700.00
 24 │ 6695-01-590-7001  │ 73-60-0710-002  │ Environmental Sensor Module    │      2 │   1 │    1 │  $3,200.00│   $6,400.00
 25 │ 5998-01-590-9001  │ 73-30-0410-009  │ Fiber Optic Transceiver        │      3 │   1 │    2 │  $4,100.00│  $12,300.00
────┼───────────────────┼─────────────────┼────────────────────────────────┼────────┼─────┼──────┼───────────┼────────────
                                                                          │  TOTAL │  26 │   44 │           │ $931,760.00

NOTES:
1.  ONBD = Quantity stowed aboard ship in designated storerooms
2.  SHORE = Quantity held at shore intermediate maintenance activity (IMA)
3.  All items sourced through DLA/NAVSUP wholesale system
4.  Reorder Point (ROP) and Reorder Quantity (ROQ) per NAVSUP P-485
5.  DMSMS items (2, 16) flagged for Last Time Buy coordination
═══════════════════════════════════════════════════════════════"""

# ── 18. Material Ordering Schedule ───────────────────────────────────
DOCS['Material Ordering Schedule'] = r"""═══════════════════════════════════════════════════════════════
        MATERIAL ORDERING SCHEDULE (MOS)
         DDG-51 FLIGHT III – DDG-133/134
═══════════════════════════════════════════════════════════════
Program:    PMS 400D DDG-51 Flight III
Prepared:   ILS/Provisioning Team      Date: 01 APR 2025
Period:     FY2025-FY2027              Rev: 4

────────────────────────────────────────────────────────────────────────────────────
ORD  │ PR/REQ NUMBER    │ SYSTEM/COMPONENT          │ VENDOR              │ CAGE  │ VALUE         │ LEAD TIME │ ORDER BY   │ NEED DATE  │ FUND SRC│ STATUS
─────┼──────────────────┼───────────────────────────┼─────────────────────┼───────┼───────────────┼───────────┼────────────┼────────────┼─────────┼──────────
 001 │ N00024-25-NR-001 │ EW Suite Initial Spares   │ L3Harris Tech       │ 3R2Y7 │  $1,678,220.00│  180 days │ 01 APR 2025│ 01 OCT 2025│ SCN     │ ON ORDER
 002 │ N00024-25-NR-002 │ SPY-6 Radar LRU Spares   │ Raytheon            │ 7S695 │  $4,250,000.00│  270 days │ 01 JAN 2025│ 01 OCT 2025│ SCN     │ ON ORDER
 003 │ N00024-25-NR-003 │ MK45 Gun Barrel (spare)   │ BAE Systems         │ K4895 │    $890,000.00│  120 days │ 15 NOV 2024│ 01 MAR 2025│ O&MN    │ RECEIVED
 004 │ N00024-25-NR-004 │ LM2500+G4 Hot Section     │ GE Marine           │ 0DKM0 │  $2,100,000.00│  365 days │ 01 JAN 2025│ 01 JAN 2026│ SCN     │ ON ORDER
 005 │ N00024-25-NR-005 │ VLS Canister Seals        │ Lockheed Martin     │ 64547 │    $340,000.00│   90 days │ 01 APR 2025│ 01 JUL 2025│ O&MN    │ ON ORDER
 006 │ N00024-25-NR-006 │ Hull Structural Kit       │ HII                 │ 2Y197 │  $1,450,000.00│  210 days │ 01 MAR 2025│ 01 OCT 2025│ SCN     │ ON ORDER
 007 │ N00024-25-NR-007 │ CP Propeller Blades       │ Rolls-Royce         │ U7390 │  $3,200,000.00│  300 days │ 01 JAN 2025│ 01 NOV 2025│ SCN     │ ON ORDER
 008 │ N00024-25-NR-008 │ DRSVM Valve Actuators     │ Curtiss-Wright      │ 74628 │    $560,000.00│  150 days │ 01 SEP 2024│ 01 FEB 2025│ O&MN    │ RECEIVED
 009 │ N00024-25-NR-009 │ Phalanx Barrel Assy       │ Raytheon            │ 7S695 │    $420,000.00│  120 days │ 01 APR 2025│ 01 AUG 2025│ O&MN    │ ON ORDER
 010 │ N00024-25-NR-010 │ PCM Power Modules         │ DRS Defense         │ 5K575 │    $780,000.00│  180 days │ 01 MAR 2025│ 01 SEP 2025│ SCN     │ ON ORDER
 011 │ N00024-25-NR-011 │ SSDS SW License           │ Elbit Systems       │ 8B825 │    $220,000.00│   30 days │ 01 DEC 2024│ 01 JAN 2025│ O&MN    │ RECEIVED
 012 │ N00024-25-NR-012 │ Sonar TAS Array Spares    │ Thales Defense      │ F4835 │  $1,890,000.00│  240 days │ 01 APR 2025│ 01 DEC 2025│ SCN     │ ON ORDER
 013 │ N00024-25-NR-013 │ Navigation Upgrade Kit    │ Northrop Grumman    │ 27539 │    $650,000.00│  365 days │ 01 APR 2025│ 01 APR 2026│ SCN     │ PENDING
 014 │ N00024-25-NR-014 │ CIGS 57mm Barrel          │ General Dynamics    │ 77040 │    $380,000.00│  150 days │ 01 OCT 2024│ 01 MAR 2025│ O&MN    │ RECEIVED
 015 │ N00024-25-NR-015 │ SATCOM Crypto Module      │ Harris Corp         │ 3R2Y7 │    $290,000.00│  180 days │ 01 APR 2025│ 01 OCT 2025│ O&MN    │ ON ORDER
─────┼──────────────────┼───────────────────────────┼─────────────────────┼───────┼───────────────┼───────────┼────────────┼────────────┼─────────┼──────────
                                                                                 │$19,098,220.00 │

PROCUREMENT TIMELINE SUMMARY:
  FY2025 Q1 (Oct-Dec): Orders 3, 4, 7, 8, 11, 14 ─ $7,150,000
  FY2025 Q2 (Jan-Mar): Orders 2, 6, 10            ─ $8,130,000
  FY2025 Q3 (Apr-Jun): Orders 1, 5, 9, 12, 15     ─ $4,618,220
  FY2025 Q4 (Jul-Sep): No new orders (deliveries)
  FY2026 Q1 (Oct-Dec): Order 13                    ─   $650,000

CRITICAL PATH ITEMS (Long Lead > 270 Days):
  ⚠ SPY-6 Radar Spares     – 270 days (Order by Q2 FY25)
  ⚠ CP Propeller Blades    – 300 days (Order by Q1 FY25)
  ⚠ LM2500 Hot Section     – 365 days (Order by Q1 FY25)
  ⚠ Navigation Upgrade     – 365 days (Order by Q3 FY25)
═══════════════════════════════════════════════════════════════"""

# ── 19. Master Equipment List (MEL) ──────────────────────────────────
DOCS['Master Equipment List'] = r"""═══════════════════════════════════════════════════════════════
              MASTER EQUIPMENT LIST (MEL)
      DDG-133 (DDG-51 FLIGHT III) – COMBAT SYSTEMS
═══════════════════════════════════════════════════════════════
Hull:      DDG-133                    Date: 01 APR 2025
Program:   PMS 400D                   Rev:  3
Prepared:  NAVSEA SEA 05 / PMS 400D
Classification: UNCLASSIFIED

EQUIP ID │ SYSTEM/SUBSYSTEM         │ NOMENCLATURE                    │ NSN               │ QTY│ LOCATION       │ INSTALL DATE │ WARRANTY EXP  │ PM CYCLE│ STATUS
─────────┼──────────────────────────┼─────────────────────────────────┼───────────────────┼────┼────────────────┼──────────────┼───────────────┼─────────┼──────────
CS-001   │ EW Suite                 │ AN/SLQ-32(V)6 Complete System   │ 5895-01-589-1000  │   1│ CIC/Topside    │ 15 NOV 2024  │ 15 NOV 2026   │ 500 hrs │ FMC
CS-002   │ Air/Missile Defense Radar│ AN/SPY-6(V)1 AMDR               │ 5840-01-700-0001  │   1│ Superstructure │ 01 SEP 2024  │ 01 SEP 2026   │ 720 hrs │ FMC
CS-003   │ Gun Weapon System        │ MK45 Mod 4 5in/62 Cal           │ 1015-01-200-0001  │   1│ Fwd Mount      │ 01 AUG 2024  │ 01 AUG 2029   │ 250 rds │ FMC
CS-004   │ Vertical Launch System   │ MK41 VLS (96 cells)             │ 1440-01-300-0001  │   2│ Fwd/Aft        │ 01 JUL 2024  │ 01 JUL 2029   │ Annual  │ FMC
CS-005   │ Close-In Weapon System   │ Phalanx Block 1B CIWS           │ 1015-01-400-0001  │   2│ Fwd/Aft        │ 01 OCT 2024  │ 01 OCT 2026   │ 200 hrs │ FMC
CS-006   │ Combat Management        │ SSDS MK 2 Mod 2                 │ 5895-01-500-0001  │   1│ CIC            │ 01 SEP 2024  │ 01 SEP 2026   │ 90 days │ FMC
CS-007   │ Sonar Suite              │ AN/SQQ-89A(V)15                 │ 5845-01-600-0001  │   1│ Sonar Room     │ 01 OCT 2024  │ 01 OCT 2026   │ 500 hrs │ FMC
CS-008   │ Fire Control             │ MK160 Mod 11 GFCS               │ 5895-01-350-0001  │   1│ CIC            │ 01 AUG 2024  │ 01 AUG 2026   │ 360 hrs │ FMC
CS-009   │ SATCOM                   │ AN/USC-61(V) Terminal           │ 5820-01-678-9921  │   2│ Comm Center    │ 15 NOV 2024  │ 15 NOV 2026   │ 720 hrs │ FMC
CS-010   │ Navigation               │ AN/WSN-12 RLGN                  │ 5826-01-250-0001  │   2│ Nav Center     │ 01 JUL 2024  │ 01 JUL 2029   │ Annual  │ FMC
CS-011   │ Decoy System             │ MK36 SRBOC (6 launchers)       │ 1095-01-150-0001  │   6│ Weatherdeck    │ 01 SEP 2024  │ 01 SEP 2029   │ Annual  │ FMC
CS-012   │ Torpedo Defense          │ AN/SLQ-25E Nixie                │ 5895-01-450-0001  │   1│ Fantail        │ 01 OCT 2024  │ 01 OCT 2026   │ 180 hrs │ FMC
CS-013   │ IFF System               │ AN/UPX-29(V) Interrogator      │ 5840-01-550-0001  │   1│ CIC            │ 01 AUG 2024  │ 01 AUG 2026   │ 500 hrs │ FMC
CS-014   │ Comms Suite              │ AN/SRC-64(V)1 MFTA             │ 5820-01-750-0001  │   1│ Comm Center    │ 01 SEP 2024  │ 01 SEP 2026   │ 360 hrs │ FMC
CS-015   │ Propulsion Control       │ ECSS Engineering Control        │ 5895-01-650-0001  │   1│ Main Control   │ 01 JUN 2024  │ 01 JUN 2029   │ 90 days │ FMC
─────────┼──────────────────────────┼─────────────────────────────────┼───────────────────┼────┼────────────────┼──────────────┼───────────────┼─────────┼──────────
                                                                                          │ 24 │                │              │               │         │

EQUIPMENT SUMMARY:
  Total Combat System Equipment:  15 major systems (24 units)
  Full Mission Capable (FMC):      24 / 24  (100%)
  Partial Mission Capable (PMC):    0
  Not Mission Capable (NMC):        0

WARRANTY STATUS:
  Under Warranty:   15 systems
  Warranty Expired:  0 systems
  Next Expiry:      CS-003 MK45 Gun – 01 AUG 2029

MAINTENANCE NOTES:
  Next scheduled availability: DDG-133 SRA – FY2027 Q2
  Outstanding CASREPs: None
  DMSMS Watch Items: CS-001 (RF Amp LN, TWT), CS-002 (Processor cards)
═══════════════════════════════════════════════════════════════"""

# ── 20. DRL/CDRL Tracker ─────────────────────────────────────────────
DOCS['DRL/CDRL Tracker'] = r"""═══════════════════════════════════════════════════════════════
        DATA REQUIREMENTS LIST (DRL) / CDRL TRACKER
              CONTRACT N00024-23-C-5520
═══════════════════════════════════════════════════════════════
Program:   DDG-51 Flight III – SEWIP Block 3
Contractor: L3Harris Technologies (CAGE: 3R2Y7)
Tracking Period: FY2025 Q2 (01 JAN – 31 MAR 2025)
Report Date: 01 APR 2025

DRL │ DI NUMBER      │ CDRL TITLE                         │ DUE DATE   │ SUBMIT DATE│ STATUS    │ GOVT REVIEW│ DISPOSITION
────┼────────────────┼────────────────────────────────────┼────────────┼────────────┼───────────┼────────────┼─────────────
A001│ DI-ILSS-81490  │ Integrated Logistics Support Plan   │ 15 JAN 2025│ 14 JAN 2025│ APPROVED  │ 12 FEB 2025│ Approved w/comments
A002│ DI-ILSS-81494  │ PMS Development Plan                │ 01 FEB 2025│ 30 JAN 2025│ APPROVED  │ 28 FEB 2025│ Approved
A003│ DI-ILSS-81493  │ Provisioning Tech Documentation    │ 01 MAR 2025│ 28 FEB 2025│ IN REVIEW │ TBD        │ Under Government review
A004│ DI-ILSS-81495  │ Vendor Recommended Spares List      │ 15 MAR 2025│ 15 MAR 2025│ APPROVED  │ 10 APR 2025│ Approved
A005│ DI-ILSS-81496  │ Allowance Parts List (APL)         │ 01 APR 2025│ 29 MAR 2025│ SUBMITTED │ TBD        │ Pending review
A006│ DI-TMSS-81000  │ Technical Manual – Operator        │ 01 APR 2025│ 01 APR 2025│ SUBMITTED │ TBD        │ Pending review
A007│ DI-TMSS-80063  │ TM Content Verification            │ 15 APR 2025│             │ PENDING   │            │ Not yet due
A008│ DI-SESS-81521  │ Support Equipment Recommendation   │ 01 FEB 2025│ 01 FEB 2025│ APPROVED  │ 01 MAR 2025│ Approved
A009│ DI-CMAN-81248  │ Engineering Change Proposal        │ As Required│ 10 MAR 2025│ APPROVED  │ 22 MAR 2025│ ECP N-2025-041 approved
A010│ DI-MISC-81355  │ Program Management Review (PMR)    │ Monthly    │ 15 MAR 2025│ DELIVERED │ 20 MAR 2025│ Acknowledged
A011│ DI-ILSS-81497  │ DMSMS Management Plan              │ 01 FEB 2025│ 31 JAN 2025│ APPROVED  │ 27 FEB 2025│ Approved w/conditions
A012│ DI-RELI-81369  │ Reliability Analysis Report        │ 01 MAR 2025│ 28 FEB 2025│ IN REVIEW │ TBD        │ Under Government review
A013│ DI-ALSS-81375  │ Training Plan                      │ 15 FEB 2025│ 14 FEB 2025│ APPROVED  │ 14 MAR 2025│ Approved
A014│ DI-CMAN-81249  │ Configuration Status Accounting    │ Quarterly  │ 01 APR 2025│ SUBMITTED │ TBD        │ Pending review
A015│ DI-QCIC-81013  │ Quality Assurance Plan             │ 15 JAN 2025│ 14 JAN 2025│ APPROVED  │ 10 FEB 2025│ Approved
────┼────────────────┼────────────────────────────────────┼────────────┼────────────┼───────────┼────────────┼─────────────

SUMMARY:
  Total CDRLs: 15
  Approved:     9  ██████████░░░░░  60%
  In Review:    2  ██░░░░░░░░░░░░░  13%
  Submitted:    2  ██░░░░░░░░░░░░░  13%
  Pending:      1  █░░░░░░░░░░░░░░   7%
  Delivered:    1  █░░░░░░░░░░░░░░   7%

OVERDUE: None
ON-TIME DELIVERY RATE: 100% (15/15 submitted on or before due date)

NEXT QUARTER DELIVERABLES (FY2025 Q3):
  A003 – PTD (resubmit after comments)  Due: 15 APR 2025
  A007 – TM Content Verification        Due: 15 APR 2025
  A010 – PMR (April)                    Due: 15 APR 2025
  A010 – PMR (May)                      Due: 15 MAY 2025
  A010 – PMR (June)                     Due: 15 JUN 2025
═══════════════════════════════════════════════════════════════"""


# ══════════════════════════════════════════════════════════════════════
# BUILD AND APPLY
# ══════════════════════════════════════════════════════════════════════

with open(FILE, 'r') as f:
    content = f.read()

# ── 1. Build JS samples object ───────────────────────────────────────
lines = []
for i, (name, doc_text) in enumerate(DOCS.items()):
    doc_lines = doc_text.strip().split('\n')
    js_parts = []
    for dl in doc_lines:
        escaped = dl.replace('\\', '\\\\').replace("'", "\\'")
        js_parts.append("            '" + escaped + "\\n'")
    # last part: no trailing \n (match existing style)
    if js_parts:
        js_parts[-1] = js_parts[-1].replace("\\n'", "'")
    entry = "        '" + name.replace("'", "\\'") + "': " + " +\n".join(js_parts)
    lines.append(entry)

new_samples_js = "    var samples = {\n" + ",\n\n".join(lines) + "\n    };"

# Find the samples block (from comment through closing `};`)
pattern = re.compile(
    r'(    // Auto-fill sample content based on type\n)'
    r'    var samples = \{.*?\};',
    re.DOTALL
)

m = pattern.search(content)
if not m:
    print("ERROR: Could not find samples block")
    exit(1)

print(f"Found samples block at chars {m.start()}-{m.end()}")
replacement = m.group(1) + new_samples_js
new_content = content[:m.start()] + replacement + content[m.end():]

# ── 2. Add new record-type buttons ───────────────────────────────────
# The existing HTML uses <div class="label">Maintenance</div>
LAST_BTN_LABEL = '<div class="label">Maintenance</div>'
lbl_pos = new_content.find(LAST_BTN_LABEL)
if lbl_pos > 0:
    # Find closing </div> of this button (two closes: inner label div then outer btn div)
    first_close = new_content.find('</div>', lbl_pos)  # closes <div class="label">
    second_close = new_content.find('</div>', first_close + 6)  # closes record-type-btn
    if second_close > 0:
        insert_at = second_close + len('</div>')
        new_buttons = """
            <div class="record-type-btn" onclick="selectRecordType(this,'Contract Modification')" data-type="Contract Modification">
                <i class="fas fa-file-contract"></i>
                <div class="label">Contract Mod</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'Spares Spreadsheet')" data-type="Spares Spreadsheet">
                <i class="fas fa-table"></i>
                <div class="label">Spares List</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'COTS Manual')" data-type="COTS Manual">
                <i class="fas fa-book"></i>
                <div class="label">COTS Manual</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'Tech Manual')" data-type="Tech Manual">
                <i class="fas fa-book-open"></i>
                <div class="label">Tech Manual</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'TM Index')" data-type="TM Index">
                <i class="fas fa-list-ol"></i>
                <div class="label">TM Index</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'PO Index')" data-type="PO Index">
                <i class="fas fa-shopping-cart"></i>
                <div class="label">PO Index</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'ECP')" data-type="ECP">
                <i class="fas fa-drafting-compass"></i>
                <div class="label">ECP</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'LCSP')" data-type="LCSP">
                <i class="fas fa-project-diagram"></i>
                <div class="label">LCSP</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'Engineering Drawing')" data-type="Engineering Drawing">
                <i class="fas fa-pencil-ruler"></i>
                <div class="label">Drawing</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'Configuration Status')" data-type="Configuration Status">
                <i class="fas fa-cogs"></i>
                <div class="label">Config Status</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'Outfitting List')" data-type="Outfitting List">
                <i class="fas fa-boxes"></i>
                <div class="label">Outfitting/APL</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'Material Ordering Schedule')" data-type="Material Ordering Schedule">
                <i class="fas fa-calendar-alt"></i>
                <div class="label">Mat'l Ordering</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'Master Equipment List')" data-type="Master Equipment List">
                <i class="fas fa-server"></i>
                <div class="label">Equipment MEL</div>
            </div>
            <div class="record-type-btn" onclick="selectRecordType(this,'DRL/CDRL Tracker')" data-type="DRL/CDRL Tracker">
                <i class="fas fa-tasks"></i>
                <div class="label">DRL/CDRL</div>
            </div>"""
        new_content = new_content[:insert_at] + new_buttons + new_content[insert_at:]
        print("✅ Added 14 new record type buttons")
    else:
        print("⚠️  Could not find button closing div")
else:
    print("⚠️  Could not find last record type button label")

# ── 3. Update CSS grid to handle 20 items ────────────────────────────
old_grid_css = """.record-type-grid {
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
            gap:10px;
            margin-bottom:16px;
        }"""
new_grid_css = """.record-type-grid {
            display:grid;
            grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
            gap:8px;
            margin-bottom:16px;
            max-height:360px;
            overflow-y:auto;
            padding:4px;
        }"""
if old_grid_css in new_content:
    new_content = new_content.replace(old_grid_css, new_grid_css, 1)
    print("✅ Updated record-type-grid CSS for 20 items")
else:
    print("⚠️  Could not find exact grid CSS to replace")

# Also update responsive breakpoint
old_responsive = '.record-type-grid { grid-template-columns:repeat(3,1fr); }'
new_responsive = '.record-type-grid { grid-template-columns:repeat(4,1fr); }'
if old_responsive in new_content:
    new_content = new_content.replace(old_responsive, new_responsive, 1)
    print("✅ Updated responsive grid columns")

# ── 4. Write ─────────────────────────────────────────────────────────
with open(FILE, 'w') as f:
    f.write(new_content)

total_lines = new_content.count('\n') + 1
print(f"✅ demo.html updated – {total_lines} lines")
print(f"   {len(DOCS)} document types with realistic multi-page content")
