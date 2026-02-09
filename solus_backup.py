"""
solus_backup.py — Encrypted Backup & Recovery Module for Solus Protocol

Provides:
  • SolusBackup — Export/import encrypted .solusbackup files
  • XRPL-based recovery — Re-verify record integrity from the ledger
  • QR code generation for wallet seed backup (mock in prototype)

Architecture:
  Export: records + tx hashes + metadata → encrypt → .solusbackup file
  Import: .solusbackup → decrypt → verify hashes against XRPL → restore

  Device loss recovery:
    1. Install app on new device
    2. Import seed + .solusbackup (or scan QR)
    3. App re-fetches every anchored hash from XRPL
    4. Decrypts locally and re-populates cache
    5. Even without backup, EHR data + XRPL hashes prove integrity

Author: Solus Protocol Team
License: Apache-2.0
"""

import hashlib
import json
import time
import uuid
import os
from datetime import datetime

try:
    from cryptography.fernet import Fernet
except ImportError:
    Fernet = None

from solus_sdk import SolusSDK

# ═══════════════════════════════════════════════════════════════════════════════
# MOCK / PROTOTYPE CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

MOCK_CLOUD_BACKUP_URL = "https://backup.solusprotocol.com/v1/store"    # → real: S3/GCS encrypted bucket
MOCK_CLOUD_API_KEY = "MOCK_BACKUP_API_KEY_replace_in_production"       # → real: cloud credential
MOCK_XRPL_EXPLORER_URL = "https://testnet.xrpl.org/transactions/"     # Real — works now

PROTOTYPE_MODE = True


def _timestamp():
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


# ═══════════════════════════════════════════════════════════════════════════════
# SOLUS PROTOCOL BACKUP — Encrypted Export/Import
# ═══════════════════════════════════════════════════════════════════════════════

