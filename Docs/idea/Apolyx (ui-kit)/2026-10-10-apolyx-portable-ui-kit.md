---
title: "Apolyx — portable UI kit like shadcn / Smooth UI"
description: "Idea: own-primitives design system in elements/ui-kit with CLI install, MDX docs app, custom tokens, motion, charts"
created: 2026-10-10
updated: 2026-10-11
tags:
  - idea
  - ui-kit
  - apolyx
  - cli
  - design-system
---

# Apolyx — portable UI kit like shadcn / Smooth UI

> Exploratory note. Durable product intent lives in [[../../feature_list/ui-kit/00-intent]].

## Spark

Build a **personal / publishable UI kit** I can reuse across altr.lab apps and outside projects — same ergonomics as **shadcn/ui** and Smooth UI: a CLI that drops component source into the consumer, plus a clean docs site with per-component MDX.

Today `@altr/ui-kit` is a small monorepo package (Button / Card / Badge, Storybook, Tailwind tokens, Motion). The leap is: **registry + CLI + public docs brand**, with **primitives we own** (not Radix / Base UI), custom CSS tokens, theme variants, motion, and charts — and APIs so developers can restyle and compose without editing the kit’s source when they consume via package, or freely edit owned copies when they install via CLI.

## Working product name

**Apolyx** — from *Apollo*, the Greek god of music, poetry, art and light, with a crisp *-yx* ending. Chosen 2026-10-11 to replace the first working name "Helix", which another UI kit already uses. See [[2026-10-11-naming-and-domains]].

| Surface | Path / name |
|---------|-------------|
| Source of truth | `elements/ui-kit` (`@altr/ui-kit`) |
| Docs / marketing app | `apps/apolyx` (MDX, shadcn-clean docs UX) |
| Workshop | Storybook on `elements/ui-kit` (keep) |
| CLI (future publish) | e.g. `npx apolyx add button` |

Source path stays `elements/ui-kit`; Apolyx is the public brand for the docs, CLI and npm package.

## Why not stay “just a package”?

- Package import is great inside the monorepo.
- Outside projects (and power users) want **owned source** via CLI, like shadcn — customize locally, upgrade selectively from a registry.
- A dedicated docs app is the distribution face; Storybook stays the component workshop.

## Hard preferences (idea constraints)

1. **No Radix UI, no Base UI** — build Apolyx’s own accessible primitives (starting thin; grow carefully).
2. **Tailwind v4 + custom CSS tokens** — our token set, not a default shadcn palette clone.
3. **Light / dark + named theme variants** (e.g. trading, editorial).
4. **Motion** (`motion`) first-class — primitives + recipes, reduced-motion respected.
5. **Charts** as part of the kit, same install story as components.
6. **Developer leverage** — variants, tokens, composition, slots/as patterns so apps rarely need to fork kit source; CLI installs make the code theirs when they want to.

## What exists today (baseline, not the end state)

- `elements/ui-kit` + Storybook 9
- shadcn-flavored Button/Card/Badge (currently uses `@radix-ui/react-slot`)
- ThemeProvider / ThemeToggle, FadeIn
- Documented in [[../../feature_list/01-hub-ui-kit-base]] · [[../../feature_list/02-ui-kit-storybook]]

Apolyx **extends and eventually replaces** that “thin shadcn package” model with a registry-first kit.

## Open questions (for later plan / tech_space)

- Publish: npm registry vs private shadcn-style registry URL vs both?
- Monorepo apps: keep workspace import, or migrate hub/dashboard to CLI copies?
- Primitive a11y strategy without Radix (how far before we need focus traps, roving tabindex helpers)?
- Chart rendering: pure SVG/canvas primitives vs a thin open-source engine wrapped in Apolyx API?
- Exact CLI package name when publishing (`apolyx` vs `@altr/cli`).

## Next docs step

Promote into [[../../feature_list/ui-kit/00-intent]] (infra + tech + first component list). **No sprint plan yet** — plan/ui-kit comes when we start building.
