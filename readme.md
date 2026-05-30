# PetalGen

**A prompt engineering tool for AI image generation, powered by [Pollinations.ai](https://pollinations.ai)**

**[→ Live Demo](https://petalgen.tools4all.ai)** · 🌐 [中文](README.zh.md) · [日本語](README.ja.md)

[![Built with Pollinations.ai](https://img.shields.io/badge/Built%20with-Pollinations-8a2be2?style=for-the-badge&logo=data:image/png;base64,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&logoColor=white&labelColor=6a0dad)](https://pollinations.ai)

---

## What this is (and what it isn't)

PetalGen is a **prompt parsing and testing tool**. You paste a monolithic AI image prompt — prose, JSON, or comma-separated — and it decomposes it into 10 named modules you can edit, lock, shuffle, and recombine. The built-in image generation exists to *validate* your prompt changes, not as a general-purpose image generator.

**Constraints to know up front:**

- The live demo runs on a **Pollinations.ai Seed tier** operator key (0.15 pollen/hour ≈ 75 images/hour with Z-Image Turbo). Unregistered users get **5 free generations per day**.
- **Z-Image Turbo is the default model — intentionally.** It is calibrated for the Seed tier: fast, low pollen cost, and reliable. Users with their own `pk_` key (BYOP) can switch to any model the operator has enabled. Self-deployers can unlock additional models from the admin panel.
- The **model list is curated by the operator**. On the live demo, only a few models are enabled. Forkers can unlock any Pollinations model via the admin panel.
- Image quality and speed depend entirely on the model you choose. Z-Image Turbo is fast and free-tier-friendly; GPT Image or Seedream are more capable but heavier on pollen.

If you want unlimited generations or access to more models, connect your own Pollinations key (see [BYOP](#bring-your-own-pollinations-key)).

---

## How to use it

### Workspace (`/`)

The core prompt engineering workflow:

1. **Paste** any image prompt into the input box — prose, JSON, or comma-separated
2. **Click the wand button** to decompose it into 11 modules: Subject, Clothing, Scene, Pose, Lighting, Composition, Style, Mood, Technical, Constraints, and **Reference Image**
3. **Edit** any module using the dropdown editor. Each module shows its current value and AI-generated alternatives
4. **Lock** modules you want to keep fixed across shuffles (click the lock icon)
5. **Shuffle** all unlocked modules at once with the 🎲 button
6. **Select** your model, aspect ratio, and optionally toggle Enhance
7. **Upload a reference image** (optional) — pick a file in the Reference Image panel to enable img2img. The instruction from the Reference Image module is automatically applied
8. **Generate** with ⚡ — the image renders in the viewport
9. **Save** to your Library with 💾 (opt-in, not automatic)

> **Z-Image Turbo note:** Uses fixed params `guidance_scale=0.0`, `steps=9`. Negative prompts are not forwarded — constraints are compiled into the positive string instead. This is intentional and source-confirmed.

> **Reference image note:** Uploaded images are resized to ≤1024px and re-encoded as JPEG in the browser before transmission. EXIF data is stripped client-side. The reference image and instruction are routed to Pollinations `/v1/images/edits`.
>
> **Model matters for img2img:** Most models (Z-Image Turbo, Flux, etc.) use the reference image loosely for style/composition. For **face and identity preservation**, use **Kontext** or **GPT Image** — the UI will warn you if your active model doesn't support it. Operators can enable these models via the admin panel.

### Token Factory (`/factory`)

Build prompts bottom-up from a harvested token library:

1. Browse the **Token Crate** (left panel) — categories like Subject, Style, Lighting, Scene, and **Reference Image**, each with frequency-ranked values from past generations
2. **Click any value chip** to slot it into your recipe — selecting a Reference Image value pre-fills the reference instruction
3. Use **Auto-fill** to randomly sample across all categories using frequency-weighted selection
4. Add a **Custom Token** for anything not in the database
5. **Upload a reference image** in the Generate panel — the panel auto-expands on file selection, showing the active instruction and strength control
6. Generate directly from the factory — same model/ratio controls as the Workspace

### Library (`/library`)

Images you explicitly saved, with full remix support:

- 4-column responsive masonry grid
- **📋 Copy** — copies the full compiled prompt to clipboard
- **⚡ Remix** — loads the prompt context back into the Workspace for further editing
- Saved images are stored in Cloudflare R2; metadata (prompt, model, dimensions) in D1

---

## Bring Your Own Pollinations Key

Connect a `pk_` publishable key to bypass the shared rate limit and use any model you want:

1. Get a key at **[enter.pollinations.ai](https://enter.pollinations.ai)**
2. Click **🔑 Free API key** in the header
3. Paste your `pk_` key — it's stored in your browser only, never on our servers

> **Key type matters:** Use `pk_` (publishable) keys in the browser. `sk_` (secret) keys should only be used server-side. PetalGen will warn you if you paste a secret key.

BYOP users bypass the 5/day rate limit entirely. Your pollen balance is billed directly to your Pollinations account.

---

## Deploy Your Own

Deploy your own instance with your own model list, operator key, and branding.

### Prerequisites

- [Cloudflare account](https://cloudflare.com) (free tier works)
- [Pollinations.ai API key](https://enter.pollinations.ai) — `sk_` for the server-side operator key
- Node.js 18+ and [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### 1. Clone and install

```bash
git clone https://github.com/your-fork/petalgen
cd petalgen
npm install
```

### 2. Create Cloudflare resources

```bash
# D1 database — stores prompt logs, tokens, library, model registry
npx wrangler d1 create PETALGEN_DB
# Paste the returned database_id into wrangler.toml

# R2 bucket — stores generated images
npx wrangler r2 bucket create petalgen-images
# Configure a public custom domain on the bucket in the CF dashboard
# Update R2_PUBLIC_URL in wrangler.toml with that domain
```

### 3. Update `wrangler.toml`

```toml
[[d1_databases]]
binding = "D1_DATABASE"
database_name = "PETALGEN_DB"
database_id = "YOUR_D1_ID_HERE"

[[r2_buckets]]
binding = "R2_IMAGES"
bucket_name = "petalgen-images"

[vars]
R2_PUBLIC_URL = "https://your-r2-domain.example.com"
```

### 4. Run migrations

```bash
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/001_saved_images.sql
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/002_seed_tokens.sql
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/003_enabled_models.sql
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/004_text_models.sql
```

Migration 003 seeds 21 image models (4 enabled by default: Z-Image Turbo, Flux, Nano Banana Pro, Grok Imagine). Migration 004 seeds 14 text models (Llama Scout enabled — used for prompt refactoring). Enable more models via the admin panel after deploy.

### 5. Set secrets

```bash
# Your Pollinations operator key (sk_ is correct here — server-side only)
npx wrangler secret put POLLINATIONS_API_KEY

# Admin panel password — protects /admin
npx wrangler secret put ADMIN_SECRET
```

Alternatively, set both in the Cloudflare dashboard: **Workers & Pages → your-worker → Settings → Variables and Secrets**.

### 6. Build and deploy

```bash
npm run build
npx wrangler deploy
```

### 7. Configure models via admin

Visit `/admin` on your deployed URL and sign in with your `ADMIN_SECRET`.

- **Models tab**: toggle which image and text models users can access. Click **↺ Sync from Pollinations** to pull the latest model list.
- **Library tab**: view and delete saved images (removes from both D1 and R2).
- **Rate Limits tab**: view active rate limits and clear individual IPs.

Enabling a model makes it available in the Workspace and Factory model selectors immediately (cached for 5 minutes).

---

## Local Development

```bash
# Copy and fill in your keys
cp .dev.vars.example .dev.vars

# Build and run with full Workers runtime
npm run build
npm run pages:dev
```

> Local dev uses an isolated D1 instance. Library and Token Factory will be empty until you seed them. Test end-to-end features against a deployed URL.
>
> **Admin panel locally:** add `ADMIN_SECRET=any-local-value` to your `.dev.vars`, then visit `/admin` on your local dev URL.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro v6 (SSR + static hybrid) |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) — prompt logs, tokens, library, model registry |
| Storage | Cloudflare R2 — generated images |
| Language | TypeScript |
| AI Backend | Pollinations.ai — image generation + LLM prompt refactoring |
| Styling | Flat Warm Pixel theme — IBM Plex Mono / Inter / Press Start 2P |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed — fork freely.

---

## Attribution

Built on [Pollinations.ai](https://pollinations.ai) — free, open AI generation infrastructure.
Prompt refactoring via Llama Scout (Pollinations text API).
