---
title: "Status — complete vs remaining"
description: "Audited snapshot of altr.lab after Apolyx-S0003 closed"
created: 2026-09-19
updated: 2026-10-14
tags:
  - report
  - status
  - Apolyx-S0001
  - Apolyx-S0002
  - Apolyx-S0003
---

# Status

Last updated: 2026-10-14 · Living map: [[../brain/00-Docs-Brain]] · Sprint: **Apolyx-S0003** (closed 2026-10-14) · Previous: **Apolyx-S0002**, **Apolyx-S0001** (closed) · Timeline and the collapsible docs sidebar were added between S0002 and S0003

## Implemented

- Turborepo + pnpm workspaces (`apps/*`, `cloud/*`, `elements/*`)
- **`@altr/hub`** — landing Next.js (:3000), markdown content DB (`content/*.md`)
- `@altr/web` (:3003), `@altr/dashboard` (:3001), `@altr/trading-ui` (:3002) scaffolds (Apolyx themes)
- Cloud: `@altr/hono-server` (health), PocketBase + AI agent placeholders
- **`@altr/apolyx`** (`elements/ui-kit`)
  - Foundations: OKLCH themes (3 families × light / dark) with hover-contrast tokens, `ApolyxProvider`, and its own primitives (no Radix / Base UI).
  - Components: wave 1 + overlays (Dialog with sizes, DropdownMenu, Tabs, Tooltip, Toast), navigation (Sheet, Breadcrumb, NavigationMenu, NavList), Table / List / Grid, Timeline.
  - **S0003:** Switch with pure, unit-tested physics, plus `lg`, tones, icons, track labels, `SwitchField`, `SwitchCard` and `FieldSet`. Field extras (`labelAside`, `optional`, horizontal, `FieldCounter`, multiple errors) sit on a `ControlBox` shared with `InputGroup`. `Input` variants and native types, `PasswordInput` + `PasswordStrength`, `NumberInput`, `InputOTP`, and `MaskedInput` / `useMask` with presets — [[../tech_space/ui-kit/08-s0003-switch-inputs]].
  - Motion recipes, Line / Bar charts (visx), Storybook 9 (33 story files).
  - **66 registry items** with an import-resolution build; **141 Vitest tests** in 30 files.
- **`apolyx` CLI** (`elements/apolyx-cli`) — `init` / `add` / `list`. The external Next smoke app builds with button, dialog, line-chart + overlays, and since S0003 with input-group, password-input, number-input, input-otp, input-mask and switch.
- **`@altr/apolyx-docs`** (`apps/apolyx`) — MDX docs on :3004
  - 48 MDX pages; 34 component pages.
  - Sidebar groups: Components / **Forms** / Navigation / Data / Motion / Charts. They are collapsible, open by default, and drawn with a depth guide line ([[../tech_space/ui-kit/05-docs-app#Sidebar groups]]).
  - **Form patterns** page: layouts, Dialog / Sheet / Card containers, a multi-step flow with verification and review, error summary, async check, and a settings screen.
  - Building blocks: ComponentPreview / InstallTabs / PropsTable / TokenTable; registry served at `/r/*.json`.
- **`@altr/base`** — utils, content, env, errors, stubs
- Docs vault + brain + **docs_man** + **apollo**

As-built: [[../tech_space/ui-kit/README]] (S0002: [[../tech_space/ui-kit/06-s0002-contrast-nav-switch-field-data]] · Timeline: [[../tech_space/ui-kit/07-timeline]] · S0003: [[../tech_space/ui-kit/08-s0003-switch-inputs]])

Screenshots:
- `Docs/report/assets/apolyx-s0001/`
- `Docs/report/assets/apolyx-timeline/`
- `Docs/report/assets/apolyx-sidebar/`
- `Docs/report/assets/apolyx-s0003/` (Switch default dark + power-blue light, Input Group light, Input OTP light, Form patterns dark with the Forms group)

Historical: [[../tech_space/01-hub-ui-kit-base]] · [[../tech_space/02-ui-kit-storybook]]

## Remaining

Tracked in [[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]:

- Remote registry hosting, `apolyx diff` / `update`, npm publish of `apolyx`
- Docs search, dropdown submenus, installable blocks
- Candlestick / canvas OHLC charts
- Automated Lighthouse + Storybook a11y CI gates
- From S0002: data grid engine (sort / filter / virtualize), Command palette, Popover, Select / Combobox, Accordion, Pagination
- From S0003: international phone input, date / color pickers, popover addons (all need Select / Combobox / Popover); Slider; tags input, file dropzone, rich text; React Hook Form / Zod adapter

## Planned (Apolyx)

- No active sprint. The next sprint is not planned yet; Select / Combobox / Popover is the most-blocking gap (it unblocks four S0003 deferrals).

## Planned (repo)

- Wire Turso / auth in `@altr/base`; CI pipeline
- Product features beyond the design-system infra
