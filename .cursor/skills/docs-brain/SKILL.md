---
name: docs-brain
description: >-
  Maintains Docs/brain living map for altr.lab. Use when editing the brain,
  Docs hub, vault folder map, mermaid graphs, or when docs_man finishes a
  durable update that needs new wikilinks on 00-Docs-Brain or 00-Docs-Hub.
---

# docs-brain

## Files

- `Docs/brain/00-Docs-Brain.md` — living map (open first)
- `Docs/brain/00-Docs-Hub.md` — every folder explained

## Rules

1. Keep “How to read this vault” table complete for every top-level `Docs/` folder
2. Keep mermaid graphs aligned with the real pipeline: idea → feature_list → plan → code → tech_space → report
3. Keep “Repo surfaces” table aligned with `apps/`, `cloud/`, `elements/`
4. Keep “Status snapshot” freshness dates honest
5. Prefer updating existing rows over inventing parallel indexes
6. Link **docs_man** and companion skills from the brain header

## After edits

Bump frontmatter `updated`. If a folder was added/removed, update both Brain and Hub.
