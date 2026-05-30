import type { APIRoute } from "astro";
import { reconstructPrompt } from "../../lib/reconstructor";
import { harvestPrompt } from "../../../workers/harvester";
import { checkRateLimit } from "../../../workers/rate-limiter";
import { imageKey, uploadImage, publicUrl } from "../../lib/r2";
import type { PromptContext } from "../../types/prompt";
import { env } from "cloudflare:workers";

export const prerender = false;

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const REF_MAX_BYTES = 5 * 1024 * 1024; // 5 MB post-compression

function pollinationsError(status: number): { message: string; retryable: boolean; hint?: string } {
  if (status === 429) return { message: "Quota busy — wait a moment, or add your own Pollinations key to bypass limits.", retryable: true, hint: "byop" };
  if (status === 413) return { message: "Prompt too long — try shortening it.", retryable: false };
  if (status >= 500) return { message: "Pollinations is unavailable — try again in a moment.", retryable: true };
  return { message: `Generation failed (${status}).`, retryable: false };
}

function validMagicBytes(buf: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") return buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  if (mime === "image/png")  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  if (mime === "image/webp") return buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
  return false;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // ── Parse body (multipart = has reference file; JSON = standard) ────────
    const ct = request.headers.get("content-type") || "";
    let context: any, seed: number, width: number, height: number;
    let enhance = false, aspectRatio: string | undefined;
    let referenceFile: File | null = null;
    let referenceUrl: string | undefined;
    let strength = 0.75;
    let refInstruction = "";

    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      context        = JSON.parse(form.get("context_json") as string);
      seed           = parseInt(form.get("seed") as string)  || Math.floor(Math.random() * 1000000);
      width          = parseInt(form.get("width") as string) || 1024;
      height         = parseInt(form.get("height") as string)|| 1024;
      enhance        = form.get("enhance") === "true";
      aspectRatio    = (form.get("aspectRatio") as string) || undefined;
      strength       = parseFloat(form.get("strength") as string) || 0.75;
      refInstruction = ((form.get("ref_instruction") as string) || "").trim().slice(0, 300);
      referenceFile  = form.get("reference_image") as File | null;
    } else {
      const body = await request.json() as any;
      ({ context, enhance = false, aspectRatio, referenceUrl } = body);
      seed     = body.seed   ?? Math.floor(Math.random() * 1000000);
      width    = body.width  ?? 1024;
      height   = body.height ?? 1024;
      strength = body.strength ?? 0.75;
    }

    if (!context || !context.subject) {
      return new Response(JSON.stringify({ success: false, error: "Prompt context is required" }), { status: 400 });
    }

    // ── Sanitize reference file ──────────────────────────────────────────────
    if (referenceFile) {
      if (!ALLOWED_MIME.includes(referenceFile.type)) {
        return new Response(JSON.stringify({ success: false, error: "Reference image must be JPEG, PNG, or WebP." }), { status: 400 });
      }
      if (referenceFile.size > REF_MAX_BYTES) {
        return new Response(JSON.stringify({ success: false, error: "Reference image too large (max 5 MB after compression)." }), { status: 413 });
      }
      const head = new Uint8Array(await referenceFile.slice(0, 12).arrayBuffer());
      if (!validMagicBytes(head, referenceFile.type)) {
        return new Response(JSON.stringify({ success: false, error: "Reference image content does not match declared type." }), { status: 400 });
      }
    }

    const promptCtx = context as PromptContext;
    const db        = (env as any).D1_DATABASE as D1Database | undefined;
    const sysApiKey = (env as any).POLLINATIONS_API_KEY as string | undefined;

    const authHeader = request.headers.get("Authorization");
    const hasUserKey = !!(authHeader && authHeader.startsWith("Bearer "));
    const apiKey     = hasUserKey ? authHeader.replace("Bearer ", "").trim() : sysApiKey;

    // ── Rate limit ───────────────────────────────────────────────────────────
    if (!hasUserKey && db) {
      const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
      const limitCheck = await checkRateLimit(db, ip);
      if (!limitCheck.allowed) {
        return new Response(JSON.stringify({ success: false, error: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded. Connect Pollinations to use your own balance." }), { status: 429 });
      }
    }

    // ── Validate model ───────────────────────────────────────────────────────
    const requestedModel = promptCtx.metadata?.targetModel || "zimage";
    const FALLBACK_MODELS = ["zimage", "flux", "nanobanana-pro", "grok-imagine"];
    if (db) {
      const row = await db.prepare("SELECT enabled FROM enabled_models WHERE model_id = ? AND model_type = 'image'").bind(requestedModel).first() as any;
      if (!row || !row.enabled) return new Response(JSON.stringify({ success: false, error: "Model not available." }), { status: 400 });
    } else if (!FALLBACK_MODELS.includes(requestedModel)) {
      return new Response(JSON.stringify({ success: false, error: "Model not available." }), { status: 400 });
    }

    const { positive, negative } = reconstructPrompt(promptCtx);

    // ── Fetch image from Pollinations ────────────────────────────────────────
    let imageBlob: Blob;

    if (referenceFile || referenceUrl) {
      // POST /v1/images/edits — reference image path
      const editsForm = new FormData();
      const editsPrompt = refInstruction ? `${refInstruction}. ${positive}` : positive;
      editsForm.append("prompt", editsPrompt);
      editsForm.append("model", requestedModel);
      editsForm.append("width", String(width));
      editsForm.append("height", String(height));
      editsForm.append("seed", String(seed));
      editsForm.append("strength", String(Math.max(0, Math.min(1, strength))));
      editsForm.append("nologo", "true");
      if (referenceFile) editsForm.append("image", referenceFile);
      else if (referenceUrl) editsForm.append("image", referenceUrl);

      const editsRes = await fetch("https://gen.pollinations.ai/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: editsForm,
      });
      if (!editsRes.ok) {
        const { message, retryable, hint } = pollinationsError(editsRes.status);
        return new Response(JSON.stringify({ success: false, error: message, retryable, hint }), { status: editsRes.status });
      }
      const resCt = editsRes.headers.get("content-type") || "";
      if (resCt.includes("application/json")) {
        const json = await editsRes.json() as any;
        // Handle OpenAI-style { data:[{url}] }, flat { url }, or base64 { data:[{b64_json}] }
        const imgUrl: string | undefined = json.data?.[0]?.url ?? json.url;
        const b64: string | undefined = json.data?.[0]?.b64_json ?? json.b64_json;
        if (imgUrl) {
          imageBlob = await (await fetch(imgUrl)).blob();
        } else if (b64) {
          const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          imageBlob = new Blob([bytes], { type: "image/png" });
        } else {
          console.error("[petalgen] /v1/images/edits unexpected JSON:", JSON.stringify(json));
          return new Response(
            JSON.stringify({ success: false, error: "Reference generation returned no image — the model may not support img2img. Try Kontext or GPT Image.", retryable: false }),
            { status: 502, headers: { "Content-Type": "application/json" } }
          );
        }
      } else {
        imageBlob = await editsRes.blob();
      }
    } else {
      // Standard GET path
      let imageUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(positive)}?model=${requestedModel}&seed=${seed}&width=${width}&height=${height}&nologo=true`;
      if (aspectRatio) imageUrl += `&aspectRatio=${encodeURIComponent(aspectRatio)}`;
      if (enhance) imageUrl += `&enhance=true`;
      if (negative && requestedModel !== "zimage") imageUrl += `&negative_prompt=${encodeURIComponent(negative)}`;

      const imageRes = await fetch(imageUrl, { method: "GET", headers: { Authorization: `Bearer ${apiKey}` } });
      if (!imageRes.ok) {
        const { message, retryable, hint } = pollinationsError(imageRes.status);
        return new Response(JSON.stringify({ success: false, error: message, retryable, hint }), { status: imageRes.status });
      }
      imageBlob = await imageRes.blob();
    }

    // ── Log to D1 ────────────────────────────────────────────────────────────
    let logId: string | null = null;
    if (db) {
      const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
      logId = await harvestPrompt(db, ip, promptCtx, positive, "");
    }

    // ── Upload to R2 ─────────────────────────────────────────────────────────
    const r2     = (env as any).R2_IMAGES as R2Bucket | undefined;
    const r2Base = (env as any).R2_PUBLIC_URL as string | undefined;
    let r2Key = "", r2Url = "";
    if (r2 && r2Base) {
      try {
        const saveId = logId || crypto.randomUUID();
        r2Key = imageKey(saveId);
        await uploadImage(r2, r2Key, await imageBlob.arrayBuffer(), imageBlob.type || "image/jpeg");
        r2Url = publicUrl(r2Base, r2Key);
      } catch (e) { console.error("R2 upload error:", e); }
    }

    return new Response(imageBlob, {
      status: 200,
      headers: {
        "Content-Type": imageBlob.type || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
        "X-Log-ID": logId || "none",
        "X-R2-Key": r2Key,
        "X-Image-URL": r2Url,
        "Access-Control-Expose-Headers": "X-Log-ID, X-R2-Key, X-Image-URL",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message, retryable: true }), { status: 500 });
  }
};
