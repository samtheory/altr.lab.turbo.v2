---
title: "Prompt — update_docs / document it"
description: "Copy-paste prompts that invoke docs_man for altr.lab"
created: 2026-09-19
updated: 2026-09-19
tags:
  - agents
  - docs_man
  - prompts
---

# Prompts — docs_man

## Short trigger

```
update_docs
```

```
document it
```

## Full handoff

```
Act as docs_man (Docs/agents/docs_man).
Read Docs/brain/00-Docs-Brain.md and Docs/agents/docs_man/instructions/00-workflow.md.
Follow truth order: code > tech_space > report/plan > feature_list.
Document this change with proper YAML frontmatter (title, description, created, updated, tags).
Update the correct folder(s), refresh report/STATUS.md if needed, and add wikilinks on brain/00-Docs-Hub.md and brain/00-Docs-Brain.md.
Summarize files touched.
```

## After a feature ships

```
document it: [feature name] just shipped in [apps/… | cloud/… | elements/…].
Write/update tech_space, refresh report/STATUS, link from brain.
```

## Promote an idea

```
update_docs: promote Docs/idea/[file] → feature_list → draft a plan stub. Do not implement code.
```

## PDF ingest

```
update_docs: ingest this PDF into [feature_list|tech_space|idea]. Use .agents/skills/pdf. Produce structured MD with frontmatter + tags.
```
