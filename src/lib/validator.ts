import type { PromptContext, PromptModule } from "../types/prompt";

function createEmptyModule(id: string, label: string, weight: number): PromptModule {
  return {
    id,
    label,
    value: "",
    locked: false,
    weight,
    alternatives: []
  };
}

export function validateAndRepairContext(parsed: any, originalRaw: string): PromptContext {
  const schemaVersion = parsed?.metadata?.schemaVersion || "2026.05.26";
  const targetModel = parsed?.metadata?.targetModel || "zimage";

  return {
    subject: parsed?.subject || createEmptyModule("subject", "Subject", 1.0),
    style: parsed?.style || createEmptyModule("style", "Art Style", 0.9),
    medium: parsed?.medium || createEmptyModule("medium", "Medium", 0.8),
    lighting: parsed?.lighting || createEmptyModule("lighting", "Lighting", 0.7),
    mood: parsed?.mood || createEmptyModule("mood", "Mood", 0.6),
    composition: parsed?.composition || createEmptyModule("composition", "Composition", 0.5),
    color: parsed?.color || createEmptyModule("color", "Color Palette", 0.4),
    technical: parsed?.technical || createEmptyModule("technical", "Technical Specs", 0.2),
    negative: parsed?.negative || createEmptyModule("negative", "Negative Prompt", 0.1),
    raw: originalRaw,
    metadata: {
      schemaVersion,
      targetModel,
      createdAt: parsed?.metadata?.createdAt || new Date().toISOString(),
      remixCount: parsed?.metadata?.remixCount || 0
    }
  };
}

export function parseRawTextToContextFallback(raw: string): PromptContext {
  const parts = raw.split(",").map(p => p.trim()).filter(Boolean);

  const context = validateAndRepairContext(null, raw);

  if (parts.length > 0) {
    context.subject.value = parts[0];
    context.subject.alternatives = [parts[0], `${parts[0]} closeup`, `high detail ${parts[0]}`];
  }

  // Simple heuristic router for remaining parts
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const lower = part.toLowerCase();

    if (lower.includes("avoid") || lower.includes("ugly") || lower.includes("no ") || lower.includes("bad")) {
      if (context.negative) context.negative.value = context.negative.value ? `${context.negative.value}, ${part}` : part;
    } else if (lower.includes("light") || lower.includes("glow") || lower.includes("shadow")) {
      context.lighting.value = context.lighting.value ? `${context.lighting.value}, ${part}` : part;
    } else if (lower.includes("shot") || lower.includes("angle") || lower.includes("view") || lower.includes("lens")) {
      context.composition.value = context.composition.value ? `${context.composition.value}, ${part}` : part;
    } else if (lower.includes("render") || lower.includes("resolution") || lower.includes("4k") || lower.includes("8k") || lower.includes("engine")) {
      context.technical.value = context.technical.value ? `${context.technical.value}, ${part}` : part;
    } else if (lower.includes("painting") || lower.includes("photo") || lower.includes("sketch") || lower.includes("illustration")) {
      if (context.medium) context.medium.value = context.medium.value ? `${context.medium.value}, ${part}` : part;
      else context.style.value = context.style.value ? `${context.style.value}, ${part}` : part;
    } else if (lower.includes("cyberpunk") || lower.includes("retro") || lower.includes("surreal") || lower.includes("modern") || lower.includes("vintage")) {
      context.style.value = context.style.value ? `${context.style.value}, ${part}` : part;
    } else if (lower.includes("blue") || lower.includes("red") || lower.includes("neon") || lower.includes("color") || lower.includes("monochrome")) {
      if (context.color) context.color.value = context.color.value ? `${context.color.value}, ${part}` : part;
      else context.style.value = context.style.value ? `${context.style.value}, ${part}` : part;
    } else if (lower.includes("happy") || lower.includes("dark") || lower.includes("mysterious") || lower.includes("gloomy") || lower.includes("cheerful")) {
      context.mood.value = context.mood.value ? `${context.mood.value}, ${part}` : part;
    } else {
      // Default grouping into style
      context.style.value = context.style.value ? `${context.style.value}, ${part}` : part;
    }
  }

  // Populate basic alternatives — only on fields that exist and have values
  const legacyModuleKeys = ["style", "lighting", "mood", "composition", "technical",
    "medium", "color", "negative"] as const;
  for (const cat of legacyModuleKeys) {
    const mod = context[cat] as import("../types/prompt").PromptModule | undefined;
    if (mod?.value) {
      mod.alternatives = [mod.value, `modified ${mod.value}`, `alternative ${mod.value}`];
    }
  }

  return context;
}

