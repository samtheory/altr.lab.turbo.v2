---
title: "Apolyx-S0003 wave — Switch motion and family, input catalog"
description: "Intent and acceptance for the third Apolyx wave: smoother Switch physics, a categorized Switch family, and the input catalog (InputGroup, OTP, mask, password, number, form patterns)"
created: 2026-10-14
updated: 2026-10-14
tags:
  - feature
  - ui-kit
  - apolyx
  - Apolyx-S0003
  - forms
  - switch
  - inputs
---

# Apolyx-S0003 wave

> Who: anyone deciding what Apolyx covers after S0002, and **apollo** before starting the sprint. This is **intent**; the sprint **closed 2026-10-14** and acceptance below is ticked against code. Sprint cards: [[../../plan/ui-kit/Apolyx-S0003/README]].

Umbrella intent: [[00-intent]]. Constraints carry over unchanged: no Radix / Base UI, semantic tokens only, 3 families × light / dark, reduced motion respected, every component ships Storybook + MDX + registry, no new runtime dependencies.

## Why

1. **The Switch feels off.** S0002 shipped a physics Switch, but in use:
   - on press the thumb grows **instantly** (one frame), not smoothly;
   - dragging to the end, or dragging the "wrong" way, makes the thumb grow by **more than half** its width;
   - dragging away from the direction it can travel still makes it grow, which reads as a glitch.
2. **One Switch is not enough.** Settings screens need labelled rows, tiles, groups, tones, icons, and confirmation patterns. Today each app would hand-roll them.
3. **Forms stop at `Field`.** There is no way to put an icon, prefix, or button inside an input, and no OTP, masked, password, or number input. These are the next screens users build (sign-in, verification, billing, settings).

