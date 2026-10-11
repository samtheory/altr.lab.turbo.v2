---
title: "tech_space — hub, ui-kit, base"
description: "As-built notes for @altr/hub markdown content DB, @altr/ui-kit Motion/shadcn, @altr/base"
created: 2026-09-20
updated: 2026-09-20
tags:
  - tech-space
  - hub
  - ui-kit
  - base
---

# Hub + ui-kit + base (as-built)

> **Renamed 2026-10-11:** package `@altr/ui-kit` → `@altr/apolyx` (folder still `elements/ui-kit`). See [[ui-kit/README]] for current as-built.

> How it was coded. Prefer this over plan text when behaviour differs. Code still wins if they disagree.

Intent: [[../feature_list/01-hub-ui-kit-base]]

## Packages

| Package | Path | Role |
|---------|------|------|
| `@altr/hub` | `apps/hub` | Landing Next.js app (:3000) |
| `@altr/ui-kit` | `elements/ui-kit` | Tailwind v4 + shadcn + Motion + theme |
| `@altr/base` | `elements/base` | utils, content (markdown), env, errors, db stub |

## Markdown content DB (`@altr/hub`)

- Files live in `apps/hub/content/*.md`
- Loader: `apps/hub/src/lib/content.ts` → `@altr/base/content` (`gray-matter`)
- APIs: `getHubPage(slug)`, `listHubPages()`
- Routes: `/` (home + stacked cards), `/docs-preview` (raw list)
- Frontmatter fields used today: `title`, `description`, `eyebrow`, `ctaLabel`, `ctaHref`, `order`, `published`

Add a new page: drop a `.md` into `content/` with frontmatter; it shows on hub (if not `published: false`).

## `@altr/ui-kit`

- CSS tokens + light/dark in `src/styles/globals.css`
- Components: `Button`, `Card`, `Badge`, `ThemeProvider`, `ThemeToggle`, `FadeIn`
- Motion: dependency `motion`, re-export `motion` + `FadeIn` from `src/components/motion.tsx`
- shadcn config: `elements/ui-kit/components.json`
- Apps import `@altr/ui-kit/globals.css` and set `transpilePackages: ["@altr/ui-kit"]`

## `@altr/base`

| Export | Purpose |
|--------|---------|
| `@altr/base/utils` | `sleep`, `assert`, `slugify`, `Result` |
| `@altr/base/content` | `parseMarkdownFile`, `listMarkdownDocuments`, `getMarkdownBySlug` |
| `@altr/base/env` | Turso env helpers |
| `@altr/base/db` | Turso stub (wire `@libsql/client` later) |
| `@altr/base/errors` | `AltrError`, `NotFoundError`, … |

## Ports

| App | Port |
|-----|------|
| hub | 3000 |
| dashboard | 3001 |
| trading-ui | 3002 |
| web (scaffold) | 3003 |
| hono-server | 8787 |

## Run

```bash
pnpm install
pnpm dev:hub
pnpm --filter @altr/hub build
```

## Remaining (not in this ship)

- Real Turso `@libsql/client`
- More shadcn primitives
- MDX / content collections if hub grows
- Dynamic `[slug]` routes per markdown file
