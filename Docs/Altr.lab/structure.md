---
title: "Monorepo structure"
description: "altr.lab apps / cloud / elements layout and package scope"
created: 2026-09-19
updated: 2026-10-18
tags:
  - altr-lab
  - structure
---

# Monorepo structure

```
altr.lab.turbo.v2/
├── apps/
│   └── apolyx/           # @altr/apolyx-docs — Apolyx docs (Next.js, :3004)
├── cloud/
│   └── pocketbase/       # @service/pocketbase — optional PB placeholder
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

Shared packages use `@altr/*`. The docs app depends on `@altr/apolyx`. PocketBase is `@service/pocketbase`.

Sample apps `hub`, `dashboard`, `trading-ui`, `web` and cloud packages `hono-server`, `ai-bot-agent` were removed 2026-10-18. See [[../tech_space/03-sample-apps-removed]].

As-built detail: [[../tech_space/ui-kit/README]] · [[../tech_space/03-sample-apps-removed]] · historical [[../tech_space/01-hub-ui-kit-base]] · [[../tech_space/02-ui-kit-storybook]]

Storybook: `pnpm storybook:ui-kit` — Docs: `pnpm dev:apolyx` (:3004) — see [[commands]].
