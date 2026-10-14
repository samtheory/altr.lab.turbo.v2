---
title: "Phase 3 — Switch physics"
description: "Draggable Switch thumb with directional stretch, end-of-rail bounce, and spring settle"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - motion
  - Apolyx-S0002
---

# Phase 3 — Switch physics

> Who: apollo. The Switch should feel like a physical slider, not a CSS toggle.

Sprint index: [[README]]

## Behavior

1. **Press** (pointer down): thumb stretches horizontally toward the side it will travel to (wider pill, anchored on the trailing edge).
2. **Drag**: thumb follows the pointer, clamped to the rail. The closer it gets to either end, the more it squashes against the rail ("hail of the slot").
3. **Release / click**: thumb springs to the target end, overshoots slightly (bounce), then returns to its normal size.
4. **Threshold**: past half of the rail commits the new state; a drag under ~3 px counts as a click.
5. **Keyboard** (Space / Enter) and controlled / uncontrolled state stay as in S0001.
6. **Reduced motion**: no stretch / overshoot; plain position change.

## Tasks

- [x] Rewrite `switch.tsx` with `motion/react` (`useMotionValue`, `animate` spring)
- [x] `size` prop `sm` / `md`
- [x] Keep hidden form input + `role="switch"`
- [x] Tests: click, keyboard, controlled, drag commit via pointer events
- [x] Story: "Physics" playground

## Done when

Dragging, clicking and keyboard all toggle; the thumb visibly stretches and bounces.
