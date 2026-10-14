---
title: "Phase 9 — Docs, registry, verify"
description: "Forms sidebar group, categorized MDX pages, exports, registry manifests, tests, typecheck, screenshots for Apolyx-S0003"
created: 2026-10-14
updated: 2026-10-14
tags:
  - plan
  - ui-kit
  - apolyx
  - docs
  - registry
  - Apolyx-S0003
---

# Phase 9 — Docs, registry, verify

> Who: apollo. Wire everything into the docs app and registry, then prove it builds.

Sprint index: [[README]]

## Docs app (`apps/apolyx`)

### Sidebar — new **Forms** group in `src/docs-config.ts`

Placed after **Components**. The sidebar groups are collapsible and open by default ([[../../../tech_space/ui-kit/05-docs-app#Sidebar groups]]), so a longer list is fine.

| Order | Page | Slug | Status badge |
|-------|------|------|--------------|
| 1 | Field | `components/field` | — (moved) |
| 2 | Input | `components/input` | — (moved) |
| 3 | Input Group | `components/input-group` | new |
| 4 | Password Input | `components/password-input` | new |
| 5 | Number Input | `components/number-input` | new |
| 6 | Input OTP | `components/input-otp` | new |
| 7 | Input Mask | `components/input-mask` | new |
| 8 | Textarea | `components/textarea` | — (moved) |
| 9 | Checkbox | `components/checkbox` | — (moved) |
| 10 | Switch | `components/switch` | new (family) |
| 11 | Label | `components/label` | — (moved) |
| 12 | Form patterns | `forms/patterns` | new |

Slugs of moved pages stay `components/*` so registry `docs` links and external links keep working. Remove the moved items from the **Components** group.

### Category convention for pages

Every page touched this sprint follows the same shape:

1. Title, description, first `ComponentPreview` (the hero example)
2. Installation (`InstallTabs`), Usage
3. **Category sections** (H2) as listed in each card, each with one or more previews
4. Accessibility · Props

The right-hand "On this page" TOC then lists the categories, which gives the "sections" navigation inside a page.

### Demo naming

`src/demos/<component>-<example>-demo.tsx`, registered in `src/demos/index.ts`, grouped by component with a comment line per category.

## Kit

- [x] Exports in `src/index.ts` for every new component, type, hook and helper (`useMask`, `masks`, `detectCardBrand`, `defaultPasswordRules`)
- [x] Registry manifests: new `input-group`, `password-input`, `number-input`, `input-otp`, `input-mask`; updated `switch` (physics + switch-field), `field` (control-box, field-set, counter), `input`, `textarea`, `button` (xs sizes)
- [x] Each manifest `docs` field points at an existing page

Extra manifest: `mask` (type `lib`, `src/lib/mask.ts`) — the CLI writes every file of an item under one alias, so the engine ships as its own lib item that `input-mask` depends on.

## Verify (run and paste results into the handoff)

- [x] `pnpm --filter @altr/apolyx test` — 30 files, **141 tests** passed
- [x] `pnpm --filter @altr/apolyx typecheck` — clean
- [x] `pnpm --filter @altr/apolyx build` — `Registry OK — wrote 66 items to dist/r (imports resolved)`
- [x] `apps/apolyx`: `npx tsc --noEmit -p .` clean; `node scripts/copy-registry.mjs` copied to `public/r`
- [x] CLI smoke: `apolyx add input-group password-input number-input input-otp input-mask switch --overwrite` into `%TEMP%\apolyx-smoke` (+10 deps, `lib/mask.ts` under `lib/`); `/forms` page using all of them → `npm run build` OK (Next 16.4); no `@radix-ui` / `@base-ui` / `input-otp` / `react-imask` in installed files
- [x] Screenshots (headless Edge, 1280 px; theme set through `localStorage` in a shared profile) in `Docs/report/assets/apolyx-s0003/`: `switch-default-dark.png`, `switch-power-blue-light.png`, `input-group-default-light.png`, `input-otp-default-light.png` (verification code hero), `form-patterns-dark.png` (Forms sidebar group + patterns page)
- [x] Reduced-motion check: emulated `prefers-reduced-motion: reduce` → OTP caret `animation-name: none`; Switch reads `useReducedMotion()` and skips spring / stretch (physics covered by `switch-physics.test.ts` "is rigid under reduced motion")

## Done when

Forms group is live with all twelve pages; every page uses categories; all commands above are green.
