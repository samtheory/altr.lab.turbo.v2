---
title: "tech_space — ui-kit Storybook"
description: "As-built: Storybook 9 for @altr/ui-kit with Vite, Tailwind v4, theme addon"
created: 2026-09-21
updated: 2026-09-21
tags:
  - tech-space
  - ui-kit
  - storybook
---

# ui-kit Storybook (as-built)

> **Renamed 2026-10-11:** package `@altr/ui-kit` → `@altr/apolyx`. Storybook filter is now `pnpm --filter @altr/apolyx storybook`. Run steps: [[../Altr.lab/commands]].

> Component workshop for `@altr/apolyx`. Run steps: [[../Altr.lab/commands]].

## Stack

| Piece | Choice |
|-------|--------|
| Storybook | 9.x (`storybook`, `@storybook/react-vite`) |
| Builder | Vite 6 + `@vitejs/plugin-react` |
| CSS | Tailwind v4 via `@tailwindcss/vite` |
| Theme | `@storybook/addon-themes` (class `dark` on preview) |
| A11y / docs | `@storybook/addon-a11y`, `@storybook/addon-docs` |

## Layout

```
elements/ui-kit/
├── .storybook/
│   ├── main.ts       # stories glob, addons, viteFinal + tailwind plugin
│   └── preview.tsx   # globals.css, theme decorator, bg wrapper
└── src/
    └── **/*.stories.tsx
```

## Stories (initial)

| Story | Path |
|-------|------|
| UI/Button | `src/components/ui/button.stories.tsx` |
| UI/Card | `src/components/ui/card.stories.tsx` |
| UI/Badge | `src/components/ui/badge.stories.tsx` |
| Theme/ThemeToggle | `src/components/theme-toggle.stories.tsx` |
| Motion/FadeIn | `src/components/motion.stories.tsx` |

## Scripts

| Where | Command | Result |
|-------|---------|--------|
| Root | `pnpm storybook:ui-kit` | Dev server **:6006** |
| Root | `pnpm build:storybook:ui-kit` | `elements/ui-kit/storybook-static` |
| Package | `pnpm --filter @altr/ui-kit storybook` | Same as root |
| Turbo | `storybook` / `build-storybook` tasks | See `turbo.json` |

`storybook-static/` is gitignored.

## Related

- Package README: `elements/ui-kit/README.md`
- Prior ui-kit as-built: [[01-hub-ui-kit-base]]
