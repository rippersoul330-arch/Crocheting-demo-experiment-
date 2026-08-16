/* =====================================================================
   Loop & Ivy — Supabase data layer
   ---------------------------------------------------------------------
   • Loads products live from the database and hands them to the store.
   • Exposes window.LoopIvyBackend for the Custom Orders + newsletter forms.
   • Degrades gracefully: if Supabase isn't configured or is unreachable,
     the site simply keeps using the built-in demo products.
   ===================================================================== */
(function () {
  "use strict";

  const cfg = window.SUPABASE_CONFIG || {};
  const keyLooksReal =
    cfg.publishableKey &&
    !/REPLACE|\.\.\.\./.test(cfg.publishableKey) &&
    cfg.publishableKey.length > 30;

  if (!window.supabase || !cfg.url || !keyLooksReal) {
    console.info(
      "[LoopIvy] Supabase not configured yet — using built-in demo products. " +
      "Add your full publishable key in assets/js/supabase-config.js to go live."
    );
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.publishableKey);
  window.LoopIvyClient = client;

  const toDollars = (c) => (c == null ? undefined : Math.round(c) / 100);

  /* Map a database row to the product shape the storefront expects. */
  function mapProduct(row) {
    const p = {
      id: row.slug || row.id,
      name: row.name,
      category: row.category,
      motif: row.motif,
      theme: row.theme || undefined,
      price: toDollars(row.price_cents) || 0,
      old: toDollars(row.compare_at_cents),
      tag: row.tag || undefined,
      featured: row.featured ? (row.sort_order || 1) : 0,
      rating: Number(row.rating) || 5,
      reviews: row.review_count || 0,
      blurb: row.blurb || "",
      materials: Array.isArray(row.materials) ? row.materials : [],
      maker: row.sellers && row.sellers.shop_name ? row.sellers.shop_name : undefined,
    };
    // Use a real photo if one was uploaded, otherwise the hand-drawn SVG art.
    p.img =
      row.image_url ||
      (window.LoopIvy && window.LoopIvy.buildProductImage
        ? window.LoopIvy.buildProductImage(p)
        : "");
    return p;
  }

  async function loadProducts() {
    try {
      // Try to include the maker's shop name (works once the marketplace
      // migration has added the sellers relationship). Fall back to a plain
      // query if that relationship doesn't exist yet.
      let { data, error } = await client
        .from("products")
        .select("*, sellers(shop_name)")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        ({ data, error } = await client
          .from("products")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true }));
      }

      if (error) throw error;
      if (!data || !data.length) {
        console.info("[LoopIvy] No products found in Supabase yet — did you run schema.sql?");
        return;
      }

      const mapped = data.map(mapProduct);
      if (window.LoopIvy) window.LoopIvy.PRODUCTS = mapped;
      document.dispatchEvent(new CustomEvent("loopivy:products", { detail: mapped }));
      console.info(`[LoopIvy] Loaded ${mapped.length} products from Supabase.`);
    } catch (err) {
      console.warn("[LoopIvy] Could not load products from Supabase:", err.message || err);
      // storefront keeps the built-in demo products
    }
  }

  /* Actions the forms in main.js call (no-ops if this file didn't load). */
  window.LoopIvyBackend = {
    async saveCustomRequest(payload) {
      const { error } = await client.from("custom_requests").insert({
        name: payload.name,
        email: payload.email,
        project_type: payload.type || null,
        budget: payload.budget || null,
        details: payload.details,
      });
      if (error) throw error;
    },

    async subscribe(email) {
      const { error } = await client
        .from("newsletter_subscribers")
        .upsert({ email }, { onConflict: "email", ignoreDuplicates: true });
      if (error) throw error;
    },

    /* Save a reserve/pickup order (no online payment).
       We generate the order id client-side so we can link order_items
       without needing read-back permission (blocked for the public by RLS). */
    async createOrder(order, items) {
      const orderId =
        (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
        ("o-" + Date.now() + "-" + Math.random().toString(16).slice(2));

      const row = {
        id: orderId,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        shipping: order.shipping || null,
        subtotal_cents: order.subtotal_cents,
        shipping_cents: order.shipping_cents || 0,
        total_cents: order.total_cents,
        currency: order.currency || "inr",
        status: "pending",
        notes: order.notes || null,
      };
      // link a Razorpay order so the webhook can mark it paid (online payments)
      if (order.razorpay_order_id) row.razorpay_order_id = order.razorpay_order_id;

      const { error: e1 } = await client.from("orders").insert(row);
      if (e1) throw e1;

      const rows = (items || []).map((it) => ({
        order_id: orderId,
        product_name: it.product_name,
        unit_price_cents: it.unit_price_cents,
        quantity: it.quantity,
      }));
      if (rows.length) {
        const { error: e2 } = await client.from("order_items").insert(rows);
        if (e2) throw e2;
      }
      return orderId;
    },
  };

  loadProducts();
})();
