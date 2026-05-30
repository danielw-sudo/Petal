import type { PromptContext } from "./types/prompt";

// Auth helper functions
export function getStoredApiKey(): string | null {
  return localStorage.getItem("petalgen_api_key");
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem("petalgen_api_key", key.trim());
}

export function clearStoredApiKey(): void {
  localStorage.removeItem("petalgen_api_key");
}

export async function validateApiKey(apiKey: string): Promise<{ success: boolean; balance?: number; error?: string }> {
  try {
    const response = await fetch("https://gen.pollinations.ai/account/balance", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      return { success: false, error: "Invalid API key or inactive account" };
    }
    const data = await response.json() as any;
    const balance = typeof data === "number" ? data : (data.balance ?? 0);
    return { success: true, balance };
  } catch (err) {
    // If CORS prevents direct fetch, we can fail-open and assume key is valid if it has correct format
    if (apiKey.startsWith("sk_") && apiKey.length > 20) {
      return { success: true, balance: 0 };
    }
    return { success: false, error: "Verification server unreachable" };
  }
}

export async function refactorPrompt(
  prompt: string,
  apiKey?: string,
  mode: "parse" | "enrich" = "parse"
): Promise<{ success: boolean; context?: PromptContext; error?: string; rawText?: string; rateLimitRemaining?: number }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch("/api/refactor", {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt, mode }),
    });

    return (await response.json()) as any;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function saveToGallery(params: {
  logId: string; promptText: string; contextJson: string;
  model: string; width: number; height: number; r2Key: string; imageUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return (await res.json()) as any;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function generateImage(
  context: PromptContext,
  apiKey?: string,
  width = 1024,
  height = 1024,
  seed?: number,
  enhance = false,
  aspectRatio?: string,
  referenceImage?: { blob: Blob; strength: number; instruction?: string }
): Promise<{ success: boolean; blob?: Blob; error?: string; retryable?: boolean; hint?: string; logId?: string; r2Key?: string; imageUrl?: string }> {
  const authHeader: Record<string, string> = {};
  if (apiKey) authHeader["Authorization"] = `Bearer ${apiKey}`;

  try {
    let response: Response;

    if (referenceImage) {
      const form = new FormData();
      form.append("context_json", JSON.stringify(context));
      form.append("reference_image", referenceImage.blob, "reference.jpg");
      form.append("seed", String(seed ?? Math.floor(Math.random() * 1000000)));
      form.append("width", String(width));
      form.append("height", String(height));
      form.append("strength", String(referenceImage.strength));
      form.append("enhance", String(enhance));
      if (aspectRatio) form.append("aspectRatio", aspectRatio);
      if (referenceImage.instruction) form.append("ref_instruction", referenceImage.instruction);
      response = await fetch("/api/generate", { method: "POST", headers: authHeader, body: form });
    } else {
      response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ context, width, height, seed, enhance, aspectRatio }),
      });
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => ({ error: "Unknown server error" }))) as any;
      return { success: false, error: data.error || `HTTP error ${response.status}`, retryable: data.retryable, hint: data.hint };
    }

    const blob = await response.blob();
    const logId = response.headers.get("X-Log-ID") || undefined;
    const r2Key = response.headers.get("X-R2-Key") || undefined;
    const imageUrl = response.headers.get("X-Image-URL") || undefined;
    return { success: true, blob, logId, r2Key, imageUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
