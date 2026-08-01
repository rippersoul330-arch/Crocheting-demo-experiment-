import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Button } from "@/components/Button";
import { formatPrice, type Product } from "@/data/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link className="card-image" href={`/product/${product.id}`}>
        <img src={product.image} alt={product.title} />
      </Link>
      <div className="card-body">
        <div className="card-top">
          <h3>{product.title}</h3>
          <span className="price">{formatPrice(product.price)}</span>
        </div>
        <p>{product.description}</p>
        <div className="card-actions">
          <AddToCartButton product={product} />
          <Button href={`/product/${product.id}`} variant="secondary">
            View
          </Button>
        </div>
      </div>
    </article>
  );
}
