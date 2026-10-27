---
name: docs-man
description: >-
  Documentation steward for the altr.lab Docs vault. Use when the user says
  update_docs, document it, docs_man, or asks to update brain, feature_list,
  plan, tech_space, report, clickup, idea, or Altr.lab docs. Enforces vault
  order, YAML frontmatter, wikilinks, and truth order (code > tech_space >
  report/plan > feature_list). Plan cards from phase-03 onward are one file
  per quick AI task (see Docs/agents/templates/plan-task.md).
---

# docs-man

Mirror of `.agents/skills/docs-man/SKILL.md` for Cursor skill discovery.

Follow `Docs/agents/docs_man/instructions/00-workflow.md` and keep `Docs/brain/00-Docs-Brain.md` accurate after durable doc changes.

`tech_space/` is a living system manual by **category** (why / what / how / one example). `feature_list/` features use `{app}-F####` ids (`INDEX.md` per app). `plan/` keeps phased **single-task** cards (one AI session each from phase-03 on) that cite a parent feature id. On ship, update the category note. Do not add `tech_space/<product>/phase-NN/` or per-sprint diaries. Jord map: `Docs/tech_space/jord/README.md`. Feature ids: `Docs/feature_list/README.md`. Task template: `Docs/agents/templates/plan-task.md`.
