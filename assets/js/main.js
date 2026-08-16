/* =====================================================================
   Loop & Ivy — storefront interactions
   ===================================================================== */
(function () {
  "use strict";
  let PRODUCTS = window.LoopIvy.PRODUCTS;                 // may be refreshed from Supabase
  const { CATEGORIES, REVIEWS, buildScene } = window.LoopIvy;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const stars = (r) => "★★★★★".slice(0, Math.round(r)) + "☆☆☆☆☆".slice(0, 5 - Math.round(r));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const FREE_SHIP = 1500;
  /* turn a shop name into a URL-safe handle, e.g. "Maggie's Yarn" -> "maggies-yarn" */
  const slugify = (s) => String(s || "").toLowerCase().trim()
    .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  /* ---------------- state ---------------- */
  let cart = load("loopivy_cart", {});      // { id: qty }
  let wish = load("loopivy_wish", []);       // [id]
  let activeCat = "all";
  let sortMode = "featured";
  let activeSeller = null;                   // slug of the seller being viewed (from ?seller=)
  let pendingProduct = null;                 // product id/slug to auto-open (from ?product=)

  /* Read shareable-link params: ?seller=<handle> and/or ?product=<slug> */
  (function readLinkParams() {
    try {
      const q = new URLSearchParams(location.search);
      const s = q.get("seller") || q.get("shop");
      if (s) activeSeller = slugify(s);
      const p = q.get("product") || q.get("item");
      if (p) pendingProduct = p.trim();
    } catch (e) { /* ignore */ }
  })();

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  function save() {
    try {
      localStorage.setItem("loopivy_cart", JSON.stringify(cart));
      localStorage.setItem("loopivy_wish", JSON.stringify(wish));
    } catch (e) { /* storage may be blocked */ }
  }

  /* ---------------- scene backgrounds ---------------- */
  $$("[data-img]").forEach((el) => {
    el.style.backgroundImage = `url("${buildScene(el.dataset.img)}")`;
  });

  /* ---------------- footer year ---------------- */
  $("#year").textContent = new Date().getFullYear();

  /* =====================================================================
     Product card template
     ===================================================================== */
  function cardHTML(p) {
    const onsale = p.old && p.old > p.price;
    const tag = p.tag
      ? `<span class="card__tag ${p.tag.toLowerCase() === "sale" ? "card__tag--sale" : ""}">${p.tag}</span>`
      : "";
    const active = wish.includes(p.id) ? "is-active" : "";
    return `
      <article class="card" data-id="${p.id}">
        <div class="card__media">
          <img class="card__img" src="${p.img}" alt="${p.name}" loading="lazy" width="800" height="1000" />
          ${tag}
          <button class="card__wish ${active}" data-wish="${p.id}" aria-label="Save ${p.name}">
            <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.2 1.2 4 2.4.8-1.2 2-2.4 4-2.4 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20z"/></svg>
          </button>
          <button class="card__quick" data-quick="${p.id}">Quick view</button>
        </div>
        <div class="card__body">
          <span class="card__cat">${catLabel(p.category)}</span>
          <h3 class="card__name">${p.name}</h3>
          ${p.maker ? `<span class="card__maker">by ${p.maker}</span>` : ""}
          <div class="card__rating"><span class="card__stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)} · ${p.reviews}</div>
          <div class="card__foot">
            <span class="card__price">${onsale ? `<s>${money(p.old)}</s>` : ""}${money(p.price)}</span>
            <button class="card__add" data-add="${p.id}" aria-label="Add ${p.name} to basket">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>
      </article>`;
  }
  function catLabel(id) {
    const c = CATEGORIES.find((c) => c.id === id);
    return c ? c.label.replace(" & Throws", "").replace("All pieces", "All") : id;
  }

  /* =====================================================================
     Featured collection
     ===================================================================== */
  /* keep only the active seller's products (no-op when browsing everyone) */
  function sellerScope(list) {
    if (!activeSeller) return list;
    return list.filter((p) => p.maker && slugify(p.maker) === activeSeller);
  }

  function renderFeatured() {
    let items = sellerScope(PRODUCTS.filter((p) => p.featured)).sort((a, b) => a.featured - b.featured);
    // if this seller has no "featured" flags, spotlight their first few pieces
    if (activeSeller && items.length === 0) items = sellerScope(PRODUCTS.slice()).slice(0, 3);
    $("#featuredGrid").innerHTML = items.map((p, i) => `
      <article class="fcard" data-quick="${p.id}" style="transition-delay:${i * 70}ms">
        <div class="fcard__img" style="background-image:url('${p.img}')"></div>
        <div class="fcard__body">
          <span class="fcard__cat">${catLabel(p.category)}</span>
          <h3 class="fcard__name">${p.name}</h3>
          <div class="fcard__foot">
            <span class="fcard__price">${money(p.price)}</span>
            <span class="fcard__link">View
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="12" x2="20" y2="12"/><polyline points="14 6 20 12 14 18"/></svg>
            </span>
          </div>
        </div>
      </article>`).join("");
    observe($$("#featuredGrid .fcard"));
  }

  /* =====================================================================
     Filters + grid
     ===================================================================== */
  function renderFilters() {
    $("#filters").innerHTML = CATEGORIES.map((c) =>
      `<button class="filter ${c.id === activeCat ? "is-active" : ""}" role="tab" data-cat="${c.id}">${c.label}</button>`
    ).join("");
  }

  /* Show/hide the "You're shopping from <seller>" banner. */
  function renderSellerBanner() {
    const banner = $("#sellerBanner");
    if (!banner) return;
    if (!activeSeller) { banner.hidden = true; return; }
    // resolve the seller's display name from their products
    const match = PRODUCTS.find((p) => p.maker && slugify(p.maker) === activeSeller);
    const name = match ? match.maker : activeSeller.replace(/-/g, " ");
    $("#sellerBannerName").textContent = name;
    $("#sellerBannerAvatar").textContent = name.charAt(0);
    banner.hidden = false;
  }

  /* Clear the seller filter and return to the full marketplace. */
  function clearSeller() {
    activeSeller = null;
    renderSellerBanner();
    renderFeatured();
    renderGrid();
    // drop the ?seller= param from the URL without reloading
    try {
      const url = new URL(location.href);
      url.searchParams.delete("seller");
      url.searchParams.delete("shop");
      history.replaceState(null, "", url.pathname + (url.search || "") + url.hash);
    } catch (e) { /* ignore */ }
  }

  function renderGrid() {
    let list = sellerScope(PRODUCTS.slice());
    if (activeCat !== "all") list = list.filter((p) => p.category === activeCat);
    switch (sortMode) {
      case "price-asc":  list.sort((a, b) => a.price - b.price); break;
      case "price-desc": list.sort((a, b) => b.price - a.price); break;
      case "name":       list.sort((a, b) => a.name.localeCompare(b.name)); break;
      default:           list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.reviews - a.reviews);
    }
    const grid = $("#productGrid");
    grid.innerHTML = list.map((p, i) => cardHTML(p)).join("");
    $$("#productGrid .card").forEach((el, i) => (el.style.transitionDelay = (i % 8) * 55 + "ms"));
    $("#shopEmpty").hidden = list.length !== 0;
    observe($$("#productGrid .card"));
  }

  /* =====================================================================
     Reviews
     ===================================================================== */
  function renderReviews() {
    $("#reviewsGrid").innerHTML = REVIEWS.map((r, i) => `
      <blockquote class="review" style="transition-delay:${i * 90}ms">
        <div class="review__stars">★★★★★</div>
        <p class="review__text">${r.text}</p>
        <footer class="review__who">
          <span class="review__avatar" style="background:${r.theme}">${r.name.charAt(0)}</span>
          <span>
            <span class="review__name">${r.name}</span><br />
            <span class="review__meta">${r.meta}</span>
          </span>
        </footer>
      </blockquote>`).join("");
    observe($$("#reviewsGrid .review"));
  }

  /* =====================================================================
     Cart
     ===================================================================== */
  const drawer = $("#cartDrawer");
  const overlay = $("#overlay");
  const wishDrawer = $("#wishDrawer");

  // Only count items whose product still exists (ignore stale localStorage ids).
  function validCartIds() { return Object.keys(cart).filter((id) => byId(id)); }
  function cartCount() { return validCartIds().reduce((a, id) => a + cart[id], 0); }
  function cartTotal() { return validCartIds().reduce((sum, id) => sum + byId(id).price * cart[id], 0); }

  // Drop cart/wishlist entries for products that no longer exist (e.g. old demo
  // ids after real Supabase products load, or deleted/hidden products).
  function pruneStaleItems() {
    let changed = false;
    Object.keys(cart).forEach((id) => { if (!byId(id)) { delete cart[id]; changed = true; } });
    const before = wish.length;
    wish = wish.filter((id) => byId(id));
    if (changed || wish.length !== before) save();
  }

  function addToCart(id, qty = 1) {
    cart[id] = (cart[id] || 0) + qty;
    save(); renderCart(); bumpBadge();
    const p = byId(id);
    toast(`${p.name} added to basket`);
  }
  function setQty(id, qty) {
    if (qty <= 0) delete cart[id]; else cart[id] = qty;
    save(); renderCart();
  }

  function bumpBadge() {
    const badge = $("#cartBadge");
    const n = cartCount();
    badge.textContent = n;
    badge.hidden = n === 0;
    if (n > 0) { badge.style.animation = "none"; void badge.offsetWidth; badge.style.animation = ""; }
  }

  function renderCart() {
    const ids = validCartIds();
    const body = $("#cartItems");
    const empty = $("#cartEmpty");
    const foot = $("#cartFoot");

    bumpBadge();

    if (ids.length === 0) {
      body.innerHTML = "";
      empty.hidden = false;
      foot.hidden = true;
      return;
    }
    empty.hidden = true;
    foot.hidden = false;

    body.innerHTML = ids.map((id) => {
      const p = byId(id); if (!p) return "";
      const q = cart[id];
      return `
        <div class="cart-item" data-id="${id}">
          <div class="cart-item__media"><img src="${p.img}" alt="${p.name}" /></div>
          <div>
            <span class="cart-item__cat">${catLabel(p.category)}</span>
            <div class="cart-item__name">${p.name}</div>
            <div class="cart-item__price">${money(p.price)}</div>
            <div class="qty">
              <button data-dec="${id}" aria-label="Decrease quantity">−</button>
              <span>${q}</span>
              <button data-inc="${id}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div>
            <div class="cart-item__line">${money(p.price * q)}</div>
            <button class="cart-item__remove" data-remove="${id}">Remove</button>
          </div>
        </div>`;
    }).join("");

    const total = cartTotal();
    $("#cartSubtotal").textContent = money(total);
    const ship = $("#cartShip");
    if (total >= FREE_SHIP) {
      ship.innerHTML = "✓ You've unlocked <b>free shipping across India</b>";
    } else {
      ship.innerHTML = `Add <b>${money(FREE_SHIP - total)}</b> more for free shipping`;
    }
  }

  function openCart() {
    closeWish();
    overlay.hidden = false;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeCart() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    if ($("#quickview").classList.contains("is-open") || wishDrawer.classList.contains("is-open")) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  /* =====================================================================
     Wishlist drawer
     ===================================================================== */
  function bumpWishBadge() {
    const badge = $("#wishBadge");
    const n = wish.length;
    badge.textContent = n;
    badge.hidden = n === 0;
    if (n > 0) { badge.style.animation = "none"; void badge.offsetWidth; badge.style.animation = ""; }
  }

  function renderWish() {
    const body = $("#wishItems");
    const empty = $("#wishEmpty");
    bumpWishBadge();
    const ids = wish.filter((id) => byId(id));   // only items that still exist
    if (ids.length === 0) { body.innerHTML = ""; empty.hidden = false; return; }
    empty.hidden = true;
    body.innerHTML = ids.map((id) => {
      const p = byId(id);
      const onsale = p.old && p.old > p.price;
      return `
        <div class="cart-item wish-item" data-id="${id}">
          <div class="cart-item__media"><img src="${p.img}" alt="${p.name}" /></div>
          <div>
            <span class="cart-item__cat">${catLabel(p.category)}</span>
            <div class="cart-item__name">${p.name}</div>
            <div class="cart-item__price">${onsale ? `<s>${money(p.old)}</s>` : ""}${money(p.price)}</div>
            <button class="wish-item__add" data-wishadd="${id}">Add to basket</button>
          </div>
          <div><button class="cart-item__remove" data-wishremove="${id}">Remove</button></div>
        </div>`;
    }).join("");
  }

  function openWish() {
    closeCart();
    renderWish();
    overlay.hidden = false;
    wishDrawer.classList.add("is-open");
    wishDrawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeWish() {
    wishDrawer.classList.remove("is-open");
    wishDrawer.setAttribute("aria-hidden", "true");
    if ($("#quickview").classList.contains("is-open") || drawer.classList.contains("is-open")) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  /* remove a card's heart highlight when it's un-wished elsewhere */
  function syncWishHeart(id) {
    const btn = $(`[data-wish="${id}"]`);
    if (btn) btn.classList.toggle("is-active", wish.includes(id));
  }

  /* =====================================================================
     Quick view modal
     ===================================================================== */
  const modal = $("#quickview");
  let qvQty = 1;
  let qvReviewRating = 0;   // stars picked in the review form
  let qvProductId = null;   // product currently shown (guards async review loads)

  function openQuick(id) {
    const p = byId(id); if (!p) return;
    qvQty = 1;
    qvReviewRating = 0;
    qvProductId = p.id;
    const onsale = p.old && p.old > p.price;
    const gallery = (p.images && p.images.length ? p.images : [p.img]);
    $("#quickviewPanel").innerHTML = `
      <div class="qv__media">
        <img src="${gallery[0]}" alt="${p.name}" id="qvMainImg" />
        ${gallery.length > 1 ? `<div class="qv__thumbs">${gallery.map((u, i) => `<button type="button" class="qv__thumb ${i === 0 ? "is-active" : ""}" data-qvthumb="${u}"><img src="${u}" alt="" /></button>`).join("")}</div>` : ""}
      </div>
      <button class="icon-btn qv__close" data-close aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
      </button>
      <div class="qv__body">
        <span class="qv__cat">${catLabel(p.category)}</span>
        <h3 class="qv__name">${p.name}</h3>
        ${p.maker ? `<p class="qv__maker">by ${p.maker}</p>` : ""}
        <div class="qv__rating" id="qvRating"><span class="card__stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)} · ${p.reviews} reviews</div>
        <div class="qv__price">${onsale ? `<s>${money(p.old)}</s>` : ""}${money(p.price)}</div>
        <p class="qv__desc">${p.blurb}</p>
        <ul class="qv__meta">${p.materials.map((m) => `<li>${m}</li>`).join("")}</ul>
        <div class="qv__actions">
          <div class="qv__qty">
            <button data-qvdec aria-label="Decrease">−</button>
            <span id="qvQty">1</span>
            <button data-qvinc aria-label="Increase">+</button>
          </div>
          <button class="btn btn--primary btn--block" data-qvadd="${p.id}">Add to basket · ${money(p.price)}</button>
        </div>

        <section class="qv__reviews">
          <div class="qv__reviews-head">
            <h4 class="qv__reviews-title">Reviews</h4>
            <span class="qv__reviews-avg" id="qvReviewsAvg"></span>
          </div>
          <div class="qv__reviews-list" id="qvReviewsList"></div>
          <form class="qv__review-form" id="qvReviewForm" novalidate>
            <p class="qv__review-label">Leave a review</p>
            <div class="qv__review-rate">
              <span class="qv__review-ratelabel">Your rating <em>(tap a star)</em></span>
              <div class="star-pick" id="qvStarPick" role="radiogroup" aria-label="Your rating">
                ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star-pick__star" data-star="${n}" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`).join("")}
              </div>
            </div>
            <input type="text" id="qvReviewName" class="qv__review-input" placeholder="Your name" autocomplete="name" maxlength="80" />
            <textarea id="qvReviewText" class="qv__review-input" rows="3" placeholder="Tell others what you loved…" maxlength="2000"></textarea>
            <button type="button" class="btn btn--primary btn--block" data-review-submit="${p.id}">Post review</button>
            <p class="qv__review-note" id="qvReviewNote" role="status"></p>
          </form>
        </section>
      </div>`;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    // prefill the reviewer name for signed-in buyers, then load existing reviews
    const buyer = window.LoopIvyBuyer;
    if (buyer && buyer.name) { const n = $("#qvReviewName"); if (n) n.value = buyer.name; }
    loadQuickReviews(p.id);
  }

  /* fetch + render a product's reviews inside the open quick-view */
  async function loadQuickReviews(slug) {
    const list = $("#qvReviewsList");
    const avgEl = $("#qvReviewsAvg");
    if (!list) return;
    if (!window.LoopIvyBackend || !window.LoopIvyBackend.fetchReviews) {
      list.innerHTML = `<p class="qv__reviews-empty">Reviews will appear here once the shop is connected.</p>`;
      return;
    }
    list.innerHTML = `<p class="qv__reviews-empty">Loading reviews…</p>`;
    try {
      const rows = await window.LoopIvyBackend.fetchReviews(slug);
      if (qvProductId !== slug) return;   // user switched/closed in the meantime
      if (!rows.length) {
        list.innerHTML = `<p class="qv__reviews-empty">No reviews yet — be the first to share yours!</p>`;
        if (avgEl) avgEl.textContent = "";
        return;
      }
      const avg = rows.reduce((a, r) => a + r.rating, 0) / rows.length;
      const summary = `<span class="card__stars">${stars(avg)}</span> ${avg.toFixed(1)} · ${rows.length} review${rows.length > 1 ? "s" : ""}`;
      if (avgEl) avgEl.innerHTML = summary;
      const hdr = $("#qvRating");
      if (hdr) hdr.innerHTML = summary;   // reflect real reviews in the header rating
      list.innerHTML = rows.map((r) => `
        <div class="qv__review">
          <div class="qv__review-top">
            <span class="qv__review-avatar">${esc((r.reviewer_name || "?").charAt(0))}</span>
            <div class="qv__review-meta">
              <div class="qv__review-name">${esc(r.reviewer_name || "Anonymous")}</div>
              <div class="qv__review-stars"><span class="card__stars">${stars(r.rating)}</span></div>
            </div>
            <span class="qv__review-date">${fmtDate(r.created_at)}</span>
          </div>
          ${r.comment ? `<p class="qv__review-text">${esc(r.comment)}</p>` : ""}
        </div>`).join("");
    } catch (err) {
      console.warn("[LoopIvy] reviews load failed:", err.message || err);
      list.innerHTML = `<p class="qv__reviews-empty">Couldn't load reviews right now.</p>`;
    }
  }

  function renderStarPick() {
    $$("#qvStarPick .star-pick__star").forEach((s) => {
      s.classList.toggle("is-active", Number(s.dataset.star) <= qvReviewRating);
    });
  }

  async function submitReview(slug) {
    const note = $("#qvReviewNote");
    const nameEl = $("#qvReviewName");
    const textEl = $("#qvReviewText");
    if (!note || !nameEl || !textEl) return;
    note.textContent = ""; note.classList.remove("is-ok");
    const name = nameEl.value.trim();
    const comment = textEl.value.trim();
    if (!qvReviewRating) {
      note.textContent = "Please tap a star to rate this piece first.";
      const sp = $("#qvStarPick");
      if (sp) { sp.classList.add("is-missing"); setTimeout(() => sp.classList.remove("is-missing"), 1200); }
      if (note.scrollIntoView) note.scrollIntoView({ block: "nearest" });
      return;
    }
    if (!name) { note.textContent = "Please add your name."; return; }
    if (!window.LoopIvyBackend || !window.LoopIvyBackend.saveReview) { note.textContent = "Reviews aren't available yet."; return; }

    const btn = $(`[data-review-submit="${slug}"]`);
    if (btn) { btn.disabled = true; btn.textContent = "Posting…"; }
    try {
      const buyer = window.LoopIvyBuyer;
      await window.LoopIvyBackend.saveReview({
        product_slug: slug,
        reviewer_name: name,
        rating: qvReviewRating,
        comment: comment,
        user_id: buyer && buyer.user ? buyer.user.id : null,
      });
      note.textContent = "Thank you! Your review is now live."; note.classList.add("is-ok");
      textEl.value = ""; qvReviewRating = 0; renderStarPick();
      toast("Review posted — thank you! 💛");
      loadQuickReviews(slug);
    } catch (err) {
      console.warn("[LoopIvy] review save failed:", err.message || err);
      note.textContent = "Sorry, couldn't post your review. Please try again.";
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Post review"; }
    }
  }
  function closeQuick() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (!drawer.classList.contains("is-open")) document.body.style.overflow = "";
  }

  /* =====================================================================
     Toast
     ===================================================================== */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="4 12 10 18 20 6"/></svg> ${msg}`;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("is-show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove("is-show");
      setTimeout(() => (t.hidden = true), 350);
    }, 2400);
  }

  /* =====================================================================
     Scroll reveal
     ===================================================================== */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" })
    : null;
  function observe(nodes) {
    if (!io) { nodes.forEach((n) => n.classList.add("is-visible")); return; }
    nodes.forEach((n) => io.observe(n));
  }

  /* =====================================================================
     Event delegation
     ===================================================================== */
  document.addEventListener("click", (e) => {
    const t = e.target;

    // add to cart
    const add = t.closest("[data-add]");
    if (add) { addToCart(add.dataset.add); return; }

    // quick-view gallery thumbnail → swap main image
    const qvt = t.closest("[data-qvthumb]");
    if (qvt) {
      const mainImg = $("#qvMainImg");
      if (mainImg) mainImg.src = qvt.dataset.qvthumb;
      $$(".qv__thumb").forEach((b) => b.classList.toggle("is-active", b === qvt));
      return;
    }

    // quick view (card button or featured card)
    const quick = t.closest("[data-quick]");
    if (quick) { openQuick(quick.dataset.quick); return; }

    // wishlist heart (on cards / quick view)
    const w = t.closest("[data-wish]");
    if (w) {
      const id = w.dataset.wish;
      if (wish.includes(id)) { wish = wish.filter((x) => x !== id); w.classList.remove("is-active"); }
      else { wish.push(id); w.classList.add("is-active"); toast("Saved to your wishlist"); }
      save(); bumpWishBadge(); renderWish(); return;
    }

    // add to basket from the wishlist drawer
    const wa = t.closest("[data-wishadd]");
    if (wa) { addToCart(wa.dataset.wishadd); return; }

    // remove from the wishlist drawer
    const wr = t.closest("[data-wishremove]");
    if (wr) {
      const id = wr.dataset.wishremove;
      wish = wish.filter((x) => x !== id);
      save(); syncWishHeart(id); renderWish();
      return;
    }

    // filters
    const f = t.closest("[data-cat]");
    if (f) {
      activeCat = f.dataset.cat;
      $$(".filter").forEach((b) => b.classList.toggle("is-active", b === f));
      renderGrid();
      return;
    }

    // cart qty controls
    const inc = t.closest("[data-inc]"); if (inc) return setQty(inc.dataset.inc, (cart[inc.dataset.inc] || 0) + 1);
    const dec = t.closest("[data-dec]"); if (dec) return setQty(dec.dataset.dec, (cart[dec.dataset.dec] || 0) - 1);
    const rm  = t.closest("[data-remove]"); if (rm) return setQty(rm.dataset.remove, 0);

    // quick-view qty + add
    if (t.closest("[data-qvinc]")) { qvQty++; $("#qvQty").textContent = qvQty; return; }
    if (t.closest("[data-qvdec]")) { qvQty = Math.max(1, qvQty - 1); $("#qvQty").textContent = qvQty; return; }
    const qvadd = t.closest("[data-qvadd]");
    if (qvadd) { addToCart(qvadd.dataset.qvadd, qvQty); closeQuick(); openCart(); return; }

    // review: pick a star rating
    const star = t.closest("[data-star]");
    if (star) { qvReviewRating = Number(star.dataset.star); renderStarPick(); return; }

    // review: submit
    const rsub = t.closest("[data-review-submit]");
    if (rsub) { submitReview(rsub.dataset.reviewSubmit); return; }

    // modal / drawer close
    if (t.closest("[data-close]")) { closeQuick(); return; }
  });

  /* cart open/close */
  $("#cartBtn").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  $("#cartEmptyShop").addEventListener("click", () => { closeCart(); location.hash = "#shop"; });
  $("#wishBtn").addEventListener("click", openWish);
  $("#wishClose").addEventListener("click", closeWish);
  $("#wishEmptyShop").addEventListener("click", () => { closeWish(); location.hash = "#shop"; });
  overlay.addEventListener("click", () => { closeCart(); closeWish(); });
  /* ---------------- checkout / reserve order (no online payment) ---------------- */
  const checkoutModal = $("#checkoutModal");

  function renderCheckoutSummary() {
    const ids = Object.keys(cart);
    const lines = ids.map((id) => {
      const p = byId(id); if (!p) return "";
      const q = cart[id];
      return `<div class="co-line">
        <img src="${p.img}" alt="${p.name}" />
        <div><div class="co-line__name">${p.name}</div><div class="co-line__qty">Qty ${q} · ${money(p.price)}</div></div>
        <span class="co-line__price">${money(p.price * q)}</span>
      </div>`;
    }).join("");
    const total = cartTotal();
    $("#checkoutSummary").innerHTML = lines + `<div class="co-total"><span>Total</span><strong>${money(total)}</strong></div>`;
    $("#checkoutTotal").textContent = money(total);
  }

  function selectedFulfilment() {
    const checked = document.querySelector('input[name="fulfilment"]:checked');
    return checked ? checked.value : "Ship across India";
  }
  function toggleShipFields() {
    const shipping = selectedFulfilment() === "Ship across India";
    const el = $("#shipFields");
    if (el) el.classList.toggle("is-hidden", !shipping);
  }

  /* pre-fill name + email when a buyer is signed in (buyer-auth.js) */
  function prefillFromBuyer() {
    const b = window.LoopIvyBuyer;
    if (!b || !b.user) return;
    const nameEl = $("#coName"), emailEl = $("#coEmail");
    if (nameEl && !nameEl.value.trim() && b.name) nameEl.value = b.name;
    if (emailEl && !emailEl.value.trim() && b.email) emailEl.value = b.email;
  }

  function openCheckout() {
    if (cartCount() === 0) { toast("Your basket is empty"); return; }
    closeCart();
    renderCheckoutSummary();
    toggleShipFields();
    prefillFromBuyer();
    const note = $("#checkoutNote"); note.textContent = ""; note.classList.remove("is-ok");
    checkoutModal.classList.add("is-open");
    checkoutModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeCheckout() {
    checkoutModal.classList.remove("is-open");
    checkoutModal.setAttribute("aria-hidden", "true");
    if (!drawer.classList.contains("is-open")) document.body.style.overflow = "";
  }

  $("#checkoutBtn").addEventListener("click", openCheckout);
  $$('input[name="fulfilment"]').forEach((r) => r.addEventListener("change", toggleShipFields));
  $$("[data-checkout-close]").forEach((el) => el.addEventListener("click", closeCheckout));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCheckout(); });

  $("#checkoutForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = $("#checkoutNote"); note.textContent = ""; note.classList.remove("is-ok");
    const name = $("#coName").value.trim();
    const email = $("#coEmail").value.trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      note.textContent = "Please enter your name and a valid email.";
      return;
    }
    if (cartCount() === 0) { note.textContent = "Your basket is empty."; return; }

    const fulfilment = selectedFulfilment();
    const phone = $("#coPhone").value.trim();
    const message = $("#coNote").value.trim();
    const address = $("#coAddress").value.trim();
    const city = $("#coCity").value.trim();
    const state = $("#coState").value.trim();
    const pincode = $("#coPin").value.trim();

    // Shipping requires a delivery address + a valid 6-digit PIN
    if (fulfilment === "Ship across India") {
      if (!address || !city || !state || !pincode) {
        note.textContent = "Please fill in your full delivery address for shipping.";
        return;
      }
      if (!/^\d{6}$/.test(pincode)) {
        note.textContent = "Please enter a valid 6-digit PIN code.";
        return;
      }
    }

    const items = Object.keys(cart).map((id) => {
      const p = byId(id);
      return p ? { product_name: p.name, unit_price_cents: Math.round(p.price * 100), quantity: cart[id] } : null;
    }).filter(Boolean);
    const totalCents = Math.round(cartTotal() * 100);
    const addressText = fulfilment === "Ship across India"
      ? ` | Ship to: ${address}, ${city}, ${state} - ${pincode}`
      : "";
    const notesText = "Fulfilment: " + fulfilment +
      (phone ? " | Phone: " + phone : "") +
      addressText +
      (message ? " | Note: " + message : "");

    const btn = $("#placeOrderBtn");
    const prev = btn.innerHTML;
    btn.disabled = true; btn.textContent = "Placing order…";
    try {
      if (!window.LoopIvyBackend || !window.LoopIvyBackend.createOrder) {
        throw new Error("Order backend not connected");
      }
      await window.LoopIvyBackend.createOrder({
        customer_name: name,
        customer_email: email,
        shipping: {
          method: fulfilment,
          phone: phone,
          note: message,
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
        },
        subtotal_cents: totalCents,
        shipping_cents: 0,
        total_cents: totalCents,
        currency: "inr",
        notes: notesText,
      }, items);

      cart = {}; save(); renderCart();
      note.textContent = `Thank you, ${name.split(" ")[0]}! Your order is reserved — check your email for confirmation.`;
      note.classList.add("is-ok");
      toast("Order reserved — I'll be in touch! 💛");
      $("#checkoutForm").reset();
      setTimeout(closeCheckout, 2800);
    } catch (err) {
      console.warn("[LoopIvy] order failed:", err.message || err);
      note.textContent = "Sorry, something went wrong saving your order. Please try again.";
    } finally {
      btn.disabled = false; btn.innerHTML = prev;
    }
  });

  /* modal overlay click */
  modal.querySelector(".modal__overlay").addEventListener("click", closeQuick);

  /* search (demo) */
  $("#searchBtn").addEventListener("click", () => {
    document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
    toast("Browse the full atelier below");
  });

  /* "View all makers" — leave a seller's storefront */
  const sellerClearBtn = $("#sellerBannerClear");
  if (sellerClearBtn) sellerClearBtn.addEventListener("click", clearSeller);

  /* Deep links: ?seller= scrolls to the shop, ?product= opens that item. */
  function applyDeepLinks() {
    if (activeSeller) {
      const match = PRODUCTS.find((p) => p.maker && slugify(p.maker) === activeSeller);
      if (match) {
        const shop = document.getElementById("shop");
        if (shop) shop.scrollIntoView({ behavior: "smooth" });
      }
    }
    if (pendingProduct) {
      const p = byId(pendingProduct) ||
        PRODUCTS.find((x) => slugify(x.name) === slugify(pendingProduct));
      if (p) { openQuick(p.id); pendingProduct = null; }
    }
  }

  /* keyboard */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeQuick(); closeCart(); closeWish(); }
  });

  /* mobile nav */
  const navToggle = $("#navToggle");
  const nav = $("#primaryNav");
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open);
  });
  $$("#primaryNav a").forEach((a) => a.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }));

  /* sort */
  $("#sortSelect").addEventListener("change", (e) => { sortMode = e.target.value; renderGrid(); });

  /* header shadow on scroll */
  const header = $("#header");
  const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* re-render when live products arrive from Supabase */
  document.addEventListener("loopivy:products", (e) => {
    PRODUCTS = (e.detail && e.detail.length ? e.detail : window.LoopIvy.PRODUCTS);
    pruneStaleItems();          // clear any leftover ids that don't match real products
    renderFeatured();
    renderFilters();
    renderSellerBanner();
    renderGrid();
    renderCart();
    renderWish();
    applyDeepLinks();
  });

  /* newsletter */
  $("#newsletterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#newsletterEmail").value.trim();
    const note = $("#newsletterNote");
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) { note.textContent = "Please enter a valid email address."; note.classList.remove("is-ok"); return; }
    note.textContent = "Welcome to the circle! Check your inbox for 10% off.";
    note.classList.add("is-ok");
    // persist to Supabase if the backend is connected
    if (window.LoopIvyBackend) {
      window.LoopIvyBackend.subscribe(email).catch((err) =>
        console.warn("[LoopIvy] newsletter save failed:", err.message || err)
      );
    }
    e.target.reset();
  });

  /* custom order / commission request */
  const customForm = $("#customForm");
  if (customForm) {
    customForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const note = $("#customNote");
      const required = $$("[required]", customForm);
      let firstBad = null;

      required.forEach((el) => {
        const field = el.closest(".cfield");
        const value = el.value.trim();
        const emailBad = el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        const bad = value === "" || emailBad;
        if (field) field.classList.toggle("is-invalid", bad);
        if (bad && !firstBad) firstBad = el;
      });

      if (firstBad) {
        note.textContent = "Please fill in the highlighted fields so I can help.";
        note.classList.remove("is-ok");
        firstBad.focus();
        return;
      }

      // collect the submission before we reset the form
      const payload = {
        name: $("#cfName").value.trim(),
        email: $("#cfEmail").value.trim(),
        type: $("#cfType").value,
        budget: $("#cfBudget").value,
        details: $("#cfDetails").value.trim(),
      };
      const firstName = payload.name.split(" ")[0];
      note.textContent = `Thank you, ${firstName}! I've received your request and will reply within 2 business days.`;
      note.classList.add("is-ok");
      toast("Custom request sent — talk soon! 💛");
      // persist to Supabase if the backend is connected
      if (window.LoopIvyBackend) {
        window.LoopIvyBackend.saveCustomRequest(payload).catch((err) =>
          console.warn("[LoopIvy] custom request save failed:", err.message || err)
        );
      }
      customForm.reset();
      $$(".cfield", customForm).forEach((f) => f.classList.remove("is-invalid"));
    });

    /* clear the invalid state as the user fixes a field */
    customForm.addEventListener("input", (e) => {
      const field = e.target.closest(".cfield");
      if (field) field.classList.remove("is-invalid");
    });
  }

  /* FAQ accordion — open one at a time */
  $$(".faq__item").forEach((item) => {
    item.addEventListener("toggle", () => {
      if (item.open) {
        $$(".faq__item").forEach((other) => { if (other !== item) other.open = false; });
      }
    });
  });

  /* reveal already-visible statics */
  observe($$(".reveal"));

  /* =====================================================================
     Init
     ===================================================================== */
  renderFeatured();
  renderFilters();
  renderSellerBanner();
  renderGrid();
  renderReviews();
  renderCart();
  bumpWishBadge();
  applyDeepLinks();
})();
