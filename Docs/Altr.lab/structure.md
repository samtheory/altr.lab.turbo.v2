---
title: "Monorepo structure"
description: "altr.lab apps / cloud / elements layout and package scope"
created: 2026-09-19
updated: 2026-09-19
tags:
  - altr-lab
  - structure
---

# Monorepo structure

```
altr.lab.turbo.v2/
├── apps/
│   ├── web/              # @altr/web — marketing / public site (Next.js, :3000)
│   ├── dashboard/        # @altr/dashboard — admin UI (Next.js, :3001)
│   └── trading-ui/       # @altr/trading-ui — trading UI (Next.js, :3002)
├── cloud/
│   ├── hono-server/      # @altr/hono-server — Hono + Bun API (:8787)
│   ├── pocketbase/       # @altr/pocketbase — optional PB placeholder
│   └── ai-bot-agent/     # @altr/ai-bot-agent — AI agent placeholder
├── elements/
│   ├── ui-kit/           # @altr/ui-kit — Tailwind v4 + shadcn + theme
│   └── base/             # @altr/base — db, env, errors, auth, query, ai stubs
├── Docs/                 # Obsidian second brain
├── package.json          # pnpm workspaces root
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

All packages use `@altr/*`. Apps depend on `@altr/ui-kit` (globals.css + ThemeProvider).