// Strip shell-escape artifacts that appear when JSON is copied from terminals or
// chat messages: trailing \ line-continuations, \[ \] escaped brackets, \, commas.
// These are not valid JSON escapes and cause JSON.parse to throw.
function stripShellEscapes(text: string): string {
  return text
    .replace(/\\[ \t]*\r?\n/g, "\n")   // \ at end of line (line continuation) → newline
    .replace(/\\(\[)/g, "[")            // \[ → [
    .replace(/\\(\])/g, "]")            // \] → ]
    .replace(/\\(,)/g, ",")             // \, → ,
    .replace(/\\\s*$/gm, "");           // trailing \ on any line
}

export function sanitizeInput(text: string): string {
  if (!text) return "";
  // Strip script tags
  let sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Strip inline event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*(['"])(.*?)\1/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]+/gi, "");
  // Strip javascript: protocol links
  sanitized = sanitized.replace(/javascript:/gi, "");
  return sanitized;
}

export function tryLocalParse(raw: string): PromptContext | null {
  const sanitized = sanitizeInput(raw).trim();
  if (!sanitized) return null;

  // 1. Try JSON Parse
  // Attempt raw parse first; if it fails, strip shell-escape artifacts (\[ \] \,
  // trailing \) that appear when JSON is copied from terminals or chat messages.
  if (sanitized.startsWith("{") && sanitized.endsWith("}")) {
    const candidates = [sanitized, stripShellEscapes(sanitized)];
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);

        // 1a. Already a PromptContext (has .value fields at top level)
        if (parsed.subject && typeof parsed.subject === "object" && "value" in parsed.subject) {
          return validateAndRepairContext(parsed, raw);
        }

        // 1b. Rich nested JSON (objects/arrays as values)
        const hasNestedValues = Object.values(parsed).some(
          v => typeof v === "object" && v !== null
        );
        if (hasNestedValues) {
          const context = validateAndRepairContext(null, raw);
          mapNestedJsonToContext(parsed, context);
          return context;
        }

        // 1c. Flat key-value JSON (all primitive string values)
        const context = validateAndRepairContext(null, raw);
        mapFlatKeysToContext(parsed, context);
        return context;
      } catch (e) {
        // try next candidate
      }
    }
    // Both parse attempts failed — fall through to YAML/section-header paths
  }

  // 2. Try YAML / Key-Value Parse
  const lines = sanitized.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    let keyValueCount = 0;
    const kvPairs: Array<{ key: string; value: string }> = [];

    for (const line of lines) {
      const match = line.match(/^([A-Za-z0-9 _-]+)(?::|\s+['"])\s*(.*?)\s*['"]?$/);
      if (match) {
        keyValueCount++;
        kvPairs.push({ key: match[1].trim(), value: match[2].trim() });
      } else {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0 && colonIndex < 35) {
          keyValueCount++;
          kvPairs.push({
            key: line.slice(0, colonIndex).trim(),
            value: line.slice(colonIndex + 1).trim()
          });
        }
      }
    }

    // If at least 40% of the lines are key-value entries, treat it as YAML/Key-value structure
    if (keyValueCount >= Math.max(2, lines.length * 0.4)) {
      const context = validateAndRepairContext(null, raw);
      const flatObj: Record<string, string> = {};
      for (const pair of kvPairs) {
        flatObj[pair.key] = pair.value;
      }
      mapFlatKeysToContext(flatObj, context);
      return context;
    }
  }

  // 3. Section-header format: ALL CAPS TITLE: followed by paragraph content
  // Handles prompts like "SUBJECT:\nA woman...\n\nLIGHTING:\nGolden hour..."
  const sectionHeaderRe = /^[A-Z][A-Z\s&\/\-]{2,}:/m;
  if (sectionHeaderRe.test(sanitized)) {
    const sectionRe = /^([A-Z][A-Z\s&\/\-]{2,}):\s*\n?([\s\S]*?)(?=\n[A-Z][A-Z\s&\/\-]{2,}:|\s*$)/gm;
    const sections: Record<string, string> = {};
    let match;
    while ((match = sectionRe.exec(sanitized)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/\n+/g, " ");
      if (value) sections[key] = value;
    }
    if (Object.keys(sections).length >= 2) {
      const ctx = validateAndRepairContext(null, raw);
      for (const [key, value] of Object.entries(sections)) {
        const k = key.toLowerCase();
        if (/subject|character|person|face composition|face|body structure|skin|hair/.test(k)) {
          ctx.subject.value = ctx.subject.value ? `${ctx.subject.value}. ${value}` : value;
        } else if (/clothing|outfit|dress|wear|attire|accessories|lower clothing/.test(k)) {
          if (!ctx.clothing) ctx.clothing = createEmptyModule("clothing", "Clothing & Accessories", 0.95);
          ctx.clothing.value = ctx.clothing.value ? `${ctx.clothing.value}. ${value}` : value;
        } else if (/scene|background|setting|environment|location|visual philosophy/.test(k)) {
          if (!ctx.scene) ctx.scene = createEmptyModule("scene", "Scene & Background", 0.85);
          ctx.scene.value = ctx.scene.value ? `${ctx.scene.value}. ${value}` : value;
        } else if (/pose|position|body language|action/.test(k)) {
          if (!ctx.pose) ctx.pose = createEmptyModule("pose", "Pose & Activity", 0.8);
          ctx.pose.value = ctx.pose.value ? `${ctx.pose.value}. ${value}` : value;
        } else if (/lighting|light|illumination/.test(k)) {
          ctx.lighting.value = ctx.lighting.value ? `${ctx.lighting.value}. ${value}` : value;
        } else if (/composition|framing|crop|angle/.test(k)) {
          ctx.composition.value = ctx.composition.value ? `${ctx.composition.value}. ${value}` : value;
        } else if (/camera|technical|specs|lens|sensor/.test(k)) {
          ctx.technical.value = ctx.technical.value ? `${ctx.technical.value}. ${value}` : value;
        } else if (/color|palette|tone/.test(k)) {
          ctx.style.value = ctx.style.value ? `${ctx.style.value}. ${value}` : value;
        } else if (/mood|vibe|feeling|atmosphere|result|goal|philosophy/.test(k)) {
          ctx.mood.value = ctx.mood.value ? `${ctx.mood.value}. ${value}` : value;
        } else if (/texture|detail|quality/.test(k)) {
          ctx.technical.value = ctx.technical.value ? `${ctx.technical.value}. ${value}` : value;
        } else {
          // Append unmatched sections to subject
          ctx.subject.value = ctx.subject.value ? `${ctx.subject.value}. ${value}` : value;
        }
      }
      return ctx;
    }
  }

  return null;
}

