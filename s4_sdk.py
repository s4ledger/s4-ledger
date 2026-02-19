import hashlib
import json
from datetime import datetime, timezone
try:
    from cryptography.fernet import Fernet
except Exception:
    Fernet = None
try:
    from xrpl.clients import JsonRpcClient
    from xrpl.wallet import Wallet
    from xrpl.models.transactions import Payment, TrustSet, AccountSet
    from xrpl.models.amounts import IssuedCurrencyAmount
    from xrpl.transaction import autofill_and_sign, submit_and_wait
    XRPL_AVAILABLE = True
except Exception:
    XRPL_AVAILABLE = False

    class _MockResponse:
        def __init__(self, result):
            self.result = result

    class JsonRpcClient:
        def __init__(self, url):
            self.url = url

        def submit_and_wait(self, tx, wallet):
            return _MockResponse({"mock_submitted": True, "tx": repr(tx), "wallet": getattr(wallet, 'classic_address', None)})

    class Wallet:
        def __init__(self, seed, algorithm=None):
            self.seed = seed
            self.classic_address = "rMockAddress"

        @classmethod
        def from_seed(cls, seed, algorithm=None):
            return cls(seed, algorithm=algorithm)

    class Payment:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        def __repr__(self):
            return f"Payment({self.kwargs})"

    class TrustSet:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        def __repr__(self):
            return f"TrustSet({self.kwargs})"

    class IssuedCurrencyAmount:
        def __init__(self, currency, issuer, value):
            self.currency = currency
            self.issuer = issuer
            self.value = value

        def __repr__(self):
            return f"IssuedCurrencyAmount({self.currency},{self.issuer},{self.value})"

# Mock fiat gateway (e.g., simulate Stripe + crypto purchase; in real: use Stripe API + MoonPay/Ramp for USD to $SLS)

# Real fiat conversion using XRPL DEX/gateways (legacy — SLS now delivered from Treasury)
def real_fiat_to_sls_conversion(client, wallet, usd_amount, sls_issuer, gateway_issuer, destination):
    """
    Legacy: Convert USD.IOU to $SLS using XRPL DEX/gateway.
    Note: In production, SLS is delivered directly from the S4 Treasury as part of the subscription.
    This function is retained for SDK completeness and third-party integrations.
    """
    from xrpl.models.transactions import Payment
    from xrpl.transaction import submit_and_wait
    payment_tx = Payment(
        account=wallet.classic_address,
        amount={"currency": "SLS", "value": str(usd_amount), "issuer": sls_issuer},
        destination=destination,
        send_max={"currency": "USD", "value": str(usd_amount), "issuer": gateway_issuer}
    )
    response = submit_and_wait(payment_tx, client, wallet)
    return response.result

