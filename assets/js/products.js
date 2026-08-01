/* =====================================================================
   Loop & Ivy — data layer + self-contained SVG art generator
   No external assets required: every product renders a hand-drawn,
   crochet-inspired SVG "photo" so the store looks premium offline too.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- small helpers ---------- */
  const enc = (svg) =>
    "data:image/svg+xml," +
    encodeURIComponent(svg.replace(/\s{2,}/g, " ").trim());

  const lighten = (hex, amt) => shift(hex, amt);
  const darken = (hex, amt) => shift(hex, -amt);
  function shift(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------- shared defs: stitch texture + granny motif ---------- */
  function defs(t, id) {
    return `
    <defs>
      <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${lighten(t.bg, 14)}"/>
        <stop offset="1" stop-color="${darken(t.bg, 10)}"/>
      </linearGradient>
      <radialGradient id="vig${id}" cx="0.5" cy="0.42" r="0.75">
        <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#2b201b" stop-opacity="0.28"/>
      </radialGradient>
      <pattern id="stitch${id}" width="26" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
        <path d="M0 14 L6.5 2 L13 14 M13 14 L19.5 2 L26 14" fill="none"
              stroke="${lighten(t.bg, 22)}" stroke-opacity="0.55" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M-13 14 L-6.5 2 L0 14 M13 30 L19.5 18 L26 30" fill="none"
              stroke="${darken(t.bg, 8)}" stroke-opacity="0.28" stroke-width="2.4" stroke-linecap="round"/>
      </pattern>
    </defs>`;
  }

  /* A classic crochet "granny square" tile */
  function grannyTile(t, id) {
    const c1 = t.yarn, c2 = t.accent, c3 = lighten(t.bg, 26);
    return `
    <pattern id="granny${id}" width="120" height="120" patternUnits="userSpaceOnUse">
      <rect width="120" height="120" fill="${darken(t.bg, 4)}"/>
      <g transform="translate(60 60)" fill="none" stroke-linejoin="round" stroke-linecap="round">
        <rect x="-52" y="-52" width="104" height="104" rx="10" stroke="${c1}" stroke-width="7" stroke-dasharray="2 7"/>
        <rect x="-38" y="-38" width="76" height="76" rx="8" stroke="${c3}" stroke-width="7" stroke-dasharray="2 7"/>
        <rect x="-24" y="-24" width="48" height="48" rx="6" stroke="${c2}" stroke-width="7" stroke-dasharray="2 6"/>
        <g fill="${c1}" stroke="none">
          <circle cx="0" cy="-12" r="6"/><circle cx="0" cy="12" r="6"/>
          <circle cx="-12" cy="0" r="6"/><circle cx="12" cy="0" r="6"/>
        </g>
        <circle r="6" fill="${c3}" stroke="none"/>
      </g>
    </pattern>`;
  }

  /* ---------- product motif illustrations (centered, ~ -80..80) ---------- */
  const MOTIF = {
    blanket: (c, s) => `
      <g stroke="${s}" stroke-width="3" fill="${c}" stroke-linejoin="round">
        <path d="M-78 40 q10 -14 24 -8 l108 0 q14 -6 24 8 l0 34 -156 0 z" fill="${c}"/>
        <path d="M-78 40 q10 -14 24 -8 l108 0 q14 -6 24 8" fill="none"/>
        <path d="M-70 24 q10 -14 24 -8 l108 0 q14 -6 24 8 l0 20 -156 0 z" fill="${darkish(c)}"/>
        <path d="M-62 8 q10 -14 24 -8 l108 0 q14 -6 24 8 l0 20 -156 0 z" fill="${c}"/>
        <g stroke="${s}" stroke-width="2" opacity="0.5">
          <line x1="-50" y1="52" x2="-50" y2="70"/><line x1="-20" y1="52" x2="-20" y2="70"/>
          <line x1="10" y1="52" x2="10" y2="70"/><line x1="40" y1="52" x2="40" y2="70"/><line x1="66" y1="52" x2="66" y2="70"/>
        </g>
      </g>`,
    sweater: (c, s) => `
      <g fill="${c}" stroke="${s}" stroke-width="3" stroke-linejoin="round">
        <path d="M-30 -46 q30 -12 60 0 l30 20 -14 26 -16 -10 0 60 -60 0 0 -60 -16 10 -14 -26 z"/>
        <path d="M-30 -46 q30 22 60 0" fill="none"/>
        <g stroke="${darkish(c)}" stroke-width="2" opacity="0.6" fill="none">
          <line x1="-24" y1="10" x2="24" y2="10"/><line x1="-24" y1="24" x2="24" y2="24"/><line x1="-24" y1="38" x2="24" y2="38"/>
        </g>
      </g>`,
    bag: (c, s) => `
      <g fill="${c}" stroke="${s}" stroke-width="3" stroke-linejoin="round">
        <path d="M-40 -34 a40 34 0 0 1 80 0" fill="none" stroke-width="6"/>
        <path d="M-46 -8 l92 0 8 78 -108 0 z"/>
        <g stroke="${darkish(c)}" stroke-width="2.2" opacity="0.55" fill="none">
          <line x1="-40" y1="16" x2="44" y2="16"/><line x1="-42" y1="36" x2="46" y2="36"/><line x1="-44" y1="56" x2="48" y2="56"/>
        </g>
      </g>`,
    hat: (c, s) => `
      <g fill="${c}" stroke="${s}" stroke-width="3" stroke-linejoin="round">
        <path d="M-44 30 q0 -78 44 -78 q44 0 44 78 z"/>
        <rect x="-52" y="26" width="104" height="26" rx="13" fill="${darkish(c)}"/>
        <circle cx="0" cy="-52" r="14" fill="${c}"/>
        <g stroke="${darkish(c)}" stroke-width="2.4" opacity="0.55" fill="none">
          <path d="M-24 22 q0 -44 0 -60"/><path d="M0 24 q0 -50 0 -66"/><path d="M24 22 q0 -44 0 -60"/>
        </g>
      </g>`,
    toy: (c, s) => `
      <g fill="${c}" stroke="${s}" stroke-width="3" stroke-linejoin="round">
        <circle cx="-26" cy="-40" r="13"/><circle cx="26" cy="-40" r="13"/>
        <circle cx="0" cy="-8" r="40"/>
        <circle cx="-14" cy="-14" r="4.5" fill="${s}" stroke="none"/>
        <circle cx="14" cy="-14" r="4.5" fill="${s}" stroke="none"/>
        <path d="M-8 2 q8 8 16 0" fill="none" stroke="${s}" stroke-width="3"/>
        <ellipse cx="0" cy="46" rx="34" ry="20"/>
      </g>`,
    plant: (c, s) => `
      <g stroke="${s}" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M0 -66 l0 20 M-40 -50 l40 8 40 -8 M-52 -30 l52 12 52 -12"/>
        <path d="M-34 -18 q34 26 68 0 l-8 46 -52 0 z" fill="${c}" stroke="${s}"/>
        <g stroke="${darkish(c)}" stroke-width="2.2" opacity="0.6">
          <line x1="-24" y1="4" x2="26" y2="4"/><line x1="-20" y1="20" x2="22" y2="20"/>
        </g>
        <path d="M-6 -18 q-22 -30 -2 -50 q22 18 2 50" fill="${lightish(c)}" stroke="${s}"/>
        <path d="M6 -18 q30 -22 20 -48 q-30 14 -20 48" fill="${lightish(c)}" stroke="${s}"/>
      </g>`,
    coaster: (c, s) => `
      <g fill="none" stroke="${s}" stroke-width="3">
        <circle cx="0" cy="6" r="58" fill="${c}"/>
        <circle cx="0" cy="6" r="44" stroke="${darkish(c)}" stroke-dasharray="3 8"/>
        <circle cx="0" cy="6" r="28" stroke="${lightish(c)}" stroke-dasharray="3 7"/>
        <circle cx="0" cy="6" r="10" fill="${darkish(c)}" stroke="none"/>
        <g stroke="${darkish(c)}" stroke-width="2.4" opacity="0.7">
          ${Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return `<line x1="${Math.cos(a) * 46}" y1="${6 + Math.sin(a) * 46}" x2="${Math.cos(a) * 58}" y2="${6 + Math.sin(a) * 58}"/>`;
          }).join("")}
        </g>
      </g>`,
    scarf: (c, s) => `
      <g fill="${c}" stroke="${s}" stroke-width="3" stroke-linejoin="round">
        <path d="M-18 -60 q-40 40 -30 120 l24 0 q-4 -70 30 -108 z"/>
        <path d="M18 -60 q40 40 30 120 l-24 0 q4 -70 -30 -108 z"/>
        <g stroke="${lightish(c)}" stroke-width="6" stroke-linecap="round" opacity="0.9">
          <line x1="-42" y1="66" x2="-42" y2="82"/><line x1="-30" y1="66" x2="-30" y2="82"/>
          <line x1="30" y1="66" x2="30" y2="82"/><line x1="42" y1="66" x2="42" y2="82"/>
        </g>
      </g>`,
    cushion: (c, s) => `
      <g fill="${c}" stroke="${s}" stroke-width="3" stroke-linejoin="round">
        <path d="M-56 -50 q56 -10 112 0 q10 56 0 112 q-56 10 -112 0 q-10 -56 0 -112 z"/>
        <g stroke="${darkish(c)}" stroke-width="2.2" opacity="0.55" fill="none">
          <line x1="-40" y1="-20" x2="40" y2="-20"/><line x1="-42" y1="0" x2="42" y2="0"/><line x1="-40" y1="20" x2="40" y2="20"/>
        </g>
        <circle cx="0" cy="0" r="12" fill="none" stroke="${lightish(c)}" stroke-width="3"/>
      </g>`,
    booties: (c, s) => `
      <g fill="${c}" stroke="${s}" stroke-width="3" stroke-linejoin="round">
        <path d="M-58 -20 q6 -22 26 -22 q18 0 20 22 l0 22 40 6 q14 4 14 20 l-100 0 q-6 -34 0 -70 z"/>
        <path d="M-4 -30 q0 -20 6 -20" fill="none" stroke="${lightish(c)}" stroke-width="6" stroke-linecap="round"/>
        <g stroke="${darkish(c)}" stroke-width="2.2" opacity="0.55" fill="none">
          <line x1="-48" y1="18" x2="42" y2="24"/>
        </g>
      </g>`,
  };
  function darkish(c) { return shift(c, -34); }
  function lightish(c) { return shift(c, 34); }

  /* ---------- compose a product "photo" ---------- */
  function buildProductImage(p, w = 800, h = 1000) {
    const t = p.theme;
    const id = p.id;
    const useGranny = ["blanket", "cushion", "coaster", "booties"].includes(p.motif);
    const base = useGranny
      ? `${grannyTile(t, id)}`
      : "";
    const fill = useGranny ? `url(#granny${id})` : `url(#bg${id})`;
    const motif = MOTIF[p.motif] ? MOTIF[p.motif](t.yarn, darkish(t.yarn)) : "";
    const scale = w / 400;
    return enc(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
      ${defs(t, id)}
      ${base}
      <rect width="${w}" height="${h}" fill="${fill}"/>
      <rect width="${w}" height="${h}" fill="url(#stitch${id})" opacity="${useGranny ? 0.0 : 0.5}"/>
      <g transform="translate(${w / 2} ${h / 2 - h * 0.03}) scale(${scale * 1.55})">
        <ellipse cx="0" cy="120" rx="150" ry="26" fill="#2b201b" opacity="0.12"/>
        ${motif}
      </g>
      <rect width="${w}" height="${h}" fill="url(#vig${id})"/>
    </svg>`);
  }

  /* ---------- editorial scene images (hero / story) ---------- */
  function buildScene(kind) {
    const scenes = {
      "hero-1": { bg: "#c98a5e", yarn: "#f3e6d4", accent: "#a85a3c", motif: "sweater" },
      "hero-2": { bg: "#7d8a6c", yarn: "#eef0e2", accent: "#5e6b50", motif: "blanket" },
      "story-1": { bg: "#b06b45", yarn: "#f0e2d0", accent: "#7d4a2e", motif: "bag" },
      "story-2": { bg: "#8a9576", yarn: "#eef0e2", accent: "#5e6b50", motif: "toy" },
    };
    const s = scenes[kind] || scenes["hero-1"];
    const p = { id: "sc-" + kind, theme: s, motif: s.motif };
    return buildProductImage(p, 800, 1000);
  }

  /* ---------- categories ---------- */
  const CATEGORIES = [
    { id: "all", label: "All pieces" },
    { id: "blankets", label: "Blankets & Throws" },
    { id: "sweaters", label: "Sweaters" },
    { id: "bags", label: "Bags" },
    { id: "accessories", label: "Accessories" },
    { id: "home", label: "Home" },
    { id: "baby", label: "Baby" },
    { id: "amigurumi", label: "Amigurumi" },
  ];

  /* ---------- themes ---------- */
  const T = {
    clay:    { bg: "#c07a52", yarn: "#f4e7d6", accent: "#8f4c2e" },
    sage:    { bg: "#7f8c6d", yarn: "#eef1e3", accent: "#57633f" },
    blush:   { bg: "#d3a486", yarn: "#f6eae0", accent: "#a86a4c" },
    plum:    { bg: "#8b6a7d", yarn: "#f2e6ee", accent: "#5f4453" },
    ochre:   { bg: "#c69b4e", yarn: "#f6ecd6", accent: "#8f6a26" },
    slate:   { bg: "#6f7f88", yarn: "#e6eef1", accent: "#455860" },
    forest:  { bg: "#5f7256", yarn: "#e8efdf", accent: "#3c4c34" },
    rose:    { bg: "#c67b7b", yarn: "#f6e3e3", accent: "#984f4f" },
    cream:   { bg: "#c9a07f", yarn: "#f6ecdf", accent: "#a07a54" },
    denim:   { bg: "#6b7f96", yarn: "#e6edf4", accent: "#43566b" },
  };
  // safe fallback for any malformed theme
  const safe = (o) => ({ bg: o.bg || "#c07a52", yarn: (o.yarn || "#f4e7d6").replace(/\s/g, ""), accent: o.accent || "#8f4c2e" });

  /* ---------- products ---------- */
  const RAW = [
    { id: "p1",  name: "Hearth Granny Throw",        category: "blankets",   motif: "blanket", theme: T.clay,  price: 189, old: 235, tag: "Bestseller", featured: 1, rating: 4.9, reviews: 214,
      blurb: "A generous granny-square throw in hand-dyed wool, warm enough to live under all winter.",
      materials: ["Hand-dyed merino & lambswool", "130 × 170 cm", "Made to order in 2–3 weeks", "Plant-dyed, plastic-free"] },
    { id: "p2",  name: "Meadow Oversized Cardigan",  category: "sweaters",   motif: "sweater", theme: T.sage,  price: 168, tag: "New", featured: 2, rating: 4.8, reviews: 96,
      blurb: "A slouchy, open-front cardigan with balloon sleeves in soft organic cotton.",
      materials: ["100% organic cotton", "Relaxed unisex fit", "Sizes XS–XXL", "Hand-crocheted, one at a time"] },
    { id: "p3",  name: "Market Day Tote",            category: "bags",       motif: "bag",     theme: T.ochre, price: 74,  tag: "Bestseller", featured: 3, rating: 4.9, reviews: 341,
      blurb: "A roomy, structured tote with a snug weave that holds its shape and your whole market haul.",
      materials: ["Recycled cotton cord", "Reinforced base", "38 × 40 cm", "Interior pocket"] },
    { id: "p4",  name: "Storm Cloud Beanie",         category: "accessories",motif: "hat",     theme: T.slate, price: 42,  rating: 4.7, reviews: 128,
      blurb: "A ribbed slouch beanie topped with a hand-tied pom, in heathered alpaca blend.",
      materials: ["Baby alpaca blend", "Fleece-lined band", "One size, stretch fit"] },
    { id: "p5",  name: "Willow Hanging Planter",     category: "home",       motif: "plant",   theme: T.forest,price: 38,  tag: "New", rating: 4.8, reviews: 67,
      blurb: "A macramé-meets-crochet hanger that cradles your favourite trailing plant.",
      materials: ["Natural jute & cotton", "Fits 12–16 cm pots", "Adjustable drop", "Pot & plant not included"] },
    { id: "p6",  name: "Honey Bear Amigurumi",       category: "amigurumi",  motif: "toy",     theme: T.ochre, price: 46,  tag: "Handmade", rating: 5.0, reviews: 189,
      blurb: "A weighted little bear with embroidered features and jointed arms — a keepsake from day one.",
      materials: ["Organic cotton, safety-tested", "22 cm tall", "Machine-washable", "CE toy-safety certified"] },
    { id: "p7",  name: "Dawn Ripple Baby Blanket",   category: "baby",       motif: "blanket", theme: T.blush, price: 88,  tag: "Bestseller", featured: 4, rating: 4.9, reviews: 152,
      blurb: "A feather-soft ripple blanket in gentle pastels — the pram blanket that becomes an heirloom.",
      materials: ["OEKO-TEX baby cotton", "80 × 100 cm", "Hypoallergenic", "Gift-wrapped free"] },
    { id: "p8",  name: "Terracotta Cushion Cover",   category: "home",       motif: "cushion", theme: T.rose,  price: 58,  rating: 4.6, reviews: 74,
      blurb: "A textured bobble-stitch cushion cover that adds warmth to any sofa or reading nook.",
      materials: ["Chunky recycled cotton", "45 × 45 cm", "Hidden button back", "Insert not included"] },
    { id: "p9",  name: "Coastal Doily Coasters",     category: "home",       motif: "coaster", theme: T.denim, price: 28,  tag: "Set of 4", rating: 4.7, reviews: 58,
      blurb: "A set of four lacy coasters that dress up the table and soak up the rings.",
      materials: ["Waxed cotton thread", "Set of 4, 11 cm", "Wipe clean", "Lie perfectly flat"] },
    { id: "p10", name: "Fireside Chunky Scarf",      category: "accessories",motif: "scarf",   theme: T.clay,  price: 64,  old: 79, tag: "Sale", rating: 4.8, reviews: 133,
      blurb: "An extra-long, extra-chunky scarf you can loop three times and still have length to spare.",
      materials: ["Wool-alpaca blend", "24 × 200 cm", "Fringed ends", "Naturally water-repellent"] },
    { id: "p11", name: "Juniper Crossbody Bag",      category: "bags",       motif: "bag",     theme: T.forest,price: 82,  tag: "New", rating: 4.9, reviews: 41,
      blurb: "A tidy crossbody in a tight moss-stitch weave with an adjustable leather strap.",
      materials: ["Cotton & vegetable-tanned leather", "Magnetic closure", "24 × 18 cm", "Lined interior"] },
    { id: "p12", name: "Cloud Nine Baby Booties",    category: "baby",       motif: "booties", theme: T.plum,  price: 32,  tag: "Handmade", rating: 5.0, reviews: 97,
      blurb: "The softest first shoes — tiny crocheted booties with a stay-on ankle tie.",
      materials: ["Organic merino", "0–12 month sizes", "Non-slip sole option", "Comes gift-boxed"] },
  ];

  const PRODUCTS = RAW.map((p) => {
    p.theme = safe(p.theme);
    p.img = buildProductImage(p);
    return p;
  });

  /* ---------- reviews ---------- */
  const REVIEWS = [
    { text: "The throw is even more beautiful in person. You can genuinely feel the hours of work in it — it's the first thing guests comment on.", name: "Amara O.", meta: "Verified · Hearth Granny Throw", theme: "#c07a52" },
    { text: "I've bought three amigurumi bears as new-baby gifts now. The craftsmanship is impeccable and the packaging is a gift in itself.", name: "Daniel R.", meta: "Verified · Honey Bear", theme: "#7f8c6d" },
    { text: "My cardigan has become the piece I reach for every single day. It softens beautifully with wear and the fit is perfect.", name: "Priya S.", meta: "Verified · Meadow Cardigan", theme: "#8b6a7d" },
  ];

  /* expose */
  window.LoopIvy = { PRODUCTS, CATEGORIES, REVIEWS, buildProductImage, buildScene };
})();
