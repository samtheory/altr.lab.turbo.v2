---
title: "Agent skills — how to use them well"
description: "Best practices for the project skills installed under .agents/skills/"
created: 2026-09-26
updated: 2026-10-11
tags:
  - altr-lab
  - agents
  - skills
---

# Agent skills — how to use them well

> Open this when choosing which skill to attach, or when teaching the agent a workflow. Skills live in `.agents/skills/`. Graft: [[graft]]. Vault docs: [[../agents/docs_man/00-index|docs_man]].

## Principles

1. **One job per turn** — load the smallest useful skill set (usually 1; at most 2–3).
2. **Attach or name the skill** — say `/skill-name` or “use design-taste-frontend” so Cursor loads `SKILL.md`.
3. **Repo truth wins** — altr.lab conventions (`elements/ui-kit`, Docs vault, Turso) override generic skill defaults when they conflict.
4. **Do not stack competing design packs** — taste + impeccable + one aesthetic is enough; avoid loading 5 awesome-design styles at once.
5. **Authorized security only** — Strix skills are for **this monorepo / staging you own**. Never point them at third-party systems without explicit written authorization.

## Where skills live

| Location                 | Role                                                 |
| ------------------------ | ---------------------------------------------------- |
| `.agents/skills/<name>/` | Project installs (committed; portable)               |
| `skills-lock.json`       | Pin / restore with `npx skills experimental_install` |
| `.cursor/skills/`        | Cursor-specific mirrors (e.g. docs-brain, docs-man)  |
| `.cursor/mcp.json`       | Context7 + Graft MCP servers                         |
| `npx skills list`        | Inspect what is installed                            |

Install more:

```bash
npx skills find <query>
npx skills add <owner/repo> --skill <name> --agent cursor -y
npx skills add <owner/repo> --skill '*' --agent cursor -y   # whole pack
```

## Pack map (this workspace)

### Context & docs lookup

| Skill | When to use | Say / tip |
|-------|-------------|-----------|
| **graft** | Orient, find, blast-radius in this repo | Prefer before blind greps — [[graft]] |
| **context7-cli** / **context7-mcp** / **find-docs** | Up-to-date library APIs (React, Hono, …) | “use context7 for Next 15 docs” or MCP tools |
| **docs-man** / **docs-brain** | Update Docs vault | `update_docs` / `document it` |
| **pdf** / **doc-coauthoring** | PDFs or large new specs | Attach when needed |

### Design & UI

| Skill | When to use | Say / tip |
|-------|-------------|-----------|
| **design-taste-frontend** | Greenfield landing / portfolio; anti-slop taste | Default for new marketing UI |
| **impeccable** | Shape / critique / polish / audit / animate product UI | Commands: `critique`, `polish`, `bolder`, `audit`, … |
| **ui-skills-root** + pack | Route to smallest UI skill | `npx ui-skills start` or ask for **baseline-ui** / **improve-ui** / a11y |
| **baseline-ui** | Fast deslop: spacing, type, hierarchy | Quick polish pass |
| **improve-ui** | Read-only audit → handoff plan | Before a redesign sprint |
| **create-design-md** | Extract DESIGN.md from product/site | Persist design language |
| **fixing-accessibility** / **fixing-metadata** / **fixing-motion-performance** | Targeted fixes | Name the concern |
| **awesome-design-skills** (`minimal`, `editorial`, `shadcn`, …) | Commit to **one** named aesthetic | “use the `sleek` skill for this page” |

**Recommended design stack for altr.lab**

1. Preserve **ui-kit** / existing tokens when editing product apps.
2. New marketing surface → **design-taste-frontend** (or one awesome style).
3. Product polish → **impeccable** (`critique` then `polish`) or **baseline-ui**.
4. Accessibility pass → **fixing-accessibility**.

**Apolyx kit builder:** use the **apollo** sub-agent (`Docs/agents/apollo/`) — say `apollo` or `build apolyx`. Companion skills (React, Tailwind v4, Motion/animation, UX, tokens) are listed in [[../agents/apollo/skills/README]]. Do not stack competing aesthetics; repo intent in [[../feature_list/ui-kit/00-intent]] wins over generic skill defaults (no Radix).

### Browser & 3D

| Skill | When to use | Say / tip |
|-------|-------------|-----------|
| **playwright-cli** | Automate / snapshot a running UI | Needs `playwright-cli` on PATH or via npx |
| **img2threejs** | Image → procedural Three.js model | Attach reference image; follow staged pipeline |

### Security (Strix) — owned targets only

| Skill | When to use |
|-------|-------------|
| **application-security-testing** | Don’t know which test to run yet |
| **penetration-testing-with-strix** / **web-app-penetration-testing** | Live app / staging you control |
| **find-security-vulnerabilities-in-code** | White-box review of this repo |
| **api-security-testing** / **owasp-top-10-testing** | API or OWASP-scoped work |
| **fix-security-vulnerabilities-with-strix** | Remediate after a Strix report |
| **ci-security-scanning-with-strix** | Wire PR scanning |
| **managed-pentesting-with-strix** | app.strix.ai cloud (no local Docker) |

Requires Strix CLI/cloud credentials per https://docs.strix.ai — skills teach the agent the workflow; they do not replace install.

## Playbooks (copy-paste)

**Landing page from brief**

> Use `design-taste-frontend`. Read the brief, state a one-line Design Read, then implement in `apps/hub` using ui-kit where possible.

**Polish an existing screen**

> Use `impeccable critique` on `<path>`, then `impeccable polish` for ship-ready fixes. Do not change product copy without asking.

**Check library API you are unsure about**

> Use Context7 (`ctx7` / MCP) for current docs for `<library>`, then implement. Do not invent APIs from memory.

**Understand this monorepo before editing**

> Use Graft: `graft map` then `graft ask "…" --source` scoped with `--in apps/...` if needed. See [[graft]].

**Image to 3D**

> Use `img2threejs` with the attached reference. Follow stage gates; do not skip vision checks.

**Security review of our staging API**

> Use `api-security-testing` / Strix against **our** staging URL only. Summarize findings; fix via `fix-security-vulnerabilities-with-strix`.

## Anti-patterns

- Loading **taste + five aesthetic skills + impeccable** in one prompt (conflicting taste)
- Using Strix / exploit-oriented skills against systems you do not own
- Ignoring **docs_man** and inventing parallel doc folders
- Skipping Context7 for fast-moving libs (Next, React Compiler, Hono) when APIs matter
- Committing `graft/` (it is gitignored — each machine rebuilds)

## Maintain

```bash
npx skills list
npx skills update -p -y
npx skills check
```

After adding skills, refresh this note and [[../brain/00-Docs-Brain]] companion table if the pack set changes materially.