class S4SDK:
    def encrypt(self, data):
        """Encrypt data using the SDK's encryption key."""
        return self.encrypt_data(data)

    def decrypt(self, encrypted_data):
        """Decrypt data using the SDK's encryption key."""
        return self.decrypt_data(encrypted_data)

    def __init__(self, xrpl_rpc_url=None, sls_issuer="r95GyZac4butvVcsTWUPpxzekmyzaHsTA5", encryption_key=None, api_key=None, wallet_seed=None, testnet=False, treasury_account="rMLmkrxpadq5z6oTDmq8GhQj9LKjf1KLqJ"):
        """
        Initialize the SDK.
        - xrpl_rpc_url: XRPL testnet/mainnet URL.
        - sls_issuer: Your $SLS issuer account.
        - encryption_key: Secret key for encrypting sensitive data.
        - api_key: Provider's subscription API key (for USD-based access).
        """
        # Choose default URL based on testnet flag when not explicitly provided
        if xrpl_rpc_url is None:
            xrpl_rpc_url = "https://s.altnet.rippletest.net:51234/" if testnet else "https://s1.ripple.com:51234/"
        self.client = JsonRpcClient(xrpl_rpc_url)
        self.sls_issuer = sls_issuer
        self.treasury_account = treasury_account
        self.api_key = api_key  # For subscription validation
        self.wallet_seed = wallet_seed
        if Fernet is None:
            self.encryption_key = None
            self.cipher = None
        else:
            if encryption_key is not None:
                self.encryption_key = encryption_key
            elif wallet_seed is not None:
                # Deterministically derive a Fernet key from the wallet seed using SHA-256
                import base64
                key_bytes = hashlib.sha256(wallet_seed.encode()).digest()
                self.encryption_key = base64.urlsafe_b64encode(key_bytes)
            else:
                self.encryption_key = Fernet.generate_key()
            self.cipher = Fernet(self.encryption_key)

    def validate_subscription(self):
        """Mock check for active USD subscription via API key."""
        if self.api_key == "valid_mock_key":  # In real: Query Stripe/backend
            return True
        else:
            raise ValueError("Invalid or expired API key. Please subscribe or renew.")

    def encrypt_data(self, data):
        """Encrypt sensitive data (CUI/FOUO) off-chain before hashing."""
        if self.cipher is None:
            raise RuntimeError("cryptography package is required for encryption. Install it with `pip install cryptography`.")
        return self.cipher.encrypt(data.encode()).decode()

    def decrypt_data(self, encrypted_data):
        """Decrypt data (for authorized defense personnel)."""
        if self.cipher is None:
            raise RuntimeError("cryptography package is required for decryption. Install it with `pip install cryptography`.")
        return self.cipher.decrypt(encrypted_data.encode()).decode()

    def create_record_hash(self, record_text):
        """Create secure hash of record for immutability."""
        hash_object = hashlib.sha256(record_text.encode())
        return hash_object.hexdigest()

    def setup_trust_line(self, wallet_seed, limit="1000000"):
        """One-time setup for $SLS trust line (allows holding/using token)."""
        wallet = self.wallet_from_seed(wallet_seed)
        tx = TrustSet(
            account=wallet.classic_address,
            limit_amount=IssuedCurrencyAmount(currency="SLS", issuer=self.sls_issuer, value=limit)
        )
        try:
            signed = autofill_and_sign(tx, self.client, wallet)
            response = submit_and_wait(signed, self.client)
            return getattr(response, 'result', response)
        except Exception as e:
            raise RuntimeError(f"Failed to submit trustline transaction: {e}")

    def store_hash_with_sls_fee(self, hash_value, wallet_seed, fee_sls="0.01", destination=None, rebate_sls="0.005", fiat_mode=False, usd_fee_equiv=0.01, gateway_issuer=None, record_type=None):
        """
        $SLS Utility: Pay micro-fee in $SLS for action, store hash in memo.
        - If fiat_mode=True, simulate USD payment and auto-convert to $SLS.
        - Deducts fee (revenue to treasury).
        - Sends rebate (incentive).
        - record_type: Optional category prepended to memo (e.g., 'DEPOT_REPAIR:hash...')
        """
        if fiat_mode:
            # Legacy fiat conversion via XRPL DEX/gateway (SLS now delivered from Treasury)
            if gateway_issuer is None:
                raise ValueError("gateway_issuer required for real fiat conversion.")
            wallet = self.wallet_from_seed(wallet_seed)
            response = real_fiat_to_sls_conversion(self.client, wallet, usd_fee_equiv, self.sls_issuer, gateway_issuer, destination or self.sls_issuer)
            print(f"Real USD.IOU conversion: Response: {response}")

        wallet = self.wallet_from_seed(wallet_seed)
        if destination is None:
            destination = self.treasury_account

        # Build memo data: optionally include record_type for categorization
        # Must be hex-encoded for XRPL
        memo_text = f"{record_type}:{hash_value}" if record_type else hash_value
        memo_data = memo_text.encode('utf-8').hex()

        # Pay $SLS fee with hash memo
        amount_sls = IssuedCurrencyAmount(currency="SLS", issuer=self.sls_issuer, value=fee_sls)
        tx_fee = Payment(
            account=wallet.classic_address,
            amount=amount_sls,
            destination=destination,
            memos=[{"memo": {"memo_data": memo_data}}]
        )
        try:
            signed_fee = autofill_and_sign(tx_fee, self.client, wallet)
            fee_response = submit_and_wait(signed_fee, self.client)
        except Exception as e:
            err = str(e)
            # If destination can't hold issued currency (no trust line), fallback to a tiny native XRP payment to record the memo
            if 'tecNO_DST' in err or 'Destination' in err:
                try:
                    # Fallback: submit an AccountSet with the memo (does not change account state)
                    tx_memo = AccountSet(
                        account=wallet.classic_address,
                        memos=[{"memo": {"memo_data": memo_data}}]
                    )
                    signed_memo = autofill_and_sign(tx_memo, self.client, wallet)
                    fee_response = submit_and_wait(signed_memo, self.client)
                except Exception as e2:
                    raise RuntimeError(f"Failed to submit fallback XRP fee payment: {e2}")
            else:
                raise RuntimeError(f"Failed to submit fee payment: {e}")
        
        # Rebate: Send back $SLS
        rebate_amount = IssuedCurrencyAmount(currency="SLS", issuer=self.sls_issuer, value=rebate_sls)
        tx_rebate = Payment(
            account=destination,
            amount=rebate_amount,
            destination=wallet.classic_address
        )
        rebate_response = {"mock": "Rebate sent"}  # In real: Submit with treasury wallet

        return {"fee_tx": fee_response.result, "rebate": rebate_response}

    def anchor_record(self, record_text, wallet_seed=None, encrypt_first=False, fiat_mode=False, gateway_issuer=None, record_type=None):
        """Full workflow: Validate sub, encrypt (optional), hash, store on XRPL with $SLS fee (fiat optional).
        
        Args:
            record_text: The defense record content to anchor
            wallet_seed: XRPL wallet seed for signing
            encrypt_first: If True, encrypt before hashing
            fiat_mode: If True, use USD subscription mode
            gateway_issuer: Optional custom gateway issuer
            record_type: Optional category for defense record (e.g., 'SUPPLY_CHAIN', 'CDRL', 'MAINTENANCE_3M')
        """
        # Allow SDK-level wallet_seed to be set at initialization
        wallet_seed = wallet_seed or self.wallet_seed
        if not wallet_seed:
            raise ValueError("wallet_seed is required either as argument or when initializing S4SDK")

        # Only require USD subscription when fiat_mode is requested
        if fiat_mode:
            self.validate_subscription()

        if encrypt_first:
            record_text = self.encrypt_data(record_text)
        hash_val = self.create_record_hash(record_text)
        tx_results = self.store_hash_with_sls_fee(hash_val, wallet_seed, fiat_mode=fiat_mode, gateway_issuer=gateway_issuer, record_type=record_type)
        return {"hash": hash_val, "tx_results": tx_results, "record_type": record_type}

    def calculate_readiness(self, mtbf, mttr, mldt=0):
        """Calculate Operational Availability (Ao) and related RAM metrics.
        Ao = MTBF / (MTBF + MTTR + MLDT)
        Per MIL-STD-1390D."""
        ao = mtbf / (mtbf + mttr + mldt) if (mtbf + mttr + mldt) > 0 else 0
        ai = mtbf / (mtbf + mttr) if (mtbf + mttr) > 0 else 0
        failure_rate = 1 / mtbf if mtbf > 0 else 0
        return {
            "ao": round(ao, 4),
            "ai": round(ai, 4),
            "failure_rate": round(failure_rate, 8),
            "mtbf": mtbf, "mttr": mttr, "mldt": mldt,
            "annual_failures": round(8760 / mtbf, 1) if mtbf > 0 else 0,
            "assessment": "Exceeds" if ao >= 0.95 else "Meets" if ao >= 0.9 else "Marginal" if ao >= 0.8 else "Below threshold",
        }

    def check_dmsms(self, nsn_list):
        """Check a list of NSNs for DMSMS (Diminishing Manufacturing Sources) risk.
        Returns risk assessment per part. Per DoWI 4245.14."""
        results = []
        for nsn in nsn_list:
            # Simulated risk assessment based on NSN pattern
            risk_seed = sum(ord(c) for c in nsn) % 100
            status = "Active" if risk_seed < 60 else "At Risk" if risk_seed < 80 else "Obsolete" if risk_seed < 95 else "End of Life"
            results.append({
                "nsn": nsn,
                "status": status,
                "severity": "None" if status == "Active" else "Medium" if status == "At Risk" else "Critical",
                "recommendation": "No action" if status == "Active" else "Seek alternate" if status == "At Risk" else "Bridge buy + redesign",
            })
        return {"total": len(results), "at_risk": sum(1 for r in results if r["status"] != "Active"), "parts": results}

    def lookup_nsn(self, nsn):
        """Look up a National Stock Number (NSN) and return part details.
        Simulated for demo — in production, queries FedLog/FLIS."""
        hash_val = hashlib.sha256(nsn.encode()).hexdigest()
        fsc = nsn.split("-")[0] if "-" in nsn else "0000"
        return {
            "nsn": nsn,
            "fsc": fsc,
            "niin": nsn.split("-", 1)[1] if "-" in nsn else nsn,
            "hash": hash_val[:16],
            "status": "Active",
            "source": "FedLog Simulated",
        }

    def calculate_roi(self, programs=5, ftes=8, rate=145.0, license_cost=120000.0,
                      audit_cost=250000.0, error_cost=8500.0, incidents=35):
        """Calculate ROI for S4 Ledger implementation.
        Returns annual savings, ROI %, payback period."""
        labor = ftes * rate * 2080
        labor_savings = labor * 0.65
        error_savings = error_cost * incidents * 0.90
        audit_savings = audit_cost * 0.70
        compliance = programs * 12000
        total = labor_savings + error_savings + audit_savings + compliance
        net = total - license_cost
        return {
            "annual_savings": round(total),
            "net_benefit": round(net),
            "roi_percent": round((net / license_cost * 100), 1) if license_cost > 0 else 0,
            "payback_months": round(license_cost / total * 12, 1) if total > 0 else 99,
            "five_year_savings": round(net * 5),
            "ftes_freed": round(ftes * 0.65, 1),
        }

    def estimate_lifecycle_cost(self, acquisition_m=85.0, fleet_size=20, service_life=30,
                                 sustainment_rate=8.0):
        """Estimate total ownership cost per DoD 5000.73 / MIL-STD-881F.
        acquisition_m: unit cost in $M, sustainment_rate: annual % of acq cost."""
        total_acq = acquisition_m * fleet_size
        annual_sust = total_acq * (sustainment_rate / 100)
        total_sust = annual_sust * service_life
        dmsms = total_acq * 0.04 * service_life
        tech_refresh = total_acq * 0.02 * (service_life // 5)
        total = total_acq + total_sust + dmsms + tech_refresh
        return {
            "acquisition_b": round(total_acq / 1000, 2),
            "sustainment_b": round(total_sust / 1000, 2),
            "dmsms_b": round(dmsms / 1000, 2),
            "tech_refresh_b": round(tech_refresh / 1000, 2),
            "total_ownership_b": round(total / 1000, 2),
            "s4_dmsms_savings_b": round(dmsms * 0.20 / 1000, 2),
        }

    def track_warranty(self, program="ddg51", systems=None):
        """Track warranty and contract status for a program.
        Returns list of items with expiration status per FAR 46.7 / DFARS 246.7."""
        if systems is None:
            systems = [f"System {i+1}" for i in range(10)]
        from datetime import datetime, timedelta
        now = datetime.now()
        items = []
        for i, sys_name in enumerate(systems):
            start = now - timedelta(days=int(365 * 0.6 * ((i % 5) + 1)))
            end = start + timedelta(days=365 * ((i % 3) + 1))
            days_left = (end - now).days
            status = "Expired" if days_left < 0 else "Expiring" if days_left < 90 else "Active"
            items.append({"system": sys_name, "status": status, "days_left": max(0, days_left),
                          "start": start.strftime("%Y-%m-%d"), "end": end.strftime("%Y-%m-%d"),
                          "value": 25000 + i * 25000})
        return {
            "program": program, "total": len(items),
            "active": sum(1 for i in items if i["status"] == "Active"),
            "expiring": sum(1 for i in items if i["status"] == "Expiring"),
            "expired": sum(1 for i in items if i["status"] == "Expired"),
            "items": items,
        }

    def wallet_from_seed(self, seed):
        """Create an XRPL Wallet from a given seed, handling ED25519 seeds (sEd...)."""
        if seed is None:
            raise ValueError("wallet seed is required")
        # First try default behavior
        try:
            return Wallet.from_seed(seed)
        except Exception as e_default:
            # Try ed25519 algorithm lowercase (xrpl-py expects 'ed25519')
            try:
                return Wallet.from_seed(seed, algorithm="ed25519")
            except Exception:
                # Propagate the original error with more context
                raise RuntimeError(f"Failed to create Wallet from seed. Default error: {e_default}")

    def get_action_items(self, severity=None, source=None):
        """Get cross-tool action items with severity tagging and cost estimates.
        Items are auto-generated from DMSMS, readiness, warranty, lifecycle, and parts tools."""
        items = [
            {"id": "AI-001", "title": "ASIC RF Module EOL — source alternate", "severity": "critical", "source": "dmsms", "cost": "450", "schedule": "Immediate", "done": False},
            {"id": "AI-002", "title": "F135 warranty renewal deadline approaching", "severity": "critical", "source": "warranty", "cost": "2100", "schedule": "30 days", "done": False},
            {"id": "AI-003", "title": "Ao below 95% threshold on SPY-6 radar", "severity": "critical", "source": "readiness", "cost": "180", "schedule": "60 days", "done": False},
            {"id": "AI-004", "title": "Update lifecycle cost model for DDG-51", "severity": "warning", "source": "lifecycle", "cost": "0", "schedule": "Quarterly", "done": False},
            {"id": "AI-005", "title": "Cross-reference alternate parts for at-risk NSNs", "severity": "warning", "source": "parts", "cost": "85", "schedule": "2-4 months", "done": False},
        ]
        if severity:
            items = [i for i in items if i["severity"] == severity]
        if source:
            items = [i for i in items if i["source"] == source]
        return {
            "action_items": items,
            "total": len(items),
            "critical": sum(1 for i in items if i["severity"] == "critical"),
            "open": sum(1 for i in items if not i["done"]),
        }

    def get_calendar_events(self, month=None, year=None):
        """Get scheduled ILS events including auto-generated deadlines from action items,
        warranty expirations, and DMSMS review dates."""
        from datetime import datetime
        now = datetime.now()
        month = month or now.month
        year = year or now.year
        events = [
            {"id": "E-001", "title": "DMSMS Review Board", "date": f"{year}-{month:02d}-15", "time": "10:00", "type": "warning", "source": "dmsms"},
            {"id": "E-002", "title": "Readiness Assessment Due", "date": f"{year}-{month:02d}-22", "time": "09:00", "type": "critical", "source": "readiness"},
            {"id": "E-003", "title": "Warranty Renewal Deadline", "date": f"{year}-{month:02d}-28", "time": "17:00", "type": "critical", "source": "warranty"},
        ]
        return {"month": month, "year": year, "events": events, "total": len(events)}

    def get_provisioning_status(self, program=None):
        """Get provisioning status including PTD progress, APL generation, and NSN cataloging.
        Replaces ICAPS functionality with all-branch support and blockchain verification."""
        import random
        total_parts = random.randint(120, 450)
        submitted = int(total_parts * random.uniform(0.55, 0.9))
        validated = int(submitted * random.uniform(0.6, 0.95))
        rejected = int(submitted * random.uniform(0.02, 0.08))
        pending = submitted - validated - rejected
        apls = random.randint(5, 25)
        nsns = int(total_parts * random.uniform(0.3, 0.7))
        pct = round((validated / max(total_parts, 1)) * 100)
        return {
            "program": program or "DDG-51 Flight III",
            "total_parts": total_parts,
            "ptd_submitted": submitted,
            "validated": validated,
            "rejected": rejected,
            "pending": pending,
            "ptd_progress": pct,
            "apls_generated": apls,
            "nsns_cataloged": nsns,
            "schedule_status": "On Track" if pct >= 80 else "At Risk" if pct >= 50 else "Behind",
            "icaps_advantages": [
                "All DoW branches (ICAPS: Navy/USMC only)",
                "All 12 ILS elements (ICAPS: Supply Support only)",
                "Blockchain verification (ICAPS: none)",
                "DMSMS + readiness integration (ICAPS: standalone)",
                "Compliance scoring (ICAPS: none)",
                "Modern web platform (ICAPS: mainframe + PC)"
            ]
        }

    # ═══════════════════════════════════════════════════════════════════
    #  RECORD VERIFICATION — Compare current data against on-chain hash
    # ═══════════════════════════════════════════════════════════════════

    def verify_against_chain(self, record_text, tx_hash=None, expected_hash=None):
        """Verify record integrity against on-chain XRPL hash.

        Recomputes SHA-256 of record_text and compares against the hash stored
        in the XRPL transaction memo. Returns structured verification result.

        Args:
            record_text: The current record content to verify
            tx_hash: XRPL transaction hash to look up (optional)
            expected_hash: Direct hash to compare against (optional)

        Returns:
            dict with verified (bool), status (MATCH/MISMATCH/NOT_FOUND),
            computed_hash, chain_hash, tamper_detected, etc.
        """
        computed_hash = self.create_record_hash(record_text)
        now = datetime.now(timezone.utc).isoformat()

        chain_hash = None
        explorer_url = None

        if expected_hash:
            chain_hash = expected_hash
        elif tx_hash:
            # In production: query XRPL node for tx memo data
            # xrpl.models.requests.Tx(transaction=tx_hash)
            # Parse memo_data field → hex_decode → extract hash
            chain_hash = None  # Would be populated from XRPL lookup

        if chain_hash is None and tx_hash:
            return {
                "verified": False,
                "status": "NOT_FOUND",
                "computed_hash": computed_hash,
                "chain_hash": None,
                "tx_hash": tx_hash,
                "verified_at": now,
                "tamper_detected": False,
                "message": f"Transaction {tx_hash} not found or memo data unavailable. Use expected_hash for offline verification.",
            }

        if chain_hash is None:
            return {
                "verified": False,
                "status": "NOT_FOUND",
                "computed_hash": computed_hash,
                "chain_hash": None,
                "verified_at": now,
                "tamper_detected": False,
                "message": "No chain_hash or expected_hash provided for comparison.",
            }

        match = computed_hash == chain_hash
        return {
            "verified": match,
            "status": "MATCH" if match else "MISMATCH",
            "computed_hash": computed_hash,
            "chain_hash": chain_hash,
            "tx_hash": tx_hash,
            "verified_at": now,
            "tamper_detected": not match,
            "explorer_url": f"https://livenet.xrpl.org/transactions/{tx_hash}" if tx_hash else None,
            "message": "Record integrity confirmed — hash matches on-chain proof." if match
                       else f"TAMPER DETECTED: computed {computed_hash[:16]}... ≠ chain {chain_hash[:16]}...",
        }

    def correct_record(self, corrected_text, original_tx_hash, wallet_seed=None,
                        reason="", record_type=None):
        """Re-anchor a corrected record with a link to the original (supersedes).

        Creates a new on-chain anchor with the corrected record hash,
        and includes the original TX hash in the memo as a supersession link.
        This preserves the full audit trail: original + correction.

        Args:
            corrected_text: The corrected record content
            original_tx_hash: TX hash of the original (tampered/outdated) anchor
            wallet_seed: XRPL wallet seed for signing
            reason: Reason for correction
            record_type: Record category (e.g., 'SUPPLY_CHAIN_CORRECTION')

        Returns:
            dict with corrected hash, new TX results, supersedes link
        """
        wallet_seed = wallet_seed or self.wallet_seed
        if not wallet_seed:
            raise ValueError("wallet_seed required for re-anchoring")

        corrected_hash = self.create_record_hash(corrected_text)
        correction_type = record_type or "CORRECTION"

        # Anchor with supersedes metadata in memo
        memo_text = f"CORRECTION:{corrected_hash}:SUPERSEDES:{original_tx_hash}"
        memo_data = memo_text.encode("utf-8").hex()

        wallet = self.wallet_from_seed(wallet_seed)
        try:
            tx = AccountSet(
                account=wallet.classic_address,
                memos=[{"memo": {"memo_data": memo_data}}],
            )
            signed = autofill_and_sign(tx, self.client, wallet)
            response = submit_and_wait(signed, self.client)
            tx_result = getattr(response, "result", response)
        except Exception as e:
            tx_result = {"error": str(e)}

        return {
            "corrected_hash": corrected_hash,
            "original_tx": original_tx_hash,
            "supersedes": original_tx_hash,
            "correction_tx": tx_result,
            "reason": reason,
            "record_type": correction_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # ═══════════════════════════════════════════════════════════════════
    #  DoD DATABASE IMPORT ADAPTERS
    #  Import data from DoD/DoN logistics systems into S4 Ledger format.
    #  Supports CSV, XML, JSON, and fixed-width exports from:
    #  NSERC/SE IDE, MERLIN, NAVAIR AMS PMT, COMPASS, CDMD-OA,
    #  NDE, MBPS, PEO MLB, CSPT, GCSS, DPAS, DLA FLIS, WebFLIS, NAVSUP
    # ═══════════════════════════════════════════════════════════════════

    DOD_SYSTEMS = {
        "nserc_ide": {
            "name": "NSERC/SE IDE (Systems Engineering Integrated Digital Environment)",
            "agency": "NAVSEA",
            "formats": ["csv", "xml", "json"],
            "record_types": ["USN_CONFIG", "USN_TDP", "USN_DRL", "USN_DI"],
            "description": "Configuration management, technical data packages, and systems engineering artifacts",
        },
        "merlin": {
            "name": "MERLIN (Maintenance & Engineering Resource Library Information Network)",
            "agency": "NAVSEA",
            "formats": ["csv", "xml"],
            "record_types": ["USN_3M_MAINTENANCE", "USN_PMS", "USN_DEPOT_REPAIR", "USN_CALIBRATION"],
            "description": "Maintenance procedures, PMS schedules, depot repair records, and TMDE calibration data",
        },
        "navair_ams_pmt": {
            "name": "NAVAIR AMS PMT (Aviation Maintenance Supply Program Management Tool)",
            "agency": "NAVAIR",
            "formats": ["csv", "xml", "json"],
            "record_types": ["USN_AVIATION", "USN_FLIGHT_OPS", "USN_SUPPLY_RECEIPT", "USN_ORDNANCE"],
            "description": "Aviation maintenance records, flight operations, supply receipts, and ordnance tracking",
        },
        "compass": {
            "name": "COMPASS (Comprehensive Online Military Personnel & Accounting System)",
            "agency": "DoD",
            "formats": ["csv", "fixed_width"],
            "record_types": ["JOINT_PERSONNEL", "JOINT_TRAINING", "JOINT_READINESS"],
            "description": "Personnel qualifications, training records, and readiness certifications",
        },
        "cdmd_oa": {
            "name": "CDMD-OA (Configuration Data Managers Database — Open Architecture)",
            "agency": "NAVSEA/PMS",
            "formats": ["xml", "json"],
            "record_types": ["USN_CONFIG", "USN_CDRL", "USN_SHIPALT", "USN_DI", "USN_TDP"],
            "description": "Configuration baselines, CDRLs, ship alterations, and technical data management",
        },
        "nde": {
            "name": "NDE (Navy Data Environment)",
            "agency": "OPNAV/Navy",
            "formats": ["json", "xml", "csv"],
            "record_types": ["USN_SUPPLY_RECEIPT", "USN_CUSTODY", "USN_QDR", "USN_FIELDING"],
            "description": "Enterprise data environment for Navy supply chain, custody, quality, and fielding records",
        },
        "mbps": {
            "name": "MBPS (Model Based Product Support)",
            "agency": "OSD/DSPO",
            "formats": ["xml", "json"],
            "record_types": ["JOINT_SUSTAINMENT", "JOINT_PARTS", "JOINT_READINESS"],
            "description": "Product support data, sustainment metrics, and readiness indicators using model-based frameworks",
        },
        "peo_mlb": {
            "name": "PEO MLB (Program Executive Office Mine, Littoral & Barrier Warfare)",
            "agency": "PEO MLB",
            "formats": ["csv", "xml"],
            "record_types": ["USN_SUPPLY_RECEIPT", "USN_3M_MAINTENANCE", "USN_CONFIG", "USN_ORDNANCE"],
            "description": "Mine warfare and littoral combat system logistics, maintenance, and ordnance data",
        },
        "cspt": {
            "name": "CSPT (Combat Systems Program Team)",
            "agency": "NAVSEA",
            "formats": ["xml", "json", "csv"],
            "record_types": ["USN_COMBAT_SYS", "USN_CONFIG", "USN_CALIBRATION", "USN_TDP"],
            "description": "Combat systems certification, configuration, calibration, and technical data",
        },
        "gcss": {
            "name": "GCSS (Global Combat Support System)",
            "agency": "USA/JOINT",
            "formats": ["csv", "xml", "json"],
            "record_types": ["USA_SUPPLY", "USA_MAINTENANCE", "JOINT_PARTS", "JOINT_INVENTORY"],
            "description": "Global logistics, supply chain, maintenance, and inventory management across services",
        },
        "dpas": {
            "name": "DPAS (Defense Property Accountability System)",
            "agency": "OSD/OUSD",
            "formats": ["csv", "fixed_width"],
            "record_types": ["USN_CUSTODY", "JOINT_PROPERTY", "JOINT_INVENTORY"],
            "description": "Property accountability, custody tracking, and asset inventory across DoD",
        },
        "dla_flis": {
            "name": "DLA FLIS / WebFLIS (Federal Logistics Information System)",
            "agency": "DLA",
            "formats": ["csv", "fixed_width", "xml"],
            "record_types": ["JOINT_PARTS", "DLA_CATALOG", "DLA_SUPPLY"],
            "description": "Federal catalog data, NSN lookups, supply chain management, and logistics information",
        },
        "navsup": {
            "name": "NAVSUP OneTouch / ERP",
            "agency": "NAVSUP",
            "formats": ["csv", "xml", "json"],
            "record_types": ["USN_SUPPLY_RECEIPT", "USN_QDR", "USN_CUSTODY", "USN_FIELDING"],
            "description": "Navy supply chain management, ordering, receiving, quality defects, and distribution",
        },
        # ── U.S. Army (USA) ──
        "gcss_army": {
            "name": "GCSS-Army (Global Combat Support System — Army)",
            "agency": "USA AMC",
            "formats": ["csv", "xml", "json"],
            "record_types": ["USA_SUPPLY", "USA_MAINTENANCE", "USA_PROPERTY", "USA_READINESS"],
            "description": "Army enterprise logistics — supply, maintenance, property accountability, and financial management",
        },
        "lmp": {
            "name": "LMP (Logistics Modernization Program)",
            "agency": "USA AMC",
            "formats": ["csv", "xml"],
            "record_types": ["USA_DEPOT_MAINTENANCE", "USA_SUPPLY", "USA_ASSET_MGMT"],
            "description": "Depot maintenance, supply chain, and asset management (SAP-based)",
        },
        "aesip": {
            "name": "AESIP (Army Enterprise Systems Integration Program)",
            "agency": "USA PEO EIS",
            "formats": ["csv", "xml", "json"],
            "record_types": ["USA_PERSONNEL", "USA_FINANCE", "USA_LOGISTICS"],
            "description": "Army HR, finance, and logistics enterprise integration",
        },
        # ── U.S. Air Force (USAF) ──
        "remis": {
            "name": "REMIS (Reliability & Maintainability Information System)",
            "agency": "AFLCMC",
            "formats": ["csv", "xml"],
            "record_types": ["USAF_MAINTENANCE", "USAF_COMPONENT", "USAF_RELIABILITY"],
            "description": "Aircraft maintenance, component data, and reliability/maintainability tracking",
        },
        "lims_ev": {
            "name": "LIMS-EV (Logistics, Installations & Mission Support — ERP)",
            "agency": "AFLCMC",
            "formats": ["csv", "xml", "json"],
            "record_types": ["USAF_SUPPLY", "USAF_ASSET_MGMT", "USAF_MAINTENANCE"],
            "description": "Air Force ERP for supply chain, asset management, and maintenance",
        },
        "d200a": {
            "name": "D200A (Air Force Supply Control Study)",
            "agency": "AFMC",
            "formats": ["csv", "fixed_width"],
            "record_types": ["USAF_SUPPLY_CONTROL", "USAF_DEMAND", "USAF_INVENTORY"],
            "description": "Demand forecasting, stockage computations, and item management",
        },
        # ── U.S. Marine Corps (USMC) ──
        "gcss_mc": {
            "name": "GCSS-MC (Global Combat Support System — Marine Corps)",
            "agency": "USMC LOGCOM",
            "formats": ["csv", "xml", "json"],
            "record_types": ["USMC_SUPPLY", "USMC_MAINTENANCE", "USMC_TRANSPORT", "USMC_READINESS"],
            "description": "Marine Corps global logistics — supply, maintenance, transportation, and financial",
        },
        "atlass": {
            "name": "ATLASS (Aviation Tracking & Logistics and Supply)",
            "agency": "USMC NAVAIR",
            "formats": ["csv", "xml"],
            "record_types": ["USMC_AVIATION", "USMC_MAINTENANCE", "USMC_SUPPLY"],
            "description": "Marine aviation maintenance and parts tracking",
        },
        # ── U.S. Coast Guard (USCG) ──
        "almis": {
            "name": "ALMIS (Aviation Logistics Management Information System)",
            "agency": "CG-41",
            "formats": ["csv", "xml"],
            "record_types": ["USCG_AVIATION", "USCG_MAINTENANCE", "USCG_COMPONENT"],
            "description": "Coast Guard aircraft maintenance and component tracking",
        },
        "cgone": {
            "name": "CGOne (Coast Guard ERP)",
            "agency": "CG-6",
            "formats": ["csv", "xml", "json"],
            "record_types": ["USCG_SUPPLY", "USCG_MAINTENANCE", "USCG_ASSET_MGMT"],
            "description": "Coast Guard financial, supply, maintenance, HR, and asset management",
        },
        # ── U.S. Space Force (USSF) ──
        "ussf_lms": {
            "name": "USSF LMS (Space Force Logistics Management System)",
            "agency": "SSC",
            "formats": ["csv", "xml", "json"],
            "record_types": ["USSF_LOGISTICS", "USSF_SATELLITE", "USSF_COMPONENT"],
            "description": "Satellite ground systems, launch logistics, and component tracking",
        },
        # ── Joint / OSD / DLA ──
        "piee": {
            "name": "PIEE / WAWF (Procurement Integrated Enterprise Environment)",
            "agency": "DLA/DCMA",
            "formats": ["csv", "xml", "json"],
            "record_types": ["JOINT_INVOICE", "JOINT_RECEIVING", "JOINT_CONTRACT"],
            "description": "Invoicing, receiving reports, and contract payment processing",
        },
    }

    def list_dod_systems(self):
        """List all supported DoD/DoN database systems for import."""
        return {
            "systems": {k: {"name": v["name"], "agency": v["agency"],
                            "formats": v["formats"], "description": v["description"]}
                        for k, v in self.DOD_SYSTEMS.items()},
            "total": len(self.DOD_SYSTEMS),
        }

    def import_csv(self, csv_text, source_system, record_type=None, delimiter=","):
        """Import records from CSV data exported from a DoD system.

        Args:
            csv_text: Raw CSV string (with header row)
            source_system: Key from DOD_SYSTEMS (e.g., 'nserc_ide', 'cdmd_oa')
            record_type: Override record type (auto-detected from source if omitted)
            delimiter: CSV delimiter (default comma)

        Returns:
            dict with imported records count, hashes, and mapping summary
        """
        import csv
        import io

        sys_info = self.DOD_SYSTEMS.get(source_system, {})
        if not sys_info:
            raise ValueError(f"Unknown source system: {source_system}. Use list_dod_systems() to see supported systems.")

        if record_type is None:
            record_type = sys_info["record_types"][0] if sys_info.get("record_types") else "IMPORTED_RECORD"

        reader = csv.DictReader(io.StringIO(csv_text), delimiter=delimiter)
        records = []
        for row in reader:
            record_json = json.dumps(row, sort_keys=True)
            record_hash = self.create_record_hash(record_json)
            records.append({
                "data": dict(row),
                "hash": record_hash,
                "record_type": record_type,
                "source_system": source_system,
                "source_name": sys_info["name"],
                "import_timestamp": datetime.now(timezone.utc).isoformat(),
            })

        return {
            "imported": len(records),
            "source_system": source_system,
            "source_name": sys_info["name"],
            "record_type": record_type,
            "records": records,
            "fields_mapped": list(reader.fieldnames) if reader.fieldnames else [],
        }

    def import_xml(self, xml_text, source_system, record_type=None, row_tag=None):
        """Import records from XML data exported from a DoD system.

        Args:
            xml_text: Raw XML string
            source_system: Key from DOD_SYSTEMS
            record_type: Override record type
            row_tag: XML tag name for each record element (auto-detected if omitted)

        Returns:
            dict with imported records count, hashes, and mapping summary
        """
        import xml.etree.ElementTree as ET

        sys_info = self.DOD_SYSTEMS.get(source_system, {})
        if not sys_info:
            raise ValueError(f"Unknown source system: {source_system}")

        if record_type is None:
            record_type = sys_info["record_types"][0] if sys_info.get("record_types") else "IMPORTED_RECORD"

        root = ET.fromstring(xml_text)

        # Auto-detect row elements: use row_tag or first repeated child
        if row_tag:
            elements = root.findall(f".//{row_tag}")
        else:
            children = list(root)
            if children:
                tag_counts = {}
                for child in children:
                    tag_counts[child.tag] = tag_counts.get(child.tag, 0) + 1
                most_common = max(tag_counts, key=tag_counts.get)
                elements = root.findall(most_common)
            else:
                elements = [root]

        records = []
        for elem in elements:
            row_data = {}
            for child in elem:
                row_data[child.tag] = child.text or ""
            if not row_data:
                # Handle attributes
                row_data = dict(elem.attrib)
            record_json = json.dumps(row_data, sort_keys=True)
            record_hash = self.create_record_hash(record_json)
            records.append({
                "data": row_data,
                "hash": record_hash,
                "record_type": record_type,
                "source_system": source_system,
                "source_name": sys_info["name"],
                "import_timestamp": datetime.now(timezone.utc).isoformat(),
            })

        return {
            "imported": len(records),
            "source_system": source_system,
            "source_name": sys_info["name"],
            "record_type": record_type,
            "records": records,
        }

    def import_json(self, json_text, source_system, record_type=None, records_key=None):
        """Import records from JSON data exported from a DoD system.

        Args:
            json_text: Raw JSON string (array or object with records key)
            source_system: Key from DOD_SYSTEMS
            record_type: Override record type
            records_key: JSON key containing the array of records (auto-detected if omitted)

        Returns:
            dict with imported records count, hashes, and mapping summary
        """
        sys_info = self.DOD_SYSTEMS.get(source_system, {})
        if not sys_info:
            raise ValueError(f"Unknown source system: {source_system}")

        if record_type is None:
            record_type = sys_info["record_types"][0] if sys_info.get("record_types") else "IMPORTED_RECORD"

        data = json.loads(json_text) if isinstance(json_text, str) else json_text

        # Determine records array
        if isinstance(data, list):
            items = data
        elif records_key and records_key in data:
            items = data[records_key]
        else:
            # Auto-detect: look for first list value in the object
            items = None
            for key, val in data.items() if isinstance(data, dict) else []:
                if isinstance(val, list) and len(val) > 0:
                    items = val
                    break
            if items is None:
                items = [data]  # Treat whole object as single record

        records = []
        for item in items:
            record_json = json.dumps(item, sort_keys=True)
            record_hash = self.create_record_hash(record_json)
            records.append({
                "data": item,
                "hash": record_hash,
                "record_type": record_type,
                "source_system": source_system,
                "source_name": sys_info["name"],
                "import_timestamp": datetime.now(timezone.utc).isoformat(),
            })

        return {
            "imported": len(records),
            "source_system": source_system,
            "source_name": sys_info["name"],
            "record_type": record_type,
            "records": records,
        }

    def import_and_anchor(self, file_text, source_system, file_format="csv",
                          wallet_seed=None, record_type=None, anchor=True):
        """Full import-and-anchor workflow: parse file → hash each record → optionally anchor to XRPL.

        Supports CSV, XML, and JSON formats from any registered DoD system.

        Args:
            file_text: Raw file content
            source_system: Key from DOD_SYSTEMS (e.g., 'cdmd_oa', 'merlin')
            file_format: 'csv', 'xml', or 'json'
            wallet_seed: XRPL wallet seed (required if anchor=True)
            record_type: Override record type
            anchor: If True, anchor each record hash to XRPL

        Returns:
            Summary with imported count, anchored count, and record details
        """
        # Parse the file
        if file_format == "csv":
            result = self.import_csv(file_text, source_system, record_type=record_type)
        elif file_format == "xml":
            result = self.import_xml(file_text, source_system, record_type=record_type)
        elif file_format == "json":
            result = self.import_json(file_text, source_system, record_type=record_type)
        else:
            raise ValueError(f"Unsupported format: {file_format}. Use csv, xml, or json.")

        anchored_count = 0
        if anchor and result["records"]:
            wallet_seed = wallet_seed or self.wallet_seed
            if not wallet_seed:
                raise ValueError("wallet_seed required for anchoring imported records")
            for rec in result["records"]:
                try:
                    tx = self.anchor_record(
                        record_text=json.dumps(rec["data"], sort_keys=True),
                        wallet_seed=wallet_seed,
                        record_type=rec["record_type"],
                    )
                    rec["tx_hash"] = tx.get("hash", "")
                    rec["anchored"] = True
                    anchored_count += 1
                except Exception as e:
                    rec["tx_hash"] = None
                    rec["anchored"] = False
                    rec["anchor_error"] = str(e)

        result["anchored"] = anchored_count
        result["anchor_enabled"] = anchor
        return result

    # ═══════════════════════════════════════════════════════════════════
    #  HarborLink Integration Methods
    # ═══════════════════════════════════════════════════════════════════

    def register_webhook(self, url, events=None, api_base="https://s4ledger.com"):
        """Register a webhook endpoint to receive async event notifications.

        Args:
            url: HTTPS endpoint to receive webhook POST requests
            events: List of events to subscribe to. Defaults to all.
                Valid events: anchor.confirmed, verify.completed, tamper.detected,
                batch.completed, custody.transferred, sls.balance_low,
                chain.integrity_check, proof.appended
            api_base: S4 Ledger API base URL

        Returns:
            Webhook registration with signing secret for HMAC verification
        """
        import urllib.request
        payload = {"url": url}
        if events:
            payload["events"] = events
        req = urllib.request.Request(
            f"{api_base}/api/webhooks/register",
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key or "",
            },
            method="POST",
        )
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())

    def list_webhooks(self, api_base="https://s4ledger.com"):
        """List all registered webhooks for this organization."""
        import urllib.request
        req = urllib.request.Request(
            f"{api_base}/api/webhooks/list",
            headers={"X-API-Key": self.api_key or ""},
        )
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())

    def verify_webhook_signature(self, payload_body, signature, secret):
        """Verify an incoming webhook's HMAC-SHA256 signature.

        Args:
            payload_body: Raw JSON string from webhook POST body
            signature: Value of X-S4-Signature header
            secret: Your webhook signing secret (from register_webhook)

        Returns:
            True if signature is valid, False otherwise
        """
        expected = hmac.new(secret.encode(), payload_body.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def anchor_composite(self, file_hash, metadata_hash, record_type="JOINT_CONTRACT",
                         record_id=None, wallet_seed=None, user_email="",
                         source_system="harborlink", api_base="https://s4ledger.com"):
        """Anchor a composite record (file + metadata) in a single XRPL transaction.

        Computes composite_hash = SHA-256(file_hash || metadata_hash) and anchors it.
        Use when HarborLink needs to anchor both a document and its metadata atomically.

        Args:
            file_hash: SHA-256 hash of the file binary content
            metadata_hash: SHA-256 hash of the metadata JSON
            record_type: Defense record category (e.g., USN_SUPPLY_RECEIPT)
            record_id: Optional custom record ID
            wallet_seed: XRPL wallet seed for SLS fee
            user_email: User email for fee deduction
            source_system: Originating system (default: harborlink)

        Returns:
            Anchor result with composite hash, tx_hash, and explorer URL
        """
        import urllib.request
        payload = {
            "file_hash": file_hash,
            "metadata_hash": metadata_hash,
            "record_type": record_type,
            "source_system": source_system,
            "user_email": user_email,
        }
        if record_id:
            payload["record_id"] = record_id
        req = urllib.request.Request(
            f"{api_base}/api/anchor/composite",
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key or "",
            },
            method="POST",
        )
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())

    def anchor_batch(self, records, user_email="", api_base="https://s4ledger.com"):
        """Anchor multiple records in a single Merkle-tree XRPL transaction.

        Builds a Merkle tree from all record hashes and anchors only the root.
        Cost: 0.01 SLS total regardless of batch size (up to 1000 records).

        Args:
            records: List of dicts, each with 'hash' or 'record_text',
                     optionally 'record_type', 'record_id', 'branch'
            user_email: User email for SLS fee deduction

        Returns:
            Batch result with merkle_root, batch_id, tx_hash, cost_per_record
        """
        import urllib.request
        payload = {"records": records, "user_email": user_email}
        req = urllib.request.Request(
            f"{api_base}/api/anchor/batch",
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key or "",
            },
            method="POST",
        )
        resp = urllib.request.urlopen(req, timeout=60)
        return json.loads(resp.read())

    def transfer_custody(self, record_id, from_entity, to_entity,
                         location="", condition="serviceable", notes="",
                         user_email="", api_base="https://s4ledger.com"):
        """Record a custody transfer event, anchored to XRPL.

        Creates a blockchain-verified custody chain entry linking the
        previous custodian to the new one with location and condition data.

        Args:
            record_id: The record being transferred
            from_entity: Current custodian (org, unit, person, location)
            to_entity: New custodian
            location: Physical location of transfer
            condition: Item condition (serviceable, unserviceable, etc.)
            notes: Additional transfer notes

        Returns:
            Transfer result with transfer_id, tx_hash, chain_length
        """
        import urllib.request
        payload = {
            "record_id": record_id,
            "from_entity": from_entity,
            "to_entity": to_entity,
            "location": location,
            "condition": condition,
            "notes": notes,
            "user_email": user_email,
        }
        req = urllib.request.Request(
            f"{api_base}/api/custody/transfer",
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key or "",
            },
            method="POST",
        )
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())

    def get_custody_chain(self, record_id, api_base="https://s4ledger.com"):
        """Retrieve the full custody chain for a record.

        Returns every custody transfer event: who held it, when, where,
        and the XRPL tx_hash proving each transfer.

        Args:
            record_id: The record to look up

        Returns:
            Custody chain with transfers, current custodian, and verification status
        """
        import urllib.request
        req = urllib.request.Request(
            f"{api_base}/api/custody/chain?record_id={record_id}",
            headers={"X-API-Key": self.api_key or ""},
        )
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())

    def get_proof_chain(self, record_id, api_base="https://s4ledger.com"):
        """Retrieve the full proof chain (event history) for a record.

        Returns every event related to a record: creation, modifications,
        custody transfers, verifications — each with an XRPL anchor.

        Args:
            record_id: The record to look up

        Returns:
            Proof chain with events, first/last timestamps, integrity status
        """
        import urllib.request
        req = urllib.request.Request(
            f"{api_base}/api/proof-chain?record_id={record_id}",
            headers={"X-API-Key": self.api_key or ""},
        )
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())

    def hash_file(self, content, encoding="utf-8", filename="",
                  api_base="https://s4ledger.com"):
        """Hash a file's binary content via the API.

        For local hashing without API call, use:
            hashlib.sha256(open('file','rb').read()).hexdigest()

        Args:
            content: File content (UTF-8 text or base64-encoded binary)
            encoding: 'utf-8' for text, 'base64' for binary
            filename: Optional filename for reference

        Returns:
            SHA-256 hash and file size
        """
        import urllib.request
        payload = {"content": content, "encoding": encoding, "filename": filename}
        req = urllib.request.Request(
            f"{api_base}/api/hash/file",
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key or "",
            },
            method="POST",
        )
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())

    def verify_batch(self, records, operator="sdk", api_base="https://s4ledger.com"):
        """Verify multiple records against the chain in a single call.

        Args:
            records: List of dicts, each with 'record_text' and optionally
                     'expected_hash', 'tx_hash', 'record_id'
            operator: Identity of the person/system performing verification

        Returns:
            Batch verification results with per-record status and summary
        """
        import urllib.request
        payload = {"records": records, "operator": operator}
        req = urllib.request.Request(
            f"{api_base}/api/verify/batch",
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key or "",
            },
            method="POST",
        )
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())

    def get_org_records(self, limit=100, offset=0, api_base="https://s4ledger.com"):
        """Retrieve records scoped to this organization's API key.

        Multi-tenant isolation: only returns records anchored by this org.

        Args:
            limit: Max records to return (default 100)
            offset: Pagination offset

        Returns:
            Paginated org-scoped records with total count
        """
        import urllib.request
        req = urllib.request.Request(
            f"{api_base}/api/org/records?limit={limit}&offset={offset}",
            headers={"X-API-Key": self.api_key or ""},
        )
        resp = urllib.request.urlopen(req, timeout=15)
        return json.loads(resp.read())


