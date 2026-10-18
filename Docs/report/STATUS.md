---
title: "Status — complete vs remaining"
description: "Audited snapshot of altr.lab after sample apps were removed and Apolyx-S0004 closed"
created: 2026-09-19
updated: 2026-10-18
tags:
  - report
  - status
  - Apolyx-S0001
  - Apolyx-S0002
  - Apolyx-S0003
  - Apolyx-S0004
---

# Status

Last updated: 2026-10-18 · Living map: [[../brain/00-Docs-Brain]] · Active sprint: none · Last ship: **Apolyx-S0004** (closed 2026-10-18) · Sample apps removed the same day · Previous: **Apolyx-S0003**, **Apolyx-S0002**, **Apolyx-S0001** (closed)

## Implemented

- Turborepo + pnpm workspaces (`apps/*`, `cloud/*`, `elements/*`)
- Sample packages removed 2026-10-18: `@altr/hub`, `@altr/web`, `@altr/dashboard`, `@altr/trading-ui`, `@service/hono-server`, `@service/ai-bot-agent` — [[../tech_space/03-sample-apps-removed]]
- Cloud still present: PocketBase placeholder (`cloud/pocketbase`)
- **`@altr/apolyx`** (`elements/ui-kit`)
  - Foundations: OKLCH themes (3 families × light / dark) with hover-contrast tokens, `ApolyxProvider`, and its own primitives (no Radix / Base UI).
  - Components: wave 1 + overlays (Dialog with sizes, DropdownMenu, Tabs, Tooltip, Toast, **Popover**), navigation (Sheet, Breadcrumb, NavigationMenu, NavList), Table / List / Grid, Timeline.
  - **S0003:** Switch with pure, unit-tested physics, plus `lg`, tones, icons, track labels, `SwitchField`, `SwitchCard` and `FieldSet`. Field extras (`labelAside`, `optional`, horizontal, `FieldCounter`, multiple errors) sit on a `ControlBox` shared with `InputGroup`. `Input` variants and native types, `PasswordInput` + `PasswordStrength`, `NumberInput`, `InputOTP`, and `MaskedInput` / `useMask` with presets — [[../tech_space/ui-kit/08-s0003-switch-inputs]].
  - **Post-S0003 polish (2026-10-14):** default inputs are borderless (muted pad + soft focus ring bloom; bottom accent bar removed in `ControlBox` / `Input` / `Textarea`). Checkbox fill / clear pops the mark with `apolyx-check-in` and respects reduced motion.
  - **S0004:** owned Popover (`click` / `hover`, `PopoverAnchor`, non-modal dialog focus), origin-aware `pop` / `slide` / `fade` motion, docs recipes for every Shadcn Studio popover kind, Input Group popover addon — [[../tech_space/ui-kit/09-s0004-popover]].
  - Motion recipes, Line / Bar charts (visx), Storybook 9.
  - **67 registry items** with an import-resolution build; **149 Vitest tests**.
- **`apolyx` CLI** (`elements/apolyx-cli`) — `init` / `add` / `list`. The external Next smoke app builds with button, dialog, line-chart + overlays, and since S0003 with input-group, password-input, number-input, input-otp, input-mask and switch; S0004 adds `popover`.
- **`@altr/apolyx-docs`** (`apps/apolyx`) — MDX docs on :3004
  - 49 MDX pages; Popover under Components (after Dropdown Menu, status `new`).
  - Sidebar groups: Components / **Forms** / Navigation / Data / Motion / Charts. They are collapsible, open by default, and drawn with a depth guide line ([[../tech_space/ui-kit/05-docs-app#Sidebar groups]]).
  - **Form patterns** page: layouts, Dialog / Sheet / Card containers, a multi-step flow with verification and review, error summary, async check, and a settings screen.
  - Building blocks: ComponentPreview / InstallTabs / PropsTable / TokenTable; registry served at `/r/*.json`.
- **`@altr/base`** — utils, content, env, errors, stubs
- Docs vault + brain + **docs_man** + **apollo**

As-built: [[../tech_space/ui-kit/README]] (S0002: [[../tech_space/ui-kit/06-s0002-contrast-nav-switch-field-data]] · Timeline: [[../tech_space/ui-kit/07-timeline]] · S0003: [[../tech_space/ui-kit/08-s0003-switch-inputs]] · S0004: [[../tech_space/ui-kit/09-s0004-popover]])

Screenshots:
- `Docs/report/assets/apolyx-s0001/`
- `Docs/report/assets/apolyx-timeline/`
- `Docs/report/assets/apolyx-sidebar/`
- `Docs/report/assets/apolyx-s0003/` (Switch default dark + power-blue light, Input Group light, Input OTP light, Form patterns dark with the Forms group)
- `Docs/report/assets/apolyx-s0004/` (`popover-pop-dark`, `popover-pop-light`, `popover-slide-dark`, `popover-notifications-dark`)

Historical: [[../tech_space/01-hub-ui-kit-base]] · [[../tech_space/02-ui-kit-storybook]] · Removal: [[../tech_space/03-sample-apps-removed]]

## Remaining

Tracked in [[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]:

- Remote registry hosting, `apolyx diff` / `update`, npm publish of `apolyx`
- Docs search, dropdown submenus, installable blocks
- Candlestick / canvas OHLC charts
- Automated Lighthouse + Storybook a11y CI gates
- From S0002: data grid engine (sort / filter / virtualize), Command palette, Select / Combobox, Accordion, Pagination
- From S0003: international phone input, date / color pickers (Popover exists; pickers still deferred), Slider; tags input, file dropzone, rich text; React Hook Form / Zod adapter

## Planned (Apolyx)

- No open Apolyx sprint. Next wave TBD from carry-overs (Select / Combobox / Slider / pickers are the natural follow-ons now that Popover exists).

## Planned (repo)

- **Jord**, plan ready, code not started: [[../feature_list/Jord/00-intent]] · plan [[../plan/Jord/Jord-S0001/README]] (cards 1–8, start [[../plan/Jord/Jord-S0001/01-packages]]) — `LibSqlAdapter`, WAL checkpoints, `records` OCC `version`, 64-bit timestamps, snapshot, `cloud/jord`. Architecture [[../feature_list/Jord/02-architecture]]. Studio [[../feature_list/Jord/03-jord-studio]]. Later [[../feature_list/Jord/01-later]]
- CI pipeline
- Product features beyond the design-system infra
