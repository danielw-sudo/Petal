# PetalGen — Product Roadmap

**Live**: `https://petalgen.tools4all.ai`

---

## Why PetalGen

Most AI image generators are black boxes. Users type a prompt, get an image, and don't know why it worked or failed. PetalGen makes prompt structure visible — decompose, edit, understand, remix.

The vehicle is Pollinations.ai: an open, free-tier-generous platform that most users don't know how to get the most out of. PetalGen is the best showcase and onramp to that ecosystem.

**Competitive position:** structured prompt engineering, not just generation. No comparable open-source tool targets this niche on the Pollinations platform. The Token Factory and self-evolving token pipeline (Milestone 5) are the only features that create a data moat — the longer PetalGen runs, the better the suggestions get.

---

## Milestone 1: Working Demo — DONE

A functional 3-page app deployed on Cloudflare proving the core loop.

- [x] Workspace: paste, refactor, edit modules, generate
- [x] Token Factory: browse harvested tokens, compose recipes, generate
- [x] Library: saved images gallery with copy/remix
- [x] Model-aware compiler (Z-Image, Flux, default)
- [x] R2 image storage + opt-in gallery save
- [x] Rate limiting (5 free/day, BYOP bypasses)
- [x] BYOP auth flow (localStorage, Bearer header)
- [x] Compliance (ToU modal, privacy policy, attribution)
- [x] Cloudflare deployment (D1, R2, Workers, custom domain)

---

## Milestone 2: Full Pollinations Integration — IN PROGRESS

**Why this before public release:** Shipping with hardcoded model selectors means every new Pollinations model requires a code change. The dynamic registry is the foundation everything else sits on — key type validation, img2img, balance display all follow from it. Ship the infrastructure now while the codebase is small and the coupling is clean.

### Goals

1. **Dynamic model registry** — fetch available models live from Pollinations. Operator controls which appear via an allow-list in D1.
2. **Admin panel** — operator dashboard for model management, library moderation, prompt log review, and rate limit oversight. Protected by Cloudflare Zero Trust (no app-level auth code).
3. **Key type awareness** — distinguish `pk_` (publishable, client-safe) vs `sk_` (secret, server-only). Warn users who paste `sk_` keys in the browser.
4. **img2img support** — reference image input for models that support it (kontext, gptimage, seedream, klein, nanobanana).
5. **Balance visibility** — show BYOP users their remaining Pollen balance in the header.
6. **Safety controls** — expose Pollinations `safe` parameter. Operator sets default, users optionally override.

### Success Criteria

- Model selectors populate from live API, filtered by operator allow-list
- Admin panel functional behind Zero Trust with all four management sections
- No hardcoded model strings in user-facing code
- BYOP flow validates key type and warns for `sk_` keys

---

## Milestone 3: Public Release

Ship a clean public repo to the Pollinations.ai community. One codebase — the public version IS the product.

### Goals

1. **README as storefront** — clear value prop, live demo link, BYOP promotion, deploy-your-own instructions
2. **i18n** — Chinese (`README.zh.md`) and Japanese (`README.ja.md`) translations
3. **Social sharing** — OG meta tags (`og:image`, `og:title`, `twitter:card`)
4. **Clean export** — no personal data, no leaked credentials, no dead code in the tree
5. **Operator customization guide** — rebrand, configure models, set up Zero Trust, seed tokens

### Success Criteria

- A stranger can fork, `npm install`, add their Pollinations key, deploy to Cloudflare, and have a working instance
- README communicates what PetalGen does in under 30 seconds
- No personal data in any committed file

---

## Milestone 4: Pollinations Community Submission

Submit public repo + live demo to pollinations.ai for community listing.

### Goals

1. Meet Pollinations community guidelines and attribution requirements
2. Reference the MCP server (`npx @pollinations_ai/mcp`) as a companion tool in README
3. Demonstrate BYOP flow as a model for other community projects

### Success Criteria

- Accepted and listed as a community project on pollinations.ai

---

## Milestone 5: Advanced Features (Future)

Evaluated after public release based on adoption signals.

- **Self-evolving tokens** — cron pipeline that analyzes harvested prompt logs to refine Token Factory weights. This is the only feature with compounding value: the longer PetalGen runs, the better the token suggestions get. Prioritize if usage data looks interesting post-launch.
- **Audio generation** — Pollinations TTS via `/audio/{text}` and `/v1/audio/speech`. 6 OpenAI voices + 30+ ElevenLabs voices. Natural extension: prompt → image → narration. Model: `tts-1`.
- **Video generation** — `seedance`, `seedance-pro`, `veo` (alpha), `wan`, `wan-pro`. Keyframe support (pass start/end images for transitions). Duration, aspect ratio params.
- **Tool suite** — OG Image Maker, Pixel Art Illustrator, Favicon Maker (Z-Image specialized tools under `/tools/*`)
- **Auth + user accounts** — Clerk or Pollinations OIDC, saved workspaces, generation history
- **SaaS tier** — billing, usage quotas, team features

---

## Constraints (All Milestones)

- No npm UI frameworks — vanilla JS in Astro `<script>` blocks
- File limits: 200 lines TS, 500 lines Astro
- Z-Image params are source-confirmed and FIXED: `guidance_scale=0.0`, `steps=9`
- Pollinations attribution must be preserved in Footer.astro
- One codebase, operator-configured — no "lite" vs "full" fork split