// Recursively flatten any JSON value to a readable string
function flattenToString(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(flattenToString).filter(Boolean).join(", ");
  if (typeof val === "object") {
    return Object.values(val).map(flattenToString).filter(Boolean).join(", ");
  }
  return "";
}

// Map rich nested JSON (objects/arrays per key) into PromptContext modules
function mapNestedJsonToContext(parsed: Record<string, any>, context: PromptContext) {
  for (const [rawKey, rawVal] of Object.entries(parsed)) {
    const key = rawKey.toLowerCase().replace(/[_\s-]+/g, "");

    // Skip pure instruction/meta keys
    if (/^(objective|goal|task|instruction|overview|request)$/.test(key)) continue;

    if (typeof rawVal === "object" && rawVal !== null && !Array.isArray(rawVal)) {
      // Route nested object by top-level key, then handle sub-keys
      if (/subject|character|person|model|identity/.test(key)) {
        for (const [sk, sv] of Object.entries(rawVal)) {
          const skey = sk.toLowerCase();
          const sval = flattenToString(sv);
          if (!sval) continue;
          if (/outfit|wear|cloth|dress|attire|accessor|jewel/.test(skey)) {
            if (!context.clothing) context.clothing = createEmptyModule("clothing", "Clothing & Accessories", 0.95);
            context.clothing.value = context.clothing.value ? `${context.clothing.value}. ${sval}` : sval;
          } else if (/pose|action|position|gesture|body/.test(skey)) {
            if (!context.pose) context.pose = createEmptyModule("pose", "Pose & Activity", 0.8);
            context.pose.value = context.pose.value ? `${context.pose.value}. ${sval}` : sval;
          } else {
            context.subject.value = context.subject.value ? `${context.subject.value}. ${sval}` : sval;
          }
        }
      } else if (/environment|scene|background|location|setting|place/.test(key)) {
        if (!context.scene) context.scene = createEmptyModule("scene", "Scene & Background", 0.85);
        const sv = flattenToString(rawVal);
        context.scene.value = context.scene.value ? `${context.scene.value}. ${sv}` : sv;
      } else if (/camera|composition|layout|grid|framing/.test(key)) {
        for (const [sk, sv] of Object.entries(rawVal)) {
          const skey = sk.toLowerCase();
          const sval = flattenToString(sv);
          if (!sval) continue;
          if (/quality|grain|noise|blur|imperfect|exposure/.test(skey)) {
            context.technical.value = context.technical.value ? `${context.technical.value}, ${sval}` : sval;
          } else if (/angle|frame|selfie|shot/.test(skey)) {
            context.composition.value = context.composition.value ? `${context.composition.value}, ${sval}` : sval;
          } else if (/type|layout|grid/.test(skey)) {
            context.composition.value = context.composition.value ? `${context.composition.value}. ${sval}` : sval;
          } else {
            context.composition.value = context.composition.value ? `${context.composition.value}, ${sval}` : sval;
          }
        }
      } else if (/lighting|light|illumination/.test(key)) {
        const sv = flattenToString(rawVal);
        context.lighting.value = context.lighting.value ? `${context.lighting.value}. ${sv}` : sv;
      } else if (/style|aesthetic/.test(key)) {
        for (const [sk, sv] of Object.entries(rawVal)) {
          const skey = sk.toLowerCase();
          const sval = flattenToString(sv);
          if (!sval) continue;
          if (/mood|vibe|feel|atmosphere/.test(skey)) {
            context.mood.value = context.mood.value ? `${context.mood.value}, ${sval}` : sval;
          } else {
            context.style.value = context.style.value ? `${context.style.value}. ${sval}` : sval;
          }
        }
      } else if (/music|overlay|player|audio/.test(key)) {
        // UI overlay instruction — lands in technical as a rendering note
        const sv = flattenToString(rawVal);
        const note = `Music overlay: ${sv}`;
        context.technical.value = context.technical.value ? `${context.technical.value}. ${note}` : note;
      } else {
        // Fallback: flatten and route by value content
        const sv = flattenToString(rawVal);
        if (sv) routeValueToContext(rawKey, sv, context);
      }
    } else {
      // Primitive or top-level array
      const sv = flattenToString(rawVal);
      if (!sv) continue;
      if (/negative|avoid|exclude|donot|without/.test(key)) {
        if (!context.constraints) context.constraints = createEmptyModule("constraints", "Constraints", 0.1);
        context.constraints.value = context.constraints.value ? `${context.constraints.value}, ${sv}` : sv;
      } else {
        mapFlatKeysToContext({ [rawKey]: sv }, context);
      }
    }
  }

  // Populate alternatives for every filled module
  const moduleKeys = ["subject", "clothing", "scene", "pose", "lighting", "composition",
    "style", "mood", "technical", "constraints"] as const;
  for (const cat of moduleKeys) {
    const mod = context[cat] as import("../types/prompt").PromptModule | undefined;
    if (mod?.value) {
      mod.alternatives = [mod.value, `modified ${mod.value}`, `alternative ${mod.value}`];
    }
  }
}

