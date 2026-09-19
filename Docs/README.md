# altr.lab Docs (second brain)

Obsidian-friendly knowledge base for the **altr.lab** Turborepo monorepo.

## Folder map

| Folder | Purpose |
|--------|---------|
| [Altr.lab/](Altr.lab/) | Main turbo project docs (structure, commands, stack, prompts) |
| [tech_space/](tech_space/) | Technical implementation docs (grows with the codebase) |
| [feature_list/](feature_list/) | Raw feature instructions awaiting implementation |
| [clickup/](clickup/) | ClickUp task / project management notes |
| [plan/](plan/) | Plans derived from feature_list + tech_space |
| [report/](report/) | Status: implemented / remaining / planned |
| [agents/](agents/) | AI sub-agent instructions, skills, prompts |
| [idea/](idea/) | Raw R&D ideas |

## Workflow

```
idea (R&D)
  → feature_list
  → plan  (using feature_list + tech_space)
  → implement
  → tech_space  (impl docs)
  → report  (status sum-up)
```

- **clickup/** — track tasks and ownership while work moves through the pipeline
- **agents/** — define AI sub-agents (instructions / skills / prompts) that help execute steps

Start with [Altr.lab/README.md](Altr.lab/README.md) for repo-specific how-tos.
