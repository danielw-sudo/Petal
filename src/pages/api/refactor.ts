import type { APIRoute } from "astro";
import { checkRateLimit } from "../../../workers/rate-limiter";
import type { PromptContext } from "../../types/prompt";
import { env } from "cloudflare:workers";

export const prerender = false; // Run as dynamic SSR route

// ── ENRICH system prompt ────────────────────────────────────────────────────
// Used when the local script+hook has already extracted module values.
// Input is clean "Label: value" flat text. Mistral's job: improve each value
// and generate 3 thematic alternatives. One focused task — no parsing needed.
const ENRICH_PROMPT = `You are a creative AI image prompt specialist. You receive a pre-parsed prompt in labeled format (one "Module: value" per line). Your job:
1. Improve each value — make it more vivid, specific, and evocative. Preserve all named details.
2. Generate exactly 3 thematic alternatives per module that match the overall style and mood.
3. If a module is missing from the input, produce a sensible value based on context clues.

Output ONLY a raw JSON object with exactly these 10 keys. No markdown fences, no explanation.
Keys: subject, clothing, scene, pose, lighting, composition, style, mood, technical, constraints

For each key:
{"id":"key","label":"Label","value":"improved value","locked":false,"weight":W,"alternatives":["alt1","alt2","alt3"]}

Weights: subject=1.0, clothing=0.95, scene=0.85, pose=0.8, lighting=0.75, composition=0.7, style=0.65, mood=0.5, technical=0.3, constraints=0.1`;

// ── PARSE system prompt ─────────────────────────────────────────────────────
// Used for raw unstructured input. Full extraction + decomposition task.
const SYSTEM_PROMPT = `You are a prompt modulation assistant for AI image generation. Your job is to decompose a monolithic prompt into 10 structured modules. CRITICAL RULE: preserve ALL specific details from the input — names, hair color, clothing items, jewelry, background elements, textures, exact colors. Do NOT summarize or generalize. Extract and redistribute the full detail into the correct module.

Modules (extract into exactly these 10 keys):
1. "subject" — Who or what. Include ethnicity, age, hair color/style, skin, makeup, expression. Keep every specific trait.
2. "clothing" — What they wear. Include garment type, color, fabric, cut, accessories, jewelry. Be explicit.
3. "scene" — Environment and background. Include location, background elements, props, atmosphere. Full detail.
4. "pose" — Body position, gesture, activity, gaze direction.
5. "lighting" — Light source, quality, direction, color temperature. Specific terms only.
6. "composition" — Shot type (close-up/medium/full-body), angle, depth of field, aspect ratio.
7. "style" — Start with medium tag (realistic photography / oil painting / anime illustration / etc.), then aesthetic descriptors.
8. "mood" — Emotional tone, 3–6 words max.
9. "technical" — Camera, lens, aperture, film stock, resolution, render engine. Only if present in input.
10. "constraints" — Explicit exclusions from the input. If none stated, leave empty string.

For each module provide:
- "id": the key name
- "label": human-readable label
- "value": full extracted content — preserve all specific detail, do not shorten
- "locked": false
- "weight": subject=1.0, clothing=0.95, scene=0.85, pose=0.8, lighting=0.75, composition=0.7, style=0.65, mood=0.5, technical=0.3, constraints=0.1
- "alternatives": 3 alternatives that match the theme and style

Respond ONLY with a raw JSON object. No markdown fences, no explanation, no notes.

Example input: "Dreamy portrait of a young Arabic princess with iridescent glitter on long blonde hair, bold red lips, wearing a richly embroidered red off-shoulder dress and opulent diamond jewelry. Background of pink and purple flowers. Soft golden hour light. Medium close-up, shallow depth of field."

Example output:
{
  "subject": { "id": "subject", "label": "Subject", "value": "Adult Arabic princess, long flowing blonde hair with iridescent glitter, exquisite makeup, bold red lips, soft luminous skin", "locked": false, "weight": 1.0, "alternatives": ["Adult Persian noblewoman, dark curly hair, golden jewelry", "Adult Moroccan princess, braided auburn hair, kohl-lined eyes", "Adult Middle Eastern aristocrat, silver hair updo, pearl accents"] },
  "clothing": { "id": "clothing", "label": "Clothing", "value": "Richly embroidered red off-shoulder dress, opulent diamond jewelry, ornate neckline", "locked": false, "weight": 0.95, "alternatives": ["Sapphire blue silk gown with gold embroidery, emerald necklace", "Ivory brocade off-shoulder dress, pearl and ruby tiara", "Deep violet velvet gown, chandelier diamond earrings"] },
  "scene": { "id": "scene", "label": "Scene", "value": "Lush arrangement of pink and purple flowers, hints of greenery, draped fabric in background, soft blurred floral setting", "locked": false, "weight": 0.85, "alternatives": ["Marble palace balcony, rose petals scattered, sheer curtains", "Enchanted garden at dusk, wisteria hanging overhead", "Opulent candlelit chamber, silk drapes, scattered petals"] },
  "pose": { "id": "pose", "label": "Pose", "value": "Direct gaze toward camera, elegant composed posture", "locked": false, "weight": 0.8, "alternatives": ["Slight downward glance, head tilted gently", "Three-quarter turn, looking over shoulder", "Eyes closed, serene expression, face lifted slightly"] },
  "lighting": { "id": "lighting", "label": "Lighting", "value": "Soft diffused golden hour lighting, warm glow, accentuates sparkle of adornments and luminous textures", "locked": false, "weight": 0.75, "alternatives": ["Warm candlelight, soft shadows, rim highlight on hair", "Overcast natural light, even diffused, muted warmth", "Studio beauty lighting, front-lit, subtle catchlights"] },
  "composition": { "id": "composition", "label": "Composition", "value": "Medium close-up, shallow depth of field, subject centered", "locked": false, "weight": 0.7, "alternatives": ["Portrait close-up, face fills frame, extreme shallow DoF", "Medium shot, three-quarter body, slight low angle", "Full body, symmetrical centered composition"] },
  "style": { "id": "style", "label": "Style", "value": "Realistic photography. Soft ethereal glamorous aesthetic, luminous textures, muted jewel-toned color palette, romantic fantastical atmosphere", "locked": false, "weight": 0.65, "alternatives": ["Painterly digital art, Pre-Raphaelite influence, rich saturated tones", "Fashion editorial photography, high-gloss finish, vivid colors", "Soft watercolor illustration, pastel tones, dreamy wash"] },
  "mood": { "id": "mood", "label": "Mood", "value": "Romantic, fantastical, dreamy, surreal", "locked": false, "weight": 0.5, "alternatives": ["Mysterious, regal, otherworldly", "Tender, ethereal, intimate", "Bold, opulent, commanding"] },
  "technical": { "id": "technical", "label": "Technical", "value": "Shallow depth of field, luminous texture detail, jewel-toned color grading", "locked": false, "weight": 0.3, "alternatives": ["85mm prime lens, f/1.8, natural skin texture", "Medium format look, rich tonal depth", "Soft focus with sharp subject, film-like grain"] },
  "constraints": { "id": "constraints", "label": "Constraints", "value": "", "locked": false, "weight": 0.1, "alternatives": ["no watermark, no text", "no harsh shadows, no clutter", "no desaturation, no flat lighting"] }
}`;

