---
title: "Phase 7 — Input mask"
description: "useMask hook and MaskedInput: token masks, presets (phone, date, time, card, zip), raw and formatted values, caret preservation"
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

# Phase 7 — Input mask

> Who: apollo. Formatted entry for structured values, Apolyx-owned (no masking library).

Sprint index: [[README]]

## API

```tsx
const mask = useMask({ mask: "(999) 999-9999" });
<Input {...mask.inputProps} />

<MaskedInput mask={masks.phoneUS} onValueChange={(raw, formatted) => …} />
<Field label="Card number"><MaskedInput mask={masks.card} /></Field>
```

| Piece | Notes |
|-------|-------|
| Tokens | `9` digit · `a` letter · `*` letter or digit · `\\` escapes a literal. Custom tokens via `tokens: { H: /[0-9a-f]/i }` |
| `mask` | A string, or a function `(raw) => string` for dynamic masks (card number length by brand, 4- vs 5-digit zip) |
| `useMask` | Returns `{ inputProps, raw, formatted, complete }`; `inputProps` = `value`, `onChange`, `onKeyDown`, `onPaste`, `inputMode`, `placeholder` |
| `MaskedInput` | `Input` (or `InputGroupInput` inside a group / Field) wired with `useMask`; `value` / `defaultValue` are **raw**; `onValueChange(raw, formatted)`; `name` submits raw by default (`submit="formatted"` to change) |
| `placeholderChar` | `_` default; `showGuide` renders the remaining mask in muted text behind the value |
| Presets `masks` | `phoneUS` `(999) 999-9999` · `date` `99/99/9999` · `time` `99:99` · `card` (dynamic 4-4-4-4 / Amex 4-6-5) · `expiry` `99/99` · `cvc` `999[9]` · `zipUS` `99999[-9999]` |
| `detectCardBrand(raw)` | Helper for the billing recipe: `visa` · `mastercard` · `amex` · `discover` · `unknown` |

Behaviour:

- Caret stays after the character just typed, skipping literals; Backspace over a literal deletes the previous token character.
- Paste strips non-token characters and re-applies the mask.
- `complete` is true when every required token is filled; `aria-invalid` is the app's choice (demo sets it on blur when incomplete).
- Masks never block IME composition (`compositionstart` / `end` pause formatting).

## Docs page — `components/input-mask.mdx` categories

1. **Presets** — phone · date · time · zip (4 / 9 digit)
2. **Billing** — card number with brand icon (`InputGroupAddon`) · expiry · CVC in one row
3. **Custom** — hex color `#HHHHHH` with swatch · license key `****-****-****` · dynamic mask function
4. **Values** — live readout of raw vs formatted · submit raw vs formatted · guide on / off
5. **Validation** — incomplete on blur sets `aria-invalid` with `Field` error

## Tasks

- [x] Mask engine (pure `applyMask(raw, mask, tokens)` + caret mapping) in `src/lib/mask.ts`
- [x] `useMask`, `MaskedInput`, `masks`, `detectCardBrand`
- [x] Tests: engine table (presets, optional sections, escapes); caret after typing over a literal; Backspace over a literal; paste; raw / formatted callbacks; card brand detection
- [x] Stories + demos + MDX categories above
- [x] Registry `input-mask.json` (component) + `mask.json` (lib item for `lib/mask.ts`, since the CLI writes each item under one alias); registryDeps: `input`, `input-group`, `mask`

## Done when

All presets format while typing and pasting with the caret in the right place; raw values reach forms; the billing row works end to end.
