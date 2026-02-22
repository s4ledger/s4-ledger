#!/usr/bin/env python3
"""
Round 5 — Realistic Demo Data Upgrade
======================================
Replaces one-line demo records with full, realistic military logistics
documents: DD-1149, DD-250, WAWF Receipt, Container Manifest, 
Custody Transfer, Maintenance Log.

Each record looks like a real document with:
- Letterheads / headers
- Full data fields
- Tables (using fixed-width formatting)
- Signatures
- Dates, NSNs, contract numbers, CAGE codes, etc.
"""

import json

filepath = 'demo-app/demo.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# ══════════════════════════════════════════════════════════════════
# REALISTIC DOCUMENT SAMPLES
# ══════════════════════════════════════════════════════════════════

realistic_samples = {
    'DD Form 1149': r'''═══════════════════════════════════════════════════════════════════
                    DEPARTMENT OF DEFENSE
           REQUISITION AND INVOICE / SHIPPING DOCUMENT
                       DD FORM 1149
═══════════════════════════════════════════════════════════════════

DOCUMENT NUMBER: W56HZV-25-R-04821       DATE: 14 APR 2025
REQUISITION NUMBER: N00024-25-0482       PRIORITY: 02 (URGENT)
FUND CODE: 1A                           SIGNAL CODE: A

─── SHIP FROM ───────────────────────────────────────────────────
   DLA Distribution San Joaquin
   25600 S. Chrisman Rd, Building 200
   Tracy, CA 95376-5000
   DODAAC: W62N2B    CAGE: 3R2Y7

─── SHIP TO ─────────────────────────────────────────────────────
   1st Supply Battalion, 1st MLG
   Marine Corps Base Camp Pendleton
   Camp Pendleton, CA 92055-5001
   DODAAC: M40100    UIC: M40100

─── LINE ITEMS ──────────────────────────────────────────────────
LN   NSN                 NOMENCLATURE              QTY  UI  UNIT PRICE  TOTAL
01   5820-01-234-5678    RADIO SET, JTRS AN/PRC-154   48  EA  $4,285.00  $205,680.00
02   5895-01-587-2143    ANTENNA, MULTIBAND OE-505     48  EA    $342.50   $16,440.00
03   5985-01-432-8901    BATTERY, LITHIUM ION BB2590   96  EA    $187.00   $17,952.00
04   5820-01-678-3456    HANDSET, H-250/U              48  EA     $85.00    $4,080.00
05   8105-01-345-6789    BAG, CARRYING, RADIO           48  EA     $45.00    $2,160.00
                                                                         ───────────
                                              TOTAL ITEMS: 288  TOTAL: $246,312.00

─── TRANSPORTATION ──────────────────────────────────────────────
   MODE: Commercial Carrier (FedEx Freight)
   TRACKING: 7958 2410 3847
   WEIGHT: 1,248 lbs    CUBE: 42 cu ft
   TCN: W56HZV25R04821001
   REQUIRED DELIVERY DATE: 21 APR 2025
   FREIGHT CLASS: 70    HAZMAT: N

─── SPECIAL INSTRUCTIONS ────────────────────────────────────────
   1. COMSEC material enclosed — handle per AR 380-40
   2. Two-person integrity required for receipt
   3. Serial number accountability required for LN 01
   4. Items are GFE under Contract N00024-23-C-5520
   5. POC: SSgt Martinez, DSN 361-4872

─── CERTIFICATION ───────────────────────────────────────────────
I certify that the above items have been inspected, properly
packaged, marked per MIL-STD-2073, and released for shipment.

Shipping Officer: ___[signed]___
   CPT Amanda J. Rodriguez, USA
   DLA Distribution San Joaquin
   Date: 14 APR 2025

Receiving Officer: ___[pending]___
   (signature upon receipt)

DOCUMENT STATUS: ORIGINATED — AWAITING RECEIPT CONFIRMATION
═══════════════════════════════════════════════════════════════════
   S4 LEDGER — Anchored to XRPL for immutable audit trail
═══════════════════════════════════════════════════════════════════''',

    'DD Form 250': r'''═══════════════════════════════════════════════════════════════════
              MATERIAL INSPECTION AND RECEIVING REPORT
                       DD FORM 250
                 (WIDE AREA WORKFLOW - UID)
═══════════════════════════════════════════════════════════════════

1. PROC INSTRUMENT ID: N00024-23-C-5520    2. SHIPMENT NO: 025
3. DATE SHIPPED: 12 APR 2025               4. B/L TCN: N0002425C5520025
5. DISCOUNT TERMS: Net 30                  6. INVOICE NO: HII-2025-07744
7. PAGE: 1 of 1                            8. ACCEPTANCE POINT: SOURCE

─── PRIME CONTRACTOR ────────────────────────────────────────────
   Huntington Ingalls Industries - Newport News
   4101 Washington Avenue
   Newport News, VA 23607-2770
   CAGE: 3R2Y7    DUNS: 00-124-8706    TIN: 54-1616988

─── ADMINISTERED BY ─────────────────────────────────────────────
   DCMA San Diego
   7675 Dagget St, Suite 200
   San Diego, CA 92111-2241
   Code: S2101A

─── SHIPPED TO ──────────────────────────────────────────────────
   Norfolk Naval Shipyard (NNSY)
   1 Doyen Street
   Portsmouth, VA 23709-1000
   DODAAC: N42158

─── CONTRACT LINE ITEMS ─────────────────────────────────────────
CLIN  NSN/PN              DESCRIPTION                    QTY  UI  AMOUNT
0001  HULL-078-MOD-4A     CVN-78 EMALS Cat 2 Controller    2  EA  $2,847,500.00
0002  5998-01-652-4321    Power Conditioning Unit PCU-4     4  EA    $425,000.00
0003  5998-01-652-4322    Surge Protector Assembly SPA-2    4  EA     $87,500.00
0004  DATA-TECH-PKG       Technical Data Package Rev 4.1    1  LO     $75,000.00
                                                                   ─────────────
                                                    SUBTOTAL: $4,560,000.00
                                                    TAX: EXEMPT (USG)
                                                     TOTAL:  $4,560,000.00

─── QUALITY ASSURANCE ───────────────────────────────────────────
INSPECTION: MIL-STD-1916, Verification Level VII
   FAT (First Article Test): PASSED — 08 MAR 2025
   Source Inspection: PASSED — 11 APR 2025
   100% dimensional verification completed
   Electrical performance within spec (±0.5%)
   Vibration/shock per MIL-STD-810H: PASSED
   EMI/EMC per MIL-STD-461G: PASSED

QAR: ___[signed]___
   James T. Mitchell, QAS/DCMA-SanDiego
   Date: 11 APR 2025

─── CONTRACTOR CERTIFICATION ────────────────────────────────────
The supplies/services listed above have been inspected in
accordance with contract requirements and conform to the
contract, except as noted.

Contractor Representative: ___[signed]___
   Michael S. Chen, VP Engineering
   Huntington Ingalls Industries
   Date: 12 APR 2025

─── GOVERNMENT ACCEPTANCE ───────────────────────────────────────
The supplies/services listed above have been received and
found to be in conformance with the contract requirements.

Accepting Official: ___[signed]___
   CDR Patricia K. Westbrook, USN
   Supervisor of Shipbuilding, Newport News
   Date: 12 APR 2025    Time: 1435Z

═══════════════════════════════════════════════════════════════════
 PAYMENT STATUS: APPROVED FOR PAYMENT — DFAS PENDING
 WAWF STATUS: ACCEPTED — INSPECTOR & ACCEPTOR SIGNED
═══════════════════════════════════════════════════════════════════
   S4 LEDGER — Anchored to XRPL for immutable audit trail
═══════════════════════════════════════════════════════════════════''',

    'WAWF Receipt': r'''═══════════════════════════════════════════════════════════════════
              WIDE AREA WORKFLOW (WAWF) RECEIVING REPORT
                   GFM (Government Furnished Material)
═══════════════════════════════════════════════════════════════════

WAWF DOCUMENT: WAWF-RR-2025-19334      DATE: 11 APR 2025
CONTRACT: N00024-23-C-5520              DELIVERY ORDER: 0047
SHIP NUMBER: 025                        ACCEPTANCE: DESTINATION

─── ISSUING ACTIVITY ────────────────────────────────────────────
   NAVSUP Weapon Systems Support (NAVSUP WSS)
   5450 Carlisle Pike, Building 309
   Mechanicsburg, PA 17050-2411
   DODAAC: N00104    UIC: N00104
   POC: Robert L. Nguyen, GS-13 | Tel: DSN 430-5721

─── RECEIVING ACTIVITY ──────────────────────────────────────────
   Ingalls Shipbuilding (PAS: Pascagoula)
   1000 Access Road, Building 71
   Pascagoula, MS 39568-0149
   CAGE: 97384    DODAAC: SPQ523
   POC: Janet M. Stewart, Material Control

─── GFM ITEMS RECEIVED ─────────────────────────────────────────
SEQ  NSN               NOMENCLATURE             SERIAL/LOT    QTY  UI  COND
001  5821-01-543-2178  CRYPTOGRAPHIC DEVICE     SN: KG-175D7     1  EA  A
                       KG-175D (TACLANE)        COMSEC ACCT:
                                                CKE-2025-3341
002  5895-01-482-3765  ANTENNA GROUP             SN: N/A          2  EA  A
                       OE-570/VRC               LOT: 24-0891
003  2815-01-398-2456  ENGINE, DIESEL MARINE     SN: MTU-8845     1  EA  A
                       MTU 16V 1163 TB93        
004  2990-01-567-8901  FUEL INJECTOR ASSEMBLY    LOT: 25-0112     8  EA  A
005  4920-01-321-6543  TEST SET, ENGINE           SN: TS-44812    1  EA  A
                       DIAGNOSTIC AN/SSM-7

─── INSPECTION RESULTS ──────────────────────────────────────────
INSPECTION TYPE: Visual & Dimensional per receiving SOP
DISCREPANCIES: NONE
MATERIAL CONDITION: ALL ITEMS — CONDITION CODE A (SERVICEABLE)
PACKAGING: Adequate, MIL-STD-2073-1E compliant
COMSEC VERIFICATION: KG-175D serial verified against DD-254
HAZMAT: Item 003 contains fluids — MSDS on file

─── SIGNATURES ──────────────────────────────────────────────────
Material Inspector: ___[signed]___
   QA2 David R. Thompson
   DCMA Pascagoula
   Date: 11 APR 2025    Time: 0930L

Receiving Clerk: ___[signed]___
   Janet M. Stewart
   Ingalls Shipbuilding, Material Control
   Date: 11 APR 2025    Time: 0945L

COR (Contracting Officer Representative): ___[signed]___
   LCDR Brian K. Patterson, USN
   PMS 377 (DDG-51 Class Program Office)
   Date: 11 APR 2025    Time: 1020L

─── WAWF ROUTING ────────────────────────────────────────────────
INSPECTOR: DCMA (S2101A)     → SIGNED 11 APR 0930
ACCEPTOR: NAVSUP (N00104)    → SIGNED 11 APR 1020
LPO: DFAS Columbus (HQ0339)  → PAYMENT PENDING
STATUS: ACCEPTED — AWAITING PAYMENT PROCESSING (Est. 30 days)

═══════════════════════════════════════════════════════════════════
   S4 LEDGER — Anchored to XRPL for immutable audit trail
═══════════════════════════════════════════════════════════════════''',

    'Container Manifest': r'''═══════════════════════════════════════════════════════════════════
              MILITARY CONTAINER MANIFEST / BILL OF LADING
           UNITED STATES TRANSPORTATION COMMAND (USTRANSCOM)
═══════════════════════════════════════════════════════════════════

MANIFEST NUMBER: CONT-USMIL-2025-5521    DATE: 10 APR 2025
MOVEMENT DESIGNATOR: USN-NORF-2504       PRIORITY: TP-2
CLASSIFICATION: UNCLASSIFIED // FOUO
CONTAINER: 20ft ISO Steel Dry (8x8x20)

─── CONTAINER DETAILS ───────────────────────────────────────────
CONTAINER ID: MSCU-2458736
OWNER/LESSEE: Military Sealift Command (MSC)
SEAL NUMBERS:
   Shipper: 4479218 (US Customs bolt seal)
   Carrier: MSC-2025-88412 (high-security cable seal)
TARE WEIGHT: 2,200 kg         GROSS WEIGHT: 14,200 kg
NET CARGO WEIGHT: 12,000 kg   CUBE: 28.3 CBM
VGM (Verified Gross Mass): 14,200 kg — SOLAS certified

─── ORIGIN ──────────────────────────────────────────────────────
   Naval Station Rota, Spain
   CFS Warehouse Bldg 3142
   PSC 819 Box 55, FPO AE 09645-3300
   DODAAC: N62802    UIC: N62802
   POC: LT Carlos M. Reyes, USN | Tel: DSN 727-3188

─── DESTINATION ─────────────────────────────────────────────────
   Naval Station Norfolk
   Gate 4, POL Pier 12, Warehouse 7
   1530 Gilbert Street
   Norfolk, VA 23511-2797
   DODAAC: N32345    UIC: N32345
   POC: CWO3 Linda J. Morrison, USN

─── VESSEL / ROUTING ────────────────────────────────────────────
   VESSEL:    MV Cape Rise (T-AKR-295)
   VOYAGE:    MSC-VX-2504-EUR
   PORT LOAD: Rota, Spain (ESROT)    ETD: 10 APR 2025
   PORT DISCH: Norfolk, VA (USNFK)   ETA: 22 APR 2025
   TRANSIT: 12 days via Gibraltar → Azores → Norfolk

─── CARGO MANIFEST ──────────────────────────────────────────────
LN   TCN                    NOMENCLATURE                    QTY  WT(kg)
01   N62802-25-55210-001    ENGINE SPARE PARTS KIT, GTE      2   3,200
                            LM2500 (DDG-51 Class)
02   N62802-25-55210-002    VALVE ASSEMBLY, FIREMAIN         12    840
                            4-inch Bronze, MIL-V-17604
03   N62802-25-55210-003    PUMP, CENTRIFUGAL SALVAGE        3   2,400
                            P-250, 250 GPM
04   N62802-25-55210-004    CABLE ASSEMBLY, FIBER OPTIC     24   1,120
                            NTDS Type III, 100m runs
05   N62802-25-55210-005    GENERATOR SET, DIESEL            1   4,440
                            250kW Emergency (SSDG Spare)
                                                            ──  ──────
                                                    TOTAL:  42  12,000kg

─── HAZMAT DECLARATION ──────────────────────────────────────────
ITEM  UN#     PROPER SHIPPING NAME        CLASS  PG  QTY
LN05  UN3481  Lithium Ion Batteries        9     II   4 EA
              (contained in equipment)
   → IATA/IMDG compliant packaging
   → Emergency hotline: 1-800-424-9300 (CHEMTREC)

─── CUSTOMS / DOCUMENTATION ─────────────────────────────────────
   CBP ENTRY: Not required (Military exempt)
   ITN: X20250410ROTA5521    FTSR: FILED
   DD Form 1384 (TAC) attached
   Shipper's Export Declaration: FILED
   Insurance: IAW DFAS Manual 7000.14-R

─── SIGNATURES ──────────────────────────────────────────────────
Shipping Officer: ___[signed]___
   LT Carlos M. Reyes, USN
   Naval Station Rota, Port Operations
   Date: 10 APR 2025   Time: 0715Z

MSC Loading Officer: ___[signed]___
   2nd Mate Thomas O'Brien
   MV Cape Rise (T-AKR-295)
   Date: 10 APR 2025   Time: 0840Z

═══════════════════════════════════════════════════════════════════
   CONTAINER STATUS: IN TRANSIT — ETA NORFOLK 22 APR 2025
═══════════════════════════════════════════════════════════════════
   S4 LEDGER — Anchored to XRPL for immutable audit trail
═══════════════════════════════════════════════════════════════════''',

    'Custody Transfer': r'''═══════════════════════════════════════════════════════════════════
              CUSTODY TRANSFER / CHAIN OF CUSTODY RECORD
                 DEPARTMENT OF DEFENSE — DD Form 1150
═══════════════════════════════════════════════════════════════════

TRANSFER DOCUMENT: CT-2025-3389          DATE: 09 APR 2025
TRANSFER TYPE: LATERAL TRANSFER (Unit-to-Unit)
AUTHORITY: MARFOR Pacific CG Ltr 4400 dtd 12 MAR 2025
CLASSIFICATION: UNCLASSIFIED // CUI

─── ITEM DESCRIPTION ────────────────────────────────────────────
NOMENCLATURE: RADIO SET, JOINT TACTICAL (JTRS)
               AN/PRC-117G(V)1(C) Multiband/Satellite Radio
NSN:          5820-01-579-6921
SERIAL:       JTRS-G-2019-04582
CAGE:         1RZS4 (L3Harris Technologies)
ACQ VALUE:    $34,850.00
CONDITION:    A (Serviceable — Fully Mission Capable)
WARRANTY:     Active through 15 SEP 2025 (L3Harris SVC-882)

ASSOCIATED EQUIPMENT:
  ACC-01  Battery, Lithium-Ion BB-2590/U      SN: 2590-22871
  ACC-02  Handset, H-250/U                    SN: H250-45213
  ACC-03  Antenna, Broadband AS-5878/PRC      SN: AS58-11092
  ACC-04  Fill Device, AN/CYZ-10 (CFFK)       SN: CYZ10-01445
  ACC-05  Cable Assembly W-2, 6ft              NSN: 5995-01-432-1122
  ACC-06  Bag, Carrying, MOLLE-compatible      NSN: 8105-01-345-6789
  ACC-07  Technical Manual TM 11-5820-1053-13  Rev: Apr 2024

─── RELEASING UNIT (FROM) ───────────────────────────────────────
   3rd Marine Division (3d MARDIV)
   Camp Courtney, Okinawa, Japan
   UIC: M40001    DODAAC: M40001
   Property Book: GCSS-MC Acct 3MARDIV-COMM
   
   Releasing Officer: ___[signed]___
   Capt Marcus T. Williams, USMC
   Communications Company, HQ Bn
   Date: 09 APR 2025   Time: 0800L (JST)

─── RECEIVING UNIT (TO) ─────────────────────────────────────────
   Marine Corps Logistics Command (MARCORLOGCOM)
   814 Radford Blvd, Building 3500
   Albany, GA 31704-8543
   UIC: M67004    DODAAC: M67004
   Property Book: GCSS-MC Acct MCLC-MAINT
   
   Receiving Officer: ___[pending]___
   (Signature upon physical receipt & inspection)
   Est. Receipt Date: 18 APR 2025

─── AUTHORIZATION CHAIN ─────────────────────────────────────────
1. MARFOR Pacific (Originator)
   Col. James S. Reynolds, USMC
   G-4 Logistics, MARFORPAC
   Signed: 12 MAR 2025

2. 3d MARDIV Commanding General (Release Auth)
   BGen. Anthony P. Cortez, USMC
   Approved: 25 MAR 2025

3. MARCORLOGCOM (Gaining Auth)
   Mr. David L. Foster, SES
   Director, Maintenance Operations
   Approved: 28 MAR 2025

─── SHIPPING ────────────────────────────────────────────────────
   MODE: AMC Channel Flight (Patriot Express → DHL priority)
   TCN: M40001-25-3389-001
   AWB: AMC-3389-772-01
   Okinawa → Travis AFB → Albany, GA
   Customs: Military exempt per SOFA
   COMSEC: Two-person integrity maintained
   EST TRANSIT: 7-9 business days

─── CONDITION NOTES ─────────────────────────────────────────────
   • All COMSEC keys zeroized per NSA procedures
   • Software version: JTRS v4.2.1.1 (current)
   • Last PMCS: 05 APR 2025 — all checks satisfactory
   • No damage, corrosion, or cosmetic deficiencies noted
   • Operational test: PASSED (voice + data + SATCOM)
   • Fill device returned to COMSEC vault (separate chain)

═══════════════════════════════════════════════════════════════════
 STATUS: IN TRANSIT — AWAITING DELIVERY & RECEIPT SIGNATURE
═══════════════════════════════════════════════════════════════════
   S4 LEDGER — Anchored to XRPL for immutable audit trail
═══════════════════════════════════════════════════════════════════''',

    'Maintenance Log': r'''═══════════════════════════════════════════════════════════════════
           NAVAL AVIATION MAINTENANCE DISCREPANCY REPORT
                VIDS/MAF (OOMA) — NALCOMIS OMA
═══════════════════════════════════════════════════════════════════

MAF#: MX-2025-8812-001             DATE INITIATED: 08 APR 2025
AIRCRAFT: CH-53K King Stallion     BUNO (TAIL): 168451
TYPE/MODEL/SERIES: CH-53K          SQUADRON: HMH-461 "Iron Horse"
AIRFRAME HOURS: 847.2              LOCATION: MCAS New River, NC

─── DISCREPANCY ─────────────────────────────────────────────────
WUC: 72100    ATA: 72-10-00
SYSTEM: ENGINE — T408-GE-400 (Engine #2, Position Right)
MALFUNCTION CODE: 799 (Other Engine Malfunction)

DESCRIPTION:
During post-flight shutdown after Training Flt 25-0412:
  • Engine #2 TGB (Transfer Gearbox) OIL TEMP indication
    pegged at maximum (>150°C) on ICHDS multipurpose display
  • Operator reported "CAUTION - T2 TGB OIL TEMP HIGH" advisory
    at 140 kts / 2,500 ft during return to base
  • Oil pressure remained normal (55 psi) throughout flight
  • No unusual vibration, noise, or chip light indications
  • Engine operated normally except for temp reading
  • Suspected faulty temperature sensor (RTD probe)
  • Grounding condition: DOWN — AWM (Awaiting Maintenance)

─── WORK PERFORMED ──────────────────────────────────────────────
ACTION  DATE        DESCRIPTION                            TECH
001     08 APR 25   Initial troubleshooting per IETM       AD2 Santos
                    CH-53K-2-72-1-100. Inspected TGB
                    oil level — within limits (3.2 qt).
                    Ran BITE on EEC/FADEC — no faults.
                    
002     09 APR 25   Removed RTD temp probe P/N              AT1 Chen
                    GE-8284-T2, SN: T2P-2021-4415.
                    Visual: probe tip shows corrosion
                    and mineral deposits. IAW NAVAIR
                    01-CH53K-2-72-2-200, Task 72-10-02.
                    
003     09 APR 25   Installed new RTD probe P/N              AT1 Chen
                    GE-8284-T2, SN: T2P-2024-0918.
                    Torque: 35-40 ft-lbs per spec.
                    Lockwire installed, 0.032 MS20995.
                    
004     09 APR 25   Engine ground turn per NATOPS.           AO1 Park
                    Runtime: 22 min. TGB oil temp            AD2 Santos
                    stabilized at 78°C (normal range).
                    All parameters nominal:
                    • N1: 63.2% (idle) → 100.4% (MIL)
                    • ITT: 512°C (within limit 871°C)
                    • Oil Pres: 55 psi (min 40)
                    • Vibration: 0.8 IPS (limit 2.0)
                    
005     09 APR 25   FCF (Functional Check Flight)            QAR: AEC1
                    Flt 25-0418, 1.2 hrs. All engine         Callaway
                    parameters normal throughout
                    flight envelope. TGB temp 72-85°C.
                    AIRCRAFT UP — FULL MISSION CAPABLE.

─── PARTS CONSUMED ──────────────────────────────────────────────
SEQ  NSN                P/N           NOMENCLATURE        QTY  SRC
01   6685-01-652-3841   GE-8284-T2    TEMP PROBE, RTD      1   DLR
                                       (T408 TGB Sensor)
02   5310-01-234-0032   MS20995-NC32  LOCKWIRE, 0.032      1   CON
03   9150-01-456-7890   MIL-PRF-23699 OIL, SYNTHETIC        2Q  CON
                                       TGB Replenishment

─── QUALITY ASSURANCE ───────────────────────────────────────────
□ CDI (Collateral Duty Inspector): ___[signed]___
   ADCS Michael R. Callaway
   HMH-461 Quality Assurance
   Date: 09 APR 2025

□ CDQAR (Contractor QAR): N/A (organic maintenance)

□ Maintenance Control: ___[signed]___
   MSgt David F. Ruiz
   HMH-461 Maintenance Control
   Date: 09 APR 2025

─── DISPOSITION ─────────────────────────────────────────────────
   AIRCRAFT STATUS: UP — FMC (Full Mission Capable)
   FAILED COMPONENT: RFI tag → Supply (DLR turnaround)
   MAF CLOSED: 09 APR 2025 / 1645L
   NEXT SCHEDULED: 200-hr Phase @ 1,000 hrs (est. JUL 2025)
   TOTAL MAN-HOURS: 11.5
   TOTAL DOWNTIME: 28 hours

═══════════════════════════════════════════════════════════════════
   S4 LEDGER — Anchored to XRPL for immutable audit trail
═══════════════════════════════════════════════════════════════════'''
}

