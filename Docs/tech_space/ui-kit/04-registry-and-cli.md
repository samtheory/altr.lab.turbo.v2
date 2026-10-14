---
title: "Apolyx registry and apolyx CLI"
description: "As-built registry manifests, import-resolution build, and CLI init/add for Apolyx-S0001"
created: 2026-10-11
updated: 2026-10-14
tags:
  - tech-space
  - ui-kit
  - apolyx
  - Apolyx-S0001
  - cli
  - registry
---

# Apolyx registry and CLI

> Who: anyone installing Apolyx outside the monorepo. Sprint **Apolyx-S0001** phase 8. Plan: [[../../plan/ui-kit/Apolyx-S0001/08-registry-and-cli]].

## Registry (`elements/ui-kit`)

- **66 manifests** in `registry/*.json` — lib, theme, primitive, ui, motion, chart. S0001 closed with 51; S0002 brought it to 59 ([[06-s0002-contrast-nav-switch-field-data]]); `timeline` made 60 ([[07-timeline]]); S0003 added `input-group`, `password-input`, `number-input`, `input-otp`, `input-mask` and the `mask` lib item, and updated `switch`, `field`, `input`, `textarea`, `button` in place ([[08-s0003-switch-inputs]]).
- **One alias per item:** `add` writes every file of an item under the alias for its type (`ui` → `components/ui`, `lib` → `lib`). A helper that belongs in `lib/` therefore ships as its own `type: "lib"` item that the component lists in `registryDependencies` (`utils`, `mask`).
- Theme CSS is split: `src/styles/tokens.css` (`@theme inline`, dark variant, reduced motion, base) + three family files. Kit `globals.css` imports all of them plus `@source`.
- `scripts/build-registry.ts` validates required fields, kebab-case names, type enum; resolves every relative import to a file owned by the item or a transitive `registryDependency`; requires bare imports in `dependencies` (except `react` / `react-dom`); forbids `@altr/*`, `@radix-ui/*`, `@base-ui/*`; emits `dist/r/<name>.json` with inlined content + `files[].imports`, and `dist/r/index.json`.
- Kit script: `"build": "tsx scripts/build-registry.ts"`.

## CLI (`elements/apolyx-cli`, npm name `apolyx`)

| Command | Behavior |
|---------|----------|
| `init` | Writes `apolyx.json`, installs utils + theme-config + theme-base + theme-default (+ chosen family), injects `@import`s after `@import "tailwindcss"`, installs npm deps, warns if CSS defines its own `--background` / `--foreground` |
| `add` | Topo-sorts `registryDependencies`, rewrites imports via the build-time import map, writes to alias dirs (resolved through `@/*` from tsconfig — works with and without `src/`), installs missing deps |
| `list` | Prints `index.json` (optional `--type`) |

Registry source order: `--registry` › `apolyx.json` › `APOLYX_REGISTRY` › `elements/ui-kit/dist/r`.

## External smoke (recorded)

Throwaway Next app at `%TEMP%\apolyx-smoke` (Next 16 + Tailwind v4, `--no-src-dir`):

1. `apolyx init --registry <repo>/elements/ui-kit/dist/r --yes` — wrote config, theme CSS, utils; warned about starter `:root` colors.
2. `apolyx add button dialog line-chart --yes` — then `--overwrite` with overlays + `theme-provider` + `--theme power-blue`.
3. App page rendered Button, Dialog, DropdownMenu, Tooltip, Tabs, Toast, LineChart under `ApolyxProvider`; `npm run build` succeeded.
4. Grep of installed files: no `@radix-ui` / `@base-ui`; only a comment mentioning `@altr` was cleared from `theme/index.ts`.
5. **Apolyx-S0003 re-run (2026-10-14):** `apolyx add input-group password-input number-input input-otp input-mask switch --overwrite` added 10 dependencies (including `field`, `control-box`, `field-set`, `lib/mask.ts`); an `app/forms/page.tsx` using all of them built with `npm run build` (Next 16.4).
