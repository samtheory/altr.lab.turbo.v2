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

> Who: anyone editing docs content or the docs shell. Sprint **Apolyx-S0001** phase 9. Plan: [[../../plan/ui-kit/Apolyx-S0001/09-docs-app]].

## Stack

- Package `@altr/apolyx-docs`, Next.js 15 App Router, port **3004**
- `@next/mdx` + `remark-gfm` + `@shikijs/rehype` (github-light / github-dark; dark mode via `--shiki-dark` CSS)
- Workspace dep `@altr/apolyx`, `transpilePackages: ["@altr/apolyx"]`
- `prebuild` copies `elements/ui-kit/dist/r` → `public/r` (gitignored; regenerate on build)

## Shell

- Sticky header: logo, Docs / Components / Theming, search placeholder (disabled ⌘K), `ThemeFamilySwitcher`, `ThemeToggle`, GitHub link
- Left nav from `src/docs-config.ts` (groups + status badges); mobile drawer uses Apolyx `Dialog`. Behaviour in [[#Sidebar groups]]
- Right “On this page” TOC from `##` headings in the MDX source
- Root layout: `ApolyxProvider` + `ApolyxThemeScript` + `TooltipProvider` + `Toaster`

## Sidebar groups

Code: `src/components/site/sidebar-nav.tsx` (`SidebarNav` → one `SidebarGroup` per `docsConfig` entry). Added 2026-10-14. The desktop sidebar and the mobile drawer render the same component.

| Behaviour | How |
|-----------|-----|
| Collapsible | Group title is a `<button>` inside the `<h2>`, with `aria-expanded` and `aria-controls` pointing at the list region. Chevron turns −90° when closed |
| Open by default | Each group holds its own `useState(true)`. State survives client navigation (the layout stays mounted) and resets on a full reload; it is not persisted |
| Animation | Region animates `grid-template-rows` 0fr ↔ 1fr plus opacity (200 ms, ease-out); `motion-reduce:transition-none` turns it off |
| Closed links unreachable | Region gets `inert` when closed, so its links leave the tab order and the accessibility tree |
| Depth guide line | The `<ul>` has `border-l border-border` from first to last child. Each link draws a `before:` 1 px segment over that line: `bg-primary` when active, `foreground/40` on hover |
| Open background | Group wrapper gets `bg-muted/40` and `rounded-lg` while open, transparent when closed; also exposes `data-state="open" \| "closed"` |

If you change the `<ul>` padding (`pl-2`) or border width, update the `before:-left-[9px]` offset too, or the active segment stops lining up with the guide line.

Screenshot: `Docs/report/assets/apolyx-sidebar/sidebar-open.png` (default family, dark, 1280 px).

## Docs building blocks

| Component | Role |
|-----------|------|
| `ComponentPreview` | Async: reads `src/demos/<name>.tsx`, highlights with Shiki, renders via client `PreviewTabs` |
| `InstallTabs` | pnpm / npm / yarn / bun CLI lines + monorepo import tab |
| `PropsTable` | Hand-written rows per page |
| `TokenTable` | Live swatches from `cssVariableTokens` for the active family × mode |

## Content

Catch-all `src/app/docs/[[...slug]]/page.tsx` → `src/content/docs/**/*.mdx` (42 MDX pages): introduction, installation, theming, CLI, primitives, 28 components (incl. Navigation and Data groups), motion overview + 4 recipes, charts overview + line + bar. Every registry item’s `docs` field points at an existing page. S0001 closed with 37 routes and 20 components; S0002 added Field, Sheet, Breadcrumb, NavigationMenu, NavList, Table, List and Grid ([[06-s0002-contrast-nav-switch-field-data]]); Timeline was added on 2026-10-14 ([[07-timeline]]).

A page can hold several previews: `components/timeline.mdx` renders nine `ComponentPreview`s (one per layout or state), each backed by its own `src/demos/timeline-*.tsx` file registered in `src/demos/index.ts`.

Landing `/` shows a live Card + LineChart sample and the badge `Apolyx-S0001 · N components`, where N is counted from `docs-config.ts` (28 today).

## Screenshots (verify)

Saved under `Docs/report/assets/apolyx-s0001/`:

- `docs-home-default-light.png`
- `docs-button-default-light.png`
- `docs-home-power-blue-dark.png`
- `docs-button-power-blue-dark.png`

(CDP capture; `browser_take_screenshot` timed out in this environment.)
