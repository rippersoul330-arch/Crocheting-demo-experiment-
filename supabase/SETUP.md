# Supabase backend — setup guide

This folder contains the backend for the Loop & Ivy crochet shop, built on
[Supabase](https://supabase.com) (managed Postgres + auto REST APIs + storage + auth).

## What you get

| Table | Purpose |
|-------|---------|
| `products` | Every item in the shop (price, category, art theme, photo, stock, etc.) |
| `custom_requests` | Submissions from the **Custom Orders** form |
| `newsletter_subscribers` | Emails from the newsletter box |
| `orders` + `order_items` | Saved orders (ready for Stripe later) |
| `product-images` (storage) | Bucket for real product photos |

Security is handled by **Row Level Security**: the public can *read products* and
*submit* requests/orders, but only **you** (signed in) can edit products or read
orders and requests.

---

## Step 1 — Create your project
1. Go to <https://supabase.com> and create a free account.
2. Click **New project**, give it a name (e.g. `loop-and-ivy`), and set a database password.
3. Wait ~2 minutes for it to provision.

## Step 2 — Run the schema
1. In the dashboard, open **SQL Editor → New query**.
2. Open [`schema.sql`](./schema.sql), copy the whole file, paste it in, and click **Run**.
3. Open **Table Editor** — you should see your 5 tables and 12 seeded products.

## Step 3 — Grab your API keys
1. Go to **Project Settings → API**.
2. Copy two values (both are safe to use in front-end code):
   - **Project URL** — looks like `https://abcdxyz.supabase.co`
   - **anon public** key — a long `eyJ...` string
3. Paste them into `assets/js/supabase-config.js` (created when we wire the front end).

> Never put the **service_role** key in front-end code — it bypasses all security.

## Step 4 — Create your admin login (so only you can edit products)
1. Go to **Authentication → Users → Add user** and create yourself an account
   (email + password).
2. That signed-in user is treated as `authenticated` and can manage products/orders.

---

## Next steps (I can build these for you)
- **Wire the front end**: load products live from Supabase; save Custom Orders +
  newsletter submissions to the database.
- **Admin page**: a simple password-protected page to add/edit/delete products and
  view incoming requests and orders.
- **Payments**: Stripe Checkout, with a Supabase Edge Function to verify the webhook
  and mark orders `paid`.
