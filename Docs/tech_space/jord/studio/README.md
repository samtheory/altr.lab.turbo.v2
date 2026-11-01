---
title: "Jord Studio"
description: "Next.js control plane: BFF, session cookie, Apolyx-only UI, SQL console, migrate wizard, users admin; S0042 control-plane tables + secret port"
created: 2026-10-24
updated: 2026-11-01
tags:
  - tech-space
  - jord
  - studio
---

# Jord Studio

> Who: anyone changing `apps/jord-studio`. Product intent: [[../../../feature_list/Jord/done/jord-F0012-studio]] · multi-project [[../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]]. Server behavior lives in the other categories — this note is only the control plane.

## Why

Operators need tables, jobs, APIs, and files without a SQL shell and without the browser opening `data/jord.db`. The app is a proxy plus screens.

## What

| Piece | Fact |
|-------|------|
| Package | `apps/jord-studio` (`@altr/jord-studio`), Next.js |
| UI | `@altr/apolyx` only. No local Dialog/Table kit |
| Upstream | `JORD_SERVER_URL` default `http://127.0.0.1:8787` |
| Dev | `pnpm dev:jord` then `pnpm dev:jord-studio` (`:3005`) |
| Gate | `/login` sets `jord_session`. `JORD_STUDIO_OPEN=1` skips the gate for local dev |
| Proxy | `src/lib/jord-proxy.ts` — `cache: "no-store"`. Upstream down → **503**. **409** passes through |

`body` on `records` is TEXT. The editor is column fields. A switch may validate JSON; storage is still a string.

## How — screens

Nav config: `apps/jord-studio/src/lib/studio-nav.ts`. Shell: `StudioShell` (desktop `NavList`, mobile `Sheet`).

| Screen | Route | Talks to |
|--------|-------|----------|
| Records editor | `/records` | [[../writes/README]] + Live [[../realtime/README]] |
| Tables | `/tables`, `/tables/[name]` | [[../schema/README]] [[../writes/README]] |
| Schema | `/schema` | [[../schema/README]] |
| Connection | `/database/connection` | [[../dialects/README]] — labels only; **no URL editor** |
| SQL console | `/database/sql` | `POST /sql/execute` — admin; read-only via engine pragma |
| Migrate | `/database/migrate` | `POST /migrate/jobs` — admin; never deletes source |
| Users | `/auth/users` | `GET /admin/users` — disable / revoke |
| Policies / Triggers | Database nav | [[../policies/README]] |
| Generated / Function / Custom / Table APIs | `/apis/…` | [[../apis/README]] |
| Jobs / Logs | `/jobs`, `/logs` | [[../jobs/README]] — logs batch into `jord_logs` |
| Storage | `/storage` | [[../blobs/README]] |
| Vectors | `/vectors` | [[../vectors/README]] |

BFF routes live under `apps/jord-studio/src/app/api/` and mirror the server paths.

## SQL console (S0024)

Admin operator only. Read-only default uses a **dedicated** libSQL connection with `PRAGMA query_only=ON` (Postgres: `BEGIN READ ONLY` + `statement_timeout`). Those reads never enter the write queue. Writes require the toggle off and go through `enqueueWrite`. Every statement is audited in `jord_sql_audit`. Raw SQL bypasses the migration runner and, on libSQL, the outbox.

## Migrate wizard (S0024)

File libSQL → Turso or Postgres. Type map: TEXT→text, INTEGER→bigint, REAL→double precision, BLOB→bytea. Skip `jord_vix_*`. Destination URL is accepted once for the job, never returned in JSON, and the source is never deleted.

## Example

```bash
pnpm dev:jord
pnpm dev:jord-studio
```

Sign in as admin, open **SQL console**, run `SELECT 1`, then flip read-only off only when you intend a queued write.

## Control-plane store (S0042)

ADR: [[ADR-control-plane-store]]. **Decision:** project metadata lives in `jord_projects` / `jord_project_keys` on the **server primary** `DATABASE_URL` (never inside a registered project target). Secrets at rest use **AES-256-GCM** + `JORD_MASTER_KEY` (`putSecret` / `getSecret` / `rotate` on `@altr/jord`). Create flow is **register + test** only (no hosted provisioning).

| Piece | Fact |
|-------|------|
| Migration | `0009_control_plane_projects.sql` (libSQL + Postgres) |
| Types | `elements/jord/src/schema/projects.ts` |
| Secret port | `elements/jord/src/control-plane/secret-port.ts` · wired on `createJordApp` as `secrets` (null when master key unset) |
| HTTP | **None yet** — registry API is [[../../../plan/Jord/phase-03/S0043-project-registry-api\|S0043]] |

Zero-project / single-DB boots stay valid without `JORD_MASTER_KEY`.

## Not in Jord yet

Monaco, multi-tenant hosting, Artemis screens inside Studio. Writable connection-string editor waits on the project registry (S0043–S0045).
