# AGENTS.md — AI Agent Context for PetalGen

> This file provides structured context for AI coding agents (Claude Code, Cursor, Copilot, etc.) working on this project. Human developers: see README.md instead.

---

## Project Summary

PetalGen is a modular AI prompt refactoring engine. Users paste monolithic image prompts, the system decomposes them into 10 structured modules, then users edit/shuffle/lock modules and generate validation images — all serverless on Cloudflare.

**Goal**: Promote Pollinations.ai by demonstrating structured prompt engineering. Users bring their own Pollinations API key (BYOP).

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro v6 (SSR + static hybrid) |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| AI Backend | Pollinations.ai (image gen + LLM refactoring) |
| Language | TypeScript |
| Styling | CSS custom properties, no framework |

---

## Architecture

### Pages (3 + 1 redirect + 1 static)

| Route | File | Rendering | Purpose |
|---|---|---|---|
| `/` | `src/pages/index.astro` | SSR | Workspace — paste, refactor, edit, generate |
| `/factory` | `src/pages/factory.astro` | SSR | Token Crate — browse tokens, compose recipes |
| `/library` | `src/pages/library.astro` | SSR | Gallery — saved images with copy/remix |
| `/trends` | `src/pages/trends.astro` | SSR | 301 redirect to `/factory` |
| `/policy` | `src/pages/policy.astro` | Static | Terms of Use and Privacy |

### API Routes

| Endpoint | File | Purpose |
|---|---|---|
| `POST /api/refactor` | `src/pages/api/refactor.ts` | LLM prompt decomposition (parse or enrich mode) |
| `POST /api/generate` | `src/pages/api/generate.ts` | Image generation via Pollinations, R2 upload |
| `POST /api/save` | `src/pages/api/save.ts` | Opt-in save to Library (D1 saved_images) |

### Refactoring Pipeline: Script to Hook to Skill

1. **Script** (`src/lib/validator.ts` tryLocalParse): Deterministic client-side parsing — handles JSON, YAML/KV, section-header formats. Strips shell escapes.
2. **Hook** (`src/lib/serializer.ts` isContextRichEnough): If script fills 3+ modules, serializes to flat "Label: value" text.
3. **Skill** (`/api/refactor`): LLM (llama-scout via Pollinations) enriches the parsed modules or does full extraction from raw text.

### Prompt Compilation

`src/lib/compiler.ts` compiles PromptContext to a prompt string, dispatching per model:
- **Z-Image Turbo**: positive-only, constraints inlined, "adult" injection for human subjects, no negative_prompt
- **Flux**: sentence-separated, negative_prompt supported
- **Default**: weight-sorted, comma-joined fallback

### 10-Module Schema

Defined in `src/types/prompt.ts`. The PromptContext interface has these modules:
`subject`, `clothing`, `scene`, `pose`, `lighting`, `composition`, `style`, `mood`, `technical`, `constraints`

Each module: `{ id, label, value, locked, weight, alternatives, enabled? }`

Legacy fields (`medium`, `color`, `negative`) kept for backward compatibility.

---

## Key Files

```
src/
  types/prompt.ts          # PromptContext, PromptModule interfaces
  lib/
    compiler.ts            # Model-aware prompt compiler
    reconstructor.ts       # Shim calling compiler
    validator.ts           # tryLocalParse, input sanitization
    serializer.ts          # Context to flat text, richness gate
    r2.ts                  # R2 upload helpers
  api.ts                   # Client-side fetch helpers
  pages/
    api/generate.ts        # POST — Pollinations proxy, R2 upload
    api/refactor.ts        # POST — LLM refactoring
    api/save.ts            # POST — opt-in Library save
    index.astro            # Workspace page
    factory.astro          # Token Factory page
    library.astro          # Library page
  components/
    Header.astro           # Shared nav with slot
    Footer.astro           # Attribution footer
    PromptInput.astro      # Refactor input + pipeline trigger
    ModulePanel.astro      # 10-module dropdown editor
    ImageResult.astro      # Model selector, viewport, save/download
  styles/global.css        # Design system tokens + base styles
workers/
  harvester.ts             # D1 prompt logging + token harvesting
  rate-limiter.ts          # IP-based rate limiting via D1
migrations/
  001_saved_images.sql     # saved_images table
  002_seed_tokens.sql      # 702-row frequency-weighted seed data
schema.sql                 # Combined bootstrap schema
```

---

## Conventions

- **No npm UI framework** — vanilla JS in script tags within Astro components
- **CSS variables** defined in `global.css` — `--bg-page`, `--accent-violet`, `--font-display`, etc.
- **Font stack**: `Press Start 2P` (display), `Inter` (body)
- **File limits**: 200 lines TS max, 500 lines HTML/Astro max
- **Cloudflare bindings** accessed via `import { env } from "cloudflare:workers"`
- **Rate limiting**: 5 free generations/24h per IP. BYOP key bypasses limits.
- **Z-Image parameters**: `guidance_scale=0.0`, `steps=9` (fixed, source-confirmed). Do NOT change these.

---

## What NOT to Change

- Pollinations API contract (URL structure, auth headers)
- Z-Image Turbo parameters (guidance, steps) — source-confirmed values
- Module IDs in `prompt.ts` — downstream code depends on exact string keys
- The BYOP (Bring Your Own Pollinations key) auth flow

---

## Deployment

```bash
npm install
npm run build
npx wrangler deploy
```

Secrets: `npx wrangler secret put POLLINATIONS_API_KEY`

D1 bootstrap: `npx wrangler d1 execute PETALGEN_DB --remote --file=schema.sql`

---

## Token Seed Strategy

The Token Factory is bootstrapped from curated prompt data in `migrations/002_seed_tokens.sql` (702 rows). Frequency weighting is achieved by inserting duplicate rows — the weighted random sampler counts occurrences. The original curated corpus used to generate this seed data is kept in `src/lib/corpus.ts` for reference (not used at runtime).

---

## Customization Notes (for forks)

- **Branding**: Update `Footer.astro` (author link), favicon assets in `src/assets/`, `site.webmanifest`
- **Rate limit**: Change `limit` constant in `workers/rate-limiter.ts`
- **Models**: Add options to selects in `ImageResult.astro` and `factory.astro`, add compiler case in `compiler.ts`
- **Token seed data**: `migrations/002_seed_tokens.sql` — replace or extend with your own curated prompts
