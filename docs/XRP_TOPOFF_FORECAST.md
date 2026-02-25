# XRP Treasury Top-Off Forecast

**S4 Systems, LLC | S4 Ledger v5.2.0**
**For: Finance, Operations, Leadership**

---

## Overview

Each new S4 Ledger subscriber requires **12 XRP** to activate their XRPL wallet (network reserve requirement). This XRP comes from the Treasury wallet and is a **business expense** absorbed from subscription revenue.

This document forecasts when the Treasury will need XRP replenishment based on signup velocity.

---

## Assumptions

| Parameter | Value | Notes |
|-----------|-------|-------|
| XRP per new user | 12 XRP | XRPL base reserve (10) + owner reserve for TrustLine (2) |
| XRP price | ~$2.50 | Used for USD cost estimates (adjust as needed) |
| USD cost per activation | ~$30 | 12 × $2.50 |
| XRP per anchor tx | ~12 drops | 0.000012 XRP — negligible, not modeled |
| Churn rate | Not modeled | Conservative (only new signups consume XRP) |
| Starting Treasury XRP | Variable | See scenarios below |

---

## Scenario 1: Seed Stage (Pre-Launch / Beta)

**Starting Treasury Balance: 1,000 XRP ($2,500)**

| Week | New Signups/Week | Cumulative Users | XRP Used | XRP Remaining | USD Equivalent |
|------|-----------------|------------------|----------|---------------|----------------|
| 1 | 2 | 2 | 24 | 976 | $2,440 |
| 2 | 2 | 4 | 48 | 952 | $2,380 |
| 4 | 3 | 10 | 120 | 880 | $2,200 |
| 8 | 3 | 22 | 264 | 736 | $1,840 |
| 12 | 5 | 42 | 504 | 496 | $1,240 |
| 16 | 5 | 62 | 744 | 256 | $640 |
| **~18** | **5** | **~72** | **~864** | **~136** | **⚠️ Top-off needed** |

**Top-off trigger:** ~72 users → replenish with another 1,000 XRP ($2,500)

**Revenue context at trigger:** Even at lowest tier (Starter $999/mo), 72 users = **$71,928/month revenue** vs. $2,500 XRP top-off cost.

---

## Scenario 2: Early Growth

**Starting Treasury Balance: 5,000 XRP ($12,500)**

| Month | New Signups/Month | Cumulative Users | XRP Used | XRP Remaining | USD Equivalent |
|-------|-------------------|------------------|----------|---------------|----------------|
| 1 | 15 | 15 | 180 | 4,820 | $12,050 |
| 2 | 20 | 35 | 420 | 4,580 | $11,450 |
| 3 | 25 | 60 | 720 | 4,280 | $10,700 |
| 6 | 40 | 185 | 2,220 | 2,780 | $6,950 |
| 9 | 50 | 335 | 4,020 | 980 | $2,450 |
| **~10** | **55** | **~390** | **~4,680** | **~320** | **⚠️ Top-off needed** |

**Top-off trigger:** ~390 users → replenish with 5,000–10,000 XRP ($12,500–$25,000)

**Revenue context at trigger:** 390 users × $999 avg = **$389,610/month** vs. $12,500 top-off.

---

## Scenario 3: Scale-Up

**Starting Treasury Balance: 25,000 XRP ($62,500)**

| Month | New Signups/Month | Cumulative Users | XRP Used | XRP Remaining | USD Equivalent |
|-------|-------------------|------------------|----------|---------------|----------------|
| 1 | 50 | 50 | 600 | 24,400 | $61,000 |
| 3 | 75 | 200 | 2,400 | 22,600 | $56,500 |
| 6 | 100 | 500 | 6,000 | 19,000 | $47,500 |
| 9 | 100 | 800 | 9,600 | 15,400 | $38,500 |
| 12 | 125 | 1,175 | 14,100 | 10,900 | $27,250 |
| 15 | 150 | 1,625 | 19,500 | 5,500 | $13,750 |
| **~17** | **150** | **~1,925** | **~23,100** | **~1,900** | **⚠️ Top-off needed** |

**Top-off trigger:** ~1,925 users → replenish with 25,000+ XRP ($62,500)

