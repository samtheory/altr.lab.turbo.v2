---
title: "Monorepo structure"
description: "altr.lab apps / cloud / elements layout and package scope"
created: 2026-09-19
updated: 2026-10-11
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
│   ├── web/              # @altr/web — extra Next scaffold (:3003)
│   └── apolyx/           # @altr/apolyx-docs — Apolyx docs (Next.js, :3004)
├── cloud/
│   ├── hono-server/      # @altr/hono-server — Hono + Bun API (:8787)
│   ├── pocketbase/       # @altr/pocketbase — optional PB placeholder
│   └── ai-bot-agent/     # @altr/ai-bot-agent — AI agent placeholder
├── elements/
│   ├── ui-kit/           # @altr/apolyx — Apolyx UI kit (Tailwind + Motion + Storybook :6006)
│   ├── apolyx-cli/       # apolyx — CLI (init / add / list)
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

All packages use `@altr/*`. Apps depend on `@altr/apolyx` (globals.css + ThemeProvider / ApolyxProvider). Hub also uses `@altr/base/content` for markdown.

As-built detail: [[../tech_space/ui-kit/README]] · [[../tech_space/01-hub-ui-kit-base]] · [[../tech_space/02-ui-kit-storybook]]

Storybook: `pnpm storybook:ui-kit` — Docs: `pnpm dev:apolyx` (:3004) — see [[commands]].
