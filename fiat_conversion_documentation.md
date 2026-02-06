# Solus Protocol Real Fiat Conversion Integration

## Overview
This document describes the integration of real fiat conversion for $SLS fees and rebates using XRPL's DEX and gateway IOUs.

## How It Works
- Users deposit USD with a gateway (e.g., GateHub, Bitstamp) and receive USD.IOU tokens on XRPL.
- The SDK uses XRPL's DEX to convert USD.IOU to $SLS for protocol fees.
- Payments are submitted using xrpl-py, specifying send_max in USD.IOU and amount in $SLS.

## Example Usage
See fiat_conversion_test.py for a test script.

## Required Parameters
- gateway_issuer: XRPL address of the USD IOU gateway.
- sls_issuer: XRPL address of the $SLS token issuer.
- wallet_seed: User's XRPL wallet seed.
- destination: Recipient address (usually protocol treasury).

## Compliance
- KYC/AML may be required by gateways.
- No PHI or sensitive data is involved in conversion.

## Customization
- Update gateway_issuer for production/testnet.
- Add KYC checks via APIs if needed.

## Contact
support@solusprotocol.com
