---
title: "agents — AI sub-agents"
description: "Index of altr.lab AI sub-agents, skills, and prompts"
created: 2026-09-19
updated: 2026-10-21
tags:
  - agents
  - index
---

# agents

AI sub-agents for altr.lab: instructions, skills, and prompts.

## Active agents

| Agent | Role | Entry |
|-------|------|-------|
| **docs_man** | Vault documentation steward (`update_docs` / `document it`) | [[docs_man/00-index]] |
| **apollo** | Apolyx UI kit builder (`apollo` / `build apolyx`) | [[apollo/00-index]] |
| **mimir** | Jord data-plane builder (`mimir` / `build jord`) — specialists sindri / saga / heimdall; Studio UI → apollo | [[mimir/00-index]] |

## Layout

```
agents/
├── README.md
├── docs_man/          # documentation sub-agent (portable pack)
├── apollo/            # Apolyx UI kit sub-agent (portable pack)
├── mimir/             # Jord data-plane sub-agent + specialists
├── templates/         # structured MD frontmatter template
├── instructions/      # shared / legacy standing instructions
├── skills/            # skill mirrors / notes
└── prompts/           # shared prompts
```

## Portable skills (repo root)

Canonical how-to: [[../Altr.lab/agent-skills]] · Graft: [[../Altr.lab/graft]]

| Skill | Path |
|-------|------|
| docs-man | `.agents/skills/docs-man/` |
| apollo | `.agents/skills/apollo/` |
| mimir | `.agents/skills/mimir/` |
| pdf | `.agents/skills/pdf/` |
| doc-coauthoring | `.agents/skills/doc-coauthoring/` |
| docs-brain | `.cursor/skills/docs-brain/` |
| graft | `.agents/skills/graft/` |
| design / UI / Strix / Context7 / Jord stack / … | `.agents/skills/` (see agent-skills) |

Cursor rules: `.cursor/rules/docs-man.mdc`, `.cursor/rules/apollo.mdc`, `.cursor/rules/mimir.mdc`, `.cursor/rules/graft.mdc`, `.cursor/rules/apolyx-first.mdc` · MCP: `.cursor/mcp.json` · Root: `AGENTS.md`

Wire agents into: idea → feature_list → plan → implement → tech_space → report → brain.
