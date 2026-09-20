---
title: "Status — complete vs remaining"
description: "Audited snapshot of altr.lab: hub, ui-kit, base, docs scaffold"
created: 2026-09-19
updated: 2026-09-20
tags:
  - report
  - status
---

# Status

Last updated: 2026-09-20 · Living map: [[../brain/00-Docs-Brain]]

## Implemented

- Turborepo + pnpm workspaces (`apps/*`, `cloud/*`, `elements/*`)
- **`@altr/hub`** — landing Next.js (:3000), markdown content DB (`content/*.md`)
- `@altr/web` (:3003), `@altr/dashboard` (:3001), `@altr/trading-ui` (:3002) scaffolds
- Cloud: `@altr/hono-server` (health), PocketBase + AI agent placeholders
- **`@altr/ui-kit`** — Tailwind v4, shadcn-style Button/Card/Badge, ThemeProvider/Toggle, Motion `FadeIn`
- **`@altr/base`** — utils, content (gray-matter), env, errors, db/auth/query/ai stubs
- Docs vault + `brain/` + **docs_man**

As-built: [[../tech_space/01-hub-ui-kit-base]] · Intent: [[../feature_list/01-hub-ui-kit-base]]

## Remaining

- Wire Turso / `@libsql/client` in `@altr/base/db`
- Auth implementation
- Expand shadcn set; optional MDX / `[slug]` routes for hub content
- CI pipeline

## Planned

- (add items from `Docs/plan/` as they are accepted)