class SolusBackup:
    """
    Encrypted backup and recovery system for patient health wallets.

    The .solusbackup file contains:
      • All record plaintext (encrypted at rest with patient's key)
      • All XRPL transaction hashes for verification
      • Record metadata (type, timestamp, provider, etc.)
      • Wallet configuration (NOT the seed — that's stored separately)

    The seed is backed up separately via:
      • 12/24-word mnemonic (written down)
      • Encrypted QR code (scanned to new device)
      • Optional cloud key escrow (patient-controlled)
    """

    BACKUP_VERSION = "1.0.0"
    BACKUP_MAGIC = "SOLUS_BACKUP_V1"

    def __init__(self, sdk: SolusSDK):
        self.sdk = sdk
        if not self.sdk.cipher:
            raise RuntimeError("Encryption required for backup. Provide encryption_key or wallet_seed to SolusSDK.")

    def export_backup(
        self,
        records: list,
        output_path: str = None,
        include_plaintext: bool = True,
        wallet_address: str = None,
        extra_metadata: dict = None
    ) -> dict:
        """
        Export all records to an encrypted .solusbackup file.

        Args:
            records:            List of record dicts, each with at minimum:
                                {content, record_type, tx_hash, timestamp}
            output_path:        File path for the .solusbackup file
            include_plaintext:  If True, include encrypted record content for full recovery
            wallet_address:     XRPL wallet address (NOT the seed)
            extra_metadata:     Any additional metadata to include

        Returns:
            dict with file path, record count, file size, backup hash
        """
        if not output_path:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            output_path = f"solus_backup_{timestamp}.solusbackup"

        # Build backup manifest
        manifest = {
            "magic": self.BACKUP_MAGIC,
            "version": self.BACKUP_VERSION,
            "created": _timestamp(),
            "wallet_address": wallet_address or "not_specified",
            "record_count": len(records),
            "record_types": list(set(r.get("record_type", "unknown") for r in records)),
            "extra": extra_metadata or {}
        }

        # Build record entries
        backup_records = []
        for r in records:
            entry = {
                "record_type": r.get("record_type", "unknown"),
                "tx_hash": r.get("tx_hash", "not_anchored"),
                "record_hash": _hash(r.get("content", "")),
                "timestamp": r.get("timestamp", _timestamp()),
                "provider": r.get("provider", "unknown"),
                "metadata": r.get("metadata", {})
            }
            if include_plaintext:
                entry["content"] = r.get("content", "")
            backup_records.append(entry)

        # Combine into backup payload
        backup_payload = {
            "manifest": manifest,
            "records": backup_records,
            "integrity_hash": _hash(json.dumps(backup_records, sort_keys=True))
        }

        # Encrypt entire payload
        plaintext_json = json.dumps(backup_payload, indent=2)
        encrypted = self.sdk.encrypt_data(plaintext_json)

        # Write to file
        backup_file_content = json.dumps({
            "magic": self.BACKUP_MAGIC,
            "version": self.BACKUP_VERSION,
            "encrypted_payload": encrypted,
            "created": manifest["created"],
            "record_count": len(records)
        }, indent=2)

        with open(output_path, "w") as f:
            f.write(backup_file_content)

        file_size = os.path.getsize(output_path)
        backup_hash = _hash(encrypted)

        print(f"  ✓ Backup exported: {output_path}")
        print(f"  ✓ Records: {len(records)} | Size: {file_size:,} bytes")
        print(f"  ✓ Encrypted with patient's Fernet key")
        print(f"  ✓ Backup hash: {backup_hash[:16]}...")

        return {
            "file_path": output_path,
            "record_count": len(records),
            "file_size": file_size,
            "backup_hash": backup_hash,
            "record_types": manifest["record_types"],
            "created": manifest["created"]
        }

    def import_backup(self, backup_path: str) -> dict:
        """
        Import and decrypt a .solusbackup file.

        Args:
            backup_path:  Path to the .solusbackup file

        Returns:
            dict with manifest, records list, and integrity verification
        """
        if not os.path.exists(backup_path):
            raise FileNotFoundError(f"Backup file not found: {backup_path}")

        with open(backup_path, "r") as f:
            backup_file = json.loads(f.read())

        # Verify magic
        if backup_file.get("magic") != self.BACKUP_MAGIC:
            raise ValueError("Invalid backup file — magic header mismatch")

        # Decrypt
        encrypted_payload = backup_file["encrypted_payload"]
        decrypted_json = self.sdk.decrypt_data(encrypted_payload)
        backup_data = json.loads(decrypted_json)

        # Verify integrity
        records = backup_data["records"]
        recalculated_hash = _hash(json.dumps(records, sort_keys=True))
        integrity_valid = recalculated_hash == backup_data["integrity_hash"]

        print(f"  ✓ Backup imported: {backup_path}")
        print(f"  ✓ Records: {len(records)}")
        print(f"  ✓ Integrity: {'VALID ✓' if integrity_valid else 'CORRUPTED ✗'}")
        print(f"  ✓ Created: {backup_data['manifest']['created']}")

        return {
            "manifest": backup_data["manifest"],
            "records": records,
            "integrity_valid": integrity_valid,
            "record_count": len(records)
        }

    def verify_against_xrpl(self, records: list, sdk: SolusSDK = None) -> dict:
        """
        Verify imported records against XRPL transaction hashes.

        In production, this queries the XRPL for each tx_hash and verifies
        the memo data matches the record hash. In prototype mode, it simulates
        the verification.

        Args:
            records:  List of record dicts from import_backup
            sdk:      SolusSDK instance (uses self.sdk if not provided)

        Returns:
            dict with verification results per record
        """
        sdk = sdk or self.sdk
        results = []

        for r in records:
            tx_hash = r.get("tx_hash", "not_anchored")
            record_hash = r.get("record_hash", "")

            if tx_hash == "not_anchored":
                results.append({
                    "record_type": r["record_type"],
                    "status": "not_anchored",
                    "verified": False
                })
                continue

            if PROTOTYPE_MODE:
                # Simulate XRPL verification
                print(f"  [MOCK XRPL] Verifying TX: {tx_hash[:20]}...")
                verified = True  # In prototype, assume all valid
                results.append({
                    "record_type": r["record_type"],
                    "tx_hash": tx_hash,
                    "record_hash": record_hash[:16] + "...",
                    "xrpl_url": f"{MOCK_XRPL_EXPLORER_URL}{tx_hash}",
                    "status": "verified",
                    "verified": verified,
                    "mock": True
                })
            else:
                # Real XRPL verification
                try:
                    from xrpl.models.requests import Tx
                    response = sdk.client.request(Tx(transaction=tx_hash))
                    tx_data = response.result
                    # Extract memo and compare hash
                    memos = tx_data.get("Memos", [])
                    memo_data = ""
                    if memos:
                        memo_hex = memos[0].get("Memo", {}).get("MemoData", "")
                        memo_data = bytes.fromhex(memo_hex).decode("utf-8", errors="ignore")

                    hash_in_memo = record_hash in memo_data
                    results.append({
                        "record_type": r["record_type"],
                        "tx_hash": tx_hash,
                        "record_hash": record_hash[:16] + "...",
                        "memo_contains_hash": hash_in_memo,
                        "status": "verified" if hash_in_memo else "mismatch",
                        "verified": hash_in_memo
                    })
                except Exception as e:
                    results.append({
                        "record_type": r["record_type"],
                        "tx_hash": tx_hash,
                        "status": "error",
                        "error": str(e),
                        "verified": False
                    })

        verified_count = sum(1 for r in results if r["verified"])
        total = len(results)

        print(f"\n  ✓ XRPL Verification: {verified_count}/{total} records verified")

        return {
            "total": total,
            "verified": verified_count,
            "failed": total - verified_count,
            "results": results
        }

    def generate_seed_qr(self, wallet_seed: str, output_path: str = None) -> dict:
        """
        Generate an encrypted QR code for wallet seed backup.

        In production, uses the qrcode library to create a physical QR.
        In prototype mode, returns a mock representation.

        The QR contains the encrypted seed — the patient's backup passphrase
        is required to decrypt it.
        """
        encrypted_seed = self.sdk.encrypt_data(wallet_seed)
        seed_hash = _hash(wallet_seed)

        if PROTOTYPE_MODE:
            print(f"  [MOCK QR] Would generate QR code for seed backup")
            print(f"  [MOCK QR] Seed hash: {seed_hash[:16]}...")
            print(f"  [MOCK QR] Encrypted seed length: {len(encrypted_seed)} chars")
            return {
                "qr_data": encrypted_seed[:50] + "...",
                "seed_hash": seed_hash,
                "output_path": output_path or "seed_qr.png",
                "mock": True
            }
        else:
            try:
                import qrcode
                qr = qrcode.QRCode(version=1, box_size=10, border=4)
                qr.add_data(encrypted_seed)
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")
                path = output_path or "seed_qr.png"
                img.save(path)
                return {
                    "qr_data": encrypted_seed[:50] + "...",
                    "seed_hash": seed_hash,
                    "output_path": path,
                    "mock": False
                }
            except ImportError:
                print("  ⚠ qrcode library not installed. Run: pip install qrcode[pil]")
                return {"error": "qrcode library required", "seed_hash": seed_hash}

    def cloud_backup(self, backup_path: str, patient_id: str) -> dict:
        """
        Upload encrypted backup to cloud storage (patient-controlled).

        In production, uses pre-signed S3 URLs or GCS signed URLs so the
        backup goes directly to the patient's controlled bucket — Solus Protocol
        never has access to the plaintext.
        """
        if not os.path.exists(backup_path):
            raise FileNotFoundError(f"Backup file not found: {backup_path}")

        file_size = os.path.getsize(backup_path)

        if PROTOTYPE_MODE:
            print(f"  [MOCK CLOUD] → Uploading to {MOCK_CLOUD_BACKUP_URL}")
            print(f"  [MOCK CLOUD]   Patient: {patient_id}")
            print(f"  [MOCK CLOUD]   Size: {file_size:,} bytes")
            print(f"  [MOCK CLOUD]   Encryption: AES-256 (patient key only)")
            return {
                "uploaded": True,
                "cloud_url": f"{MOCK_CLOUD_BACKUP_URL}/{patient_id}/{os.path.basename(backup_path)}",
                "file_size": file_size,
                "mock": True
            }
        else:
            import requests
            headers = {"Authorization": f"Bearer {MOCK_CLOUD_API_KEY}", "X-Patient-ID": patient_id}
            with open(backup_path, "rb") as f:
                r = requests.post(MOCK_CLOUD_BACKUP_URL, files={"backup": f}, headers=headers)
            return {"uploaded": r.status_code == 200, "response": r.json()}