References studied (inspiration only; we build in the Apolyx look, not clones): [ReUI Switch](https://reui.io/components/switch), [shadcn/studio Switch](https://shadcnstudio.com/docs/components/switch?base=base), [ReUI Input](https://reui.io/components/input), [ReUI Input Group](https://reui.io/components/input-group), [ReUI Input OTP](https://reui.io/components/input-otp), [shadcn/studio Form](https://shadcnstudio.com/docs/components/form?base=base), [shadcn/studio Input](https://shadcnstudio.com/docs/components/input?base=base), [shadcn/studio Input Mask](https://shadcnstudio.com/docs/components/input-mask?base=base), [shadcn/studio Input OTP](https://shadcnstudio.com/docs/components/input-otp?base=base).

## What we build

### 1. Switch motion (fix)

| Today | Target |
|-------|--------|
| Press: width jumps by `press` px in one frame | Press: thumb stretches smoothly (~120 ms) toward the side it will travel |
| Stretch up to 55% of the thumb (md: 11 px on 20 px) | Total stretch **never exceeds 30%** of the thumb width |
| Pushing past either end adds more stretch | Past an end: no extra width; a small rubber-band offset (≤ 2 px) and a slight squash |
| Dragging away from the travel side grows the thumb | Dragging into the side it is already on: **no growth** |
| Release wobbles (width spring damping 13) | Release: one clean glide, a small landing squash, ≤ 1 px overshoot |
| Track color flips at the end | Track color follows the thumb's progress while dragging |

Exact numbers and the physics function live in [[../../plan/ui-kit/Apolyx-S0003/01-switch-motion]].

### 2. Switch family

Kit API additions on `Switch`: `size` `sm` / `md` / **`lg`**, `tone` (`primary` · `success` · `warning` · `info` · `destructive`), `icons` (thumb glyph per state), `labels` (text inside the track). New compounds: `SwitchField` (label + description row), `SwitchCard` (selectable tile), and `FieldSet` / `FieldLegend` for groups.

The docs Switch page gets **categories**:

| Category | Shows |
|----------|-------|
| Basics | Default, label, description, disabled, controlled, inside a `<form>` |
| Appearance | Sizes, tones, thumb icons, track labels, label side |
| Composition | `SwitchField`, `SwitchCard`, tooltip info, badges, icon tile |
| Settings layouts | Group in `FieldSet`, card list with separators, frame, compact table, card grid |
| Confirmation | Destructive tone with warning text; confirm in `Dialog` before commit |

### 3. Inputs

Grouped by how people reach for them, not by reference site:

| Group | Delivers |
|-------|----------|
| **Core input** | `Input` sizes, variants (`outline` · `filled` · `underline` · `ghost`), `shape="pill"`, styled native types (file, color, range, date, time), read-only and invalid states |
| **Field extras** | Label aside slot (link, tooltip, badge), optional mark, `orientation="horizontal"`, `FieldCounter`, multiple errors, `FieldSet` |
| **Input group** | One shared control box; addons inline / block start / end; text, icon, button, kbd, spinner, menu, tooltip; textarea composer |
| **Specialized** | `PasswordInput` (+ `PasswordStrength`), `NumberInput` (steppers, Intl format), `InputOTP`, `MaskedInput` (+ `useMask`) |
| **Form patterns** | Docs-only recipes: stacked, two-column, horizontal, inline, in Dialog / Sheet, multi-step, read-only review, error summary, async submit |

All form controls move into a new **Forms** sidebar group in the docs app.

## Reference inventory

Every reference example mapped to what Apolyx does with it. **Have** = already in code · **Build** = new kit API this sprint · **Recipe** = docs demo composed from kit parts · **Skip** = out of scope.

### Switch

| Reference example | Apolyx |
|-------------------|--------|
| Basic, disabled | Have |
| With description | Build — `SwitchField` |
| Sizes | Build — add `lg` |
| Group | Build — `FieldSet` + `SwitchField` |
| Card list with separators / with icons | Recipe — `Card` + `List` + `SwitchField` |
| In frame | Recipe — bordered `FieldSet` |
| Tooltip info | Recipe — `SwitchField` label + `Tooltip` |
| With badges | Recipe — `SwitchField` label + `Badge` |
| Colored | Build — `tone` |
| Destructive with confirmation text | Recipe — `tone="destructive"` + `Alert` / `Dialog` |
| Compact settings table | Recipe — `Table` + `Switch` |
| Descriptions in card grid | Build — `SwitchCard`; Recipe — `Grid` |
| Icon in thumb (sun / moon, check / x) | Build — `icons` |
| Text inside track (ON / OFF) | Build — `labels` |
| Label left / right | Build — `SwitchField side` |
| Square / animated variants | Skip — off-taste; our motion fix covers "animated" |

### Input

| Reference example | Apolyx |
|-------------------|--------|
| Basic, label, description, disabled, error | Have (`Input`, `Field`) |
| Character counter | Build — `FieldCounter` |
| Password / phone / URL / number / date / time / file / color / range types | Build — styled native types in `Input` base |
| Required indicator | Have; Build — `optional` mark |
| Label with tooltip / badge / optional badge / link + visibility toggle | Build — `labelAside` slot; Recipe |
| Horizontal orientation | Build — `orientation="horizontal"` |
| Multiple error messages | Build — `error` accepts an array |
| Password strength basic / advanced | Build — `PasswordStrength` |
| Pulsed background, custom focus ring | Skip — Field already has its own focus motion |
| Subtle background / bottom border / pill / minimal | Build — `variant` + `shape` |
| Range with value indicator | Recipe — native range + output; a real Slider is deferred |
| Complex multi-field form | Recipe — form patterns page |

### Input group

| Reference example | Apolyx |
|-------------------|--------|
| Basic, disabled, invalid | Build — `InputGroup` |
| Prefix / suffix icon, text, both | Build — `InputGroupAddon` + `InputGroupText` |
| Action button, icon button, multiple end buttons, menu button | Build — `InputGroupButton`; Recipe with `DropdownMenu` |
| Dropdown selection, category dropdown (pill) | Recipe — `DropdownMenu` trigger as addon (no Select yet) |
| Kbd shortcut, sparkles + kbd | Recipe — `Kbd` in addon |
| Tooltip action | Recipe — `Tooltip` on `InputGroupButton` |
| Loading spinner, success indicator, results count | Recipe — addon content |
| Block-start / block-end addon, inline + block | Build — `align` values |
| Textarea with char limit / action buttons / AI composer toolbars | Build — `InputGroupTextarea`; Recipe |
| Label usage | Build — works inside `Field` |
| Popover trigger addon | Skip — Popover not built yet |
| Inline addons without borders | Build — default addon style has no dividers; `InputGroupText` |
| Button-group wrapped text prefix / suffix | Recipe |
| Member row, project save, API request, order / company / contact search, share link | Recipe — "Real-world" category |
| Pill AI prompt bar | Recipe — `shape="pill"` |
| Password visibility | Build — `PasswordInput` |

### Input OTP

| Reference example | Apolyx |
|-------------------|--------|
| Basic, numeric, separators, alphanumeric, PIN, verification | Build — `InputOTP` (own implementation, no `input-otp` dependency) |
| Timer / resend, success + error states | Recipe — verification flow demo |
| 4 / 6 / 8 length | Build — `maxLength` |

### Input mask

| Reference example | Apolyx |
|-------------------|--------|
| Phone, date, time, card number, custom alphanumeric, zip | Build — `MaskedInput` + `useMask` with presets |
| Card brand, expiry, CVC | Build — `detectCardBrand`, `masks.card` (Amex 4-6-5), `masks.expiry`, `masks.cvc`; Recipe — billing demo |
| International phone with country flags | Skip — needs Select / Combobox |

### Form

| Reference example | Apolyx |
|-------------------|--------|
| Basic, inline, stacked, two-column, dense | Recipe — form patterns |
| With icons, with tooltips | Recipe — `InputGroup`, `labelAside` |
| Multi-step / wizard | Recipe — horizontal `Timeline` as stepper |
| Read-only review | Recipe |
| Form in dialog / sheet | Recipe — `Dialog`, `Sheet` |
| React Hook Form + Zod bindings | Skip — no new deps; native `FormData` + React 19 actions |

## Out of scope

- Select, Combobox, Popover (and anything that needs them: country phone input, date / color pickers, popover addons)
- Slider, tags / chips input, file dropzone, rich text
- React Hook Form / Zod adapter packages
- Items in [[01-apolyx-s0001-carryovers]] not listed above

## Acceptance

Ticked against code on 2026-10-14. As built: [[../../tech_space/ui-kit/08-s0003-switch-inputs]].

- [x] Switch: press stretch animates; stretch ≤ 30% of thumb in every drag path; no growth past the ends or into the current side; physics unit-tested — **Apolyx-S0003**
- [x] Switch family: `lg`, `tone`, `icons`, `labels`, `SwitchField`, `SwitchCard`, `FieldSet`; docs Switch page in five categories — **Apolyx-S0003**
- [x] Input variants / shape / native types; Field `labelAside`, `optional`, `orientation`, `FieldCounter`, multiple errors — **Apolyx-S0003**
- [x] `InputGroup` family shares the control box with `Field` — **Apolyx-S0003**
- [x] `PasswordInput`, `PasswordStrength`, `NumberInput`, `InputOTP`, `MaskedInput` / `useMask` with tests, stories, MDX, registry — **Apolyx-S0003**
- [x] Docs: **Forms** sidebar group, every page split into categories, form patterns page — **Apolyx-S0003**
- [x] Kit tests + typecheck, docs typecheck, registry build green — **Apolyx-S0003** (141 tests, 66 registry items)

Form recipes submit through `onSubmit` + `useActionState` rather than `<form action>`, because React 19's automatic form reset after an action desyncs uncontrolled and kit controls.

**Follow-up polish (2026-10-14, not a new sprint):** default Field / Input / InputGroup surface is borderless (no bottom focus bar); Checkbox fill and clear animate. As built: [[../../tech_space/ui-kit/08-s0003-switch-inputs#ControlBox: one box for Field and InputGroup]].

## Links

- Sprint: [[../../plan/ui-kit/Apolyx-S0003/README]]
- Previous wave: [[02-apolyx-s0002-wave]] · Timeline: [[03-timeline]]
- Index: [[README]]
