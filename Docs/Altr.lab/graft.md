---
title: "Trail-code — graft map for agents"
description: "How to install, wire, and use Trail-code (formerly Graft) in altr.lab (Cursor)"
created: 2026-09-26
updated: 2026-11-25
tags:
  - altr-lab
  - agents
  - graft
  - trail-code
  - context
---

# Trail-code — graft map for agents

> Use this when agents need cheaper, faster orientation in the monorepo. Companion skill: `.agents/skills/graft/SKILL.md`. Related: [[agent-skills]].

## What it is

[Trail-code](https://github.com/trailhq/Trail-Code) (`@trailhq/trail-code`, formerly Graft / `@nanonets/graft`) builds a **local markdown + wiring graph** of the repo so agents can answer “where / how / what breaks” without rediscovering the tree every turn. It also adds optional **learnings** under `.trail/`.

- Graph cache: `.trail/cache/` (gitignored — regenerable, like `node_modules`; older docs may still say `graft/`)
- Repo learnings (optional, team-shareable): `.trail/learnings/` — commit when using team mode
- Wiring for Cursor: always-on `.cursor/rules/trail.mdc` + knowledge router `.cursor/rules/knowledge-router.mdc`, skill under `.agents/skills/graft/`, MCP in `.cursor/mcp.json`
- Upstream: https://github.com/trailhq/Trail-Code · https://trailhq.com/trail-code · npm `@trailhq/trail-code`

`trail` is the preferred CLI. Every old `graft` command still works as an alias. There is **no** separate `graft.mdc` in this repo — Trail owns the always-on rule.

## Install (once per machine)

```bash
npm uninstall -g @nanonets/graft   # if you still have the old package
npm install -g @trailhq/trail-code
```

Or without a global install:

```bash
npx @trailhq/trail-code --help
```

Needs Node **22.3+** (20.16 also works).

### Windows note

The CLI depends on **tree-sitter native addons**. If install fails with `node-gyp` / “Could not find Visual Studio”:

1. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with workload **Desktop development with C++**
2. Retry `npm install -g @trailhq/trail-code`
3. Until that works, agents fall back to normal search; the skill + rule still document the intended workflow

## Wire this repo

From the monorepo root:

```bash
# Interactive: pick agents (choose Cursor)
trail init

# Non-interactive Cursor-only wiring (skip user-level files outside the repo)
trail init --agents cursor --no-global

# Preview files without writing
trail init --agents cursor --no-global --dry-run
```

What `init` typically writes for Cursor:

| Path | Role |
|------|------|
| `.cursor/rules/trail.mdc` | Trail-owned always-on rule |
| `.cursor/mcp.json` → `mcpServers.trail` | MCP: find code, map, callers, freshness |
| `.cursor/hooks.json` + hook shim | Optional session/tool hooks |
| `.trail/` | Learnings store (when enabled) |

This workspace keeps `.agents/skills/graft/` as the altr.lab Trail playbook and `.cursor/rules/trail.mdc` as the always-on rule. After a clean CLI install, run `trail init --agents cursor --no-global`, then `trail build`. Do not add a second always-on `graft.mdc` — it duplicates `trail.mdc`.

Team vs personal learnings:

| Flag | Meaning |
|------|---------|
| `--team` | Share `.trail/` with the repo (commit it) |
| `--just-me` | Keep Trail out of git; learnings in `~/.trail` |

## Build the graph

```bash
# Structural graph — no API key ($0, tree-sitter)
trail build

# Optional: LLM concept nodes + richer summaries
trail build --deep

# Freshness for CI / local check
trail build --check
# or: trail status
```

For `--deep`, set provider env vars (see upstream), e.g. `GRAFT_PROVIDER`, `GRAFT_API_KEY`, `GRAFT_MODEL` (env names still use the GRAFT_ prefix).

Monorepo tip: scope queries with `--in apps/apolyx/` (or another package) so one package does not drown the others.

## Everyday commands (agents + humans)

| Goal | Command |
|------|---------|
| Orient in an unfamiliar area | `trail map` |
| How / where does X work? | `trail ask "…" --source` |
| Every occurrence | `trail grep "SymbolName"` |
| File API surface | `trail skeleton path/to/file.ts` |
| Blast radius before rename | `trail callers Symbol --depth 2` |
| Full connected set before refactor | `trail callers Symbol --depth all` |
| Save a learning from this session | `trail note` |
| Diff vs learnings | `trail check` |

Prefer **one** well-chosen Trail call over a chain of greps. Do not pipe output through `head`/`tail` (truncates savings + hits).

MCP tool ids (when the Trail MCP server loads) still use the graft_ prefix: `graft_find_code`, `graft_find_all`, `graft_file_api`, `graft_trace_calls`, `graft_repo_map`, `graft_check_freshness`.

## Teammate onboarding

1. Install CLI: `npm install -g @trailhq/trail-code` (and VS C++ Build Tools on Windows if needed)
2. Pull repo (wiring is committed; `graft/` is not)
3. Run `trail build` locally
4. Restart Cursor so MCP picks up `.cursor/mcp.json` (`trail` server)

## Coming from `@nanonets/graft`

| Before | Now |
|--------|-----|
| `@nanonets/graft` | `@trailhq/trail-code` |
| `graft` CLI | `trail` (`graft` still works) |
| MCP package `@nanonets/graft` | `@trailhq/trail-code` |
| Code map only | Code map + optional learnings (`.trail/`) |

## Links

- Upstream: https://github.com/trailhq/Trail-Code
- Skill: `.agents/skills/graft/SKILL.md`
- Skills how-to: [[agent-skills]]
- Living map: [[../brain/00-Docs-Brain]]
