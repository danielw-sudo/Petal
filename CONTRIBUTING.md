# Contributing to PetalGen

Thank you for your interest in PetalGen! This project promotes [Pollinations.ai](https://pollinations.ai) through structured prompt engineering tools.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Copy config templates:
   ```bash
   cp wrangler.toml.example wrangler.toml
   cp .env.example .env
   ```
4. Fill in your Cloudflare account ID, D1 database ID, and Pollinations API key
5. Install dependencies: `npm install`
6. Bootstrap local D1: `npm run db:bootstrap`
7. Run locally: `npm run build && npm run pages:dev`

## Development Notes

- **No UI framework** — vanilla JS in Astro `<script>` blocks. Keep it lightweight.
- **File size limits** — TypeScript files should stay under 200 lines, Astro under 500.
- **Z-Image parameters are fixed** — `guidance_scale=0.0` and `steps=9` are source-confirmed by Pollinations. Do not change these.
- **Test against deployed URL** — local dev has no R2 data and no remote D1 rows. Library and Token Factory will appear empty locally.

## Pull Requests

- One feature or fix per PR
- Keep changes focused — don't bundle unrelated changes
- Test the full flow: refactor a prompt, edit modules, generate an image, save to gallery
- Describe what changed and why in the PR description

## What We Welcome

- Bug fixes
- New model integrations (add to compiler.ts + selects)
- Token seed data improvements (002_seed_tokens.sql)
- Accessibility improvements
- i18n contributions (README translations)
- Documentation improvements

## What We Don't Accept

- Changes to the Pollinations API contract or auth flow
- Removing Pollinations.ai attribution (required by community guidelines)
- Adding npm UI frameworks (React, Vue, etc.)
- Features that require server-side state beyond D1/R2

## Rebranding for Your Own Deployment

If you fork PetalGen for your own use:
- Update `Footer.astro` with your own author credit
- Replace favicon assets in `public/icons/` and `src/assets/`
- Update `site.webmanifest` with your app name
- Set your own `R2_PUBLIC_URL` in `wrangler.toml`
- Update the `og:url` and `og:image` meta tags in `src/pages/index.astro`, `src/pages/factory.astro`, and `src/pages/library.astro` — they currently point to the live demo at `petalgen.tools4all.ai`

The MIT license permits this. We only ask that you keep the Pollinations.ai attribution as a courtesy to the AI provider powering the tool.

## Questions?

Open an issue on the repository. For Pollinations.ai-specific questions, visit [pollinations.ai](https://pollinations.ai).
