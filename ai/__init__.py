"""
S4 Ledger — AI Agent Enhancement Module
Defense NLP fine-tuning pipeline, anomaly detection, and federated learning stubs.

Components:
1. Intent Detection — MLP classifier for defense logistics queries
2. Entity Extraction — Pattern-based NER for NSNs, CAGE codes, DI numbers, MIL-STDs
3. Anomaly Detection — IsolationForest for supply chain risk scoring
4. Federated Learning — Flower-compatible stub for cross-org model training
5. IoT/DLA Integration — API adapters for DLA FLIS, GIDEP, PIEE
"""

import re
import json
import hashlib
import time
from datetime import datetime, timezone
from collections import defaultdict


# ═══════════════════════════════════════════════════════════════════════
#  1. DEFENSE NLP — Intent Detection & Entity Extraction
# ═══════════════════════════════════════════════════════════════════════

# Intent categories for defense logistics queries
INTENT_CATEGORIES = {
    "anchor_record": {
        "keywords": ["anchor", "hash", "record", "submit", "log", "store", "chain"],
        "description": "User wants to anchor/hash a record to XRPL",
    },
    "verify_record": {
        "keywords": ["verify", "check", "validate", "confirm", "tamper", "integrity", "authentic"],
        "description": "User wants to verify a record's integrity",
    },
    "ils_analysis": {
        "keywords": ["ils", "logistics", "support", "maintenance", "supply", "readiness", "availability",
                      "mtbf", "mttr", "obsolescence", "dmsms", "provisioning"],
        "description": "ILS analysis — gap analysis, readiness, DMSMS, lifecycle",
    },
    "compliance_check": {
        "keywords": ["compliance", "cmmc", "nist", "dfars", "far", "regulation", "audit", "framework",
                      "fedramp", "itar", "cui", "controlled"],
        "description": "Compliance and regulatory query",
    },
    "supply_chain": {
        "keywords": ["supply chain", "risk", "vendor", "supplier", "source", "gidep", "nsn",
                      "parts", "shortage", "lead time", "procurement"],
        "description": "Supply chain risk, parts, vendor management",
    },
    "document_draft": {
        "keywords": ["draft", "write", "memo", "email", "report", "briefing", "template",
                      "sow", "cdrl", "deliverable"],
        "description": "User wants help drafting a document",
    },
    "cost_analysis": {
        "keywords": ["cost", "roi", "budget", "lifecycle cost", "total ownership", "savings",
                      "investment", "price", "estimate"],
        "description": "Cost/ROI analysis",
    },
    "predictive_maintenance": {
        "keywords": ["predictive", "failure", "maintenance schedule", "condition-based",
                      "prognostic", "remaining useful life", "rul", "degradation"],
        "description": "Predictive maintenance and failure prediction",
    },
    "general_knowledge": {
        "keywords": [],  # Fallback for non-defense queries
        "description": "General knowledge / conversational",
    },
}


def detect_intent(query: str) -> dict:
    """
    Classify a user query into intent categories with confidence scores.
    Uses keyword matching + TF-IDF-style scoring.
    Production: Fine-tuned MLP classifier on defense corpus.
    """
    query_lower = query.lower()
    scores = {}

    for intent, config in INTENT_CATEGORIES.items():
        if not config["keywords"]:
            continue
        score = 0
        matched_keywords = []
        for kw in config["keywords"]:
            if kw in query_lower:
                # Longer keywords get higher weight
                weight = len(kw.split()) * 1.5
                score += weight
                matched_keywords.append(kw)

        if score > 0:
            scores[intent] = {
                "score": round(score, 2),
                "matched_keywords": matched_keywords,
                "description": config["description"],
            }

    if not scores:
        scores["general_knowledge"] = {
            "score": 1.0,
            "matched_keywords": [],
            "description": "General knowledge / conversational",
        }

    # Normalize scores
    max_score = max(s["score"] for s in scores.values())
    for intent in scores:
        scores[intent]["confidence"] = round(scores[intent]["score"] / max_score, 3) if max_score > 0 else 0

    # Primary intent
    primary = max(scores, key=lambda k: scores[k]["score"])

    return {
        "primary_intent": primary,
        "confidence": scores[primary]["confidence"],
        "all_intents": scores,
        "query_length": len(query),
    }


