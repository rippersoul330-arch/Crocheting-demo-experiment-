// =====================================================================
//  Supabase Edge Function: razorpay-webhook
//  ---------------------------------------------------------------------
//  WHAT IT DOES (Steps 4 & 5 of the payment pattern):
//  After a buyer pays, Razorpay calls THIS url ("a webhook") to tell us
//  the payment succeeded. This is the trustworthy source of truth — a
//  hacker could fake a browser, but they can't fake this signed webhook.
//
//  We:
//   1. Verify the signature (proves it's really from Razorpay).
//   2. Mark the matching order "paid" in the database.
//
//  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically
//  by Supabase — you don't set those yourself.
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Read the RAW body — we must verify the signature against the exact bytes.
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  // 1. Verify this really came from Razorpay (not a faker).
  const valid = await verifySignature(body, signature, WEBHOOK_SECRET);
  if (!valid) return new Response("invalid signature", { status: 400 });

  const event = JSON.parse(body);

  // 2. When a payment is captured, mark the order paid.
  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const db = createClient(SUPABASE_URL, SERVICE_ROLE); // service role bypasses RLS
    await db
      .from("orders")
      .update({ status: "paid", razorpay_payment_id: payment.id })
      .eq("razorpay_order_id", payment.order_id);
  }

  // Always return 200 quickly so Razorpay knows we received it.
  return new Response("ok", { status: 200 });
});

// HMAC-SHA256 signature check (this is the standard webhook verification).
async function verifySignature(body: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = [...new Uint8Array(sigBytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}