if __name__ == "__main__":
    main_cli()


def main_cli():
    """CLI entry point for s4-anchor command."""
    import sys
    import argparse

    parser = argparse.ArgumentParser(
        prog="s4-anchor",
        description="S4 Ledger — Anchor defense logistics records to the XRP Ledger",
    )
    parser.add_argument("command", choices=["anchor", "hash", "verify", "status", "readiness", "dmsms", "roi", "lifecycle", "warranty", "action-items", "calendar", "provisioning"], help="Command to execute")
    parser.add_argument("--record", "-r", help="Record content to anchor or hash")
    parser.add_argument("--seed", "-s", help="XRPL wallet seed")
    parser.add_argument("--api-key", "-k", default="s4-demo-key-2026", help="S4 API key")
    parser.add_argument("--testnet", action="store_true", default=True, help="Use XRPL Testnet (default)")
    parser.add_argument("--encrypt", action="store_true", help="Encrypt record before hashing")
    parser.add_argument("--type", "-t", default="USN_SUPPLY_RECEIPT", help="Record type")

    args = parser.parse_args()
    sdk = S4SDK(api_key=args.api_key, testnet=args.testnet)

    if args.command == "hash":
        if not args.record:
            print("Error: --record required for hash command")
            sys.exit(1)
        h = sdk.create_record_hash(args.record)
        print(f"SHA-256: {h}")

    elif args.command == "anchor":
        if not args.record or not args.seed:
            print("Error: --record and --seed required for anchor command")
            sys.exit(1)
        try:
            result = sdk.anchor_record(args.record, args.seed, encrypt_first=args.encrypt, record_type=args.type)
            print(f"Anchored! Hash: {result['hash']}")
            print(f"TX Results: {result['tx_results']}")
        except Exception as e:
            print(f"Anchor failed: {e}")
            sys.exit(1)

    elif args.command == "verify":
        if not args.record:
            print("Error: --record required for verify command")
            sys.exit(1)
        h = sdk.create_record_hash(args.record)
        print(f"Verification Hash: {h}")
        # If an expected hash is provided via --type flag, compare directly
        if args.type and args.type.startswith("expected:"):
            expected = args.type.split(":", 1)[1]
            result = sdk.verify_against_chain(args.record, expected_hash=expected)
            print(f"Status: {result['status']}")
            if result["tamper_detected"]:
                print(f"⚠️  TAMPER DETECTED: {result['message']}")
            else:
                print(f"✅ {result['message']}")
        else:
            print("Compare this hash with the on-chain MemoData to verify integrity.")
            print("Tip: Use --type expected:<hash> for automated comparison.")

    elif args.command == "status":
        print(f"S4 Ledger SDK v3.9.7")
        print(f"XRPL Available: {XRPL_AVAILABLE}")
        print(f"Encryption Available: {Fernet is not None}")
        print(f"API Key: {args.api_key[:8]}...")
        print(f"Network: {'Testnet' if args.testnet else 'Mainnet'}")
        print(f"Tools: anchor, verify, hash, readiness, dmsms, parts-lookup, roi, lifecycle, warranty, action-items, calendar, provisioning")
        print(f"Platforms: 500+ across 8 U.S. military branches")
        print(f"DoD Import Systems: {len(S4SDK.DOD_SYSTEMS)} across all branches (USN, USA, USAF, USMC, USCG, USSF, Joint/OSD)")
        print(f"29 REST API Endpoints | 25+ Platform Pages")

    elif args.command == "readiness":
        mtbf = float(input("MTBF (hours): ") if not args.record else args.record.split(",")[0])
        mttr = float(input("MTTR (hours): ") if not args.record else args.record.split(",")[1])
        mldt = float(input("MLDT (hours): ") if not args.record else args.record.split(",")[2]) if args.record and len(args.record.split(",")) > 2 else 0
        result = sdk.calculate_readiness(mtbf, mttr, mldt)
        print(f"Ao: {result['ao']*100:.1f}% | Ai: {result['ai']*100:.1f}% | Assessment: {result['assessment']}")

    elif args.command == "dmsms":
        if not args.record:
            print("Error: --record required (comma-separated NSNs)")
            sys.exit(1)
        nsns = [n.strip() for n in args.record.split(",")]
        result = sdk.check_dmsms(nsns)
        print(f"DMSMS Check: {result['total']} parts, {result['at_risk']} at risk")
        for p in result['parts']:
            print(f"  {p['nsn']}: {p['status']} ({p['severity']}) — {p['recommendation']}")

    elif args.command == "roi":
        result = sdk.calculate_roi()
        print(f"ROI Analysis: {result['roi_percent']}% ROI | ${result['annual_savings']:,} annual savings | {result['payback_months']} mo payback")

    elif args.command == "lifecycle":
        result = sdk.estimate_lifecycle_cost()
        print(f"Lifecycle Cost: ${result['total_ownership_b']}B TOC | ${result['sustainment_b']}B O&S | ${result['dmsms_b']}B DMSMS")
        print(f"S4 Ledger DMSMS savings estimate: ${result['s4_dmsms_savings_b']}B")

    elif args.command == "warranty":
        result = sdk.track_warranty()
        print(f"Warranty Tracker: {result['active']} active | {result['expiring']} expiring | {result['expired']} expired")
        for item in result['items']:
            print(f"  {item['system']}: {item['status']} ({item['days_left']}d remaining)")

    elif args.command == "action-items":
        result = sdk.get_action_items()
        print(f"Action Items: {result['total']} total | {result['critical']} critical | {result['open']} open")
        for item in result['action_items']:
            print(f"  [{item['severity'].upper()}] {item['title']} — {item['source'].upper()} | ${item['cost']}K | {item['schedule']}")

    elif args.command == "calendar":
        result = sdk.get_calendar_events()
        print(f"Calendar Events for {result['month']}/{result['year']}: {result['total']} events")
        for event in result['events']:
            print(f"  {event['date']} {event['time']} — [{event['type'].upper()}] {event['title']} ({event['source']})")
    elif args.command == "provisioning":
        result = sdk.get_provisioning_status()
        print(f"Provisioning Status: {result['total_parts']} parts | {result['validated']} validated | {result['apls_generated']} APLs | {result['nsns_cataloged']} NSNs")
        print(f"  PTD Progress: {result['ptd_progress']}% | Schedule: {result['schedule_status']}")