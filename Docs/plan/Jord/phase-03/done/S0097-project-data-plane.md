---
title: "S0097 — per-project data-plane fan-out"
description: "Honor X-Jord-Project: open and cache each project's target DB for Studio schema/tables/SQL; keep control plane on primary"
created: 2026-11-25
updated: 2026-11-25
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0097
---

# S0097 — per-project data-plane fan-out

> **Status:** done 2026-11-25 · **Phase:** [[README]] · Parent: [[../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]] · As-built: [[../../../tech_space/jord/studio/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Parent feature** | `jord-F0021` |
| **Suggested agent** | mimir → **sindri** (+ apollo for Studio read-only UX) |
| **Companion skills** | `.agents/skills/graft/` · `.agents/skills/nodejs-backend-patterns/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | 2–3 h |
| **Parallel?** | **No** |

## Goal

When Studio sends `X-Jord-Project: <slug>`, schema / tables / rows / SQL / records hit that project's registered target database. Slug `default` (or missing) stays on the server primary. Control-plane routes (`/admin/projects`, `/studio/projects`, operator login) always use the primary.

Also: stop treating libSQL `main` as blocking **Add table** in Studio (engine marks it read-only for CREATE SCHEMA only).

## Why now

S0045 forwarded the header but the server ignored it — creating a second project registered metadata while every screen still read/wrote the primary DB. Operators saw a broken multi-project product and a false "read-only" tables sidebar on libSQL.

## Context (read before coding)

- Intent: [[../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]]
- Deferred from [[done/S0045-project-scoped-routes|S0045]]
- Code: `cloud/jord/src/projects/plane.ts` · `cloud/jord/src/app.ts` · `apps/jord-studio/src/components/studio-tables-sidebar.tsx`

## In scope

- `ProjectDataPlane` pool + ALS-scoped `JordDriverPort` proxy
- Middleware binds header → driver; unknown → 404, archived → 410
- Archive invalidates cached drivers
- Studio: allow table create on fixed libSQL `main`
- Focused vitest proof

## Out of scope

Per-project realtime bus isolation · per-project blob disk roots · hosted provisioning · Strix (S0092)

## Diagram

```mermaid
flowchart LR
  BFF[Studio BFF X-Jord-Project] --> MW[plane middleware]
  MW -->|default / control paths| P[primary DATABASE_URL]
  MW -->|registered slug| T[cached target driver]
  T --> DDL[schema / tables / SQL]
  P --> REG[/admin/projects]
```

## Steps (do in order)

1. Implement plane pool + scoped port.
2. Wire middleware + primary for registry/auth/logs.
3. Fix Studio libSQL create-table gate.
4. Proof with `plane.test.ts`.
5. docs_man: studio tech_space + STATUS + move card to done.

## Done when

- [x] Two libSQL-file projects: table created under slug A is invisible under slug B and `default`
- [x] `/admin/projects` still works with a bogus project header
- [x] Studio Add table enabled on single libSQL `main`

## Proof

```text
cd cloud/jord && pnpm test -- src/projects/plane.test.ts
# ✓ S0097 project data-plane fan-out (2)
```

## Out of scope / follow-ups

Realtime isolation closed in [[S0098-project-realtime-plane|S0098]].
