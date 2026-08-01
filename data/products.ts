export type ProductCategory = "Apparel" | "Toys" | "Decor";

export type Product = {
  id: string;
  title: string;
  price: number;
  category: ProductCategory;
  image: string;
  description: string;
  materials: string;
  dimensions: string;
  care: string;
  featured?: boolean;
};

export const products: Product[] = [
  {
    id: "mabel-amigurumi-bunny",
    title: "Mabel Amigurumi Bunny",
    price: 42,
    category: "Toys",
    image: "https://images.unsplash.com/photo-1615486363973-f79d875780cf?auto=format&fit=crop&w=1200&q=85",
    description: "A palm-soft keepsake bunny with embroidered details, gentle stuffing, and a sweet heirloom feel for nurseries or thoughtful gifting.",
    materials: "100% Cotton Yarn, recycled polyfill, cotton embroidery thread",
    dimensions: "Approx. 9 inches tall",
    care: "Spot clean with cool water and lay flat to dry",
    featured: true,
  },
  {
    id: "heirloom-ripple-blanket",
    title: "Heirloom Ripple Blanket",
    price: 128,
    category: "Decor",
    image: "https://images.unsplash.com/photo-1616627989838-86bbca4bb5ac?auto=format&fit=crop&w=1200&q=85",
    description: "A weighty ripple throw in a muted garden palette, stitched slowly for the sofa, reading chair, or a meaningful housewarming gift.",
    materials: "Merino blend yarn with cotton edge finishing",
    dimensions: "Approx. 46 x 58 inches",
    care: "Gentle cold wash in a mesh bag, dry flat",
    featured: true,
  },
  {
    id: "terracotta-market-tote",
    title: "Terracotta Market Tote",
    price: 58,
    category: "Apparel",
    image: "https://images.unsplash.com/photo-1607344645866-009c320f8671?auto=format&fit=crop&w=1200&q=85",
    description: "A structured cotton tote with open stitch texture, sturdy handles, and a warm clay tone made for flowers, books, and weekend errands.",
    materials: "100% Cotton Yarn",
    dimensions: "Approx. 14 x 15 inches, not including handles",
    care: "Hand wash cold and reshape while damp",
    featured: true,
  },
  {
    id: "sage-cloud-beanie",
    title: "Sage Cloud Beanie",
    price: 36,
    category: "Apparel",
    image: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=1200&q=85",
    description: "A plush ribbed beanie with a folded brim and soft sage finish, warm enough for winter walks without feeling bulky.",
    materials: "Baby alpaca and merino blend yarn",
    dimensions: "Adult medium with flexible stretch",
    care: "Hand wash cold and dry flat",
  },
  {
    id: "cream-cable-cardigan",
    title: "Cream Cable Cardigan",
    price: 164,
    category: "Apparel",
    image: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=1200&q=85",
    description: "A limited-run cardigan with raised cable texture, corozo buttons, and an easy relaxed fit for layered everyday wear.",
    materials: "Wool cotton blend yarn, corozo buttons",
    dimensions: "Relaxed fit, made to order sizing",
    care: "Dry clean or hand wash cold with wool wash",
    featured: true,
  },
  {
    id: "mini-mushroom-garland",
    title: "Mini Mushroom Garland",
    price: 44,
    category: "Decor",
    image: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=85",
    description: "A playful strand of tiny crocheted mushrooms and wooden beads for a nursery wall, studio shelf, or seasonal mantel.",
    materials: "Cotton yarn, beechwood beads, braided cotton cord",
    dimensions: "Approx. 52 inches long",
    care: "Dust gently; avoid prolonged moisture",
  },
  {
    id: "pocket-whale-plush",
    title: "Pocket Whale Plush",
    price: 28,
    category: "Toys",
    image: "https://images.unsplash.com/photo-1584559582128-b8be739912e6?auto=format&fit=crop&w=1200&q=85",
    description: "A small ocean friend with a rounded shape and stitched smile, sized for desks, stockings, and tiny surprise gifts.",
    materials: "100% Cotton Yarn, recycled polyfill",
    dimensions: "Approx. 5 inches long",
    care: "Spot clean only",
  },
  {
    id: "sunwash-baby-booties",
    title: "Sunwash Baby Booties",
    price: 34,
    category: "Apparel",
    image: "https://images.unsplash.com/photo-1545048702-79362596cdc9?auto=format&fit=crop&w=1200&q=85",
    description: "Tiny ribbed booties in warm cream and honey tones, finished with soft ties for a handmade baby shower gift.",
    materials: "Organic cotton yarn",
    dimensions: "0 to 6 months",
    care: "Machine wash cold in a mesh bag, dry flat",
  },
];

export const categories = ["All", "Apparel", "Toys", "Decor"] as const;

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function getProduct(id: string) {
  return products.find((product) => product.id === id);
}
