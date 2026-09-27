# Monetization & privacy

Phase 6 adds **optional paid cosmetics** only. Sending messages, joining servers, voice, and moderation tools are not paywalled.

## What we collect for billing

| Data | Where it lives | Purpose |
|------|----------------|---------|
| Stripe customer id | `billing_customers` (linked to your user id) | Checkout and subscription lifecycle |
| Entitlement rows | `entitlements` (kind, status, server id for boosts, Stripe ids, expiry) | Show boost/badge cosmetics |
| Email (at checkout) | Stripe (and our existing account email for customer creation) | Receipts and fraud prevention via Stripe |

Stripe processes payment method details. **We do not store card numbers, CVC, or full billing addresses** in the Nexus database.

## What we never sell

- Message or DM content
- Friend graphs or presence history for advertising
- Analytics event payloads to third-party data brokers
- Billing or entitlement records for marketing resale

Operational analytics (`analytics_events`) remain separate: they track product usage metrics (for example server created, member joined) and **do not include Stripe payment fields or billing PII**.

## Self-service data rights

Account deletion cascades billing customer and entitlement rows with your user record. For Stripe-held payment history, use Stripe’s customer portal or contact your platform administrator.

## Configuration

Use test keys from `.env.example` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price ids). Without them, checkout buttons explain that billing is disabled and chat continues to work normally.
