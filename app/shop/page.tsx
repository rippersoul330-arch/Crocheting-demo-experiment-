import type { Metadata } from "next";
import { ShopGrid } from "@/components/ShopGrid";

export const metadata: Metadata = {
  title: "Shop Handmade Crochet",
  description:
    "Browse handmade crochet apparel, amigurumi toys, blankets, and decor from Cozy Atelier.",
};

export default function ShopPage() {
  return (
    <main className="container">
      <section className="page-heading">
        <p className="eyebrow">Shop the collection</p>
        <h1>Handmade crochet goods with heirloom texture.</h1>
        <p>
          Filter by category, choose a finished piece, and build a cart for a mock
          inquiry checkout.
        </p>
      </section>
      <ShopGrid />
    </main>
  );
}
