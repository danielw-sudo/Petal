import type { PromptContext, PromptModule } from "../types/prompt";

export type TargetModel = 'zimage' | 'flux' | 'default';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Returns module value only if the module is enabled (or enabled is unset)
function val(mod?: PromptModule): string {
  if (!mod) return '';
  if (mod.enabled === false) return '';
  return mod.value?.trim() ?? '';
}

// Human subject indicators → triggers "adult" injection for Z-Image
const HUMAN_TOKENS = [
  'woman', 'man', 'girl', 'boy', 'person', 'people', 'model',
  'character', 'portrait', 'face', 'actor', 'actress', 'figure',
  'female', 'male', 'human', 'subject'
];

function isHumanSubject(text: string): boolean {
  const lower = text.toLowerCase();
  return HUMAN_TOKENS.some(t => lower.includes(t));
}

function ensureAdult(subjectValue: string): string {
  const lower = subjectValue.toLowerCase();
  const alreadyQualified = ['adult', 'elderly', 'senior', 'middle-aged', 'teenage']
    .some(q => lower.includes(q));
  if (alreadyQualified || !isHumanSubject(subjectValue)) return subjectValue;
  return `Adult ${subjectValue.charAt(0).toLowerCase()}${subjectValue.slice(1)}`;
}

// Style field: medium tag (first clause) leads, rest follows
function extractMediumTag(styleValue: string): { medium: string; rest: string } {
  const match = styleValue.match(/^([^.,;—–\-]+)[.,;—–\-]?\s*(.*)/s);
  if (match) return { medium: match[1].trim(), rest: match[2].trim() };
  return { medium: styleValue, rest: '' };
}

// Constraints: normalize to "no X" phrases, always append safety tail
const SAFETY_TAIL = ['no watermark', 'no text overlay', 'no logos'];

function compileConstraints(constraints?: PromptModule, legacy?: PromptModule): string {
  const raw = [val(constraints), val(legacy)].filter(Boolean).join(', ');

  const normalized: string[] = raw.length
    ? raw.split(/[,;]/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(item => `no ${item.replace(/^no\s+/i, '').trim()}`)
    : [];

  // Merge safety tail, deduplicating
  for (const s of SAFETY_TAIL) {
    if (!normalized.includes(s)) normalized.push(s);
  }

  return normalized.join(', ');
}

// ─── Z-Image Turbo Compiler ───────────────────────────────────────────────────
// Order: Composition → Subject (adult) → Clothing → Scene → Pose →
//        Lighting → Mood → Style → Tech → Constraints (inline tail)
// Docs: Z-Image Turbo Prompting Guide — positive-only, 80–250 words, camera-style

function compileZImage(ctx: PromptContext): string {
  const parts: string[] = [];

  // 1. Composition — shot type + angle leads the prompt
  const composition = val(ctx.composition);
  if (composition) parts.push(composition);

  // 2. Subject — inject "adult" if human and not already qualified
  const subjectRaw = val(ctx.subject);
  if (subjectRaw) parts.push(ensureAdult(subjectRaw));

  // 3. Clothing — Z-Image improvises if absent; add safety fallback for humans
  const clothing = val(ctx.clothing);
  if (clothing) {
    parts.push(clothing);
  } else if (isHumanSubject(subjectRaw)) {
    parts.push('fully clothed, modest everyday outfit');
  }

  // 4. Scene — falls back to legacy medium field
  const scene = val(ctx.scene) || val(ctx.medium);
  if (scene) parts.push(scene);

  // 5. Pose / Activity
  const pose = val(ctx.pose);
  if (pose) parts.push(pose);

  // 6. Lighting — high influence field, keep full value
  const lighting = val(ctx.lighting);
  if (lighting) parts.push(lighting);

  // 7. Mood — cap at first sentence (Z-Image doesn't need novelistic prose)
  const mood = val(ctx.mood);
  if (mood) parts.push(mood.split(/[.!]/)[0].trim());

  // 8. Style — medium tag first, then descriptors
  const styleRaw = val(ctx.style);
  if (styleRaw) {
    const { medium, rest } = extractMediumTag(styleRaw);
    parts.push(medium);
    if (rest) parts.push(rest);
  }

  // 9. Legacy color palette — append to style if no clothing handles it
  const color = val(ctx.color);
  if (color && !val(ctx.clothing)) parts.push(color);

  // 10. Technical parameters — camera, lens, resolution
  const tech = val(ctx.technical);
  if (tech) parts.push(tech);

  // 11. Constraints → inlined as "no X" tail (Z-Image ignores negative_prompt)
  parts.push(compileConstraints(ctx.constraints, ctx.negative));

  return parts.filter(Boolean).join(', ');
}

// ─── Flux Compiler ───────────────────────────────────────────────────────────
// Flux tolerates richer natural language, sentence-separated, style leads.
// Negative kept separate (Flux supports it).

function compileFlux(ctx: PromptContext): string {
  const positiveOrder: Array<keyof PromptContext> = [
    'style', 'subject', 'clothing', 'scene', 'pose', 'lighting', 'composition', 'mood', 'technical'
  ];

  const parts = positiveOrder
    .map(k => val(ctx[k] as PromptModule | undefined))
    .filter(Boolean);

  // Legacy fallbacks
  if (!val(ctx.scene) && val(ctx.medium)) parts.push(val(ctx.medium));
  if (val(ctx.color)) parts.push(val(ctx.color));

  return parts.join('. ');
}

// ─── Default Compiler ────────────────────────────────────────────────────────
// Weight-sorted, comma-joined. Mirrors old reconstructor behavior.
// Safe fallback when targetModel is unknown.

function compileDefault(ctx: PromptContext): string {
  const allModules: (PromptModule | undefined)[] = [
    ctx.subject, ctx.style, ctx.lighting, ctx.mood, ctx.composition, ctx.technical,
    ctx.clothing, ctx.scene, ctx.pose, ctx.medium, ctx.color
  ];

  return allModules
    .filter((m): m is PromptModule => !!m && val(m).length > 0)
    .sort((a, b) => (b.weight ?? 0.5) - (a.weight ?? 0.5))
    .map(m => val(m))
    .join(', ');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function compile(ctx: PromptContext, targetModel?: TargetModel): string {
  const model = (targetModel ?? ctx.metadata?.targetModel ?? 'default') as TargetModel;
  switch (model) {
    case 'zimage': return compileZImage(ctx);
    case 'flux':   return compileFlux(ctx);
    default:       return compileDefault(ctx);
  }
}
