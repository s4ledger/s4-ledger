"""
S4 Ledger — Defense Record Metrics API (Vercel Serverless)
Real XRPL Testnet integration with graceful fallback.
156+ defense record types across 9 branches (supports any custom type), 600 pre-seeded records.
Supabase integration for persistence (optional, graceful fallback).
API key authentication support.
Rate limiting, CORS, and request logging.
"""

from http.server import BaseHTTPRequestHandler
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, parse_qs
import hashlib
import random
import json
import os
import re
import hmac
import time

# XRPL Testnet integration (graceful fallback if unavailable)
try:
    from xrpl.clients import JsonRpcClient
    from xrpl.wallet import generate_faucet_wallet, Wallet
    from xrpl.models import Memo, Payment, AccountSet, IssuedCurrencyAmount
    from xrpl.transaction import submit_and_wait
    try:
        from xrpl.core.keypairs.main import CryptoAlgorithm
    except ImportError:
        try:
            from xrpl.core.keypairs import CryptoAlgorithm
        except ImportError:
            from enum import Enum
            class CryptoAlgorithm(Enum):
                ED25519 = "ed25519"
                SECP256K1 = "secp256k1"
    XRPL_AVAILABLE = True
except ImportError:
    XRPL_AVAILABLE = False

# Supabase integration (graceful fallback if unavailable)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")  # For server-side wallet storage
SUPABASE_AVAILABLE = bool(SUPABASE_URL and SUPABASE_KEY)

# API Key auth
API_MASTER_KEY = os.environ.get("S4_API_MASTER_KEY", "s4-demo-key-2026")
API_KEYS_STORE = {}  # In production, stored in Supabase

# Rate limiting (in-memory; resets per cold start)
_rate_limit_store = {}  # ip -> [timestamps]
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 120    # requests per window

# Request logging
_request_log = []
API_START_TIME = time.time()

# Verification audit log
_verify_audit_log = []  # [{timestamp, operator, record_hash, chain_hash, tx_hash, result, tamper_detected}]

# ═══════════════════════════════════════════════════════════════════════
#  MILITARY BRANCH DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════

BRANCHES = {
    "USN":   {"name": "U.S. Navy",                  "icon": "\u2693", "color": "#003b6f"},
    "USA":   {"name": "U.S. Army",                  "icon": "\u2b50", "color": "#4b5320"},
    "USAF":  {"name": "U.S. Air Force",             "icon": "\u2708\ufe0f", "color": "#00308f"},
    "USMC":  {"name": "U.S. Marine Corps",          "icon": "\U0001f985", "color": "#cc0000"},
    "USCG":  {"name": "U.S. Coast Guard",           "icon": "\U0001f6df", "color": "#003366"},
    "DLA":   {"name": "Defense Logistics Agency",   "icon": "\U0001f3db\ufe0f", "color": "#1a3a5c"},
    "JOINT": {"name": "Joint / Cross-Branch",       "icon": "\U0001f396\ufe0f", "color": "#4a4a4a"},
    "SOCOM": {"name": "Special Operations Command", "icon": "\U0001f5e1\ufe0f", "color": "#2d2d2d"},
    "USSF":  {"name": "U.S. Space Force",           "icon": "\U0001f680", "color": "#1a1a4e"},
}

# ═══════════════════════════════════════════════════════════════════════
#  156+ DEFENSE RECORD CATEGORIES (any custom record type also supported)
# ═══════════════════════════════════════════════════════════════════════

