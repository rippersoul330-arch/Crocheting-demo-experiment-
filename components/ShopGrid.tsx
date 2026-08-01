"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { categories, products } from "@/data/products";

export function ShopGrid() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("All");

  const visibleProducts = useMemo(() => {
    if (activeCategory === "All") {
      return products;
    }
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory]);

  return (
    <>
      <div className="filters" aria-label="Product categories">
        {categories.map((category) => (
          <button
            className={`filter-button${activeCategory === category ? " active" : ""}`}
            key={category}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </div>
      <div className="product-grid">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
