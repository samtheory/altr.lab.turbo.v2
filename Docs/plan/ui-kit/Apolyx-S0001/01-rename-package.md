---
title: "Phase 1 — rename @altr/ui-kit to @altr/apolyx"
description: "Mechanical package rename across the monorepo, plus kit metadata and README"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - rename
  - Apolyx-S0001
---

# Phase 1 — rename `@altr/ui-kit` to `@altr/apolyx`

> Who: apollo, first task of the sprint. One mechanical commit; no feature work mixed in.

Sprint index: [[README]] · Intent: [[../../../feature_list/ui-kit/00-intent#Package name — decided: folder `ui-kit`, package `@altr/apolyx`]]

**Depends on:** nothing · **Skills:** `graft` (optional, for orientation)

## Tasks

- [x] `elements/ui-kit/package.json`: `name` → `@altr/apolyx`, add `"description": "Apolyx — altr.lab UI kit"` and `"keywords": ["ui-kit", "design-system"]`; keep `private: true`
- [x] Replace `@altr/ui-kit` with `@altr/apolyx` in every non-Docs file (list from `rg -l "@altr/ui-kit" -g "!Docs/**" -g "!pnpm-lock.yaml"`):
  - [x] App `package.json` deps: `hub`, `web`, `dashboard`, `trading-ui`
  - [x] `next.config.ts` `transpilePackages`: `hub`, `web`, `dashboard`, `trading-ui`
  - [x] `globals.css` imports in every app
  - [x] Layout / page imports in every app (incl. `apps/hub/src/app/docs-preview/page.tsx`)
  - [x] Kit internals: `src/styles/globals.css` comment, `src/theme/index.ts` comment, `card.stories.tsx`
  - [x] Root `package.json` scripts: `storybook:ui-kit` / `build:storybook:ui-kit` filters → `@altr/apolyx` (keep script names)
  - [x] READMEs: root, `apps/hub`, `elements/ui-kit`; hub content `apps/hub/content/stack.md`
- [x] `elements/ui-kit/README.md` first line: "Apolyx UI kit"
- [x] `pnpm install` to refresh the lockfile and workspace links
- [x] Update Docs references that describe **current** code (Altr.lab structure / commands / stack) — leave historical tech_space notes as written, add a one-line "renamed to `@altr/apolyx` on …" note at top

## Verify

```bash
rg "@altr/ui-kit" -g "!Docs/**" -g "!pnpm-lock.yaml"   # expect no hits
pnpm install
pnpm typecheck
pnpm --filter @altr/hub build
pnpm storybook:ui-kit                                   # opens on :6006
```

**Verify results (2026-10-11):** no code hits for `@altr/ui-kit`; `pnpm install` + `pnpm typecheck` + hub build pass. Storybook smoke deferred to phase 2 switcher work (same package filter).

## Done when

- No code reference to `@altr/ui-kit` remains
- Every app typechecks and `hub` builds
- Storybook starts