# ═══════════════════════════════════════════════════════════════════════════════
# DEMO / USAGE EXAMPLE
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print(" SOLUS PROTOCOL BACKUP & RECOVERY — Prototype Demo")
    print("=" * 70)

    # Initialize
    sdk = SolusSDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True, api_key="valid_mock_key")
    backup = SolusBackup(sdk)

    # Sample records (what the patient's device would have cached)
    sample_records = [
        {
            "content": "Patient: Sarah Chen | DOB: 1985-03-15\nHeart Rate: 72 bpm | BP: 118/76 mmHg\nSpO2: 98% | Temp: 98.4°F",
            "record_type": "vitals",
            "tx_hash": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2",
            "timestamp": _timestamp(),
            "provider": "Dr. Patel"
        },
        {
            "content": "Lab Report — CBC\nWBC: 6.2 K/uL | RBC: 4.8 M/uL\nHemoglobin: 14.2 g/dL | Platelets: 250 K/uL",
            "record_type": "lab_result",
            "tx_hash": "B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3",
            "timestamp": _timestamp(),
            "provider": "LabCorp"
        },
        {
            "content": "Prescription: Lisinopril 10mg\nDirections: Take one tablet daily\nQuantity: 30 | Refills: 3",
            "record_type": "prescription",
            "tx_hash": "C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
            "timestamp": _timestamp(),
            "provider": "Dr. Wilson"
        },
        {
            "content": "Cardiac catheterization — normal coronary arteries. EF 60%. No intervention required.",
            "record_type": "cardiology",
            "tx_hash": "D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5",
            "timestamp": _timestamp(),
            "provider": "Dr. Rivera"
        }
    ]

    # ── 1. Export Backup ──
    print("\n" + "─" * 50)
    print(" 1. EXPORT ENCRYPTED BACKUP")
    print("─" * 50)
    export_result = backup.export_backup(
        records=sample_records,
        output_path="test_backup.solusbackup",
        wallet_address="rPatientWalletAddress12345"
    )

    # ── 2. Import Backup (simulating new device) ──
    print("\n" + "─" * 50)
    print(" 2. IMPORT BACKUP ON NEW DEVICE")
    print("─" * 50)
    imported = backup.import_backup("test_backup.solusbackup")
    print(f"  Record types recovered: {imported['manifest']['record_types']}")

    # ── 3. Verify Against XRPL ──
    print("\n" + "─" * 50)
    print(" 3. VERIFY RECORDS AGAINST XRPL")
    print("─" * 50)
    verification = backup.verify_against_xrpl(imported["records"])

    # ── 4. Seed QR Backup ──
    print("\n" + "─" * 50)
    print(" 4. WALLET SEED QR BACKUP")
    print("─" * 50)
    qr = backup.generate_seed_qr("sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS")

    # ── 5. Cloud Backup ──
    print("\n" + "─" * 50)
    print(" 5. CLOUD BACKUP (Patient-Controlled)")
    print("─" * 50)
    cloud = backup.cloud_backup("test_backup.solusbackup", patient_id="PT-44521")

    # Cleanup test file
    if os.path.exists("test_backup.solusbackup"):
        os.remove("test_backup.solusbackup")
        print("\n  ✓ Test backup file cleaned up")

    print("\n" + "=" * 70)
    print(" BACKUP & RECOVERY DEMO COMPLETE")
    print(" In production: .solusbackup files are the patient's portable proof")
    print(" Even without backups, XRPL hashes + EHR data = verifiable history")
    print("=" * 70)
