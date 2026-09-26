---
title: "Graft — codebase graph for agents"
description: "How to install, wire, and use Graft in altr.lab (Cursor)"
created: 2026-09-26
updated: 2026-09-26
tags:
  - altr-lab
  - agents
  - graft
  - context
---

# Graft — codebase graph for agents

> Use this when agents need cheaper, faster orientation in the monorepo. Companion skill: `.agents/skills/graft/SKILL.md`. Related: [[agent-skills]].

## What it is

[Graft](https://github.com/trailhq/Graft) (`@nanonets/graft`) builds a **local markdown + wiring graph** of the repo so agents can answer “where / how / what breaks” without rediscovering the tree every turn.

- Graph cache: `graft/` (gitignored — regenerable, like `node_modules`)
- Wiring for Cursor: `.cursor/rules/graft.mdc`, skill under `.agents/skills/graft/`, optional MCP in `.cursor/mcp.json`
- Upstream: https://graft.nanonets.ai · https://skills.sh/trailhq/graft/graft

## Install (once per machine)

```bash
npm install -g @nanonets/graft
```

Or without a global install:

```bash
npx @nanonets/graft --help
```

### Windows note

The CLI depends on **tree-sitter native addons**. If install fails with `node-gyp` / “Could not find Visual Studio”:

1. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with workload **Desktop development with C++**
2. Retry `npm install -g @nanonets/graft`
3. Until that works, agents fall back to normal search; the Graft skill + rule still document the intended workflow

## Wire this repo

From the monorepo root:

```bash
# Interactive: pick agents (choose Cursor)
graft init

# Non-interactive Cursor-only wiring
graft init --agents cursor

# Preview files without writing
graft init --dry-run --agents cursor
```

What `init` typically writes for Cursor:

| Path | Role |
|------|------|
| `.cursor/rules/graft.mdc` | Always-on rule to prefer Graft |
| `.agents/skills/graft/` or Cursor skill path | Full command playbook |
| MCP entry for `graft` | Tools: find code, map, callers, freshness |

This workspace already has the skill, rule, and MCP stub. After the CLI installs cleanly, run `graft init --agents cursor` again so Graft can refresh its owned files, then build the graph.

## Build the graph

```bash
# Structural graph — no API key ($0, tree-sitter)
graft build

# Optional: LLM concept nodes + richer summaries
graft build --deep

# Freshness for CI / local check
graft check
```

For `--deep`, set provider env vars (see upstream `.env.example`), e.g. `GRAFT_PROVIDER`, `GRAFT_API_KEY`, `GRAFT_MODEL`.

Monorepo tip: scope queries with `--in apps/hub/` (or another package) so one app does not drown the others.

## Everyday commands (agents + humans)

| Goal | Command |
|------|---------|
| Orient in an unfamiliar area | `graft map` |
| How / where does X work? | `graft ask "…" --source` |
| Every occurrence | `graft grep "SymbolName"` |
| File API surface | `graft skeleton path/to/file.ts` |
| Blast radius before rename | `graft callers Symbol --depth 2` |
| Full connected set before refactor | `graft callers Symbol --depth all` |

Prefer **one** well-chosen Graft call over a chain of greps. Do not pipe Graft output through `head`/`tail` (truncates savings + hits).

MCP equivalents (when the Graft MCP server loads): `graft_find_code`, `graft_find_all`, `graft_file_api`, `graft_trace_calls`, `graft_repo_map`, `graft_check_freshness`.

## Teammate onboarding

1. Install CLI (and VS C++ Build Tools on Windows if needed)
2. Pull repo (wiring is committed; `graft/` is not)
3. Run `graft build` locally
4. Restart Cursor so MCP picks up `.cursor/mcp.json`

## Links

- Skill: `.agents/skills/graft/SKILL.md`
- Skills how-to: [[agent-skills]]
- Living map: [[../brain/00-Docs-Brain]]
