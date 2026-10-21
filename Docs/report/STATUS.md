---
title: "Status — complete vs remaining"
description: "Audited snapshot: Apolyx-S0005 product gate closed; next implement Jord-S0001"
created: 2026-09-19
updated: 2026-10-21
tags:
  - report
  - status
  - Apolyx-S0005
  - Jord-S0001
---

# Status

Last updated: 2026-10-21 · Living map: [[../brain/00-Docs-Brain]] · Active sprint: **Jord-S0001** (ready to implement) · Last ship: **Apolyx-S0005** (closed 2026-10-21) · Sequence: [[../plan/00-roadmap-apolyx-jord-artemis]]

## Implemented

- Turborepo + pnpm workspaces (`apps/*`, `cloud/*`, `elements/*`)
- Sample packages removed 2026-10-18 — [[../tech_space/03-sample-apps-removed]]
- Cloud: PocketBase placeholder (`cloud/pocketbase`)
- **`@altr/apolyx`** (`elements/ui-kit`)
  - Foundations: OKLCH themes (3 families × light / dark), `ApolyxProvider`, owned primitives (no Radix / Base UI)
  - Through **S0004:** overlays incl. Popover, nav, Table / List / Grid, Timeline, Switch + input catalog, Line / Bar charts
  - **S0005 product gate:** Select, Combobox, Pagination, Scroll Area, Progress, Accordion / Collapsible, Radio Group — [[../tech_space/ui-kit/10-s0005-product-gate]]
  - **74 registry items**; **163 Vitest tests**
- **`apolyx` CLI** — `init` / `add` / `list`
- **`@altr/apolyx-docs`** (`apps/apolyx`) — MDX docs; S0005 pages marked with purple `new` badge; Forms / Components / Navigation updated
- **Apolyx-first rule** — `.cursor/rules/apolyx-first.mdc` (apps consume kit; missing controls built via apollo + docs first)
- Docs vault + brain + **docs_man** + **apollo**

As-built: [[../tech_space/ui-kit/README]] (latest [[../tech_space/ui-kit/10-s0005-product-gate]])

## Remaining (Apolyx — not blocking Jord)

Tracked in [[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]: Command, data-grid engine, Slider, date / color pickers, phone input, submenus, candlestick, RHF / Zod, remote registry / CLI update, docs search, a11y CI.

## Planned (repo) — **do next**

1. **Jord-S0001** — implement now: [[../plan/Jord/Jord-S0001/README]] (start [[../plan/Jord/Jord-S0001/01-packages]]) · Intent [[../feature_list/Jord/00-intent]]
2. Jord Studio S1 (after Slice 0) — [[../feature_list/Jord/03-jord-studio]]
3. Artemis — still idea [[../idea/artemis/README]]; promote after Jord Slice 0
4. Tia — intent only [[../feature_list/tia/README]]
5. CI pipeline
