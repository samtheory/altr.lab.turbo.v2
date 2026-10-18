---
title: "Apolyx overlays — Dialog, DropdownMenu, Tabs, Tooltip, Toast"
description: "As-built wave 1b overlays for Apolyx-S0001: layer stack, floating position, tests, stories. Popover (S0004) extends this stack."
created: 2026-10-11
updated: 2026-10-18
tags:
  - tech-space
  - ui-kit
  - apolyx
  - Apolyx-S0001
  - overlays
  - a11y
---

# Apolyx overlays (wave 1b)

> Who: implementers and reviewers. Code truth for sprint **Apolyx-S0001** phase 7. Plan: [[../../plan/ui-kit/Apolyx-S0001/07-wave-1b-overlays]]. **Popover** (S0004) reuses Portal / Presence / DismissableLayer / FocusScope / `useFloating` — see [[09-s0004-popover]].

## Layer stack

`DismissableLayer` (`elements/ui-kit/src/primitives/dismissable-layer.tsx`) keeps a module-level stack ordered by nesting **depth** (via `LayerDepthContext`, which crosses portals) then mount **seq**. Escape and outside pointer-down hit the top layer only.

| Prop | Behavior |
|------|----------|
| `disableOutsideDismiss` | Escape still closes; outside pointer-down ignored (AlertDialog) |
| `passive` | Closes on outside pointer-down without blocking lower layers (Tooltip) |
| `ignoreRefs` | Treated as inside (e.g. the trigger) |
| `disableOutsidePointerEvents` | Sets `body { pointer-events: none }` while mounted; layer itself is `pointer-events: auto` |

`getDismissableLayerCount()` is exported for tests.

## Floating position

`useFloating` wraps `computePosition` (side / align / flip) and recomputes on resize, scroll, and `ResizeObserver`. Content starts at `opacity: 0` until measured so it can still take focus on first paint.

## Components

| Component | Path | Notes |
|-----------|------|-------|
| Dialog + AlertDialog | `src/components/ui/dialog.tsx` | Portal → overlay + flex centering → layer around the panel only. Presence drive Motion enter/exit; reduced motion = opacity only. FocusScope + scroll lock. Trigger / Close support `asChild`. |
| DropdownMenu | `src/components/ui/dropdown-menu.tsx` | Menu button pattern: open keys, arrows, typeahead, checkbox / radio items. `onSelect` receives a cancelable `Event`. |
| Tabs | `src/components/ui/tabs.tsx` | `activationMode` automatic \| manual; trigger / panel ids; Motion `layoutId` indicator. |
| Tooltip | `src/components/ui/tooltip.tsx` | Provider delay + warm-up window; passive layer; `aria-describedby`. |
| Toast | `src/components/ui/toast.tsx` | Framework-free store + `useSyncExternalStore`; `Toaster` region (F8); pause on hover/focus; swipe dismiss. |

## Tests and stories

Vitest: Dialog (trap, Escape, outside, AlertDialog), DropdownMenu, Tabs (automatic / manual / controlled), Tooltip, Toast, expanded DismissableLayer. Storybook: per-component stories plus `Foundations/Layers` (dialog → menu → toast, tooltip on dialog trigger). Overview ships a `Toaster`.

## Fix found in verify

`ApolyxProvider` previously initialized family from `localStorage` on the first client render while SSR used `defaultTheme`. That hydration mismatch left a stale `aria-checked` on the previous radio when `setState` was a no-op. Fixed: always init from `defaultTheme` / `themeProp`, sync storage in `useEffect`. The no-flash script still sets `data-theme` before paint.
