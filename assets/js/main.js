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
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const FREE_SHIP = 1500;

  /* ---------------- state ---------------- */
  let cart = load("loopivy_cart", {});      // { id: qty }
  let wish = load("loopivy_wish", []);       // [id]
  let activeCat = "all";
  let sortMode = "featured";

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
  function renderFeatured() {
    const items = PRODUCTS.filter((p) => p.featured).sort((a, b) => a.featured - b.featured);
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

  function renderGrid() {
    let list = activeCat === "all" ? PRODUCTS.slice() : PRODUCTS.filter((p) => p.category === activeCat);
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

  function cartCount() { return Object.values(cart).reduce((a, b) => a + b, 0); }
  function cartTotal() { return Object.entries(cart).reduce((sum, [id, q]) => sum + (byId(id)?.price || 0) * q, 0); }

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
    const ids = Object.keys(cart);
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
    overlay.hidden = false;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeCart() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    if ($("#quickview").classList.contains("is-open")) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  /* =====================================================================
     Quick view modal
     ===================================================================== */
  const modal = $("#quickview");
  let qvQty = 1;

  function openQuick(id) {
    const p = byId(id); if (!p) return;
    qvQty = 1;
    const onsale = p.old && p.old > p.price;
    $("#quickviewPanel").innerHTML = `
      <div class="qv__media"><img src="${p.img}" alt="${p.name}" /></div>
      <button class="icon-btn qv__close" data-close aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
      </button>
      <div class="qv__body">
        <span class="qv__cat">${catLabel(p.category)}</span>
        <h3 class="qv__name">${p.name}</h3>
        ${p.maker ? `<p class="qv__maker">by ${p.maker}</p>` : ""}
        <div class="qv__rating"><span class="card__stars">${stars(p.rating)}</span> ${p.rating.toFixed(1)} · ${p.reviews} reviews</div>
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
      </div>`;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
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

    // quick view (card button or featured card)
    const quick = t.closest("[data-quick]");
    if (quick) { openQuick(quick.dataset.quick); return; }

    // wishlist
    const w = t.closest("[data-wish]");
    if (w) {
      const id = w.dataset.wish;
      if (wish.includes(id)) { wish = wish.filter((x) => x !== id); w.classList.remove("is-active"); }
      else { wish.push(id); w.classList.add("is-active"); toast("Saved to your wishlist"); }
      save(); return;
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

    // modal / drawer close
    if (t.closest("[data-close]")) { closeQuick(); return; }
  });

  /* cart open/close */
  $("#cartBtn").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  $("#cartEmptyShop").addEventListener("click", () => { closeCart(); location.hash = "#shop"; });
  overlay.addEventListener("click", () => { closeCart(); });
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

  function openCheckout() {
    if (cartCount() === 0) { toast("Your basket is empty"); return; }
    closeCart();
    renderCheckoutSummary();
    toggleShipFields();
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

  /* keyboard */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeQuick(); closeCart(); }
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
    renderFeatured();
    renderFilters();
    renderGrid();
    renderCart();
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
  renderGrid();
  renderReviews();
  renderCart();
})();