function mapFlatKeysToContext(flat: Record<string, any>, context: PromptContext) {
  const keys = Object.keys(flat);
  for (const k of keys) {
    const val = String(flat[k] || "").trim();
    if (!val) continue;

    const lowerKey = k.toLowerCase();

    if (matchKey(lowerKey, ["subject", "character", "foreground", "prompt"])) {
      context.subject.value = val;
    } else if (matchKey(lowerKey, ["style", "art style", "artistic"])) {
      context.style.value = val;
    } else if (matchKey(lowerKey, ["medium", "format", "material", "type"])) {
      if (context.medium) context.medium.value = val;
      else context.style.value = val;
    } else if (matchKey(lowerKey, ["lighting", "light", "illumination"])) {
      context.lighting.value = val;
    } else if (matchKey(lowerKey, ["mood", "feeling", "atmosphere"])) {
      context.mood.value = val;
    } else if (matchKey(lowerKey, ["composition", "camera", "shot", "angle", "view", "ratio"])) {
      context.composition.value = val;
    } else if (matchKey(lowerKey, ["color", "palette", "colors"])) {
      if (context.color) context.color.value = val;
      else context.style.value = context.style.value ? `${context.style.value}, ${val}` : val;
    } else if (matchKey(lowerKey, ["technical", "render", "resolution", "equipment", "hardware", "specs", "quality"])) {
      context.technical.value = val;
    } else if (matchKey(lowerKey, ["negative", "avoid", "exclude", "no"])) {
      if (context.negative) context.negative.value = val;
      else if (context.constraints) context.constraints.value = val;
    } else {
      routeValueToContext(k, val, context);
    }
  }

  const moduleKeys = ["subject", "style", "lighting", "mood", "composition", "technical",
    "medium", "color", "negative"] as const;
  for (const cat of moduleKeys) {
    const mod = context[cat] as import("../types/prompt").PromptModule | undefined;
    if (mod?.value) {
      mod.alternatives = [
        mod.value,
        `modified ${mod.value}`,
        `alternative ${mod.value}`
      ];
    }
  }
}

