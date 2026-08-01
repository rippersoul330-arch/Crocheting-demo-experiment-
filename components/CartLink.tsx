"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export function CartLink() {
  const { itemCount } = useCart();

  return (
    <Link className="cart-link" href="/cart" aria-label={`Cart with ${itemCount} items`}>
      <span aria-hidden="true">Bag</span>
      <span className="cart-count">{itemCount}</span>
    </Link>
  );
}
