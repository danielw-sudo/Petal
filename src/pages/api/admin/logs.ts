import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

// POST { action: "delete", id }
export const POST: APIRoute = async ({ request }) => {
  const db = (env as any).D1_DATABASE as D1Database | undefined;
  if (!db) return new Response(JSON.stringify({ error: "DB unavailable" }), { status: 503 });

  const { id } = await request.json() as any;
  if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });

  await db.prepare("DELETE FROM prompt_logs WHERE id = ?").bind(id).run();
  return new Response(JSON.stringify({ success: true }));
};
