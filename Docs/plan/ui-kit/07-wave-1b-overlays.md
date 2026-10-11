---
title: "Phase 7 — wave 1b overlays and navigation"
description: "Dialog, DropdownMenu, Tabs, Tooltip, Toast built on Apolyx primitives"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - components
  - overlays
  - a11y
---

# Phase 7 — wave 1b overlays and navigation

> Who: apollo. The hard-behavior components. Each one is a composition of phase 3 primitives plus phase 5 motion; if a primitive is missing a feature, fix the primitive, not the component.

Sprint index: [[README]] · Intent: [[../../feature_list/ui-kit/00-intent#Overlay / navigation (wave 1b — after focus helpers)]]

**Depends on:** phases 3, 4, 5 · **Skills:** `fixing-accessibility` + `vercel-composition-patterns` (+ `animate`)

Follow the WAI-ARIA Authoring Practices pattern named in each row.

| Component | Parts | Built from | ARIA pattern / keys |
|-----------|-------|-----------|---------------------|
| Dialog | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` | Portal, Presence, FocusScope, DismissableLayer, ScrollLock | Dialog (modal): `role="dialog"`, `aria-modal`, labelled by title, Esc closes, focus returns to trigger; also `AlertDialog` variant (no outside dismiss) |
| Dropdown Menu | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup` / `Item`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut` | Portal, Presence, DismissableLayer, RovingFocus, position | Menu button: Enter / Space / ArrowDown open, arrows move, typeahead, Esc closes, Tab closes. Submenus deferred |
| Tabs | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | RovingFocus, controllable state | Tabs: `role="tablist"` / `tab` / `tabpanel`, automatic or manual activation, horizontal / vertical; animated active indicator (Motion `layoutId`) |
| Tooltip | `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent` | Portal, Presence, position | Tooltip: shows on hover after delay and on focus, Esc hides, `aria-describedby`; shared delay group via provider; never the only way to get information |
| Toast | `Toaster`, `toast()` API (`toast.success` / `error` / `promise`), `dismiss` | Portal, Presence, Motion | Live region (`role="status"` / `aria-live="polite"`, errors `assertive`); queue with max visible; pause on hover / focus; swipe to dismiss on touch; F8 hotkey focuses region |

## Tasks

- [x] Dialog + AlertDialog with tests (focus trap, Esc, outside click, focus restore)
- [x] Dropdown Menu with tests (open keys, arrow nav, typeahead, checkbox / radio state)
- [x] Tabs with tests (arrow nav, activation modes, controlled)
- [x] Tooltip with tests (delay, focus show, Esc)
- [x] Toast store (framework-free module + `useSyncExternalStore`) and `Toaster` with tests (queue, dismiss, promise states)
- [x] Enter / exit animations with Motion via `Presence`; under reduced motion use opacity only
- [x] Stories for each, including nested case: Dropdown inside Dialog, Tooltip on a Dialog trigger
- [x] Add `Toaster` to the Overview story

## Verify

```bash
pnpm --filter @altr/apolyx test
pnpm --filter @altr/apolyx typecheck
pnpm build:storybook:ui-kit                # a11y addon clean
```

Manual: keyboard-only walk through every overlay story; screen reader smoke (NVDA or Narrator) on Dialog and Toast.

## Done when

- Five overlay / navigation components exported with stories and tests
- Nested-layer story behaves (only the top layer dismisses on Esc)
