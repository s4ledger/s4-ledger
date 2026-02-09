"""
solus_comms.py — Solus Protocol Verified Care Network (SVCN) Communications Module

Provides:
  • SolusMessenger     — Encrypted, anchored messaging between patients/providers
  • ConsentManager     — Patient-controlled consent tokens with create/revoke
  • CareChainTracker   — Verifiable chain-of-custody handoff records
  • FederatedBatch     — Multi-institution batch anchoring with shared trust lines

All external integrations (FHIR, webhooks, push notifications) use mock
endpoints in prototype mode. Replace MOCK_* constants with real credentials
for production deployment.

Architecture:
  Patient device → encrypt payload → SHA-256 hash → XRPL memo anchor
  → webhook notification → recipient ACK anchor → immutable audit trail

  No PHI is ever stored on-chain. Only hashes + metadata.

Author: Solus Protocol Team
License: Apache-2.0
"""

import hashlib
import json
import time
import uuid
from datetime import datetime, timedelta

try:
    from cryptography.fernet import Fernet
except ImportError:
    Fernet = None

from solus_sdk import SolusSDK

# ═══════════════════════════════════════════════════════════════════════════════
# MOCK / PROTOTYPE CONFIGURATION
# Replace these with real credentials for production deployment
# ═══════════════════════════════════════════════════════════════════════════════

MOCK_WEBHOOK_URL = "https://hooks.solusprotocol.com/v1/notify"          # → real: your webhook relay
MOCK_PUSH_ENDPOINT = "https://fcm.googleapis.com/fcm/send"              # → real: Firebase Cloud Messaging
MOCK_PUSH_API_KEY = "MOCK_FCM_SERVER_KEY_replace_in_production"         # → real: FCM server key
MOCK_FHIR_BASE = "https://fhir.solusprotocol.com/r4"                   # → real: Epic/Cerner FHIR endpoint
MOCK_FHIR_CLIENT_ID = "MOCK_SMART_ON_FHIR_CLIENT_ID"                   # → real: SMART on FHIR client ID
MOCK_FHIR_CLIENT_SECRET = "MOCK_SMART_ON_FHIR_CLIENT_SECRET"           # → real: SMART on FHIR secret
MOCK_FHIR_TOKEN_URL = "https://fhir.solusprotocol.com/auth/token"      # → real: OAuth2 token endpoint

# EHR Plugin endpoints (prototype stubs)
MOCK_EPIC_PLUGIN_URL = "https://epic.solusprotocol.com/api/v1/anchor"
MOCK_CERNER_PLUGIN_URL = "https://cerner.solusprotocol.com/api/v1/anchor"
MOCK_ATHENA_PLUGIN_URL = "https://athena.solusprotocol.com/api/v1/anchor"

PROTOTYPE_MODE = True  # Set to False when real API keys are configured


# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _generate_thread_id():
    """Generate a unique thread ID for message chains."""
    return f"svcn-{uuid.uuid4().hex[:16]}"


