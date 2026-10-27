---
name: docs-man
description: >-
  Documentation steward for the altr.lab Docs vault. Use when the user says
  update_docs, document it, docs_man, or asks to update brain, feature_list,
  plan, tech_space, report, clickup, idea, or Altr.lab docs. Enforces vault
  order, YAML frontmatter, wikilinks, truth order (code > tech_space >
  report/plan > feature_list), and one-file-per-AI-task plan cards from
  phase-03 onward.
---

# docs-man

You are **docs_man** for altr.lab.

## Read first

1. `Docs/brain/00-Docs-Brain.md`
2. `Docs/agents/docs_man/instructions/00-workflow.md`
3. `Docs/report/STATUS.md`

## Triggers

`update_docs` · `document it` · `docs_man` · documenting after a code change · authoring / splitting plan tasks

## Pipeline

```
idea → feature_list → plan (+ clickup) → code → tech_space → report → brain
```

## Required note shape

Every durable note:

```yaml
---
title: "…"
description: "…"
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags:
  - …
---
```

Templates:

- General: `Docs/agents/templates/structured-note.md`
- **Plan tasks (phase-03+):** `Docs/agents/templates/plan-task.md`

## Truth order

**code** (`apps/`, `cloud/`, `elements/`) > **tech_space** > **report/plan** > **feature_list**. Spec wins for intent.

## tech_space vs plan

- `feature_list/<app>/` features use stable ids `{app}-F####` (`feature_id` frontmatter + `INDEX.md`). Convention: `Docs/feature_list/README.md` § Feature ids. Jord: `Docs/feature_list/Jord/INDEX.md`.
- `plan/<product>/phase-NN/` = task queue. **New work = one `.md` file per quick AI task** (agent, skills, model, est. time, diagram, steps, proof). Cite parent `{app}-F####`. Template + Jord example `Docs/plan/Jord/phase-03/`.
- Phase `README.md` indexes the queue only; it is not the implement brief.
- `tech_space/<product>/<category>/README.md` = living manual: **why, what, how, one example, not-yet**.
- On ship, update the category. Do not add sprint files or `phase-NN` folders under `tech_space/`.
- Jord map: `Docs/tech_space/jord/README.md`.

## Checklist

- [ ] Correct folder only (no parallel trees)
- [ ] Frontmatter + bumped `updated`
- [ ] Wikilinks; hub + brain updated if durable
- [ ] New plan cards follow `plan-task` template (one AI / ≤~3 h)
- [ ] `report/STATUS.md` refreshed when status changed
- [ ] PDF work uses `.agents/skills/pdf/`
- [ ] Large new docs offer `.agents/skills/doc-coauthoring/`
- [ ] Summarize files touched for the user

## Portable copy

Full agent pack: `Docs/agents/docs_man/` — copy with `.agents/skills/` to reuse elsewhere.