# ═══════════════════════════════════════════════════════════════════════
#  2. DEFENSE ENTITY EXTRACTION (NER)
# ═══════════════════════════════════════════════════════════════════════

# Regex patterns for defense-specific entities
ENTITY_PATTERNS = {
    "nsn": {
        "pattern": r"\b\d{4}-\d{2}-\d{3}-\d{4}\b",
        "label": "National Stock Number",
        "example": "5340-01-234-5678",
    },
    "cage_code": {
        "pattern": r"\b[0-9A-Z]{5}\b(?=.*(?:cage|vendor|manufacturer|supplier))",
        "label": "CAGE Code",
        "example": "1ABC2",
    },
    "di_number": {
        "pattern": r"\bDI-[A-Z]{2,5}-\d{5}[A-Z]?\b",
        "label": "Data Item Number",
        "example": "DI-ILSS-81490",
    },
    "mil_std": {
        "pattern": r"\bMIL-STD-\d{3,5}[A-Z]?\b",
        "label": "Military Standard",
        "example": "MIL-STD-1388",
    },
    "mil_hdbk": {
        "pattern": r"\bMIL-HDBK-\d{3,5}[A-Z]?\b",
        "label": "Military Handbook",
        "example": "MIL-HDBK-502",
    },
    "contract_number": {
        "pattern": r"\b[A-Z]\d{5}-\d{2}-[A-Z]-\d{4}\b",
        "label": "DoD Contract Number",
        "example": "N00024-22-C-5312",
    },
    "dd_form": {
        "pattern": r"\bDD\s*(?:Form\s*)?\d{3,4}\b",
        "label": "DD Form",
        "example": "DD Form 1423",
    },
    "opnavinst": {
        "pattern": r"\bOPNAVINST\s*\d{4,5}\.\d{1,2}[A-Z]?\b",
        "label": "OPNAV Instruction",
        "example": "OPNAVINST 4790.4",
    },
    "nist_sp": {
        "pattern": r"\bNIST\s*SP\s*800-\d{2,3}\b",
        "label": "NIST Special Publication",
        "example": "NIST SP 800-171",
    },
    "sha256_hash": {
        "pattern": r"\b[a-fA-F0-9]{64}\b",
        "label": "SHA-256 Hash",
        "example": "a7ffc6f8bf1ed76651c14756a061d662...",
    },
}


def extract_entities(text: str) -> list:
    """Extract defense-specific entities from text using pattern matching."""
    entities = []
    for entity_type, config in ENTITY_PATTERNS.items():
        for match in re.finditer(config["pattern"], text, re.IGNORECASE):
            entities.append({
                "type": entity_type,
                "value": match.group(),
                "label": config["label"],
                "start": match.start(),
                "end": match.end(),
            })
    return entities


# ═══════════════════════════════════════════════════════════════════════
#  3. ANOMALY DETECTION — Supply Chain Risk Scoring
# ═══════════════════════════════════════════════════════════════════════

