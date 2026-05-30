import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

// POST { action: "delete", id }
export const POST: APIRoute = async ({ request }) => {
  const db  = (env as any).D1_DATABASE as D1Database | undefined;
  const r2  = (env as any).R2_IMAGES   as R2Bucket   | undefined;
  if (!db) return new Response(JSON.stringify({ error: "DB unavailable" }), { status: 503 });

  const { id } = await request.json() as any;
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });

  const row = await db.prepare("SELECT r2_key FROM saved_images WHERE id = ?").bind(id).first() as any;
  if (!row) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

  await db.prepare("DELETE FROM saved_images WHERE id = ?").bind(id).run();

  if (r2 && row.r2_key) {
    try { await r2.delete(row.r2_key); } catch (e) { console.error("R2 delete failed:", row.r2_key, e); }
  }

  return new Response(JSON.stringify({ success: true }));
};
