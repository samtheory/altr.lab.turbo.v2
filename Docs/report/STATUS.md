---
title: "Status — complete vs remaining"
description: "Audited snapshot of altr.lab after Apolyx-S0001 closed"
created: 2026-09-19
updated: 2026-10-11
tags:
  - report
  - status
  - Apolyx-S0001
---

# Status

Last updated: 2026-10-11 · Living map: [[../brain/00-Docs-Brain]] · Sprint: **Apolyx-S0001** (closed)

## Implemented

- Turborepo + pnpm workspaces (`apps/*`, `cloud/*`, `elements/*`)
- **`@altr/hub`** — landing Next.js (:3000), markdown content DB (`content/*.md`)
- `@altr/web` (:3003), `@altr/dashboard` (:3001), `@altr/trading-ui` (:3002) scaffolds (Apolyx themes)
- Cloud: `@altr/hono-server` (health), PocketBase + AI agent placeholders
- **`@altr/apolyx`** (`elements/ui-kit`) — OKLCH themes (3×2), ApolyxProvider, own primitives (no Radix / Base UI), wave-1 + overlays (Dialog, DropdownMenu, Tabs, Tooltip, Toast), motion recipes, Line/Bar charts (visx), Storybook 9, 51 registry items with import-resolution build
- **`apolyx` CLI** (`elements/apolyx-cli`) — `init` / `add` / `list`; external Next smoke (button, dialog, line-chart + overlays) builds
- **`@altr/apolyx-docs`** (`apps/apolyx`) — MDX docs on :3004 (37 routes), ComponentPreview / InstallTabs / PropsTable / TokenTable, `/r/*.json`
- **`@altr/base`** — utils, content, env, errors, stubs
- Docs vault + brain + **docs_man** + **apollo**

As-built: [[../tech_space/ui-kit/README]] · Screenshots: `Docs/report/assets/apolyx-s0001/` · Historical: [[../tech_space/01-hub-ui-kit-base]] · [[../tech_space/02-ui-kit-storybook]]

## Remaining (post–Apolyx-S0001)

Tracked in [[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]:

- Remote registry hosting, `apolyx diff` / `update`, npm publish of `apolyx`
- Docs search, dropdown submenus, installable blocks
- Candlestick / canvas OHLC charts
- Automated Lighthouse + Storybook a11y CI gates

## Planned (repo)

- Wire Turso / auth in `@altr/base`; CI pipeline
- Product features beyond the design-system infra
