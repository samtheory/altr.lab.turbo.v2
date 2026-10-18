---
title: "Commands — install run build"
description: "How to install, develop, and build altr.lab with pnpm and turbo"
created: 2026-09-19
updated: 2026-10-18
tags:
  - altr-lab
  - commands
---

# Commands

Package manager: **pnpm** (`packageManager`: `pnpm@10.27.0`).

```bash
pnpm install
pnpm dev                 # all packages with a dev script
pnpm build
pnpm typecheck
pnpm lint

pnpm dev:apolyx          # @altr/apolyx-docs :3004
```

## Storybook (`@altr/apolyx`)

Component workshop for the Apolyx design system (Storybook 9 + Vite + Tailwind v4). Root script names stay `storybook:ui-kit` / `build:storybook:ui-kit`.

```bash
pnpm storybook:ui-kit          # http://localhost:6006
pnpm build:storybook:ui-kit    # static → elements/ui-kit/storybook-static
```

Equivalent package filters:

```bash
pnpm --filter @altr/apolyx storybook
pnpm --filter @altr/apolyx build-storybook
pnpm --filter @altr/apolyx test
pnpm --filter @altr/apolyx build   # registry → elements/ui-kit/dist/r
```

## Apolyx CLI

```bash
pnpm --filter apolyx build
pnpm cli:apolyx -- init --registry ./elements/ui-kit/dist/r --yes
pnpm cli:apolyx -- add button --registry ./elements/ui-kit/dist/r --yes
```

Toolbar includes **light / dark** theme toggle (`@storybook/addon-themes`). Stories live under `elements/ui-kit/src/**/*.stories.tsx`.

See [[structure]] and [[../tech_space/02-ui-kit-storybook]].

Turbo pipelines: `dev`, `build`, `lint`, `typecheck`, `storybook`, `build-storybook`, `clean` — see root `turbo.json`.
