import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const { logId, promptText, contextJson, model, width, height, r2Key, imageUrl } = body;

    if (!logId || !promptText || !r2Key || !imageUrl) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400 });
    }

    const db = (env as any).D1_DATABASE as D1Database | undefined;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: "Database unavailable" }), { status: 503 });
    }

    await db.prepare(
      "INSERT OR IGNORE INTO saved_images (id, prompt_text, context_json, model, width, height, r2_key, image_url) VALUES (?,?,?,?,?,?,?,?)"
    ).bind(logId, promptText, contextJson || "{}", model || "zimage", width || 1024, height || 1024, r2Key, imageUrl).run();

    return new Response(JSON.stringify({ success: true }));
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
