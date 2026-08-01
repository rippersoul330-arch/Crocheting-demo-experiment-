import { Button } from "@/components/Button";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/data/products";

const featuredProducts = products.filter((product) => product.featured).slice(0, 4);

export default function Home() {
  return (
    <main>
      <section className="hero container">
        <div>
          <p className="eyebrow">Handmade crochet studio</p>
          <h1>Soft pieces for homes with a handmade heart.</h1>
          <p className="hero-copy">
            Cozy Atelier creates small-batch crochet apparel, amigurumi toys, and
            textured decor from natural fibers, finished slowly and wrapped like a gift.
          </p>
          <div className="hero-actions">
            <Button href="/shop">Shop the Collection</Button>
            <Button href="#maker" variant="secondary">
              Meet the Maker
            </Button>
          </div>
          <div className="hero-stats" aria-label="Studio highlights">
            <div className="stat">
              <strong>Natural</strong>
              <span>cotton, wool, and alpaca yarns</span>
            </div>
            <div className="stat">
              <strong>Small batch</strong>
              <span>limited drops and custom notes</span>
            </div>
            <div className="stat">
              <strong>Gift ready</strong>
              <span>wrapped with care cards included</span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1615486363973-f79d875780cf?auto=format&fit=crop&w=1400&q=88"
            alt="Handmade crochet bunny with soft yarn textures"
          />
          <div className="hero-note">
            <p className="eyebrow">New this week</p>
            <h3>Mabel Bunny and heirloom throws are ready for gifting.</h3>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-header">
          <div>
            <p className="eyebrow">Featured creations</p>
            <h2>Fresh from the workbasket</h2>
          </div>
          <p>
            Finished pieces are made in limited quantities, so each item carries the
            natural variation and warmth of handwork.
          </p>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="section container" id="maker">
        <div className="maker-section">
          <div className="maker-image">
            <img
              src="https://images.unsplash.com/photo-1517840933437-c41356892b35?auto=format&fit=crop&w=1200&q=85"
              alt="Crochet maker arranging yarn in a warm studio"
            />
          </div>
          <div className="maker-copy">
            <p className="eyebrow">Meet the maker</p>
            <h2>Made slowly, finished beautifully.</h2>
            <p>
              Every Cozy Atelier piece starts with a fiber-first palette and ends with
              a careful finishing pass: tucked ends, shaped edges, embroidered details,
              and a handwritten care card. The result is soft, useful, and personal.
            </p>
            <div className="hero-actions">
              <Button href="/shop">Browse Handmade Goods</Button>
              <Button href="/success" variant="secondary">
                Ask About Custom Work
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