# Now replace the samples dict in demo.html
old_samples_block = """    var samples = {
        'DD Form 1149': 'DD1149-2025-04821 | NSN 5820-01-234-5678 | Qty: 48 | Ship To: Camp Pendleton, CA | Contract: W56HZV-24-C-0093',
        'DD Form 250': 'DD250-2025-07744 | CAGE: 3R2Y7 | CLIN 0001 | Acceptance: Source | Inspector: DCMA-SanDiego',
        'WAWF Receipt': 'WAWF-RR-2025-19334 | Contract: N00024-23-C-5520 | GFM Receipt | Location: NAVSUP-Mech',
        'Container Manifest': 'CONT-USMIL-2025-5521 | 20ft ISO | Weight: 14,200kg | Route: Rota\\u2192Norfolk | Seal: 4479218',
        'Custody Transfer': 'CT-2025-3389 | Item: JTRS Radio Set | From: 3rd MARDIV | To: MARCORLOGCOM | Auth: Col. Reynolds',
        'Maintenance Log': 'MX-2025-8812 | Tail: 168451 (CH-53K) | Phase: 200hr | Discrepancy: TGB oil temp sensor | Status: Complete'
    };"""

new_samples_js = "    var samples = {\n"
for i, (key, val) in enumerate(realistic_samples.items()):
    # Escape for JS string
    escaped = val.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')
    comma = ',' if i < len(realistic_samples) - 1 else ''
    new_samples_js += f"        '{key}': '{escaped}'{comma}\n"
