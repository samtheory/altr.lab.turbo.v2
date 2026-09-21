---
title: "Storybook for ui-kit"
description: "Intent: Storybook workshop for @altr/ui-kit with light/dark and component stories"
created: 2026-09-21
updated: 2026-09-21
tags:
  - feature
  - ui-kit
  - storybook
---

# Storybook for ui-kit

## Goals

1. Run Storybook against `elements/ui-kit` in isolation
2. Document components with autodocs + a11y
3. Light/dark toggle matching app ThemeProvider tokens
4. Document run commands in [[../Altr.lab/commands]]

## Acceptance (shipped 2026-09-21)

- [x] Storybook 9 + React Vite in `@altr/ui-kit`
- [x] Stories: Button, Card, Badge, ThemeToggle, FadeIn
- [x] Root scripts `pnpm storybook:ui-kit` / `pnpm build:storybook:ui-kit`
- [x] Docs in Altr.lab/commands + tech_space

As-built: [[../tech_space/02-ui-kit-storybook]]
