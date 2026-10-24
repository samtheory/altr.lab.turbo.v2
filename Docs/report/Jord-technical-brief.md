---
title: "Jord technical brief — S0001 through S0020"
description: "Self-contained snapshot of Jord as built, repo layout, gaps versus a Supabase-class service, and the unnumbered backlog"
created: 2026-10-24
updated: 2026-10-24
tags:
  - report
  - jord
  - Jord-S0020
  - brief
---

# Jord technical brief (for an outside planner)

> **Audience:** a model that has not seen this repo. **As of:** 2026-10-24. **Truth order:** code under `elements/jord`, `cloud/jord`, `apps/jord-studio` beats this file if they disagree. **Do not treat** `Docs/feature_list/Jord/00-intent.md` or `Docs/idea/Jord/2026-10-18-sharpen.md` as the current product. Those notes lock **Slice 0 only** (one file, no Studio, no Postgres). The code has moved through **Jord-S0020**.

This file is the handoff. It describes what exists, how the tree is shaped, what was deliberately left out, and where Jord is still a lab data plane rather than a hosted backend platform.

## 1. What Jord is

Jord is the **data plane** of the `altr.lab` monorepo: one library, one HTTP process, and one Next.js admin app (Jord Studio).

| Choice | Current fact |
|--------|----------------|
| Default store | A gitignored libSQL file, `file:./data/jord.db` |
| Other stores | `libsql://` (Turso) with an auth token; `postgres://` / `postgresql://` |
| Process model | One Node server (`@altr/jord-server`). Hot writes share one in-process queue |
| Admin UI | `apps/jord-studio` on port **3005**. It never opens the database file. It proxies to the server |
| Server port | `PORT`, example **8787** |
| Packages | Private, version `0.0.1`, not published to npm |
| Closed work | Sprints **Jord-S0001 through Jord-S0020**. The numbered queue is **empty** |

Jord is **not** the trading product (Artemis), the map engine (Tia), or the design system (Apolyx). Those live beside it. PocketBase under `cloud/pocketbase` is unused by Jord.

The original bet: a SQLite-compatible file you can copy, with WAL so one API and a future bot can share it, a dialect port so Postgres can be added later, and a Studio that looks like a small control plane. That bet is implemented through S0020. It is still a **single-node lab**, not a multi-tenant hosted platform.

## 2. Repository map

pnpm workspaces (`pnpm@10.27.0`), Node `>=20`, Turbo. Root `package.json` name: `altr-lab`.

```
altr.lab.turbo.v2/
  package.json              workspaces: apps/*, cloud/*, elements/*
  data/                     gitignored runtime data
    jord.db                 default libSQL file (created on first open)
    blobs/                  local object bytes (metadata is in the DB)
  elements/
    base/                   @altr/base — leaf utilities. Must not depend on Jord or Apolyx
    jord/                   @altr/jord — driver port, adapters, schema, SQL helpers
    ui-kit/                 @altr/apolyx — design-system controls. Studio imports this only
    apolyx-cli/
  cloud/
    jord/                   @altr/jord-server — Hono API, auth, queue, jobs, realtime
    pocketbase/             not Jord
  apps/
    jord-studio/            @altr/jord-studio — Next.js 15 admin, port 3005
    apolyx/                 kit docs app, not Jord
  Docs/
    idea/Jord/              early decisions (Slice 0). Stale as a status report
    feature_list/Jord/      intent. 00-intent is Slice 0; 04-phase-01-capabilities is the shipped inventory; 01-phase-02-candidates is unshipped
    plan/Jord/              sprint cards S0001–S0020, all closed. 00-remaining-backlog.md is the leftover list
    tech_space/jord/        living category manual (overview, dialects, writes, …)
    report/                 STATUS.md, Jord-implemented-review.md, this brief
    agents/mimir/           program-master instructions for building Jord
```

Commands that matter:

| Command | What it does |
|---------|----------------|
| `pnpm dev:jord` | `tsx watch` on `@altr/jord-server` |
| `pnpm dev:jord-studio` | Next dev, port 3005 |
| `pnpm db:snapshot` | Online backup of the file DB (`VACUUM INTO` on file libSQL only) |
| `pnpm --filter @altr/jord test` | Vitest. Last run here: 16 files, 46 passed, 3 skipped |
| `pnpm --filter @altr/jord-server test` | Vitest. Last run here: 3 files, 35 passed |
| `pnpm --filter @altr/jord typecheck` | `tsc --noEmit` (same script on server and Studio) |