function pollinationsError(status: number): { message: string; retryable: boolean; hint?: string } {
  if (status === 429) return { message: "Quota busy — wait a moment, or add your own Pollinations key to bypass limits.", retryable: true, hint: "byop" };
  if (status === 413) return { message: "Prompt too long — try shortening it.", retryable: false };
  if (status >= 500) return { message: "Pollinations is unavailable — try again in a moment.", retryable: true };
  return { message: `Refactor failed (${status}).`, retryable: false };
}

const PROMPT_MAX_CHARS = 3000;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const { prompt, mode = "parse" } = body;
    const systemPrompt = mode === "enrich" ? ENRICH_PROMPT : SYSTEM_PROMPT;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Prompt is required" }), { status: 400 });
    }

    const inputPrompt = prompt.length > PROMPT_MAX_CHARS ? prompt.slice(0, PROMPT_MAX_CHARS) : prompt;

    // Access Cloudflare resources from cloudflare:workers env
    const db = (env as any).D1_DATABASE as D1Database | undefined;
    const sysApiKey = (env as any).POLLINATIONS_API_KEY as string | undefined;

    // Rate Limiting check (BYOP key bypasses this)
    const authHeader = request.headers.get("Authorization");
    const hasUserKey = !!(authHeader && authHeader.startsWith("Bearer "));
    const apiKey = hasUserKey ? authHeader.replace("Bearer ", "").trim() : sysApiKey;

    let rateLimitRemaining = 999;
    if (!hasUserKey && db) {
      const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
      const limitCheck = await checkRateLimit(db, ip);
      if (!limitCheck.allowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "RATE_LIMIT_EXCEEDED",
            message: "Rate limit exceeded. Connect Pollinations to use your own balance.",
          }),
          { status: 429 }
        );
      }
      rateLimitRemaining = limitCheck.remaining;
    }

    // Call Pollinations LLM
    const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-scout", // meta-llama-4-scout
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mode === "enrich"
              ? `Enrich and complete this pre-parsed prompt:\n\n${inputPrompt}`
              : `Refactor this prompt: "${inputPrompt}"` },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const { message, retryable, hint } = pollinationsError(response.status);
      return new Response(JSON.stringify({ success: false, error: message, retryable, hint }), { status: response.status });
    }

    const data = await response.json() as any;
    let rawText = data.choices[0]?.message?.content?.trim() || "";

    // Clean markdown wraps if any
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    try {
      const parsed = JSON.parse(rawText);
      // Construct a valid PromptContext structure
      const contextData: PromptContext = {
        // v2 fields
        subject:     parsed.subject,
        clothing:    parsed.clothing,
        scene:       parsed.scene,
        pose:        parsed.pose,
        lighting:    parsed.lighting,
        composition: parsed.composition,
        style:       parsed.style,
        mood:        parsed.mood,
        technical:   parsed.technical,
        constraints: parsed.constraints,
        // legacy fallbacks — keep if model returns them
        medium:   parsed.medium,
        color:    parsed.color,
        negative: parsed.negative,
        raw: prompt,
        metadata: {
          schemaVersion: "2026.05.26",
          targetModel: "zimage",
          createdAt: new Date().toISOString(),
          remixCount: 0,
        },
      };

      const truncated = prompt.length > PROMPT_MAX_CHARS;
      return new Response(JSON.stringify({ success: true, context: contextData, rateLimitRemaining, truncated }));
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: "JSON_PARSING_FAILED", rawText }), { status: 200 });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
};
