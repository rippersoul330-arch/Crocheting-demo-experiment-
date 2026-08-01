import type { Metadata } from "next";
import { Button } from "@/components/Button";

export const metadata: Metadata = {
  title: "Order Inquiry Sent",
  description: "Mock checkout success page for Cozy Atelier crochet orders.",
};

export default function SuccessPage() {
  return (
    <main className="container">
      <section className="success-box success-offset">
        <p className="eyebrow">Inquiry received</p>
        <h1>Your cozy order note is ready.</h1>
        <p>
          This demo stops at a mock checkout. In a production build, this page can
          connect to Stripe, Shopify, or a custom order inquiry workflow.
        </p>
        <Button href="/shop">Continue Shopping</Button>
      </section>
    </main>
  );
}