There is **no** Jord ESLint config (`lint` echoes that none is configured). There is **no** CI pipeline and **no** npm publish in this track.

## 3. Package graph

```
apps/jord-studio
  depends on @altr/apolyx, next, react 19
  does NOT depend on @altr/jord or pg or @libsql/client
  talks to the server through app/api/* BFF routes

cloud/jord  (@altr/jord-server)
  depends on @altr/jord, hono, @hono/node-server, @hono/node-ws, ws

elements/jord  (@altr/jord)
  depends on @libsql/client ^0.15.15, drizzle-orm ^0.44.5, pg ^8.23.1
  does NOT depend on @altr/base, Apolyx, or the server
```

`@altr/base` is a leaf: apps and elements may depend on it; it must not depend on Jord. Jord currently does not depend on it either.

Studio rule: product screens compose `@altr/apolyx`. They must not add Radix, Base UI, or a local button/dialog kit. Missing controls are built in `elements/ui-kit` first.

## 4. Runtime shape

```
Browser
  → apps/jord-studio (Next, :3005)
      → app/api/*  (BFF; attaches the server token)
          → @altr/jord-server (Hono, :8787)
              → one write queue
              → JordDriverPort
                  → LibSqlAdapter   file:  or  libsql://
                  → PostgresAdapter postgres:// or postgresql://
```

The browser never receives `DATABASE_URL`, `LIBSQL_AUTH_TOKEN`, or `TURSO_AUTH_TOKEN`. `GET /health` returns only:

```json
{ "ok": true, "dialect": "libsql|postgres", "urlScheme": "file|libsql|postgres", "vectorBackend": "libsql-vector|pgvector|cosine" }
```

Environment (`cloud/jord/.env.example`):

| Variable | Role |
|----------|------|
| `JORD_SERVER_TOKEN` | Required shared secret. Raw bearer maps to `JORD_DEFAULT_ROLE` |
| `JORD_DEFAULT_ROLE` | `admin` (default), `editor`, or `readonly` |
| `DATABASE_URL` | Default `file:./data/jord.db` |
| `LIBSQL_AUTH_TOKEN` or `TURSO_AUTH_TOKEN` | Required for `libsql://`. Never placed inside the URL |
| `PORT` | Server listen port, example 8787 |
| `JORD_GENERATED_API_DISABLED` | Optional comma-separated generated resource ids |
| `JORD_TEST_POSTGRES_URL` / `JORD_TEST_LIBSQL_URL` | Opt-in live tests. Not required for a green unit run |

Auth is **not** a user table. Two bearer forms:

1. The raw `JORD_SERVER_TOKEN` → `JORD_DEFAULT_ROLE`.
2. An HMAC session: `base64url(json claims).base64url(hmac-sha256)`. Claims are `{ role, exp }`. Default TTL 12 hours. Minted by `signSessionToken` in `cloud/jord/src/auth/token.ts`.

Roles (`cloud/jord/src/auth/roles.ts`):

| Role | Can |
|------|-----|
| `admin` | Everything below, plus schema DDL, policies, triggers, jobs, API management, blob bucket create |
| `editor` | Write `records`, user-table rows, blobs, vectors; invoke custom/function APIs; subscribe to realtime |
| `readonly` | Read and subscribe. Writes return 403 |

There is no signup, password, OAuth, magic link, or row-level `auth.uid()`.

## 5. Sprint ledger (all closed)

| ID | What landed |
|----|-------------|
| S0001 | Slice 0: `file:` libSQL, mkdir parent dir, WAL pragmas, `records` + OCC `version` → HTTP 409, snapshot |
| S0002 | Studio records browser |
| S0003 | Side nav + table-editor UX |
| S0004 | Schema introspect, visualizer, ADD COLUMN |
| S0005 | Bearer auth + the three roles |
| S0006 | Generated CRUD catalog for `records` (can be disabled) |
| S0007 | In-process jobs + in-memory log ring |
| S0008 | Custom HTTP APIs + function step pipelines |
| S0009 | Policy middleware + trigger actions |
| S0010 | `PostgresAdapter` for `postgres://` / `postgresql://` |
| S0011 | Realtime: write-path emit, SSE |
| S0012 | `CREATE TABLE` + browse user tables |
| S0013 | Local blob buckets (disk bytes + `jord_blobs` metadata) |
| S0014 | Embeddings table + in-process cosine search + Studio Vectors |
| S0015 | Insert/update/delete rows on user tables |
| S0016 | Admin DROP / RENAME / column type change on user tables |
| S0017 | Compile Jord policies into native Postgres RLS on `records` |
| S0018 | WebSocket realtime + fanout for user tables as well as `records` |
| S0019 | Hosted `libsql://` on the same `LibSqlAdapter`; WAL only when `urlScheme === "file"` |
| S0020 | Engine vector distance on libSQL; optional `pgvector` on Postgres; cosine if the engine lacks it |

