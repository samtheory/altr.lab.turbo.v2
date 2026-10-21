---
title: "mimir — companion skills"
description: "Skills mimir and specialists load for Jord: architecture, Hono, Drizzle, security, Postgres seam"
created: 2026-10-21
updated: 2026-10-21
tags:
  - agents
  - mimir
  - jord
  - skills
---

# mimir — companion skills

All paths under repo `.agents/skills/` unless noted. Install/restore: `npx skills experimental_install` · map: [[../../../Altr.lab/agent-skills]].

## Installed for mimir (2026-10-21)

| Skill | Source | Role | Primary specialist |
|-------|--------|------|--------------------|
| `improve-codebase-architecture` | mattpocock/skills (~1.1M) | Hexagonal ports, seams, refactor toward clean boundaries | mimir / saga |
| `architecture-patterns` | wshobson/agents | Backend architecture patterns | mimir |
| `architecture-decision-records` | wshobson/agents | Capture locked decisions without reopening Slice 0 | mimir / saga |
| `documentation-and-adrs` | addyosmani/agent-skills | ADR / design-doc habits | mimir |
| `nodejs-backend-patterns` | wshobson/agents | Node server structure, queues, graceful shutdown | sindri |
| `hono-typescript` | mindrally/skills | Hono routes / middleware typing | sindri |
| `drizzle-orm` | mindrally/skills | Drizzle schema / queries | saga |
| `supabase-postgres-best-practices` | supabase/agent-skills (~454K) | **Later** PostgresAdapter / SQL hygiene — do not install Postgres in S0001 | saga (later) |
| `security-and-hardening` | addyosmani/agent-skills | Hardening checklist | heimdall |

## Already in workspace (mimir core)

| Skill | Role |
|-------|------|
| `graft` | Orient before blind greps |
| `context7-cli` / `find-docs` | libSQL / Drizzle / Hono API truth |
| `api-security-testing` / `application-security-testing` / Strix pack | Authorized AppSec only |
| `find-security-vulnerabilities-in-code` | Static vuln hunt |
| `docs-man` | After ship → vault |
| apollo companion skills | Only when **apollo** builds Studio UI |

## Do not load together

- Postgres skills as permission to add `PostgresAdapter` runtime in Slice 0
- Competing “BaaS clone” skills that fight [[../../../feature_list/Jord/00-intent]]
- Full Strix pack + casual localhost probes without user authorization

## Reinstall commands

```bash
npx skills add mattpocock/skills --skill improve-codebase-architecture --agent cursor -y
npx skills add wshobson/agents --skill architecture-patterns --skill architecture-decision-records --skill nodejs-backend-patterns --agent cursor -y
npx skills add addyosmani/agent-skills --skill security-and-hardening --skill documentation-and-adrs --agent cursor -y
npx skills add supabase/agent-skills --skill supabase-postgres-best-practices --agent cursor -y
npx skills add mindrally/skills --skill hono-typescript --skill drizzle-orm --agent cursor -y
```

## Skills.sh notes (searched 2026-10-21)

Best fits for Jord feature_list (architecture + security + bulletproof services):

1. **improve-codebase-architecture** — highest-signal architecture skill found
2. **supabase-postgres-best-practices** — future dialect; SQL habits now
3. **security-and-hardening** — general hardening (pair with repo Strix)
4. **nodejs-backend-patterns** — server / queue / lifecycle
5. **hono-typescript** + **drizzle-orm** — stack-specific (lower install counts; still useful)

No first-class libSQL skill on the leaderboard; use Context7 + intent docs for `@libsql/client`.
