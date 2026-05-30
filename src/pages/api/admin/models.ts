import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

async function invalidateCache() {
  try {
    await (caches as any).default.delete(new Request("https://cache.petalgen/models?type=image"));
    await (caches as any).default.delete(new Request("https://cache.petalgen/models?type=text"));
  } catch {}
}

// PUT-style toggle/update via POST { action:"toggle"|"reorder", id, enabled?, sort_order? }
// POST sync via POST { action:"sync" }
export const POST: APIRoute = async ({ request }) => {
  const db = (env as any).D1_DATABASE as D1Database | undefined;
  if (!db) return new Response(JSON.stringify({ error: "DB unavailable" }), { status: 503 });

  const body = await request.json() as any;
  const { action } = body;

  if (action === "toggle") {
    const { id, enabled } = body;
    await db.prepare("UPDATE enabled_models SET enabled = ?, updated_at = datetime('now') WHERE model_id = ?")
      .bind(enabled ? 1 : 0, id).run();
    await invalidateCache();
    return new Response(JSON.stringify({ success: true }));
  }

  if (action === "reorder") {
    const { id, sort_order } = body;
    await db.prepare("UPDATE enabled_models SET sort_order = ?, updated_at = datetime('now') WHERE model_id = ?")
      .bind(sort_order, id).run();
    await invalidateCache();
    return new Response(JSON.stringify({ success: true }));
  }

  if (action === "sync") {
    let inserted = 0;
    const sources: { url: string; type: string }[] = [
      { url: "https://gen.pollinations.ai/image/models", type: "image" },
      { url: "https://gen.pollinations.ai/text/models",  type: "text" },
    ];
    try {
      for (const { url, type } of sources) {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) continue;
        const data = await res.json() as any;
        const ids: string[] = Array.isArray(data)
          ? data.map((m: any) => (typeof m === "string" ? m : m.id ?? m.name ?? "")).filter(Boolean)
          : [];
        for (const id of ids) {
          const result = await db
            .prepare("INSERT OR IGNORE INTO enabled_models (model_id, model_type, display_name, sort_order, enabled) VALUES (?, ?, ?, 999, 0)")
            .bind(id, type, id).run();
          if (result.meta?.changes) inserted++;
        }
      }
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 502 });
    }
    await invalidateCache();
    return new Response(JSON.stringify({ success: true, inserted }));
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
};
