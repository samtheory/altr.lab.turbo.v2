---
title: "Phase 1 — hover contrast"
description: "Semantic hover tokens for every theme family × mode; Button, menu, tabs and switch use them"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - tokens
  - Apolyx-S0002
---

# Phase 1 — hover contrast

> Who: apollo. Dark-mode primary buttons barely change on hover because `--primary` is near-white and the hover only drops opacity to 90 %.

Sprint index: [[README]]

## Tokens (all 3 families × light / dark)

| Token | Use |
|-------|-----|
| `--primary-hover` | Primary fill on hover — clearly lighter/darker than `--primary`, keeps `--primary-foreground` legible |
| `--secondary-hover` | Secondary fill on hover |
| `--destructive-hover` | Destructive fill on hover |
| `--accent-hover` | Ghost / outline / menu-item hover fill — visible step above `--accent` surface on dark |
| `--border-strong` | Outline button / field border on hover |

Registered in `tokens.css` `@theme inline` as `--color-*` and listed in `cssVariableTokens`.

## Tasks

- [x] Add tokens to `default.css`, `power-blue.css`, `power-green.css` (light + dark)
- [x] Register in `tokens.css` + `theme/index.ts`
- [x] Button: every variant uses hover tokens; add `active:` press step
- [x] DropdownMenu items, Tabs triggers, Switch unchecked track: stronger hover / focus fills
- [x] Storybook: "Hover contrast" story under each family in dark

## Done when

Hovering a primary button in dark mode is obvious at a glance under all three families.
