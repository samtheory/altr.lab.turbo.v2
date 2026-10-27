---
title: "Apolyx-S0003 as built — Switch physics and family, input catalog, form patterns"
description: "How Apolyx-S0003 shipped: pure Switch physics with its real numbers, SwitchField / SwitchCard / FieldSet, ControlBox shared by Field and InputGroup, PasswordInput, NumberInput, InputOTP, MaskedInput, the Forms docs group, and verified counts"
created: 2026-10-14
updated: 2026-10-14
tags:
  - tech-space
  - ui-kit
  - apolyx
  - Apolyx-S0003
  - switch
  - forms
  - inputs
---

# Apolyx-S0003 as built

> Who: anyone changing the Switch, a form control, or the Forms docs pages. This is what the code does on 2026-10-14; when the sprint cards disagree, trust this note (and the code over both). Sprint: [[../../plan/ui-kit/Apolyx-S0003/README]] · Intent: [[../../feature_list/ui-kit/04-apolyx-s0003-switch-inputs]] · Builds on [[06-s0002-contrast-nav-switch-field-data]].

## What shipped

| Area | Code (`elements/ui-kit/src/…`) |
|------|------|
| Switch physics (pure) | `components/ui/switch-physics.ts` |
| Switch, tones, icons, labels, `lg` | `components/ui/switch.tsx` |
| `SwitchField`, `SwitchCard` | `components/ui/switch-field.tsx` |
| `FieldSet`, `FieldLegend` | `components/ui/field-set.tsx` |
| Shared control box | `components/ui/control-box.tsx` |
| Field extras, `FieldCounter` | `components/ui/field.tsx` |
| Input variants / native types | `components/ui/input.tsx`, `textarea.tsx` |
| Input group family | `components/ui/input-group.tsx` |
| Password, strength | `components/ui/password-input.tsx` |
| Number | `components/ui/number-input.tsx` |
| One-time code | `components/ui/input-otp.tsx` |
| Mask engine + input | `lib/mask.ts`, `components/ui/input-mask.tsx` |
| Button `xs` / `icon-xs` sizes | `components/ui/button.tsx` |

No new runtime dependency: OTP and masking are Apolyx-owned (no `input-otp`, no `react-imask`), and forms use native `FormData` (no form library).

## Switch physics

`switch-physics.ts` is pure: `switch.tsx` feeds pointer state in and writes the result to motion values. All limits are unit-tested in `switch-physics.test.ts` without animating.

**Geometry per size** (`getSwitchGeometry`):

| Size | Thumb | Travel | Press stretch (20%) | Max stretch (30%) |
|------|-------|--------|------|------|
| `sm` | 16 px | 14 px | 3 px | 5 px |
| `md` | 20 px | 18 px | 4 px | 6 px |
| `lg` | 24 px | 22 px | 5 px | 7 px |

**Rules in `computeThumb`:**

- Stretch = `pressStretch × press + speed × SPEED_GAIN (6)`, clamped to `maxStretch`. It grows on the side the thumb is moving toward.
- Stretch tapers to zero over the last half-thumb before the end being approached, so the thumb arrives at normal width and never grows into the side it is already on.
- Past either end there is no growth: the outer edge stays on the wall and the thumb squashes by `wallSquash(over) = 2·over / (over + 12)`, so never more than 2 px.
- Reduced motion (`rigid`) returns the clamped position at plain thumb width.

**Pointer tracking** (`stepPointerTrack`):

- Speed is exponentially smoothed (`SPEED_SMOOTHING` 0.35).
- Direction flips only after 2 px of movement the other way (`DIRECTION_HYSTERESIS`).
- Under 3 px of total movement a press counts as a click (`DRAG_THRESHOLD`).

**Animation in `switch.tsx`:**

- **Press:** animated with a spring (stiffness 700, damping 38). There is no one-frame width jump; a test asserts that pointer down leaves the inline width unchanged on the same tick.
- **Release / click:** the thumb glides with `GLIDE` (stiffness 560, damping 34, mass 0.6), which overshoots by under 1 px. The lead stretch decays over 280 ms, then the thumb gets a 180 ms landing squash of 1.5 px.
- **Track colour:** while dragging, the track mixes `--input` → `--switch-tone` by `--switch-progress`, which is set from the thumb's progress.
- **Reduced motion:** `useReducedMotion()` skips stretch and squash, and `left` animates over 120 ms ease-out.

## Switch family

| API | Notes |
|-----|-------|
| `size` | `sm` · `md` · `lg` |
| `tone` | `primary` · `success` · `warning` · `info` · `destructive`. Sets `--switch-tone`, `--switch-tone-hover` and `--switch-tone-fg`, and exposes a data attribute |
| `icons={{ checked, unchecked }}` | Glyph in the thumb. Cross-fades with opacity + scale over 120 ms; no transition under reduced motion |
| `labels={{ checked, unchecked }}` | Text inside the track, stacked in one grid cell and cross-faded |
| `SwitchField` | Settings row: `label`, `description`, `aside` (badge, tooltip), `side="start" \| "end"`. Clicking the row toggles once and wires `aria-describedby` |
| `SwitchCard` | Selectable tile: `title`, `description`, `icon`; a click anywhere on the card toggles |
| `FieldSet` / `FieldLegend` | Native `<fieldset>` groups; `disabled` disables every control inside |

