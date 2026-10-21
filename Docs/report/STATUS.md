---
title: "Status — complete vs remaining"
description: "Audited snapshot: Jord-S0001 Slice 0 shipped; next Jord Studio S1"
created: 2026-09-19
updated: 2026-10-21
tags:
  - report
  - status
  - Apolyx-S0005
  - Jord-S0001
---

# Status

Last updated: 2026-10-21 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **Jord-S0001** (Slice 0) via **[[../agents/mimir/00-index|mimir]]** · Prior: **Apolyx-S0005** · Sequence: [[../plan/00-roadmap-apolyx-jord-artemis]]

## Implemented

- Turborepo + pnpm workspaces (`apps/*`, `cloud/*`, `elements/*`)
- Sample packages removed 2026-10-18 — [[../tech_space/03-sample-apps-removed]]
- Cloud: PocketBase placeholder (`cloud/pocketbase`)
- **Jord Slice 0 (`Jord-S0001`)** — [[../tech_space/jord/00-s0001-slice0]]
  - `@altr/jord` (`elements/jord`) — `file:` only, WAL pragmas, `records` + OCC
  - `@altr/jord-server` (`cloud/jord`) — Hono routes, write queue, WAL truncate on timer + shutdown
  - `pnpm db:snapshot` · `data/*.db` gitignored · `@altr/base/db` redirects to Jord
- **`@altr/apolyx`** (`elements/ui-kit`)
  - Foundations: OKLCH themes (3 families × light / dark), `ApolyxProvider`, owned primitives (no Radix / Base UI)
  - Through **S0004:** overlays incl. Popover, nav, Table / List / Grid, Timeline, Switch + input catalog, Line / Bar charts
  - **S0005 product gate:** Select, Combobox, Pagination, Scroll Area, Progress, Accordion / Collapsible, Radio Group — [[../tech_space/ui-kit/10-s0005-product-gate]]
  - **74 registry items**; **163 Vitest tests**
- **`apolyx` CLI** — `init` / `add` / `list`
- **`@altr/apolyx-docs`** (`apps/apolyx`) — MDX docs; S0005 pages marked with purple `new` badge; Forms / Components / Navigation updated
- **Apolyx-first rule** — `.cursor/rules/apolyx-first.mdc` (apps consume kit; missing controls built via apollo + docs first)
- Docs vault + brain + **docs_man** + **apollo** + **mimir**

As-built: Jord [[../tech_space/jord/00-s0001-slice0]] · Apolyx [[../tech_space/ui-kit/README]]

## Remaining (Apolyx — not blocking Studio)

Tracked in [[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]: Command, data-grid engine, Slider, date / color pickers, phone input, submenus, candlestick, RHF / Zod, remote registry / CLI update, docs search, a11y CI.

## Planned (repo) — **do next**

1. **Jord Studio S1** — APIs already on `@altr/jord-server`; UI via **apollo** (`@altr/apolyx` only) — [[../feature_list/Jord/03-jord-studio]]
2. Artemis — still idea [[../idea/artemis/README]]; promote after Studio or as needed
3. Tia — intent only [[../feature_list/tia/README]]
4. CI pipeline
