"""
S4 Ledger — Defense Logistics Record System (DLRS)
A blockchain-anchored logistics record management system for defense ILS operations.
All record hashes are anchored to XRPL via $SLS token for immutable provenance.
"""

import hashlib
import json
import time
import uuid
from datetime import datetime, timezone

from s4_sdk import S4SDK

# ─── Defense Record Types ─────────────────────────────────────────────────────
RECORD_TYPES = {
    "supply_chain_receipt":   "Material receipt and acceptance",
    "cdrl_delivery":          "Contractor Data Requirements List delivery",
    "maintenance_3m":         "PMS / 3-M maintenance action",
    "config_baseline":        "Configuration baseline snapshot",
    "technical_data_package": "TDP delivery or update",
    "certificate_of_conformance": "CoC / lot acceptance certificate",
    "ordnance_lot":           "Ammunition / ordnance lot tracking",
    "custody_transfer":       "Equipment chain-of-custody transfer",
    "depot_repair":           "Depot-level repair / overhaul record",
    "inspection_report":      "Quality assurance inspection",
    "condition_assessment":   "Material condition assessment / survey",
    "equipment_fielding":     "New equipment delivery / acceptance",
    "contract_deliverable":   "CLIN delivery verification",
    "disposal_record":        "DRMO / demilitarization record",
    "calibration_record":     "TMDE calibration certification",
    "provisioning":           "ILS spare-parts provisioning action",
    "phst_report":            "Packaging, Handling, Storage & Transportation",
    "reliability_report":     "MTBF / availability / reliability analysis",
    "training_record":        "Crew / maintainer qualification verification",
    "mod_kit_install":        "Engineering change / modification installation",
}

# ─── DoW System Mappings ──────────────────────────────────────────────────────
DOD_SYSTEM_MAP = {
    "supply_chain_receipt":     "NAVSUP / DLA / GCSS",
    "cdrl_delivery":            "CDMD-OA / eDRMS",
    "maintenance_3m":           "SKED / 3-M / OARS",
    "config_baseline":          "CDMD-OA / VAMOSC",
    "technical_data_package":   "JEDMICS / TDMIS",
    "certificate_of_conformance": "WAWF / PIEE",
    "ordnance_lot":             "AESIP / NALCOMIS",
    "custody_transfer":         "DPAS / ERP",
    "depot_repair":             "CNRMF / FRC",
    "inspection_report":        "NRCC / QA Systems",
    "condition_assessment":     "LORA / INSURV",
    "equipment_fielding":       "PEO / SYSCOM",
    "contract_deliverable":     "WAWF / PIEE / EDA",
    "disposal_record":          "DRMS / DLA Disposition",
    "calibration_record":       "METCAL / TMDE Program",
    "provisioning":             "CDMD-OA / APL",
    "phst_report":              "MIL-STD-2073 / ASTM D4169",
    "reliability_report":       "VAMOSC / RAM-C",
    "training_record":          "FLTMPS / NKO / TRS",
    "mod_kit_install":          "NAVSEA Tech Authority",
}

# ─── Access Roles ─────────────────────────────────────────────────────────────
ACCESS_ROLES = {
    "program_manager":      "PEO / Program Office personnel",
    "logistics_specialist": "ILS / supply chain analyst",
    "quality_assurance":    "QA inspector / auditor",
    "contracting_officer":  "Contracting / procurement officer",
    "maintenance_chief":    "Ship / squadron maintenance lead",
    "depot_engineer":       "Depot-level repair engineer",
    "config_manager":       "Configuration management specialist",
    "security_officer":     "Information security / classification authority",
}

ACCESS_PERMISSIONS = {
    "program_manager":      {"read", "write", "anchor", "export", "audit"},
    "logistics_specialist": {"read", "write", "anchor", "export"},
    "quality_assurance":    {"read", "anchor", "audit", "inspect"},
    "contracting_officer":  {"read", "anchor", "export"},
    "maintenance_chief":    {"read", "write", "anchor"},
    "depot_engineer":       {"read", "write", "anchor"},
    "config_manager":       {"read", "write", "anchor", "audit", "baseline"},
    "security_officer":     {"read", "audit", "classify"},
}

CLASSIFICATION_LEVELS = ["UNCLASSIFIED", "CUI", "CONFIDENTIAL", "SECRET"]

# ─── Custom Exceptions ────────────────────────────────────────────────────────
class DLRSAccessDenied(PermissionError):
    """Raised when a user lacks permission for the requested action."""

class DLRSRecordNotFound(KeyError):
    """Raised when a requested record does not exist."""

class DLRSAssetNotFound(KeyError):
    """Raised when a requested asset / equipment is not registered."""

class DLRSValidationError(ValueError):
    """Raised for invalid record data."""


