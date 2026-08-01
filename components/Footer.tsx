import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner container">
        <div>
          <h2>Cozy Atelier</h2>
          <p>
            Small-batch crochet goods made with natural fibers, careful finishing,
            and a slower kind of luxury.
          </p>
        </div>
        <div>
          <h3>Shop</h3>
          <div className="footer-links">
            <Link href="/shop">All Creations</Link>
            <Link href="/shop">Apparel</Link>
            <Link href="/shop">Toys</Link>
            <Link href="/shop">Decor</Link>
          </div>
        </div>
        <div>
          <h3>Studio</h3>
          <div className="footer-links">
            <Link href="/#maker">Meet the Maker</Link>
            <Link href="/cart">Cart</Link>
            <Link href="/success">Order Inquiry</Link>
          </div>
        </div>
        <div>
          <h3>Care</h3>
          <p>Gift wrapping, custom color notes, and care cards are included with every finished piece.</p>
        </div>
      </div>
    </footer>
  );
}