RECORD_CATEGORIES = {
    # --- U.S. Navy (USN) — 25 types ---
    "USN_SUPPLY_RECEIPT":  {"label": "Supply Chain Receipt",          "icon": "\U0001f4e6", "color": "#00aaff", "branch": "USN", "system": "NAVSUP OneTouch"},
    "USN_3M_MAINTENANCE":  {"label": "3-M Maintenance Action",       "icon": "\U0001f527", "color": "#ffd700", "branch": "USN", "system": "SKED/OARS"},
    "USN_CASREP":          {"label": "Casualty Report (CASREP)",     "icon": "\u26a0\ufe0f", "color": "#ff3333", "branch": "USN", "system": "TYCOM"},
    "USN_CDRL":            {"label": "CDRL Delivery",                "icon": "\U0001f4c4", "color": "#8ea4b8", "branch": "USN", "system": "CDMD-OA"},
    "USN_ORDNANCE":        {"label": "Ordnance Lot Tracking",        "icon": "\U0001f4a3", "color": "#ff6b6b", "branch": "USN", "system": "AESIP"},
    "USN_DEPOT_REPAIR":    {"label": "Depot Repair Record",          "icon": "\U0001f3ed", "color": "#ff9933", "branch": "USN", "system": "CNRMF"},
    "USN_INSURV":          {"label": "INSURV Inspection",            "icon": "\U0001f50d", "color": "#66ccff", "branch": "USN", "system": "NRCC"},
    "USN_CALIBRATION":     {"label": "TMDE Calibration",             "icon": "\U0001f4cf", "color": "#ff66aa", "branch": "USN", "system": "METCAL"},
    "USN_CONFIG":          {"label": "Configuration Baseline",       "icon": "\u2699\ufe0f", "color": "#c9a84c", "branch": "USN", "system": "CDMD-OA"},
    "USN_CUSTODY":         {"label": "Custody Transfer",             "icon": "\U0001f504", "color": "#14f195", "branch": "USN", "system": "DPAS"},
    "USN_TDP":             {"label": "Technical Data Package",       "icon": "\U0001f4d0", "color": "#9945ff", "branch": "USN", "system": "NAVSEA"},
    "USN_COC":             {"label": "Certificate of Conformance",   "icon": "\u2705", "color": "#00cc88", "branch": "USN", "system": "DCMA"},
    "USN_SHIPALT":         {"label": "Ship Alteration (SHIPALT)",    "icon": "\U0001f6a2", "color": "#0077cc", "branch": "USN", "system": "NAVSEA"},
    "USN_PMS":             {"label": "PMS/SKED Compliance",          "icon": "\U0001f4cb", "color": "#44aa88", "branch": "USN", "system": "3M/SKED"},
    "USN_HME":             {"label": "HM&E System Record",           "icon": "\u26a1", "color": "#dd8844", "branch": "USN", "system": "ENGSKED"},
    "USN_COMBAT_SYS":      {"label": "Combat Systems Cert",          "icon": "\U0001f3af", "color": "#ff4444", "branch": "USN", "system": "CSSQT"},
    "USN_PROPULSION":      {"label": "Propulsion Plant Exam",        "icon": "\U0001f525", "color": "#ff6600", "branch": "USN", "system": "INSURV"},
    "USN_AVIATION":        {"label": "Aviation Maintenance",         "icon": "\u2708\ufe0f", "color": "#0088cc", "branch": "USN", "system": "NALCOMIS"},
    "USN_FLIGHT_OPS":      {"label": "Flight Operations Record",     "icon": "\U0001f6eb", "color": "#3399ff", "branch": "USN", "system": "NATOPS"},
    "USN_SUBSAFE":         {"label": "SUBSAFE Certification",        "icon": "\U0001f512", "color": "#003366", "branch": "USN", "system": "NAVSEA 07"},
    "USN_DIVE_EQUIP":      {"label": "Diving Equipment Inspection",  "icon": "\U0001f93f", "color": "#006699", "branch": "USN", "system": "NAVSEA 00C"},
    "USN_MEDICAL":         {"label": "Medical Equipment Cert",       "icon": "\U0001f3e5", "color": "#33cc66", "branch": "USN", "system": "BUMED"},
    "USN_QDR":             {"label": "Quality Defect Report",        "icon": "\U0001f6ab", "color": "#cc0000", "branch": "USN", "system": "NAVSUP WSS"},
    "USN_FIELDING":        {"label": "Equipment Fielding",           "icon": "\U0001f6a2", "color": "#00ddaa", "branch": "USN", "system": "PMS"},
    "USN_REACTOR":         {"label": "Naval Reactor Test",           "icon": "\u2622\ufe0f", "color": "#ffcc00", "branch": "USN", "system": "NAVSEA 08"},

    # --- U.S. Navy ILS Records — 29 types ---
    "USN_DRL":             {"label": "Data Requirements List (DRL)",  "icon": "\U0001f4cb", "color": "#5599cc", "branch": "USN", "system": "NAVSEA/PMS"},
    "USN_DI":              {"label": "Data Item Description (DID)",   "icon": "\U0001f4c3", "color": "#4488bb", "branch": "USN", "system": "CDMD-OA"},
    "USN_VRS":             {"label": "Vendor Recommended Spares",     "icon": "\U0001f4e6", "color": "#7799aa", "branch": "USN", "system": "NAVICP/DLA"},
    "USN_BUYLIST":         {"label": "Buylist / Provisioning",        "icon": "\U0001f6d2", "color": "#6688aa", "branch": "USN", "system": "NAVSUP WSS"},
    "USN_J1_ILS":          {"label": "J-1 ILS Parameters / LORA",     "icon": "\U0001f4d1", "color": "#336699", "branch": "USN", "system": "PMS/ILS"},
    "USN_J2_SE":           {"label": "J-2 Support Equipment",         "icon": "\U0001f527", "color": "#337799", "branch": "USN", "system": "PMS/ILS"},
    "USN_J3_SUPPLY":       {"label": "J-3 Supply Support",            "icon": "\U0001f4e6", "color": "#338899", "branch": "USN", "system": "NAVSUP"},
    "USN_J4_TECHDATA":     {"label": "J-4 Technical Data",            "icon": "\U0001f4d6", "color": "#339999", "branch": "USN", "system": "NAVSEA"},
    "USN_J5_TRAINING":     {"label": "J-5 Training",                  "icon": "\U0001f393", "color": "#33aa99", "branch": "USN", "system": "NETC"},
    "USN_J6_MANPOWER":     {"label": "J-6 Manpower & Personnel",      "icon": "\U0001f465", "color": "#4488cc", "branch": "USN", "system": "OPNAV N1"},
    "USN_J7_FACILITIES":   {"label": "J-7 Facilities",                "icon": "\U0001f3d7\ufe0f", "color": "#5577bb", "branch": "USN", "system": "NAVFAC"},
    "USN_J8_PHST":         {"label": "J-8 PHS&T",                     "icon": "\U0001f4e6", "color": "#6699cc", "branch": "USN", "system": "NAVSUP"},
    "USN_J9_SOFTWARE":     {"label": "J-9 Computer Resources",        "icon": "\U0001f4bb", "color": "#4477aa", "branch": "USN", "system": "SPAWAR/NAVWAR"},
    "USN_J10_DESIGN":      {"label": "J-10 Design Interface",         "icon": "\U0001f4d0", "color": "#3366aa", "branch": "USN", "system": "NAVSEA"},
    "USN_J11_RAM":         {"label": "J-11 RAM Analysis",             "icon": "\U0001f4c8", "color": "#2255aa", "branch": "USN", "system": "PMS/ILS"},
    "USN_J12_ACQLOG":      {"label": "J-12 Acquisition Logistics",    "icon": "\U0001f4ca", "color": "#2266bb", "branch": "USN", "system": "PMS/ILS"},
    "USN_J13_CM":          {"label": "J-13 Configuration Mgmt",       "icon": "\u2699\ufe0f", "color": "#3377cc", "branch": "USN", "system": "CDMD-OA"},
    "USN_J14_DISPOSAL":    {"label": "J-14 Disposal",                 "icon": "\U0001f5d1\ufe0f", "color": "#667788", "branch": "USN", "system": "DRMS"},
    "USN_BAM":             {"label": "Budget Allowance Mgmt (BAM)",   "icon": "\U0001f4b0", "color": "#cc9933", "branch": "USN", "system": "NAVSUP"},
    "USN_TRANSFER_BOOK":   {"label": "Transfer Book",                 "icon": "\U0001f4d3", "color": "#5588aa", "branch": "USN", "system": "Supply Officer"},
    "USN_COTS_MANUAL":     {"label": "COTS Manual / Documentation",   "icon": "\U0001f4d8", "color": "#4477bb", "branch": "USN", "system": "NAVSEA"},
    "USN_TM_INDEX":        {"label": "Technical Manual Index",        "icon": "\U0001f4c7", "color": "#3366bb", "branch": "USN", "system": "NAVSEA"},
    "USN_PO_INDEX":        {"label": "Purchase Order Index",          "icon": "\U0001f4c2", "color": "#5588cc", "branch": "USN", "system": "NAVSUP"},
    "USN_PID":             {"label": "Program Introduction Doc (PID)","icon": "\U0001f4c4", "color": "#6699bb", "branch": "USN", "system": "PMS"},
    "USN_CONTRACT_MOD":    {"label": "Contract Modification",         "icon": "\U0001f4dd", "color": "#7788aa", "branch": "USN", "system": "NAVSEA Contracts"},
    "USN_CONFIG_MGMT":     {"label": "Configuration Mgmt Record",     "icon": "\u2699\ufe0f", "color": "#4466aa", "branch": "USN", "system": "CDMD-OA"},
    "USN_OUTFITTING":      {"label": "Outfitting Requirements",       "icon": "\U0001f6a2", "color": "#3355aa", "branch": "USN", "system": "PMS/Outfitting"},
    "USN_PURCHASE_REQ":    {"label": "Purchase Request (PR)",         "icon": "\U0001f4b3", "color": "#558899", "branch": "USN", "system": "NAVSUP"},

    # --- U.S. Army (USA) — 20 types ---
    "USA_HAND_RECEIPT":    {"label": "DA 2062 Hand Receipt",         "icon": "\U0001f4dd", "color": "#4b5320", "branch": "USA", "system": "GCSS-Army"},
    "USA_TM_UPDATE":       {"label": "Technical Manual Update",      "icon": "\U0001f4d6", "color": "#6b8e23", "branch": "USA", "system": "LOGSA"},
    "USA_ARMS_ROOM":       {"label": "Arms Room Inventory",          "icon": "\U0001f52b", "color": "#8b4513", "branch": "USA", "system": "PBUSE"},
    "USA_FLIPL":           {"label": "FLIPL Investigation",          "icon": "\U0001f4cb", "color": "#cd853f", "branch": "USA", "system": "GCSS-Army"},
    "USA_VEHICLE":         {"label": "Vehicle Dispatch Log",         "icon": "\U0001f69b", "color": "#556b2f", "branch": "USA", "system": "GCSS-Army"},
    "USA_CLASS_III":       {"label": "Class III (POL) Issue",        "icon": "\u26fd", "color": "#8b8000", "branch": "USA", "system": "GCSS-Army"},
    "USA_CLASS_V":         {"label": "Class V (Ammo) Issue",         "icon": "\U0001f4a5", "color": "#b22222", "branch": "USA", "system": "SAAS"},
    "USA_EQUIP_MAINT":     {"label": "Equipment Maintenance",        "icon": "\U0001f527", "color": "#696969", "branch": "USA", "system": "GCSS-Army"},
    "USA_AMMO_STORAGE":    {"label": "Ammo Storage Inspection",      "icon": "\U0001f3ed", "color": "#a0522d", "branch": "USA", "system": "QASAS"},
    "USA_RANGE_QUAL":      {"label": "Range Qualification",          "icon": "\U0001f3af", "color": "#2e8b57", "branch": "USA", "system": "DTMS"},
    "USA_CALIBRATION":     {"label": "TMDE Calibration (Army)",      "icon": "\U0001f4cf", "color": "#daa520", "branch": "USA", "system": "TMDE Activity"},
    "USA_PROPERTY_BOOK":   {"label": "Property Book Record",         "icon": "\U0001f4d7", "color": "#3cb371", "branch": "USA", "system": "PBUSE"},
    "USA_COMPONENT_HR":    {"label": "Component Hand Receipt",       "icon": "\U0001f5c2\ufe0f", "color": "#8fbc8f", "branch": "USA", "system": "GCSS-Army"},
    "USA_DENSITY_LIST":    {"label": "Equipment Density List",       "icon": "\U0001f4ca", "color": "#66cdaa", "branch": "USA", "system": "GCSS-Army"},
    "USA_GCSS_TRANS":      {"label": "GCSS-Army Transaction",        "icon": "\U0001f4bb", "color": "#20b2aa", "branch": "USA", "system": "GCSS-Army"},
    "USA_AVIATION":        {"label": "Aviation Maintenance",         "icon": "\U0001f681", "color": "#2f4f4f", "branch": "USA", "system": "ULLS-A(E)"},
    "USA_MEDICAL":         {"label": "Medical Supply Record",        "icon": "\U0001f3e5", "color": "#3cb371", "branch": "USA", "system": "DMLSS"},
    "USA_CBRN":            {"label": "CBRN Equipment Record",        "icon": "\u2623\ufe0f", "color": "#8b0000", "branch": "USA", "system": "GCSS-Army"},
    "USA_ENGINEER":        {"label": "Engineer Equipment",           "icon": "\U0001f3d7\ufe0f", "color": "#808000", "branch": "USA", "system": "GCSS-Army"},
    "USA_SIGNAL":          {"label": "Signal/Comms Equipment",       "icon": "\U0001f4e1", "color": "#4682b4", "branch": "USA", "system": "LMP"},

    # --- U.S. Air Force (USAF) — 18 types ---
    "USAF_781_FLIGHT":     {"label": "AFTO 781 Flight Record",       "icon": "\u2708\ufe0f", "color": "#00308f", "branch": "USAF", "system": "IMDS"},
    "USAF_MUNITIONS":      {"label": "Munitions Inspection",         "icon": "\U0001f4a3", "color": "#cd5c5c", "branch": "USAF", "system": "CAS"},
    "USAF_ENGINE":         {"label": "Engine Management Record",     "icon": "\U0001f525", "color": "#ff8c00", "branch": "USAF", "system": "CEMS"},
    "USAF_WEAPONS_LOAD":   {"label": "Weapons Load Certification",   "icon": "\U0001f3af", "color": "#dc143c", "branch": "USAF", "system": "MIS"},
    "USAF_STRUCT_INTEG":   {"label": "Aircraft Structural Record",   "icon": "\U0001f6e1\ufe0f", "color": "#4169e1", "branch": "USAF", "system": "ASIP"},
    "USAF_AVIONICS":       {"label": "Avionics Test Record",         "icon": "\U0001f4df", "color": "#6a5acd", "branch": "USAF", "system": "IMDS"},
    "USAF_NUCLEAR":        {"label": "Nuclear Weapons Cert",         "icon": "\u2622\ufe0f", "color": "#ffd700", "branch": "USAF", "system": "AFGSC"},
    "USAF_MISSILE":        {"label": "Missile Maintenance Record",   "icon": "\U0001f680", "color": "#b8860b", "branch": "USAF", "system": "MMICS"},
    "USAF_SPACE":          {"label": "Space Vehicle Certification",  "icon": "\U0001f6f0\ufe0f", "color": "#191970", "branch": "USAF", "system": "USSF"},
    "USAF_RADAR":          {"label": "Radar Calibration Record",     "icon": "\U0001f4e1", "color": "#00bfff", "branch": "USAF", "system": "IMDS"},
    "USAF_RUNWAY":         {"label": "Runway Condition Report",      "icon": "\U0001f6ec", "color": "#708090", "branch": "USAF", "system": "BCAS"},
    "USAF_BDR":            {"label": "Battle Damage Assessment",     "icon": "\U0001f4a5", "color": "#ff4500", "branch": "USAF", "system": "BDA"},
    "USAF_SUPPLY":         {"label": "AF Supply Transaction",        "icon": "\U0001f4e6", "color": "#1e90ff", "branch": "USAF", "system": "SBSS"},
    "USAF_AGE":            {"label": "Aerospace Ground Equipment",   "icon": "\U0001f529", "color": "#778899", "branch": "USAF", "system": "IMDS"},
    "USAF_FUEL":           {"label": "Fuel Management Record",       "icon": "\u26fd", "color": "#daa520", "branch": "USAF", "system": "AFPET"},
    "USAF_DEPOT":          {"label": "Depot Maintenance Record",     "icon": "\U0001f3ed", "color": "#cd853f", "branch": "USAF", "system": "D200A"},
    "USAF_PMEL":           {"label": "PMEL Calibration",             "icon": "\U0001f4cf", "color": "#da70d6", "branch": "USAF", "system": "PMEL"},
    "USAF_REFUEL":         {"label": "Aerial Refueling Log",         "icon": "\u26fd", "color": "#2e8b57", "branch": "USAF", "system": "ART"},

    # --- U.S. Marine Corps (USMC) — 14 types ---
    "USMC_GROUND_MAINT":   {"label": "Ground Equipment Maint",       "icon": "\U0001f527", "color": "#cc0000", "branch": "USMC", "system": "GCSS-MC"},
    "USMC_AVIATION":       {"label": "Aviation Intermediate Maint",  "icon": "\U0001f681", "color": "#8b0000", "branch": "USMC", "system": "NALCOMIS"},
    "USMC_WEAPONS":        {"label": "Weapons Maintenance",          "icon": "\U0001f52b", "color": "#a52a2a", "branch": "USMC", "system": "ATLASS"},
    "USMC_COMMS":          {"label": "Communications Equipment",     "icon": "\U0001f4e1", "color": "#cd5c5c", "branch": "USMC", "system": "GCSS-MC"},
    "USMC_ENGINEER":       {"label": "Engineer Equipment Record",    "icon": "\U0001f3d7\ufe0f", "color": "#b22222", "branch": "USMC", "system": "GCSS-MC"},
    "USMC_MOTOR_T":        {"label": "Motor Transport Record",       "icon": "\U0001f69b", "color": "#dc143c", "branch": "USMC", "system": "GCSS-MC"},
    "USMC_SUPPLY":         {"label": "MAGTF Supply Chain",           "icon": "\U0001f4e6", "color": "#800000", "branch": "USMC", "system": "GCSS-MC"},
    "USMC_ORDNANCE":       {"label": "Marine Ordnance Record",       "icon": "\U0001f4a3", "color": "#ff0000", "branch": "USMC", "system": "TFSMS"},
    "USMC_COMBAT_ENG":     {"label": "Combat Engineering Record",    "icon": "\U0001f4a5", "color": "#c41e3a", "branch": "USMC", "system": "GCSS-MC"},
    "USMC_AAV":            {"label": "AAV/ACV Maintenance",          "icon": "\U0001f6a2", "color": "#990000", "branch": "USMC", "system": "GCSS-MC"},
    "USMC_MEDICAL":        {"label": "Medical Supply Record",        "icon": "\U0001f3e5", "color": "#ff6666", "branch": "USMC", "system": "DMLSS"},
    "USMC_NBC":            {"label": "NBC Equipment Inspection",     "icon": "\u2623\ufe0f", "color": "#660000", "branch": "USMC", "system": "GCSS-MC"},
    "USMC_EXPEDITIONARY":  {"label": "Expeditionary Supply",         "icon": "\U0001f3d5\ufe0f", "color": "#993333", "branch": "USMC", "system": "GCSS-MC"},
    "USMC_LAV":            {"label": "LAV Maintenance Record",       "icon": "\U0001f697", "color": "#cc3333", "branch": "USMC", "system": "GCSS-MC"},

    # --- U.S. Coast Guard (USCG) — 12 types ---
    "USCG_CUTTER_MAINT":   {"label": "Cutter Maintenance",           "icon": "\U0001f6a2", "color": "#003366", "branch": "USCG", "system": "ABS NS5"},
    "USCG_SMALL_BOAT":     {"label": "Small Boat Inspection",        "icon": "\u26f5", "color": "#336699", "branch": "USCG", "system": "CG-LIMS"},
    "USCG_NAV_AID":        {"label": "Aids to Navigation Maint",     "icon": "\U0001f5fc", "color": "#0066cc", "branch": "USCG", "system": "ATON MIS"},
    "USCG_POLLUTION":      {"label": "Pollution Response Equip",     "icon": "\U0001f6e2\ufe0f", "color": "#669900", "branch": "USCG", "system": "MISLE"},
    "USCG_SAR":            {"label": "Search & Rescue Equipment",    "icon": "\U0001f198", "color": "#ff3300", "branch": "USCG", "system": "MISLE"},
    "USCG_MARITIME_SEC":   {"label": "Maritime Security Equip",      "icon": "\U0001f512", "color": "#003399", "branch": "USCG", "system": "MISLE"},
    "USCG_AVIATION":       {"label": "CG Aviation Maintenance",      "icon": "\U0001f681", "color": "#3366ff", "branch": "USCG", "system": "ALMIS"},
    "USCG_PORT_SEC":       {"label": "Port Security Inspection",     "icon": "\U0001f3d7\ufe0f", "color": "#0033cc", "branch": "USCG", "system": "MISLE"},
    "USCG_ELECTRONICS":    {"label": "Electronics Systems Maint",    "icon": "\U0001f4e1", "color": "#0099ff", "branch": "USCG", "system": "CG-LIMS"},
    "USCG_WEAPONS":        {"label": "CG Weapons System Maint",      "icon": "\U0001f52b", "color": "#002244", "branch": "USCG", "system": "CG-LIMS"},
    "USCG_ICE_OPS":        {"label": "Ice Operations Equipment",     "icon": "\U0001f9ca", "color": "#66ccff", "branch": "USCG", "system": "CG-LIMS"},
    "USCG_BUOY_TENDER":    {"label": "Buoy Tender Maintenance",      "icon": "\U0001f534", "color": "#ff6600", "branch": "USCG", "system": "ATON MIS"},

    # --- Defense Logistics Agency (DLA) — 12 types ---
    "DLA_DISTRIBUTION":    {"label": "DLA Distribution Receipt",     "icon": "\U0001f3db\ufe0f", "color": "#1a3a5c", "branch": "DLA", "system": "DSS"},
    "DLA_FMS":             {"label": "Foreign Military Sales",       "icon": "\U0001f310", "color": "#2a5a8c", "branch": "DLA", "system": "DSCA"},
    "DLA_DRMO":            {"label": "DRMO Disposal Record",         "icon": "\U0001f5d1\ufe0f", "color": "#555555", "branch": "DLA", "system": "DRMS"},
    "DLA_HAZMAT":          {"label": "Hazmat Certification",         "icon": "\u2622\ufe0f", "color": "#ff9900", "branch": "DLA", "system": "HMIRS"},
    "DLA_BULK_FUEL":       {"label": "Bulk Fuel Receipt",            "icon": "\u26fd", "color": "#8b7355", "branch": "DLA", "system": "DFSP"},
    "DLA_TROOP_SUPPORT":   {"label": "Troop Support Material",       "icon": "\U0001f396\ufe0f", "color": "#4a6741", "branch": "DLA", "system": "BSM"},
    "DLA_STRATEGIC":       {"label": "Strategic Material Reserve",   "icon": "\U0001f3e6", "color": "#8b8682", "branch": "DLA", "system": "NDS"},
    "DLA_MEDICAL":         {"label": "Medical Supply Chain",         "icon": "\U0001f3e5", "color": "#2e8b57", "branch": "DLA", "system": "ECAT"},
    "DLA_DPAS":            {"label": "DPAS Property Record",         "icon": "\U0001f4cb", "color": "#4682b4", "branch": "DLA", "system": "DPAS"},
    "DLA_COMMISSARY":      {"label": "Commissary Supply Record",     "icon": "\U0001f6d2", "color": "#6b8e23", "branch": "DLA", "system": "DeCA"},
    "DLA_DISPOSITION":     {"label": "Disposition Services",         "icon": "\U0001f4e4", "color": "#8b8378", "branch": "DLA", "system": "DRMS"},
    "DLA_LAND_EQUIP":      {"label": "Land Equipment Supply",        "icon": "\U0001f69b", "color": "#556b2f", "branch": "DLA", "system": "DSS"},

    # --- Joint / Cross-Branch — 10 types ---
    "JOINT_NATO":          {"label": "NATO STANAG Verification",     "icon": "\U0001f3f3\ufe0f", "color": "#003399", "branch": "JOINT", "system": "NATO"},
    "JOINT_F35":           {"label": "F-35 JSF Logistics",           "icon": "\u2708\ufe0f", "color": "#1a1a2e", "branch": "JOINT", "system": "ALIS/ODIN"},
    "JOINT_MISSILE_DEF":   {"label": "Missile Defense Record",       "icon": "\U0001f680", "color": "#4a0080", "branch": "JOINT", "system": "MDA"},
    "JOINT_CYBER":         {"label": "Cyber Equipment Cert",         "icon": "\U0001f5a5\ufe0f", "color": "#00cc99", "branch": "JOINT", "system": "CYBERCOM"},
    "JOINT_INTEL":         {"label": "Intelligence Equipment",       "icon": "\U0001f575\ufe0f", "color": "#2d2d2d", "branch": "JOINT", "system": "DIA"},
    "JOINT_SPACE":         {"label": "Space Command Asset",          "icon": "\U0001f6f0\ufe0f", "color": "#000066", "branch": "JOINT", "system": "USSPACECOM"},
    "JOINT_TRANSPORT":     {"label": "TRANSCOM Logistics",           "icon": "\U0001f69b", "color": "#4a6741", "branch": "JOINT", "system": "USTRANSCOM"},
    "JOINT_CONTRACT":      {"label": "Contract Deliverable",         "icon": "\U0001f4dd", "color": "#b8860b", "branch": "JOINT", "system": "DCMA"},
    "JOINT_READINESS":     {"label": "Readiness Report",             "icon": "\U0001f4c8", "color": "#00ff88", "branch": "JOINT", "system": "DRRS"},
    "JOINT_DISPOSAL":      {"label": "Joint Disposal Record",        "icon": "\U0001f5d1\ufe0f", "color": "#8b8682", "branch": "JOINT", "system": "DLA"},

    # --- Special Operations (SOCOM) — 8 types ---
    "SOCOM_WEAPONS":       {"label": "SOF Weapons Maintenance",      "icon": "\U0001f52b", "color": "#2d2d2d", "branch": "SOCOM", "system": "SOF-LAN"},
    "SOCOM_COMMS":         {"label": "SOF Communications Equip",     "icon": "\U0001f4e1", "color": "#4a4a4a", "branch": "SOCOM", "system": "SOF-LAN"},
    "SOCOM_AVIATION":      {"label": "SOF Aviation Maintenance",     "icon": "\U0001f681", "color": "#333333", "branch": "SOCOM", "system": "SOF-LAN"},
    "SOCOM_MARITIME":      {"label": "SOF Maritime Equipment",       "icon": "\U0001f93f", "color": "#1a1a2e", "branch": "SOCOM", "system": "SOF-LAN"},
    "SOCOM_VEHICLE":       {"label": "SOF Vehicle Maintenance",      "icon": "\U0001f697", "color": "#3d3d3d", "branch": "SOCOM", "system": "SOF-LAN"},
    "SOCOM_INTEL":         {"label": "SOF Intelligence Equip",       "icon": "\U0001f575\ufe0f", "color": "#1a1a1a", "branch": "SOCOM", "system": "SOF-LAN"},
    "SOCOM_MEDICAL":       {"label": "SOF Medical Supply",           "icon": "\U0001f3e5", "color": "#4a4a4a", "branch": "SOCOM", "system": "SOF-LAN"},
    "SOCOM_DEMO":          {"label": "SOF Demolition Record",        "icon": "\U0001f4a5", "color": "#550000", "branch": "SOCOM", "system": "SOF-LAN"},

    # --- U.S. Space Force (USSF) — 11 types ---
    "USSF_SAT_OPS":        {"label": "Satellite Operations Record",   "icon": "\U0001f6f0\ufe0f", "color": "#1a1a4e", "branch": "USSF", "system": "18 SDS"},
    "USSF_SPACE_VEH":      {"label": "Space Vehicle Maintenance",     "icon": "\U0001f680", "color": "#2a2a5e", "branch": "USSF", "system": "SMC"},
    "USSF_SDA":            {"label": "Space Domain Awareness",        "icon": "\U0001f52d", "color": "#000066", "branch": "USSF", "system": "18 SDS"},
    "USSF_GPS_CONST":      {"label": "GPS Constellation Record",      "icon": "\U0001f4e1", "color": "#003399", "branch": "USSF", "system": "2 SOPS"},
    "USSF_LAUNCH_VEH":     {"label": "Launch Vehicle Record",         "icon": "\U0001f680", "color": "#0044aa", "branch": "USSF", "system": "SLD 45"},
    "USSF_RADAR_TRACK":    {"label": "Space Surveillance Tracking",   "icon": "\U0001f4e1", "color": "#0055bb", "branch": "USSF", "system": "18 SDS"},
    "USSF_GROUND_SYS":     {"label": "Ground Systems Maint",          "icon": "\U0001f5a5\ufe0f", "color": "#002266", "branch": "USSF", "system": "SBIRS"},
    "USSF_COMM_SAT":       {"label": "Comm Satellite Record",         "icon": "\U0001f4e1", "color": "#0033aa", "branch": "USSF", "system": "MILSATCOM"},
    "USSF_EARLY_WARN":     {"label": "Early Warning System",          "icon": "\u26a0\ufe0f", "color": "#003377", "branch": "USSF", "system": "SBIRS"},
    "USSF_SPACE_CTRL":     {"label": "Space Control Record",          "icon": "\U0001f6e1\ufe0f", "color": "#001a66", "branch": "USSF", "system": "SPACECOM"},
    "USSF_CYBER_DEF":      {"label": "Space Cyber Defense",           "icon": "\U0001f5a5\ufe0f", "color": "#002255", "branch": "USSF", "system": "16 AF/USSF"},
}


