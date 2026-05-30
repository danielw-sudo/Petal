import { env } from "cloudflare:workers";

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

function getAdminCookie(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)petalgen_admin=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const onRequest = async (context: any, next: () => Promise<Response>): Promise<Response> => {
  const { pathname } = new URL(context.request.url);

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) return next();
  if (pathname === "/admin/login" || pathname === "/api/admin/auth") return next();

  const adminSecret = (env as any).ADMIN_SECRET as string | undefined;

  // Fail closed — refuse all admin access until the operator sets ADMIN_SECRET
  if (!adminSecret) {
    const body = JSON.stringify({ error: "Admin not configured — set ADMIN_SECRET in Worker secrets." });
    return new Response(body, { status: 503, headers: { "Content-Type": "application/json" } });
  }

  const token = getAdminCookie(context.request);
  const expectedToken = await deriveSessionToken(adminSecret);
  const valid = token !== null && timingSafeEqual(token, expectedToken);

  if (!valid) {
    if (pathname.startsWith("/api/admin")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return context.redirect("/admin/login");
  }

  return next();
};
