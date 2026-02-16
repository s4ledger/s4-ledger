#!/usr/bin/env python3
"""
S4 Ledger — Set XRPL Account Domain for Token Verification

This script sends an AccountSet transaction on XRPL Mainnet to set the
`Domain` field on the SLS token issuer account to "s4ledger.com".

Once set, XRPL DEXs (Sologenic, First Ledger, XPMarket, etc.) will:
  1. Read the Domain field from the issuer account
  2. Fetch https://s4ledger.com/.well-known/xrp-ledger.toml
  3. Verify the issuer address matches
  4. Display "Secure Logistics Standard" as the token name
  5. Display the SLS_logo.png as the token icon

Usage:
  python set_xrpl_domain.py

You will be prompted for your XRPL wallet seed (never stored or logged).
The seed is used only to sign the single AccountSet transaction.

IMPORTANT: This modifies your LIVE MAINNET account. Review before running.

© 2026 S4 Systems, LLC
"""

import getpass
import sys

try:
    import xrpl
    from xrpl.clients import JsonRpcClient
    from xrpl.wallet import Wallet
    from xrpl.models.transactions import AccountSet
    from xrpl.transaction import submit_and_wait
    from xrpl.utils import str_to_hex
except ImportError:
    print("ERROR: xrpl-py is required. Install with: pip install xrpl-py>=2.6.0")
    sys.exit(1)


# ─── Configuration ───────────────────────────────────────────────────
MAINNET_URL = "https://xrplcluster.com"
EXPECTED_ISSUER = "r95GyZac4butvVcsTWUPpxzekmyzaHsTA5"
DOMAIN = "s4ledger.com"
# ─────────────────────────────────────────────────────────────────────


def main():
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  S4 Ledger — XRPL Domain Verification Setup                ║")
    print("║  Sets Domain field on SLS issuer account to s4ledger.com   ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()
    print(f"  Issuer account:  {EXPECTED_ISSUER}")
    print(f"  Domain to set:   {DOMAIN}")
    print(f"  Network:         XRPL Mainnet ({MAINNET_URL})")
    print()

    # ─── Step 1: Get wallet secret numbers securely ───────────────
    print("  Enter your Xaman Secret Numbers (rows A through H).")
    print("  Type each 6-digit row and press Enter.\n")

    rows = []
    for label in ["A", "B", "C", "D", "E", "F", "G", "H"]:
        row = getpass.getpass(f"  Row {label} (6 digits, hidden): ")
        row = row.strip()
        if len(row) != 6 or not row.isdigit():
            print(f"  ERROR: Row {label} must be exactly 6 digits. Got '{row}'. Aborting.")
            sys.exit(1)
        rows.append(row)

    try:
        wallet = Wallet.from_secret_numbers(rows)
    except AttributeError:
        # Older xrpl-py without from_secret_numbers — try manual conversion
        print("  ERROR: Your xrpl-py version doesn't support from_secret_numbers().")
        print("  Please upgrade: pip install xrpl-py>=2.6.0")
        sys.exit(1)
    except Exception as e:
        print(f"  ERROR: Invalid secret numbers — {e}")
        sys.exit(1)

    # ─── Step 2: Verify this is the correct account ──────────────────
    if wallet.address != EXPECTED_ISSUER:
        print()
        print(f"  WARNING: Wallet address is {wallet.address}")
        print(f"  Expected issuer: {EXPECTED_ISSUER}")
        print()
        confirm = input("  This is NOT the SLS issuer. Continue anyway? (y/N): ")
        if confirm.lower() != "y":
            print("  Aborting.")
            sys.exit(0)

    print()
    print(f"  ✓ Wallet loaded: {wallet.address}")

    # ─── Step 3: Connect to XRPL Mainnet ─────────────────────────────
    print(f"  ✓ Connecting to {MAINNET_URL}...")
    client = JsonRpcClient(MAINNET_URL)

    # ─── Step 4: Check current domain ────────────────────────────────
    try:
        account_info = xrpl.account.get_account_info(wallet.address, client)
        current_domain_hex = account_info.result.get("account_data", {}).get("Domain", "")
        if current_domain_hex:
            current_domain = bytes.fromhex(current_domain_hex).decode("ascii")
            print(f"  ✓ Current domain: {current_domain}")
            if current_domain.lower() == DOMAIN.lower():
                print()
                print(f"  Domain is already set to '{DOMAIN}'. No action needed.")
                sys.exit(0)
        else:
            print("  ✓ No domain currently set")
    except Exception as e:
        print(f"  ⚠ Could not check current domain: {e}")
        print("  Proceeding with AccountSet anyway...")

    # ─── Step 5: Build and submit AccountSet transaction ─────────────
    print()
    print(f"  Setting domain to: {DOMAIN}")
    domain_hex = str_to_hex(DOMAIN)
    print(f"  Domain (hex):     {domain_hex}")
    print()

    confirm = input("  Submit AccountSet to XRPL Mainnet? (y/N): ")
    if confirm.lower() != "y":
        print("  Aborting.")
        sys.exit(0)

    print()
    print("  Submitting transaction...")

    try:
        tx = AccountSet(
            account=wallet.address,
            domain=domain_hex,
        )
        response = submit_and_wait(tx, client, wallet)

        result = response.result
        tx_hash = result.get("hash", "unknown")
        engine_result = result.get("meta", {}).get("TransactionResult", "unknown")

        print()
        if engine_result == "tesSUCCESS":
            print("  ╔══════════════════════════════════════════════════════════╗")
            print("  ║  ✅ SUCCESS — Domain set to s4ledger.com               ║")
            print("  ╚══════════════════════════════════════════════════════════╝")
            print()
            print(f"  TX Hash: {tx_hash}")
            print(f"  Explorer: https://livenet.xrpl.org/transactions/{tx_hash}")
            print()
            print("  Next steps:")
            print("  1. Verify: https://livenet.xrpl.org/accounts/" + wallet.address)
            print("     → Check that 'Domain' field shows 's4ledger.com'")
            print()
            print("  2. TOML verification: https://s4ledger.com/.well-known/xrp-ledger.toml")
            print("     → DEXs will fetch this file and match the issuer address")
            print()
            print("  3. DEX propagation may take 1-24 hours depending on the platform:")
            print("     • Sologenic (solo.top)")
            print("     • First Ledger (firstledger.net)")
            print("     • XPMarket (xpmarket.com)")
            print("     • XRPL Explorer (livenet.xrpl.org)")
            print()
            print("  4. If a DEX still shows 'Solus Protocol', submit a support ticket")
            print("     or PR to their token metadata repository with the correct name:")
            print("     'Secure Logistics Standard ($SLS)'")
        else:
            print(f"  ❌ Transaction failed: {engine_result}")
            print(f"  TX Hash: {tx_hash}")
            print(f"  Full result: {result}")

    except Exception as e:
        print(f"  ❌ Error submitting transaction: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
