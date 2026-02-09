"""
solus_anomaly.py — Real-Time Anomaly Detection & Notification Engine

Extends the existing ai_postop_monitor_anchor.py with:
  • Wearable device API integrations (Fitbit, Apple Health, Google Fit, Dexcom, Withings)
  • Rule engine with configurable thresholds per condition/procedure
  • Anomaly detection → auto-anchor → webhook + push notification
  • Optional ONNX model inference for advanced pattern detection
  • SLS micro-payment for every verified anomaly report

All wearable APIs use mock OAuth2 tokens in prototype mode.
Replace MOCK_* constants with real client IDs/secrets for production.

Author: Solus Protocol Team
License: Apache-2.0
"""

import hashlib
import json
import time
import uuid
from datetime import datetime, timedelta

from solus_sdk import SolusSDK

# ═══════════════════════════════════════════════════════════════════════════════
# MOCK / PROTOTYPE CONFIGURATION
# Replace with real OAuth2 credentials for production
# ═══════════════════════════════════════════════════════════════════════════════

# Fitbit API (https://dev.fitbit.com/)
MOCK_FITBIT_CLIENT_ID = "MOCK_FITBIT_CLIENT_ID"
MOCK_FITBIT_CLIENT_SECRET = "MOCK_FITBIT_CLIENT_SECRET"
MOCK_FITBIT_REDIRECT_URI = "https://app.solusprotocol.com/callback/fitbit"
MOCK_FITBIT_TOKEN_URL = "https://api.fitbit.com/oauth2/token"
MOCK_FITBIT_API_BASE = "https://api.fitbit.com/1/user/-"

# Apple HealthKit (via Apple Health REST proxy — requires HealthKit entitlement)
MOCK_APPLE_HEALTH_ENDPOINT = "https://healthkit.solusprotocol.com/v1/data"
MOCK_APPLE_HEALTH_API_KEY = "MOCK_APPLE_HEALTH_KEY"

# Google Fit (https://developers.google.com/fit)
MOCK_GOOGLE_FIT_CLIENT_ID = "MOCK_GOOGLE_FIT_CLIENT_ID"
MOCK_GOOGLE_FIT_CLIENT_SECRET = "MOCK_GOOGLE_FIT_SECRET"
MOCK_GOOGLE_FIT_API_BASE = "https://www.googleapis.com/fitness/v1/users/me"

# Dexcom CGM (https://developer.dexcom.com/)
MOCK_DEXCOM_CLIENT_ID = "MOCK_DEXCOM_CLIENT_ID"
MOCK_DEXCOM_CLIENT_SECRET = "MOCK_DEXCOM_SECRET"
MOCK_DEXCOM_API_BASE = "https://api.dexcom.com/v3"

# Withings (https://developer.withings.com/)
MOCK_WITHINGS_CLIENT_ID = "MOCK_WITHINGS_CLIENT_ID"
MOCK_WITHINGS_CLIENT_SECRET = "MOCK_WITHINGS_SECRET"
MOCK_WITHINGS_API_BASE = "https://wbsapi.withings.net"

# Webhook & Push
MOCK_WEBHOOK_URL = "https://hooks.solusprotocol.com/v1/alert"
MOCK_PUSH_API_KEY = "MOCK_FCM_SERVER_KEY"

# ONNX Model (optional advanced inference)
MOCK_ONNX_MODEL_PATH = "models/postop_anomaly_detector.onnx"

PROTOTYPE_MODE = True


