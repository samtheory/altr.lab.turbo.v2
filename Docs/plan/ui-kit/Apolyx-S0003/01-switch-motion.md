---
title: "Phase 1 — Switch motion fix"
description: "Rework Switch physics: smooth press stretch, 30% stretch cap, no growth past the rail ends or into the current side, cleaner settle, progress-tinted track"
created: 2026-10-14
updated: 2026-10-14
tags:
  - plan
  - ui-kit
  - apolyx
  - motion
  - switch
  - Apolyx-S0003
---

# Phase 1 — Switch motion fix

> Who: apollo. Fix how the S0002 physics Switch feels. Keep its public API; card 2 extends it.

Sprint index: [[README]] · Code: `elements/ui-kit/src/components/ui/switch.tsx`

## What is wrong today (code truth)

| Symptom | Cause in `switch.tsx` |
|---------|------------------------|
| Thumb grows instantly on click | `onPointerDown` calls `place(startPos, dir)`, which does `width.set(g.thumb + stretch)`: a one-frame jump of `press` px (md: 6 px) |
| Thumb grows by more than half when dragged to an end | `stretch = g.press + min(over * 0.35, g.wall)`; md maximum is 6 + 5 = **11 px on a 20 px thumb (55%)** |
| Pushing past the end keeps growing | `over` is the distance past the rail, and it feeds `stretch` |
| Dragging the "wrong" way grows the thumb | The `dir < 0` branch with `l < 0` still sets `r = thumb + stretch`, so an off switch dragged left grows into the left wall |
| Release looks wobbly | Width spring `damping: 13` oscillates several times |

## Target behaviour

Definitions: `thumb` = thumb width (sm 16, md 20, lg 24 px). `travel` = rail length. `target side` = the side the thumb would move to if toggled (right when off, left when on).

1. **Press (pointer down, no movement yet).** The thumb stretches smoothly toward the target side, anchored on its current edge, by `pressStretch = round(thumb × 0.2)` (md 4 px), over ~120 ms (spring stiffness 700, damping 38, or a 120 ms ease-out tween). No width change happens on the same frame as the pointer down.
2. **Drag inside the rail.** Position follows the pointer. Stretch is driven by **pointer speed**, smoothed: `stretch = clamp(pressStretch + |v| × k, 0, maxStretch)`, with `v` a smoothed speed in px/ms (exponential smoothing, α ≈ 0.35) and `k` ≈ 6. The stretch grows in the direction of motion (leading edge leads, trailing edge stays under the finger). When the finger stops, the stretch relaxes back to `pressStretch` within ~150 ms.
3. **Hard cap.** `maxStretch = round(thumb × 0.3)` (sm 5, md 6, lg 7 px). Width is never more than `thumb + maxStretch` in any path.
4. **Approaching an end.** Stretch tapers to 0 over the last `thumb / 2` px of the rail, so the thumb arrives at its normal width.
5. **Past an end (pointer beyond the rail).** No extra width. Instead:
   - a rubber-band offset `2 × over / (over + 12)` px (so at most 2 px), and
   - a squash: width shrinks by up to 2 px (`thumb − 2 × over / (over + 12)`), anchored on the wall.
6. **Into the current side.** Dragging toward the side the thumb is already resting on (off and dragging left, on and dragging right) never grows the thumb; rule 5 applies.
7. **Reversal mid-drag.** Stretch follows the new direction of motion, still capped by rule 3; it does not jump. Direction changes only after 2 px of movement the other way (hysteresis), so jitter does not flip it.
8. **Release / click.** The thumb glides to the end with a spring that overshoots by ≤ 1 px (stiffness 560, damping 34, mass 0.6). While gliding, width eases from its current value to `thumb + pressStretch` and then back to `thumb`. On arrival, a landing squash runs as keyframes `[thumb, thumb − 1.5, thumb]` over 180 ms. No multi-bounce.
9. **Threshold and click detection** stay as in S0002: past half the rail commits; under 3 px of movement counts as a click.
10. **Track tint.** While dragging, the track color follows progress: `background: color-mix(in oklch, var(--input), var(--switch-tone) calc(var(--switch-progress) × 100%))`, with `--switch-progress` (0 to 1) set from the position motion value. When not dragging, the S0002 color transition stays.
11. **Reduced motion.** No stretch, squash or rubber band: position changes with a 120 ms opacity-safe tween, or instantly. Track tint is applied without animation.
12. **Keyboard (Space / Enter), controlled / uncontrolled, hidden form input** are unchanged.

## Tasks

- [x] Create `src/components/ui/switch-physics.ts` with geometry per size and a pure function:
  ```ts
  computeThumb({ desired, side, velocity, dir, size }): { left: number; width: number; progress: number }
  ```
  `side` is `"off" | "on"` (where the thumb rests). Implement rules 2–7 there.
- [x] `switch.tsx`: press animates width (rule 1), drag uses `computeThumb` per pointer move, release uses rule 8, keep `drag.current` / `suppressClick` logic.
- [x] Track velocity in the drag ref (`lastX`, `lastT`, smoothed `v`); use `e.timeStamp`.
- [x] Set `--switch-progress` with `useMotionValueEvent` (or a `useTransform` into a style var) on the track button.
- [x] Unit tests `switch-physics.test.ts`:
  - [x] width ≤ `thumb + maxStretch` for a sweep of `desired` from −40 to `travel + 40`, both `side`s, both `dir`s, velocities 0 to 5
  - [x] `desired < 0` with `side="off"` gives width ≤ `thumb` (no growth into the current side)
  - [x] `desired > travel` gives width ≤ `thumb` and `left` ≤ `travel + 2`
  - [x] width equals `thumb` at the two ends with velocity 0
- [x] Keep the existing `switch.test.tsx` (click, keyboard, controlled, drag commit) green; add a test that pointer down does not change the thumb's inline width on the same tick.
- [x] Story "Physics": add a debug toggle showing live `left`, `width`, `progress`.

## Done when

On all three sizes: a click stretches smoothly and glides; a slow drag never grows the thumb more than 30%; pushing past either end only squashes slightly; dragging into the side it rests on never grows it; reduced motion has no stretch. The physics tests pass.
