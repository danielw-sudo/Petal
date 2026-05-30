import { PromptContext } from "../src/types/prompt";

async function hashIP(ip: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function harvestPrompt(
  db: D1Database,
  ip: string,
  context: PromptContext,
  compiledPrompt: string,
  imageUrl: string
): Promise<string | null> {
  const logId = crypto.randomUUID();
  const ipHash = await hashIP(ip);
  const parsedJson = JSON.stringify({
    subject: context.subject,
    clothing: context.clothing,
    scene: context.scene,
    pose: context.pose,
    style: context.style,
    lighting: context.lighting,
    mood: context.mood,
    composition: context.composition,
    technical: context.technical,
    constraints: context.constraints,
    medium: context.medium,
    color: context.color,
    negative: context.negative,
  });

  try {
    // 1. Log the full transaction
    await db.prepare(
      `INSERT INTO prompt_logs (id, ip_hash, original_prompt, parsed_json, compiled_prompt, selected_model, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        logId,
        ipHash,
        context.raw,
        parsedJson,
        compiledPrompt,
        context.metadata.targetModel,
        imageUrl
      )
      .run();

    // 2. Harvest structured module tokens (primary source)
    await harvestContextModules(db, context);
    // 3. Also try raw colon-separated lines (legacy / imported prompts)
    await harvestRawTokens(db, context.raw);

    return logId;
  } catch (err) {
    console.error("D1 Harvester logging error:", err);
    return null;
  }
}

async function harvestContextModules(db: D1Database, context: PromptContext): Promise<void> {
  const fields: [string, any][] = [
    ["Subject",     context.subject],
    ["Clothing",    context.clothing],
    ["Scene",       context.scene],
    ["Pose",        context.pose],
    ["Lighting",    context.lighting],
    ["Composition", context.composition],
    ["Style",       context.style],
    ["Mood",        context.mood],
    ["Technical",   context.technical],
    ["Constraints", context.constraints],
  ];
  for (const [token, mod] of fields) {
    const value = typeof mod === "object" ? mod?.value?.trim() : String(mod || "").trim();
    if (!value || value.length < 2) continue;
    try {
      await db.prepare("INSERT INTO harvested_tokens (token, value) VALUES (?, ?)")
        .bind(token, value).run();
    } catch (e) { /* duplicate or schema error — skip */ }
  }
}

async function harvestRawTokens(db: D1Database, rawText: string): Promise<void> {
  if (!rawText) return;

  // Split prompt into lines/paragraphs
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    // Ensure the token has a reasonable key length
    if (colonIndex > 0 && colonIndex < 40) {
      const token = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      // Guard against URLs/protocols (e.g. http://, https://)
      if (token.toLowerCase().startsWith("http") || token.includes("/")) {
        continue;
      }

      if (token.length >= 2 && value.length >= 2) {
        try {
          await db.prepare(
            `INSERT INTO harvested_tokens (token, value) VALUES (?, ?)`
          )
            .bind(token, value)
            .run();
        } catch (e) {
          console.error("Token harvesting database error:", e);
        }
      }
    }
  }
}
