// =====================================================================
//  Supabase Edge Function: create-razorpay-order
//  ---------------------------------------------------------------------
//  WHAT IT DOES (Step 2 of the payment pattern):
//  The browser can't be trusted with the secret key, so it asks THIS
//  server function to create a Razorpay "order". We talk to Razorpay
//  using the secret key (kept safe here), and return only the harmless
//  bits the browser needs to open the payment popup.
//
//  Runs on Supabase's Deno runtime. Deno.serve is built in — no imports.
// =====================================================================

// These come from the secrets you set with `supabase secrets set ...`
const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

// CORS lets your website (a different domain) call this function.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Browsers send a preflight "OPTIONS" request first — answer it.
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // The browser tells us how much to charge (in paise: ₹1 = 100 paise).
    const { amount_paise, receipt } = await req.json();

    // Never trust the client blindly — sanity-check the amount.
    if (!amount_paise || amount_paise < 100) {
      return json({ error: "Invalid amount" }, 400);
    }

    // Razorpay uses HTTP Basic auth: "key_id:key_secret" base64-encoded.
    const auth = "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`);

    // Ask Razorpay to create an order.
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        amount: amount_paise,
        currency: "INR",
        receipt: receipt || `rcpt_${Date.now()}`,
      }),
    });

    const order = await res.json();
    if (!res.ok) {
      return json({ error: order?.error?.description || "Razorpay error" }, 400);
    }

    // Return ONLY what the browser needs. The Key ID is public/safe;
    // the secret NEVER leaves this function.
    return json({ order_id: order.id, amount: order.amount, key_id: KEY_ID });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
