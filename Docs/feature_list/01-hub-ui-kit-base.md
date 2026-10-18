---
title: "Hub landing + shared elements"
description: "Intent: apps/hub Next.js landing with markdown content DB; ui-kit (shadcn/Tailwind/Motion); base utils"
created: 2026-09-20
updated: 2026-10-18
tags:
  - feature
  - hub
  - ui-kit
  - base
---

# Hub landing + shared elements

> Product intent for the first runnable monorepo surface. **`apps/hub` was removed 2026-10-18** ([[../tech_space/03-sample-apps-removed]]). The checkboxes below record the 2026-09-20 ship. `@altr/base` and the UI kit remain.

## Goals

1. **`apps/hub`** — altr.lab public landing (Next.js)
2. **Markdown as content DB** — pages from `content/*.md` (frontmatter + body), expandable later
3. **`elements/ui-kit`** — Tailwind v4, shadcn-style components, light/dark, Motion
4. **`elements/base`** — shared utils, markdown content helpers, env/errors/db stubs for all apps

## Acceptance (shipped 2026-09-20)

- [x] `@altr/hub` on port 3000, uses `@altr/ui-kit` + `@altr/base`
- [x] `content/home.md` + `content/stack.md` drive landing sections
- [x] `/docs-preview` lists all markdown docs
- [x] `@altr/ui-kit` exports Button, Card, Badge, Theme*, FadeIn/motion
- [x] `@altr/base/content` + `@altr/base/utils`

## Links

- As-built: [[../tech_space/01-hub-ui-kit-base]]
- Code: `apps/hub`, `elements/ui-kit`, `elements/base`
