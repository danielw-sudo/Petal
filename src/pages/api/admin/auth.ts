import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

// Derives a stable session token from the secret via HMAC-SHA256.
// The cookie stores this token, not the raw secret.
async function deriveSessionToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("petalgen-admin-session"));
  return btoa(Array.from(new Uint8Array(sig), b => String.fromCharCode(b)).join(""));
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const secret = (form.get("secret") as string | null)?.trim() ?? "";
  const adminSecret = (env as any).ADMIN_SECRET as string | undefined;

  if (!adminSecret || !timingSafeEqual(secret, adminSecret)) {
    return Response.redirect(new URL("/admin/login?error=1", request.url).toString(), 302);
  }

  const sessionToken = await deriveSessionToken(adminSecret);
  const headers = new Headers({
    Location: "/admin",
    "Set-Cookie": `petalgen_admin=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
  });
  return new Response(null, { status: 302, headers });
};
