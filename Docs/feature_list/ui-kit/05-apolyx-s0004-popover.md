---
title: "Apolyx-S0004 wave — Popover family"
feature_id: apolyx-F0006
description: "Intent for the fourth Apolyx wave: an owned Popover primitive, origin-aware motion, and docs recipes for every Shadcn Studio popover kind"
created: 2026-10-18
updated: 2026-10-18
tags:
  - feature
  - ui-kit
  - apolyx
  - Apolyx-S0004
  - overlays
  - popover
  - motion
---

# Apolyx-S0004 wave

> Who: anyone deciding what Apolyx covers after S0003. This is **intent** (acceptance ticked 2026-10-18). Sprint cards: [[../../plan/ui-kit/Apolyx-S0004/README]] · As-built: [[../../tech_space/ui-kit/09-s0004-popover]].

Umbrella intent: [[00-intent]]. Constraints carry over unchanged: no Radix / Base UI, semantic tokens only, 3 families × light / dark, reduced motion respected, every component ships Storybook + MDX + registry, no new runtime dependencies.

## Why

1. **Popover is the open overlay gap.** Dialog, Dropdown Menu, Tooltip, Sheet, and Toast exist. A click-or-hover panel with interactive content (a form, a filter, a preview) does not. S0002 and S0003 both deferred it ([[01-apolyx-s0001-carryovers]]).
2. **Several later inputs wait on it.** An input-group addon that opens a panel, and later date / color pickers, need this primitive. This sprint ships the primitive and the addon recipe. It does not ship Select, Combobox, or those pickers.
3. **The reference is a catalog of panels, not fifteen components.** [Shadcn Studio Popover](https://shadcnstudio.com/docs/components/popover?base=base) shows 15 variants on one popover: 12 content layouts and 3 motion treatments (slide from the left, slide from the bottom, zoom). We cover every kind in the Apolyx look and with Apolyx motion.

## What we build

### 1. Popover primitive

Owned parts, composed like Dialog: `Popover`, `PopoverTrigger`, `PopoverAnchor`, `PopoverContent`, `PopoverClose`, `PopoverTitle`, `PopoverDescription`.

| Behavior | Target |
|----------|--------|
| Open | Click by default. `trigger="hover"` opens after a short delay and stays open while the pointer crosses the gap into the panel. Focus opens immediately either way |
| Place | `side` top / right / bottom / left, `align` start / center / end, flip and shift with the existing `computePosition` |
| Focus | Non-modal dialog: focus moves in, returns to the trigger on close, Esc closes, outside pointer closes, only the top `DismissableLayer` dismisses |
| Content | Anything interactive: inputs, buttons, links. Not a menu (that stays `DropdownMenu`) and not a hint (that stays `Tooltip`) |

### 2. Motion

One `motion` prop on `PopoverContent`, driven by Motion and the existing duration / easing tokens. The panel scales and slides **from the trigger edge**, never from its own center, and never from `scale(0)`.

| `motion` | What it feels like | Covers |
|----------|--------------------|--------|
| `pop` (default) | Fade, scale `0.95 → 1`, 8px slide along the resolved side, ~160ms | The reference primitive, and the profile card that the reference zooms from zero |
| `slide` | No scale. ~80px travel along `side`, 400ms | Reference “slide-in from left” and “slide-in from bottom” |
| `fade` | Opacity only | Reduced motion for every mode, and an explicit quiet option |

### 3. Docs recipes

One Popover page. Each reference variant is a demo composed from kit parts, grouped into categories. No fifteenth component, no copied studio source, no hard-coded amber / red.

## Reference inventory

**Have** = already in code · **Build** = new kit API this sprint · **Recipe** = docs demo composed from kit parts · **Skip** = out of scope.

| # | Reference | Decision |
|---|-----------|----------|
| — | Radix / Base UI popover primitive | Skip. Build on Portal, Presence, DismissableLayer, FocusScope, `useFloating` |
| — | Default enter: fade + zoom-95 + 8px side slide, origin at the trigger | Build as `motion="pop"` |
| 01 | Ratings and reviews | Recipe. Star summary uses the `warning` token. Bars are plain divs — no Progress component |
| 02 | Dimensions form | Recipe. `Label` + `Input` grid inside the panel |
| 03 | Pricing details | Recipe. Title, price, `Badge` |
| 04 | Volume | Recipe. Styled `input type="range"` plus an `<output>`. A real Slider stays deferred |
| 05 | About / learn more | Recipe. Title, description, link button |
| 06 | Download progress | Recipe. Controlled `open`, `Spinner`, a div bar, pause / cancel |
| 07 | Delete file | Recipe. Lightweight confirm. A blocking confirm stays `AlertDialog` |
| 08 | Feedback | Recipe. `Textarea` + send / cancel |
| 09 | Filter | Recipe. `Checkbox` list + range. Not a Select |
| 10 | User search | Recipe. Local filter over a static list. Not a Combobox (no listbox keyboard contract) |
| 11 | Notifications | Recipe. Avatar rows |
| 12 | Media preview | Recipe. Flush padding, text beside an image |
| 13 | Slide-in from left (coupon, copy code) | Recipe content + `motion="slide"` `side="left"` |
| 14 | Slide-in from bottom (share invite) | Recipe content + `motion="slide"` `side="bottom"` |
| 15 | Zoom-in profile (`zoom-in-0`, `origin-center`, 400ms) | Recipe content + `motion="pop"`. The zoom-from-zero treatment is not shipped |
| — | Hover trigger, anchor, popover inside a dialog | Build (trigger mode, `PopoverAnchor`, nested-layer story) |
| — | Input-group popover addon | Recipe on the existing Input Group page |
| — | Hover Card as its own component | Skip. Hover is `trigger="hover"` on Popover |
| — | Select, Combobox, date picker, color picker, phone input | Skip. Still in [[01-apolyx-s0001-carryovers]] |

## Acceptance

- [x] `Popover` and its parts exported from `@altr/apolyx`, with Storybook, tests, an MDX page, and a registry item
- [x] `motion` is `pop` | `slide` | `fade`; reduced motion is opacity only for all three
- [x] The Popover docs page has a demo for every row in the inventory that says Recipe
- [x] Keyboard: click / Enter / Space open, Esc closes, focus returns to the trigger; a popover inside a dialog does not dismiss the dialog
- [x] No Radix, no Base UI, no new runtime dependency
- [x] Select, Combobox, Slider, date picker, and color picker are still absent

Shipped 2026-10-18. As-built: [[../../tech_space/ui-kit/09-s0004-popover]].

## Links

- Sprint: [[../../plan/ui-kit/Apolyx-S0004/README]] (closed)
- Reference: [Shadcn Studio Popover](https://shadcnstudio.com/docs/components/popover?base=base) (inspiration only)
- As-built: [[../../tech_space/ui-kit/09-s0004-popover]] · overlays base: [[../../tech_space/ui-kit/03-overlays]]
- Carry-over this picks up: [[01-apolyx-s0001-carryovers]]
