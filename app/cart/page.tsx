"use client";

import { Button } from "@/components/Button";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, itemCount, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <main className="container">
        <section className="empty-state">
          <p className="eyebrow">Your cart</p>
          <h1>Your basket is waiting for something soft.</h1>
          <p>
            Add a handmade crochet piece to start a mock order inquiry. No payment
            gateway is connected in this version.
          </p>
          <Button href="/shop">Browse the Shop</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="page-heading">
        <p className="eyebrow">Your cart</p>
        <h1>Review your handmade selections.</h1>
      </section>
      <section className="cart-page">
        <div className="cart-list">
          {items.map((item) => (
            <article className="cart-item" key={item.id}>
              <img src={item.image} alt={item.title} />
              <div>
                <h3>{item.title}</h3>
                <p className="price">{formatPrice(item.price)}</p>
                <div className="quantity-row">
                  <button
                    aria-label={`Decrease ${item.title} quantity`}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    type="button"
                  >
                    -
                  </button>
                  <strong>{item.quantity}</strong>
                  <button
                    aria-label={`Increase ${item.title} quantity`}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    type="button"
                  >
                    +
                  </button>
                  <button className="remove-button" onClick={() => removeItem(item.id)} type="button">
                    Remove
                  </button>
                </div>
              </div>
              <p className="price">{formatPrice(item.price * item.quantity)}</p>
            </article>
          ))}
        </div>
        <aside className="summary-box" aria-label="Order summary">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Items</span>
            <strong>{itemCount}</strong>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <strong>Quoted later</strong>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <Button href="/success" full onClick={clearCart}>
            Checkout Inquiry
          </Button>
        </aside>
      </section>
    </main>
  );
}