new_samples_js += "    };"

if old_samples_block in content:
    content = content.replace(old_samples_block, new_samples_js)
    print("✓ Replaced demo page sample records with full realistic documents")
else:
    print("ERROR: Could not find old samples block in demo.html")
    # Try a more flexible match
    import re
    pattern = r"var samples = \{[^}]+\};"
    match = re.search(pattern, content)
    if match:
        content = content[:match.start()] + "var samples = {\n"
        for i, (key, val) in enumerate(realistic_samples.items()):
            escaped = val.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')
            comma = ',' if i < len(realistic_samples) - 1 else ''
            content += f"        '{key}': '{escaped}'{comma}\n"
        content += "    };" + content[match.end():]
        print("✓ Replaced via regex fallback")
    else:
        print("FATAL: Cannot find samples dict at all")

# ══════════════════════════════════════════════════════════════════
# Also make the textarea taller to show the full documents
# ══════════════════════════════════════════════════════════════════

old_textarea_style = "height:100px;"
if content.count(old_textarea_style) > 0:
    content = content.replace(old_textarea_style, "height:300px;", 2)  # Both textareas
    print("✓ Made textareas taller (300px) to show full documents")

# Alternative: find the textarea CSS
old_demo_textarea_css = "min-height:80px;"
new_demo_textarea_css = "min-height:300px;"
content = content.replace(old_demo_textarea_css, new_demo_textarea_css)

