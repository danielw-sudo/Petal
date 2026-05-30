// Thin shim — delegates to compiler.ts.
// All existing callsites (ModulePanel.astro, api/generate.ts) continue to work.
// New code should import compile() from compiler.ts directly.

import type { PromptContext } from "../types/prompt";
import { compile } from "./compiler";

export function reconstructPrompt(context: PromptContext): { positive: string; negative: string } {
  const positive = compile(context);

  // Legacy negative field — returned separately for UIs that still display it.
  // Z-Image: this value is already baked into `positive` by the compiler.
  // Flux / other models: callers may pass this to their negative_prompt field.
  const negative = context.negative?.value?.trim() ?? '';

  return { positive, negative };
}
