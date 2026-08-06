/* =====================================================================
   Loop & Ivy — Admin dashboard logic
   Uses Supabase Auth (email/password). Authenticated users get full
   manage rights via the Row Level Security policies in schema.sql.
   ===================================================================== */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- connect ---------- */
  const cfg = window.SUPABASE_CONFIG || {};
  if (!window.supabase || !cfg.url || !cfg.publishableKey) {
    alert("Supabase is not configured. Check assets/js/supabase-config.js");
    return;
  }
  const db = window.supabase.createClient(cfg.url, cfg.publishableKey);
  const buildArt = (window.LoopIvy && window.LoopIvy.buildProductImage) || null;

  /* ---------- helpers ---------- */
  const money = (cents) => "$" + (Math.round(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return iso; } };
  const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  let toastTimer;
  function toast(msg, isErr) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("err", !!isErr);
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("is-show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove("is-show"); setTimeout(() => (t.hidden = true), 350); }, 2600);
  }

  const CAT_LABELS = {
    blankets: "Blankets", sweaters: "Sweaters", bags: "Bags",
    accessories: "Accessories", home: "Home", baby: "Baby", amigurumi: "Amigurumi",
  };

  /* =====================================================================
     AUTH
     ===================================================================== */
  const loginScreen = $("#loginScreen");
  const app = $("#app");

  async function refreshAuth() {
    const { data } = await db.auth.getSession();
    setAuthed(data.session);
  }

  function setAuthed(session) {
    if (session && session.user) {
      loginScreen.classList.add("is-hidden");
      app.classList.add("is-auth");
      $("#userEmail").textContent = session.user.email || "";
      loadAll();
    } else {
      loginScreen.classList.remove("is-hidden");
      app.classList.remove("is-auth");
    }
  }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = $("#loginNote");
    const btn = $("#loginBtn");
    note.textContent = ""; note.className = "note";
    btn.disabled = true; btn.textContent = "Signing in…";
    const { error } = await db.auth.signInWithPassword({
      email: $("#email").value.trim(),
      password: $("#password").value,
    });
    btn.disabled = false; btn.textContent = "Sign in";
    if (error) {
      note.textContent = error.message || "Sign in failed.";
      note.classList.add("err");
      return;
    }
    // onAuthStateChange handles showing the app
  });

  $("#logoutBtn").addEventListener("click", async () => {
    await db.auth.signOut();
    toast("Signed out");
  });

  db.auth.onAuthStateChange((_event, session) => setAuthed(session));

  /* =====================================================================
     TABS
     ===================================================================== */
  $("#tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    $$(".tab").forEach((t) => t.classList.toggle("is-active", t === tab));
    const name = tab.dataset.tab;
    $$(".panel").forEach((p) => p.classList.toggle("is-active", p.id === "panel-" + name));
  });

  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-refresh]");
    if (!r) return;
    const which = r.dataset.refresh;
    if (which === "requests") loadRequests();
    if (which === "subscribers") loadSubscribers();
    if (which === "orders") loadOrders();
  });

  /* =====================================================================
     LOAD DATA
     ===================================================================== */
  function loadAll() {
    loadProducts();
    loadRequests();
    loadSubscribers();
    loadOrders();
  }

  function setSection(name, { loading, empty }) {
    $("#" + name + "Loading").hidden = !loading;
    $("#" + name + "Empty").hidden = !empty;
  }

  /* ---------- PRODUCTS ---------- */
  let productsCache = [];

  async function loadProducts() {
    setSection("products", { loading: true, empty: false });
    $("#productsBody").innerHTML = "";
    const { data, error } = await db.from("products").select("*").order("sort_order", { ascending: true });
    setSection("products", { loading: false, empty: false });
    if (error) { toast("Could not load products: " + error.message, true); return; }
    productsCache = data || [];
    $("#countProducts").textContent = productsCache.length;
    if (!productsCache.length) { setSection("products", { loading: false, empty: true }); return; }

    $("#productsBody").innerHTML = productsCache.map((p) => {
      const img = p.image_url || (buildArt ? buildArt({ id: p.slug, theme: p.theme, motif: p.motif }) : "");
      return `
      <tr data-id="${p.id}">
        <td>
          <div class="prod-cell">
            <img class="prod-thumb" src="${img}" alt="" loading="lazy" />
            <div><div class="prod-name">${esc(p.name)}</div><div class="prod-slug">${esc(p.slug)}</div></div>
          </div>
        </td>
        <td>${CAT_LABELS[p.category] || esc(p.category)}</td>
        <td>${money(p.price_cents)}${p.compare_at_cents ? ` <s style="color:var(--espresso-2)">${money(p.compare_at_cents)}</s>` : ""}</td>
        <td>${p.tag ? `<span class="badge badge--tag">${esc(p.tag)}</span>` : "—"}</td>
        <td><span class="badge badge--star">★ ${Number(p.rating).toFixed(1)} · ${p.review_count || 0}</span></td>
        <td>${p.featured ? "★" : "—"}</td>
        <td>${p.active ? '<span class="badge badge--on">Active</span>' : '<span class="badge badge--off">Hidden</span>'}</td>
        <td><div class="row-actions"><button class="btn btn--ghost btn--sm" data-edit="${p.id}">Edit</button></div></td>
      </tr>`;
    }).join("");
  }

  /* ---------- CUSTOM REQUESTS ---------- */
  const REQUEST_STATUSES = ["new", "quoted", "in_progress", "done", "declined"];

  async function loadRequests() {
    setSection("requests", { loading: true, empty: false });
    $("#requestsBody").innerHTML = "";
    const { data, error } = await db.from("custom_requests").select("*").order("created_at", { ascending: false });
    setSection("requests", { loading: false, empty: false });
    if (error) { toast("Could not load requests: " + error.message, true); return; }
    const rows = data || [];
    $("#countRequests").textContent = rows.length;
    if (!rows.length) { setSection("requests", { loading: false, empty: true }); return; }

    $("#requestsBody").innerHTML = rows.map((r) => `
      <tr data-id="${r.id}">
        <td>${fmtDate(r.created_at)}</td>
        <td>${esc(r.name)}</td>
        <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
        <td>${esc(r.project_type) || "—"}</td>
        <td>${esc(r.budget) || "—"}</td>
        <td><span class="details-block">${esc(r.details)}</span></td>
        <td>
          <select class="status-select" data-req-status="${r.id}">
            ${REQUEST_STATUSES.map((s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${s.replace("_", " ")}</option>`).join("")}
          </select>
        </td>
      </tr>`).join("");
  }

  document.addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-req-status]");
    if (!sel) return;
    const id = sel.dataset.reqStatus;
    const { error } = await db.from("custom_requests").update({ status: sel.value }).eq("id", id);
    toast(error ? "Update failed: " + error.message : "Status updated", !!error);
  });

  /* ---------- SUBSCRIBERS ---------- */
  async function loadSubscribers() {
    setSection("subscribers", { loading: true, empty: false });
    $("#subscribersBody").innerHTML = "";
    const { data, error } = await db.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
    setSection("subscribers", { loading: false, empty: false });
    if (error) { toast("Could not load subscribers: " + error.message, true); return; }
    const rows = data || [];
    $("#countSubscribers").textContent = rows.length;
    if (!rows.length) { setSection("subscribers", { loading: false, empty: true }); return; }
    $("#subscribersBody").innerHTML = rows.map((r) => `
      <tr><td>${fmtDate(r.created_at)}</td><td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td></tr>`).join("");
  }

  /* ---------- ORDERS ---------- */
  async function loadOrders() {
    setSection("orders", { loading: true, empty: false });
    $("#ordersBody").innerHTML = "";
    const { data, error } = await db.from("orders").select("*").order("created_at", { ascending: false });
    setSection("orders", { loading: false, empty: false });
    if (error) { toast("Could not load orders: " + error.message, true); return; }
    const rows = data || [];
    $("#countOrders").textContent = rows.length;
    if (!rows.length) { setSection("orders", { loading: false, empty: true }); return; }
    $("#ordersBody").innerHTML = rows.map((o) => `
      <tr>
        <td>${fmtDate(o.created_at)}</td>
        <td>${esc(o.customer_name)}</td>
        <td><a href="mailto:${esc(o.customer_email)}">${esc(o.customer_email)}</a></td>
        <td>${money(o.total_cents)}</td>
        <td><span class="badge ${o.status === "paid" ? "badge--on" : "badge--off"}">${esc(o.status)}</span></td>
      </tr>`).join("");
  }

  /* =====================================================================
     PRODUCT EDITOR MODAL
     ===================================================================== */
  const modal = $("#productModal");

  function openModal(product) {
    const p = product || {};
    const isNew = !product;
    $("#modalTitle").textContent = isNew ? "New product" : "Edit product";
    $("#deleteProductBtn").hidden = isNew;
    $("#productNote").textContent = "";

    const theme = p.theme || { bg: "#c07a52", yarn: "#f4e7d6", accent: "#8f4c2e" };
    setVal("p_id", p.id || "");
    setVal("p_name", p.name || "");
    setVal("p_slug", p.slug || "");
    setVal("p_category", p.category || "blankets");
    setVal("p_motif", p.motif || "blanket");
    setColor("p_bg", theme.bg || "#c07a52");
    setColor("p_yarn", theme.yarn || "#f4e7d6");
    setColor("p_accent", theme.accent || "#8f4c2e");
    setVal("p_price", p.price_cents != null ? p.price_cents / 100 : "");
    setVal("p_compare", p.compare_at_cents != null ? p.compare_at_cents / 100 : "");
    setVal("p_tag", p.tag || "");
    setVal("p_stock", p.stock != null ? p.stock : "");
    setVal("p_rating", p.rating != null ? p.rating : 5.0);
    setVal("p_reviews", p.review_count != null ? p.review_count : 0);
    setVal("p_sort", p.sort_order != null ? p.sort_order : (productsCache.length + 1));
    setVal("p_image", p.image_url || "");
    setVal("p_blurb", p.blurb || "");
    setVal("p_materials", (p.materials || []).join("\n"));
    $("#p_featured").checked = !!p.featured;
    $("#p_active").checked = product ? !!p.active : true;

    updatePreview();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  const setVal = (id, v) => { const el = $("#" + id); if (el) el.value = v; };
  const setColor = (id, hex) => { $("#" + id).value = hex; $("#" + id + "_t").value = hex; };

  function currentTheme() {
    return { bg: $("#p_bg").value, yarn: $("#p_yarn").value, accent: $("#p_accent").value };
  }
  function updatePreview() {
    const url = $("#p_image").value.trim();
    if (url) { $("#p_preview").src = url; return; }
    if (buildArt) {
      $("#p_preview").src = buildArt({ id: "preview-" + Date.now(), theme: currentTheme(), motif: $("#p_motif").value });
    }
  }

  // sync color pickers <-> text, live preview
  ["p_bg", "p_yarn", "p_accent"].forEach((id) => {
    $("#" + id).addEventListener("input", () => { $("#" + id + "_t").value = $("#" + id).value; updatePreview(); });
    $("#" + id + "_t").addEventListener("input", () => {
      const v = $("#" + id + "_t").value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { $("#" + id).value = v; updatePreview(); }
    });
  });
  $("#p_motif").addEventListener("change", updatePreview);
  $("#p_image").addEventListener("input", updatePreview);
  $("#p_name").addEventListener("input", () => {
    const slug = $("#p_slug");
    if (!slug.dataset.touched) slug.value = slugify($("#p_name").value);
  });
  $("#p_slug").addEventListener("input", () => { $("#p_slug").dataset.touched = "1"; });

  $("#addProductBtn").addEventListener("click", () => { $("#p_slug").dataset.touched = ""; openModal(null); });

  document.addEventListener("click", (e) => {
    const edit = e.target.closest("[data-edit]");
    if (edit) {
      const p = productsCache.find((x) => x.id === edit.dataset.edit);
      $("#p_slug").dataset.touched = "1";
      openModal(p);
      return;
    }
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });

  /* ---------- save ---------- */
  $("#productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = $("#productNote"); note.textContent = ""; note.className = "note";

    const name = $("#p_name").value.trim();
    const priceVal = parseFloat($("#p_price").value);
    if (!name) { note.textContent = "Name is required."; note.classList.add("err"); return; }
    if (isNaN(priceVal) || priceVal < 0) { note.textContent = "A valid price is required."; note.classList.add("err"); return; }

    const materials = $("#p_materials").value.split("\n").map((s) => s.trim()).filter(Boolean);
    const compareVal = parseFloat($("#p_compare").value);
    const stockVal = $("#p_stock").value.trim();

    const record = {
      name,
      slug: ($("#p_slug").value.trim() || slugify(name)),
      category: $("#p_category").value,
      motif: $("#p_motif").value,
      theme: currentTheme(),
      blurb: $("#p_blurb").value.trim() || null,
      materials,
      price_cents: Math.round(priceVal * 100),
      compare_at_cents: !isNaN(compareVal) && compareVal > 0 ? Math.round(compareVal * 100) : null,
      tag: $("#p_tag").value.trim() || null,
      rating: parseFloat($("#p_rating").value) || 5.0,
      review_count: parseInt($("#p_reviews").value, 10) || 0,
      sort_order: parseInt($("#p_sort").value, 10) || 0,
      image_url: $("#p_image").value.trim() || null,
      stock: stockVal === "" ? null : parseInt(stockVal, 10),
      featured: $("#p_featured").checked,
      active: $("#p_active").checked,
    };

    const btn = $("#saveProductBtn");
    btn.disabled = true; btn.textContent = "Saving…";

    const id = $("#p_id").value;
    let error;
    if (id) {
      ({ error } = await db.from("products").update(record).eq("id", id));
    } else {
      ({ error } = await db.from("products").insert(record));
    }
    btn.disabled = false; btn.textContent = "Save product";

    if (error) {
      note.textContent = /duplicate|unique/i.test(error.message) ? "That slug is already in use — choose another." : error.message;
      note.classList.add("err");
      return;
    }
    closeModal();
    toast(id ? "Product updated" : "Product added");
    loadProducts();
  });

  /* ---------- delete ---------- */
  $("#deleteProductBtn").addEventListener("click", async () => {
    const id = $("#p_id").value;
    if (!id) return;
    if (!confirm("Delete this product permanently? This cannot be undone.")) return;
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) { toast("Delete failed: " + error.message, true); return; }
    closeModal();
    toast("Product deleted");
    loadProducts();
  });

  /* ---------- go ---------- */
  refreshAuth();
})();
