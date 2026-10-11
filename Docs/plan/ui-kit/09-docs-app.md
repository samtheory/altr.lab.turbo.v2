---
title: "Phase 9 — apps/apolyx docs site"
description: "Next.js + MDX docs app: shell, component pages with live preview + code + CLI line, theme switcher, /r registry JSON"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - docs-app
  - mdx
---

# Phase 9 — `apps/apolyx` docs site

> Who: apollo. The public face of the kit: content-first, calm, clearly Apolyx — not a dashboard.

Sprint index: [[README]] · Intent: [[../../feature_list/ui-kit/00-intent#Docs app expectations (`apps/apolyx`)]]

**Depends on:** phase 8 (CLI line + `/r/*.json`); can start the shell earlier · **Skills:** `frontend-design` (or `design-taste-frontend`) + `find-docs` (Next MDX)

## Tasks

### Scaffold

- [ ] `apps/apolyx`: Next.js App Router, TS, package `@altr/apolyx-docs`, port **3004**, workspace dep `@altr/apolyx`, `transpilePackages: ["@altr/apolyx"]`
- [ ] `@next/mdx` + `mdx-components.tsx`; syntax highlighting with `shiki` (rehype plugin, dual light / dark themes)
- [ ] `globals.css` imports `@altr/apolyx/globals.css`; root layout uses `ApolyxProvider` + `ApolyxThemeScript`
- [ ] Root script `"dev:apolyx": "turbo run dev --filter=@altr/apolyx-docs"`
- [ ] `prebuild`: copy `elements/ui-kit/dist/r/*.json` → `public/r/` (so `/r/button.json` is served)

### Shell

- [ ] Layout: top bar (logo, search placeholder, theme family switcher, mode toggle, GitHub link), left nav grouped by type (Foundations / Components / Motion / Charts), right "On this page" TOC, mobile drawer nav (built with Apolyx `Dialog`)
- [ ] Pages: `/` (landing: what Apolyx is, install line, a live composed sample), `/docs` (introduction), `/docs/installation` (monorepo import vs CLI), `/docs/theming` (families × modes, token table, customization ladder: tokens → variants → className → owned copy), `/docs/cli`
- [ ] Nav generated from a single `docs-config.ts` (title, slug, type, status)

### Docs building blocks

- [ ] `ComponentPreview`: renders a demo from `src/demos/<name>/*.tsx`, Preview / Code tabs, code read from the same demo file at build time (no duplicated snippets)
- [ ] `InstallTabs`: `npx apolyx add <name>` (pnpm / npm / yarn / bun) + "Monorepo: `import { X } from "@altr/apolyx"`"
- [ ] `PropsTable`: hand-written per page (typed object), not docgen, for v1
- [ ] `TokenTable`: reads `cssVariableTokens` and shows live swatches for the active theme

### Content

- [ ] MDX page per shipped item: overview, preview, install, usage, anatomy (parts), variants, tokens used, accessibility (keys + ARIA), props
- [ ] Pages for wave 1, wave 1b, motion recipes, charts
- [ ] Every page has a working demo and correct CLI line

## Verify

```bash
pnpm --filter @altr/apolyx build && pnpm --filter @altr/apolyx-docs build
pnpm dev:apolyx                              # http://localhost:3004
```

Manual (use `playwright-cli` or the browser): every nav link renders, theme family × mode switch updates previews, `/r/button.json` returns JSON, Lighthouse a11y ≥ 95 on `/docs/components/button`.

## Done when

- Docs app builds and serves an index of wave-1 components plus a page for each shipped item
- Theme switcher demos all 6 palettes
