---
title: "Phase 1 — Popover primitive"
description: "Apolyx Popover parts: click and hover trigger, anchor, placement, non-modal focus, and dismiss on the existing layer stack"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - ui-kit
  - apolyx
  - overlays
  - a11y
  - Apolyx-S0004
---

# Phase 1 — Popover primitive

> Who: apollo. The behavior. Motion styling is card 2; the panel can enter with opacity only until that card lands.

Sprint index: [[README]] · Intent: [[../../../feature_list/ui-kit/05-apolyx-s0004-popover]] · Code to extend: `elements/ui-kit/src/primitives/` · Pattern neighbor: `src/components/ui/dropdown-menu.tsx`, `tooltip.tsx`, `dialog.tsx`

Follow the WAI-ARIA **dialog (non-modal)** pattern. This is not the menu-button pattern (Dropdown Menu) and not the tooltip pattern.

## Parts

| Part | Role |
|------|------|
| `Popover` | Root. `open` / `defaultOpen` / `onOpenChange`. `trigger?: "click" | "hover"` default `"click"` |
| `PopoverTrigger` | Button by default. `asChild` via Apolyx `Slot`. Sets `aria-expanded` and `aria-controls` |
| `PopoverAnchor` | Optional positioning element when the trigger is not the anchor. If omitted, the trigger is the anchor |
| `PopoverContent` | Portaled panel. `side`, `align`, `sideOffset` (default 8), `className`. `role="dialog"`, `aria-modal="false"` |
| `PopoverTitle` | `id` wired to `aria-labelledby` |
| `PopoverDescription` | `id` wired to `aria-describedby` |
| `PopoverClose` | Calls close. `asChild` |

Default surface, matching other overlays: `w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md`. Recipes override width with `className`.

## Open, focus, dismiss

| Case | Behavior |
|------|----------|
| Click trigger | Toggles. Enter and Space on a native button do the same |
| Hover trigger | Pointer enter on trigger opens after **120ms**. Pointer leave starts a **150ms** close timer, cancelled if the pointer enters the content (so it can cross `sideOffset`). Focus opens immediately; blur closes after the same 150ms unless focus moved into the content |
| Open | Move focus to the first tabbable in the content, or to the content itself if there is none |
| Esc | Closes the top layer only and returns focus to the trigger |
| Outside pointer | Closes. The trigger and the anchor are `ignoreRefs` |
| Close button | Closes and returns focus to the trigger |
| Tab | Tab that would leave the content closes the popover (non-modal). Shift+Tab off the first control does the same |
| Inside a Dialog | Popover stacks above the dialog. Esc / outside on the popover does not close the dialog |
| Controlled | `open` + `onOpenChange` never fight the user; hover timers do not reopen a controlled-closed panel |

Content starts at `opacity: 0` until `useFloating` has measured it, same as the other floating layers, so the first position is not a flash at `0,0`.

Placement uses `computePosition` (`side`, `align`, flip, viewport clamp). `PopoverContent` exposes the **resolved** side (after flip) for card 2's origin and slide direction.

## Tasks

- [x] `src/components/ui/popover.tsx` with the parts above
- [x] Tests: click toggle, Enter/Space, Esc restores focus, outside pointer, hover open delay and gap grace, controlled `open`, anchor positions against the anchor rather than the trigger, dialog nesting (top layer only)
- [x] Story: uncontrolled, controlled, four sides × three aligns, hover, anchor, inside Dialog

## Done when

- A keyboard user can open a popover, reach a control inside it, and land back on the trigger
- A popover inside a dialog dismisses alone
