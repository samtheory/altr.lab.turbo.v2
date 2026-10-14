---
title: "Status — complete vs remaining"
description: "Audited snapshot of altr.lab after Apolyx-S0002 closed"
created: 2026-09-19
updated: 2026-10-14
tags:
  - report
  - status
  - Apolyx-S0001
  - Apolyx-S0002
---

# Status

Last updated: 2026-10-14 · Living map: [[../brain/00-Docs-Brain]] · Sprint: **Apolyx-S0002** (closed) · Previous: **Apolyx-S0001** (closed) · Timeline added after S0002 (2026-10-14)

## Implemented

- Turborepo + pnpm workspaces (`apps/*`, `cloud/*`, `elements/*`)
- **`@altr/hub`** — landing Next.js (:3000), markdown content DB (`content/*.md`)
- `@altr/web` (:3003), `@altr/dashboard` (:3001), `@altr/trading-ui` (:3002) scaffolds (Apolyx themes)
- Cloud: `@altr/hono-server` (health), PocketBase + AI agent placeholders
- **`@altr/apolyx`** (`elements/ui-kit`) — OKLCH themes (3×2) with hover-contrast tokens, ApolyxProvider, own primitives (no Radix / Base UI), wave-1 + overlays (Dialog with sizes, DropdownMenu, Tabs, Tooltip, Toast), navigation (Sheet, Breadcrumb, NavigationMenu, NavList), physics Switch, Field (top / floating / inline), Table / List / Grid, Timeline (2026-10-14, [[../tech_space/ui-kit/07-timeline]]), motion recipes, Line/Bar charts (visx), Storybook 9, 60 registry items with import-resolution build, 59 Vitest tests
- **`apolyx` CLI** (`elements/apolyx-cli`) — `init` / `add` / `list`; external Next smoke (button, dialog, line-chart + overlays) builds
- **`@altr/apolyx-docs`** (`apps/apolyx`) — MDX docs on :3004 (42 MDX pages; sidebar groups Components / Navigation / Data / Motion / Charts), ComponentPreview / InstallTabs / PropsTable / TokenTable, `/r/*.json`
- **`@altr/base`** — utils, content, env, errors, stubs
- Docs vault + brain + **docs_man** + **apollo**

As-built: [[../tech_space/ui-kit/README]] (S0002: [[../tech_space/ui-kit/06-s0002-contrast-nav-switch-field-data]] · Timeline: [[../tech_space/ui-kit/07-timeline]]) · Screenshots: `Docs/report/assets/apolyx-s0001/` · `Docs/report/assets/apolyx-timeline/` · Historical: [[../tech_space/01-hub-ui-kit-base]] · [[../tech_space/02-ui-kit-storybook]]

## Remaining

Tracked in [[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]:

- Remote registry hosting, `apolyx diff` / `update`, npm publish of `apolyx`
- Docs search, dropdown submenus, installable blocks
- Candlestick / canvas OHLC charts
- Automated Lighthouse + Storybook a11y CI gates
- From S0002: data grid engine (sort / filter / virtualize), Command palette, Popover, Select / Combobox, Accordion, Pagination

## Planned (repo)

- Wire Turso / auth in `@altr/base`; CI pipeline
- Product features beyond the design-system infra
