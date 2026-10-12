---
title: "Phase 3 — Apolyx primitives (no Radix)"
description: "Own Slot, ref/id/state hooks, focus scope, dismissable layer, portal, roving focus; remove @radix-ui/react-slot"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - primitives
  - a11y
---

# Phase 3 — Apolyx primitives (no Radix)

> Who: apollo. These are the behavior building blocks every interactive component uses. They are headless: no styles, no tokens.

Sprint index: [[README]] · Intent: [[../../../feature_list/ui-kit/00-intent#Migration note from current code]]

**Depends on:** phase 1 (can run in parallel with phase 2) · **Skills:** `vercel-composition-patterns` + `fixing-accessibility`

## Layout

New folder `elements/ui-kit/src/primitives/`, one file per primitive, exported from `@altr/apolyx/primitives` (add to `package.json` `exports`).

## Tasks

### Test setup

- [x] Add `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` as kit devDependencies; `vitest.config.ts`; script `"test": "vitest run"`
- [x] Add `test` task to `turbo.json`

### Primitives

| File | What it does | Tests |
|------|--------------|-------|
| `slot.tsx` | `Slot` + `Slottable`: merges props onto the single child; concatenates `className`, chains event handlers (child first, skip ours if `defaultPrevented`), merges `style`, composes refs | prop merge, handler order, ref composition |
| `compose-refs.ts` | `composeRefs(...refs)` / `useComposedRefs` (handles callback refs + cleanup functions in React 19) | both ref kinds |
| `use-controllable-state.ts` | `value` / `defaultValue` / `onChange` in one hook | controlled vs uncontrolled |
| `use-id.ts` | Thin `React.useId` wrapper with optional explicit id | — |
| `portal.tsx` | `Portal` into `document.body` or a `container`; SSR safe (mounts after hydration) | renders into container |
| `presence.tsx` | Keeps content mounted until exit animation ends (works with Motion `AnimatePresence` or CSS) | unmount after exit |
| `focus-scope.tsx` | Trap + loop focus inside a container, auto-focus first tabbable on mount, restore focus on unmount | Tab / Shift+Tab loop, restore |
| `dismissable-layer.tsx` | Calls `onDismiss` on Escape and pointer-down outside; supports nested layers (only top layer dismisses) | Esc, outside click, nesting |
| `roving-focus.tsx` | Roving `tabindex` group: arrow keys, Home / End, orientation, loop, typeahead option | arrows, Home/End, disabled skip |
| `scroll-lock.ts` | Lock body scroll while a modal is open, compensating scrollbar width | — |
| `visually-hidden.tsx` | Screen-reader-only content | — |
| `position.ts` | Anchor positioning for floating content: side / align / offset, flip on collision, update on scroll + resize | flip logic (pure function) |

- [x] Implement each file above with its tests
- [x] `position.ts`: implement in-house (small, pure math + `ResizeObserver`); revisit only if overlays in phase 7 prove it insufficient — do **not** add Radix / Base UI / Floating UI React wrappers without a note in this card

### Radix removal

- [x] `Button`: import Apolyx `Slot`; keep `asChild`
- [x] Remove `@radix-ui/react-slot` from `package.json`; `pnpm install`

## Verify

```bash
rg "@radix-ui|@base-ui" elements apps     # expect no hits
pnpm --filter @altr/apolyx test
pnpm --filter @altr/apolyx typecheck
```

Storybook: `Button` with `asChild` around an `<a>` still renders and keeps focus ring.

## Done when

- All primitives above exist with passing tests
- Zero Radix / Base UI in the dependency tree of `@altr/apolyx`
