/** Profile-photo upload helpers (Supabase Storage, bucket `avatars`). */

import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");

/** Returns an error message if the file is unacceptable, else null. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Please choose a PNG, JPG, WebP, or GIF image.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

/**
 * Upload an avatar to `avatars/<userId>/…` and return its public URL.
 * A timestamped filename avoids CDN caching a replaced photo.
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { cacheControl: "3600", contentType: file.type });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
