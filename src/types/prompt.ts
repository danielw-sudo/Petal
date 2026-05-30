export interface PromptModule {
  id: string;           // stable key (e.g. subject, style, mood)
  label: string;        // UI display name
  value: string;        // current token string
  locked: boolean;      // excluded from randomization
  weight: number;       // 0.0 - 1.0, controls fallback sort order
  alternatives: string[]; // LLM-suggested swaps
  enabled?: boolean;    // optional toggle state
}

// ─── v2 Schema (2026.05.26) ──────────────────────────────────────────────────
// New fields added alongside legacy fields.
// Compiler reads new fields first, falls back to legacy equivalents.
// Legacy fields kept optional to avoid breaking validator.ts callsites.

export interface PromptContext {
  // --- Core (both v1 and v2) ---
  subject:     PromptModule;
  lighting:    PromptModule;
  composition: PromptModule; // v2: absorbs perspective
  style:       PromptModule; // v2: leads with medium tag
  mood:        PromptModule;
  technical:   PromptModule;

  // --- New in v2 ---
  clothing?:   PromptModule; // explicit clothing — Z-Image improvises if absent
  scene?:      PromptModule; // environment/background (replaces parts of medium)
  pose?:       PromptModule; // pose/activity
  constraints?: PromptModule; // exclusions — compiler folds inline, not negative field
  reference?:  PromptModule; // reference image instruction — NOT compiled into prompt; sent as ref_instruction

  // --- Legacy v1 (deprecated, kept for backward compat) ---
  /** @deprecated v2: medium tag now leads style field */
  medium?:     PromptModule;
  /** @deprecated v2: clothing-specific palette goes in clothing field */
  color?:      PromptModule;
  /** @deprecated v2: use constraints — compiles inline for Z-Image */
  negative?:   PromptModule;

  raw: string;             // original unmodified input (never mutated)
  remixedOutput?: string;  // last compiled output string
  metadata: {
    schemaVersion: string; // "2026.05.26" → bumped when schema evolves
    targetModel: string;   // "zimage" | "flux" | "default"
    createdAt: string;     // ISO timestamp
    remixCount: number;    // how many times user modified before generating
  };
}

export interface UserSession {
  apiKey?: string;
  rateLimitRemaining: number;
}
