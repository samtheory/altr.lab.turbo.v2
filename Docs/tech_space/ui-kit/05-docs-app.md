---
title: "apps/apolyx — Apolyx docs app"
description: "As-built MDX docs site for Apolyx-S0001: shell, previews, InstallTabs, registry at /r"
created: 2026-10-11
updated: 2026-10-14
tags:
  - tech-space
  - ui-kit
  - apolyx
  - Apolyx-S0001
  - docs-app
  - mdx
---

# apps/apolyx — docs app

> Who: anyone editing docs content or the docs shell. Sprint **Apolyx-S0001** phase 9. Plan: [[../../plan/ui-kit/09-docs-app]].

## Stack

- Package `@altr/apolyx-docs`, Next.js 15 App Router, port **3004**
- `@next/mdx` + `remark-gfm` + `@shikijs/rehype` (github-light / github-dark; dark mode via `--shiki-dark` CSS)
- Workspace dep `@altr/apolyx`, `transpilePackages: ["@altr/apolyx"]`
- `prebuild` copies `elements/ui-kit/dist/r` → `public/r` (gitignored; regenerate on build)

## Shell

- Sticky header: logo, Docs / Components / Theming, search placeholder (disabled ⌘K), `ThemeFamilySwitcher`, `ThemeToggle`, GitHub link
- Left nav from `src/docs-config.ts` (groups + status badges); mobile drawer uses Apolyx `Dialog`
- Right “On this page” TOC from `##` headings in the MDX source
- Root layout: `ApolyxProvider` + `ApolyxThemeScript` + `TooltipProvider` + `Toaster`

## Docs building blocks

| Component | Role |
|-----------|------|
| `ComponentPreview` | Async: reads `src/demos/<name>.tsx`, highlights with Shiki, renders via client `PreviewTabs` |
| `InstallTabs` | pnpm / npm / yarn / bun CLI lines + monorepo import tab |
| `PropsTable` | Hand-written rows per page |
| `TokenTable` | Live swatches from `cssVariableTokens` for the active family × mode |

## Content

Catch-all `src/app/docs/[[...slug]]/page.tsx` → `src/content/docs/**/*.mdx` (38 static routes): introduction, installation, theming, CLI, primitives, 21 components, motion overview + 4 recipes, charts overview + line + bar. Every registry item’s `docs` field points at an existing page. The sprint closed with 37 routes and 20 components; Timeline was added on 2026-10-14 ([[06-timeline]]).

A page can hold several previews: `components/timeline.mdx` renders nine `ComponentPreview`s (one per layout or state), each backed by its own `src/demos/timeline-*.tsx` file registered in `src/demos/index.ts`.

Landing `/` shows a live Card + LineChart sample and the badge `Apolyx-S0001 · N components`, where N is counted from `docs-config.ts` (21 today).

## Screenshots (verify)

Saved under `Docs/report/assets/apolyx-s0001/`:

- `docs-home-default-light.png`
- `docs-button-default-light.png`
- `docs-home-power-blue-dark.png`
- `docs-button-power-blue-dark.png`

(CDP capture; `browser_take_screenshot` timed out in this environment.)
