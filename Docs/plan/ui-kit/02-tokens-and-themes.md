---
title: "Phase 2 — tokens and themes"
description: "OKLCH semantic tokens for default / power-blue / power-green × light/dark, ApolyxProvider, Storybook family × mode switcher"
created: 2026-10-11
updated: 2026-10-11
tags:
  - plan
  - ui-kit
  - apolyx
  - tokens
  - theming
---

# Phase 2 — tokens and themes

> Who: apollo. This is where Apolyx gets its own look. Every later component only reads the semantic tokens defined here.

Sprint index: [[README]] · Intent: [[../../feature_list/ui-kit/00-intent#Themes — decided: 3 families × light/dark]]

**Depends on:** phase 1 · **Skills:** `design-tokens` + `tailwind-4-docs` (+ `design-taste-frontend` for the palette / type call)

## Token contract

Same token names in every family × mode. Components never reference a family.

| Group | Tokens |
|-------|--------|
| Surfaces | `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `muted`, `muted-foreground` |
| Actions | `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `accent`, `accent-foreground` |
| Status | `destructive`, `destructive-foreground`, `success`, `success-foreground`, `warning`, `warning-foreground`, `info`, `info-foreground` |
| Lines | `border`, `input`, `ring` |
| Charts | `chart-1` … `chart-5`, `chart-grid`, `chart-axis` |
| Shape | `radius` (derived `radius-sm/md/lg/xl`) |
| Type | `font-sans`, `font-mono`, `font-display` |
| Motion | `duration-fast`, `duration-base`, `duration-slow`, `ease-out`, `ease-in-out`, `ease-spring` (values used by phase 5) |
| Elevation | `shadow-sm`, `shadow-md`, `shadow-lg` (tuned per mode) |

## Tasks

### CSS

- [ ] Split `src/styles/` into `globals.css` (entry: `@import "tailwindcss"`, `@source`, `@theme inline`, base layer) and `themes/default.css`, `themes/power-blue.css`, `themes/power-green.css`
- [ ] Convert all values to OKLCH; variables hold full colors; `@theme inline` maps `--color-*: var(--*)`
- [ ] Selectors: `:root, [data-theme="default"]` (light), `.dark, [data-theme="default"].dark` (dark), `[data-theme="power-blue"]`, `[data-theme="power-blue"].dark`, same for `power-green`
- [ ] Contrast: every `*-foreground` on its surface ≥ 4.5:1 (text) and `ring` ≥ 3:1 against `background`, in all 6 palettes — record the numbers in a comment table at the top of each theme file
- [ ] Taste pass: pick the Apolyx neutral (not pure gray — slight hue), radius, and font stack for `default`; PowerBlue / PowerGreen change accent, ring, chart ramp and tint the neutrals
- [ ] Add `@custom-variant dark (&:where(.dark, .dark *));` so `dark:` utilities follow the class
- [ ] Respect `prefers-reduced-motion` at token level: reduced durations set to `0ms` in a media query

### TypeScript

- [ ] `src/theme/index.ts`: export `themeFamilies = ["default", "power-blue", "power-green"]`, `themeModes = ["light", "dark", "system"]`, `cssVariableTokens` (full list above), and their types
- [ ] `src/components/theme-provider.tsx` → `ApolyxProvider` with props `theme`, `defaultTheme`, `mode`, `defaultMode`, `storageKey`; wraps `next-themes` for mode, owns family state, sets `data-theme` on `<html>`
- [ ] `useApolyxTheme()` hook → `{ theme, setTheme, mode, setMode, resolvedMode }`
- [ ] `ApolyxThemeScript` (inline `<script>`) that applies stored family before paint; document usage in `<head>` for Next
- [ ] Keep `ThemeProvider` export as a deprecated alias for one release so apps don't break mid-sprint
- [ ] `ThemeToggle` (mode) stays; add `ThemeFamilySwitcher` (3-option segmented control, keyboard accessible)

### Storybook

- [ ] Replace `withThemeByClassName` with a custom decorator driven by two toolbar globals: `theme` (3 families) and `mode` (light / dark)
- [ ] Add `Foundations/Tokens` story: swatch grid of every color token, radius scale, type scale, shadows — for the active family × mode

### Apps

- [ ] Fix `apps/hub/src/app/page.tsx`: `hsl(var(--muted))` → `var(--muted)`, `hsl(var(--accent))` → `var(--accent)`
- [ ] Swap `ThemeProvider` for `ApolyxProvider` in app layouts (`hub`, `web`, `dashboard`, `trading-ui`)

## Verify

```bash
rg "hsl\(var\(--" apps elements          # expect no hits
pnpm --filter @altr/apolyx typecheck
pnpm typecheck
pnpm --filter @altr/hub build
pnpm storybook:ui-kit                     # flip all 6 combinations on Foundations/Tokens
```

Manual: hub in light and dark looks intentional (no broken gradients); no theme flash on reload with `power-blue` stored.

## Done when

- 6 palettes ship, all pass the contrast table
- Provider + hook + script exported from `@altr/apolyx`
- Storybook switches family and mode independently