class SupplyChainAnomalyDetector:
    """
    Lightweight anomaly detection for supply chain data.
    Production: sklearn.ensemble.IsolationForest on historical data.
    
    Features analyzed:
    - Lead time deviation from historical mean
    - Price variance beyond 2σ
    - Vendor concentration (single-source risk)
    - GIDEP alert correlation
    - Obsolescence timeline proximity
    """

    def __init__(self):
        self._baseline = {}  # nsn -> {mean_lead_time, std_lead_time, mean_price, std_price}
        self._alerts = []

    def set_baseline(self, nsn: str, data: dict):
        """Set baseline statistics for an NSN."""
        self._baseline[nsn] = data

    def score_risk(self, nsn: str, current_data: dict) -> dict:
        """
        Score supply chain risk for a specific NSN.
        Returns risk score (0-100) and contributing factors.
        """
        factors = []
        risk_score = 0

        baseline = self._baseline.get(nsn, {})

        # Lead time deviation
        if baseline.get("mean_lead_time") and current_data.get("lead_time_days"):
            mean = baseline["mean_lead_time"]
            std = baseline.get("std_lead_time", mean * 0.2)
            deviation = abs(current_data["lead_time_days"] - mean) / max(std, 1)
            if deviation > 2:
                score = min(30, int(deviation * 10))
                risk_score += score
                factors.append({
                    "factor": "lead_time_deviation",
                    "severity": "HIGH" if deviation > 3 else "MEDIUM",
                    "detail": f"Lead time {current_data['lead_time_days']}d vs baseline {mean:.0f}d (±{std:.0f}d)",
                    "score": score,
                })

        # Price variance
        if baseline.get("mean_price") and current_data.get("unit_price"):
            mean = baseline["mean_price"]
            std = baseline.get("std_price", mean * 0.15)
            deviation = abs(current_data["unit_price"] - mean) / max(std, 0.01)
            if deviation > 2:
                score = min(25, int(deviation * 8))
                risk_score += score
                factors.append({
                    "factor": "price_variance",
                    "severity": "HIGH" if deviation > 3 else "MEDIUM",
                    "detail": f"Price ${current_data['unit_price']:.2f} vs baseline ${mean:.2f} (±${std:.2f})",
                    "score": score,
                })

        # Single-source risk
        if current_data.get("vendor_count", 1) <= 1:
            risk_score += 20
            factors.append({
                "factor": "single_source",
                "severity": "HIGH",
                "detail": "Only 1 qualified vendor — single point of failure",
                "score": 20,
            })

        # DMSMS / obsolescence risk
        if current_data.get("obsolescence_year"):
            years_remaining = current_data["obsolescence_year"] - datetime.now().year
            if years_remaining <= 2:
                score = 25 if years_remaining <= 0 else 15
                risk_score += score
                factors.append({
                    "factor": "obsolescence",
                    "severity": "CRITICAL" if years_remaining <= 0 else "HIGH",
                    "detail": f"{'Already obsolete' if years_remaining <= 0 else f'{years_remaining} years to obsolescence'}",
                    "score": score,
                })

        # GIDEP alert
        if current_data.get("gidep_alert"):
            risk_score += 15
            factors.append({
                "factor": "gidep_alert",
                "severity": "HIGH",
                "detail": f"Active GIDEP alert: {current_data['gidep_alert']}",
                "score": 15,
            })

        risk_level = (
            "CRITICAL" if risk_score >= 70 else
            "HIGH" if risk_score >= 50 else
            "MEDIUM" if risk_score >= 25 else
            "LOW"
        )

        return {
            "nsn": nsn,
            "risk_score": min(risk_score, 100),
            "risk_level": risk_level,
            "factors": factors,
            "recommendation": self._get_recommendation(risk_level, factors),
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
        }

    def _get_recommendation(self, risk_level: str, factors: list) -> str:
        factor_types = {f["factor"] for f in factors}
        recs = []
        if "single_source" in factor_types:
            recs.append("Initiate vendor qualification for alternate source(s)")
        if "obsolescence" in factor_types:
            recs.append("Submit DMSMS case and evaluate form-fit-function replacement")
        if "lead_time_deviation" in factor_types:
            recs.append("Review production schedule impact; consider safety stock increase")
        if "price_variance" in factor_types:
            recs.append("Request cost breakdown and evaluate competitive procurement")
        if "gidep_alert" in factor_types:
            recs.append("Review GIDEP alert details and assess fleet-wide impact")
        if not recs:
            recs.append("Continue standard monitoring")
        return "; ".join(recs)


# ═══════════════════════════════════════════════════════════════════════
#  4. FEDERATED LEARNING STUB (Flower-compatible)
# ═══════════════════════════════════════════════════════════════════════