As-built manual: `Docs/tech_space/jord/README.md` (one category per concern).

## 6. Data model

Boot creates these control-plane tables on both dialects (`elements/jord/src/schema/table-names.ts`). Postgres timestamps are `bigint` milliseconds. libSQL timestamps are integers, also milliseconds.

| Table | Role |
|-------|------|
| `records` | JSON scratchpad. Columns: `id`, `bucket`, `body`, `metadata`, `created_at`, `updated_at`, `version`. Index `(bucket, created_at)`. OCC on `version` |
| `jord_jobs` / `jord_job_runs` | Scheduled jobs and run rows |
| `jord_functions` | Named step pipelines (not source code) |
| `jord_custom_apis` | Slug + method → function |
| `jord_policies` | Allow/deny rules evaluated in the server |
| `jord_triggers` | After-write actions |
| `jord_blobs` | Object metadata. Bytes live on disk under `data/blobs/` |
| `jord_embeddings` | Float32 little-endian blob, namespace, dims, optional `ref_id`, metadata |

User tables are anything else the admin creates. Allowed column types: `TEXT`, `INTEGER`, `REAL`, `BLOB`. Identifiers must match `^[a-zA-Z_][a-zA-Z0-9_]*$`. Reserved control-plane names cannot be created as user tables. User-table row writes do **not** use OCC. There is no foreign-key designer, no `ALTER` of primary-key identity, and no general migration history table. Schema is ensured with `CREATE TABLE IF NOT EXISTS` on process start (`elements/jord/src/schema/migrate.ts` and `migrate-postgres.ts`).

`records` buckets used by Studio nav: `lab`, `artemis`, `jord`. The `artemis` bucket is a scratchpad namespace only. Trading tables (`orders`, `positions`, `trades`) must not be stuffed into `records.body`.

## 7. Dialects, WAL, vectors

| URL | Adapter | WAL truncate | Snapshot |
|-----|---------|--------------|----------|
| `file:` | `LibSqlAdapter` | Yes, on an interval and on shutdown | `VACUUM INTO` |
| `libsql://` | Same adapter, `authToken` from env | No | Throws `JordUnsupportedError` |
| `postgres://`, `postgresql://` | `PostgresAdapter` (`pg` Pool) | No | Throws |

Vector search (`searchVectors` on the port):

| Backend label | When |
|---------------|------|
| `libsql-vector` | `vector_distance_cos` exists (it does in `@libsql/client` 0.15). Exact engine KNN at or below **200** rows in the namespace. Above that, a per-namespace shadow table `jord_vix_<namespace>` of type `F32_BLOB(dims)` plus `libsql_vector_idx` / `vector_top_k`, then a rescore. Hyphens in the namespace are legal in the quoted table name; the index encodes `-` as `__` because DiskANN rejects `-` in the index name |
| `pgvector` | `CREATE EXTENSION vector` succeeds. Column `embedding_vec vector(1536)` is zero-padded (cosine is unchanged). Rank is `1 - (embedding <=> query)`. HNSW index is best-effort |
| `cosine` | Probe or SQL failed. Rank is in-process Float32 cosine (`elements/jord/src/vectors/search.ts`) |

`sqlite-vec` / `vec0` is **not** loaded. `vec_version()` is absent. Callers supply the float array. Jord does not call an embedding API. Dims are **8–1536** and fixed per namespace after the first write (mismatch → 409). Search `limit` defaults to 10 and caps at 50.

## 8. HTTP surface (server)

All routes except `GET /health` require `Authorization: Bearer`. Writes go through the single queue. Policy middleware can still 403 a request. On Postgres, `records` also has native RLS compiled from `jord_policies`; the HTTP middleware remains the 403 authority.

