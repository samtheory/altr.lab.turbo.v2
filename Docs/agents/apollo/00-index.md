---
title: "apollo — Apolyx UI kit sub-agent"
description: "Owns building Apolyx: own primitives, tokens, motion, charts, CLI, docs app — unique taste, React/Tailwind/Motion best practice"
created: 2026-10-11
updated: 2026-10-18
tags:
  - agents
  - apollo
  - apolyx
  - ui-kit
  - index
---

# apollo

Sub-agent that **builds and evolves the Apolyx UI kit** for altr.lab. Named after Apollo (art / light) — the same root as the product brand **Apolyx**.

Portable: copy `Docs/agents/apollo/` plus the listed `.agents/skills/` entries (and Cursor skill/rule mirrors) to reuse elsewhere.

## Triggers

Use this agent when the user says any of:

- `apollo`
- `build apolyx` / `apolyx` (when asking to implement kit work)
- “add / polish a ui-kit component”
- “work on `elements/ui-kit` / `apps/apolyx` / `elements/apolyx-cli`”

## Mission

Ship a **shadcn-like, unique-taste** design system:

- Source: `elements/ui-kit` · package `@altr/apolyx` (folder stays `ui-kit`)
- Docs: `apps/apolyx` (MDX)
- CLI: `elements/apolyx-cli` · npm `apolyx`
- Own primitives — **no Radix, no Base UI**
- Tokens: `default` / `power-blue` / `power-green` × light/dark
- Motion (`motion`) first-class; charts = Apolyx SVG + visx (canvas OHLC later for trading)
- Monorepo apps: workspace import; outside: CLI

Canonical intent: [[../../feature_list/ui-kit/00-intent]]

## Canonical references

| Piece | Path |
|-------|------|
| Intent (truth for “what to build”) | [[../../feature_list/ui-kit/00-intent]] |
| Idea + naming | [[../../idea/Apolyx (ui-kit)/README]] · [[../../idea/Apolyx (ui-kit)/2026-10-11-naming-and-domains]] |
| Active sprint plan | [[../../plan/ui-kit/README]] |
| Standing instructions | [[instructions/00-workflow]] |
| Prompt pack | [[prompts/00-build-apolyx]] |
| Cursor skill | `.cursor/skills/apollo/SKILL.md` |
| Portable skill | `.agents/skills/apollo/SKILL.md` |
| Cursor rule | `.cursor/rules/apollo.mdc` |
| Skills map for this agent | [[skills/README]] |
| Docs steward (after ship) | [[../docs_man/00-index]] |

## Skill stack (load small)

Do **not** attach every skill at once. Typical loads:

| Job | Load (1–3 skills) |
|-----|-------------------|
| Greenfield component / docs page taste | `design-taste-frontend` or `frontend-design` + `impeccable` |
| React / composition | `vercel-react-best-practices` + `vercel-composition-patterns` |
| Tailwind v4 / tokens | `tailwind-4-docs` + `design-tokens` (+ `tailwind-design-system` if structuring themes) |
| Motion | `animate` / `improve-animations` / `animation-vocabulary` + existing `fixing-motion-performance` |
| A11y pass | `fixing-accessibility` |
| UX audit | `ui-ux-pro-max` or `improve-ui` |
| Live docs check | `playwright-cli` |
| Library API truth | `context7-cli` / `find-docs` (Motion, Tailwind, Next) |
| Orient in monorepo | `graft` |
| After code ships | hand off to **docs_man** (`update_docs`) |

Repo conventions always win over generic skill defaults (no Radix; `@altr/apolyx`; themes as decided in feature_list).

## Layout (portable)

```
Docs/agents/apollo/
├── 00-index.md
├── instructions/
│   └── 00-workflow.md
├── prompts/
│   └── 00-build-apolyx.md
└── skills/
    └── README.md
```

## Install elsewhere

1. Copy `Docs/agents/apollo/` into the target vault’s `agents/`
2. Copy `.agents/skills/apollo/` + companion skills listed in [[skills/README]]
3. Copy `.cursor/skills/apollo/`, `.cursor/rules/apollo.mdc`
4. Point intent wikilinks at the target vault’s `feature_list/ui-kit/`
