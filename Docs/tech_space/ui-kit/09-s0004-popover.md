---
title: "Apolyx-S0004 — Popover"
description: "As-built: owned Popover parts, click/hover trigger, origin-aware pop/slide/fade motion, docs recipes for every Shadcn Studio popover kind"
created: 2026-10-18
updated: 2026-10-18
tags:
  - tech-space
  - ui-kit
  - apolyx
  - Apolyx-S0004
  - overlays
  - popover
  - motion
---

# Apolyx-S0004 — Popover

> Who: implementers and reviewers. Code truth for sprint **Apolyx-S0004**. Intent: [[../../feature_list/ui-kit/05-apolyx-s0004-popover]] · Plan: [[../../plan/ui-kit/Apolyx-S0004/README]]. Extends the overlay stack in [[03-overlays]].

## What shipped

One Popover primitive in `elements/ui-kit/src/components/ui/popover.tsx`, exported from `@altr/apolyx`, with Storybook, Vitest, an MDX page, and registry item `popover`. Docs recipes cover every kind from the [Shadcn Studio Popover](https://shadcnstudio.com/docs/components/popover?base=base) catalog without cloning Radix or their zoom-from-zero profile.

| Count | After S0003 | After S0004 |
|-------|-------------|-------------|
| Registry items | 66 | **67** |
| Docs MDX pages | 48 | **49** |
| Vitest tests | 141 | **149** (8 new in `popover.test.tsx`) |

## Parts

| Part | Role |
|------|------|
| `Popover` | Root. `open` / `defaultOpen` / `onOpenChange`. `trigger?: "click" \| "hover"` (default `"click"`) |
| `PopoverTrigger` | Button by default; `asChild` via Slot. `aria-expanded` / `aria-controls` |
| `PopoverAnchor` | Optional position target when the trigger is not the anchor |
| `PopoverContent` | Portaled panel. `side`, `align`, `sideOffset` (8), `motion` |
| `PopoverTitle` / `PopoverDescription` | Wire `aria-labelledby` / `aria-describedby` |
| `PopoverClose` | Closes and restores focus to the trigger |

Content surface: `role="dialog"`, `aria-modal="false"`, default `w-72 rounded-lg border … bg-popover … shadow-md`.

## Layer and focus

Same stack as Dropdown Menu: Portal → Presence → `DismissableLayer` → `FocusScope` (`trapped={false}`, `restoreFocus={false}`) → Motion wrapper → dialog panel.

- Focus moves to the first tabbable (or the panel) on open; `close(true)` restores the trigger.
- Escape and outside pointer hit the **top** layer only (popover inside a dialog leaves the dialog open).
- Tab past the last control (or Shift+Tab before the first) closes the popover — non-modal behaviour.
- Trigger and anchor are `ignoreRefs` on the dismissable layer.

## Hover trigger

Open delay **120ms**. Close delay **150ms**, cancelled when the pointer enters the content so the pointer can cross `sideOffset`. Focus opens immediately; blur closes after 150ms unless focus moved into the content.

## Motion

`motion` on `PopoverContent`: `pop` (default) · `slide` · `fade`. `useReducedMotion()` forces `fade` for every mode. Only `opacity` and `transform`. Origin is the edge facing the trigger, from the **resolved** side (after flip) and align.

| Mode | Hidden | Duration |
|------|--------|----------|
| `pop` | opacity 0, scale 0.95, 8px toward the trigger | 0.16s, `easings.out` |
| `slide` | opacity 0, 80px toward the trigger, no scale | `durations.slow` (0.4s) |
| `fade` | opacity 0 | 0.16s |

`data-motion` and `data-side` are set on the panel for tests and demos. The reference profile that zoomed from `scale(0)` at the panel center is not shipped; that recipe uses `pop`.

Positioning: `useFloating` + `computePosition` (already returned the flipped `side`). Anchor selection: a getter ref that reads `anchorRef.current ?? triggerRef.current`.

## Docs and recipes

`apps/apolyx` page `components/popover` (sidebar: Components, after Dropdown Menu, status `new`). Categories: Basics, Placement, Motion, Panels, With other layers, When to use what.

Panel demos live in `popover-panels-demo.tsx` (ratings with `warning` bars, pricing, volume via native range, about, download with `Spinner`, delete confirm, feedback, filter, local people search, notifications, media preview, coupon + share with `motion="slide"`, profile, hover). Input Group page gained a **Popover addon** preview (`input-group-popover-demo`).

## Not in this sprint

Select, Combobox, Slider, date picker, color picker, phone country picker. Volume and filter use the styled native range. Search is a local filter, not a listbox.

## Verify

```bash
pnpm --filter @altr/apolyx test
pnpm --filter @altr/apolyx typecheck
pnpm --filter @altr/apolyx build
pnpm --filter apolyx exec tsc --noEmit
```

Screenshots in `Docs/report/assets/apolyx-s0004/`:

| File | Captures |
|------|----------|
| `popover-pop-dark.png` | Default `pop` motion, dark |
| `popover-pop-light.png` | Default `pop` motion, light (PowerBlue) |
| `popover-slide-dark.png` | `motion="slide"` demo |
| `popover-notifications-dark.png` | Notifications panel recipe |
