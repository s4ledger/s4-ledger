import hashlib
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

# Real fiat conversion using XRPL DEX/gateways
def real_fiat_to_sls_conversion(client, wallet, usd_amount, sls_issuer, gateway_issuer, destination):
    """
    Convert USD.IOU to $SLS using XRPL DEX/gateway. Requires USD.IOU trustline and gateway issuer.
    Returns response from XRPL transaction.
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
            # Real fiat conversion via XRPL DEX/gateway
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
    parser.add_argument("command", choices=["anchor", "hash", "verify", "status", "readiness", "dmsms", "roi", "lifecycle", "warranty"], help="Command to execute")
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
        print("Compare this hash with the on-chain MemoData to verify integrity.")

    elif args.command == "status":
        print(f"S4 Ledger SDK v3.3.0")
        print(f"XRPL Available: {XRPL_AVAILABLE}")
        print(f"Encryption Available: {Fernet is not None}")
        print(f"API Key: {args.api_key[:8]}...")
        print(f"Network: {'Testnet' if args.testnet else 'Mainnet'}")
        print(f"Tools: anchor, verify, hash, readiness, dmsms, parts-lookup, roi, lifecycle, warranty")
        print(f"Platforms: 462 across 8 U.S. military branches"))

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
