---
title: "Apolyx-S0002 wave — contrast, navigation, physics Switch, Field, data"
feature_id: apolyx-F0003
description: "Intent and acceptance for the second Apolyx wave: dark-mode hover contrast, navigation shells, tactile Switch, Field layouts, Table / List / Grid"
created: 2026-10-11
updated: 2026-10-14
tags:
  - feature
  - ui-kit
  - apolyx
  - Apolyx-S0002
  - navigation
  - forms
  - data
---

# Apolyx-S0002 wave

> Who: anyone deciding what Apolyx covers after v1. This is **intent** with acceptance ticked against code. How it was built: [[../../tech_space/ui-kit/06-s0002-contrast-nav-switch-field-data]]. Sprint cards: [[../../plan/ui-kit/Apolyx-S0002/README]].

Umbrella intent: [[00-intent]]. Constraints carry over unchanged: no Radix / Base UI, semantic tokens only, 3 families × light / dark, reduced motion respected, every component ships Storybook + MDX + registry.

## Why

v1 shipped the infrastructure. The first real screens built on it hit four gaps:

1. **Hover feedback is weak in dark mode.** `hover:bg-primary/90` on a near-white primary is invisible.
2. **No navigation shells** — no sidebar drawer, breadcrumb, or top nav.
3. **Form fields are bare.** `Input` has no label layout, helper, or error wiring.
4. **No data display** beyond charts — no table, list, or grid.

The Switch also felt flat next to the Motion recipes; it should feel physical.

## What we build

### 1. Hover contrast (tokens)

Hover is a **token per theme family × mode**, not an opacity. New semantic tokens: `--primary-hover`, `--primary-glow`, `--secondary-hover`, `--destructive-hover`, `--accent-hover`, `--border-strong`. Button, DropdownMenu items, Tabs triggers, Switch track, Input / Field borders use them.

### 2. Navigation

| Need | Component |
|------|-----------|
| Modal | `Dialog` + `size` (`sm` … `full`) |
| Left / right sidebar drawer | `Sheet side="left" \| "right" \| "top" \| "bottom"` |
| Persistent sidebar links | `NavList` (groups, active bar) |
| Top nav with dropdown panels | `NavigationMenu` (hover intent) |
| Path | `Breadcrumb` |
| Tabs, menu | Existing `Tabs`, `DropdownMenu` (hover contrast only) |

### 3. Physics Switch

> **Follow-up:** in use, the S0002 stretch felt off: it grew too much, grew instantly on press, and grew past the ends. **Apolyx-S0003** reworked the motion and added the Switch family. Intent: [[04-apolyx-s0003-switch-inputs]] · As built: [[../../tech_space/ui-kit/08-s0003-switch-inputs#Switch physics]].

- Drag the thumb to toggle; past the midpoint commits, otherwise it snaps back.
- On press the thumb stretches toward the direction it will travel.
- On release it springs to the end, squashes on impact, bounces a little, and returns to normal width.
- Near the ends of the track it stretches against the wall (rubber band).
- Reduced motion: no stretch or bounce.
- Click / Space / Enter still toggle exactly once; `size` `sm` / `md`.

### 4. Field

`Field` wraps a control with label, description, and error, in three layouts:

| Layout | Label |
|--------|-------|
| `top` | Above the control |
| `floating` | Inside; shrinks onto the border while focused or filled |
| `inline` | Beside the control in a muted panel, separated by a border |

Focus and blur animate smoothly (border, ring, bottom accent bar). `Input` stays the low-level control.

### 5. Data

| Component | Scope |
|-----------|-------|
| `Table` | Semantic table, density, striped, sticky header, selected row |
| `List` | Rows with leading / content / trailing slots; plain, divided, card |
| `Grid` | Responsive columns or auto-fill `minItemWidth` |

Presentational only — no sorting, filtering, pagination, or virtualization engine.

## Out of scope

- Data grid engine (sort / filter / virtualize), DataTable column API
- Command palette, Popover, Select / Combobox, Accordion, Pagination (candidates for S0003)
- Items in [[01-apolyx-s0001-carryovers]] (remote registry, docs search, submenus, …)

## Acceptance

- [x] Six hover tokens in all six palettes; Button variants use them; dark hover visibly differs — **Apolyx-S0002**
- [x] Sheet (4 sides), Dialog sizes, Breadcrumb, NavigationMenu, NavList with tests / stories / MDX / registry — **Apolyx-S0002**
- [x] Switch drag + stretch + bounce, reduced-motion fallback, pointer tests — **Apolyx-S0002**
- [x] Field top / floating / inline with `aria-describedby` / `aria-invalid` wiring and tests — **Apolyx-S0002**
- [x] Table, List, Grid with stories / MDX / registry — **Apolyx-S0002**
- [x] Kit tests + typecheck, docs typecheck, registry build green — **Apolyx-S0002** (54 tests, 59 registry items)

## Links

- Sprint: [[../../plan/ui-kit/Apolyx-S0002/README]]
- As-built: [[../../tech_space/ui-kit/06-s0002-contrast-nav-switch-field-data]]
- Index: [[README]]