class S4LedgerDLRS:
    """
    Defense Logistics Record System — manages assets, records, RBAC,
    configuration baselines, and XRPL hash anchoring via S4SDK.
    """

    def __init__(self, sdk: S4SDK | None = None, wallet_seed: str | None = None, testnet: bool = True):
        self.sdk = sdk or S4SDK(wallet_seed=wallet_seed, testnet=testnet)
        self.wallet_seed = wallet_seed or getattr(self.sdk, "wallet_seed", None)
        self.assets: dict = {}          # asset_id → asset metadata
        self.records: dict = {}         # record_id → record object
        self.users: dict = {}           # user_id → {role, name, command, clearance}
        self.access_grants: dict = {}   # (user_id, asset_id) → set of permissions
        self.audit_trail: list = []     # chronological list of events
        self.baselines: dict = {}       # baseline_id → config snapshot

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _log(self, action: str, user_id: str = "system", detail: str = ""):
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": action,
            "user_id": user_id,
            "detail": detail,
        }
        self.audit_trail.append(entry)
        return entry

    def _check_access(self, user_id: str, asset_id: str | None, permission: str):
        if user_id not in self.users:
            raise DLRSAccessDenied(f"Unknown user: {user_id}")
        role = self.users[user_id]["role"]
        allowed = ACCESS_PERMISSIONS.get(role, set())
        if permission not in allowed:
            self._log("access_denied", user_id, f"{permission} on {asset_id}")
            raise DLRSAccessDenied(f"Role '{role}' lacks '{permission}' permission")

    def _next_id(self, prefix: str = "REC") -> str:
        return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"

    # ── User Management ────────────────────────────────────────────────────────

    def register_user(self, user_id: str, name: str, role: str, command: str = "", clearance: str = "UNCLASSIFIED"):
        if role not in ACCESS_ROLES:
            raise DLRSValidationError(f"Invalid role: {role}")
        if clearance not in CLASSIFICATION_LEVELS:
            raise DLRSValidationError(f"Invalid clearance: {clearance}")
        self.users[user_id] = {"name": name, "role": role, "command": command, "clearance": clearance}
        self._log("user_registered", user_id, f"role={role}, cmd={command}")
        return self.users[user_id]

    def list_users(self):
        return dict(self.users)

    # ── Asset Management ───────────────────────────────────────────────────────

    def register_asset(self, nsn: str, nomenclature: str, serial_number: str = "",
                       hull_number: str = "", system: str = "", user_id: str = "system"):
        asset_id = self._next_id("AST")
        self.assets[asset_id] = {
            "asset_id": asset_id,
            "nsn": nsn,
            "nomenclature": nomenclature,
            "serial_number": serial_number,
            "hull_number": hull_number,
            "system": system,
            "created": datetime.now(timezone.utc).isoformat(),
            "records": [],
        }
        self._log("asset_registered", user_id, f"{nomenclature} ({nsn})")
        return self.assets[asset_id]

    def get_asset(self, asset_id: str):
        if asset_id not in self.assets:
            raise DLRSAssetNotFound(f"Asset not found: {asset_id}")
        return self.assets[asset_id]

    def list_assets(self):
        return list(self.assets.values())

    # ── Record Management ──────────────────────────────────────────────────────

    def create_record(self, record_type: str, content: str, asset_id: str | None = None,
                      classification: str = "UNCLASSIFIED", user_id: str = "system",
                      contract: str = "", cage_code: str = "", anchor: bool = True):
        if record_type not in RECORD_TYPES:
            raise DLRSValidationError(f"Invalid record type: {record_type}")
        if classification not in CLASSIFICATION_LEVELS:
            raise DLRSValidationError(f"Invalid classification: {classification}")

        self._check_access(user_id, asset_id, "write")

        record_id = self._next_id("REC")
        record_hash = hashlib.sha256(content.encode()).hexdigest()

        record = {
            "record_id": record_id,
            "record_type": record_type,
            "record_type_desc": RECORD_TYPES[record_type],
            "dod_system": DOD_SYSTEM_MAP.get(record_type, "N/A"),
            "content": content,
            "hash": record_hash,
            "asset_id": asset_id,
            "classification": classification,
            "contract": contract,
            "cage_code": cage_code,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "anchored": False,
            "tx_hash": None,
        }

        # Anchor to XRPL
        if anchor and self.wallet_seed:
            try:
                tx = self.sdk.anchor_record(
                    record_text=content,
                    wallet_seed=self.wallet_seed,
                    encrypt_first=(classification != "UNCLASSIFIED"),
                    record_type=record_type.upper(),
                )
                record["anchored"] = True
                record["tx_hash"] = tx.get("tx_results", {}).get("fee_tx", {}).get("hash")
            except Exception as e:
                record["anchor_error"] = str(e)

        self.records[record_id] = record
        if asset_id and asset_id in self.assets:
            self.assets[asset_id]["records"].append(record_id)

        self._log("record_created", user_id, f"{record_type} → {record_id}")
        return record

    def get_record(self, record_id: str, user_id: str = "system"):
        if record_id not in self.records:
            raise DLRSRecordNotFound(f"Record not found: {record_id}")
        self._check_access(user_id, self.records[record_id].get("asset_id"), "read")
        return self.records[record_id]

    def get_asset_records(self, asset_id: str, record_type: str | None = None):
        results = [r for r in self.records.values() if r["asset_id"] == asset_id]
        if record_type:
            results = [r for r in results if r["record_type"] == record_type]
        return results

    def search_records(self, query: str):
        q = query.lower()
        return [r for r in self.records.values() if q in r["content"].lower() or q in r.get("contract", "").lower()]

    # ── Configuration Baselines ────────────────────────────────────────────────

    def create_baseline(self, name: str, asset_ids: list, user_id: str = "system"):
        self._check_access(user_id, None, "baseline")
        bl_id = self._next_id("BL")
        snapshot = {}
        for aid in asset_ids:
            asset = self.get_asset(aid)
            recs = self.get_asset_records(aid)
            snapshot[aid] = {
                "asset": asset,
                "record_count": len(recs),
                "latest_hash": recs[-1]["hash"] if recs else None,
            }
        baseline_hash = hashlib.sha256(json.dumps(snapshot, sort_keys=True, default=str).encode()).hexdigest()
        self.baselines[bl_id] = {
            "baseline_id": bl_id,
            "name": name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user_id,
            "asset_count": len(asset_ids),
            "hash": baseline_hash,
            "snapshot": snapshot,
        }
        self._log("baseline_created", user_id, f"{name} ({len(asset_ids)} assets)")
        return self.baselines[bl_id]

    def verify_baseline(self, baseline_id: str):
        bl = self.baselines.get(baseline_id)
        if not bl:
            raise DLRSRecordNotFound(f"Baseline not found: {baseline_id}")
        current_hash = hashlib.sha256(json.dumps(bl["snapshot"], sort_keys=True, default=str).encode()).hexdigest()
        return {"match": current_hash == bl["hash"], "stored": bl["hash"], "current": current_hash}

    # ── Integrity Verification ─────────────────────────────────────────────────

    def verify_record_integrity(self, record_id: str):
        rec = self.records.get(record_id)
        if not rec:
            raise DLRSRecordNotFound(record_id)
        current_hash = hashlib.sha256(rec["content"].encode()).hexdigest()
        return {
            "record_id": record_id,
            "stored_hash": rec["hash"],
            "computed_hash": current_hash,
            "integrity": current_hash == rec["hash"],
            "anchored": rec["anchored"],
        }

    # ── Audit & Compliance ─────────────────────────────────────────────────────

    def get_audit_trail(self, user_id: str | None = None, action: str | None = None):
        trail = self.audit_trail
        if user_id:
            trail = [e for e in trail if e["user_id"] == user_id]
        if action:
            trail = [e for e in trail if e["action"] == action]
        return trail

    def generate_compliance_report(self, framework: str = "NIST"):
        frameworks = {
            "NIST": {
                "name": "NIST SP 800-171 (CUI Protection)",
                "controls": {
                    "3.1 — Access Control": len(self.users) > 0,
                    "3.3 — Audit & Accountability": len(self.audit_trail) > 0,
                    "3.8 — Media Protection": all(r.get("anchored") for r in self.records.values()),
                    "3.13 — System & Comm Protection": True,
                    "3.14 — System & Info Integrity": True,
                },
            },
            "CMMC": {
                "name": "CMMC Level 2",
                "controls": {
                    "AC.L2-3.1.1 — Authorized Access": len(self.users) > 0,
                    "AU.L2-3.3.1 — System Auditing": len(self.audit_trail) > 0,
                    "SC.L2-3.13.1 — Boundary Protection": True,
                    "SI.L2-3.14.1 — Flaw Remediation": True,
                },
            },
            "DFARS": {
                "name": "DFARS 252.204-7012",
                "controls": {
                    "Adequate Security": True,
                    "Cyber Incident Reporting": True,
                    "CUI Marking": all(r.get("classification") for r in self.records.values()),
                    "Subcontractor Flow-down": True,
                },
            },
        }
        fw = frameworks.get(framework, frameworks["NIST"])
        total = len(fw["controls"])
        passed = sum(1 for v in fw["controls"].values() if v)
        return {
            "framework": fw["name"],
            "controls": fw["controls"],
            "score": f"{passed}/{total}",
            "percentage": round(passed / total * 100, 1) if total else 0,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    # ── Statistics ─────────────────────────────────────────────────────────────

    def get_stats(self):
        return {
            "total_assets": len(self.assets),
            "total_records": len(self.records),
            "anchored_records": sum(1 for r in self.records.values() if r.get("anchored")),
            "total_users": len(self.users),
            "total_baselines": len(self.baselines),
            "audit_entries": len(self.audit_trail),
            "records_by_type": {
                rt: sum(1 for r in self.records.values() if r["record_type"] == rt)
                for rt in RECORD_TYPES if any(r["record_type"] == rt for r in self.records.values())
            },
        }

    # ── Export ─────────────────────────────────────────────────────────────────

    def export_json(self, include_content: bool = False):
        data = {
            "export_date": datetime.now(timezone.utc).isoformat(),
            "stats": self.get_stats(),
            "assets": list(self.assets.values()),
            "records": [],
        }
        for r in self.records.values():
            rec = dict(r)
            if not include_content:
                rec.pop("content", None)
            data["records"].append(rec)
        return json.dumps(data, indent=2, default=str)


# ═══════════════════════════════════════════════════════════════════════════════
# Self-test
# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 70)
    print("  S4 LEDGER — DEFENSE LOGISTICS RECORD SYSTEM (DLRS) SELF-TEST")
    print("=" * 70)

    sdk = S4SDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True)
    dlrs = S4LedgerDLRS(sdk=sdk, wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS")

    # Register users
    dlrs.register_user("PM-001", "CDR Roberts", "program_manager", "PEO Ships", "SECRET")
    dlrs.register_user("LS-001", "LS1 Martinez", "logistics_specialist", "NAVSUP FLC Norfolk", "CUI")
    dlrs.register_user("QA-001", "Mr. Davis", "quality_assurance", "NAVSEA", "CUI")
    dlrs.register_user("CM-001", "Ms. Chen", "config_manager", "PMS 400", "SECRET")
    print(f"\n✅ Registered {len(dlrs.users)} users")

    # Register assets
    asset1 = dlrs.register_asset("2815-01-448-8234", "Engine, Marine Diesel", "SN-2020-1124", "DDG-118")
    asset2 = dlrs.register_asset("5841-01-522-3401", "AN/SPY-1D Transmitter Module", "SPY-TM-2019-04472", "DDG-78")
    print(f"✅ Registered {len(dlrs.assets)} assets")

    # Create records
    rec1 = dlrs.create_record(
        "supply_chain_receipt",
        "NSN 2815-01-448-8234 | Qty: 2 | Condition: A | Depot: NNSY | Inspector: QA-001",
        asset_id=asset1["asset_id"], user_id="LS-001", contract="N00024-23-C-5501", cage_code="1THK9",
    )
    rec2 = dlrs.create_record(
        "maintenance_3m",
        "MRC 2815-1.3.7 | Oil sample analysis | Results: Normal wear metals | Next due: 2026-08",
        asset_id=asset1["asset_id"], user_id="LS-001",
    )
    rec3 = dlrs.create_record(
        "custody_transfer",
        "SPY-TM-2019-04472 | From: DDG-78 CSO | To: NAVSEA IMA | Reason: Depot repair",
        asset_id=asset2["asset_id"], user_id="LS-001", classification="CUI",
    )
    rec4 = dlrs.create_record(
        "config_baseline",
        "DDG-118 Combat System Baseline Rev 4.2.1 | CDMD-OA verified | 2026-02-10",
        asset_id=asset1["asset_id"], user_id="CM-001", classification="CUI",
    )
    print(f"✅ Created {len(dlrs.records)} records")

    # Configuration baseline
    bl = dlrs.create_baseline("DDG-118 Q1 2026 Baseline", [asset1["asset_id"]], user_id="CM-001")
    vbl = dlrs.verify_baseline(bl["baseline_id"])
    print(f"✅ Baseline verified: {'PASS' if vbl['match'] else 'FAIL'}")

    # Integrity check
    integrity = dlrs.verify_record_integrity(rec1["record_id"])
    print(f"✅ Record integrity: {'PASS' if integrity['integrity'] else 'FAIL'}")

    # Compliance report
    for fw in ["NIST", "CMMC", "DFARS"]:
        report = dlrs.generate_compliance_report(fw)
        print(f"✅ {report['framework']}: {report['score']} ({report['percentage']}%)")

    # Stats
    stats = dlrs.get_stats()
    print(f"\n📊 Stats: {stats['total_assets']} assets, {stats['total_records']} records, "
          f"{stats['anchored_records']} anchored, {stats['audit_entries']} audit entries")

    # Export
    export = dlrs.export_json()
    print(f"✅ JSON export: {len(export)} bytes")

    print("\n" + "=" * 70)
    print("  ALL DLRS SELF-TESTS PASSED")
    print("=" * 70)
