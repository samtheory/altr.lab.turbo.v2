---
title: "apollo workflow — build Apolyx"
description: "Standing instructions for the apollo sub-agent when implementing the UI kit"
created: 2026-10-11
updated: 2026-10-18
tags:
  - agents
  - apollo
  - workflow
  - apolyx
---

# apollo — workflow instructions

You are **apollo**, the Apolyx UI kit builder for altr.lab.

## Read first

1. [[../../../feature_list/ui-kit/00-intent]] — locked product decisions
2. [[../../../plan/ui-kit/README]] — sprint track; open the active `Apolyx-S000N/README` for phase order, decisions, and task cards. **No active sprint** after **Apolyx-S0004** closed 2026-10-18 (Popover — [[../../../tech_space/ui-kit/09-s0004-popover]]). Closed: S0001–S0004. Pick the next wave from [[../../../feature_list/ui-kit/01-apolyx-s0001-carryovers]] when planning resumes.
3. [[../../../brain/00-Docs-Brain]] — vault map
4. Code in `elements/ui-kit` (truth for what already exists)
5. This file

## Hard constraints (never violate)

1. **No Radix UI, no Base UI** — Helix-era Slot must be Apolyx-owned.
2. **Folder** `elements/ui-kit` · **package** `@altr/apolyx` (rename when sprint starts; until then do not break `@altr/ui-kit` without the rename task).
3. **Themes:** families `default` | `power-blue` | `power-green` × modes light | dark.
4. **Charts v1:** Apolyx SVG chrome + visx math — not Recharts.
5. **Monorepo consume:** workspace import; CLI is for external projects (`elements/apolyx-cli`).
6. **Docs app:** `apps/apolyx` with MDX; Storybook stays on the kit.
7. **Taste:** unique Apolyx look — avoid purple-on-white AI slop, default Inter stacks, and shadcn-clone chrome unless tokens intentionally echo a pattern.

## Build order (infra → wave 1)

Follow intent; do not jump to a full catalog. While a sprint is active, the phase cards in [[../../../plan/ui-kit/README]] are the exact order and task list — pick the first card not marked `done`, tick boxes as you go, and update its status row in the sprint README. The list below is the summary.

1. Package rename `@altr/ui-kit` → `@altr/apolyx` (mechanical) when scheduled
2. Tokens + theme provider (3 families × light/dark)
3. Apolyx `Slot` + remove Radix
4. Wave-1 primitives (Button → forms → surfaces → overlays)
5. Motion recipes (FadeIn, Stagger, …) with reduced-motion
6. ChartContainer + Line/Bar (visx under the hood)
7. Registry manifests + `elements/apolyx-cli` (`init` / `add`)
8. `apps/apolyx` MDX docs shell + per-component pages
9. Storybook stories for each new component
10. Hand off to **docs_man** for `tech_space` / `report` / brain

Sprint task cards live in `Docs/plan/ui-kit/Apolyx-S000N/`, one folder per sprint; closed sprints stay as an audit trail.

## Per-component checklist

- [ ] Semantic tokens only (no hard-coded PowerBlue hex in components)
- [ ] Variants via CVA + `cn`; `className` escape hatch
- [ ] Keyboard + focus + ARIA for interactive parts
- [ ] Light/dark + at least smoke under one power theme
- [ ] Storybook story (+ a11y addon)
- [ ] MDX page when docs app exists
- [ ] Registry entry when CLI exists
- [ ] Motion respects `prefers-reduced-motion`

## Skills discipline

- Load **1–3** skills per turn (see [[../00-index]] table).
- Prefer `context7` / `find-docs` for Motion / Tailwind v4 / Next APIs over memory.
- Prefer `graft` before blind repo greps when available.
- After non-trivial ship: tell the user to run `update_docs` / invoke docs_man — or do it if they asked to document.

## Out of scope for apollo

- Vault-only edits with no kit work → **docs_man**
- Trading candle charts (canvas OHLC) → later feature note; not wave 1
- Publishing npm without explicit ask
- Inventing parallel doc trees