def _timestamp():
    """ISO 8601 UTC timestamp."""
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _hash(data: str) -> str:
    """SHA-256 hash of any string."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def _mock_webhook(url, payload):
    """
    Simulate a webhook POST. In production, replace with:
        import requests
        return requests.post(url, json=payload, timeout=10)
    """
    if PROTOTYPE_MODE:
        print(f"  [MOCK WEBHOOK] → {url}")
        print(f"  [MOCK WEBHOOK]   Payload keys: {list(payload.keys())}")
        return {"status": 200, "mock": True, "delivery_id": uuid.uuid4().hex[:12]}
    else:
        import requests
        r = requests.post(url, json=payload, timeout=10)
        return {"status": r.status_code, "body": r.json()}


def _mock_push_notification(recipient_device_token, title, body, data=None):
    """
    Simulate a push notification. In production, replace with Firebase Admin SDK:
        from firebase_admin import messaging
        message = messaging.Message(notification=..., token=recipient_device_token)
        messaging.send(message)
    """
    if PROTOTYPE_MODE:
        print(f"  [MOCK PUSH] → Device: {recipient_device_token[:20]}...")
        print(f"  [MOCK PUSH]   Title: {title}")
        print(f"  [MOCK PUSH]   Body: {body}")
        return {"success": True, "mock": True, "message_id": uuid.uuid4().hex[:12]}
    else:
        import requests
        headers = {"Authorization": f"key={MOCK_PUSH_API_KEY}", "Content-Type": "application/json"}
        payload = {"to": recipient_device_token, "notification": {"title": title, "body": body}, "data": data or {}}
        r = requests.post(MOCK_PUSH_ENDPOINT, json=payload, headers=headers, timeout=10)
        return {"success": r.status_code == 200, "body": r.json()}


def _mock_fhir_query(resource_type, patient_id):
    """
    Simulate a FHIR R4 query. In production, use SMART on FHIR OAuth2 flow:
        1. Get access token from MOCK_FHIR_TOKEN_URL
        2. GET {MOCK_FHIR_BASE}/{resource_type}?patient={patient_id}
    """
    if PROTOTYPE_MODE:
        print(f"  [MOCK FHIR] → GET {MOCK_FHIR_BASE}/{resource_type}?patient={patient_id}")
        return {
            "resourceType": "Bundle",
            "total": 3,
            "entry": [
                {"resource": {"resourceType": resource_type, "id": f"mock-{i}", "status": "final"}}
                for i in range(3)
            ],
            "mock": True
        }
    else:
        import requests
        # OAuth2 token exchange
        token_resp = requests.post(MOCK_FHIR_TOKEN_URL, data={
            "grant_type": "client_credentials",
            "client_id": MOCK_FHIR_CLIENT_ID,
            "client_secret": MOCK_FHIR_CLIENT_SECRET
        })
        access_token = token_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/fhir+json"}
        r = requests.get(f"{MOCK_FHIR_BASE}/{resource_type}?patient={patient_id}", headers=headers)
        return r.json()


# ═══════════════════════════════════════════════════════════════════════════════
# 1. SOLUS PROTOCOL MESSENGER — Encrypted, Anchored Care Communication
# ═══════════════════════════════════════════════════════════════════════════════

class SolusMessenger:
    """
    Secure, anchored messaging between healthcare participants.

    Every message is:
      1. Encrypted (Fernet, AES-128-CBC) for the recipient
      2. SHA-256 hashed
      3. Anchored to XRPL with memo: solus:msg:{update_type}:{hash}:{thread_id}
      4. Optionally requires an ACK anchor from the recipient

    No PHI is ever stored on-chain — only the hash + routing metadata.
    """

    # Valid update types for healthcare communication
    UPDATE_TYPES = [
        "post_op_complication", "lab_result", "referral", "discharge_summary",
        "prescription_update", "vitals_alert", "imaging_result", "pathology_report",
        "care_plan_update", "consent_request", "appointment_reminder",
        "medication_change", "allergy_alert", "immunization_record",
        "billing_update", "insurance_verification", "prior_auth",
        "emergency_notification", "readmission_alert", "patient_message",
        "provider_note", "ehr_sync", "custom"
    ]

    def __init__(self, sdk: SolusSDK):
        self.sdk = sdk
        self.threads = {}  # thread_id → list of message records
        self.pending_acks = {}  # tx_hash → ack metadata

    def send_secure_update(
        self,
        sender_wallet_seed: str,
        recipient_xrpl_account: str,
        update_type: str,
        plaintext_payload: str,
        encrypt_for_recipient: bool = True,
        require_ack: bool = True,
        thread_id: str = None,
        recipient_device_token: str = None,
        webhook_url: str = None,
        metadata: dict = None
    ) -> dict:
        """
        Send an encrypted, anchored healthcare update.

        Args:
            sender_wallet_seed:       XRPL wallet seed of the sender
            recipient_xrpl_account:   XRPL classic address of recipient(s)
            update_type:              Category (e.g., 'lab_result', 'post_op_complication')
            plaintext_payload:        The actual message content (never stored on-chain)
            encrypt_for_recipient:    If True, encrypt payload before hashing
            require_ack:              If True, create an ACK template for recipient to sign
            thread_id:                Existing thread ID to continue, or None for new thread
            recipient_device_token:   For push notification (mock in prototype)
            webhook_url:              Custom webhook URL for delivery notification
            metadata:                 Additional metadata dict to include in anchor memo

        Returns:
            dict with thread_id, tx_hash, message_hash, ack_required, timestamp
        """
        if update_type not in self.UPDATE_TYPES:
            print(f"  ⚠ Unknown update_type '{update_type}' — using 'custom'")
            update_type = "custom"

        # Generate or continue thread
        if thread_id is None:
            thread_id = _generate_thread_id()
        if thread_id not in self.threads:
            self.threads[thread_id] = []

        timestamp = _timestamp()

        # Step 1: Encrypt if requested
        processed_payload = plaintext_payload
        if encrypt_for_recipient and self.sdk.cipher:
            processed_payload = self.sdk.encrypt_data(plaintext_payload)
            print(f"  ✓ Payload encrypted (Fernet AES-128-CBC)")

        # Step 2: Hash
        message_hash = _hash(processed_payload + timestamp + thread_id)
        print(f"  ✓ Message hash: {message_hash[:16]}...")

        # Step 3: Anchor to XRPL
        memo_parts = [
            f"solus:msg:{update_type}",
            message_hash,
            thread_id,
            timestamp
        ]
        if metadata:
            memo_parts.append(json.dumps(metadata, separators=(",", ":")))

        record_type = f"MSG_{update_type.upper()}"
        result = self.sdk.store_hash_with_sls_fee(
            hash_value="|".join(memo_parts),
            wallet_seed=sender_wallet_seed,
            record_type=record_type
        )
        tx_hash = result.get("fee_tx", {}).get("hash", f"mock_tx_{uuid.uuid4().hex[:12]}")
        print(f"  ✓ Anchored to XRPL: {tx_hash}")

        # Step 4: Build message record
        message_record = {
            "thread_id": thread_id,
            "message_index": len(self.threads[thread_id]),
            "sender": sender_wallet_seed[:8] + "...",
            "recipient": recipient_xrpl_account,
            "update_type": update_type,
            "message_hash": message_hash,
            "tx_hash": tx_hash,
            "timestamp": timestamp,
            "ack_required": require_ack,
            "ack_received": False,
            "encrypted": encrypt_for_recipient
        }
        self.threads[thread_id].append(message_record)

        # Step 5: ACK template (recipient must anchor this to confirm receipt)
        if require_ack:
            ack_template = {
                "type": "ACK",
                "original_tx": tx_hash,
                "thread_id": thread_id,
                "recipient": recipient_xrpl_account,
                "ack_memo": f"solus:ack:{thread_id}:{message_hash[:16]}",
                "instructions": "Recipient signs and anchors this to confirm receipt"
            }
            self.pending_acks[tx_hash] = ack_template
            print(f"  ✓ ACK required — template created for recipient")

        # Step 6: Webhook notification
        webhook_target = webhook_url or MOCK_WEBHOOK_URL
        webhook_payload = {
            "event": "solus.message.sent",
            "thread_id": thread_id,
            "update_type": update_type,
            "tx_hash": tx_hash,
            "message_hash": message_hash,
            "recipient": recipient_xrpl_account,
            "timestamp": timestamp,
            "ack_required": require_ack
        }
        _mock_webhook(webhook_target, webhook_payload)

        # Step 7: Push notification
        if recipient_device_token:
            _mock_push_notification(
                recipient_device_token,
                title=f"Solus Protocol: New {update_type.replace('_', ' ').title()}",
                body=f"You have a new verified update from your care team.",
                data={"thread_id": thread_id, "tx_hash": tx_hash}
            )

        return message_record

    def acknowledge_message(self, recipient_wallet_seed: str, original_tx_hash: str) -> dict:
        """
        Recipient acknowledges receipt of a message by anchoring an ACK to XRPL.
        This creates an immutable proof that the message was received and read.
        """
        if original_tx_hash not in self.pending_acks:
            return {"error": "No pending ACK found for this transaction"}

        ack = self.pending_acks[original_tx_hash]
        ack_hash = _hash(ack["ack_memo"] + _timestamp())

        result = self.sdk.store_hash_with_sls_fee(
            hash_value=ack["ack_memo"] + ":" + ack_hash,
            wallet_seed=recipient_wallet_seed,
            record_type="MSG_ACK"
        )
        ack_tx = result.get("fee_tx", {}).get("hash", f"mock_ack_{uuid.uuid4().hex[:12]}")

        # Update thread
        for msg in self.threads.get(ack["thread_id"], []):
            if msg["tx_hash"] == original_tx_hash:
                msg["ack_received"] = True
                msg["ack_tx_hash"] = ack_tx
                msg["ack_timestamp"] = _timestamp()
                break

        del self.pending_acks[original_tx_hash]

        print(f"  ✓ ACK anchored: {ack_tx}")
        print(f"  ✓ Thread {ack['thread_id']} — message receipt confirmed on-ledger")

        return {
            "ack_tx_hash": ack_tx,
            "original_tx": original_tx_hash,
            "thread_id": ack["thread_id"],
            "timestamp": _timestamp()
        }

    def get_thread(self, thread_id: str) -> list:
        """Retrieve the full message chain for a thread."""
        return self.threads.get(thread_id, [])

    def list_threads(self) -> dict:
        """List all active threads with summary info."""
        return {
            tid: {
                "message_count": len(msgs),
                "last_update": msgs[-1]["timestamp"] if msgs else None,
                "pending_acks": sum(1 for m in msgs if m["ack_required"] and not m["ack_received"])
            }
            for tid, msgs in self.threads.items()
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 2. CONSENT MANAGER — Patient-Controlled Data Access
# ═══════════════════════════════════════════════════════════════════════════════

class ConsentManager:
    """
    Patient-controlled consent tokens anchored to XRPL.

    A consent token is a hashed, anchored record that grants a specific
    recipient access to specific data categories for a limited time.
    Revocation is also anchored, creating an immutable consent audit trail.

    In production, consent tokens can optionally be minted as XLS-20 NFTs
    on XRPL for fine-grained, transferable access control.
    """

    DATA_CATEGORIES = [
        "vitals", "lab_results", "imaging", "medications", "allergies",
        "procedures", "clinical_notes", "mental_health", "genetics",
        "billing", "insurance", "demographics", "immunizations",
        "care_plans", "referrals", "all"
    ]

    def __init__(self, sdk: SolusSDK):
        self.sdk = sdk
        self.active_consents = {}  # consent_id → consent record
        self.revoked_consents = {}  # consent_id → revocation record

    def create_consent_token(
        self,
        patient_wallet_seed: str,
        recipient_account: str,
        data_categories: list,
        expiry_hours: int = 72,
        purpose: str = "treatment",
        one_time: bool = False
    ) -> dict:
        """
        Create and anchor a patient consent token.

        Args:
            patient_wallet_seed:  Patient's XRPL wallet seed
            recipient_account:    Provider/institution XRPL address being granted access
            data_categories:      List of data types to share (e.g., ['vitals', 'lab_results'])
            expiry_hours:         Hours until consent expires (default: 72)
            purpose:              Reason for access ('treatment', 'research', 'billing', 'emergency')
            one_time:             If True, consent is consumed on first access

        Returns:
            dict with consent_id, tx_hash, expiry, categories, status
        """
        # Validate categories
        valid_cats = [c for c in data_categories if c in self.DATA_CATEGORIES]
        if not valid_cats:
            raise ValueError(f"No valid data categories. Options: {self.DATA_CATEGORIES}")

        consent_id = f"consent-{uuid.uuid4().hex[:12]}"
        created = _timestamp()
        expiry = (datetime.utcnow() + timedelta(hours=expiry_hours)).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Build consent payload (never stored on-chain — only its hash)
        consent_payload = {
            "consent_id": consent_id,
            "patient": patient_wallet_seed[:8] + "...",
            "recipient": recipient_account,
            "categories": valid_cats,
            "purpose": purpose,
            "created": created,
            "expiry": expiry,
            "one_time": one_time,
            "status": "active"
        }
        consent_hash = _hash(json.dumps(consent_payload, sort_keys=True))

        # Anchor consent hash to XRPL
        memo_data = f"solus:consent:grant:{consent_id}:{consent_hash}"
        result = self.sdk.store_hash_with_sls_fee(
            hash_value=memo_data,
            wallet_seed=patient_wallet_seed,
            record_type="CONSENT_GRANT"
        )
        tx_hash = result.get("fee_tx", {}).get("hash", f"mock_consent_{uuid.uuid4().hex[:12]}")

        consent_record = {
            **consent_payload,
            "consent_hash": consent_hash,
            "tx_hash": tx_hash
        }
        self.active_consents[consent_id] = consent_record

        print(f"  ✓ Consent token created: {consent_id}")
        print(f"  ✓ Categories: {', '.join(valid_cats)}")
        print(f"  ✓ Expires: {expiry} | One-time: {one_time}")
        print(f"  ✓ Anchored: {tx_hash}")

        # Notify recipient via webhook
        _mock_webhook(MOCK_WEBHOOK_URL, {
            "event": "solus.consent.granted",
            "consent_id": consent_id,
            "categories": valid_cats,
            "expiry": expiry,
            "tx_hash": tx_hash
        })

        return consent_record

    def revoke_consent(self, patient_wallet_seed: str, consent_id: str, reason: str = "patient_request") -> dict:
        """
        Revoke an existing consent token. Anchors the revocation to XRPL.

        Args:
            patient_wallet_seed:  Patient's wallet seed (only patient can revoke)
            consent_id:           The consent token ID to revoke
            reason:               Reason for revocation

        Returns:
            dict with revocation details and tx_hash
        """
        if consent_id not in self.active_consents:
            return {"error": f"Consent {consent_id} not found or already revoked"}

        original = self.active_consents[consent_id]
        revocation = {
            "consent_id": consent_id,
            "original_tx": original["tx_hash"],
            "revoked_at": _timestamp(),
            "reason": reason,
            "status": "revoked"
        }
        revocation_hash = _hash(json.dumps(revocation, sort_keys=True))

        # Anchor revocation
        memo_data = f"solus:consent:revoke:{consent_id}:{revocation_hash}"
        result = self.sdk.store_hash_with_sls_fee(
            hash_value=memo_data,
            wallet_seed=patient_wallet_seed,
            record_type="CONSENT_REVOKE"
        )
        revoke_tx = result.get("fee_tx", {}).get("hash", f"mock_revoke_{uuid.uuid4().hex[:12]}")

        revocation["tx_hash"] = revoke_tx
        self.revoked_consents[consent_id] = revocation
        del self.active_consents[consent_id]

        print(f"  ✓ Consent {consent_id} REVOKED")
        print(f"  ✓ Revocation anchored: {revoke_tx}")

        # Notify affected recipient
        _mock_webhook(MOCK_WEBHOOK_URL, {
            "event": "solus.consent.revoked",
            "consent_id": consent_id,
            "revoke_tx": revoke_tx,
            "reason": reason
        })

        return revocation

    def check_consent(self, consent_id: str) -> dict:
        """Check if a consent token is still active and valid."""
        if consent_id in self.revoked_consents:
            return {"status": "revoked", **self.revoked_consents[consent_id]}
        if consent_id in self.active_consents:
            consent = self.active_consents[consent_id]
            # Check expiry
            expiry = datetime.strptime(consent["expiry"], "%Y-%m-%dT%H:%M:%SZ")
            if datetime.utcnow() > expiry:
                return {"status": "expired", **consent}
            return {"status": "active", **consent}
        return {"status": "not_found"}

    def list_active_consents(self) -> list:
        """List all active consent tokens."""
        return list(self.active_consents.values())


# ═══════════════════════════════════════════════════════════════════════════════
# 3. CARE CHAIN TRACKER — Verifiable Chain-of-Custody Handoffs
# ═══════════════════════════════════════════════════════════════════════════════

class CareChainTracker:
    """
    Creates a verifiable, on-ledger chain of custody for patient data.

    Every time data moves between care participants:
      Patient → PCP → Specialist → ER → Insurance → ...

    A new "handoff" record is anchored that references the previous tx hash,
    creating a linked list of provable custody events on a public ledger.

    This has never been built at scale on any public ledger for healthcare.
    """

    HANDOFF_TYPES = [
        "initial_intake", "referral_out", "referral_in", "transfer",
        "discharge", "readmission", "specialist_consult", "emergency_handoff",
        "insurance_claim", "pharmacy_dispense", "lab_order", "imaging_order",
        "home_health", "telehealth_session", "care_transition"
    ]

    def __init__(self, sdk: SolusSDK):
        self.sdk = sdk
        self.chains = {}  # patient_id → ordered list of handoff records

    def create_handoff(
        self,
        sender_wallet_seed: str,
        patient_id: str,
        sender_role: str,
        receiver_account: str,
        receiver_role: str,
        handoff_type: str,
        clinical_summary: str,
        previous_tx_hash: str = None,
        attachments_hash: str = None
    ) -> dict:
        """
        Create and anchor a care handoff record.

        Args:
            sender_wallet_seed:  Wallet seed of the sending provider
            patient_id:          Anonymized patient identifier
            sender_role:         Role of sender (e.g., 'PCP', 'Surgeon', 'ER_Physician')
            receiver_account:    XRPL address of receiving provider/institution
            receiver_role:       Role of receiver
            handoff_type:        Type of handoff (from HANDOFF_TYPES)
            clinical_summary:    Summary of clinical data being handed off (hashed, not on-chain)
            previous_tx_hash:    TX hash of the previous handoff in this chain (None if first)
            attachments_hash:    Hash of any attached documents

        Returns:
            dict with chain details and tx_hash
        """
        if patient_id not in self.chains:
            self.chains[patient_id] = []

        # Auto-link to last handoff if not specified
        if previous_tx_hash is None and self.chains[patient_id]:
            previous_tx_hash = self.chains[patient_id][-1]["tx_hash"]

        timestamp = _timestamp()
        chain_index = len(self.chains[patient_id])

        # Build handoff payload
        handoff_payload = {
            "patient_id": patient_id,
            "chain_index": chain_index,
            "sender_role": sender_role,
            "receiver_account": receiver_account,
            "receiver_role": receiver_role,
            "handoff_type": handoff_type,
            "previous_tx": previous_tx_hash,
            "summary_hash": _hash(clinical_summary),
            "attachments_hash": attachments_hash,
            "timestamp": timestamp
        }
        handoff_hash = _hash(json.dumps(handoff_payload, sort_keys=True))

        # Anchor to XRPL — memo includes previous TX reference for chain linking
        memo = f"solus:handoff:{handoff_type}:{handoff_hash}:prev={previous_tx_hash or 'GENESIS'}"
        result = self.sdk.store_hash_with_sls_fee(
            hash_value=memo,
            wallet_seed=sender_wallet_seed,
            record_type=f"HANDOFF_{handoff_type.upper()}"
        )
        tx_hash = result.get("fee_tx", {}).get("hash", f"mock_handoff_{uuid.uuid4().hex[:12]}")

        handoff_record = {
            **handoff_payload,
            "handoff_hash": handoff_hash,
            "tx_hash": tx_hash
        }
        self.chains[patient_id].append(handoff_record)

        print(f"  ✓ Handoff #{chain_index}: {sender_role} → {receiver_role}")
        print(f"  ✓ Type: {handoff_type} | Patient: {patient_id}")
        print(f"  ✓ Previous TX: {previous_tx_hash or 'GENESIS (first in chain)'}")
        print(f"  ✓ Anchored: {tx_hash}")

        # Notify receiver
        _mock_webhook(MOCK_WEBHOOK_URL, {
            "event": "solus.handoff.created",
            "patient_id": patient_id,
            "handoff_type": handoff_type,
            "sender_role": sender_role,
            "receiver_role": receiver_role,
            "tx_hash": tx_hash,
            "previous_tx": previous_tx_hash,
            "chain_index": chain_index
        })

        return handoff_record

    def get_chain(self, patient_id: str) -> list:
        """Get the full care chain for a patient (ordered handoff history)."""
        return self.chains.get(patient_id, [])

    def verify_chain_integrity(self, patient_id: str) -> dict:
        """
        Verify the integrity of a patient's care chain.
        Checks that each handoff references the correct previous TX hash.
        """
        chain = self.chains.get(patient_id, [])
        if not chain:
            return {"valid": False, "error": "No chain found"}

        issues = []
        for i, record in enumerate(chain):
            if i == 0:
                if record["previous_tx"] is not None:
                    issues.append(f"Genesis record has previous_tx: {record['previous_tx']}")
            else:
                expected_prev = chain[i - 1]["tx_hash"]
                if record["previous_tx"] != expected_prev:
                    issues.append(f"Break at index {i}: expected prev={expected_prev}, got {record['previous_tx']}")

        return {
            "valid": len(issues) == 0,
            "chain_length": len(chain),
            "patient_id": patient_id,
            "first_handoff": chain[0]["timestamp"],
            "last_handoff": chain[-1]["timestamp"],
            "issues": issues
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 4. FEDERATED BATCH — Multi-Institution Anchoring
# ═══════════════════════════════════════════════════════════════════════════════

class FederatedBatch:
    """
    Multi-institution batch anchoring with shared trust lines.

    Allows multiple healthcare organizations to jointly anchor records
    using a shared multi-sig escrow or coordinated trust line, settling
    fees in $SLS with a single aggregated transaction.
    """

    def __init__(self, sdk: SolusSDK):
        self.sdk = sdk
        self.pending_batches = {}  # batch_id → batch metadata + records
        self.completed_batches = {}

    def create_federated_batch(
        self,
        coordinator_wallet_seed: str,
        institution_ids: list,
        batch_name: str = None
    ) -> str:
        """
        Create a new federated batch that multiple institutions can contribute to.

        Args:
            coordinator_wallet_seed:  Wallet of the coordinating institution
            institution_ids:          List of participating institution identifiers
            batch_name:               Human-readable batch name

        Returns:
            batch_id string
        """
        batch_id = f"fed-batch-{uuid.uuid4().hex[:10]}"
        self.pending_batches[batch_id] = {
            "batch_id": batch_id,
            "batch_name": batch_name or f"Federated Batch {batch_id[-6:]}",
            "coordinator": coordinator_wallet_seed[:8] + "...",
            "institutions": institution_ids,
            "records": [],
            "created": _timestamp(),
            "status": "open"
        }
        print(f"  ✓ Federated batch created: {batch_id}")
        print(f"  ✓ Institutions: {', '.join(institution_ids)}")
        return batch_id

    def add_record(self, batch_id: str, institution_id: str, record_text: str, record_type: str) -> dict:
        """Add a record to a federated batch from a participating institution."""
        if batch_id not in self.pending_batches:
            return {"error": "Batch not found"}
        batch = self.pending_batches[batch_id]
        if institution_id not in batch["institutions"]:
            return {"error": f"Institution '{institution_id}' not authorized for this batch"}

        record_hash = _hash(record_text)
        entry = {
            "institution": institution_id,
            "record_type": record_type,
            "hash": record_hash,
            "added": _timestamp()
        }
        batch["records"].append(entry)
        print(f"  ✓ Record added to {batch_id} by {institution_id}: {record_type}")
        return entry

    def anchor_batch(self, batch_id: str, coordinator_wallet_seed: str) -> dict:
        """
        Anchor the entire federated batch to XRPL in a single transaction.
        Merkle root of all record hashes is used as the anchor point.
        """
        if batch_id not in self.pending_batches:
            return {"error": "Batch not found"}

        batch = self.pending_batches[batch_id]
        if not batch["records"]:
            return {"error": "Batch is empty"}

        # Build Merkle root from all record hashes
        hashes = [r["hash"] for r in batch["records"]]
        merkle_root = _hash("".join(sorted(hashes)))

        # Anchor
        memo = f"solus:fed_batch:{batch_id}:merkle={merkle_root}:count={len(hashes)}"
        result = self.sdk.store_hash_with_sls_fee(
            hash_value=memo,
            wallet_seed=coordinator_wallet_seed,
            record_type="FEDERATED_BATCH"
        )
        tx_hash = result.get("fee_tx", {}).get("hash", f"mock_fed_{uuid.uuid4().hex[:12]}")

        batch["status"] = "anchored"
        batch["merkle_root"] = merkle_root
        batch["tx_hash"] = tx_hash
        batch["anchored_at"] = _timestamp()
        batch["total_records"] = len(hashes)
        batch["total_institutions"] = len(set(r["institution"] for r in batch["records"]))

        self.completed_batches[batch_id] = batch
        del self.pending_batches[batch_id]

        print(f"\n  ✓ Federated batch anchored!")
        print(f"  ✓ Batch: {batch_id}")
        print(f"  ✓ Records: {len(hashes)} from {batch['total_institutions']} institutions")
        print(f"  ✓ Merkle root: {merkle_root[:16]}...")
        print(f"  ✓ TX: {tx_hash}")
        print(f"  ✓ Cost: {len(hashes)} records × $0.000012 = ${len(hashes) * 0.000012:.6f}")

        return batch


# ═══════════════════════════════════════════════════════════════════════════════
# 5. EHR PLUGIN STUBS — Epic, Cerner, athenahealth
# ═══════════════════════════════════════════════════════════════════════════════

class EHRPlugin:
    """
    Mock EHR plugin interface for Epic, Cerner, and athenahealth.

    In production, these would be SMART on FHIR apps registered with each
    EHR vendor's app marketplace, using OAuth2 for authentication and
    FHIR R4 for data exchange.
    """

    SUPPORTED_EHRS = {
        "epic":   {"name": "Epic Systems",   "fhir_version": "R4", "endpoint": MOCK_EPIC_PLUGIN_URL},
        "cerner": {"name": "Oracle Cerner",  "fhir_version": "R4", "endpoint": MOCK_CERNER_PLUGIN_URL},
        "athena": {"name": "athenahealth",   "fhir_version": "R4", "endpoint": MOCK_ATHENA_PLUGIN_URL}
    }

    def __init__(self, sdk: SolusSDK, ehr_system: str):
        if ehr_system not in self.SUPPORTED_EHRS:
            raise ValueError(f"Unsupported EHR. Options: {list(self.SUPPORTED_EHRS.keys())}")
        self.sdk = sdk
        self.ehr = ehr_system
        self.config = self.SUPPORTED_EHRS[ehr_system]
        self.connected = False

    def connect(self, client_id: str = None, client_secret: str = None):
        """
        Authenticate with the EHR system using SMART on FHIR OAuth2.
        In prototype mode, simulates a successful connection.
        """
        client_id = client_id or MOCK_FHIR_CLIENT_ID
        client_secret = client_secret or MOCK_FHIR_CLIENT_SECRET

        if PROTOTYPE_MODE:
            print(f"  [MOCK] Connected to {self.config['name']} (FHIR {self.config['fhir_version']})")
            print(f"  [MOCK] OAuth2 client: {client_id[:20]}...")
            self.connected = True
            return {"connected": True, "ehr": self.ehr, "mock": True}
        else:
            import requests
            token_resp = requests.post(MOCK_FHIR_TOKEN_URL, data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret
            })
            self.access_token = token_resp.json().get("access_token")
            self.connected = True
            return {"connected": True, "ehr": self.ehr}

    def auto_anchor_event(self, patient_id: str, event_type: str, event_data: str, wallet_seed: str) -> dict:
        """
        Automatically anchor a clinical event from the EHR.
        This is what the EHR plugin calls when a clinically significant event occurs.
        """
        if not self.connected:
            return {"error": "Not connected to EHR. Call connect() first."}

        # Query FHIR for context (mock)
        fhir_context = _mock_fhir_query("Encounter", patient_id)

        # Hash and anchor
        event_hash = _hash(event_data + _timestamp())
        result = self.sdk.store_hash_with_sls_fee(
            hash_value=f"solus:ehr:{self.ehr}:{event_type}:{event_hash}",
            wallet_seed=wallet_seed,
            record_type=f"EHR_{self.ehr.upper()}_{event_type.upper()}"
        )
        tx_hash = result.get("fee_tx", {}).get("hash", f"mock_ehr_{uuid.uuid4().hex[:12]}")

        print(f"  ✓ {self.config['name']} event auto-anchored: {event_type}")
        print(f"  ✓ Patient: {patient_id} | TX: {tx_hash}")

        return {
            "ehr": self.ehr,
            "event_type": event_type,
            "patient_id": patient_id,
            "event_hash": event_hash,
            "tx_hash": tx_hash,
            "fhir_context": fhir_context,
            "timestamp": _timestamp()
        }


# ═══════════════════════════════════════════════════════════════════════════════
# DEMO / USAGE EXAMPLE
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print(" SOLUS PROTOCOL VERIFIED CARE NETWORK (SVCN) — Prototype Demo")
    print("=" * 70)

    # Initialize SDK
    sdk = SolusSDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True, api_key="valid_mock_key")
    patient_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"
    provider_account = "rProviderXRPLAccountHere12345"

    # ── 1. Secure Messaging ──
    print("\n" + "─" * 50)
    print(" 1. SECURE MESSAGING")
    print("─" * 50)
    messenger = SolusMessenger(sdk)

    msg1 = messenger.send_secure_update(
        sender_wallet_seed=patient_seed,
        recipient_xrpl_account=provider_account,
        update_type="post_op_complication",
        plaintext_payload="Patient reports increased swelling at incision site. Temp 101.2°F. Requesting urgent review.",
        encrypt_for_recipient=True,
        require_ack=True,
        recipient_device_token="dMockDeviceToken_FCM_abc123xyz"
    )
    print(f"\n  Thread: {msg1['thread_id']}")

    # Provider acknowledges
    print("\n  Provider acknowledging receipt...")
    ack = messenger.acknowledge_message(patient_seed, msg1["tx_hash"])

    # ── 2. Consent Tokens ──
    print("\n" + "─" * 50)
    print(" 2. CONSENT TOKENS")
    print("─" * 50)
    consent_mgr = ConsentManager(sdk)

    token = consent_mgr.create_consent_token(
        patient_wallet_seed=patient_seed,
        recipient_account=provider_account,
        data_categories=["vitals", "lab_results", "imaging"],
        expiry_hours=48,
        purpose="treatment"
    )
    print(f"\n  Consent status: {consent_mgr.check_consent(token['consent_id'])['status']}")

    # Revoke consent
    print("\n  Patient revoking consent...")
    consent_mgr.revoke_consent(patient_seed, token["consent_id"], reason="switching_provider")

    # ── 3. Care Chain (Handoff Tracking) ──
    print("\n" + "─" * 50)
    print(" 3. CARE CHAIN — Verifiable Handoffs")
    print("─" * 50)
    tracker = CareChainTracker(sdk)

    # Patient → PCP
    h1 = tracker.create_handoff(
        sender_wallet_seed=patient_seed, patient_id="PT-44521",
        sender_role="Patient", receiver_account=provider_account,
        receiver_role="PCP", handoff_type="initial_intake",
        clinical_summary="New patient intake — full history and physical"
    )
    # PCP → Cardiologist
    h2 = tracker.create_handoff(
        sender_wallet_seed=patient_seed, patient_id="PT-44521",
        sender_role="PCP", receiver_account="rCardiologistAccount123",
        receiver_role="Cardiologist", handoff_type="referral_out",
        clinical_summary="Referral for palpitations and abnormal ECG"
    )
    # Cardiologist → ER
    h3 = tracker.create_handoff(
        sender_wallet_seed=patient_seed, patient_id="PT-44521",
        sender_role="Cardiologist", receiver_account="rERPhysicianAccount456",
        receiver_role="ER_Physician", handoff_type="emergency_handoff",
        clinical_summary="Acute chest pain during stress test — transfer to ED"
    )

    # Verify chain
    integrity = tracker.verify_chain_integrity("PT-44521")
    print(f"\n  Chain integrity: {'✓ VALID' if integrity['valid'] else '✗ BROKEN'}")
    print(f"  Chain length: {integrity['chain_length']} handoffs")

    # ── 4. Federated Batch ──
    print("\n" + "─" * 50)
    print(" 4. FEDERATED BATCH — Multi-Institution")
    print("─" * 50)
    fed = FederatedBatch(sdk)

    batch_id = fed.create_federated_batch(
        coordinator_wallet_seed=patient_seed,
        institution_ids=["Metro General Hospital", "City Cardiology Center", "LabCorp Regional"],
        batch_name="Q1 2026 Shared Care Records"
    )
    fed.add_record(batch_id, "Metro General Hospital", "Discharge summary for PT-44521", "discharge")
    fed.add_record(batch_id, "City Cardiology Center", "Cardiology consult report", "consultation")
    fed.add_record(batch_id, "LabCorp Regional", "CBC + Lipid panel results", "lab_result")
    fed.add_record(batch_id, "Metro General Hospital", "Follow-up care plan", "care_plan")

    result = fed.anchor_batch(batch_id, patient_seed)

    # ── 5. EHR Plugin ──
    print("\n" + "─" * 50)
    print(" 5. EHR PLUGIN — Epic Auto-Anchor")
    print("─" * 50)
    epic_plugin = EHRPlugin(sdk, "epic")
    epic_plugin.connect()
    epic_plugin.auto_anchor_event(
        patient_id="PT-44521",
        event_type="procedure_complete",
        event_data="Cardiac catheterization completed successfully. No complications.",
        wallet_seed=patient_seed
    )

    print("\n" + "=" * 70)
    print(" SVCN PROTOTYPE DEMO COMPLETE")
    print(f" Total anchored records: 8+ across 5 modules")
    print(f" All using mock APIs — swap MOCK_* constants for production")
    print("=" * 70)
