#!/usr/bin/env python3
"""
S4 Ledger — Wallet Recovery Script
Recovers 25,000 SLS and XRP from accidentally provisioned wallet
rJa6pkPaq6XEF1Vr3NX7DzqJzXTB8yQata back to Treasury.

Usage:
  1. Set env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY (or S4_WALLET_ENCRYPTION_KEY)
     and XRPL_TREASURY_SEED
  2. Run: python recover_wallet.py --dry-run   (preview only)
  3. Run: python recover_wallet.py --execute   (actually send transactions)
"""

import os
import sys
import json
import hashlib
import argparse

# ── Config ──
TARGET_WALLET = "rJa6pkPaq6XEF1Vr3NX7DzqJzXTB8yQata"
TREASURY_ADDRESS = "rMLmkrxpadq5z6oTDmq8GhQj9LKjf1KLqJ"
SLS_ISSUER = "r95GyZac4butvVcsTWUPpxzekmyzaHsTA5"
XRPL_TESTNET_URL = "https://s.altnet.rippletest.net:51234"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
WALLET_ENCRYPTION_KEY = os.environ.get("S4_WALLET_ENCRYPTION_KEY", "").strip()
XRPL_TREASURY_SEED = os.environ.get("XRPL_TREASURY_SEED", "").strip()


def decrypt_seed(stored):
    """Decrypt wallet seed using same logic as api/index.py."""
    if not stored:
        return None
    if stored.startswith("ENC:"):
        import base64
        try:
            from cryptography.fernet import Fernet
        except ImportError:
            print("ERROR: pip install cryptography")
            return None
        key_source = WALLET_ENCRYPTION_KEY or SUPABASE_SERVICE_KEY
        if not key_source:
            print("ERROR: Need S4_WALLET_ENCRYPTION_KEY or SUPABASE_SERVICE_KEY to decrypt")
            return None
        raw_key = hashlib.sha256(key_source.encode()).digest()
        fernet_key = base64.urlsafe_b64encode(raw_key)
        f = Fernet(fernet_key)
        try:
            return f.decrypt(stored[4:].encode()).decode()
        except Exception as e:
            print(f"Decryption failed: {e}")
            return None
    return stored  # plaintext


