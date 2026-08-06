# Project context — Loop & Ivy crochet storefront

A handmade-crochet e-commerce site for selling hand-made crochet products to
customers. Brand name in the demo is "Loop & Ivy" (placeholder — to be replaced
with the real business name). Note from the owner: the site may be being built
**for someone else**, and **payments are intentionally deferred** (do not push
Stripe/checkout work unless asked).

## Tech stack & architecture
- **Frontend:** plain, dependency-free **HTML / CSS / vanilla JS**. No build step,
  no framework, no bundler. Keep it this way unless explicitly asked to change.
- **Backend:** **Supabase** (managed Postgres + auto REST API + Auth + Storage).
  - Client loaded from CDN: `@supabase/supabase-js@2`.
  - Connection config in `assets/js/supabase-config.js` (project URL + public anon
    key — safe to commit; RLS protects the data).
  - Project URL: `https://ihfcwcqngjnnfnfumjhl.supabase.co`
- **Hosting:** **GitHub Pages**, served from the `gh-pages` branch (a `.nojekyll`
  file is present). To deploy: merge the working branch into `gh-pages` and push;
  Pages rebuilds automatically.
  - Live shop:  https://rippersoul330-arch.github.io/Crocheting-demo-experiment-/
  - Live admin: https://rippersoul330-arch.github.io/Crocheting-demo-experiment-/admin.html
- There is also a small zero-dependency Node static server, `serve.js`
  (`node serve.js 8000`), for local development.

## Key files
- `index.html` — storefront (hero, featured, shop grid, story, process, reviews,
  **Custom Orders** commission form, **FAQ**, newsletter, cart drawer, quick view).
- `assets/js/products.js` — product data layer + self-contained SVG "photo"
  generator (`window.LoopIvy.buildProductImage`) driven by `motif` + `theme`.
- `assets/js/main.js` — storefront interactions; reads products from
  `window.LoopIvy.PRODUCTS`; re-renders on the `loopivy:products` event.
- `assets/js/supabase-data.js` — loads products live from Supabase, maps DB rows
  to the product shape, and exposes `window.LoopIvyBackend` for form submissions.
  Falls back to built-in demo products if Supabase is unreachable.
- `admin.html` + `assets/css/admin.css` + `assets/js/admin.js` — password-protected
  admin dashboard (Supabase Auth) for product CRUD and viewing custom requests,
  subscribers, and orders.
- `supabase/schema.sql` — full DB schema (tables, RLS, storage bucket, seed data).
- `supabase/SETUP.md` — Supabase setup guide.

## Database (Supabase)
Tables: `products`, `custom_requests`, `newsletter_subscribers`, `orders`,
`order_items`. Storage bucket: `product-images` (public read). Prices stored as
integer **cents**. `theme` is JSONB (`{bg, yarn, accent}`); `materials` is `text[]`.
RLS: public can read active products and INSERT requests/orders/subscribers, but
only authenticated (admin) users can read submissions/orders or manage products.
Email confirmation is enabled — create admin users via Dashboard → Authentication
→ Users → Add user (with Auto Confirm).

## Git / workflow
- Active work branch: `feat/supabase-backend`.
- Never commit to `main` directly; open PRs. Deploy via the `gh-pages` branch.
- supabase-js insert calls must NOT chain `.select()` for anon writes (no read-back
  permission under RLS) — insert with return=minimal, which supabase-js does by
  default when `.select()` is omitted.

## Status (as of this session)
Done & live: storefront UI, Custom Orders + FAQ sections, Supabase database with
live products, forms saving to DB, admin dashboard.
Not done (by choice / future): Stripe payments (deferred), real product photo
uploads, replacing demo branding/copy with the real business details.


## Future direction & owner constraints (added later)
- **Marketplace ambition:** The owner is considering evolving this single-seller
  shop into a **multi-vendor marketplace** where other crocheters can sign up and
  sell their own handmade products to customers (an Etsy-style niche platform for
  crochet). Not started yet — treat as future scope.
  - Recommended path discussed: start lean/manual (curate a handful of sellers,
    list their products via the existing admin), validate buyer demand FIRST, then
    build self-service seller accounts + payouts. Avoid building full marketplace
    plumbing before demand is proven.
  - Technical implications when built: multi-tenant seller accounts, `seller_id`
    on products, per-seller dashboards, order routing, moderation, and
    **Stripe Connect** for split payments/payouts (for a marketplace, payments are
    core rather than optional). Supabase (auth + RLS per seller + storage) fits this.
- **Budget / shipping constraint:** The owner has **no funds to ship products
  themselves**. Guidance agreed: shipping is funded by the customer (paid at
  checkout, before dispatch); in a marketplace each seller ships their own goods so
  the platform has no logistics/shipping cost. Low/no-cost starting options:
  **local pickup**, **made-to-order (pay first)**, flat-rate shipping, and selling
  digital patterns. Site already includes free-shipping-over-$150 logic.
- **Payments status:** Still deferred for the single shop. If/when the marketplace
  path is chosen, revisit payments (Stripe Connect) since it becomes essential.
  Until any payment processor exists, prefer local pickup + pay-on-collection.