| Area | Paths | Notes |
|------|-------|-------|
| Health | `GET /health` | Public. Labels only |
| Records | `POST/GET /records`, `GET/PATCH/DELETE /records/:id` | PATCH requires matching `version` or **409** |
| Schema | `GET/POST /schema/tables`, `GET/POST/PATCH/DELETE /schema/tables/:name`, column routes, row routes | DDL is admin. Row writes are editor+ |
| Generated API | `GET /apis/generated`, `GET/PATCH /apis/generated/:resource` | Catalog today is the `records` resource, not an auto API for every user table |
| Jobs | `GET/POST /jobs`, `GET/PATCH/DELETE /jobs/:id`, `POST /jobs/:id/run`, `GET /jobs/:id/runs` | Admin. Kinds: `wal_checkpoint`, `echo`, `records_count` |
| Logs | `GET /logs` | In-memory ring, not a table |
| Functions | CRUD `/functions`, `POST /functions/:id/invoke` | Steps: `echo`, `records_list`, `records_get`, `records_insert`, `records_count` |
| Custom APIs | CRUD `/custom-apis` plus a slug invoke route | Maps HTTP method + slug onto a function |
| Policies | CRUD `/policies` | Rule kinds: `role_in`, `bucket_in`, `bucket_eq`, `always`. Effect allow/deny. Operations select/insert/update/delete |
| Triggers | CRUD `/triggers` | Actions: `log`, `invoke_function`, `echo`. Not native SQL triggers |
| Realtime | `GET /realtime` (SSE), `GET /realtime/ws` (WebSocket upgrade) | Emitted on the write path after a successful change. Not SQLite update hooks and not Postgres `LISTEN` |
| Blobs | Bucket + object routes under `/blobs` | Local disk. Default max object size 10 MiB. No multipart, no SigV4, no remote S3 |
| Vectors | `GET /vectors/namespaces`, `GET /vectors/:namespace`, `PUT/DELETE /vectors/:namespace/:id`, `POST /vectors/:namespace/search` | Search body `{ embedding: number[], limit? }` |

Studio BFF mirrors these under `apps/jord-studio/src/app/api/`.

## 9. Jord Studio

Next.js App Router, React 19, Tailwind 4, `@altr/apolyx` only. Nav source: `apps/jord-studio/src/lib/studio-nav.ts`. Every item below is `status: "live"`.

| Group | Routes |
|-------|--------|
| Data | `/tables`, `/records`, `/records/new`, `/records/[id]`, `/storage`, `/vectors` |
| Runtime | `/jobs`, `/logs` |
| APIs | `/apis/generated`, `/apis/custom`, `/apis/functions` |
| Database | `/schema`, `/database/connection`, `/database/policies`, `/database/triggers` |
| Help | `/help` (session / role) |

Connection page shows dialect, URL scheme, and vector backend. It does not edit the URL. There is no file→Postgres wizard and no paste-a-Turso-URL form.

## 10. Invariants a planner must not break

1. Studio and the browser do not open `data/jord.db` or blob paths.
2. Hot writes on the server go through one queue, including on Postgres (the queue is a product choice there, not a SQLite lock requirement).
3. `records` updates that lose the version race return **409**, not a silent overwrite.
4. WAL pragmas and `wal_checkpoint(TRUNCATE)` run only for `file:` libSQL.
5. Tokens and connection strings stay in process env. Health and Studio JSON do not echo them.
6. `@altr/base` stays a leaf. Studio does not grow a second UI kit.
7. Artemis domain tables are a product fork, not rows hidden in `records.body`.

## 11. Backlog (nothing is numbered)

Do **not** invent Jord-S0021 unless a row below is promoted on purpose. Source: `Docs/plan/Jord/phase-02/00-remaining-backlog.md`.

Unnumbered product leftovers:

| Item | Why it was deferred |
|------|---------------------|
| Blob multipart, larger limits, remote S3 / SigV4 | S0013 shipped local disk only |
| Redis-compatible cache | No live state that needs it yet |
| Second cloud process / bot | The writer is still in the API process |
| Hosted embed API and embedding change-stream | S0020 ranks vectors; it does not call a model |

Carryovers inside closed sprints (still true in code):

| From | Still missing |
|------|----------------|
| S0009 | Native SQL triggers on Postgres; column-level policies |
| S0010 | Studio URL editor; file→Postgres migration wizard. **Phase-02 cuts the URL editor** (S0024). The wizard stays |
| S0011 / S0018 | True SQLite update hooks; Postgres `LISTEN/NOTIFY` |
| S0012 | OCC editor for arbitrary user tables |
| S0013 | Remote object store; blob CDC |
| S0014 / S0020 | Caller-supplied floats only; no embedding CDC |
| S0017 | RLS only on `records`; HTTP middleware still the 403 authority even on Postgres |
| S0019 | Embedded replicas; file→Turso wizard; Studio paste-URL |

