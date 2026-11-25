# Agent notes — altr.lab

## Documentation

For Docs vault work (`update_docs`, `document it`, brain/report/tech_space updates):

- Follow **docs_man**: `Docs/agents/docs_man/00-index.md`
- Living map: `Docs/brain/00-Docs-Brain.md`
- Skills: `.agents/skills/docs-man/`, `.cursor/skills/docs-man/`, `.agents/skills/pdf/`, `.agents/skills/doc-coauthoring/`
- Rule: `.cursor/rules/docs-man.mdc`

Pipeline: `idea` → `feature_list` → `plan` → code → `tech_space` → `report` → refresh `brain`.

Truth order: **code** > **tech_space** > **report/plan** > **feature_list**.

Ephemeral staging (not truth): `Docs/temp/input` (inbound scratch) · `Docs/temp/output` (outbound scratch). See `Docs/temp/README.md`.

## Apolyx UI kit (apollo)

**Apolyx-first (always):** product apps consume `@altr/apolyx` only. If a control is missing, build it in the kit with **apollo**, document it (**docs_man**), then import in the app — never fork local primitives. Rule: `.cursor/rules/apolyx-first.mdc`.

For building the design system (`apollo`, `build apolyx`, `elements/ui-kit`, `apps/apolyx`, CLI):

- Follow **apollo**: `Docs/agents/apollo/00-index.md`
- Intent: `Docs/feature_list/ui-kit/00-intent.md`
- Skills: `.agents/skills/apollo/` · companion list in `Docs/agents/apollo/skills/README.md`
- Rule: `.cursor/rules/apollo.mdc` · Cursor skill: `.cursor/skills/apollo/`

## Jord program (mimir)

For anything Jord (`mimir`, `build jord`, `elements/jord`, `cloud/jord`, `apps/jord-studio`):

- Follow **mimir** as **program master**: `Docs/agents/mimir/00-index.md`
- Intent map: `Docs/feature_list/Jord/README.md` · Capabilities: `Docs/feature_list/Jord/04-phase-01-capabilities.md` · Architecture: `Docs/feature_list/Jord/02-architecture.md` · Studio: `Docs/feature_list/Jord/03-jord-studio.md`
- Plans: `Docs/plan/Jord/README.md` (phase-01 archive · phase-02 next) · As-built: `Docs/tech_space/jord/README.md`
- Hats: **sindri** (engine), **saga** (schema), **heimdall** (security), **apollo** (Studio UI / kit), **docs_man** (vault)
- Say `mimir … with apollo` to run Studio under mimir’s conduct; mimir still owns the outcome
- Skills: `.agents/skills/mimir/` · companion list in `Docs/agents/mimir/skills/README.md`
- Rule: `.cursor/rules/mimir.mdc` · Cursor skill: `.cursor/skills/mimir/`

## Shared `@altr/base` (leaf)

- Framework utilities only (`elements/base`) — env, errors, Result, content helpers, …
- **Base has no dependency** on jord, apolyx, or any other element
- Apps / cloud / elements **may** depend on `@altr/base`
- Prefer **no peer-element deps** so packages stay individually add/removable
- Contract: `Docs/feature_list/00-elements-dependency-rules.md`

## Knowledge sources (always)

| Need | Use |
|------|-----|
| This monorepo's code (where / how / callers) | **Trail** — CLI `trail …` or Trail MCP; always-on `.cursor/rules/trail.mdc`; cache `.trail/cache/` |
| Intent, plans, STATUS, as-built | **Docs/** — truth order above; vault writes via **docs_man** |
| External library APIs | **Context7** MCP (or `ctx7` / `context7-cli` skill) — do not invent from memory |

Router rule: `.cursor/rules/knowledge-router.mdc`.

## Agent skills + Trail-code

- How to use project skills: `Docs/Altr.lab/agent-skills.md`
- Trail-code playbook: `Docs/Altr.lab/graft.md` · skill `.agents/skills/graft/` · always-on `.cursor/rules/trail.mdc` · package `@trailhq/trail-code`
- Installed skills live under `.agents/skills/` (lockfile: `skills-lock.json`)
- MCP (Context7 + Trail): `.cursor/mcp.json` — Context7 must be a real binary on PATH (`context7-mcp.cmd`), not `npx` from this pnpm root