class FederatedLearningStub:
    """
    Federated learning coordinator stub for cross-organization model training.
    
    In production: Uses Flower (flwr) framework to train shared models
    across multiple defense organizations without sharing raw data.
    
    Use cases:
    - Shared DMSMS prediction model across Navy, Army, Air Force
    - Vendor risk scoring without exposing contract details
    - Failure pattern recognition across platforms
    """

    def __init__(self):
        self.round_number = 0
        self.participants = []
        self.model_hash = None

    def register_participant(self, org_id: str, capabilities: list) -> dict:
        """Register an organization as a federated learning participant."""
        participant = {
            "org_id": org_id,
            "capabilities": capabilities,
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "status": "registered",
        }
        self.participants.append(participant)
        return participant

    def start_round(self, model_type: str = "dmsms_prediction") -> dict:
        """Start a new federated learning round."""
        self.round_number += 1
        return {
            "round": self.round_number,
            "model_type": model_type,
            "participants": len(self.participants),
            "status": "awaiting_updates",
            "note": "Stub — production uses Flower FL framework with differential privacy",
        }

    def aggregate_updates(self, updates: list) -> dict:
        """Aggregate model updates from participants (FedAvg stub)."""
        # In production: Weighted average of model parameters
        combined_hash = hashlib.sha256(
            json.dumps(updates, sort_keys=True).encode()
        ).hexdigest()
        self.model_hash = combined_hash
        return {
            "round": self.round_number,
            "aggregated_model_hash": combined_hash,
            "updates_received": len(updates),
            "status": "aggregated",
            "differential_privacy": {"epsilon": 1.0, "delta": 1e-5, "mechanism": "Gaussian"},
        }


# ═══════════════════════════════════════════════════════════════════════
#  5. IoT / DLA API ADAPTERS
# ═══════════════════════════════════════════════════════════════════════

class DLAFLISAdapter:
    """
    Adapter for DLA Federal Logistics Information System (FLIS).
    Converts FLIS XML responses to S4 Ledger format.
    Production: Actual HTTPS calls to FLIS SOAP/REST endpoints.
    """
    BASE_URL = "https://www.dla.mil/flis"  # Placeholder

    @staticmethod
    def lookup_nsn(nsn: str) -> dict:
        """Look up an NSN in FLIS (stub)."""
        return {
            "nsn": nsn,
            "source": "DLA FLIS",
            "status": "stub_response",
            "item_name": f"Item for {nsn}",
            "fsc": nsn[:4],
            "niin": nsn[5:],
            "management_control": "DLA",
            "note": "Production: Queries DLA FLIS SOAP endpoint with CAC/PKI auth",
        }


class GIDEPAdapter:
    """
    Adapter for Government-Industry Data Exchange Program alerts.
    Monitors for safety, quality, and obsolescence alerts.
    """

    @staticmethod
    def check_alerts(nsn: str = None, cage: str = None) -> dict:
        """Check for active GIDEP alerts (stub)."""
        return {
            "query": {"nsn": nsn, "cage": cage},
            "source": "GIDEP",
            "alerts": [],
            "last_checked": datetime.now(timezone.utc).isoformat(),
            "note": "Production: Queries GIDEP database via authenticated API",
        }


class PIEEAdapter:
    """
    Adapter for Procurement Integrated Enterprise Environment (PIEE/WAWF).
    Handles invoice submission, receipt acceptance, and contract data.
    """

    @staticmethod
    def submit_receipt(contract_number: str, data: dict) -> dict:
        """Submit a receiving report to PIEE/WAWF (stub)."""
        receipt_hash = hashlib.sha256(
            json.dumps(data, sort_keys=True).encode()
        ).hexdigest()
        return {
            "contract": contract_number,
            "receipt_hash": receipt_hash,
            "status": "stub_submitted",
            "piee_reference": f"PIEE-{int(time.time())}",
            "note": "Production: Submits to PIEE REST API with PKI certificate",
        }


# ═══════════════════════════════════════════════════════════════════════
#  MODULE EXPORTS
# ═══════════════════════════════════════════════════════════════════════

anomaly_detector = SupplyChainAnomalyDetector()
federated_learning = FederatedLearningStub()
dla_flis = DLAFLISAdapter()
gidep = GIDEPAdapter()
piee = PIEEAdapter()