# Also look for the demo-textarea CSS class
if '.demo-textarea' in content:
    # Find and update the height
    old_css_height = '.demo-textarea {'
    idx = content.find(old_css_height)
    if idx != -1:
        # Find the closing brace
        end = content.find('}', idx)
        css_block = content[idx:end+1]
        if 'min-height' in css_block:
            pass  # Already updated
        elif 'height' in css_block:
            # Replace height value to be larger
            import re
            new_css = re.sub(r'height:\s*\d+px', 'height:320px', css_block)
            content = content.replace(css_block, new_css)
            print("✓ Updated .demo-textarea CSS height to 320px")

# ══════════════════════════════════════════════════════════════════
# Make the verified record display show the full document content
# (not truncated)
# ══════════════════════════════════════════════════════════════════

# Find where verified content is displayed
old_verify_display = "content.substring(0, 80)"
if old_verify_display in content:
    content = content.replace(old_verify_display, "content.substring(0, 500)")
    print("✓ Verify display now shows 500 chars instead of 80")

old_verify_display2 = "content.substring(0,80)"
if old_verify_display2 in content:
    content = content.replace(old_verify_display2, "content.substring(0, 500)")

# ══════════════════════════════════════════════════════════════════
# Write the result
# ══════════════════════════════════════════════════════════════════

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

new_lines = content.count('\n') + 1
orig_lines = original.count('\n') + 1
print(f"\nDemo page: {orig_lines} → {new_lines} lines")
print("Done! Realistic demo data applied.")
