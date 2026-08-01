"use client";

import { Button } from "@/components/Button";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/data/products";

export function AddToCartButton({ product, full }: { product: Product; full?: boolean }) {
  const { addItem } = useCart();
  return (
    <Button full={full} onClick={() => addItem(product)}>
      Add to Cart
    </Button>
  );
}