**Revenue context at trigger:** 1,925 users × $999 avg = **$1.9M/month** vs. $62,500 top-off.

---

## Cost as Percentage of Revenue

The XRP activation cost is trivial relative to subscription revenue:

| Tier | Monthly Revenue | XRP Cost per User | Cost as % of Revenue |
|------|----------------|-------------------|---------------------|
| Pilot | Free | $30 (one-time) | N/A (free tier) |
| Starter | $999/mo | $30 (one-time) | **0.25% of first month** |
| Professional | $2,499/mo | $30 (one-time) | **0.10% of first month** |
| Enterprise | $9,999/mo | $30 (one-time) | **0.025% of first month** |

After the first month, XRP cost drops to **$0** for that user (only new signups consume XRP).

---

## SLS Treasury Reserve

The SLS reserve is separate from XRP and largely self-sustaining due to the circular economy:

| Starting SLS | Starter Users Supported | Professional Users Supported | Enterprise Users Supported |
|-------------|------------------------|-----------------------------|-----------------------------|
| 1,000,000 | 40 months × 1 user | 10 months × 1 user | 2 months × 1 user |
| 10,000,000 | 400 Starter signups* | 100 Professional signups* | 20 Enterprise signups* |
| 50,000,000 | 2,000 Starter signups* | 500 Professional signups* | 100 Enterprise signups* |

*\*Before any anchor fees cycle back. In practice, fees return SLS to Treasury continuously, extending the real capacity significantly.*

### SLS Circular Economy Rate

If a Starter customer (25,000 SLS/month) anchors 500 records/day:
- Daily fee: 500 × 0.01 = **5 SLS/day** returns to Treasury
- Monthly fee return: **~150 SLS/month** (0.6% of allocation)
- Heavy user (5,000/day): **1,500 SLS/month** returns (6%)

At scale with 1,000 users averaging 1,000 anchors/day each:
- **10,000 SLS/day** returns to Treasury = **300,000 SLS/month**
- This alone covers ~12 new Starter signups per month in SLS

---

## Recommended Top-Off Schedule

| Phase | Treasury XRP | Trigger | Action |
|-------|-------------|---------|--------|
| **Pre-Launch** | Load 1,000 XRP ($2,500) | Below 200 XRP | Buy 1,000 XRP |
| **Early (1-100 users)** | Maintain 2,000–5,000 XRP | Below 500 XRP | Buy 5,000 XRP |
| **Growth (100-500 users)** | Maintain 10,000 XRP | Below 2,000 XRP | Buy 10,000 XRP |
| **Scale (500+ users)** | Maintain 25,000+ XRP | Below 5,000 XRP | Buy 25,000 XRP |

### Automated Monitoring (Recommended)
Set up a Vercel cron or external monitor to check Treasury XRP balance weekly:
- **Alert at 20%** of target reserve
- **Critical alert at 10%**
- Balance check: `GET /api/wallet/balance?address=rMLmkrxpadq5z6oTDmq8GhQj9LKjf1KLqJ`

---

## How to Top Off

1. Purchase XRP on an exchange (Coinbase, Kraken, Uphold, Bitstamp)
2. Send to Treasury address: `rMLmkrxpadq5z6oTDmq8GhQj9LKjf1KLqJ`
3. Confirm receipt on [XRPL Explorer](https://livenet.xrpl.org/accounts/rMLmkrxpadq5z6oTDmq8GhQj9LKjf1KLqJ)
4. No code changes needed — Treasury uses the same address

For SLS replenishment (if needed):
1. Send from Issuer wallet to Treasury using the Issuer seed
2. Or use the admin endpoint (future feature)

---

## XRP Price Sensitivity

If XRP price changes, the USD cost per activation changes proportionally:

| XRP Price | Cost per User (12 XRP) | 1,000 User Activation Cost |
|-----------|----------------------|---------------------------|
| $1.00 | $12 | $12,000 |
| $2.00 | $24 | $24,000 |
| $2.50 | $30 | $30,000 |
| $5.00 | $60 | $60,000 |
| $10.00 | $120 | $120,000 |

Even at $10/XRP, the cost per user ($120) is 12% of one month's Starter revenue ($999). The economics remain strongly favorable at any realistic XRP price.

---

*S4 Systems, LLC — Internal Planning Document*
