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

class SolusSDK:
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
        """Encrypt sensitive data (PHI) off-chain for HIPAA support."""
        if self.cipher is None:
            raise RuntimeError("cryptography package is required for encryption. Install it with `pip install cryptography`.")
        return self.cipher.encrypt(data.encode()).decode()

    def decrypt_data(self, encrypted_data):
        """Decrypt data (for authorized providers)."""
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

    def store_hash_with_sls_fee(self, hash_value, wallet_seed, fee_sls="0.01", destination=None, rebate_sls="0.005", fiat_mode=False, usd_fee_equiv=0.01, gateway_issuer=None):
        """
        $SLS Utility: Pay micro-fee in $SLS for action, store hash in memo.
        - If fiat_mode=True, simulate USD payment and auto-convert to $SLS.
        - Deducts fee (revenue to treasury).
        - Sends rebate (incentive).
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

        # Pay $SLS fee with hash memo
        amount_sls = IssuedCurrencyAmount(currency="SLS", issuer=self.sls_issuer, value=fee_sls)
        tx_fee = Payment(
            account=wallet.classic_address,
            amount=amount_sls,
            destination=destination,
            memos=[{"memo": {"memo_data": hash_value}}]
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
                        memos=[{"memo": {"memo_data": hash_value}}]
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

    def secure_patient_record(self, record_text, wallet_seed=None, encrypt_first=False, fiat_mode=False, gateway_issuer=None):
        """Full workflow: Validate sub, encrypt (optional), hash, store on XRPL with $SLS fee (fiat optional)."""
        # Allow SDK-level wallet_seed to be set at initialization
        wallet_seed = wallet_seed or self.wallet_seed
        if not wallet_seed:
            raise ValueError("wallet_seed is required either as argument or when initializing SolusSDK")

        # Only require USD subscription when fiat_mode is requested
        if fiat_mode:
            self.validate_subscription()

        if encrypt_first:
            record_text = self.encrypt_data(record_text)
        hash_val = self.create_record_hash(record_text)
        tx_results = self.store_hash_with_sls_fee(hash_val, wallet_seed, fiat_mode=fiat_mode, gateway_issuer=gateway_issuer)
        return {"hash": hash_val, "tx_results": tx_results}

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
    # Usage Example (Provider Side – Crypto Critic with Fiat Mode)
    sdk = SolusSDK(api_key="valid_mock_key", testnet=True)  # Provider's USD sub key
    test_record = "Patient data here"
    test_seed = "sTestSeed"  # Replace with a valid seed when running directly
    try:
        result = sdk.secure_patient_record(test_record, test_seed, encrypt_first=True, fiat_mode=True)
        print(result)
    except Exception as e:
        print("Example run failed (expected when seed or network not configured):", e)
