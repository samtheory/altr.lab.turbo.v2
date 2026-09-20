---
title: "Monorepo structure"
description: "altr.lab apps / cloud / elements layout and package scope"
created: 2026-09-19
updated: 2026-09-20
tags:
  - altr-lab
  - structure
---

# Monorepo structure

```
altr.lab.turbo.v2/
├── apps/
│   ├── hub/              # @altr/hub — landing (Next.js, :3000) · markdown content/
│   ├── dashboard/        # @altr/dashboard — admin UI (Next.js, :3001)
│   ├── trading-ui/       # @altr/trading-ui — trading UI (Next.js, :3002)
│   └── web/              # @altr/web — extra Next scaffold (:3003)
├── cloud/
│   ├── hono-server/      # @altr/hono-server — Hono + Bun API (:8787)
│   ├── pocketbase/       # @altr/pocketbase — optional PB placeholder
│   └── ai-bot-agent/     # @altr/ai-bot-agent — AI agent placeholder
├── elements/
│   ├── ui-kit/           # @altr/ui-kit — Tailwind v4 + shadcn + Motion + theme
│   └── base/             # @altr/base — utils, content, db, env, errors, …
├── Docs/                 # Obsidian second brain
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Workspaces

```yaml
packages:
  - "apps/*"
  - "cloud/*"
  - "elements/*"
```

All packages use `@altr/*`. Apps depend on `@altr/ui-kit` (globals.css + ThemeProvider). Hub also uses `@altr/base/content` for markdown.

As-built detail: [[../tech_space/01-hub-ui-kit-base]]
