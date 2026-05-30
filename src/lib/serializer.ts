import type { PromptContext, PromptModule } from "../types/prompt";

const MODULE_ORDER = [
  { key: "subject",     label: "Subject"      },
  { key: "clothing",    label: "Clothing"      },
  { key: "scene",       label: "Scene"         },
  { key: "pose",        label: "Pose"          },
  { key: "lighting",    label: "Lighting"      },
  { key: "composition", label: "Composition"   },
  { key: "style",       label: "Style"         },
  { key: "mood",        label: "Mood"          },
  { key: "technical",   label: "Technical"     },
  { key: "constraints", label: "Constraints"   },
] as const;

/**
 * Converts a rough PromptContext (produced by the local script parser) into a
 * clean flat "Label: value" text block — the hook's output that feeds the skill.
 *
 * Mistral Small handles this format effortlessly compared to nested JSON blobs.
 * Only modules with actual content are included; empty ones are omitted so
 * Mistral doesn't hallucinate filler.
 */
export function serializeContextToText(ctx: PromptContext): string {
  const lines: string[] = [];

  for (const { key, label } of MODULE_ORDER) {
    const mod = ctx[key] as PromptModule | undefined;
    const value = mod?.value?.trim();
    if (value) {
      lines.push(`${label}: ${value}`);
    }
  }

  return lines.join("\n");
}

/**
 * Returns true when the serialized text has enough filled modules to be worth
 * sending to the skill for enrichment (≥3 non-empty modules).
 * Below this threshold the local parse was too sparse — better to send raw.
 */
export function isContextRichEnough(ctx: PromptContext): boolean {
  let filled = 0;
  for (const { key } of MODULE_ORDER) {
    const mod = ctx[key] as PromptModule | undefined;
    if (mod?.value?.trim()) filled++;
  }
  return filled >= 3;
}
