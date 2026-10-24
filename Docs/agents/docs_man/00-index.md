---
title: "docs_man — documentation sub-agent"
description: "Owns Docs vault updates for altr.lab: order, frontmatter, brain links, PDF and structured MD"
created: 2026-09-19
updated: 2026-10-24
tags:
  - agents
  - docs_man
  - index
---

# docs_man

Sub-agent that documents altr.lab in the correct vault order. Portable: copy `Docs/agents/docs_man/` plus `.agents/skills/docs-man/` to another machine or repo.

## Triggers

Use this agent when the user says any of:

- `update_docs`
- `document it`
- `docs_man`
- “update the brain / report / tech_space after this change”

## Canonical references

| Piece | Path |
|-------|------|
| Living map | [[../../brain/00-Docs-Brain]] |
| Folder hub | [[../../brain/00-Docs-Hub]] |
| Standing instructions | [[instructions/00-workflow]] — tech_space is **categories** (why/what/how), plans stay **phases** |
| Structured MD template | [[../templates/structured-note]] |
| Cursor skill (auto) | `.cursor/skills/docs-man/SKILL.md` |
| Portable skill | `.agents/skills/docs-man/SKILL.md` |
| Cursor rule | `.cursor/rules/docs-man.mdc` |
| Prompt pack | [[prompts/00-update-docs]] |

## Companion skills

| Skill | Path / install | Role |
|-------|----------------|------|
| `docs-man` | `.agents/skills/docs-man/` | Vault order + frontmatter |
| `docs-brain` | `.cursor/skills/docs-brain/` | Keep brain map honest |
| `pdf` | `.agents/skills/pdf/` · `npx skills add anthropics/skills@pdf -g -y` | PDF read/create/merge |
| `doc-coauthoring` | `.agents/skills/doc-coauthoring/` · `npx skills add anthropics/skills@doc-coauthoring -g -y` | Large new specs |
| `writing-for-agents` | `npx skills add mattpocock/skills@writing-for-agents -g -y` | Agent-readable prose |
| `obsidian-vault` | `npx skills add mattpocock/skills@obsidian-vault -g -y` | Wikilink / index habits |
| `find-skills` | user skill | Discover more on skills.sh |

## Layout (portable)

```
Docs/agents/docs_man/
├── 00-index.md              # this file
├── instructions/
│   └── 00-workflow.md       # order of operations
├── prompts/
│   └── 00-update-docs.md    # copy-paste / slash-style prompts
└── skills/
    └── README.md            # mirrors .agents/skills for this agent
```

## Install elsewhere

1. Copy `Docs/agents/docs_man/` into the target vault’s `agents/`
2. Copy `.agents/skills/docs-man/`, `.agents/skills/pdf/`, `.agents/skills/doc-coauthoring/`
3. Copy `.cursor/skills/docs-man/`, `.cursor/skills/docs-brain/`, `.cursor/rules/docs-man.mdc`
4. Point brain wikilinks at the new vault’s folder names
5. Optionally run the `npx skills add …` commands above for global installs
