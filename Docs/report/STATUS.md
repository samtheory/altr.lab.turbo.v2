---
title: "Status — complete vs remaining"
description: "Audited snapshot of altr.lab: hub, ui-kit Storybook, base, docs"
created: 2026-09-19
updated: 2026-10-11
tags:
  - report
  - status
---

# Status

Last updated: 2026-10-11 (planned section) · Last code audit: 2026-09-21 · Living map: [[../brain/00-Docs-Brain]]

## Implemented

- Turborepo + pnpm workspaces (`apps/*`, `cloud/*`, `elements/*`)
- **`@altr/hub`** — landing Next.js (:3000), markdown content DB (`content/*.md`)
- `@altr/web` (:3003), `@altr/dashboard` (:3001), `@altr/trading-ui` (:3002) scaffolds
- Cloud: `@altr/hono-server` (health), PocketBase + AI agent placeholders
- **`@altr/ui-kit`** — Tailwind v4, shadcn Button/Card/Badge, Theme*, Motion FadeIn
- **Storybook 9** for `@altr/ui-kit` — `pnpm storybook:ui-kit` → http://localhost:6006
- **`@altr/base`** — utils, content (gray-matter), env, errors, db/auth/query/ai stubs
- Docs vault + `brain/` + **docs_man**

As-built: [[../tech_space/01-hub-ui-kit-base]] · [[../tech_space/02-ui-kit-storybook]]

## Remaining

- Wire Turso / `@libsql/client` in `@altr/base/db`
- Auth implementation
- Expand shadcn set; optional MDX / `[slug]` routes for hub content
- CI pipeline (incl. optional Storybook build)

## Planned

- **Apolyx v1** (design system on `elements/ui-kit`) — sprint opened 2026-10-11, owner apollo: [[../plan/ui-kit/README]]. Intent: [[../feature_list/ui-kit/00-intent]]. Nothing shipped yet; kit code is still the v0 set listed under Implemented.