# ═══════════════════════════════════════════════════════════════════════
#  IN-MEMORY RECORD STORE
# ═══════════════════════════════════════════════════════════════════════
_live_records = []
_seed_cache = None


def _generate_seed_data():
    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    records = []
    type_keys = list(RECORD_CATEGORIES.keys())
    weights = []
    for k in type_keys:
        cat = RECORD_CATEGORIES[k]
        branch = cat["branch"]
        w = 3 if branch in ("USN", "USA") else (2 if branch in ("USAF", "USMC") else 1)
        label_lower = cat["label"].lower()
        if any(kw in label_lower for kw in ("supply", "maintenance", "receipt", "maint")):
            w += 2
        if any(kw in label_lower for kw in ("calibration", "inspection", "equipment")):
            w += 1
        weights.append(w)

    for i in range(600):
        days_ago = rng.random() ** 1.3 * 30
        hours_offset = rng.uniform(6, 22)
        ts = now - timedelta(days=days_ago, hours=rng.uniform(0, 4))
        ts = ts.replace(hour=int(hours_offset), minute=rng.randint(0, 59), second=rng.randint(0, 59))
        if ts.weekday() >= 5 and rng.random() < 0.7:
            ts -= timedelta(days=ts.weekday() - 4)
        record_type = rng.choices(type_keys, weights=weights, k=1)[0]
        cat = RECORD_CATEGORIES[record_type]
        hash_input = f"seed-{i}-{record_type}-{ts.isoformat()}"
        record_hash = hashlib.sha256(hash_input.encode()).hexdigest()
        tx_bytes = bytes(rng.randint(0, 255) for _ in range(16))
        tx_hash = "TX" + tx_bytes.hex().upper()
        records.append({
            "hash": record_hash,
            "record_type": record_type,
            "record_label": cat["label"],
            "branch": cat["branch"],
            "icon": cat["icon"],
            "timestamp": ts.isoformat(),
            "timestamp_display": ts.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "fee": 0.01,
            "tx_hash": tx_hash,
            "system": cat["system"],
        })
    records.sort(key=lambda r: r["timestamp"])
    return records


def _get_seed_data():
    global _seed_cache
    if _seed_cache is None:
        _seed_cache = _generate_seed_data()
    return _seed_cache


def _get_all_records():
    return _get_seed_data() + _live_records


