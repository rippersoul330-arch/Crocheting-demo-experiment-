# Razorpay setup — learning guide (Step 1: basic online payment)

Goal of Step 1: let a buyer pay with a **test** card/UPI and have the order
marked "paid" automatically. Payment goes into your platform Razorpay account
for now; **Step 2 (Route)** will auto-split to sellers later.

## The mental model (memorise this)
```
1. Browser  -> calls Edge Function "create-razorpay-order" (₹ amount)
2. Function -> asks Razorpay to create an order (uses SECRET key, server-side)
3. Browser  -> opens Razorpay Checkout popup; buyer pays (test money)
4. Razorpay -> calls Edge Function "razorpay-webhook" (payment succeeded)
5. Webhook  -> marks the order "paid" in Supabase
```
Rule: the **secret key** and the **"mark paid"** step live on the **server**
(Edge Functions), never in the browser.

## What's in this repo
- `functions/create-razorpay-order/` — creates the payment order (server-side)
- `functions/razorpay-webhook/`      — verifies + marks the order paid
- `payments-columns.sql`             — adds razorpay_order_id / razorpay_payment_id to orders

---

## Step-by-step

### 1. Create your Razorpay account + test keys
- Sign up at https://razorpay.com and stay in **Test Mode** (top toggle).
- Dashboard -> **Settings -> API Keys -> Generate Test Key**.
- Copy the **Key ID** (`rzp_test_...`, public) and **Key Secret** (private —
  never put it in frontend code or paste it publicly).

### 2. Add the DB columns
Supabase -> SQL Editor -> run `payments-columns.sql`.

### 3. Install the Supabase CLI + link your project
```bash
npm install -g supabase          # or: brew install supabase/tap/supabase
supabase login                   # opens the browser to authenticate
supabase link --project-ref ihfcwcqngjnnfnfumjhl
```

### 4. Store your secrets (server-side only)
```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
supabase secrets set RAZORPAY_KEY_SECRET=your_test_secret
supabase secrets set RAZORPAY_WEBHOOK_SECRET=choose_any_long_random_string
```
(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.)

### 5. Deploy the two functions
`--no-verify-jwt` lets the public site + Razorpay call them without a Supabase login token.
```bash
supabase functions deploy create-razorpay-order --no-verify-jwt
supabase functions deploy razorpay-webhook --no-verify-jwt
```
Your function URLs will be:
- `https://ihfcwcqngjnnfnfumjhl.functions.supabase.co/create-razorpay-order`
- `https://ihfcwcqngjnnfnfumjhl.functions.supabase.co/razorpay-webhook`

### 6. Register the webhook in Razorpay
Dashboard -> **Settings -> Webhooks -> Add New Webhook**:
- URL: the `razorpay-webhook` URL above
- Secret: the **same** value you used for `RAZORPAY_WEBHOOK_SECRET`
- Event: check **payment.captured**

### 7. Test it (fake money)
Use Razorpay test cards, e.g. card `4111 1111 1111 1111`, any future expiry,
any CVV, or test UPI `success@razorpay`. No real money moves in test mode.

---

## After Step 1 works
- Wire the frontend "Pay online" button (Kiro will do this once functions deploy).
- Then **Step 2 — Route**: onboard sellers' linked accounts and split payments
  (needs business KYC + Route enabled on your account).

## Reminder
- Test mode first, always. Only switch to live keys after KYC + real testing.
- India marketplaces may have **GST/TCS** duties — check with an accountant.
