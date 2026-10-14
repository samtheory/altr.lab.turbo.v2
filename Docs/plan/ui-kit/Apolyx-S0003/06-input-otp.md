---
title: "Phase 6 — Input OTP"
description: "Apolyx-owned one-time-code input: one real input with visual slots, paste, SMS autofill, patterns, PIN masking, invalid state, verification flow"
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

# Phase 6 — Input OTP

> Who: apollo. Segmented code entry without the `input-otp` dependency.

Sprint index: [[README]]

## Design

One real `<input>` holds the value; the slots are visual. This keeps SMS autofill, paste, password managers and screen readers working, which hand-rolled one-input-per-digit versions break.

```tsx
<InputOTP maxLength={6} pattern="digits" value={code} onValueChange={setCode} onComplete={verify}>
  <InputOTPGroup>
    <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>
```

| Part | Notes |
|------|-------|
| `InputOTP` | Root `div` (relative) with the real input stretched over the slots, `opacity-0`, `caret-transparent`, `autoComplete="one-time-code"`. Props: `maxLength`, `pattern` (`"digits"` · `"alphanumeric"` · `"alpha"` · `RegExp`), `value` / `defaultValue` / `onValueChange`, `onComplete(value)`, `mask` (boolean, PIN dots), `size` (`sm` · `md` · `lg`), `disabled`, `name`, `aria-invalid` |
| `InputOTPGroup` | Visual cluster; adjacent slots share borders (`-ml-px`, rounded only on the outer corners) |
| `InputOTPSlot` | Reads char, active and invalid state from context. Active slot: ring + blinking caret (1 s step animation, hidden under reduced motion). Filled: char fades in (80 ms). `mask`: shows `•` |
| `InputOTPSeparator` | `role="separator"`, a short dash by default; children override |

Behaviour:

- `pattern` filters typed and pasted characters; `"digits"` sets `inputMode="numeric"`, alphanumeric uppercases by default (`transform` prop: `"upper"` · `"none"`).
- Paste distributes from the current position; extra characters are dropped.
- Selection: clicking a slot moves the caret there (sets `selectionStart`); Backspace deletes back; ArrowLeft / ArrowRight move between slots.
- `onComplete` fires once each time the value reaches `maxLength`.
- **Invalid:** `aria-invalid` on `InputOTP` styles **every slot** (fixes the reference gotcha where invalid on the root did not reach the slots).
- Inside `Field`, uses Field's id, label and `aria-describedby`; the Field box is not drawn around OTP (Field renders `ControlBox` only for box-type controls; OTP opts out via context flag).

## Docs page — `components/input-otp.mdx` categories

1. **Basics** — 6 digits · 4 digits · with separator (3 + 3) · disabled
2. **Patterns** — digits only · alphanumeric license code (4-4-4 with two separators) · PIN with `mask`
3. **States** — invalid with error text · success (all slots `success` tone after verify) · sizes
4. **Verification flow** — `Card` with code input, auto-submit on complete, `Spinner` in the Verify button, resend link with 30 s countdown, error toast on wrong code

## Tasks

- [x] Field: add a context setter (like `setMultiline`) that lets a child ask Field to skip drawing `ControlBox`; OTP calls it on mount
- [x] `InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`
- [x] Tests: typing fills slots; non-matching chars rejected; paste distributes; Backspace; `onComplete` once; `mask` hides chars; invalid reaches all slots; hidden name submits value
- [x] Stories + demos + MDX categories above
- [x] Registry `input-otp.json` (registryDeps: `utils`)

## Done when

Works with typing, paste and keyboard navigation; the verification demo auto-submits; slots show invalid state from the root.
