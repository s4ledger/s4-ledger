"""
S4 Ledger — Defense Record Metrics API (Vercel Serverless)
Zero-dependency implementation using Vercel's native Python handler.
130+ defense record types, 600 pre-seeded records.
"""

from http.server import BaseHTTPRequestHandler
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, parse_qs
import hashlib
import random
import json
import os
import re

# Project root: one level up from api/
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
}

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
}

# ═══════════════════════════════════════════════════════════════════════
#  130+ DEFENSE RECORD CATEGORIES
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
    for r in records:
        rt = r.get("record_label", r.get("record_type", "Unknown"))
        records_by_type[rt] = records_by_type.get(rt, 0) + 1
        branch = r.get("branch", "JOINT")
        records_by_branch[branch] = records_by_branch.get(branch, 0) + 1

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
#  VERCEL HANDLER (BaseHTTPRequestHandler — zero dependencies)
# ═══════════════════════════════════════════════════════════════════════

class handler(BaseHTTPRequestHandler):

    def _cors_headers(self):
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Content-Type": "application/json",
        }

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        for k, v in self._cors_headers().items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def _route(self, path):
        path = path.rstrip("/")
        if path in ("/api", "/api/health"):
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
        if path == "/api/debug":
            return "debug"
        return None

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in self._cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        route = self._route(parsed.path)

        if route == "health":
            root_files = []
            try:
                root_files = sorted(os.listdir(PROJECT_ROOT))[:25]
            except Exception as e:
                root_files = [str(e)]
            self._send_json({
                "status": "operational",
                "service": "S4 Ledger Defense Metrics API",
                "version": "2.0.0",
                "record_types": len(RECORD_CATEGORIES),
                "branches": len(BRANCHES),
                "total_records": len(_get_all_records()),
                "_debug_root": PROJECT_ROOT,
                "_debug_file": os.path.abspath(__file__),
                "_debug_root_files": root_files,
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
        elif route == "debug":
            # Temporary debug to diagnose Vercel filesystem
            root = PROJECT_ROOT
            root_exists = os.path.isdir(root)
            root_files = []
            if root_exists:
                try:
                    root_files = os.listdir(root)[:30]
                except Exception as e:
                    root_files = [f"ERROR: {e}"]
            self._send_json({
                "project_root": root,
                "root_exists": root_exists,
                "root_files": root_files,
                "__file__": os.path.abspath(__file__),
                "cwd": os.getcwd(),
                "cwd_files": os.listdir(os.getcwd())[:20],
            })
        else:
            # Fallback: serve static files from project root
            self._serve_static(parsed.path)

    def _serve_static(self, path):
        """Serve static files - fallback when Vercel routes everything through Python."""
        try:
            # Normalize path
            if not path or path == '/':
                path = '/index.html'
            elif path.endswith('/'):
                path = path + 'index.html'
            elif '.' not in os.path.basename(path):
                path = path.rstrip('/') + '/index.html'

            # Security: prevent directory traversal
            safe_path = os.path.normpath(path.lstrip('/'))
            if safe_path.startswith('..'):
                self._send_json({"error": "Forbidden"}, 403)
                return

            file_path = os.path.join(PROJECT_ROOT, safe_path)

            if os.path.isfile(file_path):
                ext = os.path.splitext(file_path)[1].lower()
                content_type = MIME_TYPES.get(ext, 'application/octet-stream')
                with open(file_path, 'rb') as f:
                    body = f.read()
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(body)))
                self.send_header('Cache-Control', 'public, max-age=60')
                self.end_headers()
                self.wfile.write(body)
            else:
                # Return friendly 404 page
                body = b'<!DOCTYPE html><html><head><meta charset="utf-8"><title>404 - S4 Ledger</title></head><body style="font-family:sans-serif;text-align:center;padding:80px;"><h1>404</h1><p>Page not found</p><p style="color:#999;font-size:0.8em;">Path: ' + safe_path.encode() + b' | Root: ' + PROJECT_ROOT.encode() + b'</p><a href="/">Go to S4 Ledger Home</a></body></html>'
                self.send_response(404)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
        except Exception as e:
            # Emergency fallback — never crash
            body = json.dumps({"error": str(e), "path": path, "project_root": PROJECT_ROOT}).encode()
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def do_POST(self):
        parsed = urlparse(self.path)
        route = self._route(parsed.path)
        data = self._read_body()

        if route == "anchor":
            now = datetime.now(timezone.utc)
            record_type = data.get("record_type", "JOINT_CONTRACT")
            cat = RECORD_CATEGORIES.get(record_type, {"label": record_type, "branch": "JOINT", "icon": "\U0001f4cb", "system": "N/A"})
            record = {
                "hash": data.get("hash", hashlib.sha256(str(now).encode()).hexdigest()),
                "record_type": record_type,
                "record_label": cat.get("label", record_type),
                "branch": cat.get("branch", "JOINT"),
                "icon": cat.get("icon", "\U0001f4cb"),
                "timestamp": now.isoformat(),
                "timestamp_display": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "fee": 0.01,
                "tx_hash": data.get("tx_hash", "TX" + hashlib.md5(str(now).encode()).hexdigest().upper()[:32]),
                "system": cat.get("system", "N/A"),
                "content_preview": data.get("content_preview", ""),
            }
            _live_records.append(record)
            self._send_json({"status": "anchored", "record": record})

        elif route == "hash":
            text = data.get("record", "")
            h = hashlib.sha256(text.encode()).hexdigest()
            self._send_json({"hash": h, "algorithm": "SHA-256"})

        elif route == "categorize":
            memo = data.get("memo", "").upper()
            for key in RECORD_CATEGORIES:
                if key in memo:
                    self._send_json({"category": key, "label": RECORD_CATEGORIES[key]["label"]})
                    return
            self._send_json({"category": "JOINT_CONTRACT", "label": "Contract Deliverable"})

        else:
            self._send_json({"error": "Not found", "path": self.path}, 404)