The docs Switch page has five categories: Basics, Appearance, Composition, Settings layouts, Confirmation. It also has a Physics section.

## ControlBox: one box for Field and InputGroup

`ControlBox` (`controlBoxVariants`) owns the soft surface, hover, focus bloom, and invalid / disabled / read-only states. It also owns `size` (`sm` · `md` · `lg`), `variant` (`outline` · `filled` · `underline` · `ghost`) and `shape` (`pill`).

**Post-S0003 polish (2026-10-14):** the default `outline` surface is **borderless** — a muted pad (`bg-muted/55`) that lifts to `background` and blooms a soft `ring` + hairline shadow on focus. The old bottom `::after` accent bar (the black underline that grew on focus) was removed from `ControlBox` entirely. The same look is mirrored on standalone `Input` / `Textarea` `outline` variants so Field, InputGroup, Password, Number, Mask and bare inputs stay in sync. `underline` still offers an optional bottom rule with a centre-out focus bar.

- `Field` draws a `ControlBox` around its control.
- `InputGroup` is a `ControlBox` plus an "in group" context.
- Inside either one, controls render the borderless `InputGroupInput` (`data-slot="input-group-control"`) and pick up Field's id, `aria-describedby` and invalid state through `useOptionalField()`. This applies to `PasswordInput`, `NumberInput` and `MaskedInput`.
- A labelled input group is therefore just `<Field>` with addons inside.

Field's context exposes setters so children can adjust the box:

| Setter | Used by |
|--------|---------|
| `setMultiline` | Textarea |
| `setValueLength` / `setOverLimit` | `FieldCounter` |
| `setBoxless` | `InputOTP`, which asks Field not to draw a box so its slots can draw their own |

**Field extras:**

- `labelAside` slot (link, tooltip or badge on the label row).
- `optional` mark.
- `orientation="horizontal"` with `labelWidth`.
- `error` accepts an array, rendered as a list inside one alert.
- `size`, `variant` and `shape` pass through to the box.
- `FieldCounter max` renders inside the box and flips the field invalid past `max`.

**Input:**

- `inputVariants` (CVA) with `size`, `variant` and `shape`.
- Native types are styled in the base: the file button, colour swatch, range track / thumb, and the date / time picker icon (`color-scheme: dark` in dark mode).
- `Textarea` gets the same variants plus `autoResize`.

## InputGroup family

| Part | Behaviour |
|------|-----------|
| `InputGroupAddon` | `align`: `inline-start` / `inline-end` / `block-start` / `block-end`; markup order does not matter. Clicking empty addon space focuses the control. `divided` adds a separator |
| `InputGroupText` | Muted, out of the tab order |
| `InputGroupButton` | `type="button"` by default. Sizes `xs`, `icon-xs`, `sm`, `icon` (the new Button `xs` sizes). Icon-only without `aria-label` warns in dev |
| `InputGroupInput` / `InputGroupTextarea` | Borderless controls; an invalid child marks the whole group |

The docs page categories are Addons, Actions, Status, Block addons and textarea, With Field, and Real-world.

## Specialized inputs

| Component | Behaviour |
|-----------|-----------|
| `PasswordInput` | Show / hide toggle, controlled or uncontrolled (`visible`, `defaultVisible`, `onVisibleChange`); the toggle's label changes with state |
| `PasswordStrength` | `value`, `rules` (default `defaultPasswordRules`), `variant` `bar` / `checklist` / `both`, optional external `score` / `max`. Levels go empty → weak → fair → good → strong, with a live text label |
| `NumberInput` | `min`, `max`, `step`, `largeStep`. Arrow / Page / Home / End keys; hold-to-repeat on the steppers. Formats with `Intl.NumberFormat` (`format`, `locale`) and parses localized text (`"$1,200.50"`); clamps on blur. `layout` is `split` / `stacked` / `none`; `allowWheel` is opt-in. A hidden input submits the number |
| `InputOTP` | One real `<input>` holds the code and the slots only draw it, so SMS autofill (`autocomplete="one-time-code"`), paste, password managers and screen readers see one field. `pattern` is `digits` / `alphanumeric` / `alpha` / `RegExp` (letters uppercased unless `transform="none"`). Also `mask` for PINs, `onComplete` once per fill, `tone="success"`, and `aria-invalid` reaching every slot. The caret blink and character pop stop under reduced motion |
| `MaskedInput` + `useMask` | See below |

## Mask engine