def _timestamp():
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _hash(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


# ═══════════════════════════════════════════════════════════════════════════════
# WEARABLE DATA PROVIDERS (Mock in Prototype)
# ═══════════════════════════════════════════════════════════════════════════════

class WearableProvider:
    """
    Base class for wearable device integrations.
    Each subclass implements OAuth2 flow + data retrieval for a specific platform.
    """

    def __init__(self, name: str, client_id: str, client_secret: str, api_base: str):
        self.name = name
        self.client_id = client_id
        self.client_secret = client_secret
        self.api_base = api_base
        self.access_token = None
        self.connected = False

    def authenticate(self, auth_code: str = None) -> dict:
        """OAuth2 token exchange. In prototype, returns mock token."""
        if PROTOTYPE_MODE:
            self.access_token = f"mock_{self.name}_token_{uuid.uuid4().hex[:8]}"
            self.connected = True
            print(f"  [MOCK] {self.name} authenticated (OAuth2)")
            return {"connected": True, "provider": self.name, "mock": True}
        else:
            import requests
            # Real OAuth2 token exchange would go here
            raise NotImplementedError("Configure real OAuth2 credentials for production")

    def fetch_vitals(self, hours_back: int = 24) -> dict:
        """Fetch recent vitals data. Override per provider."""
        raise NotImplementedError


class FitbitProvider(WearableProvider):
    """Fitbit Web API integration."""

    def __init__(self):
        super().__init__("Fitbit", MOCK_FITBIT_CLIENT_ID, MOCK_FITBIT_CLIENT_SECRET, MOCK_FITBIT_API_BASE)

    def fetch_vitals(self, hours_back: int = 24) -> dict:
        if PROTOTYPE_MODE:
            import random
            return {
                "provider": "Fitbit",
                "device": "Fitbit Sense 2",
                "period": f"Last {hours_back} hours",
                "timestamp": _timestamp(),
                "data": {
                    "heart_rate": {
                        "resting": random.randint(58, 72),
                        "average": random.randint(65, 85),
                        "peak": random.randint(95, 155),
                        "readings": [random.randint(60, 100) for _ in range(24)]
                    },
                    "spo2": {
                        "average": round(random.uniform(94.0, 99.0), 1),
                        "minimum": round(random.uniform(88.0, 96.0), 1)
                    },
                    "steps": random.randint(800, 8000),
                    "sleep": {
                        "total_minutes": random.randint(300, 480),
                        "deep_minutes": random.randint(30, 90),
                        "rem_minutes": random.randint(60, 120),
                        "awake_minutes": random.randint(10, 60)
                    },
                    "skin_temp_variation": round(random.uniform(-1.0, 2.5), 1),
                    "hrv": random.randint(15, 55),
                    "ecg_alerts": random.choice([[], [], [], ["possible_afib"]])
                },
                "mock": True
            }
        else:
            import requests
            headers = {"Authorization": f"Bearer {self.access_token}"}
            hr = requests.get(f"{self.api_base}/activities/heart/date/today/1d.json", headers=headers).json()
            spo2 = requests.get(f"{self.api_base}/spo2/date/today.json", headers=headers).json()
            return {"heart_rate": hr, "spo2": spo2}


class AppleHealthProvider(WearableProvider):
    """Apple HealthKit integration (via proxy server with HealthKit entitlement)."""

    def __init__(self):
        super().__init__("Apple Health", MOCK_APPLE_HEALTH_API_KEY, "", MOCK_APPLE_HEALTH_ENDPOINT)

    def fetch_vitals(self, hours_back: int = 24) -> dict:
        if PROTOTYPE_MODE:
            import random
            return {
                "provider": "Apple Health",
                "device": "Apple Watch Series 9",
                "period": f"Last {hours_back} hours",
                "timestamp": _timestamp(),
                "data": {
                    "heart_rate": {
                        "resting": random.randint(55, 70),
                        "average": random.randint(62, 82),
                        "peak": random.randint(90, 150),
                        "readings": [random.randint(58, 98) for _ in range(48)]
                    },
                    "blood_oxygen": round(random.uniform(95.0, 99.5), 1),
                    "respiratory_rate": round(random.uniform(12.0, 20.0), 1),
                    "wrist_temperature": round(random.uniform(96.0, 99.5), 1),
                    "steps": random.randint(1000, 10000),
                    "walking_asymmetry": round(random.uniform(0.0, 8.0), 1),
                    "afib_history": random.choice([None, None, None, "detected_episode"]),
                    "fall_detection_events": 0
                },
                "mock": True
            }


class GoogleFitProvider(WearableProvider):
    """Google Fit REST API integration."""

    def __init__(self):
        super().__init__("Google Fit", MOCK_GOOGLE_FIT_CLIENT_ID, MOCK_GOOGLE_FIT_CLIENT_SECRET, MOCK_GOOGLE_FIT_API_BASE)

    def fetch_vitals(self, hours_back: int = 24) -> dict:
        if PROTOTYPE_MODE:
            import random
            return {
                "provider": "Google Fit",
                "device": "Pixel Watch 2",
                "period": f"Last {hours_back} hours",
                "timestamp": _timestamp(),
                "data": {
                    "heart_rate_bpm": random.randint(62, 88),
                    "spo2_percent": round(random.uniform(94.5, 99.0), 1),
                    "steps": random.randint(500, 7000),
                    "calories_burned": random.randint(1200, 2500),
                    "stress_level": random.choice(["low", "medium", "high"]),
                    "body_temperature": round(random.uniform(97.0, 99.5), 1)
                },
                "mock": True
            }


class DexcomProvider(WearableProvider):
    """Dexcom CGM (Continuous Glucose Monitor) API integration."""

    def __init__(self):
        super().__init__("Dexcom", MOCK_DEXCOM_CLIENT_ID, MOCK_DEXCOM_CLIENT_SECRET, MOCK_DEXCOM_API_BASE)

    def fetch_vitals(self, hours_back: int = 24) -> dict:
        if PROTOTYPE_MODE:
            import random
            readings = []
            for i in range(hours_back * 12):  # Every 5 minutes
                glucose = random.randint(70, 250)
                trend = random.choice(["flat", "rising", "falling", "rising_fast", "falling_fast"])
                readings.append({"mg_dl": glucose, "trend": trend, "minutes_ago": i * 5})
            return {
                "provider": "Dexcom",
                "device": "Dexcom G7",
                "period": f"Last {hours_back} hours",
                "timestamp": _timestamp(),
                "data": {
                    "current_glucose_mg_dl": readings[0]["mg_dl"],
                    "trend": readings[0]["trend"],
                    "average_glucose": sum(r["mg_dl"] for r in readings) // len(readings),
                    "time_in_range_pct": round(random.uniform(55.0, 85.0), 1),
                    "high_events": sum(1 for r in readings if r["mg_dl"] > 180),
                    "low_events": sum(1 for r in readings if r["mg_dl"] < 70),
                    "readings_count": len(readings),
                    "gmi": round(random.uniform(5.5, 8.5), 1)
                },
                "mock": True
            }


class WithingsProvider(WearableProvider):
    """Withings Health Devices API (BP monitors, scales, sleep trackers)."""

    def __init__(self):
        super().__init__("Withings", MOCK_WITHINGS_CLIENT_ID, MOCK_WITHINGS_CLIENT_SECRET, MOCK_WITHINGS_API_BASE)

    def fetch_vitals(self, hours_back: int = 24) -> dict:
        if PROTOTYPE_MODE:
            import random
            return {
                "provider": "Withings",
                "device": "BPM Connect / Body+ / Sleep Analyzer",
                "period": f"Last {hours_back} hours",
                "timestamp": _timestamp(),
                "data": {
                    "blood_pressure": {
                        "systolic": random.randint(105, 160),
                        "diastolic": random.randint(65, 100),
                        "pulse": random.randint(58, 95)
                    },
                    "weight_kg": round(random.uniform(55.0, 110.0), 1),
                    "body_fat_pct": round(random.uniform(12.0, 35.0), 1),
                    "muscle_mass_kg": round(random.uniform(25.0, 50.0), 1),
                    "sleep_score": random.randint(40, 95),
                    "sleep_apnea_events": random.randint(0, 15),
                    "snoring_minutes": random.randint(0, 60)
                },
                "mock": True
            }


# ═══════════════════════════════════════════════════════════════════════════════
# ANOMALY RULE ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

# Default thresholds — can be customized per patient/procedure
DEFAULT_THRESHOLDS = {
    "heart_rate_high": 120,       # bpm — sustained resting HR above this
    "heart_rate_low": 45,         # bpm — bradycardia alert
    "spo2_low": 90,               # % — oxygen desaturation
    "systolic_high": 160,         # mmHg — hypertensive crisis
    "systolic_low": 85,           # mmHg — hypotension
    "diastolic_high": 100,        # mmHg
    "temperature_high": 101.3,    # °F — post-op fever
    "glucose_high": 250,          # mg/dL — hyperglycemia
    "glucose_low": 54,            # mg/dL — severe hypoglycemia
    "respiratory_rate_high": 24,  # breaths/min — tachypnea
    "respiratory_rate_low": 8,    # breaths/min — bradypnea
    "sleep_apnea_events": 10,     # events — moderate sleep apnea
    "afib_detected": True,        # any episode triggers alert
    "hrv_low": 15,                # ms — very low HRV
    "fall_detected": True         # any fall triggers alert
}

# Post-procedure specific threshold overrides
PROCEDURE_THRESHOLDS = {
    "hip_replacement": {
        "heart_rate_high": 110,
        "temperature_high": 100.5,
        "spo2_low": 92,
        "fall_detected": True
    },
    "cardiac_surgery": {
        "heart_rate_high": 100,
        "heart_rate_low": 50,
        "spo2_low": 93,
        "systolic_high": 140,
        "afib_detected": True
    },
    "bariatric_surgery": {
        "heart_rate_high": 115,
        "spo2_low": 91,
        "glucose_high": 200,
        "glucose_low": 60
    },
    "appendectomy": {
        "temperature_high": 100.8,
        "heart_rate_high": 110
    },
    "knee_replacement": {
        "heart_rate_high": 105,
        "temperature_high": 100.5,
        "fall_detected": True
    }
}


class AnomalyEngine:
    """
    Real-time anomaly detection + auto-anchoring engine.

    Flow:
      1. Fetch vitals from connected wearable(s)
      2. Apply threshold rules (general + procedure-specific)
      3. Optional: Run ONNX model for advanced pattern detection
      4. If anomaly detected:
         a. Create POST_OP_COMPLICATION record
         b. Anchor hash to XRPL with $SLS payment
         c. Trigger webhook (to provider/care team)
         d. Send push notification (to patient + provider)
      5. Webhook payload includes XRPL tx hash for instant verification
    """

    SEVERITY_LEVELS = ["info", "warning", "critical", "emergency"]

    def __init__(self, sdk: SolusSDK, procedure_type: str = None, custom_thresholds: dict = None):
        self.sdk = sdk
        self.providers = {}
        self.alerts_history = []
        self.procedure_type = procedure_type

        # Build thresholds: defaults → procedure overrides → custom overrides
        self.thresholds = {**DEFAULT_THRESHOLDS}
        if procedure_type and procedure_type in PROCEDURE_THRESHOLDS:
            self.thresholds.update(PROCEDURE_THRESHOLDS[procedure_type])
        if custom_thresholds:
            self.thresholds.update(custom_thresholds)

        # Optional ONNX model
        self.onnx_model = None

    def add_provider(self, provider: WearableProvider) -> None:
        """Connect a wearable data provider."""
        provider.authenticate()
        self.providers[provider.name] = provider
        print(f"  ✓ Provider added: {provider.name}")

    def load_onnx_model(self, model_path: str = None) -> dict:
        """
        Load an ONNX model for advanced anomaly detection.
        In production, this would load a trained neural network (e.g., LSTM for
        time-series anomaly detection on vital signs).
        """
        path = model_path or MOCK_ONNX_MODEL_PATH

        if PROTOTYPE_MODE:
            print(f"  [MOCK ONNX] Would load model from: {path}")
            print(f"  [MOCK ONNX] Model type: LSTM Autoencoder for vital sign anomaly detection")
            self.onnx_model = {"loaded": True, "path": path, "mock": True}
            return self.onnx_model
        else:
            try:
                import onnxruntime as ort
                self.onnx_model = ort.InferenceSession(path)
                return {"loaded": True, "path": path}
            except Exception as e:
                print(f"  ⚠ ONNX model load failed: {e}")
                return {"loaded": False, "error": str(e)}

    def _check_thresholds(self, vitals_data: dict) -> list:
        """Apply rule-based threshold checks to vitals data, return detected anomalies."""
        anomalies = []
        data = vitals_data.get("data", {})

        # Heart rate checks
        hr_data = data.get("heart_rate", data)
        if isinstance(hr_data, dict):
            hr_peak = hr_data.get("peak", hr_data.get("heart_rate_bpm", 0))
            hr_resting = hr_data.get("resting", hr_peak)
        else:
            hr_peak = hr_resting = 0

        if hr_peak > self.thresholds["heart_rate_high"]:
            anomalies.append({
                "type": "TACHYCARDIA",
                "severity": "critical" if hr_peak > 150 else "warning",
                "value": hr_peak,
                "threshold": self.thresholds["heart_rate_high"],
                "message": f"Heart rate peaked at {hr_peak} bpm (threshold: {self.thresholds['heart_rate_high']})"
            })
        if hr_resting and hr_resting < self.thresholds["heart_rate_low"]:
            anomalies.append({
                "type": "BRADYCARDIA",
                "severity": "warning",
                "value": hr_resting,
                "threshold": self.thresholds["heart_rate_low"],
                "message": f"Resting HR {hr_resting} bpm below threshold ({self.thresholds['heart_rate_low']})"
            })

        # SpO2 checks
        spo2 = data.get("spo2", data.get("blood_oxygen", {}))
        spo2_min = spo2.get("minimum", spo2) if isinstance(spo2, dict) else spo2
        if isinstance(spo2_min, (int, float)) and spo2_min < self.thresholds["spo2_low"]:
            anomalies.append({
                "type": "OXYGEN_DESATURATION",
                "severity": "critical" if spo2_min < 85 else "warning",
                "value": spo2_min,
                "threshold": self.thresholds["spo2_low"],
                "message": f"SpO2 dropped to {spo2_min}% (threshold: {self.thresholds['spo2_low']}%)"
            })

        # Blood pressure checks
        bp = data.get("blood_pressure", {})
        if bp:
            systolic = bp.get("systolic", 0)
            diastolic = bp.get("diastolic", 0)
            if systolic > self.thresholds["systolic_high"]:
                anomalies.append({
                    "type": "HYPERTENSIVE_CRISIS",
                    "severity": "critical" if systolic > 180 else "warning",
                    "value": systolic,
                    "threshold": self.thresholds["systolic_high"],
                    "message": f"Systolic BP {systolic} mmHg (threshold: {self.thresholds['systolic_high']})"
                })
            if systolic and systolic < self.thresholds["systolic_low"]:
                anomalies.append({
                    "type": "HYPOTENSION",
                    "severity": "warning",
                    "value": systolic,
                    "threshold": self.thresholds["systolic_low"],
                    "message": f"Systolic BP {systolic} mmHg — possible hypotension"
                })

        # Temperature checks
        temp = data.get("wrist_temperature", data.get("body_temperature", data.get("skin_temp_variation")))
        if isinstance(temp, (int, float)) and temp > self.thresholds["temperature_high"]:
            anomalies.append({
                "type": "POST_OP_FEVER",
                "severity": "critical" if temp > 103.0 else "warning",
                "value": temp,
                "threshold": self.thresholds["temperature_high"],
                "message": f"Temperature {temp}°F — possible post-op infection"
            })

        # Glucose checks (Dexcom)
        glucose = data.get("current_glucose_mg_dl", 0)
        if glucose > self.thresholds["glucose_high"]:
            anomalies.append({
                "type": "HYPERGLYCEMIA",
                "severity": "critical" if glucose > 350 else "warning",
                "value": glucose,
                "threshold": self.thresholds["glucose_high"],
                "message": f"Blood glucose {glucose} mg/dL (threshold: {self.thresholds['glucose_high']})"
            })
        if glucose and glucose < self.thresholds["glucose_low"]:
            anomalies.append({
                "type": "SEVERE_HYPOGLYCEMIA",
                "severity": "emergency",
                "value": glucose,
                "threshold": self.thresholds["glucose_low"],
                "message": f"Blood glucose {glucose} mg/dL — SEVERE HYPOGLYCEMIA"
            })

        # AFib detection
        afib = data.get("ecg_alerts", data.get("afib_history"))
        if afib and self.thresholds.get("afib_detected"):
            if isinstance(afib, list) and afib:
                anomalies.append({
                    "type": "ATRIAL_FIBRILLATION",
                    "severity": "critical",
                    "value": afib,
                    "message": f"AFib episode(s) detected: {afib}"
                })
            elif isinstance(afib, str) and "detected" in afib:
                anomalies.append({
                    "type": "ATRIAL_FIBRILLATION",
                    "severity": "critical",
                    "value": afib,
                    "message": f"AFib detected: {afib}"
                })

        # Sleep apnea
        apnea_events = data.get("sleep_apnea_events", 0)
        if apnea_events > self.thresholds.get("sleep_apnea_events", 10):
            anomalies.append({
                "type": "SLEEP_APNEA",
                "severity": "warning",
                "value": apnea_events,
                "threshold": self.thresholds["sleep_apnea_events"],
                "message": f"Sleep apnea: {apnea_events} events detected"
            })

        # HRV
        hrv = data.get("hrv", 0)
        if hrv and hrv < self.thresholds.get("hrv_low", 15):
            anomalies.append({
                "type": "LOW_HRV",
                "severity": "info",
                "value": hrv,
                "message": f"HRV {hrv}ms — below normal (indicates physiological stress)"
            })

        return anomalies

    def _run_onnx_inference(self, vitals_data: dict) -> list:
        """
        Run advanced ML-based anomaly detection using ONNX model.
        In prototype, returns mock inference results.
        """
        if not self.onnx_model:
            return []

        if PROTOTYPE_MODE:
            import random
            if random.random() < 0.15:  # 15% chance of ML-detected anomaly
                return [{
                    "type": "ML_PATTERN_ANOMALY",
                    "severity": "warning",
                    "confidence": round(random.uniform(0.75, 0.98), 2),
                    "message": "ONNX model detected abnormal vital sign pattern (LSTM autoencoder reconstruction error > 2σ)"
                }]
            return []
        else:
            # Real ONNX inference would extract features, run model, interpret output
            import numpy as np
            features = np.array([[
                vitals_data.get("data", {}).get("heart_rate", {}).get("average", 75),
                vitals_data.get("data", {}).get("spo2", {}).get("average", 97),
                vitals_data.get("data", {}).get("steps", 3000)
            ]], dtype=np.float32)
            input_name = self.onnx_model.get_inputs()[0].name
            result = self.onnx_model.run(None, {input_name: features})
            anomaly_score = result[0][0][0]
            if anomaly_score > 0.5:
                return [{"type": "ML_PATTERN_ANOMALY", "severity": "warning", "confidence": float(anomaly_score)}]
            return []

    def scan_all_providers(
        self,
        patient_id: str,
        wallet_seed: str,
        hours_back: int = 24,
        webhook_url: str = None,
        auto_anchor: bool = True
    ) -> dict:
        """
        Scan all connected wearable providers for anomalies.

        1. Fetch vitals from each provider
        2. Run threshold rules + optional ONNX inference
        3. If anomalies found → anchor + notify

        Args:
            patient_id:    Patient identifier
            wallet_seed:   Wallet seed for anchoring
            hours_back:    How many hours of data to analyze
            webhook_url:   Where to send alert notifications
            auto_anchor:   If True, automatically anchor anomalies to XRPL

        Returns:
            Complete scan results with anomalies and anchor tx hashes
        """
        print(f"\n  Scanning {len(self.providers)} provider(s) for patient {patient_id}...")
        print(f"  Procedure context: {self.procedure_type or 'general'}")
        print(f"  Looking back: {hours_back} hours\n")

        all_vitals = {}
        all_anomalies = []

        for name, provider in self.providers.items():
            print(f"  ── {name} ──")
            vitals = provider.fetch_vitals(hours_back)
            all_vitals[name] = vitals

            # Threshold checks
            anomalies = self._check_thresholds(vitals)

            # ONNX inference
            ml_anomalies = self._run_onnx_inference(vitals)
            anomalies.extend(ml_anomalies)

            if anomalies:
                for a in anomalies:
                    a["provider"] = name
                    a["patient_id"] = patient_id
                    a["timestamp"] = _timestamp()
                all_anomalies.extend(anomalies)
                print(f"  ⚠ {len(anomalies)} anomaly(ies) detected from {name}")
            else:
                print(f"  ✓ {name}: All vitals within normal range")

        # Anchor + notify anomalies
        anchor_results = []
        if all_anomalies and auto_anchor:
            print(f"\n  ── Anchoring {len(all_anomalies)} anomaly(ies) ──")
            for anomaly in all_anomalies:
                # Build complication record
                record = {
                    "record_type": "POST_OP_COMPLICATION",
                    "anomaly_type": anomaly["type"],
                    "severity": anomaly["severity"],
                    "provider": anomaly["provider"],
                    "patient_id": patient_id,
                    "procedure": self.procedure_type or "general",
                    "value": str(anomaly.get("value", "")),
                    "threshold": str(anomaly.get("threshold", "")),
                    "message": anomaly["message"],
                    "timestamp": anomaly["timestamp"]
                }
                record_text = json.dumps(record, sort_keys=True)
                record_hash = _hash(record_text)

                # Anchor to XRPL
                result = self.sdk.store_hash_with_sls_fee(
                    hash_value=f"solus:anomaly:{anomaly['type']}:{record_hash}",
                    wallet_seed=wallet_seed,
                    record_type=f"ANOMALY_{anomaly['type']}"
                )
                tx_hash = result.get("fee_tx", {}).get("hash", f"mock_anomaly_{uuid.uuid4().hex[:12]}")

                anchor_result = {
                    **anomaly,
                    "record_hash": record_hash,
                    "tx_hash": tx_hash,
                    "xrpl_url": f"https://testnet.xrpl.org/transactions/{tx_hash}"
                }
                anchor_results.append(anchor_result)
                self.alerts_history.append(anchor_result)

                print(f"  ✓ Anchored: {anomaly['type']} ({anomaly['severity']}) → TX: {tx_hash[:20]}...")

                # Webhook notification
                webhook = webhook_url or MOCK_WEBHOOK_URL
                if PROTOTYPE_MODE:
                    print(f"  [MOCK WEBHOOK] → {webhook}")
                    print(f"    Alert: {anomaly['type']} | Severity: {anomaly['severity']}")
                    print(f"    TX Hash: {tx_hash}")
                else:
                    import requests
                    requests.post(webhook, json={
                        "event": "solus.anomaly.detected",
                        "tx_hash": tx_hash,
                        **anchor_result
                    }, timeout=10)

        scan_result = {
            "patient_id": patient_id,
            "procedure": self.procedure_type,
            "providers_scanned": list(self.providers.keys()),
            "scan_timestamp": _timestamp(),
            "hours_analyzed": hours_back,
            "anomalies_detected": len(all_anomalies),
            "anomalies": all_anomalies,
            "anchored": len(anchor_results),
            "anchor_results": anchor_results,
            "all_clear": len(all_anomalies) == 0
        }

        if scan_result["all_clear"]:
            print(f"\n  ✓ ALL CLEAR — No anomalies detected across {len(self.providers)} provider(s)")
        else:
            print(f"\n  ⚠ {len(all_anomalies)} total anomaly(ies) detected and anchored")

        return scan_result

    def get_alert_history(self) -> list:
        """Return all historical alerts for this engine instance."""
        return self.alerts_history

    def schedule_monitoring(self, patient_id: str, wallet_seed: str, interval_minutes: int = 60, duration_hours: int = 72) -> dict:
        """
        Schedule recurring monitoring scans.
        In prototype, simulates the schedule. In production, would use
        APScheduler, Celery, or a cloud function trigger.
        """
        total_scans = (duration_hours * 60) // interval_minutes
        print(f"\n  ✓ Monitoring scheduled for patient {patient_id}")
        print(f"    Interval: every {interval_minutes} minutes")
        print(f"    Duration: {duration_hours} hours ({total_scans} total scans)")
        print(f"    Procedure: {self.procedure_type or 'general'}")
        print(f"    Providers: {', '.join(self.providers.keys())}")

        if PROTOTYPE_MODE:
            return {
                "scheduled": True,
                "patient_id": patient_id,
                "interval_minutes": interval_minutes,
                "duration_hours": duration_hours,
                "total_scans": total_scans,
                "next_scan": _timestamp(),
                "mock": True,
                "note": "In production, use APScheduler/Celery/Cloud Functions for real scheduling"
            }


# ═══════════════════════════════════════════════════════════════════════════════
# DEMO / USAGE EXAMPLE
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print(" SOLUS PROTOCOL ANOMALY DETECTION ENGINE — Prototype Demo")
    print("=" * 70)

    # Initialize
    sdk = SolusSDK(wallet_seed="sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS", testnet=True, api_key="valid_mock_key")
    patient_seed = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"

    # Create engine for post-cardiac-surgery monitoring
    engine = AnomalyEngine(sdk, procedure_type="cardiac_surgery")

    # ── 1. Connect Wearable Providers ──
    print("\n" + "─" * 50)
    print(" 1. CONNECTING WEARABLE PROVIDERS")
    print("─" * 50)
    engine.add_provider(FitbitProvider())
    engine.add_provider(AppleHealthProvider())
    engine.add_provider(DexcomProvider())
    engine.add_provider(WithingsProvider())

    # ── 2. Load ONNX Model ──
    print("\n" + "─" * 50)
    print(" 2. LOADING ML ANOMALY MODEL")
    print("─" * 50)
    engine.load_onnx_model()

    # ── 3. Run Anomaly Scan ──
    print("\n" + "─" * 50)
    print(" 3. RUNNING ANOMALY SCAN")
    print("─" * 50)
    results = engine.scan_all_providers(
        patient_id="PT-44521",
        wallet_seed=patient_seed,
        hours_back=24
    )

    print(f"\n  Summary:")
    print(f"    Providers scanned: {len(results['providers_scanned'])}")
    print(f"    Anomalies found: {results['anomalies_detected']}")
    print(f"    Records anchored: {results['anchored']}")

    # ── 4. Schedule Monitoring ──
    print("\n" + "─" * 50)
    print(" 4. SCHEDULING CONTINUOUS MONITORING")
    print("─" * 50)
    schedule = engine.schedule_monitoring(
        patient_id="PT-44521",
        wallet_seed=patient_seed,
        interval_minutes=30,
        duration_hours=72
    )

    # ── 5. Alert History ──
    print("\n" + "─" * 50)
    print(" 5. ALERT HISTORY")
    print("─" * 50)
    history = engine.get_alert_history()
    if history:
        for alert in history:
            print(f"  [{alert['severity'].upper()}] {alert['type']} — {alert['message']}")
            print(f"    TX: {alert.get('tx_hash', 'N/A')}")
    else:
        print("  No alerts in this session (all vitals within normal range)")

    print("\n" + "=" * 70)
    print(" ANOMALY ENGINE DEMO COMPLETE")
    print(" Connected providers: Fitbit, Apple Health, Dexcom, Withings")
    print(" All using mock OAuth2 — swap MOCK_* constants for production")
    print(" McKinsey est: $40-50B/yr in post-discharge complication costs")
    print(" Solus Protocol catches anomalies in hours, not days")
    print("=" * 70)