def _aggregate_metrics(records):
    now = datetime.now(timezone.utc)
    total = len(records)
    total_fees = total * 0.01
    records_by_type = {}
    records_by_branch = {}
    records_by_source = {}
    for r in records:
        rt = r.get("record_label", r.get("record_type", "Unknown"))
        records_by_type[rt] = records_by_type.get(rt, 0) + 1
        branch = r.get("branch", "JOINT")
        records_by_branch[branch] = records_by_branch.get(branch, 0) + 1
        source = r.get("data_source", r.get("system", "direct"))
        records_by_source[source] = records_by_source.get(source, 0) + 1

    hashes_by_minute = {}
    hashes_by_hour = {}
    hashes_by_day = {}
    hashes_by_week = {}
    hashes_by_month = {}
    fees_by_minute = {}
    fees_by_hour = {}
    fees_by_day = {}
    fees_by_week = {}
    fees_by_month = {}
    today_count = 0
    this_month_count = 0
    today_str = now.strftime("%Y-%m-%d")
    month_str = now.strftime("%b %Y")

    for r in records:
        try:
            ts = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
        except (ValueError, KeyError):
            continue
        minute_key = ts.strftime("%H:%M")
        hour_key = ts.strftime("%b %d %H:00")
        day_key = ts.strftime("%b %d")
        week_key = f"Week {ts.isocalendar()[1]}"
        month_key = ts.strftime("%b %Y")

        hashes_by_minute[minute_key] = hashes_by_minute.get(minute_key, 0) + 1
        hashes_by_hour[hour_key] = hashes_by_hour.get(hour_key, 0) + 1
        hashes_by_day[day_key] = hashes_by_day.get(day_key, 0) + 1
        hashes_by_week[week_key] = hashes_by_week.get(week_key, 0) + 1
        hashes_by_month[month_key] = hashes_by_month.get(month_key, 0) + 1

        fee = r.get("fee", 0.01)
        fees_by_minute[minute_key] = round(fees_by_minute.get(minute_key, 0) + fee, 4)
        fees_by_hour[hour_key] = round(fees_by_hour.get(hour_key, 0) + fee, 4)
        fees_by_day[day_key] = round(fees_by_day.get(day_key, 0) + fee, 4)
        fees_by_week[week_key] = round(fees_by_week.get(week_key, 0) + fee, 4)
        fees_by_month[month_key] = round(fees_by_month.get(month_key, 0) + fee, 4)

        if ts.strftime("%Y-%m-%d") == today_str:
            today_count += 1
        if ts.strftime("%b %Y") == month_str:
            this_month_count += 1

    def sort_dict(d, max_items=30):
        items = sorted(d.items())
        return dict(items[-max_items:]) if len(items) > max_items else dict(items)

    return {
        "total_hashes": total,
        "total_fees": round(total_fees, 2),
        "total_record_types": len(records_by_type),
        "records_by_type": dict(sorted(records_by_type.items(), key=lambda x: -x[1])),
        "records_by_branch": records_by_branch,
        "records_by_source": records_by_source,
        "verify_audit_log": _verify_audit_log[-50:],
        "hashes_today": today_count,
        "fees_today": round(today_count * 0.01, 2),
        "this_month": this_month_count,
        "hashes_by_minute": sort_dict(hashes_by_minute, 60),
        "hashes_by_hour": sort_dict(hashes_by_hour, 48),
        "hashes_by_day": sort_dict(hashes_by_day, 30),
        "hashes_by_week": sort_dict(hashes_by_week, 12),
        "hashes_by_month": sort_dict(hashes_by_month, 12),
        "fees_by_minute": sort_dict(fees_by_minute, 60),
        "fees_by_hour": sort_dict(fees_by_hour, 48),
        "fees_by_day": sort_dict(fees_by_day, 30),
        "fees_by_week": sort_dict(fees_by_week, 12),
        "fees_by_month": sort_dict(fees_by_month, 12),
        "individual_records": records[-100:],
        "generated_at": now.isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════
#  XRPL ANCHOR ENGINE — Testnet + Mainnet Support
# ═══════════════════════════════════════════════════════════════════════

XRPL_NETWORK = os.environ.get("XRPL_NETWORK", "testnet")  # "testnet" or "mainnet"
XRPL_TESTNET_URL = "https://s.altnet.rippletest.net:51234"
XRPL_MAINNET_URL = "https://xrplcluster.com"
XRPL_EXPLORER_TESTNET = "https://testnet.xrpl.org/transactions/"
XRPL_EXPLORER_MAINNET = "https://livenet.xrpl.org/transactions/"
SLS_TREASURY_ADDRESS = "rMLmkrxpadq5z6oTDmq8GhQj9LKjf1KLqJ"
SLS_ISSUER_ADDRESS = "r95GyZac4butvVcsTWUPpxzekmyzaHsTA5"  # SLS token issuer
SLS_ANCHOR_FEE = "0.01"  # SLS fee per anchor (0.01 SLS = $0.01)
_xrpl_client = None
_xrpl_wallet = None       # Issuer wallet — signs anchor transactions
_xrpl_treasury_wallet = None  # Treasury wallet — holds XRP + SLS, funds users, collects anchor fees

def _init_xrpl():
    """Initialize XRPL client, Issuer wallet, and Treasury wallet."""
    global _xrpl_client, _xrpl_wallet, _xrpl_treasury_wallet
    if not XRPL_AVAILABLE or _xrpl_client is not None:
        return
    try:
        url = XRPL_MAINNET_URL if XRPL_NETWORK == "mainnet" else XRPL_TESTNET_URL
        _xrpl_client = JsonRpcClient(url)
        # Issuer wallet — signs anchor AccountSet transactions (XRPL_WALLET_SEED)
        seed = os.environ.get("XRPL_WALLET_SEED")
        if seed:
            _xrpl_wallet = Wallet.from_seed(seed, algorithm=CryptoAlgorithm.SECP256K1)
        elif XRPL_NETWORK != "mainnet":
            _xrpl_wallet = generate_faucet_wallet(_xrpl_client, debug=False)
        else:
            print("XRPL mainnet requires XRPL_WALLET_SEED env var")
            _xrpl_client = None
        # Treasury wallet — holds XRP (for wallet activation) + SLS (subscription allocations)
        # Sends XRP to activate new user wallets, sends SLS to subscribers,
        # receives 0.01 SLS back per anchor. The SLS circulation engine.
        treasury_seed = os.environ.get("XRPL_TREASURY_SEED")
        if treasury_seed:
            _xrpl_treasury_wallet = Wallet.from_seed(treasury_seed, algorithm=CryptoAlgorithm.SECP256K1)
        elif XRPL_NETWORK == "mainnet":
            print("WARNING: XRPL_TREASURY_SEED not set — wallet provisioning and SLS delivery disabled")
    except Exception as e:
        print(f"XRPL init failed: {e}")
        _xrpl_client = None
        _xrpl_wallet = None

# ═══════════════════════════════════════════════════════════════════════
#  WALLET PROVISIONING & SLS ECONOMY
#
#  How it works:
#  1. User subscribes (Stripe) → S4 pockets the subscription as revenue
#  2. Treasury sends 12 XRP to activate user's new XRPL wallet (business expense)
#  3. Treasury sends the plan's monthly SLS allocation to user's wallet
#  4. User anchors records → 0.01 SLS per anchor flows from user wallet → Treasury
#  5. Monthly renewal (Stripe webhook) → Treasury sends next month's SLS
#  6. SLS circulates: Treasury → User → Treasury. Self-sustaining.
#
#  Wallets:
#   - Issuer (r95G…TA5): Signs anchor transactions. XRPL_WALLET_SEED env var.
#   - Treasury (rMLm…KLqJ): Holds XRP + SLS. Funds users, collects fees. XRPL_TREASURY_SEED env var.
#   - Ops (raWL…un51): Nick's personal wallet. NOT involved in SLS economy.
#   - User wallets: Created at signup, seed stored in Supabase for automatic signing.
# ═══════════════════════════════════════════════════════════════════════

# SLS token economics
SLS_PRICE_USD = 0.01  # $0.01 per SLS — value basis for subscription allocations
XRP_ACCOUNT_RESERVE = "12"  # XRP to activate a new wallet + TrustLine reserve

# Subscription tiers — SLS included per month (delivered from Treasury)
SUBSCRIPTION_TIERS = {
    "pilot":        {"price_usd": 0,       "sls_monthly": 100,     "anchors": 10000,     "label": "Pilot (Free)"},
    "starter":      {"price_usd": 999.00,  "sls_monthly": 25000,   "anchors": 2500000,   "label": "Starter"},
    "professional": {"price_usd": 2499.00, "sls_monthly": 100000,  "anchors": 10000000,  "label": "Professional"},
    "enterprise":   {"price_usd": 9999.00, "sls_monthly": 500000,  "anchors": 0,         "label": "Enterprise"},
}

# Stripe integration
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")  # Required in production
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")  # Webhook signature verification

# In-memory wallet cache (production: Supabase)
# Stores {email: {address, seed, plan, created}} for custodial signing
_wallet_store = {}  # Cleared on cold start; Supabase is the source of truth

def _store_wallet(email, address, seed, plan):
    """Store user wallet credentials in Supabase for custodial signing.
    S4 acts as a custodial wallet provider — we create wallets and sign
    anchor fee transactions on behalf of users automatically."""
    record = {
        "email": email,
        "address": address,
        "seed": seed,  # Encrypted at rest by Supabase RLS + column encryption
        "plan": plan,
        "created": datetime.now(timezone.utc).isoformat(),
    }
    _wallet_store[email] = record  # In-memory cache
    # Persist to Supabase if available
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            import urllib.request
            req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/wallets",
                data=json.dumps(record).encode(),
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                method="POST",
            )
            urllib.request.urlopen(req, timeout=10)
        except Exception as e:
            print(f"Supabase wallet store failed (using in-memory fallback): {e}")
    return record


def _get_wallet_seed(email=None, address=None):
    """Retrieve a user's wallet seed for custodial signing.
    Looks up by email or wallet address. Checks in-memory cache first,
    then Supabase if available."""
    # Check in-memory cache
    if email and email in _wallet_store:
        return _wallet_store[email].get("seed")
    if address:
        for rec in _wallet_store.values():
            if rec.get("address") == address:
                return rec.get("seed")
    # Query Supabase if available
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            import urllib.request
            lookup = f"email=eq.{email}" if email else f"address=eq.{address}"
            req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/wallets?{lookup}&select=seed,email,address,plan",
                headers={
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                },
            )
            resp = urllib.request.urlopen(req, timeout=10)
            rows = json.loads(resp.read())
            if rows:
                # Cache for future lookups
                row = rows[0]
                _wallet_store[row["email"]] = row
                return row.get("seed")
        except Exception as e:
            print(f"Supabase wallet lookup failed: {e}")
    return None


def _provision_wallet(email, plan="starter"):
    """Create a new XRPL wallet for a subscriber.
    Treasury funds the wallet with XRP (activation reserve, business expense),
    sets up SLS TrustLine, and delivers the plan's SLS allocation.
    Wallet seed is stored in Supabase for custodial anchor fee signing.
    Returns wallet credentials and SLS delivery status, or error."""
    _init_xrpl()
    if not _xrpl_client or not _xrpl_treasury_wallet or not XRPL_AVAILABLE:
        return None
    try:
        from xrpl.wallet import Wallet as W
        from xrpl.models.transactions import TrustSet, Payment as Pay
        from xrpl.models.amounts import IssuedCurrencyAmount as ICA

        tier = SUBSCRIPTION_TIERS.get(plan, SUBSCRIPTION_TIERS["starter"])

        # 1. Generate a new secp256k1 wallet for the user
        new_wallet = W.create(algorithm=CryptoAlgorithm.SECP256K1)

        # 2. Treasury sends XRP to activate the wallet (business expense from subscription revenue)
        fund_tx = Pay(
            account=_xrpl_treasury_wallet.address,
            destination=new_wallet.address,
            amount=str(int(float(XRP_ACCOUNT_RESERVE) * 1_000_000))  # drops
        )
        fund_resp = submit_and_wait(fund_tx, _xrpl_client, _xrpl_treasury_wallet)
        if not fund_resp.is_successful():
            return {"error": "Failed to fund new wallet", "detail": fund_resp.result.get("engine_result_message", "unknown")}

        # 3. Set up SLS TrustLine on the new wallet (to Issuer r95G…TA5)
        trust_tx = TrustSet(
            account=new_wallet.address,
            limit_amount=ICA(
                currency="SLS",
                issuer=SLS_ISSUER_ADDRESS,
                value="1000000"  # 1M SLS trust limit
            )
        )
        trust_resp = submit_and_wait(trust_tx, _xrpl_client, new_wallet)
        if not trust_resp.is_successful():
            return {"error": "Failed to set TrustLine", "detail": trust_resp.result.get("engine_result_message", "unknown")}

        # 4. Treasury delivers the plan's SLS allocation to the user's wallet
        sls_amount = str(tier["sls_monthly"])
        sls_tx_hash = ""
        if int(sls_amount) > 0:
            sls_payment = Pay(
                account=_xrpl_treasury_wallet.address,
                destination=new_wallet.address,
                amount=ICA(
                    currency="SLS",
                    issuer=SLS_ISSUER_ADDRESS,
                    value=sls_amount
                ),
                memos=[Memo(
                    memo_type=bytes("s4/subscription", "utf-8").hex(),
                    memo_data=bytes(json.dumps({
                        "type": "subscription_sls_delivery",
                        "plan": plan,
                        "amount": sls_amount,
                        "email": email,
                    }), "utf-8").hex()
                )]
            )
            sls_resp = submit_and_wait(sls_payment, _xrpl_client, _xrpl_treasury_wallet)
            if sls_resp.is_successful():
                sls_tx_hash = sls_resp.result.get("hash", "")
            else:
                print(f"SLS delivery failed: {sls_resp.result.get('engine_result_message', 'unknown')}")

        # 5. Store wallet seed in Supabase for custodial anchor fee signing
        _store_wallet(email, new_wallet.address, new_wallet.seed, plan)

        explorer_base = XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET

        return {
            "success": True,
            "wallet": {
                "address": new_wallet.address,
                "seed": new_wallet.seed,
                "public_key": new_wallet.public_key,
                "algorithm": "secp256k1",
                "network": XRPL_NETWORK,
            },
            "funding": {
                "xrp_funded": XRP_ACCOUNT_RESERVE,
                "fund_tx": fund_resp.result.get("hash", ""),
                "explorer_url": explorer_base + fund_resp.result.get("hash", ""),
            },
            "trustline": {
                "currency": "SLS",
                "issuer": SLS_ISSUER_ADDRESS,
                "limit": "1000000",
                "trust_tx": trust_resp.result.get("hash", ""),
            },
            "sls_delivery": {
                "amount": sls_amount,
                "tx_hash": sls_tx_hash,
                "explorer_url": (explorer_base + sls_tx_hash) if sls_tx_hash else "",
                "source": "Treasury",
            },
            "subscription": {
                "plan": plan,
                "label": tier["label"],
                "price_usd": tier["price_usd"],
                "sls_monthly": tier["sls_monthly"],
                "sls_balance": sls_amount,
                "anchors_available": tier["anchors"],
            },
            "anchors_available": tier["anchors"],
        }
    except Exception as e:
        print(f"Wallet provisioning failed: {e}")
        return {"error": str(e)}


def _deliver_monthly_sls(email, plan=None):
    """Deliver monthly SLS allocation from Treasury to a subscriber's wallet.
    Called automatically by Stripe webhook on subscription renewal.
    Looks up the user's wallet from Supabase and sends SLS from Treasury."""
    _init_xrpl()
    if not _xrpl_client or not _xrpl_treasury_wallet:
        return {"error": "XRPL Treasury not available"}

    # Look up user's wallet
    wallet_seed = _get_wallet_seed(email=email)
    if not wallet_seed:
        return {"error": f"No wallet found for {email}"}

    user_wallet = Wallet.from_seed(wallet_seed, algorithm=CryptoAlgorithm.SECP256K1)

    # Determine plan from cache or parameter
    cached = _wallet_store.get(email, {})
    plan = plan or cached.get("plan", "starter")
    tier = SUBSCRIPTION_TIERS.get(plan, SUBSCRIPTION_TIERS["starter"])
    sls_amount = str(tier["sls_monthly"])

    if int(sls_amount) <= 0:
        return {"success": True, "sls_delivered": "0", "message": "Pilot plan — no SLS allocation"}

    try:
        from xrpl.models.transactions import Payment as Pay
        from xrpl.models.amounts import IssuedCurrencyAmount as ICA

        payment = Pay(
            account=_xrpl_treasury_wallet.address,
            destination=user_wallet.address,
            amount=ICA(
                currency="SLS",
                issuer=SLS_ISSUER_ADDRESS,
                value=sls_amount
            ),
            memos=[Memo(
                memo_type=bytes("s4/renewal", "utf-8").hex(),
                memo_data=bytes(json.dumps({
                    "type": "monthly_sls_renewal",
                    "plan": plan,
                    "amount": sls_amount,
                    "email": email,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }), "utf-8").hex()
            )]
        )
        resp = submit_and_wait(payment, _xrpl_client, _xrpl_treasury_wallet)
        if resp.is_successful():
            explorer_base = XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET
            return {
                "success": True,
                "sls_delivered": sls_amount,
                "tx_hash": resp.result["hash"],
                "explorer_url": explorer_base + resp.result["hash"],
                "plan": plan,
                "wallet": user_wallet.address,
            }
        else:
            return {"error": resp.result.get("engine_result_message", "unknown")}
    except Exception as e:
        print(f"Monthly SLS delivery failed: {e}")
        return {"error": str(e)}


