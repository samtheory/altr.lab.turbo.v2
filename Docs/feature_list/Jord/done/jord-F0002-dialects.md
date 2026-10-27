---
title: "jord-F0002 — dialects"
feature_id: jord-F0002
description: "Shipped: JordDriverPort, LibSqlAdapter, PostgresAdapter, URL schemes, WAL hygiene"
created: 2026-10-18
updated: 2026-10-27
tags:
  - feature
  - jord
  - done
  - dialects
---

# jord-F0002 — dialects

> Dual-engine port. As-built: [[../../../tech_space/jord/dialects/README]]. Related: [[jord-F0003-writes]] · [[jord-F0001-overview]].

## Port

```
@altr/jord-server / apps
        │
        ▼
  JordDriverPort
   ├── LibSqlAdapter   file: + libsql://
   └── PostgresAdapter postgres:// / postgresql://
```

| Scheme | Adapter | Status |
|--------|---------|--------|
| `file:` | `LibSqlAdapter` | **Done** (default) |
| `libsql:` | `LibSqlAdapter` | **Done** (S0019, token env) |
| `postgres:` / `postgresql:` | `PostgresAdapter` | **Done** (S0010) |

Unsupported schemes throw. Callers use `jord.dialect`; they do not import `@libsql/client` or `pg` outside adapters.

## WAL (`file:` only)

Every open: `journal_mode=WAL`, `busy_timeout=5000`, `synchronous=NORMAL`. Server owns `PRAGMA wal_checkpoint(TRUNCATE)` on a timer and on graceful shutdown.

## Env

| Variable | Role |
|----------|------|
| `DATABASE_URL` | Driver selection |
| `LIBSQL_AUTH_TOKEN` / `TURSO_AUTH_TOKEN` | Hosted libSQL |
| `JORD_TEST_POSTGRES_URL` / `JORD_TEST_LIBSQL_URL` | Opt-in live tests |

Plans: [[../../../plan/Jord/phase-01/Jord-S0010/README|S0010]] · [[../../../plan/Jord/phase-01/Jord-S0019/README|S0019]].
