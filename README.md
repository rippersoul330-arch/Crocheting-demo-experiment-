# Loop &amp; Ivy — Handmade Crochet Atelier

A premium, fully responsive e-commerce storefront for a handmade crochet brand.
Built as a **dependency-free static site** (plain HTML, CSS and JavaScript) so it
runs anywhere with no build step — just open `index.html`.

![Loop & Ivy](assets/img/favicon.svg)

## Highlights

- **Editorial, boutique design** — warm artisanal palette, Fraunces + Jost typography,
  layered hero collage, animated marquees, spinning "handmade" seal, and a woven paper texture.
- **Self-contained product art** — every product image is a hand-drawn SVG generated in
  the browser (classic crochet *granny-square* and *stitch* patterns plus 10 unique product
  motifs), so the shop looks stunning even with no network and never shows a broken image.
- **Full shopping experience:**
  - Featured "Autumn Hearth" collection with a mosaic layout
  - Filterable + sortable catalog (12 products across 8 categories)
  - Quick-view product modal with quantity selector
  - Slide-in cart drawer with quantity controls, subtotal and a free-shipping progress meter
  - Wishlist toggles, toast notifications, newsletter signup with validation
  - Cart &amp; wishlist persist across visits via `localStorage`
- **Polished UX** — sticky blurred header, scroll-reveal animations, mobile nav,
  keyboard (Esc) support, and full `prefers-reduced-motion` handling.
- **Responsive** from a 4-column desktop grid down to a single-column phone layout.

## Structure

```
index.html                # markup for every section + cart drawer + quick-view modal
assets/
  css/styles.css          # design tokens, components, animations, responsive rules
  js/products.js          # product data + self-contained SVG art generator
  js/main.js              # cart, filtering, sort, modal, reveal, toast, newsletter
  img/favicon.svg         # brand mark
```

## Run it

No install required:

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

or simply open `index.html` in a browser.

> This is a demo storefront — no real orders or payments are processed.
