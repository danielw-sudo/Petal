// src/lib/r2.ts — R2 upload helpers
// Adapted from AIGC-portfolio/src/lib/core/r2.ts

export function imageKey(id: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm   = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `images/${yyyy}/${mm}/${id}.jpg`;
}

export async function uploadImage(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer,
  contentType = "image/jpeg",
): Promise<void> {
  await bucket.put(key, data, { httpMetadata: { contentType } });
}

export function publicUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, "")}/${key}`;
}
