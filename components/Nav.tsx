import Link from "next/link";
import { CartLink } from "@/components/CartLink";

export function Nav() {
  return (
    <header className="site-header">
      <nav className="nav container" aria-label="Main navigation">
        <Link className="brand" href="/">
          <span className="brand-mark">C</span>
          <span>Cozy Atelier</span>
        </Link>
        <div className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/shop">Shop</Link>
          <Link href="/#maker">About</Link>
        </div>
        <CartLink />
      </nav>
    </header>
  );
}
