---
title: "S0045 — /p/[project] scoping + project switcher"
description: "Scope every existing Studio screen to the active project via /p/[project] routes, cookie state, and a header switcher"
created: 2026-10-28
updated: 2026-11-01
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0045
  - done
---

# S0045 — `/p/[project]` scoping + switcher

> **Status:** **done** 2026-11-01 · **Depends on** [[S0044-new-project-wizard|S0044]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]] · After ship: [[../../../../tech_space/jord/studio/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** + **sindri** (BFF proxy per project) |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/graft/` · `.agents/skills/vercel-react-best-practices/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** — touches every route, do it before the shell rebuild |

## Goal

Every Studio screen moves under `/p/[project]/…`, the BFF forwards the project scope to the server, the active project persists in a cookie, and one header switcher changes it without losing your place.

## Why now

[[../../../../feature_list/Jord/todo/jord-F0023-studio-shell-v2|jord-F0023]], F0025, F0027, F0028, F0029 and F0030 all assume a project scope exists. Doing the shell before this means rebuilding routes twice.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]] |
| Code today | `apps/jord-studio/src/lib/jord-proxy.ts` · `middleware.ts` · `app/p/[project]/{tables,records,…}/` |
| Nav | `apps/jord-studio/src/lib/studio-nav.ts` (project-relative) |
| Tests | `pnpm --filter @altr/jord-studio typecheck` + `project-scope.test.ts` + server studio catalog tests |

**Do not break:** unauthenticated redirect to `/login`; the env-backed zero-project install (show a "default project" that maps to today's database).

## In scope

- Route move to `app/p/[project]/…`; a layout that resolves the project, 404s an unknown slug, and 410s an archived one.
- Cookie `jord_project` + server-side validation; switching updates the cookie and keeps the same sub-path when it exists.
- Header switcher (Apolyx `Select`) listing projects with engine badge + status.
- BFF: proxy sends the project scope on every call; a project mismatch fails closed (no cross-project reads).
- Default project for env-only installs so existing users are not locked out.
- Tests: unknown project 404, archived 410, cross-project request rejected.

## Out of scope

Cross-project queries · per-project RBAC · tabs across projects ([[../S0051-workspace-tabs|S0051]]) · per-project DB connection fan-out (scope header forwarded; primary DB still serves data until a later card).

## Diagram

```mermaid
flowchart LR
  R[/p/acme/tables] --> MW[middleware: cookie + project resolve]
  MW --> BFF[jord-proxy with project scope]
  BFF --> API[Jord /api/v1]
  SW[switcher] --> COK[cookie jord_project]
  COK --> MW
```

## Steps (do in order)

1. Graft the Studio route tree + proxy; list every route that needs moving.
2. Add the `[project]` layout + resolution (server side), then move screens one folder at a time; keep old paths as redirects to the default project if cheap.
3. Add project scope to the proxy; fail closed on mismatch.
4. Build the switcher with Apolyx primitives; persist the choice.
5. Smoke the main screens per project; typecheck + build.
6. **docs_man**: studio tech_space routing section; tick card.

## Done when

- [x] Every previous screen is reachable under `/p/<slug>/…`
- [x] Unknown slug → 404, archived → 410 with reason
- [x] A request for project B while scoped to A is rejected
- [x] Switcher keeps the section path and survives reload
- [x] Typecheck + build pass; proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-01 | `pnpm --filter @altr/jord-studio typecheck` | exit 0 (after clearing stale `.next`) |
| 2026-11-01 | `pnpm --filter @altr/jord-studio build` | exit 0 — routes under `/p/[project]/…` |
| 2026-11-01 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/project-scope.test.ts` | 3 pass (hrefs, legacy roots, mismatch → 403) |
| 2026-11-01 | `pnpm --filter @altr/jord-server test` | 161 pass — studio catalog / by-slug 404·410 |

**Shipped:** screens under `app/p/[project]/…` · middleware cookie + legacy redirects · `ProjectSwitcher` · BFF `x-jord-project` fail-closed · `default` env project · `/studio/projects` catalog on jord-server.

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` |
| Queue | [[../README]] |