def _deduct_anchor_fee(user_email=None, user_address=None):
    """Deduct 0.01 SLS anchor fee from the user's wallet → Treasury.
    S4 signs the transaction on the user's behalf using their stored seed (custodial model).
    Looked up by email or wallet address from Supabase.
    Returns transaction result or None."""
    _init_xrpl()
    if not _xrpl_client:
        return None

    # Look up user's wallet seed from custodial store
    wallet_seed = _get_wallet_seed(email=user_email, address=user_address)
    if not wallet_seed:
        return None  # No wallet found — skip fee (demo/unauthenticated user)

    try:
        from xrpl.models.transactions import Payment as Pay
        from xrpl.models.amounts import IssuedCurrencyAmount as ICA

        user_wallet = Wallet.from_seed(wallet_seed, algorithm=CryptoAlgorithm.SECP256K1)
        fee_payment = Pay(
            account=user_wallet.address,
            destination=SLS_TREASURY_ADDRESS,
            amount=ICA(
                currency="SLS",
                issuer=SLS_ISSUER_ADDRESS,
                value=SLS_ANCHOR_FEE
            ),
            memos=[Memo(
                memo_type=bytes("s4/anchor-fee", "utf-8").hex(),
                memo_data=bytes(json.dumps({"type": "anchor_fee", "amount": SLS_ANCHOR_FEE}), "utf-8").hex()
            )]
        )
        resp = submit_and_wait(fee_payment, _xrpl_client, user_wallet)
        if resp.is_successful():
            return {
                "success": True,
                "fee_tx": resp.result["hash"],
                "fee_amount": SLS_ANCHOR_FEE,
                "from_wallet": user_wallet.address,
                "to_treasury": SLS_TREASURY_ADDRESS,
            }
        else:
            return {"error": resp.result.get("engine_result_message", "unknown"),
                    "hint": "Insufficient SLS balance. Your monthly allocation may be exhausted."}
    except Exception as e:
        print(f"Anchor fee deduction failed: {e}")
        return {"error": str(e)}


def _anchor_xrpl(hash_value, record_type="", branch="", user_email=None):
    """Submit a real anchor transaction to XRPL and deduct 0.01 SLS from the user's wallet.
    1. Issuer wallet signs an AccountSet memo (the hash anchor) — XRPL_WALLET_SEED
    2. User's wallet sends 0.01 SLS → Treasury (custodial, using stored seed from Supabase)
    Returns tx info or None."""
    _init_xrpl()
    if not _xrpl_client or not _xrpl_wallet:
        return None
    try:
        memo_data = json.dumps({
            "hash": hash_value, "type": record_type, "branch": branch,
            "platform": "S4 Ledger", "ts": datetime.now(timezone.utc).isoformat()
        })
        # AccountSet with memo — the actual on-chain anchor (signed by Issuer wallet)
        tx = AccountSet(
            account=_xrpl_wallet.address,
            memos=[Memo(
                memo_type=bytes("s4/anchor", "utf-8").hex(),
                memo_data=bytes(memo_data, "utf-8").hex()
            )]
        )
        response = submit_and_wait(tx, _xrpl_client, _xrpl_wallet)
        if response.is_successful():
            tx_hash = response.result["hash"]
            explorer_base = XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET
            result = {
                "tx_hash": tx_hash,
                "ledger_index": response.result.get("ledger_index"),
                "fee_drops": response.result.get("Fee", "12"),
                "network": XRPL_NETWORK,
                "verified": True,
                "explorer_url": explorer_base + tx_hash,
                "account": _xrpl_wallet.address
            }
            # Deduct 0.01 SLS anchor fee: User's wallet → Treasury (custodial signing)
            if user_email:
                fee_result = _deduct_anchor_fee(user_email=user_email)
                if fee_result and fee_result.get("success"):
                    result["sls_fee_tx"] = fee_result["fee_tx"]
                    result["sls_fee"] = SLS_ANCHOR_FEE
                    result["sls_treasury"] = SLS_TREASURY_ADDRESS
                elif fee_result and fee_result.get("error"):
                    result["sls_fee_error"] = fee_result["error"]
            return result
    except Exception as e:
        print(f"XRPL anchor failed: {e}")
    return None


# ═══════════════════════════════════════════════════════════════════════
#  VERCEL HANDLER
# ═══ AI AGENT — DEFENSE-SPECIFIC LLM SYSTEM PROMPT ═══════════════════

def _build_ai_system_prompt(tool_context="", analysis_data=None):
    """Build a comprehensive defense-specific system prompt for the AI Agent."""
    prompt = """You are the S4 Ledger ILS Agent — an expert defense logistics AI assistant built into S4 Ledger, a blockchain-verified defense record management platform.

## YOUR IDENTITY
- Name: S4 Agent
- Platform: S4 Ledger by S4 Systems, LLC
- Purpose: Help defense professionals with Integrated Logistics Support (ILS), record management, compliance, and general questions
- Tone: Professional but approachable. You can handle casual conversation while maintaining defense-grade accuracy.

## CORE KNOWLEDGE — DEFENSE LOGISTICS

### The 12 ILS Elements (MIL-STD-1388)
1. ILS Management — overall planning and coordination
2. Maintenance Planning — preventive/corrective maintenance strategy
3. Supply Support — spare parts, provisioning, COSAL/APL
4. Support Equipment — SE&TM required for maintenance
5. Technical Data — tech manuals, IETMs, engineering drawings
6. Training & Training Support — operator/maintainer training programs
7. Manpower & Personnel — crew requirements, MOS/NEC
8. Computer Resources — embedded software, firmware support
9. Facilities — maintenance facilities, depot capacity
10. PHS&T — Packaging, Handling, Storage & Transportation
11. Design Interface — LSA influence on design decisions
12. RAM — Reliability, Availability, Maintainability (Ao, MTBF, MTTR)

### Key Defense Acronyms
- CDRL: Contract Data Requirements List (DD Form 1423)
- DRL: Data Requirements List
- CAR: Corrective Action Request
- LCSP: Life Cycle Sustainment Plan
- LORA: Level of Repair Analysis
- LSA: Logistics Support Analysis
- FMECA: Failure Mode Effects & Criticality Analysis
- DMSMS: Diminishing Manufacturing Sources & Material Shortages
- COSAL: Coordinated Shipboard Allowance List
- APL: Allowance Parts List
- NSN: National Stock Number
- CAGE: Commercial and Government Entity code
- GIDEP: Government-Industry Data Exchange Program
- ICAPS: Interactive Computer Aided Provisioning System
- PMS: Planned Maintenance System (Navy)
- MRC: Maintenance Requirement Card
- MIP: Maintenance Index Page
- TEMP: Test & Evaluation Master Plan
- PTD: Provisioning Technical Documentation
- VRS: Vendor Recommended Spares
- IUID: Item Unique Identification
- DI: Data Item (e.g., DI-ILSS-81490)
- Ao: Operational Availability
- MTBF: Mean Time Between Failures
- MTTR: Mean Time To Repair

### Defense Systems S4 Integrates With
Navy: NSERC-IDE, MERLIN, NAVAIR AMS-PMT, CDMD-OA, NDE, PEO-MLB, CSPT, NAVSUP
Army: GCSS-Army, LMP, AESIP
Air Force: REMIS, LIMS-EV, D200A
Marine Corps: GCSS-MC, ATLASS
Coast Guard: ALMIS, CGOne
Space Force: USSF LMS
Joint/OSD: COMPASS, MBPS, GCSS, DPAS, DLA FLIS, PIEE/WAWF

### Compliance Frameworks
- CMMC Level 2: Cybersecurity Maturity Model Certification
- NIST SP 800-171: CUI Protection (110 controls, 14 families)
- DFARS 252.204-7012: Safeguarding Covered Defense Information
- FAR 46: Quality Assurance
- MIL-STD-1388: ILS Analysis Requirements
- DoDI 4245.15: DMSMS Management

### Milestone Reviews (DoDI 5000.02)
- Milestone A: Material Development Decision
- Milestone B: Engineering & Manufacturing Development
- Milestone C: Production & Deployment
- IOC: Initial Operational Capability
- FOC: Full Operational Capability

## S4 LEDGER PLATFORM CAPABILITIES

### 13 ILS Tools
1. Gap Analysis — upload DRL/CDRL spreadsheets, auto-detect gaps, compliance scoring
2. Action Items — track corrective actions with owners, dates, severity
3. ILS Calendar — milestone tracking, warranty expirations, review dates
4. DMSMS Tracker — obsolescence tracking across 500+ platforms
5. Readiness Calculator — Ao, MTBF, MTTR calculations
6. Parts Cross-Reference — NSN, CAGE, manufacturer data with alternates
7. ROI Calculator — cost-benefit analysis for ILS investments
8. Lifecycle Cost — total ownership cost estimation
9. Warranty Tracker — contract milestone and warranty expiration tracking
10. Audit Record Vault — blockchain-verified record storage with re-verification
11. Defense Document Library — 100+ searchable MIL-STDs, OPNAVINSTs, regulations
12. Compliance Scorecard — auto-scored across 6 frameworks
13. Provisioning & ICAPS — PTD, APL generation, ICAPS comparison
14. Supply Chain Risk Engine — ML-powered risk scoring, GIDEP alerts, single-source detection
15. Audit Report Generator — DCMA-ready compliance packages
16. Contract Management — CDRL tracking, SOW deliverables, contract mods
17. Digital Thread — configuration management, ECP tracking, BOM revision history
18. Predictive Maintenance — AI-driven failure prediction, maintenance scheduling
19. Defense Database Import — ingest from 24+ defense IT systems
20. AI Agent (you!) — conversational assistant for all ILS tasks

### Blockchain Anchoring
- Every record is hashed (SHA-256) and anchored to the XRP Ledger
- Zero data on-chain — only the hash fingerprint is stored
- Immutable audit trail with XRPL transaction hash and explorer links
- 0.01 SLS per anchor (SLS = Secure Logistics Standard, S4's utility token)

### File Upload Support
- CSV, XLSX/XLS, TXT, TSV — parsed and analyzed automatically
- PDF — text extraction and analysis
- DOCX — document parsing and content analysis
- All processing done client-side in the browser — no data leaves the user's machine

## BEHAVIORAL GUIDELINES

1. **Be conversational** — You can handle casual chat, jokes, greetings, and personal questions. You're a helpful colleague, not a rigid bot.
2. **Be an ILS expert** — When asked about defense logistics, go deep. Cite specific DI numbers, regulations, and best practices.
3. **Work with every tool** — You know the context of which ILS tool the user is currently in. Provide tool-specific guidance.
4. **Draft documents** — You can write memos, emails, CARs, briefing points, status reports, and SOW language.
5. **Explain simply** — Defense logistics is complex. Explain at whatever level the user needs — executive summary or technical deep-dive.
6. **Use data** — When analysis results are available, reference specific numbers, percentages, and action items.
7. **Be honest** — If you don't know something, say so. Don't fabricate DI numbers, regulations, or technical details.
8. **Security-aware** — Never ask for or discuss classified information. Remind users to use "Encrypt First" for CUI.
9. **Format well** — Use bullet points, bold text, and clear structure. Keep responses scannable.
10. **Handle anything** — If someone asks about the weather, sports, or their weekend plans, engage naturally. You're AI — you can multitask.
"""

    if tool_context:
        prompt += f"\n## CURRENT CONTEXT\nThe user is currently working in the **{tool_context}** tool. Tailor your responses to be relevant to this tool's capabilities.\n"

    if analysis_data:
        prompt += f"\n## CURRENT ANALYSIS DATA\n{json.dumps(analysis_data, indent=2)}\nUse this data to provide specific, data-driven responses about the user's program.\n"

    return prompt


# ═══════════════════════════════════════════════════════════════════════

