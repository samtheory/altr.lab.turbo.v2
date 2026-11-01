---
title: "S0043 — project registry API + keys + connect test"
description: "CRUD for projects with encrypted DB credentials, generated publishable/secret/barrier keys, and a non-persisting connect test"
created: 2026-10-28
updated: 2026-11-01
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0043
  - done
---

# S0043 — project registry API + keys + connect test

> **Status:** **done** 2026-11-01 · **Depends on** [[S0042-control-plane-store-adr|S0042]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]] · After ship: [[../../../../tech_space/jord/studio/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **saga** (schema/keys) + **sindri** (routes) |
| **Companion skills** | `.agents/skills/graft/` · `.agents/skills/hono-typescript/` · `.agents/skills/supabase-postgres-best-practices/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** |

## Goal

`/admin/projects` route group: list, create (register + test), get, patch notes/status, archive, rotate keys, and `POST /admin/projects/test` (ephemeral connect check). Create returns the secret key **once**; list/detail never return secrets.

## Why now

[[../S0044-new-project-wizard|S0044]] and [[../S0045-project-scoped-routes|S0045]] both need a real endpoint contract; building the form first would fake it.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]] |
| Depends on | [[S0042-control-plane-store-adr|S0042]] tables + secret port |
| Code today | `cloud/jord/src/auth/admin.ts` (existing admin guard) · `cloud/jord/src/auth/route-inventory.ts` (must list new routes) · `elements/jord/src/adapter/{postgres,libsql}.ts` for the connect test |
| Tests | `cloud/jord/src/projects/projects.test.ts` · `auth/principals` / `policies/part-c` inventory |

**Do not break:** admin-only guard on every route; archiving revokes keys but never drops a database.

## In scope

- Routes: `GET/POST /admin/projects`, `GET/PATCH/DELETE /admin/projects/:id` (delete = archive), `POST /admin/projects/:id/rotate-keys`, `POST /admin/projects/test`.
- Key generation: `jord_pub_…` (client-safe), `jord_sec_…` (hashed at rest, returned once), `jord_bar_…` (rate-limit/origin barrier).
- Connect test: open a short-lived adapter connection, run a cheap query, close; return engine error verbatim on failure and write no row.
- Archive: `status=archived`, keys revoked, dashboard/API calls return **410** with reason.
- Route inventory + admin tests updated; JSON never contains `password`, `secret_key`, or provider credentials.

## Out of scope

Hosted provider provisioning (Turso/Neon APIs) · team RBAC · billing.

## Diagram

```mermaid
sequenceDiagram
  participant S as Studio
  participant A as /admin/projects
  participant S3 as secret store
  participant DB as target DB
  S->>A: POST test {engine, target, user, password}
  A->>DB: connect + ping
  DB-->>A: ok / error
  S->>A: POST /admin/projects
  A->>S3: putSecret(db password)
  A-->>S: {project, secret_key once}
```

## Steps (do in order)

1. Graft `admin.ts` + route registration; add the route group in `cloud/jord/src/projects/`.
2. Implement the ephemeral connect test (per engine, short timeout).
3. Implement create (validate slug, test, encrypt, generate keys, baseline) + list/get/patch/archive/rotate.
4. Update `route-inventory.ts` / `part-c` MOUNTED; extend projects tests for admin-only access.
5. Tests: create per engine (mock target), secret returned once, absent from list JSON, archive → 410, failed test → no row.
6. Typecheck + test; paste proof.
7. **docs_man**: studio tech_space route table; tick card.

## Done when

- [x] Three engines create successfully in tests
- [x] Secret key appears only in the create response
- [x] List/detail JSON contains no credential fields (asserted)
- [x] Failed connect test leaves no project row
- [x] Archive → 410, keys revoked
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-01 | `pnpm --filter @altr/jord typecheck` | exit 0 |
| 2026-11-01 | `pnpm --filter @altr/jord-server typecheck` | exit 0 |
| 2026-11-01 | `pnpm --filter @altr/jord test` | **94 passed** \| 9 skipped (103) |
| 2026-11-01 | `pnpm --filter @altr/jord-server test` | **160 passed** \| 17 skipped (177) · includes `projects` (6) |

**Shipped:** `/admin/projects` CRUD + test + rotate-keys; `0010_project_db_password_sealed`; keys `jord_pub_` / `jord_sec_` / `jord_bar_` (SHA-256 at rest); AES-GCM sealed DB password column.

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` |
| Queue | [[../README]] |
