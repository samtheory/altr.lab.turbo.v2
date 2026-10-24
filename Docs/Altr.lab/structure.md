---
title: "Monorepo structure"
description: "altr.lab apps / cloud / elements layout and package scope, including planned Jord packages"
created: 2026-09-19
updated: 2026-10-21
tags:
  - altr-lab
  - structure
  - base
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
│   └── base/             # @altr/base — leaf utils (no deps on other elements)
├── data/                 # gitignored runtime files (planned: jord.db)
├── Docs/                 # Obsidian second brain
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Element dependency rules

Full contract: [[../feature_list/00-elements-dependency-rules]].

1. **`@altr/base` is a leaf** — shared framework utilities only; **never** depends on jord, apolyx, or other elements.
2. **Apps / cloud / elements may depend on base** for env, errors, Result, content helpers, etc.
3. **Prefer zero peer-element deps** (`jord` ↛ `apolyx`, etc.) so packages stay add/remove-able per project. Compose in apps/cloud.

## Planned Jord packages (not in the tree yet)

Intent: [[../feature_list/Jord/02-architecture]]. S0001: [[../plan/Jord/phase-01/Jord-S0001/README]].

| Path | Package | Role |
|------|---------|------|
| `data/jord.db` | — | libSQL file (gitignored) |
| `elements/jord/` | `@altr/jord` | Schema, client, dialect seam |
| `cloud/jord/` | `@altr/jord-server` | Hono API |
| `apps/jord-studio/` | `@altr/jord-studio` | Jord Studio (after S0001) |

Modular packages now; run as one local stack; split deployables later without renaming the product.

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
