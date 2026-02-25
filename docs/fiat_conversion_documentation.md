# S4 Ledger Fiat Conversion Integration

## Overview
This document describes the legacy fiat conversion integration for $SLS.

> **Note (v5.2.0+):** SLS is now delivered directly from the S4 Treasury as part of subscription plans. The DEX conversion flow described below is retained for SDK completeness and third-party integrations only.

## How It Works (Legacy)
- Users deposit USD with a gateway (e.g., GateHub, Bitstamp) and receive USD.IOU tokens on XRPL.
- The SDK can use XRPL's DEX to convert USD.IOU to $SLS for protocol fees.
- Payments are submitted using xrpl-py, specifying send_max in USD.IOU and amount in $SLS.

## Current Model (v5.2.0+)
- SLS is delivered from the S4 Treasury directly to user wallets on signup
- Monthly allocations are refreshed automatically via Stripe webhook
- 0.01 SLS anchor fee returns to Treasury (circular economy)
- No user-facing fiat conversion required

## Example Usage
See fiat_conversion_test.py for a test script.

## Required Parameters
- gateway_issuer: XRPL address of the USD IOU gateway.
- sls_issuer: XRPL address of the $SLS token issuer (S4 Ledger: r95GyZac4butvVcsTWUPpxzekmyzaHsTA5).
- wallet_seed: User's XRPL wallet seed.
- destination: Recipient address (usually protocol treasury).

## Compliance
- KYC/AML may be required by gateways.
- No sensitive or defense data is involved in conversion.

## Customization
- Gateway issuer is set for production (mainnet).
- Add KYC checks via APIs if needed.

## Contact
info@s4ledger.com
