# Marketplace payments & payouts — plan

> Status: **planning only** — not built yet. Payments remain deferred until we
> start Phase A. The reserve / local-pickup flow stays as a no-payment option.

## Goal
Route the **buyer's** money to the **seller**, automatically taking a platform
**commission**. The owner never fronts funds or does manual bank transfers.

## Money flow
```
Buyer card -> Stripe Checkout (hosted) -> Stripe splits:
   - platform commission (e.g. 8%)  -> platform Stripe balance
   - seller share (price - fee)     -> seller's connected account -> auto payout to bank
Order marked "paid" in Supabase via a Stripe webhook.
```

## Tool: Stripe Connect (Express)
Standard for marketplaces. "Express" = Stripe hosts seller onboarding (bank
details + ID/KYC), so we store none of it.

## Fits the stack via Supabase Edge Functions
Static frontend + Supabase has no server for Stripe's secret key. Add 3 Edge
Functions (Deno serverless):
- `onboard-seller`  — create Stripe Express account + onboarding link
- `create-checkout` — create Checkout session with commission split
- `stripe-webhook`  — on checkout.session.completed, mark the order paid

Secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) live in Edge Function
secrets, never in frontend. Frontend uses only the Stripe publishable key.

## Database additions
- sellers: `stripe_account_id`, `payouts_enabled`, `charges_enabled`
- orders:  `platform_fee_cents`, `seller_id` (already has stripe_session_id, status)

## Key decision: multi-seller carts
- **A) One-seller-per-checkout (recommended v1):** basket is per-shop. Simple,
  reliable, uses destination charge with application_fee to the seller's account.
- **B) Platform-collects-then-transfers:** platform receives full payment then
  transfers to each seller. Flexible but more complex; platform becomes merchant
  of record (more liability/compliance).

## Phased build
- Phase A: seller payout onboarding (Express) + status in Seller Studio
- Phase B: real Stripe Checkout replacing "buy now" (commission applied)
- Phase C: webhook -> mark orders paid, record fee, show in dashboards
- Phase D: per-seller order view + refund/dispute policy
- Phase E: email receipts, multi-seller carts, Stripe Tax

## Prerequisites
1. Stripe account with Connect enabled (free)
2. Supabase CLI (to deploy Edge Functions)
3. Commission rate decided
4. Confirm Stripe Connect availability in the owner's country
5. Build & test in Stripe TEST mode (fake cards) before going live

## Decisions to confirm before Phase A
- Commission %:
- Cart model: A (one-seller) or B (platform-collects)?
- Country / currency:
- Who is liable for refunds (affects charge type)?
