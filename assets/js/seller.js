/* =====================================================================
   Loop & Ivy — Seller Studio
   Self-service seller dashboard. Sellers sign up / log in with Supabase
   Auth and manage ONLY their own products (enforced by RLS: a product
   row is editable only when its seller_id == the signed-in user's id).
   ===================================================================== */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const cfg = window.SUPABASE_CONFIG || {};
  if (!window.supabase || !cfg.url || !cfg.publishableKey) {
    alert("Supabase is not configured. Check assets/js/supabase-config.js");
    return;
  }
  const db = window.supabase.createClient(cfg.url, cfg.publishableKey);
  const buildArt = (window.LoopIvy && window.LoopIvy.buildProductImage) || null;

  /* ---------- helpers ---------- */
  const money = (c) => "$" + (Math.round(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const rand = () => Math.random().toString(36).slice(2, 7);
  const CAT_LABELS = { blankets: "Blankets", sweaters: "Sweaters", bags: "Bags", accessories: "Accessories", home: "Home", baby: "Baby", amigurumi: "Amigurumi" };

  let toastTimer;
  function toast(msg, isErr) {
    const t = $("#toast");
    t.textContent = msg; t.classList.toggle("err", !!isErr); t.hidden = false;
    requestAnimationFrame(() => t.classList.add("is-show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove("is-show"); setTimeout(() => (t.hidden = true), 350); }, 2600);
  }

  /* ---------- session ---------- */
  let currentUser = null;
  let sellerProfile = null;

  const loginScreen = $("#loginScreen");
  const app = $("#app");

  async function refreshAuth() {
    const { data } = await db.auth.getSession();
    handleSession(data.session);
  }

  async function handleSession(session) {
    currentUser = session && session.user ? session.user : null;
    if (currentUser) {
      loginScreen.classList.add("is-hidden");
      app.classList.add("is-auth");
      $("#userEmail").textContent = currentUser.email || "";
      await loadProfile();
      loadProducts();
    } else {
      loginScreen.classList.remove("is-hidden");
      app.classList.remove("is-auth");
    }
  }

  db.auth.onAuthStateChange((_e, session) => handleSession(session));

  /* ---------- login / signup toggle ---------- */
  $("#showSignup").addEventListener("click", (e) => { e.preventDefault(); $("#loginForm").hidden = true; $("#signupForm").hidden = false; $("#authSub").textContent = "Create your seller account"; });
  $("#showLogin").addEventListener("click", (e) => { e.preventDefault(); $("#signupForm").hidden = true; $("#loginForm").hidden = false; $("#authSub").textContent = "Sign in to your seller account"; });

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = $("#loginNote"); note.textContent = ""; note.className = "note";
    const btn = $("#loginBtn"); btn.disabled = true; btn.textContent = "Signing in…";
    const { error } = await db.auth.signInWithPassword({ email: $("#loginEmail").value.trim(), password: $("#loginPassword").value });
    btn.disabled = false; btn.textContent = "Sign in";
    if (error) { note.textContent = error.message || "Sign in failed."; note.classList.add("err"); }
  });

  $("#signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = $("#signupNote"); note.textContent = ""; note.className = "note";
    const shop = $("#suShop").value.trim();
    const email = $("#suEmail").value.trim();
    const password = $("#suPassword").value;
    if (!shop) { note.textContent = "Please enter a shop name."; note.classList.add("err"); return; }
    if (password.length < 6) { note.textContent = "Password must be at least 6 characters."; note.classList.add("err"); return; }

    const btn = $("#signupBtn"); btn.disabled = true; btn.textContent = "Creating…";
    // store the shop name in user metadata so we can create the profile after first login
    const { data, error } = await db.auth.signUp({
      email, password,
      options: { data: { shop_name: shop } },
    });
    btn.disabled = false; btn.textContent = "Create account";

    if (error) { note.textContent = error.message; note.classList.add("err"); return; }

    if (data.session) {
      // email confirmation disabled → logged in immediately
      note.textContent = "Account created!"; note.classList.add("ok");
    } else {
      // email confirmation required
      note.textContent = "Almost there — check your email to confirm your account, then sign in.";
      note.classList.add("ok");
      $("#showLogin").click();
      $("#loginEmail").value = email;
    }
  });

  $("#logoutBtn").addEventListener("click", async () => { await db.auth.signOut(); toast("Signed out"); });

  /* ---------- tabs ---------- */
  $("#tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab"); if (!tab) return;
    switchTab(tab.dataset.tab);
  });
  function switchTab(name) {
    $$(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.tab === name));
    $$(".panel").forEach((p) => p.classList.toggle("is-active", p.id === "panel-" + name));
  }
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-goto]");
    if (g) { e.preventDefault(); switchTab(g.dataset.goto); }
  });

  /* =====================================================================
     SHOP PROFILE
     ===================================================================== */
  async function loadProfile() {
    const { data, error } = await db.from("sellers").select("*").eq("id", currentUser.id).maybeSingle();
    if (error) { console.warn("profile load:", error.message); }
    sellerProfile = data || null;

    // prefill the shop form
    const meta = currentUser.user_metadata || {};
    $("#shopName").value = (sellerProfile && sellerProfile.shop_name) || meta.shop_name || "";
    $("#shopLocation").value = (sellerProfile && sellerProfile.location) || "";
    $("#shopEmail").value = (sellerProfile && sellerProfile.contact_email) || currentUser.email || "";
    $("#shopBio").value = (sellerProfile && sellerProfile.bio) || "";
    $("#shopAvatar").value = (sellerProfile && sellerProfile.avatar_url) || "";

    // if no profile yet, auto-create it from the signup shop name so selling is frictionless
    if (!sellerProfile && meta.shop_name) {
      await saveProfile(meta.shop_name, "", currentUser.email || "", "", "");
    }
    updateProfileNotice();
  }

  function updateProfileNotice() {
    const needs = !sellerProfile || !sellerProfile.shop_name;
    $("#profileNotice").hidden = !needs;
  }

  async function saveProfile(shop_name, location, contact_email, bio, avatar_url) {
    const row = {
      id: currentUser.id,
      shop_name: shop_name,
      location: location || null,
      contact_email: contact_email || null,
      bio: bio || null,
      avatar_url: avatar_url || null,
    };
    const { data, error } = await db.from("sellers").upsert(row, { onConflict: "id" }).select().maybeSingle();
    if (error) throw error;
    sellerProfile = data;
    updateProfileNotice();
    return data;
  }

  $("#shopForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = $("#shopNote"); note.textContent = ""; note.className = "note";
    const shop = $("#shopName").value.trim();
    if (!shop) { note.textContent = "Shop name is required."; note.classList.add("err"); return; }
    const btn = $("#saveShopBtn"); btn.disabled = true; btn.textContent = "Saving…";
    try {
      await saveProfile(shop, $("#shopLocation").value.trim(), $("#shopEmail").value.trim(), $("#shopBio").value.trim(), $("#shopAvatar").value.trim());
      note.textContent = "Shop saved!"; note.classList.add("ok");
      toast("Shop details saved");
    } catch (err) {
      note.textContent = err.message || "Could not save shop."; note.classList.add("err");
    } finally {
      btn.disabled = false; btn.textContent = "Save shop";
    }
  });

  /* =====================================================================
     PRODUCTS (scoped to this seller)
     ===================================================================== */
  let productsCache = [];

  async function loadProducts() {
    $("#productsLoading").hidden = false; $("#productsEmpty").hidden = true; $("#productsBody").innerHTML = "";
    const { data, error } = await db.from("products").select("*").eq("seller_id", currentUser.id).order("created_at", { ascending: false });
    $("#productsLoading").hidden = true;
    if (error) { toast("Could not load products: " + error.message, true); return; }
    productsCache = data || [];
    $("#countProducts").textContent = productsCache.length;
    if (!productsCache.length) { $("#productsEmpty").hidden = false; return; }

    $("#productsBody").innerHTML = productsCache.map((p) => {
      const img = p.image_url || (buildArt ? buildArt({ id: p.slug, theme: p.theme, motif: p.motif }) : "");
      return `<tr data-id="${p.id}">
        <td><div class="prod-cell"><img class="prod-thumb" src="${img}" alt="" loading="lazy" />
          <div><div class="prod-name">${esc(p.name)}</div><div class="prod-slug">${esc(p.slug)}</div></div></div></td>
        <td>${CAT_LABELS[p.category] || esc(p.category)}</td>
        <td>${money(p.price_cents)}${p.compare_at_cents ? ` <s style="color:var(--espresso-2)">${money(p.compare_at_cents)}</s>` : ""}</td>
        <td>${p.tag ? `<span class="badge badge--tag">${esc(p.tag)}</span>` : "—"}</td>
        <td>${p.active ? '<span class="badge badge--on">Active</span>' : '<span class="badge badge--off">Hidden</span>'}</td>
        <td><div class="row-actions"><button class="btn btn--ghost btn--sm" data-edit="${p.id}">Edit</button></div></td>
      </tr>`;
    }).join("");
  }

  /* ---------- product modal ---------- */
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
    setVal("p_category", p.category || "blankets");
    setVal("p_motif", p.motif || "blanket");
    setColor("p_bg", theme.bg || "#c07a52");
    setColor("p_yarn", theme.yarn || "#f4e7d6");
    setColor("p_accent", theme.accent || "#8f4c2e");
    setVal("p_price", p.price_cents != null ? p.price_cents / 100 : "");
    setVal("p_compare", p.compare_at_cents != null ? p.compare_at_cents / 100 : "");
    setVal("p_tag", p.tag || "");
    setVal("p_stock", p.stock != null ? p.stock : "");
    setVal("p_image", p.image_url || "");
    setVal("p_blurb", p.blurb || "");
    setVal("p_materials", (p.materials || []).join("\n"));
    $("#p_active").checked = product ? !!p.active : true;

    updatePreview();
    modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeModal() { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
  const setVal = (id, v) => { const el = $("#" + id); if (el) el.value = v; };
  const setColor = (id, hex) => { $("#" + id).value = hex; $("#" + id + "_t").value = hex; };
  const currentTheme = () => ({ bg: $("#p_bg").value, yarn: $("#p_yarn").value, accent: $("#p_accent").value });

  function updatePreview() {
    const url = $("#p_image").value.trim();
    if (url) { $("#p_preview").src = url; return; }
    if (buildArt) $("#p_preview").src = buildArt({ id: "preview-" + rand(), theme: currentTheme(), motif: $("#p_motif").value });
  }

  ["p_bg", "p_yarn", "p_accent"].forEach((id) => {
    $("#" + id).addEventListener("input", () => { $("#" + id + "_t").value = $("#" + id).value; updatePreview(); });
    $("#" + id + "_t").addEventListener("input", () => { const v = $("#" + id + "_t").value.trim(); if (/^#[0-9a-fA-F]{6}$/.test(v)) { $("#" + id).value = v; updatePreview(); } });
  });
  $("#p_motif").addEventListener("change", updatePreview);
  $("#p_image").addEventListener("input", updatePreview);

  $("#addProductBtn").addEventListener("click", () => {
    if (!sellerProfile || !sellerProfile.shop_name) { switchTab("shop"); toast("Please set up your shop first", true); return; }
    openModal(null);
  });
  document.addEventListener("click", (e) => {
    const edit = e.target.closest("[data-edit]");
    if (edit) { openModal(productsCache.find((x) => x.id === edit.dataset.edit)); return; }
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });

  /* ---------- save / delete ---------- */
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
    const id = $("#p_id").value;

    const record = {
      seller_id: currentUser.id,
      name,
      category: $("#p_category").value,
      motif: $("#p_motif").value,
      theme: currentTheme(),
      blurb: $("#p_blurb").value.trim() || null,
      materials,
      price_cents: Math.round(priceVal * 100),
      compare_at_cents: !isNaN(compareVal) && compareVal > 0 ? Math.round(compareVal * 100) : null,
      tag: $("#p_tag").value.trim() || null,
      image_url: $("#p_image").value.trim() || null,
      stock: stockVal === "" ? null : parseInt(stockVal, 10),
      active: $("#p_active").checked,
    };
    // new products get a unique slug; keep existing slug on edit
    if (!id) record.slug = slugify(name) + "-" + rand();

    const btn = $("#saveProductBtn"); btn.disabled = true; btn.textContent = "Saving…";
    let error;
    if (id) ({ error } = await db.from("products").update(record).eq("id", id));
    else ({ error } = await db.from("products").insert(record));
    btn.disabled = false; btn.textContent = "Save product";

    if (error) {
      note.textContent = /duplicate|unique/i.test(error.message) ? "That name collided — try a slightly different name." : error.message;
      note.classList.add("err");
      return;
    }
    closeModal();
    toast(id ? "Product updated" : "Product listed!");
    loadProducts();
  });

  $("#deleteProductBtn").addEventListener("click", async () => {
    const id = $("#p_id").value; if (!id) return;
    if (!confirm("Delete this product permanently?")) return;
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) { toast("Delete failed: " + error.message, true); return; }
    closeModal(); toast("Product deleted"); loadProducts();
  });

  /* ---------- go ---------- */
  refreshAuth();
})();
