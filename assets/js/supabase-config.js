/* =====================================================================
   Supabase connection settings
   ---------------------------------------------------------------------
   These two values are SAFE to expose in front-end code. The publishable
   (a.k.a. "anon") key can only do what your Row Level Security policies
   allow. NEVER put the secret / service_role key here.

   Get them from: Supabase Dashboard -> Project Settings -> API
   ===================================================================== */
window.SUPABASE_CONFIG = {
  url: "https://ihfcwcqngjnnfnfumjhl.supabase.co",

  // Public "anon" key — safe to expose in the browser (RLS protects your data).
  publishableKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZmN3Y3FuZ2pubmZuZnVtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5OTI0MzEsImV4cCI6MjEwMTU2ODQzMX0.jCoYMFMSB9vnfYntvzex2IwBD5njwAnmOV3ZjTq6e-A"
};
