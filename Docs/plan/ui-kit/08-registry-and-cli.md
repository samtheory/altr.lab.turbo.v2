---
title: "Phase 8 — registry and apolyx CLI"
description: "Registry manifests + build script in elements/ui-kit; elements/apolyx-cli with init and add"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - cli
  - registry
---

# Phase 8 — registry and `apolyx` CLI

> Who: apollo. This makes Apolyx installable outside the monorepo: the kit describes itself as JSON, the CLI copies those files into another project.

Sprint index: [[README]] · Intent: [[../../feature_list/ui-kit/00-intent#CLI location — decided: `elements/apolyx-cli`]]

**Depends on:** phase 4 (at minimum Button + its deps); add other items as their phases land · **Skills:** `find-docs` (commander / clack / tsup APIs) — keep to 1–2

## Registry (in `elements/ui-kit`)

### Manifest shape

One file per item: `elements/ui-kit/registry/<name>.json`.

| Field | Meaning |
|-------|---------|
| `name` | CLI id, kebab-case (`button`, `line-chart`) |
| `type` | `ui` · `primitive` · `motion` · `chart` · `lib` · `theme` |
| `title`, `description` | For docs + CLI list |
| `files` | `[{ path: "src/components/ui/button.tsx", target: "ui/button.tsx" }]` — `target` is relative to the matching consumer alias |
| `dependencies` | npm packages + version ranges (`class-variance-authority`, `@visx/scale`, …) |
| `registryDependencies` | Other items (`utils`, `slot`) installed first |
| `cssVars` | Only for `theme` items |
| `docs` | Slug of the MDX page |

### Tasks

- [x] JSON schema `registry/schema.json` + manifests for: `utils`, `theme-default`, `theme-power-blue`, `theme-power-green`, every primitive, every shipped component / recipe / chart
- [x] `scripts/build-registry.ts` (run with `tsx`): validate manifests against schema, read file contents, output `dist/r/<name>.json` (manifest + inlined file contents) and `dist/r/index.json` (list)
- [x] Check in the build: every relative import inside an item's files resolves to a file in that item or in a `registryDependencies` item — fail otherwise
- [x] Kit script `"build": "tsx scripts/build-registry.ts"` (turbo `build` already outputs `dist/**`)

## CLI (`elements/apolyx-cli`, npm name `apolyx`)

### Consumer config — `apolyx.json` at project root

| Key | Example |
|-----|---------|
| `aliases.ui` | `@/components/ui` |
| `aliases.primitives` | `@/components/apolyx/primitives` |
| `aliases.lib` | `@/lib` |
| `aliases.motion` / `aliases.charts` | `@/components/apolyx/motion` / `…/charts` |
| `css` | `src/app/globals.css` |
| `theme` | `default` · `power-blue` · `power-green` |
| `registry` | Local path (dev) — URL support designed, shipped later |

### Tasks

- [x] Package scaffold: `package.json` (`name: "apolyx"`, `bin: { apolyx: "dist/index.js" }`, `type: module`, Node ≥ 20), `tsup.config.ts`, `src/index.ts`
- [x] `apolyx init`: detect package manager (lockfile), detect Next / Vite + `tsconfig` paths, prompt for aliases + theme, write `apolyx.json`, install `utils` + chosen theme CSS, inject `@import` into the CSS file, install base deps
- [x] `apolyx add <name...>`: resolve `registryDependencies` (topological, de-duplicated), rewrite kit-relative imports to consumer aliases, write files (prompt before overwrite; `--overwrite`, `--yes`), install npm deps with the detected package manager, print summary
- [x] `apolyx list`: names + descriptions from `index.json`
- [x] Registry source resolution: `--registry <path>` flag › `apolyx.json` › env `APOLYX_REGISTRY` › default (monorepo path during dev)
- [x] Vitest: import rewrite, dependency resolution order, overwrite guard, config read / write (temp dirs)
- [x] Root script `"cli:apolyx": "pnpm --filter apolyx"` for local runs

## Verify

```bash
pnpm --filter @altr/apolyx build          # dist/r/*.json produced, validator passes
pnpm --filter apolyx test
pnpm --filter apolyx build
# smoke in a throwaway Next app outside the repo:
npx create-next-app@latest /tmp/apolyx-smoke --ts --tailwind --app --no-src-dir --yes
cd /tmp/apolyx-smoke && node <repo>/elements/apolyx-cli/dist/index.js init --registry <repo>/elements/ui-kit/dist/r
node <repo>/elements/apolyx-cli/dist/index.js add button dialog line-chart
npm run build
```

## Done when

- [x] `init` + `add button` work end-to-end in a fresh Next app, and the app builds
- [x] Added files contain no `@altr/*` imports and no Radix
- [x] **Handoff:** run `update_docs` → docs_man adds the registry + CLI as-built note

### Smoke record (Apolyx-S0001)

`%TEMP%\apolyx-smoke` (create-next-app, no `src/`, Tailwind v4): `init --yes` → `add button dialog line-chart` (+ overlays / `theme-provider` / `power-blue` on re-run) → `npm run build` OK. Details: [[../../tech_space/ui-kit/04-registry-and-cli]].
