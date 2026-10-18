---
title: "Apolyx package + themes (as-built)"
description: "@altr/apolyx rename, OKLCH token families, ApolyxProvider / Storybook switcher — Apolyx-S0001"
created: 2026-10-11
updated: 2026-10-18
tags:
  - tech-space
  - ui-kit
  - apolyx
  - themes
  - Apolyx-S0001
---

# Apolyx package + themes (as-built)

> Sprint **Apolyx-S0001**. Code: `elements/ui-kit`.

## Package

| Item | Value |
|------|-------|
| Folder | `elements/ui-kit` |
| Package | `@altr/apolyx` (private) |
| Description | `Apolyx — altr.lab UI kit` |
| Exports | `.`, `./globals.css`, `./theme`, `./utils`, `./primitives`, `./motion`, `./charts` |

The docs app (`apps/apolyx`) and Storybook use `@altr/apolyx`. Sample Next apps that also used it (`hub`, `web`, `dashboard`, `trading-ui`) were removed 2026-10-18. Script names stay `storybook:ui-kit` / `build:storybook:ui-kit`.

## Themes

- Families: `default` \| `power-blue` \| `power-green`
- Modes: light / dark / system via `next-themes` (`.dark`)
- CSS: `src/styles/globals.css` + `src/styles/themes/*.css` (OKLCH full colors)
- Provider: `ApolyxProvider` + `useApolyxTheme` + `ApolyxThemeScript` (pre-paint `data-theme`)
- UI: `ThemeToggle` (mode), `ThemeFamilySwitcher` (family)
- Storybook: toolbar globals `theme` + `mode` (replaces class-only switcher)

Theme colors are full `var(--muted)` / `var(--accent)` values (no `hsl(var(--…))` wrapper).
