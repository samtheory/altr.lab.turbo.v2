---
title: "Phase 2 — Popover motion"
description: "Origin-aware pop, slide, and fade for PopoverContent, using Apolyx motion tokens and reduced-motion opacity"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - ui-kit
  - apolyx
  - motion
  - overlays
  - Apolyx-S0004
---

# Phase 2 — Popover motion

> Who: apollo. Translate the [reference animation](https://shadcnstudio.com/docs/components/popover?base=base) into Motion. Do not add `tailwindcss-animate`, and do not animate from `scale(0)`.

Sprint index: [[README]] · Tokens: `elements/ui-kit/src/motion/tokens.ts` (`durations`, `easings`) · Neighbor: dropdown content in `dropdown-menu.tsx` (opacity, scale `0.97`, `y: -4`, 140ms, ease `[0.16, 1, 0.3, 1]`)

## `motion` on `PopoverContent`

Default is `pop`. Reduced motion (`useReducedMotion`) forces the `fade` values for every mode.

| | `pop` | `slide` | `fade` |
|---|-------|---------|--------|
| From | opacity `0`, scale `0.95`, 8px away from the resolved side | opacity `0`, scale `1`, **80px** away from the resolved side | opacity `0` |
| To | opacity `1`, scale `1`, translate `0` | opacity `1`, translate `0` | opacity `1` |
| Origin | Edge facing the trigger (below) | Same origin, unused visually because scale stays 1 | Center is fine |
| Duration | `0.16` s | `durations.slow` (`0.4`) | `0.16` s |
| Ease | `easings.out` | `easings.out` | `easings.out` |

Exit plays the same values in reverse. Presence already keeps the node mounted until the exit finishes.

**8px** is the reference primitive's `slide-in-from-*-2`. **80px** is the reference animated variants' `slide-in-from-*-20` (13 from the left, 14 from the bottom). One `slide` mode covers both; `side` chooses the direction. Do not add `slideLeft` / `slideBottom` props.

**Do not ship** reference 15: `zoom-in-0` / `zoom-out-0`, `origin-center`, 400ms. That profile recipe uses `pop`.

## Origin

Compute `transform-origin` from the **resolved** side and align, as percentages, so a flip still grows out of the trigger:

| Resolved side | Align start | Align center | Align end |
|---------------|-------------|--------------|-----------|
| bottom (panel below trigger) | `top left` | `top center` | `top right` |
| top | `bottom left` | `bottom center` | `bottom right` |
| right | `left top` | `left center` | `left bottom` |
| left | `right top` | `right center` | `right bottom` |

Translate axis: vertical for top/bottom, horizontal for left/right. Sign moves the hidden panel **toward** the trigger (a bottom panel starts 8px or 80px above its resting box).

Only `opacity` and `transform`. No width, height, or box-shadow animation.

## Tasks

- [x] `motion` prop implemented in `PopoverContent` with the table above
- [x] Story that forces reduced motion and one story per `motion` value on at least two sides
- [x] Test: reduced motion initial state has no scale and no translate; `pop` initial state includes scale `0.95`

## Done when

- Opening a popover reads as growing out of the control that opened it
- OS reduced motion shows a fade and no travel
