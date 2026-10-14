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

> Who: anyone installing Apolyx outside the monorepo. Sprint **Apolyx-S0001** phase 8. Plan: [[../../plan/ui-kit/08-registry-and-cli]].

## Registry (`elements/ui-kit`)

- **52 manifests** in `registry/*.json` — lib, theme, primitive, ui, motion, chart. The sprint closed with 51; `timeline` was added on 2026-10-14 ([[06-timeline]]) and installs with `apolyx add timeline`.
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
