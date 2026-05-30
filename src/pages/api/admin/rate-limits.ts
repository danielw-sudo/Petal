import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

// POST { ip_hash }
export const POST: APIRoute = async ({ request }) => {
  const db = (env as any).D1_DATABASE as D1Database | undefined;
  if (!db) return new Response(JSON.stringify({ error: "DB unavailable" }), { status: 503 });

  const { ip_hash } = await request.json() as any;
  if (!ip_hash) return new Response(JSON.stringify({ error: "ip_hash required" }), { status: 400 });

  await db.prepare("DELETE FROM rate_limits WHERE ip_hash = ?").bind(ip_hash).run();
  return new Response(JSON.stringify({ success: true }));
};
