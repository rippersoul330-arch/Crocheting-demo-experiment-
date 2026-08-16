/* =====================================================================
   Loop & Ivy — Buyer accounts
   ---------------------------------------------------------------------
   Optional customer sign in / sign up on the storefront (Supabase Auth).
   Signing in isn't required to buy — it just pre-fills the checkout and
   gives shoppers a lightweight account. Reuses the same Supabase client
   as the data layer (window.LoopIvyClient) to avoid duplicate auth
   instances. Degrades gracefully if Supabase isn't configured.
   ===================================================================== */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);

  const cfg = window.SUPABASE_CONFIG || {};
  const keyLooksReal = cfg.publishableKey && !/REPLACE|\.\.\.\./.test(cfg.publishableKey) && cfg.publishableKey.length > 30;
  // Prefer the client the data layer already created; fall back to our own.
  const db = window.LoopIvyClient ||
    (window.supabase && cfg.url && keyLooksReal ? window.supabase.createClient(cfg.url, cfg.publishableKey) : null);

  const accountBtn = $("#accountBtn");

  // Without Supabase there are no accounts — point the icon at the seller page.
  if (!db) {
    if (accountBtn) {
      accountBtn.title = "Sell with us";
      accountBtn.setAttribute("aria-label", "Sell with us");
      accountBtn.addEventListener("click", () => { window.location.href = "seller.html"; });
    }
    return;
  }

  /* ---------------- elements ---------------- */
  const modal = $("#buyerAuth");
  const formsPane = $("#authForms");
  const accountPane = $("#authAccount");
  const loginForm = $("#buyerLoginForm");
  const signupForm = $("#buyerSignupForm");
  const accountDot = $("#accountDot");

  let currentUser = null;

  /* ---------------- helpers ---------------- */
  const displayName = (user) => {
    if (!user) return "there";
    const m = user.user_metadata || {};
    return (m.full_name || m.name || (user.email ? user.email.split("@")[0] : "there"));
  };

  function toast(msg) {
    // reuse the storefront toast if available
    const t = $("#toast");
    if (!t) return;
    t.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg> ${msg}`;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("is-show"));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.classList.remove("is-show"); setTimeout(() => (t.hidden = true), 350); }, 2600);
  }

  /* ---------------- modal open / close ---------------- */
  function showPane() {
    const authed = !!currentUser;
    accountPane.hidden = !authed;
    formsPane.hidden = authed;
    if (authed) {
      $("#authName").textContent = displayName(currentUser);
      $("#authEmail").textContent = currentUser.email || "";
      $("#authAvatar").textContent = (displayName(currentUser).charAt(0) || "L");
    } else {
      showLogin();
    }
  }
  function openModal() {
    showPane();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  accountBtn.addEventListener("click", openModal);
  modal.addEventListener("click", (e) => { if (e.target.closest("[data-auth-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });

  /* ---------------- toggle sign in / sign up ---------------- */
  function showLogin() {
    loginForm.hidden = false; signupForm.hidden = true;
    $("#authTitle").textContent = "Welcome back";
    $("#authSub").textContent = "Sign in for a faster checkout — your details fill in automatically.";
    $("#authSwitchText").textContent = "New to Loop & Ivy?";
    $("#authToggle").textContent = "Create an account";
  }
  function showSignup() {
    loginForm.hidden = true; signupForm.hidden = false;
    $("#authTitle").textContent = "Create your account";
    $("#authSub").textContent = "Save your details for a quicker checkout next time.";
    $("#authSwitchText").textContent = "Already have an account?";
    $("#authToggle").textContent = "Sign in";
  }
  $("#authToggle").addEventListener("click", (e) => {
    e.preventDefault();
    if (signupForm.hidden) showSignup(); else showLogin();
  });

  /* ---------------- sign in ---------------- */
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = $("#biLoginNote"); note.textContent = ""; note.classList.remove("is-ok");
    const email = $("#biEmail").value.trim();
    const password = $("#biPassword").value;
    if (!email || !password) { note.textContent = "Please enter your email and password."; return; }
    const btn = $("#biLoginBtn"); btn.disabled = true; btn.textContent = "Signing in…";
    const { error } = await db.auth.signInWithPassword({ email, password });
    btn.disabled = false; btn.textContent = "Sign in";
    if (error) {
      note.textContent = /confirm/i.test(error.message)
        ? "Please confirm your email first — check your inbox for the link."
        : (error.message || "Sign in failed.");
      return;
    }
    // success handled by onAuthStateChange
    loginForm.reset();
    closeModal();
  });

  /* ---------------- sign up ---------------- */
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = $("#biSignupNote"); note.textContent = ""; note.classList.remove("is-ok");
    const name = $("#suName").value.trim();
    const email = $("#suBuyerEmail").value.trim();
    const password = $("#suBuyerPassword").value;
    if (!name) { note.textContent = "Please enter your name."; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { note.textContent = "Please enter a valid email."; return; }
    if (password.length < 6) { note.textContent = "Password must be at least 6 characters."; return; }

    const btn = $("#biSignupBtn"); btn.disabled = true; btn.textContent = "Creating…";
    const { data, error } = await db.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    btn.disabled = false; btn.textContent = "Create account";
    if (error) { note.textContent = error.message; return; }

    if (data.session) {
      // email confirmation disabled → signed in immediately
      signupForm.reset();
      closeModal();
      toast("Welcome to Loop & Ivy! 💛");
    } else {
      // email confirmation required
      note.textContent = "Almost there — check your email to confirm your account, then sign in.";
      note.classList.add("is-ok");
      showLogin();
      $("#biEmail").value = email;
    }
  });

  /* ---------------- sign out ---------------- */
  $("#buyerSignOut").addEventListener("click", async () => {
    await db.auth.signOut();
    closeModal();
    toast("Signed out");
  });

  /* ---------------- session → UI ---------------- */
  function renderAuthState(user) {
    currentUser = user || null;

    if (currentUser) {
      accountDot.hidden = false;
      accountBtn.classList.add("is-authed");
      accountBtn.title = "Your account";
      accountBtn.setAttribute("aria-label", "Your account — " + displayName(currentUser));
      // expose for the checkout to prefill
      window.LoopIvyBuyer = { user: currentUser, name: displayName(currentUser), email: currentUser.email || "" };
    } else {
      accountDot.hidden = true;
      accountBtn.classList.remove("is-authed");
      accountBtn.title = "Sign in";
      accountBtn.setAttribute("aria-label", "Sign in");
      window.LoopIvyBuyer = null;
    }
    // keep the modal panel in sync if it's open
    if (modal.classList.contains("is-open")) showPane();
    // let the checkout prefill immediately if it's listening
    document.dispatchEvent(new CustomEvent("loopivy:buyer", { detail: window.LoopIvyBuyer }));
  }

  db.auth.onAuthStateChange((_event, session) => {
    renderAuthState(session && session.user ? session.user : null);
  });

  // initial session check
  db.auth.getSession().then(({ data }) => {
    renderAuthState(data && data.session ? data.session.user : null);
  });
})();
