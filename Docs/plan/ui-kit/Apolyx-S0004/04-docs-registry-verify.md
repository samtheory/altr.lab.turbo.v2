---
title: "Phase 4 — Docs, registry, verify"
description: "Popover MDX page, package exports, registry item, tests, typecheck, and light/dark screenshots for Apolyx-S0004"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - ui-kit
  - apolyx
  - docs
  - registry
  - Apolyx-S0004
---

# Phase 4 — Docs, registry, verify

> Who: apollo. Wire the primitive and the recipes into the docs app and the registry, then prove the kit still builds.

Sprint index: [[README]]

## Docs app (`apps/apolyx`)

Add **Popover** to the **Components** group in `src/docs-config.ts`, directly after **Dropdown Menu**, with status `new`.

| | |
|--|--|
| Slug | `components/popover` |
| Title | Popover |
| Description | Interactive panel anchored to a trigger, with pop, slide, and fade motion. |

The page sections are the categories in [[03-popover-recipes]]. Props table covers `trigger`, `side`, `align`, `sideOffset`, `motion`, `open` / `onOpenChange`.

## Package and registry

- Export the parts from the kit barrel and add registry item `popover` (files: `popover.tsx` only, unless card 2 extracts a pure helper — if so, that helper is part of the same item, not a second registry entry).
- Dependencies already in the kit: `motion`, the primitives. Do not list Radix.
- CLI smoke, from a temp Next app: `apolyx add popover` builds. Workspace apps keep the workspace import; do not `apolyx add` inside the monorepo.

## Verify

```bash
pnpm --filter @altr/apolyx test
pnpm --filter @altr/apolyx typecheck
pnpm --filter @altr/apolyx build
pnpm --filter apolyx exec tsc --noEmit
```

Manual: keyboard-only pass on the Popover story (open, tab to a field, Esc, focus back on the trigger). Repeat with a popover opened from inside a dialog. Toggle OS reduced motion and confirm the panel fades with no slide or scale.

Screenshots, light and dark, saved under `Docs/report/assets/apolyx-s0004/`:

- Popover page with the default `pop` panel open
- A `slide` demo open (coupon or share)
- One rich panel (notifications or filter)

## Tasks

- [x] Sidebar entry, MDX page, props table
- [x] Barrel export + registry manifest
- [x] Tests from cards 1–2 still green; typecheck and registry build green
- [x] Screenshots in `Docs/report/assets/apolyx-s0004/`

## Done when

- `/docs/components/popover` renders every category
- `popover` appears in `apolyx list` / the registry index
- The three screenshots exist and show an open panel