function matchKey(key: string, patterns: string[]): boolean {
  return patterns.some(p => key.includes(p) || p.includes(key));
}

function routeValueToContext(key: string, val: string, context: PromptContext) {
  const lowerVal = val.toLowerCase();
  if (lowerVal.includes("avoid") || lowerVal.includes("no ") || lowerVal.includes("ugly") || lowerVal.includes("bad")) {
    if (context.negative) context.negative.value = context.negative.value ? `${context.negative.value}, ${val}` : val;
    else if (context.constraints) context.constraints.value = context.constraints.value ? `${context.constraints.value}, ${val}` : val;
  } else if (lowerVal.includes("light") || lowerVal.includes("shadow") || lowerVal.includes("glow")) {
    context.lighting.value = context.lighting.value ? `${context.lighting.value}, ${val}` : val;
  } else if (lowerVal.includes("shot") || lowerVal.includes("angle") || lowerVal.includes("view") || lowerVal.includes("lens") || lowerVal.includes("ratio")) {
    context.composition.value = context.composition.value ? `${context.composition.value}, ${val}` : val;
  } else if (lowerVal.includes("render") || lowerVal.includes("resolution") || lowerVal.includes("4k") || lowerVal.includes("8k") || lowerVal.includes("equipment")) {
    context.technical.value = context.technical.value ? `${context.technical.value}, ${val}` : val;
  } else {
    if (!context.subject.value) {
      context.subject.value = `${key}: ${val}`;
    } else {
      context.technical.value = context.technical.value ? `${context.technical.value}, ${key}: ${val}` : `${key}: ${val}`;
    }
  }
}
