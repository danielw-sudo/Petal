import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

const CACHE_URL = "https://cache.petalgen/models";

export const GET: APIRoute = async ({ request }) => {
  const type = new URL(request.url).searchParams.get("type") || "image";
  const db = (env as any).D1_DATABASE as D1Database | undefined;
  if (!db) {
    return new Response(JSON.stringify({ success: false, error: "Database unavailable" }), { status: 503 });
  }

  // Try Workers Cache (5 min TTL)
  const cacheKey = new Request(`${CACHE_URL}?type=${type}`);
  try {
    const hit = await (caches as any).default.match(cacheKey);
    if (hit) {
      const body = await hit.text();
      return new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }
  } catch {}

  const rows = await db
    .prepare("SELECT model_id, display_name, description FROM enabled_models WHERE enabled = 1 AND model_type = ? ORDER BY sort_order ASC")
    .bind(type)
    .all();

  const models = (rows.results ?? []) as { model_id: string; display_name: string; description: string }[];
  const payload = JSON.stringify({
    success: true,
    models: models.map(m => ({ id: m.model_id, name: m.display_name, description: m.description })),
  });

  // Store in Workers Cache with its own TTL (separate from browser Cache-Control)
  try {
    await (caches as any).default.put(
      cacheKey,
      new Response(payload, { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } })
    );
  } catch {}

  return new Response(payload, {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};
