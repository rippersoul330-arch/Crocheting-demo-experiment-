import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Button } from "@/components/Button";
import { formatPrice, getProduct, products } from "@/data/products";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(id);

  if (!product) {
    return { title: "Product Not Found" };
  }

  return {
    title: product.title,
    description: product.description,
    openGraph: {
      title: product.title,
      description: product.description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <main className="container">
      <section className="product-detail">
        <div className="product-media">
          <img src={product.image} alt={product.title} />
        </div>
        <div className="detail-panel">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.title}</h1>
          <p className="price detail-price">{formatPrice(product.price)}</p>
          <p className="detail-description">{product.description}</p>
          <ul className="detail-list">
            <li>
              <strong>Materials</strong>
              <span>{product.materials}</span>
            </li>
            <li>
              <strong>Size</strong>
              <span>{product.dimensions}</span>
            </li>
            <li>
              <strong>Care</strong>
              <span>{product.care}</span>
            </li>
          </ul>
          <AddToCartButton product={product} full />
          <div className="hero-actions">
            <Button href="/shop" variant="secondary">
              Back to Shop
            </Button>
            <Button href="/cart" variant="secondary">
              View Cart
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
