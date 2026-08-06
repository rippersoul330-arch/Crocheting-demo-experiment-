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

  // TODO: paste your FULL publishable key here. The one provided looked
  // truncated (it ended in "...."). It should be one long unbroken string
  // that starts with "sb_publishable_".
  publishableKey: "sb_publishable_iB2Lk4xPu6yRlMut_DIjrQ_IS8UIhOR....REPLACE_WITH_FULL_KEY"
};