def lookup_wallet_in_supabase():
    """Query Supabase for the wallet seed."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY required")
        return None
    import urllib.request
    url = f"{SUPABASE_URL}/rest/v1/wallets?address=eq.{TARGET_WALLET}&select=seed,email,plan"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            rows = json.loads(resp.read())
            if rows:
                row = rows[0]
                print(f"  Found wallet for: {row.get('email', '?')} (plan: {row.get('plan', '?')})")
                return decrypt_seed(row.get("seed", ""))
            else:
                print(f"  Wallet {TARGET_WALLET} NOT found in Supabase")
                return None
    except Exception as e:
        print(f"  Supabase query failed: {e}")
        return None


def check_balances(client, address):
    """Check XRP and SLS balances of a wallet."""
    from xrpl.models.requests import AccountInfo, AccountLines
    # XRP balance
    try:
        acct = client.request(AccountInfo(account=address))
        xrp_drops = int(acct.result["account_data"]["Balance"])
        xrp = xrp_drops / 1_000_000
    except Exception:
        xrp = 0
    # SLS balance
    sls = 0
    try:
        lines = client.request(AccountLines(account=address))
        for line in lines.result.get("lines", []):
            if line["currency"] == "SLS" and line["account"] == SLS_ISSUER:
                sls = float(line["balance"])
    except Exception:
        pass
    return xrp, sls


def main():
    parser = argparse.ArgumentParser(description="Recover SLS and XRP from accidental wallet")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no transactions")
    parser.add_argument("--execute", action="store_true", help="Actually send recovery transactions")
    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        print("Usage: python recover_wallet.py --dry-run   OR   --execute")
        return

    print("\n=== S4 Ledger Wallet Recovery ===\n")
    print(f"Target wallet:  {TARGET_WALLET}")
    print(f"Treasury:       {TREASURY_ADDRESS}")
    print(f"SLS Issuer:     {SLS_ISSUER}\n")

    # Step 1: Look up wallet seed
    print("[1] Looking up wallet seed in Supabase...")
    wallet_seed = lookup_wallet_in_supabase()
    if not wallet_seed:
        print("\n  Cannot proceed without wallet seed.")
        print("  MANUAL OPTION: If you have the seed from Vercel logs or Xaman,")
        print("  set it as env var TARGET_WALLET_SEED and re-run.")
        manual_seed = os.environ.get("TARGET_WALLET_SEED", "").strip()
        if manual_seed:
            wallet_seed = manual_seed
            print(f"  Using TARGET_WALLET_SEED from environment.")
        else:
            return
    print(f"  Seed recovered: {wallet_seed[:8]}...{wallet_seed[-4:]}\n")

    # Step 2: Connect to XRPL
    print("[2] Connecting to XRPL Testnet...")
    try:
        from xrpl.clients import JsonRpcClient
        from xrpl.wallet import Wallet
        from xrpl.models.transactions import Payment
        from xrpl.models.amounts import IssuedCurrencyAmount
        from xrpl.transaction import submit_and_wait
        from xrpl.core.keypairs import derive_classic_address
        from xrpl.utils import CryptoAlgorithm
    except ImportError:
        print("ERROR: pip install xrpl-py")
        return

    client = JsonRpcClient(XRPL_TESTNET_URL)
    target_wallet = Wallet.from_seed(wallet_seed, algorithm=CryptoAlgorithm.SECP256K1)
    print(f"  Wallet address from seed: {target_wallet.address}")
    if target_wallet.address != TARGET_WALLET:
        print(f"  WARNING: Derived address doesn't match expected! Got {target_wallet.address}")
        return

    # Step 3: Check balances
    print("\n[3] Checking balances...")
    xrp_bal, sls_bal = check_balances(client, TARGET_WALLET)
    print(f"  XRP balance: {xrp_bal} XRP")
    print(f"  SLS balance: {sls_bal} SLS")

    t_xrp, t_sls = check_balances(client, TREASURY_ADDRESS)
    print(f"  Treasury XRP: {t_xrp} XRP")
    print(f"  Treasury SLS: {t_sls} SLS")

    if args.dry_run:
        print("\n[DRY RUN] Would execute:")
        if sls_bal > 0:
            print(f"  1. Send {sls_bal} SLS from {TARGET_WALLET[:12]}... -> Treasury")
        if xrp_bal > 12:
            recoverable_xrp = xrp_bal - 12  # Keep 10 XRP reserve + 2 for TrustLine
            print(f"  2. Send {recoverable_xrp} XRP from {TARGET_WALLET[:12]}... -> Treasury")
        elif xrp_bal > 0:
            print(f"  2. XRP balance ({xrp_bal}) is at or near reserve — may not be recoverable")
            print(f"     (XRPL requires 10 XRP base reserve + 2 per TrustLine)")
        print(f"\n  NOTE: ~10 XRP base reserve is locked by XRPL and cannot be recovered")
        print(f"        unless the account is deleted (requires 256+ ledger sequences).")
        print("\n  Run with --execute to proceed.")
        return

    # Step 4: Execute recovery
    if args.execute:
        if not XRPL_TREASURY_SEED:
            print("\nERROR: XRPL_TREASURY_SEED not set (needed only for verification, not for sending FROM target)")

        # 4a: Send SLS back to Treasury
        if sls_bal > 0:
            print(f"\n[4a] Sending {sls_bal} SLS back to Treasury...")
            sls_tx = Payment(
                account=target_wallet.address,
                destination=TREASURY_ADDRESS,
                amount=IssuedCurrencyAmount(
                    currency="SLS",
                    issuer=SLS_ISSUER,
                    value=str(int(sls_bal))
                )
            )
            try:
                resp = submit_and_wait(sls_tx, client, target_wallet)
                if resp.is_successful():
                    print(f"  SUCCESS: SLS returned. TX: {resp.result.get('hash', '?')}")
                else:
                    print(f"  FAILED: {resp.result.get('engine_result_message', 'unknown')}")
            except Exception as e:
                print(f"  ERROR: {e}")

        # 4b: Send recoverable XRP back to Treasury
        # XRPL reserve: 10 XRP base + 2 per TrustLine (owner reserve)
        # After deleting the TrustLine (balance = 0), reserve drops to 10 XRP
        reserve_xrp = 10  # After SLS sent back, TrustLine has 0 balance
        xrp_now, _ = check_balances(client, TARGET_WALLET)
        recoverable = xrp_now - reserve_xrp - 0.000012  # leave margin for tx fee

        if recoverable > 0:
            print(f"\n[4b] Sending {recoverable:.6f} XRP back to Treasury...")
            xrp_tx = Payment(
                account=target_wallet.address,
                destination=TREASURY_ADDRESS,
                amount=str(int(recoverable * 1_000_000))  # drops
            )
            try:
                resp = submit_and_wait(xrp_tx, client, target_wallet)
                if resp.is_successful():
                    print(f"  SUCCESS: XRP returned. TX: {resp.result.get('hash', '?')}")
                else:
                    print(f"  FAILED: {resp.result.get('engine_result_message', 'unknown')}")
            except Exception as e:
                print(f"  ERROR: {e}")
        else:
            print(f"\n[4b] No recoverable XRP (balance {xrp_now} XRP, reserve {reserve_xrp} XRP)")

        # Final balance check
        print("\n[5] Final balances:")
        xrp_final, sls_final = check_balances(client, TARGET_WALLET)
        print(f"  Target wallet: {xrp_final} XRP, {sls_final} SLS")
        t_xrp_f, t_sls_f = check_balances(client, TREASURY_ADDRESS)
        print(f"  Treasury:      {t_xrp_f} XRP, {t_sls_f} SLS")
        print("\n  NOTE: The ~10 XRP locked as account reserve can be recovered")
        print("  by deleting the account (AccountDelete tx) after 256 ledgers.")
        print("  Done.\n")


if __name__ == "__main__":
    main()
