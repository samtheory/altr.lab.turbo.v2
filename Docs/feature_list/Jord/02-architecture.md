---
title: "Jord — architecture, dialects, and repo layout"
description: "JordDriverPort, LibSqlAdapter, WAL checkpoints, records OCC version, 64-bit timestamps, dialect seams, Slice 0 mkdir"
created: 2026-10-18
updated: 2026-10-18
tags:
  - feature
  - jord
  - architecture
  - libsql
  - drizzle
---

# Jord — architecture, dialects, and repo layout

> Placement, ports, and concurrency. Slice 0 contract: [[00-intent]]. Studio: [[03-jord-studio]]. Later: [[01-later]]. Decisions: [[../../idea/Jord/2026-10-18-sharpen]].

## Dual-engine dialect port (hexagonal)

App and server code depend on a **unified port**, not on libSQL or Postgres APIs.

```
@altr/jord-server / apps
        │
        ▼
  JordDriverPort          ← interface only
   ├── LibSqlAdapter      ← Slice 0: implemented
   └── PostgresAdapter    ← reserved seam: specified, not installed in Slice 0
```

| Piece | Role |
|-------|------|
| `JordDriverPort` | Dialect-agnostic surface: open, query/execute through Drizzle, close. Specialized ops (e.g. `searchVectors`) declared on the port and implemented per adapter |
| `LibSqlAdapter` | `file:` (local zero-infra) and later `libsql://` (Turso edge). Applies WAL pragmas. Later hosts local `sqlite-vec` |
| `PostgresAdapter` | Future. `postgres://` / `postgresql://`. Connection pooling, native transactions, `pgvector`. **Uninstantiated in Slice 0** |

### Dynamic driver activation

`createJordClient` (or equivalent) selects the adapter from the `DATABASE_URL` scheme:

| Scheme | Adapter | Slice 0 |
|--------|---------|---------|
| `file:` | `LibSqlAdapter` | **Implemented** |
| `libsql:` | `LibSqlAdapter` | Scheme rejected until a later slice; same adapter class reserved |
| `postgres:` / `postgresql:` | `PostgresAdapter` | Rejected; adapter not installed |

**Slice 0 boundary:** only `LibSqlAdapter` is implemented and installed. `PostgresAdapter` exists as a typed seam (interface + “not implemented” path) so application code never imports libSQL-only types. A non-`file:` URL fails with an error that names the Slice 0 limit.

Drizzle owns one schema module. Adapters supply the connection. Table CRUD moves with the driver; plugins do not (see [Dialect seam](#dialect-seam-for-specialized-features)).

## Concurrency model and high-throughput writes

### libSQL / SQLite (Slice 0 and edge)

| Fact | Meaning |
|------|---------|
| WAL | Concurrent **non-blocking reads** while a writer holds the write lock |
| Single writer | SQLite serializes writers. Contended writers wait up to `PRAGMA busy_timeout = 5000` |
| Pragmas (every open) | `journal_mode = WAL`, `busy_timeout = 5000`, `synchronous = NORMAL` |

**Write invariant:** high-frequency writers (Artemis tick ingestion, bulk logs) must **multiplex and batch through `@altr/jord-server`** (or an in-memory queue owned by that process). Do not open the raw file from many OS processes for hot writes. Direct raw-file writes are restricted to single-process utilities (`createJordClient` in one process, `pnpm db:snapshot`).

**Row updates** on `records` use optimistic concurrency: column `version` (integer, not null, default 1). A mutation runs `version = version + 1` only `WHERE id = ? AND version = ?`. No matching row → HTTP **409 Conflict**. Detail: [[00-intent]].

### WAL file management

WAL mode grows `data/jord.db-wal` until a checkpoint folds it back. `@altr/jord-server` owns hygiene in Slice 0 (no extra process):

| When | SQL |
|------|-----|
| Periodic background maintenance | `PRAGMA wal_checkpoint(TRUNCATE);` |
| Graceful shutdown (`SIGINT`, `SIGTERM`) | `PRAGMA wal_checkpoint(TRUNCATE);` then exit |

TRUNCATE checkpoints reset the WAL file so disk use stays bounded.

### Postgres (later, `PostgresAdapter`)

Native MVCC and row-level locks. High-concurrency writers do **not** require the same ingestion queue. Studio and Artemis can use pooled connections. The queue remains optional for product reasons, not for SQLite lock reasons.

## Dialect seam for specialized features

| Capability | Unified signature / idea | libSQL | Postgres |
|------------|--------------------------|--------|----------|
| Vector search | `searchVectors(embedding, options)` on the port | `sqlite-vec` (not Slice 0) | `pgvector` |
| Row-level security | “Policies” as a Jord feature | Application middleware in `@altr/jord-server` | Compiled to native Postgres RLS when that adapter is live |
| Triggers / functions | Jord definitions | Dialect SQL emitter | Dialect SQL emitter |
| Boring columns | Prefer `text` / JSON-as-text in Slice 0 | Same | Same |
| Timestamps | `created_at` / `updated_at` as 64-bit-safe integers: Drizzle `integer({ mode: 'number' })` or equivalent. Not a 32-bit signed mode | Same 64-bit integer | Unix ms must not overflow |

CRUD and schema shape move with Drizzle. Vectors, RLS, and triggers stay behind the port.

## Storage directory auto-creation (Slice 0 invariant)

`createJordClient` **must** ensure the parent directory of the file URL exists before opening the database. For the default `file:./data/jord.db`, that means recursive create of `data/` (`mkdir -p` equivalent). Prevents `ENOENT` on a clean checkout. Acceptance: [[00-intent]].

## Why libSQL first

| Need | Answer |
|------|--------|
| Zero infra | `data/jord.db` |
| Portable lab | Copy the gitignored file; schema in Drizzle |
| Concurrent bot + API reads | WAL + busy_timeout; writes batched via server |
| Snapshot | `pnpm db:snapshot` |
| Agent scratchpad | `records` buckets — not typed trading tables |
| Later search / Postgres | Port + adapters; not Slice 0 |

Slice 0 installs no Postgres, Redis, or Mongo packages.

## Modular packages

```
one product (Jord)
  ├── @altr/jord          JordDriverPort, LibSqlAdapter, schema, createJordClient
  ├── @altr/jord-server   Hono API, write queue / batching, later jobs and CDC
  └── @altr/jord-studio   dashboard UI (Apolyx) — later
```

| Thing | Path | Package |
|-------|------|---------|
| Database file | `data/jord.db` | — |
| Port + adapters + schema | `elements/jord/` | `@altr/jord` |
| Shared utils | `elements/base/` | `@altr/base` — not a second DB client |
| API | `cloud/jord/` | `@altr/jord-server` |
| Studio | `apps/jord-studio/` | `@altr/jord-studio` — after Slice 0 |

## Env

| Variable | Slice 0 | Later |
|----------|---------|--------|
| `DATABASE_URL` | `file:…` only, default `file:./data/jord.db` | `libsql://…`, then `postgres://…` |
| Auth / pool secrets | unused | Turso token, Postgres URL, Studio secrets |

## Links

- Slice 0: [[00-intent]] · Studio: [[03-jord-studio]] · Later: [[01-later]]
- Stack: [[../../Altr.lab/stack]] · Structure: [[../../Altr.lab/structure]]
