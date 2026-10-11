---
title: "Phase 5 — motion recipes"
description: "Motion tokens in TS, FadeIn retokenized, Stagger, Pressable, HoverLift — all reduced-motion aware"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - motion
---

# Phase 5 — motion recipes

> Who: apollo. Motion is first-class in Apolyx: small, consistent, and off when the user asks for reduced motion.

Sprint index: [[README]] · Intent: [[../../feature_list/ui-kit/00-intent#Motion recipes (wave 1)]]

**Depends on:** phase 2 (motion tokens) · **Skills:** `animate` + `fixing-motion-performance` (+ `animation-vocabulary` when naming feels)

## Tasks

- [x] `src/motion/tokens.ts`: `durations` (`fast` 0.12s, `base` 0.2s, `slow` 0.4s) and `easings` (`out`, `inOut`, `spring` config) mirroring the CSS motion tokens from phase 2 — one source of numbers, documented in both places
- [x] `src/motion/use-reduced-motion.ts`: re-export / wrap Motion's `useReducedMotion`
- [x] Move `src/components/motion.tsx` → `src/motion/fade-in.tsx`; use tokens; under reduced motion render final state with opacity only (no `y`)
- [x] `Stagger` + `StaggerItem`: parent orchestrates children with `staggerChildren`; `as` prop for `ul` / `div`
- [x] `Pressable`: scale-down on press (`whileTap`), keyboard press parity (Space / Enter), works with `asChild` via Apolyx `Slot`
- [x] `HoverLift`: subtle translate + shadow token change on hover / focus-visible; disabled for coarse pointers
- [x] Only animate `transform` and `opacity` (no layout-thrashing properties)
- [x] Export from `@altr/apolyx` and a `@altr/apolyx/motion` subpath; keep `motion` re-export for apps
- [x] Stories: each recipe, plus a toggle that forces reduced motion
- [x] Use `Pressable` behavior inside `Button` only if it stays subtle — decide in review, note the decision here

## Verify

```bash
pnpm --filter @altr/apolyx typecheck
pnpm storybook:ui-kit        # OS "reduce motion" on → recipes do not translate / scale
```

## Done when

- Four recipes exported with stories
- Reduced motion verified manually and noted in the story docs