class handler(BaseHTTPRequestHandler):

    def _cors_headers(self):
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
        }

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        for k, v in self._cors_headers().items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    MAX_BODY_SIZE = 1_048_576  # 1 MB

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        if length > self.MAX_BODY_SIZE:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def _route(self, path):
        path = path.rstrip("/")
        if path in ("/api", "/api/status"):
            return "status"
        if path == "/api/health":
            return "health"
        if path == "/api/metrics":
            return "metrics"
        if path == "/api/transactions":
            return "transactions"
        if path == "/api/record-types":
            return "record_types"
        if path == "/api/anchor":
            return "anchor"
        if path == "/api/hash":
            return "hash"
        if path == "/api/categorize":
            return "categorize"
        if path == "/api/xrpl-status":
            return "xrpl_status"
        if path == "/api/auth/api-key":
            return "auth_api_key"
        if path == "/api/auth/validate":
            return "auth_validate"
        if path == "/api/db/save-analysis":
            return "db_save_analysis"
        if path == "/api/db/get-analyses":
            return "db_get_analyses"
        if path == "/api/infrastructure":
            return "infrastructure"
        if path == "/api/dmsms":
            return "dmsms"
        if path == "/api/readiness":
            return "readiness"
        if path == "/api/parts":
            return "parts"
        if path == "/api/roi":
            return "roi"
        if path == "/api/lifecycle":
            return "lifecycle"
        if path == "/api/warranty":
            return "warranty"
        if path == "/api/supply-chain-risk":
            return "supply_chain_risk"
        if path == "/api/audit-reports":
            return "audit_reports"
        if path == "/api/contracts":
            return "contracts"
        if path == "/api/digital-thread":
            return "digital_thread"
        if path == "/api/predictive-maintenance":
            return "predictive_maintenance"
        if path == "/api/action-items":
            return "action_items"
        if path == "/api/calendar":
            return "calendar"
        if path == "/api/verify":
            return "verify"
        if path == "/api/wallet/provision":
            return "wallet_provision"
        if path == "/api/wallet/buy-sls":
            return "wallet_buy_sls"
        if path == "/api/wallet/balance":
            return "wallet_balance"
        if path == "/api/webhook/stripe":
            return "stripe_webhook"
        if path == "/api/ai-chat":
            return "ai_chat"
        return None

    def _check_rate_limit(self):
        """Returns True if request is allowed, False if rate limited."""
        ip = self.headers.get("X-Forwarded-For", self.headers.get("X-Real-IP", "unknown"))
        now = time.time()
        if ip not in _rate_limit_store:
            _rate_limit_store[ip] = []
        # Clean old entries
        _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if now - t < RATE_LIMIT_WINDOW]
        if len(_rate_limit_store[ip]) >= RATE_LIMIT_MAX:
            return False
        _rate_limit_store[ip].append(now)
        return True

    def _log_request(self, route, status=200):
        _request_log.append({
            "time": datetime.now(timezone.utc).isoformat(),
            "route": route,
            "status": status,
            "method": self.command,
        })
        # Keep last 1000 entries
        if len(_request_log) > 1000:
            _request_log.pop(0)

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in self._cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        route = self._route(parsed.path)

        # Rate limiting
        if not self._check_rate_limit():
            self._send_json({"error": "Rate limit exceeded", "retry_after": RATE_LIMIT_WINDOW}, 429)
            return

        if route == "health":
            self._log_request("health")
            uptime = time.time() - API_START_TIME
            self._send_json({
                "status": "healthy",
                "uptime_seconds": round(uptime, 1),
                "requests_served": len(_request_log),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": "4.0.0",
                "tools": ["anchor", "verify", "ils-workspace", "dmsms-tracker", "readiness-calculator", "parts-xref", "roi-calculator", "lifecycle-cost", "warranty-tracker", "audit-vault", "doc-library", "compliance-scorecard", "provisioning-ptd", "supply-chain-risk", "audit-reports", "contracts", "digital-thread", "predictive-maintenance"],
            })
        elif route == "status":
            self._log_request("status")
            self._send_json({
                "status": "operational",
                "service": "S4 Ledger Defense Metrics API",
                "version": "4.0.0",
                "record_types": len(RECORD_CATEGORIES),
                "branches": len(BRANCHES),
                "total_records": len(_get_all_records()),
                "infrastructure": {
                    "xrpl": XRPL_AVAILABLE,
                    "supabase": SUPABASE_AVAILABLE,
                    "auth": True,
                },
            })
        elif route == "metrics":
            records = _get_all_records()
            self._send_json(_aggregate_metrics(records))
        elif route == "transactions":
            records = _get_all_records()
            recent = list(reversed(records[-200:]))
            self._send_json({
                "transactions": recent,
                "total": len(records),
                "generated_at": datetime.now(timezone.utc).isoformat(),
            })
        elif route == "record_types":
            grouped = {}
            for key, cat in RECORD_CATEGORIES.items():
                branch = cat["branch"]
                if branch not in grouped:
                    grouped[branch] = {"info": BRANCHES.get(branch, {}), "types": []}
                grouped[branch]["types"].append({"key": key, **cat})
            self._send_json({"branches": BRANCHES, "categories": RECORD_CATEGORIES, "grouped": grouped})
        elif route == "xrpl_status":
            _init_xrpl()
            explorer_base = XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET
            endpoint = XRPL_MAINNET_URL if XRPL_NETWORK == "mainnet" else XRPL_TESTNET_URL
            self._send_json({
                "xrpl_available": XRPL_AVAILABLE,
                "connected": _xrpl_client is not None,
                "wallet": _xrpl_wallet.address if _xrpl_wallet else None,
                "network": XRPL_NETWORK,
                "endpoint": endpoint,
                "explorer": explorer_base,
                "note": f"Real XRPL {XRPL_NETWORK.capitalize()} transactions. Verify at {'livenet' if XRPL_NETWORK == 'mainnet' else 'testnet'}.xrpl.org"
            })
        elif route == "infrastructure":
            self._send_json({
                "infrastructure": {
                    "api": {"status": "operational", "version": "4.0.0", "framework": "BaseHTTPRequestHandler", "tools": 19, "platforms": 462},
                    "xrpl": {"available": XRPL_AVAILABLE, "network": XRPL_NETWORK, "endpoint": XRPL_MAINNET_URL if XRPL_NETWORK == "mainnet" else XRPL_TESTNET_URL},
                    "database": {"provider": "Supabase" if SUPABASE_AVAILABLE else "In-Memory", "connected": SUPABASE_AVAILABLE, "url": SUPABASE_URL[:30] + "..." if SUPABASE_URL else None},
                    "auth": {"enabled": True, "methods": ["API Key", "Bearer Token"], "master_key_set": bool(os.environ.get("S4_API_MASTER_KEY"))},
                    "compliance": {
                        "nist_800_171": "architecture_aligned",
                        "cmmc_level": 2,
                        "dfars_252_204_7012": True,
                        "zero_data_on_chain": True,
                        "classified_ready": ["UNCLASSIFIED", "CUI", "SECRET (on-prem)", "TS/SCI (on-prem)"]
                    },
                    "production_readiness": {
                        "api_server": True,
                        "xrpl_integration": XRPL_AVAILABLE,
                        "database_persistence": SUPABASE_AVAILABLE,
                        "authentication": True,
                        "ssl_tls": True,
                        "cdn": True,
                        "ci_cd": True,
                        "monitoring": False,
                        "load_balancing": False,
                        "estimated_pct": 42
                    }
                }
            })
        elif route == "auth_validate":
            api_key = self.headers.get("X-API-Key", "")
            valid = api_key == API_MASTER_KEY or api_key in API_KEYS_STORE
            self._send_json({"valid": valid, "tier": "enterprise" if valid else None})
        elif route == "dmsms":
            self._log_request("dmsms")
            program = parse_qs(parsed.query).get("program", ["ddg51"])[0]
            parts = []
            statuses = ["Active","Active","Active","At Risk","At Risk","Obsolete","End of Life","Active","Watch","Active"]
            for i in range(10):
                parts.append({"index": i, "status": statuses[i], "severity": "Critical" if statuses[i]=="Obsolete" else "High" if statuses[i]=="At Risk" else "None"})
            self._send_json({"program": program, "total_parts": len(parts), "at_risk": sum(1 for p in parts if p["status"]!="Active"), "parts": parts})
        elif route == "readiness":
            self._log_request("readiness")
            qs = parse_qs(parsed.query)
            mtbf = float(qs.get("mtbf", ["1000"])[0])
            mttr = float(qs.get("mttr", ["4"])[0])
            mldt = float(qs.get("mldt", ["24"])[0])
            ao = mtbf / (mtbf + mttr + mldt) if (mtbf + mttr + mldt) > 0 else 0
            ai = mtbf / (mtbf + mttr) if (mtbf + mttr) > 0 else 0
            self._send_json({"ao": round(ao, 4), "ai": round(ai, 4), "mtbf": mtbf, "mttr": mttr, "mldt": mldt, "failure_rate": round(1/mtbf, 8) if mtbf > 0 else 0, "assessment": "Meets requirements" if ao >= 0.9 else "Marginal" if ao >= 0.8 else "Below threshold"})
        elif route == "parts":
            self._log_request("parts")
            qs = parse_qs(parsed.query)
            search = qs.get("q", [""])[0].lower()
            sample_parts = [{"nsn":"5340-01-234-5678","name":"Valve, Gate","cage":"1THK9","mfg":"Parker Hannifin","status":"Available"},{"nsn":"2835-01-456-7890","name":"Gas Turbine Engine","cage":"77445","mfg":"GE Aviation","status":"Available"},{"nsn":"5841-01-622-3401","name":"Radar Array","cage":"07458","mfg":"Raytheon","status":"Low Stock"},{"nsn":"1440-01-567-8901","name":"Vertical Launch System","cage":"64928","mfg":"Lockheed Martin","status":"Available"},{"nsn":"4320-01-567-8903","name":"Ballast Pump","cage":"60548","mfg":"Flowserve","status":"Available"}]
            if search:
                sample_parts = [p for p in sample_parts if search in p["nsn"].lower() or search in p["name"].lower() or search in p["cage"].lower()]
            self._send_json({"query": search, "results": sample_parts, "total": len(sample_parts)})
        elif route == "roi":
            self._log_request("roi")
            qs = parse_qs(parsed.query)
            programs = int(qs.get("programs", ["5"])[0])
            ftes = float(qs.get("ftes", ["8"])[0])
            rate = float(qs.get("rate", ["145"])[0])
            license_cost = float(qs.get("license", ["120000"])[0])
            labor = ftes * rate * 2080
            savings = labor * 0.65 + programs * 12000
            roi_pct = ((savings - license_cost) / license_cost * 100) if license_cost > 0 else 0
            self._send_json({"programs": programs, "ftes": ftes, "annual_savings": round(savings), "license_cost": license_cost, "net_benefit": round(savings - license_cost), "roi_percent": round(roi_pct, 1), "payback_months": round(license_cost / savings * 12, 1) if savings > 0 else 99})
        elif route == "lifecycle":
            self._log_request("lifecycle")
            qs = parse_qs(parsed.query)
            acq = float(qs.get("acquisition", ["85"])[0])
            fleet = int(qs.get("fleet", ["20"])[0])
            life = int(qs.get("life", ["30"])[0])
            sust_rate = float(qs.get("sustrate", ["8"])[0]) / 100
            total_acq = acq * fleet
            total_sust = total_acq * sust_rate * life
            dmsms = total_acq * 0.04 * life
            total = total_acq + total_sust + dmsms
            self._send_json({"acquisition_m": round(total_acq, 1), "sustainment_m": round(total_sust, 1), "dmsms_m": round(dmsms, 1), "total_ownership_m": round(total, 1), "service_life_years": life, "fleet_size": fleet})
        elif route == "warranty":
            self._log_request("warranty")
            program = parse_qs(parsed.query).get("program", ["ddg51"])[0]
            items = [{"system": f"System {i+1}", "status": "Active" if i < 6 else "Expiring" if i < 8 else "Expired", "days_left": max(0, 365 - i * 60), "contract_type": "OEM Warranty", "value": 50000 + i * 25000} for i in range(10)]
            self._send_json({"program": program, "items": items, "active": sum(1 for i in items if i["status"] == "Active"), "expiring": sum(1 for i in items if i["status"] == "Expiring"), "total_value": sum(i["value"] for i in items)})
        elif route == "supply_chain_risk":
            self._log_request("supply-chain-risk")
            qs = parse_qs(parsed.query)
            program = qs.get("program", ["ddg51"])[0]
            threshold = qs.get("threshold", ["all"])[0]
            risk_items = []
            parts = [("SPY-6 T/R Module","5985-01-678-4321","Raytheon",92,"critical"),("LM2500 Turbine Blade","2840-01-480-6710","General Dynamics",87,"critical"),("MK 41 VLS Rail","1440-01-555-8790","BAE Systems",78,"high"),("AN/SQQ-89 Sonar","5845-01-602-3344","L3Harris",72,"high"),("SEWIP Block III","5985-01-690-1234","Northrop Grumman",65,"medium"),("CIWS Phalanx Motor","6110-01-557-2288","Honeywell",58,"medium"),("Hull Steel HY-80","9515-01-320-4567","Curtiss-Wright",45,"medium"),("Mk 45 Barrel Liner","1005-01-398-7722","BAE Systems",38,"low"),("SSDS Mk 2 Server","7021-01-567-8901","Collins Aerospace",28,"low"),("Fin Stabilizer","2040-01-678-0123","Moog Inc",22,"low")]
            for p in parts:
                risk_items.append({"part":p[0],"nsn":p[1],"supplier":p[2],"score":p[3],"level":p[4],"factors":["Single-source dependency","DLA lead time spike"],"eta_impact":f"+{p[3]}d" if p[3]>50 else "None"})
            if threshold == "critical": risk_items = [r for r in risk_items if r["level"]=="critical"]
            elif threshold == "high": risk_items = [r for r in risk_items if r["level"] in ("critical","high")]
            self._send_json({"program":program,"items":risk_items,"critical":sum(1 for r in risk_items if r["level"]=="critical"),"high":sum(1 for r in risk_items if r["level"]=="high"),"medium":sum(1 for r in risk_items if r["level"]=="medium"),"low":sum(1 for r in risk_items if r["level"]=="low"),"total":len(risk_items)})
        elif route == "audit_reports":
            self._log_request("audit-reports")
            qs = parse_qs(parsed.query)
            report_type = qs.get("type", ["full_audit"])[0]
            period = int(qs.get("period", ["90"])[0])
            sections = {"full_audit":["Executive Summary","Anchoring History","Chain of Custody","Compliance Scorecard","Record Verification","Hash Integrity"],"supply_chain":["Supply Chain Overview","Receipt Verification","Custody Transfers","Lot Traceability"],"maintenance":["Maintenance Summary","Work Order Verification","Parts Usage","Readiness Impact"],"compliance":["Overall Score","NIST 800-171","CMMC Readiness","DFARS Compliance"],"custody":["Custody Timeline","Transfer Verification","Location History","Blockchain Proof"],"contract":["CDRL Status","Deliverable Timeline","Mod History","Cost Performance"]}
            sec = sections.get(report_type, sections["full_audit"])
            self._send_json({"report_type":report_type,"period_days":period,"sections":sec,"record_count":42,"compliance_score":94.2,"generated":datetime.now(timezone.utc).isoformat()})
        elif route == "contracts":
            self._log_request("contracts")
            qs = parse_qs(parsed.query)
            contract_id = qs.get("contract", ["N00024-25-C-5501"])[0]
            items = [{"id":"A001","desc":"Integrated Logistics Support Plan","type":"cdrl","di":"DI-ALSS-81529","due":"2025-06-15","status":"on_track","anchored":True},{"id":"A003","desc":"Level of Repair Analysis","type":"cdrl","di":"DI-ALSS-81517","due":"2025-05-01","status":"delivered","anchored":True},{"id":"A005","desc":"Reliability Analysis Report","type":"cdrl","di":"DI-RELI-80255","due":"2025-04-15","status":"overdue","anchored":False},{"id":"MOD-P00001","desc":"Contract Value Adjustment +$2.4M","type":"mod","di":"—","due":"2025-03-01","status":"delivered","anchored":True},{"id":"SOW-3.1.1","desc":"Monthly Status Report","type":"deliverable","di":"—","due":"2025-05-30","status":"on_track","anchored":False}]
            self._send_json({"contract":contract_id,"items":items,"total":len(items),"on_track":sum(1 for i in items if i["status"]=="on_track"),"overdue":sum(1 for i in items if i["status"]=="overdue"),"delivered":sum(1 for i in items if i["status"]=="delivered")})
        elif route == "digital_thread":
            self._log_request("digital-thread")
            qs = parse_qs(parsed.query)
            platform = qs.get("platform", ["ddg51"])[0]
            view = qs.get("view", ["changes"])[0]
            items = [{"id":f"ECP-{platform.upper()}-2024001","desc":"Replace hydraulic actuator with electro-mechanical","type":"Class I","status":"approved","anchored":True},{"id":f"ECP-{platform.upper()}-2024002","desc":"Update corrosion protection coating","type":"Class II","status":"implemented","anchored":True},{"id":f"ECP-{platform.upper()}-2024003","desc":"Redesign cooling duct","type":"Class I","status":"pending","anchored":False},{"id":f"BOM-{platform.upper()}-001","desc":"Top-Level Assembly BOM Rev C","type":"Rev C","status":"approved","anchored":True}]
            self._send_json({"platform":platform,"view":view,"items":items,"total":len(items),"pending":sum(1 for i in items if i["status"]=="pending"),"approved":sum(1 for i in items if i["status"] in ("approved","implemented")),"anchored":sum(1 for i in items if i["anchored"])})
        elif route == "predictive_maintenance":
            self._log_request("predictive-maintenance")
            qs = parse_qs(parsed.query)
            platform = qs.get("platform", ["ddg51"])[0]
            window = int(qs.get("window", ["90"])[0])
            confidence = int(qs.get("confidence", ["85"])[0])
            predictions = [{"system":"LM2500 Gas Turbine","component":"HP Turbine Blade","mode":"Creep fatigue","confidence":94,"eta_days":18,"cost_unplanned":1850,"urgent":True},{"system":"SPY-6 Radar Array","component":"T/R Module Bank 3","mode":"Power degradation","confidence":91,"eta_days":34,"cost_unplanned":720,"urgent":False},{"system":"MK 41 VLS","component":"Gas Management Seal","mode":"Pressure loss","confidence":88,"eta_days":52,"cost_unplanned":380,"urgent":False},{"system":"CIWS Phalanx","component":"Servo Motor","mode":"Tracking drift","confidence":86,"eta_days":67,"cost_unplanned":420,"urgent":False}]
            predictions = [p for p in predictions if p["confidence"] >= confidence and p["eta_days"] <= window]
            total_cost = sum(p["cost_unplanned"] for p in predictions)
            self._send_json({"platform":platform,"window_days":window,"confidence_threshold":confidence,"predictions":predictions,"total":len(predictions),"urgent":sum(1 for p in predictions if p["urgent"]),"total_risk_k":total_cost,"est_savings_k":int(total_cost*0.55),"model_accuracy":92.4})
        elif route == "action-items" or route == "action_items":
            self._log_request("action-items")
            # Return sample action items for SDK/API consumers
            sample_items = [
                {"id": "AI-001", "title": "ASIC RF Module EOL — source alternate", "severity": "critical", "source": "dmsms", "cost": "450", "schedule": "Immediate", "done": False},
                {"id": "AI-002", "title": "F135 warranty renewal deadline approaching", "severity": "critical", "source": "warranty", "cost": "2100", "schedule": "30 days", "done": False},
                {"id": "AI-003", "title": "Ao below 95% threshold on SPY-6 radar", "severity": "critical", "source": "readiness", "cost": "180", "schedule": "60 days", "done": False},
                {"id": "AI-004", "title": "Update lifecycle cost model for DDG-51", "severity": "warning", "source": "lifecycle", "cost": "0", "schedule": "Quarterly", "done": False},
                {"id": "AI-005", "title": "Cross-reference alternate parts for NSN 5998-01-456-7890", "severity": "warning", "source": "parts", "cost": "85", "schedule": "2-4 months", "done": False},
            ]
            self._send_json({"action_items": sample_items, "total": len(sample_items), "critical": sum(1 for i in sample_items if i["severity"]=="critical"), "open": sum(1 for i in sample_items if not i["done"])})
        elif route == "calendar":
            self._log_request("calendar")
            qs = parse_qs(parsed.query)
            month = int(qs.get("month", [str(datetime.now(timezone.utc).month)])[0])
            year = int(qs.get("year", [str(datetime.now(timezone.utc).year)])[0])
            events = [
                {"id": "E-001", "title": "DMSMS Review Board", "date": f"{year}-{month:02d}-15", "time": "10:00", "type": "warning", "source": "dmsms"},
                {"id": "E-002", "title": "Readiness Assessment Due", "date": f"{year}-{month:02d}-22", "time": "09:00", "type": "critical", "source": "readiness"},
                {"id": "E-003", "title": "Warranty Renewal Deadline", "date": f"{year}-{month:02d}-28", "time": "17:00", "type": "critical", "source": "warranty"},
            ]
            self._send_json({"month": month, "year": year, "events": events, "total": len(events)})
        elif route == "wallet_balance":
            self._log_request("wallet-balance")
            qs = parse_qs(parsed.query)
            address = qs.get("address", [""])[0]
            if not address:
                self._send_json({"error": "address parameter required"}, 400)
                return
            # Query XRPL for account balances
            _init_xrpl()
            if not _xrpl_client or not XRPL_AVAILABLE:
                self._send_json({"error": "XRPL not available"}, 503)
                return
            try:
                from xrpl.models.requests import AccountInfo, AccountLines
                acc_info = _xrpl_client.request(AccountInfo(account=address))
                xrp_drops = int(acc_info.result.get("account_data", {}).get("Balance", "0"))
                xrp_balance = xrp_drops / 1_000_000

                acc_lines = _xrpl_client.request(AccountLines(account=address))
                sls_balance = "0"
                for line in acc_lines.result.get("lines", []):
                    if line.get("currency") == "SLS" and line.get("account") == SLS_ISSUER_ADDRESS:
                        sls_balance = line.get("balance", "0")
                        break

                anchors_available = int(float(sls_balance) / float(SLS_ANCHOR_FEE)) if float(sls_balance) > 0 else 0
                explorer_base = (XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET).replace("/transactions/", "/accounts/")

                self._send_json({
                    "address": address,
                    "xrp_balance": round(xrp_balance, 6),
                    "sls_balance": sls_balance,
                    "anchors_available": anchors_available,
                    "sls_price_usd": SLS_PRICE_USD,
                    "network": XRPL_NETWORK,
                    "explorer_url": explorer_base + address,
                })
            except Exception as e:
                self._send_json({"error": f"Account lookup failed: {str(e)}"}, 404)
        else:
            self._send_json({"error": "Not found", "path": self.path}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        route = self._route(parsed.path)

        # Rate limiting
        if not self._check_rate_limit():
            self._send_json({"error": "Rate limit exceeded", "retry_after": RATE_LIMIT_WINDOW}, 429)
            return

        data = self._read_body()

        if route == "anchor":
            now = datetime.now(timezone.utc)
            record_type = data.get("record_type", "JOINT_CONTRACT")
            cat = RECORD_CATEGORIES.get(record_type, {"label": record_type, "branch": "JOINT", "icon": "\U0001f4cb", "system": "N/A"})
            hash_value = data.get("hash", hashlib.sha256(str(now).encode()).hexdigest())
            user_email = data.get("user_email", "")  # For automatic SLS anchor fee deduction

            # Anchor to XRPL (Issuer signs) + auto-deduct 0.01 SLS from user wallet → Treasury
            xrpl_result = _anchor_xrpl(hash_value, record_type, cat.get("branch", ""), user_email=user_email or None)

            if xrpl_result:
                tx_hash = xrpl_result["tx_hash"]
                network = "XRPL " + XRPL_NETWORK.capitalize()
                explorer_url = xrpl_result["explorer_url"]
            else:
                tx_hash = data.get("tx_hash", "TX" + hashlib.md5(str(now).encode()).hexdigest().upper()[:32])
                network = "Simulated"
                explorer_url = None

            record = {
                "hash": hash_value,
                "record_type": record_type,
                "record_label": cat.get("label", record_type),
                "branch": cat.get("branch", "JOINT"),
                "icon": cat.get("icon", "\U0001f4cb"),
                "timestamp": now.isoformat(),
                "timestamp_display": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "fee": 0.01,
                "tx_hash": tx_hash,
                "network": network,
                "explorer_url": explorer_url,
                "system": cat.get("system", "N/A"),
                "content_preview": data.get("content_preview", ""),
            }
            _live_records.append(record)
            self._send_json({"status": "anchored", "record": record, "xrpl": xrpl_result})

        elif route == "hash":
            text = data.get("record", "")
            h = hashlib.sha256(text.encode()).hexdigest()
            self._send_json({"hash": h, "algorithm": "SHA-256"})

        elif route == "verify":
            self._log_request("verify")
            record_text = data.get("record_text", "")
            if not record_text:
                self._send_json({"error": "record_text is required"}, 400)
                return

            # Compute current hash
            computed_hash = hashlib.sha256(record_text.encode()).hexdigest()
            tx_hash = data.get("tx_hash", "")
            expected_hash = data.get("expected_hash", "")
            operator = data.get("operator", self.headers.get("X-Operator", "anonymous"))
            now = datetime.now(timezone.utc)

            # Determine chain hash to compare against
            chain_hash = None
            anchored_at = None
            explorer_url = None

            if tx_hash:
                # Look up on-chain memo data from the transaction
                found = [r for r in _live_records if r.get("tx_hash") == tx_hash or r.get("hash") == tx_hash]
                if found:
                    chain_hash = found[0].get("hash", "")
                    anchored_at = found[0].get("timestamp", "")
                    explorer_url = found[0].get("explorer_url") or (XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET) + tx_hash
            elif expected_hash:
                chain_hash = expected_hash
            else:
                # Search records for matching hash
                found = [r for r in _live_records if r.get("hash") == computed_hash]
                if found:
                    chain_hash = found[0].get("hash", "")
                    tx_hash = found[0].get("tx_hash", "")
                    anchored_at = found[0].get("timestamp", "")
                    explorer_url = found[0].get("explorer_url") or (XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET) + tx_hash

            if chain_hash is None:
                status = "NOT_FOUND"
                verified = False
                tamper_detected = False
            elif computed_hash == chain_hash:
                status = "MATCH"
                verified = True
                tamper_detected = False
            else:
                status = "MISMATCH"
                verified = False
                tamper_detected = True

            time_delta = None
            if anchored_at:
                try:
                    anchor_dt = datetime.fromisoformat(anchored_at.replace("Z", "+00:00"))
                    time_delta = round((now - anchor_dt).total_seconds(), 2)
                except Exception:
                    pass

            # Log to verification audit trail
            audit_entry = {
                "timestamp": now.isoformat(),
                "operator": operator,
                "computed_hash": computed_hash,
                "chain_hash": chain_hash,
                "tx_hash": tx_hash or None,
                "result": status,
                "tamper_detected": tamper_detected,
                "time_delta_seconds": time_delta,
            }
            _verify_audit_log.append(audit_entry)

            result = {
                "verified": verified,
                "status": status,
                "computed_hash": computed_hash,
                "chain_hash": chain_hash,
                "tx_hash": tx_hash or None,
                "anchored_at": anchored_at,
                "verified_at": now.isoformat(),
                "time_delta_seconds": time_delta,
                "explorer_url": explorer_url,
                "tamper_detected": tamper_detected,
                "audit_id": f"VRF-{hashlib.sha256(now.isoformat().encode()).hexdigest()[:12].upper()}",
            }

            # If tamper detected, flag for notification
            if tamper_detected:
                result["alert"] = {
                    "severity": "CRITICAL",
                    "message": f"TAMPER DETECTED: Record hash mismatch. Computed {computed_hash[:16]}... does not match chain {chain_hash[:16] if chain_hash else 'N/A'}...",
                    "action_required": "Investigate source of modification. Original on-chain record is the authoritative version.",
                    "correction_available": True,
                }

            self._send_json(result)

        elif route == "categorize":
            memo = data.get("memo", "").upper()
            for key in RECORD_CATEGORIES:
                if key in memo:
                    self._send_json({"category": key, "label": RECORD_CATEGORIES[key]["label"]})
                    return
            self._send_json({"category": "JOINT_CONTRACT", "label": "Contract Deliverable"})

        elif route == "auth_api_key":
            # Generate a new API key
            master = data.get("master_key", "")
            if master != API_MASTER_KEY:
                self._send_json({"error": "Invalid master key"}, 403)
                return
            org = data.get("organization", "Unknown")
            new_key = "s4_" + hashlib.sha256((org + str(datetime.now(timezone.utc))).encode()).hexdigest()[:32]
            API_KEYS_STORE[new_key] = {
                "organization": org,
                "created": datetime.now(timezone.utc).isoformat(),
                "tier": data.get("tier", "standard"),
                "rate_limit": 1000
            }
            self._send_json({"api_key": new_key, "organization": org, "tier": data.get("tier", "standard")})

        elif route == "db_save_analysis":
            # Save ILS analysis to database (Supabase or in-memory)
            api_key = self.headers.get("X-API-Key", "")
            if api_key != API_MASTER_KEY and api_key not in API_KEYS_STORE:
                self._send_json({"error": "Valid API key required"}, 401)
                return
            analysis_id = "ILS-" + hashlib.sha256(str(datetime.now(timezone.utc)).encode()).hexdigest()[:12].upper()
            record = {
                "id": analysis_id,
                "program": data.get("program", ""),
                "hull": data.get("hull", ""),
                "score": data.get("score", 0),
                "crit_gaps": data.get("crit_gaps", 0),
                "total_actions": data.get("total_actions", 0),
                "risk_cost": data.get("risk_cost", 0),
                "hash": data.get("hash", ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": API_KEYS_STORE.get(api_key, {}).get("organization", "demo"),
            }
            # In production: save to Supabase
            # if SUPABASE_AVAILABLE: supabase.table("ils_analyses").insert(record).execute()
            _live_records.append(record)
            self._send_json({"status": "saved", "analysis": record})

        elif route == "db_get_analyses":
            api_key = self.headers.get("X-API-Key", "")
            if api_key != API_MASTER_KEY and api_key not in API_KEYS_STORE:
                self._send_json({"error": "Valid API key required"}, 401)
                return
            # Return ILS analyses (in production: query Supabase)
            analyses = [r for r in _live_records if "id" in r and r.get("id", "").startswith("ILS-")]
            self._send_json({"analyses": analyses, "total": len(analyses)})

        elif route == "wallet_provision":
            self._log_request("wallet-provision")
            # Provision a new XRPL wallet: Treasury funds XRP + delivers SLS allocation
            email = data.get("email", "")
            organization = data.get("organization", "")
            plan = data.get("plan", "starter")

            if not email:
                self._send_json({"error": "Email is required"}, 400)
                return

            result = _provision_wallet(email=email, plan=plan)
            if result is None:
                self._send_json({"error": "XRPL not available — wallet provisioning requires Treasury wallet (XRPL_TREASURY_SEED)"}, 503)
                return
            if "error" in result:
                self._send_json(result, 500)
                return

            tier = SUBSCRIPTION_TIERS.get(plan, SUBSCRIPTION_TIERS["starter"])

            result["account"] = {
                "email": email,
                "organization": organization,
                "plan": plan,
                "created": datetime.now(timezone.utc).isoformat(),
            }
            result["instructions"] = {
                "important": "SAVE YOUR WALLET SEED SECURELY — it is also stored by S4 for automatic anchor fee signing.",
                "seed_note": "Your family seed is stored securely by S4 Ledger so anchor fees (0.01 SLS) are deducted automatically. You can also import it into Xaman for independent wallet access.",
                "next_steps": [
                    "Your XRPL wallet has been created and activated with XRP.",
                    f"Your {tier['label']} subscription includes {tier['sls_monthly']:,} SLS/month — already delivered to your wallet.",
                    "Each anchor costs 0.01 SLS — deducted automatically from your wallet.",
                    "SLS flows back to the S4 Treasury on every anchor, keeping the economy sustainable.",
                    "Install Xaman (formerly XUMM) to view your wallet on mobile — import using your family seed.",
                ],
                "xaman_url": "https://xaman.app",
                "explorer_url": (XRPL_EXPLORER_MAINNET if XRPL_NETWORK == 'mainnet' else XRPL_EXPLORER_TESTNET).replace('/transactions/', '/accounts/') + result['wallet']['address'],
            }
            self._send_json(result)

        elif route == "wallet_buy_sls":
            self._log_request("wallet-buy-sls")
            # Manual SLS top-up: additional SLS delivered from Treasury (requires Stripe payment)
            wallet_address = data.get("wallet_address", "")
            email = data.get("email", "")
            sls_amount = data.get("sls_amount", 0)
            stripe_payment_id = data.get("stripe_payment_id", "")

            if not wallet_address and not email:
                self._send_json({"error": "wallet_address or email is required"}, 400)
                return
            if not sls_amount or int(sls_amount) <= 0:
                self._send_json({"error": "sls_amount must be positive"}, 400)
                return

            # In production: verify Stripe payment before delivering SLS
            if not stripe_payment_id and STRIPE_SECRET_KEY:
                self._send_json({
                    "error": "Payment verification required",
                    "message": "Additional SLS cannot be delivered without a confirmed Stripe payment.",
                }, 402)
                return

            _init_xrpl()
            if not _xrpl_client or not _xrpl_treasury_wallet:
                self._send_json({"error": "XRPL Treasury not available"}, 503)
                return

            # Look up destination wallet
            dest_address = wallet_address
            if not dest_address and email:
                seed = _get_wallet_seed(email=email)
                if seed:
                    dest_wallet = Wallet.from_seed(seed, algorithm=CryptoAlgorithm.SECP256K1)
                    dest_address = dest_wallet.address
            if not dest_address:
                self._send_json({"error": "Could not resolve wallet address"}, 404)
                return

            try:
                from xrpl.models.transactions import Payment as Pay
                from xrpl.models.amounts import IssuedCurrencyAmount as ICA

                payment = Pay(
                    account=_xrpl_treasury_wallet.address,
                    destination=dest_address,
                    amount=ICA(currency="SLS", issuer=SLS_ISSUER_ADDRESS, value=str(int(sls_amount))),
                    memos=[Memo(
                        memo_type=bytes("s4/sls-topup", "utf-8").hex(),
                        memo_data=bytes(json.dumps({
                            "type": "sls_topup",
                            "amount": str(sls_amount),
                            "stripe_id": stripe_payment_id or "demo",
                        }), "utf-8").hex()
                    )]
                )
                resp = submit_and_wait(payment, _xrpl_client, _xrpl_treasury_wallet)
                if resp.is_successful():
                    explorer_base = XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET
                    self._send_json({
                        "success": True,
                        "sls_delivered": str(sls_amount),
                        "tx_hash": resp.result["hash"],
                        "explorer_url": explorer_base + resp.result["hash"],
                        "destination": dest_address,
                        "source": "Treasury",
                    })
                else:
                    self._send_json({"error": resp.result.get("engine_result_message", "unknown")}, 500)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)

        elif route == "stripe_webhook":
            self._log_request("stripe-webhook")
            # Stripe webhook for automatic monthly SLS renewal
            # When Stripe charges a subscriber, this endpoint is called automatically.
            # It delivers the next month's SLS allocation from Treasury to the user's wallet.
            event_type = data.get("type", "")
            if event_type == "invoice.payment_succeeded":
                invoice = data.get("data", {}).get("object", {})
                customer_email = invoice.get("customer_email", "")
                plan = invoice.get("metadata", {}).get("plan", "starter")
                if customer_email:
                    result = _deliver_monthly_sls(customer_email, plan=plan)
                    self._send_json(result)
                else:
                    self._send_json({"error": "No customer_email in invoice"}, 400)
            elif event_type == "customer.subscription.deleted":
                # Subscription cancelled — no action needed (SLS stays in user's wallet until used)
                self._send_json({"received": True, "action": "none", "note": "SLS balance remains until exhausted"})
            else:
                # Acknowledge other webhook events
                self._send_json({"received": True, "event_type": event_type})

        elif route == "ai_chat":
            self._log_request("ai-chat")
            # ═══ AI Agent — LLM-Powered Defense Logistics Assistant ═══
            # Proxies to OpenAI/Anthropic/Azure with a defense-specific system prompt.
            # Falls back to structured response if no API key configured.
            user_message = data.get("message", "").strip()
            conversation = data.get("conversation", [])  # Previous messages
            tool_context = data.get("tool_context", "")  # Current ILS tool
            analysis_data = data.get("analysis_data", None)  # Gap analysis results summary

            if not user_message:
                self._send_json({"error": "No message provided"}, 400)
                return

            # Build the system prompt
            system_prompt = _build_ai_system_prompt(tool_context, analysis_data)

            # Try OpenAI first, then Anthropic, then fallback
            openai_key = os.environ.get("OPENAI_API_KEY", "")
            anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
            azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
            azure_key = os.environ.get("AZURE_OPENAI_KEY", "")
            azure_deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")

            ai_response = None

            if azure_endpoint and azure_key:
                # Azure OpenAI (FedRAMP eligible)
                try:
                    import urllib.request
                    messages = [{"role": "system", "content": system_prompt}]
                    for msg in conversation[-20:]:
                        messages.append({"role": msg.get("role", "user"), "content": msg.get("text", msg.get("content", ""))})
                    messages.append({"role": "user", "content": user_message})
                    api_url = f"{azure_endpoint}/openai/deployments/{azure_deployment}/chat/completions?api-version=2024-02-01"
                    req_body = json.dumps({"messages": messages, "max_tokens": 2000, "temperature": 0.7}).encode()
                    req = urllib.request.Request(api_url, data=req_body, headers={"Content-Type": "application/json", "api-key": azure_key})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        result = json.loads(resp.read().decode())
                        ai_response = result["choices"][0]["message"]["content"]
                except Exception as e:
                    ai_response = None  # Fall through to next provider

            if not ai_response and openai_key:
                # OpenAI (GPT-4o)
                try:
                    import urllib.request
                    messages = [{"role": "system", "content": system_prompt}]
                    for msg in conversation[-20:]:
                        messages.append({"role": msg.get("role", "user"), "content": msg.get("text", msg.get("content", ""))})
                    messages.append({"role": "user", "content": user_message})
                    req_body = json.dumps({"model": "gpt-4o", "messages": messages, "max_tokens": 2000, "temperature": 0.7}).encode()
                    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=req_body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {openai_key}"})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        result = json.loads(resp.read().decode())
                        ai_response = result["choices"][0]["message"]["content"]
                except Exception as e:
                    ai_response = None

            if not ai_response and anthropic_key:
                # Anthropic (Claude)
                try:
                    import urllib.request
                    api_messages = []
                    for msg in conversation[-20:]:
                        role = msg.get("role", "user")
                        if role == "bot": role = "assistant"
                        api_messages.append({"role": role, "content": msg.get("text", msg.get("content", ""))})
                    api_messages.append({"role": "user", "content": user_message})
                    req_body = json.dumps({"model": "claude-sonnet-4-20250514", "system": system_prompt, "messages": api_messages, "max_tokens": 2000}).encode()
                    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=req_body, headers={"Content-Type": "application/json", "x-api-key": anthropic_key, "anthropic-version": "2023-06-01"})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        result = json.loads(resp.read().decode())
                        ai_response = result["content"][0]["text"]
                except Exception as e:
                    ai_response = None

            if ai_response:
                self._send_json({"response": ai_response, "provider": "llm", "fallback": False})
            else:
                # No LLM available — return signal for client-side fallback
                self._send_json({"response": None, "provider": "none", "fallback": True, "message": "No AI provider configured. Using local pattern matching."})

        else:
            self._send_json({"error": "Not found", "path": self.path}, 404)