Explicitly not Jord cards: Artemis terminal, Tia, Apolyx kit leftovers, CI, npm publish.

## 12. Gap versus a Supabase-class service

Read this as a planning map, not a claim that Jord should clone Supabase. The repo's own name for the ambition is the "Supabase-parity pillars" in `Docs/feature_list/Jord/01-phase-02-candidates.md`: realtime, blobs, vectors. Those three exist in lab form.

| Supabase-class job | Jord today | Gap that matters if the goal is a platform |
|--------------------|------------|-----------------------------------------------|
| Postgres database | Optional adapter, same port as libSQL | No managed hosting, pooling story, backups, PITR, or branch databases. File libSQL is the default and the thing Jord is better at for a laptop |
| Auto REST for every table | Generated catalog is `records` only. User tables have generic `/schema/tables/:name/rows` | Not a PostgREST. No `select` grammar, no embedded resources, no OpenAPI emitted from user DDL |
| Auth (users, JWT, OAuth, RLS via `auth.uid()`) | One shared secret and three roles | This is the largest platform gap. No users, sessions-as-people, or providers |
| Row Level Security | Middleware rules on bucket/role. Postgres RLS compiled for `records` only | Not column security, not per-user policies, not applied to user tables |
| Realtime | SSE + WebSocket after the server writes | Misses changes made by another SQL client. No presence, broadcast channels, or DB-native CDC |
| Storage | Local buckets, 10 MiB, no multipart | No CDN, signed URLs, image transform, or S3 |
| Edge functions | JSON step list over records | Not Deno/isolate user code, not secrets per function, not regional deploy |
| Cron | In-process scheduler, three builtin kinds | Dies with the process. Not `pg_cron`, not a queue with retries across machines |
| Vectors | Engine distance or `pgvector`, caller supplies floats | No embed pipeline, no hybrid keyword+vector, no ANN guarantee under 200 rows (exact scan) |
| Studio | The live nav in section 9 | No SQL editor, no auth user admin, no log explorer beyond the memory ring, no migration UI |
| Multi-tenant hosting | One database URL per process | No orgs, projects, API keys per app, or billing |

Where Jord is already the sharper tool, if the dream is a **local-first** backend rather than a hosted clone:

- Zero-infra default (`file:` + mkdir + WAL + snapshot).
- One dialect port so the same server speaks file, Turso, and Postgres.
- OCC on the scratchpad with a hard 409.
- A small Studio that already covers tables, records, storage, vectors, jobs, functions, policies, triggers, and connection labels.
- Control-plane tables that move with the dialect instead of a second product.

Where copying Supabase would miss Jord's own constraints:

- Do not put a second database client in `@altr/base`.
- Do not open the file from the browser.
- Do not replace the write queue on libSQL.
- Do not hide trading entities inside `records.body`.

## 13. Stale documents (do not plan from these alone)

| File | Why it misleads |
|------|-----------------|
| `Docs/feature_list/Jord/00-intent.md` | Slice 0 contract. Says Postgres is uninstantiated and there is no Studio. Later paragraphs were patched, the "What (Slice 0)" table was not rewritten into the present |
| `Docs/idea/Jord/2026-10-18-sharpen.md` | Same Slice 0 lock: file only, no auth, no websockets |
| `Docs/plan/Jord/phase-01/Jord-S0001/` … sprint READMEs | Historical. "Out of scope" lists are what that sprint refused, not the current backlog |
| `Docs/plan/Jord/phase-02/00-remaining-backlog.md` | Current leftover list. Prefer it over any sprint README |

Prefer, in order: this brief, then `elements/jord` + `cloud/jord` + `apps/jord-studio`, then `Docs/tech_space/jord/README.md`.

## 14. What to ask next

The numbered Jord queue is empty on purpose. A useful plan names **one** promotion, not twenty features. The gaps that most change "lab data plane" into "service someone can build an app on" are, in impact order inferred from the code:

1. Real users and per-principal policies (today's auth cannot express `auth.uid()`).
2. A stable public API for user tables (today's generated API is the `records` catalog).
3. Durable logs, jobs, and realtime that survive another SQL writer (today they are in-process and write-path only).
4. Object storage beyond one disk and 10 MiB.
5. Hosting and migration UX (file→Turso, file→Postgres). The Studio URL editor is **cut** in phase-02 S0024; change `DATABASE_URL` in env and restart.

Local-file ergonomics, the dialect port, OCC, and the Studio shell are already the parts to keep while those are designed.
