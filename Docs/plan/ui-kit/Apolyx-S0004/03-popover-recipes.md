---
title: "Phase 3 — Popover recipes"
description: "Docs and Storybook demos for all 15 Shadcn Studio popover kinds, composed from Apolyx parts"
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - ui-kit
  - apolyx
  - overlays
  - docs
  - Apolyx-S0004
---

# Phase 3 — Popover recipes

> Who: apollo. Demos only. If a recipe seems to need a new component, it is out of this sprint.

Sprint index: [[README]] · Inventory: [[../../../feature_list/ui-kit/05-apolyx-s0004-popover#Reference inventory]]

Copy is Apolyx's (short, concrete). Do not paste Shadcn Studio marketing sentences, remote avatar URLs, or the Himalayas stock photo. Use initials in `AvatarFallback`, a local or token-colored block where the reference used a photo, and a generated QR-sized placeholder (a bordered box with a `Text` label) for the coupon.

## Page categories (`components/popover.mdx`)

1. **Basics** — click open, title + description, close button, controlled
2. **Placement** — four sides, three aligns, `PopoverAnchor` on a separate node
3. **Motion** — `pop` (default), `slide` from the left, `slide` from the bottom, `fade`, and a note that reduced motion is always fade
4. **Panels** — the content kinds below
5. **With other layers** — inside a Dialog; trigger is an `InputGroupAddon` button on the Input Group page (a section, not a new page)
6. **When to use what** — Tooltip (hint) · Dropdown Menu (actions) · Popover (interactive panel) · Dialog (blocking) · Sheet (edge panel)

## Panels

| Category demo | Built from | Motion |
|---------------|------------|--------|
| Ratings | `warning` star, `Badge`, div bars (`width` as a percent) | `pop` |
| Dimensions | `Label` + `Input` rows | `pop` |
| Pricing | title, price, `Badge` tone destructive for the offer | `pop` |
| Volume | `Label`, `<output>`, `input type="range"` | `pop` |
| About | `PopoverTitle`, `PopoverDescription`, link `Button` | `pop` |
| Download | controlled `open`, `Spinner`, div bar, Pause / Cancel | `pop` |
| Delete | centered copy, secondary Cancel, destructive confirm. Buttons call `onOpenChange(false)`; they do not delete anything | `pop` |
| Feedback | `Textarea`, Send, Cancel | `pop` |
| Filter | `Checkbox` list, range, Reset | `pop` |
| User search | `Input`, local filter, `Avatar` + fallback initials, empty state | `pop` |
| Notifications | three static rows, unread dot via `bg-primary` | `pop` |
| Media preview | `p-0`, text column, token-colored media block | `pop` |
| Coupon | code field, copy button writes a constant, check icon for 1.5s | `slide`, `side="left"` |
| Share | email `Input`, `Button`, member list with `Checkbox` | `slide`, `side="bottom"` |
| Profile | `Avatar`, name, handle, one-line bio, two counts | `pop` |

Hover gets its own Basics demo (a trigger that opens on hover with a short paragraph and a link), so the reference's hover behavior is visible without a Hover Card component.

## Tasks

- [x] Storybook stories for placement, the three motion values, and each panel
- [x] MDX categories above, each preview using kit components only
- [x] Input Group docs: one "Popover addon" example (a button addon that opens a small dimensions or filter popover)
- [x] "When to use what" table on the Popover page

## Done when

- Every inventory row marked Recipe has a visible demo
- No demo imports a new dependency or a component this sprint said not to build
