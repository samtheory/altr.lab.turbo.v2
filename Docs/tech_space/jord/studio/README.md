---
title: "Jord Studio"
description: "Next.js control plane: BFF, session cookie, Apolyx-only UI; S0042–S0045 projects registry, wizard, /p/[project] scoping + switcher"
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
| Records editor | `/p/[project]/records` | [[../writes/README]] + Live [[../realtime/README]] |
| Tables | `/p/[project]/tables`, `…/tables/[name]` | [[../schema/README]] [[../writes/README]] |
| Schema | `/p/[project]/schema` | [[../schema/README]] |
| Connection | `/p/[project]/database/connection` | [[../dialects/README]] — labels only; **no URL editor** |
| SQL console | `/p/[project]/database/sql` | `POST /sql/execute` — admin; read-only via engine pragma |
| Migrate | `/p/[project]/database/migrate` | `POST /migrate/jobs` — admin; never deletes source |
| Users | `/p/[project]/auth/users` | `GET /admin/users` — disable / revoke |
| Projects | `/projects`, `/projects/new`, `/projects/[id]/edit` | BFF → `GET/POST /admin/projects` · test · rotate · archive · one-time key reveal (control plane, not project-prefixed) |
| Project home | `/p/[project]` | Scoped landing + switcher target |
| Policies / Triggers | `/p/[project]/database/…` | [[../policies/README]] |
| Generated / Function / Custom / Table APIs | `/p/[project]/apis/…` | [[../apis/README]] |
| Jobs / Logs | `/p/[project]/jobs`, `…/logs` | [[../jobs/README]] — logs batch into `jord_logs` |
| Storage | `/p/[project]/storage` | [[../blobs/README]] |
| Vectors | `/p/[project]/vectors` | [[../vectors/README]] |

Legacy unscoped paths (`/tables`, `/records`, …) **redirect** via middleware to `/p/<cookie|default>/…`.

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

## Control-plane store (S0042) + registry API (S0043) + Studio wizard (S0044) + scoping (S0045)

ADR: [[ADR-control-plane-store]]. **Decision:** project metadata lives in `jord_projects` / `jord_project_keys` on the **server primary** `DATABASE_URL` (never inside a registered project target). Secrets at rest use **AES-256-GCM** + `JORD_MASTER_KEY` (`putSecret` / `getSecret` / `rotate` on `@altr/jord`). Create flow is **register + test** only (no hosted provisioning).

| Piece | Fact |
|-------|------|
| Migration | `0009_control_plane_projects.sql` + `0010_project_db_password_sealed.sql` (libSQL + Postgres) |
| Types | `elements/jord/src/schema/projects.ts` |
| Secret port | `elements/jord/src/control-plane/secret-port.ts` · wired on `createJordApp` as `secrets` (null when master key unset) |
| Registry | `cloud/jord/src/projects/` · mounted at `/admin/projects*` (admin operator only) |
| Keys | `jord_pub_…` / `jord_sec_…` / `jord_bar_…` — SHA-256 hashed in `jord_project_keys`; secret returned **once** on create/rotate |
| Connect test | `POST /admin/projects/test` — ephemeral ping; failed create writes **no** row |
| Archive | `DELETE /admin/projects/:id` → `status=archived`, keys deleted, subsequent GET → **410** |
| Studio UI (S0044) | `apps/jord-studio` — `/projects` list, `/projects/new` wizard, `/projects/[id]/edit`, BFF under `src/app/api/admin/projects/` |
| Studio scoping (S0045) | Screens under `app/p/[project]/…`; cookie `jord_project`; header switcher; BFF fail-closed; slug `default` = env DB |

### Admin project routes

| Method | Path | Notes |
|--------|------|-------|
| GET | `/admin/projects` | List (no passwords / secret keys) |
| POST | `/admin/projects/test` | Connect check only |
| POST | `/admin/projects` | Register + baseline; returns `secret_key` once |
| GET | `/admin/projects/:id` | Detail; **410** if archived |
| PATCH | `/admin/projects/:id` | Notes (active only) |
| DELETE | `/admin/projects/:id` | Archive + revoke keys (never drops target DB) |
| POST | `/admin/projects/:id/rotate-keys` | New key set; secret returned once |

Zero-project / single-DB boots stay valid without `JORD_MASTER_KEY` (registry routes return **503** until the key is set).

### Studio create flow (S0044)

1. Admin opens **Projects → New project**.
2. Name auto-fills slug (editable until submit); engine / target / TLS+user (Postgres) / write-only password / notes.
3. **Test connection** must succeed (client latency shown) before **Create** enables.
4. Create proxies to jord-server; reveal panel shows publishable / secret / barrier keys once with copy + “I stored it” confirm.
5. Continue lands on `/p/[slug]/tables`. Secrets never go in the URL or `localStorage`.

### Project-scoped routes (S0045)

| Piece | Fact |
|-------|------|
| Routes | All former Studio screens live under `apps/jord-studio/src/app/p/[project]/…` |
| Resolve | Layout calls `resolveStudioProject` — slug `default` is synthetic (env `JORD_SERVER_URL`); others via `GET /studio/projects/:slug` (404 unknown, 410 archived) |
| Cookie | `jord_project` set by middleware on `/p/…` and by switcher `POST /api/studio/project-cookie` |
| Switcher | Header `ProjectSwitcher` (Apolyx `Select`) — keeps sub-path when changing slug |
| BFF | `proxyToJord` reads cookie + `x-jord-project`; mismatch → **403** `project_mismatch`; forwards `X-Jord-Project` upstream |
| Catalog | `GET /studio/projects` (any auth) lists active summaries for the switcher |
| Nav | `navForRole(role, projectSlug)` prefixes data/runtime/API/database/help hrefs |

**Note:** Scope is enforced in Studio routing/BFF. Data still hits the primary server DB until a later card fans out connections per project target.

## Not in Jord yet

Monaco, multi-tenant hosting, Artemis screens inside Studio. Three-pane shell: [[../../../plan/Jord/phase-03/S0046-three-pane-shell|S0046]].
