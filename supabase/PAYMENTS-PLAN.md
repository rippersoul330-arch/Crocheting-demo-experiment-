# Marketplace payments & payouts — plan (India)

> Status: **planning only** — not built yet. The reserve / local-pickup /
> ship-across-India flow (no online payment) is what's live today.

## Context
- Market: **India**. Currency: **INR (₹)**.
- Shipping: **all-India**. Buyer provides a delivery address at checkout;
  each seller ships their own goods, so the platform bears no shipping cost.

## Goal
Route the **buyer's** money to the **seller**, automatically taking a platform
**commission**. The owner never fronts funds or does manual bank transfers.

## Money flow
```
Buyer (UPI / card / netbanking) -> hosted checkout -> gateway splits:
   - platform commission (e.g. 8%)  -> platform account
   - seller share (price - fee)     -> seller's linked account -> auto settlement to bank
Order marked "paid" in Supabase via a webhook.
```

## Tool: Razorpay Route (recommended for India)
For an India marketplace that must **split payments and settle to many sellers**,
**Stripe Connect payouts to Indian sellers are restricted**, so the standard
choice is **Razorpay Route** (or **Cashfree Easy Split**). These are built for
Indian marketplaces: collect via UPI/cards/netbanking, auto-split to each
seller's linked account, take a platform commission, and handle seller KYC.

## Fits the stack via Supabase Edge Functions
Static frontend + Supabase has no server for the gateway's secret key. Add Edge
Functions (Deno serverless):
- `onboard-seller`  — create the seller's linked/sub-account + KYC link
- `create-order`    — create a Razorpay order with the commission split (Route)
- `payment-webhook` — on payment.captured, mark the order paid in Supabase

Secret keys live in Edge Function secrets, never in the frontend. The frontend
uses only the public key + Razorpay Checkout.

## Database additions
- sellers: `razorpay_account_id`, `payouts_enabled`, `kyc_status`
- orders:  `platform_fee_cents`, `seller_id`, `razorpay_order_id`, `razorpay_payment_id`
  (amounts stored in paise, i.e. the existing integer "cents" field = paise for INR)

## Key decision: multi-seller carts
- **A) One-seller-per-checkout (recommended v1):** basket is per-shop; a single
  Razorpay order splits to that one seller + platform fee.
- **B) Platform-collects-then-transfers:** platform collects, then transfers to
  each seller. More flexible, more compliance/liability.

## Phased build
- Phase A: seller onboarding (Razorpay linked account + KYC) + status in Seller Studio
- Phase B: real checkout replacing "reserve" (commission applied) — test mode first
- Phase C: webhook -> mark orders paid, record fee, show in dashboards
- Phase D: per-seller order view + refund/dispute policy
- Phase E: receipts, multi-seller carts, GST/tax handling

## Prerequisites
1. A **Razorpay account** with **Route** enabled (business KYC required).
2. **Supabase CLI** (to deploy Edge Functions).
3. Commission rate decided.
4. Sellers need bank details + KYC to be paid (handled via Razorpay onboarding).
5. Build & test in Razorpay **test mode** before going live.

## Decisions to confirm before Phase A
- Commission %:
- Cart model: A (one-seller) or B (platform-collects)?
- Gateway: Razorpay Route (default) or Cashfree Easy Split?
- Who is liable for refunds?

## Note on GST / compliance (India)
Marketplace operators in India may have GST/TCS obligations. Confirm with an
accountant before going live with real money.
