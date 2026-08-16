/* =====================================================================
   Shared image upload helper (used by the seller studio + admin).
   Uploads a file to the public `product-images` Supabase Storage bucket
   and returns its public URL. Requires a signed-in (authenticated) user
   per the storage RLS policies.
   ===================================================================== */
(function () {
  "use strict";

  const BUCKET = "product-images";
  const MAX_BYTES = 6 * 1024 * 1024; // 6 MB per image

  // client: a supabase client; file: a File; prefix: folder (e.g. user id)
  window.uploadProductImage = async function (client, file, prefix) {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      throw new Error("Please choose an image file.");
    }
    if (file.size > MAX_BYTES) {
      throw new Error("Image is too large (max 6 MB). Try a smaller photo.");
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${prefix || "shop"}/${Date.now()}-${rand}.${ext}`;

    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw error;

    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };
})();