`lib/mask.ts` is pure and ships as its own registry item, `mask` (type `lib`). The CLI writes every file of an item under one alias, so a lib file cannot live inside a `ui` item.

- **Tokens:** `9` digit, `a` letter, `*` alphanumeric. A `\` escapes a literal, and `[…]` marks an optional section.
- **Literals are lazy:** a literal is only written when the next real character arrives.
- **Mask sources:** a mask can be a string or a function of the raw value. For example, `masks.card` switches to the Amex 4-6-5 layout when `detectCardBrand` sees an Amex prefix.
- **Presets:** `phoneUS`, `date`, `time`, `card`, `expiry`, `cvc` (`999[9]`), `zipUS` (`99999[-9999]`).
- **Caret handling:** `caretFromRaw` maps the caret through literals. Backspace and Delete over a literal remove the raw character before it. Paste re-runs the raw text through the mask, and keeps the tail when it overflows an empty field.
- **`MaskedInput` output:**
  - A hidden `name` input submits the raw value, or the formatted one with `submit="formatted"`.
  - `showGuide` draws the remaining pattern behind the text.
  - `data-complete` is set once the mask is filled; `onCompleteChange` fires on blur.

## Forms docs group and form patterns

`apps/apolyx/src/docs-config.ts` has a **Forms** group after Components. It holds Field, Input, Input Group, Password Input, Number Input, Input OTP, Input Mask, Textarea, Checkbox, Switch, Label, and Form patterns. Moved pages keep their `components/*` slugs, so registry `docs` links still resolve.

Each page follows the same layout: hero preview, then Installation, Usage, category H2s, Accessibility and Props. The right-hand table of contents lists the categories.

`forms/patterns.mdx` contains:

- **Layouts:** stacked, two-column, horizontal, inline, dense.
- **Containers:** Dialog, Sheet, Card.
- **Flows:** multi-step with a horizontal `Timeline` stepper, an OTP verification step, and a read-only review with Edit links.
- **Feedback:** error summary, async username check (300 ms debounce), success toast + reset.
- **Settings screen:** a sticky save bar that is `inert` and `aria-hidden` while clean.
- **Using a form library:** a short note on plugging in React Hook Form and Zod.

The shared helpers live in `src/demos/form-shared.tsx`: `useFormAction`, `SubmitButton`, `ErrorSummary` and `useFocusFirstInvalid`.

**Why `onSubmit` and not `<form action>`:** React 19 resets a form after every action, including failed ones. That clears uncontrolled inputs and desyncs the hidden inputs behind the kit's `Checkbox` / `Switch` from what is shown. The patterns therefore work this way:

- `onSubmit` builds `FormData` and dispatches inside `startTransition`.
- `useActionState` provides the pending flag.
- A successful submit resets the form by remounting it with a new `key`, which also resets kit controls that native reset misses.
- Focus moves to the first `aria-invalid` control in an effect after errors render, never in the submit handler, where the errors are not in the DOM yet.

## Counts and verification (2026-10-14)

| Check | Result |
|-------|--------|
| `pnpm --filter @altr/apolyx test` | 30 files, **141 tests** |
| `pnpm --filter @altr/apolyx typecheck` | clean |
| `pnpm --filter @altr/apolyx build` | **66 registry items**, imports resolved (+ `input-group`, `password-input`, `number-input`, `input-otp`, `input-mask`, `mask`) |
| `apps/apolyx` `tsc --noEmit` | clean |
| Docs | **48 MDX pages**, 34 component pages, 120 demo files; kit has 33 story files |
| CLI smoke | `apolyx add input-group password-input number-input input-otp input-mask switch` into `%TEMP%\apolyx-smoke`, then `npm run build` OK (Next 16.4); no `@radix-ui` / `@base-ui` / `input-otp` / `react-imask` in the installed files |
| Reduced motion | Emulated `reduce` → OTP caret `animation-name: none`; Switch physics rigid (unit test) |

Screenshots (headless Edge, 1280 px) in `Docs/tech_space/ui-kit/assets/apolyx-s0003/`:

- `switch-default-dark.png`
- `switch-power-blue-light.png`
- `input-group-default-light.png`
- `input-otp-default-light.png`
- `form-patterns-dark.png` (shows the Forms sidebar group)

## Checkbox motion (post-S0003 polish)

`checkbox.tsx` keeps the check and dash marks mounted. Fill colour and border ease with `--duration-base` / `--ease-out`. On check / indeterminate the mark pops with `apolyx-check-in` (scale + opacity); on clear it scales and fades out. Press scales the box to `0.88`. Reduced motion turns transitions, the pop, and the press scale off.

## Deferred

Select, Combobox and Popover, and everything that needs them: international phone input with a country picker, date and colour pickers, popover addons. Also deferred: Slider, tags input, file dropzone, rich text, and React Hook Form / Zod adapter packages. All of these are tracked in [[../../feature_list/ui-kit/01-apolyx-s0001-carryovers]].
