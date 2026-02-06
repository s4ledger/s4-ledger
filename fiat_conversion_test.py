from solus_sdk import SolusSDK
from xrpl.wallet import generate_faucet_wallet
from xrpl.clients import JsonRpcClient

# Testnet setup
xrpl_rpc_url = "https://s.altnet.rippletest.net:51234/"
client = JsonRpcClient(xrpl_rpc_url)
wallet = generate_faucet_wallet(client)

sdk = SolusSDK(wallet_seed=wallet.seed, testnet=True)

# Example gateway issuer (replace with real testnet issuer for USD IOU)
gateway_issuer = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"  # Example testnet issuer

# Test conversion: USD.IOU to $SLS
try:
    response = sdk.store_hash_with_sls_fee(
        hash_value="testhash1234567890abcdef",
        wallet_seed=wallet.seed,
        fee_sls="10",
        fiat_mode=True,
        usd_fee_equiv=10.5,
        gateway_issuer=gateway_issuer,
        destination=sdk.sls_issuer
    )
    print("Fiat conversion test response:", response)
except Exception as e:
    print("Fiat conversion test failed:", e)
