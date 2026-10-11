---
title: "apollo — companion skills"
description: "Skills apollo loads for Apolyx: already in repo + newly installed for React/Tailwind/Motion/taste"
created: 2026-10-11
updated: 2026-10-11
tags:
  - agents
  - apollo
  - skills
---

# apollo — companion skills

All paths under repo `.agents/skills/` unless noted. Install/restore: `npx skills experimental_install` · map: [[../../../Altr.lab/agent-skills]].

## Newly installed for apollo (2026-10-11)

| Skill | Source | Role |
|-------|--------|------|
| `vercel-react-best-practices` | vercel-labs/agent-skills | React performance & patterns |
| `vercel-composition-patterns` | vercel-labs/agent-skills | Component composition |
| `web-design-guidelines` | vercel-labs/agent-skills | Web UI quality bar |
| `frontend-design` | anthropics/skills | Distinctive frontend craft |
| `animate` | emilkowalski/skills | Animation implementation |
| `improve-animations` | emilkowalski/skills | Polish motion |
| `animation-vocabulary` | emilkowalski/skills | Motion language |
| `review-animations` | emilkowalski/skills | Critique motion |
| `emil-design-eng` | emilkowalski/skills | Design engineering taste |
| `tailwind-design-system` | wshobson/agents | Tailwind DS structure |
| `tailwind-4-docs` | lombiq/tailwind-agent-skills | Tailwind v4 specifics |
| `ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill | UI/UX best practices |
| `design-tokens` | julianoczkowski/designer-skills | Token systems |

## Already in workspace (apollo core)

| Skill | Role |
|-------|------|
| `design-taste-frontend` / `high-end-visual-design` / `gpt-taste` | Unique taste / anti-slop |
| `impeccable` | Critique / polish / audit |
| `baseline-ui` / `improve-ui` / `ui-skills-root` / `create-design-md` | UI polish pipeline |
| `fixing-accessibility` / `fixing-motion-performance` | A11y + motion perf |
| `power` | Aesthetic aligned with PowerBlue / PowerGreen energy (optional, one style only) |
| `context7-cli` / `find-docs` | Up-to-date lib docs |
| `graft` | Codebase graph |
| `playwright-cli` | Visual / browser checks |
| `docs-man` | After ship → vault |

## Do not load together

- Multiple competing awesome-design aesthetics (pick **one** if any).
- `shadcn` aesthetic skill as a substitute for Apolyx primitives (CLI ergonomics inspiration only — still no Radix).

## Reinstall commands

```bash
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices --skill web-design-guidelines --skill vercel-composition-patterns --agent cursor -y
npx skills add anthropics/skills --skill frontend-design --agent cursor -y
npx skills add emilkowalski/skills --skill animate --skill improve-animations --skill animation-vocabulary --skill review-animations --skill emil-design-eng --agent cursor -y
npx skills add wshobson/agents --skill tailwind-design-system --agent cursor -y
npx skills add lombiq/tailwind-agent-skills --skill tailwind-4-docs --agent cursor -y
npx skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max --agent cursor -y
npx skills add julianoczkowski/designer-skills --skill design-tokens --agent cursor -y
```
