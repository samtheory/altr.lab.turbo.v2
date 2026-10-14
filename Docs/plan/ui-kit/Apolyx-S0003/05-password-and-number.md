---
title: "Phase 5 — Password and number inputs"
description: "PasswordInput with visibility toggle, PasswordStrength meter with rules, NumberInput with steppers, clamping and Intl formatting"
created: 2026-10-14
updated: 2026-10-14
tags:
  - plan
  - ui-kit
  - apolyx
  - forms
  - inputs
  - Apolyx-S0003
---

# Phase 5 — Password and number inputs

> Who: apollo. Two explicit inputs built on `InputGroup` ([[04-input-group]]).

Sprint index: [[README]]

## `PasswordInput` (`src/components/ui/password-input.tsx`)

```tsx
<PasswordInput name="password" autoComplete="new-password" />
<Field label="Password"><PasswordInput /></Field>
```

- `InputGroup` + `InputGroupInput type="password|text"` + `InputGroupButton` with `Eye` / `EyeOff`.
- Toggle button: `aria-label="Show password"` / `"Hide password"`, `aria-pressed`, `aria-controls` the input. Keeps caret position and focus when toggling.
- Props: everything an input takes, plus `visible` / `defaultVisible` / `onVisibleChange` (controllable).
- Never puts the value in a data attribute.

## `PasswordStrength`

```tsx
<PasswordStrength value={password} rules={defaultPasswordRules} variant="bar | checklist | both" />
```

- `rules`: array of `{ id, label, test: (v: string) => boolean }`. `defaultPasswordRules`: 8+ characters, lower + upper case, a number, a symbol.
- `score` = rules passed (0 to n); optional `score` prop overrides it so apps can plug in their own estimator (zxcvbn etc.) without a kit dependency.
- `bar`: segmented meter, one segment per rule, colors `destructive` → `warning` → `success` by ratio; label "Weak / Fair / Good / Strong".
- `checklist`: rules with `Check` / `X` icons; the met state animates (scale + color, reduced-motion aware).
- Live region: announces the strength label only when it changes (`aria-live="polite"`).

## `NumberInput` (`src/components/ui/number-input.tsx`)

```tsx
<NumberInput value={qty} onValueChange={setQty} min={0} max={99} step={1} />
<NumberInput defaultValue={1200} format={{ style: "currency", currency: "USD" }} />
```

- Text input with `inputMode="decimal"`, `role="spinbutton"`, `aria-valuenow` / `min` / `max` / `aria-valuetext` (formatted).
- Steppers: `layout="split"` (− on start, + on end) or `"stacked"` (chevrons stacked on end). Buttons are `tabIndex={-1}`; keyboard does the same work.
- Keys: ArrowUp / ArrowDown ± `step`, Shift+Arrow ± `step × 10`, PageUp / PageDown ± `step × 10`, Home / End to `min` / `max`.
- Press-and-hold on a stepper repeats (400 ms delay, then every 60 ms), stops on pointer up / leave.
- Formatting with `Intl.NumberFormat` (`format` options, `locale` prop): shows formatted text when blurred, raw number while focused. Parse tolerates group separators and the currency symbol.
- Clamps on blur and on step; invalid text reverts to the last valid value on blur.
- Value is `number | null` (empty = `null`). Hidden `<input type="hidden" name>` carries the raw number for forms.
- Wheel changes value only when focused and `allowWheel` is set (off by default).

## Docs pages and categories

`components/password-input.mdx`:
1. **Basics** — toggle · in `Field` with "Forgot password?" `labelAside` · disabled
2. **Strength** — bar · checklist · both · custom score (shows how to pass `score`)
3. **Patterns** — confirm password with match message · new-password form

`components/number-input.mdx`:
1. **Basics** — split steppers · stacked steppers · no steppers
2. **Formatting** — currency · percent · unit suffix (`InputGroupText` "kg") · locale `de-DE`
3. **Limits** — min / max clamp · step 0.5 · disabled · invalid
4. **Patterns** — quantity picker in a cart row · price range (two inputs)

## Tasks

- [x] `PasswordInput`, `PasswordStrength`, `defaultPasswordRules`
- [x] `NumberInput` with keyboard, hold-to-repeat, Intl format / parse, clamp
- [x] Tests: toggle switches type and labels; strength score and live label; Arrow / Page / Home / End keys; clamp on blur; parse `"$1,200.50"`; hidden input value; hold-to-repeat with fake timers
- [x] Stories + demos + MDX categories above
- [x] Registry `password-input.json`, `number-input.json` (registryDeps: `input-group`)

## Done when

Both pages render every category; NumberInput is fully keyboard operable and announces the formatted value; PasswordInput never loses caret or focus on toggle.
