---
title: "Jord — schema"
description: "Schema-scoped list/describe, CREATE/ADD/DROP/RENAME/type change, type registry (S0052), and GET /schema/schemas"
created: 2026-10-24
updated: 2026-11-02
tags:
  - tech-space
  - jord
  - schema
  - ddl
  - S0049
  - S0052
---

# Jord — schema

> Who: anyone changing tables. Row DML: [[../writes/README]]. Admin role: [[../auth/README]]. Ship: [[../../../plan/Jord/phase-03/done/S0049-schema-scoped-introspection|S0049]] · types [[../../../plan/Jord/phase-03/done/S0052-type-registry|S0052]].

## Why

Studio needs to see real SQL tables and change them through the server, on both libSQL and Postgres, without shipping a SQL console. Postgres projects often use non-`public` schemas; a schema picker is useless until the server can target them.

## What

### Type registry (S0052)

Single source: `elements/jord/src/schema/types/`. Each entry has `id`, `family`, dialect `toSql`/`fromSql`, coarse `codec.affinity`, and `ui` metadata for Studio later.

| API | Fact |
|-----|------|
| `toSql(dialect, id, params?)` | DDL fragment; rejects unknown id or unsupported dialect |
| `fromSql(dialect, raw)` | `{ kind: "known", id, params }` or `{ kind: "custom", raw, readOnly: true }` |
| `normalizeColumns` | Attached on every `describeTable` as `logicalType` |
| Legacy create API | Still `TEXT` / `INTEGER` / `REAL` / `BLOB` (aliases → registry) |
| Migrate wizard | `mapSqliteTypeToPostgres` is a thin wrapper over the registry (`INTEGER` → `bigint` preserved) |

Coverage matches [[../../../feature_list/Jord/todo/jord-F0024-column-model-v2|jord-F0024]] families (strings, numbers, boolean, time, uuid, json/jsonb, binary, PG network/array, enum_text stub). Unknown PG types (e.g. `geometry`) stay **custom read-only** — never coerced into TEXT.

Column types accepted from the create/add API today: `TEXT`, `INTEGER`, `REAL`, `BLOB`. Postgres stores `REAL` as `DOUBLE PRECISION` and `BLOB` as `BYTEA` via `pgColumnType` (registry-backed).

### Schema scope (S0049)

| Dialect | Default | List | Unknown `?schema=` |
|---------|---------|------|--------------------|
| Postgres | `public` | `pg_namespace` minus `pg_*` / `information_schema`, only names with `USAGE` + valid SQL idents | **400** |
| libSQL | `main` | `[{ name: "main", readOnly: true }]` (`readOnly` is informational — DDL still works) | **400** |

Every `/schema/tables*` route and `/api/v1/:table` accepts `?schema=` (default = dialect default). `POST /schema/tables` also accepts optional body `schema`. Identifiers are always quoted; user-table SQL is schema-qualified (`"app"."notes"` / `"main"."notes"`). No `search_path` tricks.

`jord_tracked_tables` and `jord_table_rls` carry `schema_name` (composite PK with `table_name`) via migration `0011_schema_scope`. `jord_policies`, `jord_triggers`, and `jord_changes` stay table-name-only for now.

| Method | Path | Who | Result |
|--------|------|-----|--------|
| `GET` | `/schema/schemas` | authenticated | `{ schemas: [{ name, readOnly }] }` |
| `GET` | `/schema/tables?schema=` | authenticated | `{ tables }` in that schema |
| `GET` | `/schema/tables/:name?schema=` | authenticated | columns (+ `schema`), or 404 |
| `GET` | `/schema/tables/:name/rows?schema=` | authenticated | 1–100 rows, read-only |
| `POST` | `/schema/tables` | admin | `{ name, columns, schema? }` (+ `?schema=`) |
| `POST` | `/schema/tables/:name/columns` | admin | `{ name, type }` ADD COLUMN |
| `PATCH` | `/schema/tables/:name` | admin | rename `{ name }` |
| `DELETE` | `/schema/tables/:name` | admin | drop table |
| `PATCH` | `/schema/tables/:name/columns/:column` | admin | `{ name?, type? }` |
| `DELETE` | `/schema/tables/:name/columns/:column` | admin | drop column |

CREATE requires exactly one primary key. If none is marked and `id` exists, `id` becomes PK; otherwise Jord prepends `id TEXT PRIMARY KEY`. Reserved names (`records`, `jord_*`, `sqlite_*`, `pg_*`) → **400**. Duplicate table or column → **409**. Type change rebuilds the table and `CAST`s values. Changing or dropping the primary-key column is rejected. Unknown schema → **400** (never 500).

All DDL runs on the write queue. On Postgres, RLS sync and DML grants for `jord_app` run in the table's schema (`GRANT USAGE` skipped for `public`). The runtime role only lists schemas it already has `USAGE` on — operators must grant that once for a new schema.

## How

| Piece | Path |
|-------|------|
| Type registry | `elements/jord/src/schema/types/` (`toSql` / `fromSql` / migrate) |
| Schema helpers | `elements/jord/src/schema/schema-scope.ts` |
| Introspect + ADD + CREATE | `elements/jord/src/schema/ddl.ts` |
| DROP / RENAME / type | `elements/jord/src/schema/ddl-alter.ts` |
| RLS planner (qualified) | `elements/jord/src/schema/ddl-rls.ts` |
| Migration | `elements/jord/migrations/*/0011_schema_scope.sql` |
| Adapters | `elements/jord/src/adapter/{postgres,libsql}.ts` (`listSchemas`, `resolveSchema`, …) |
| Routes | `cloud/jord/src/app.ts` (`resolveSchemaQuery`) |
| Table API | `cloud/jord/src/table-api/{routes,sql,query}.ts` (`schema` reserved param) |
| Outbox tracking | `cloud/jord/src/realtime/outbox.ts` (`{ schema, table }`) |
| Studio | Schema explorer at `/schema`; catalog `/tables` — picker UI is [[../../../plan/Jord/phase-03/S0050-schema-picker-ui\|S0050]] |

`listTables(schema)` uses `sqlite_master` (libSQL / `main`) or `pg_tables` filtered by schema. `describeTable(name, schema)` uses `PRAGMA table_info` on libSQL.

## Example

```json
POST /schema/tables?schema=app
{ "name": "notes", "columns": [{ "name": "title", "type": "TEXT" }] }
```

Jord creates `app.notes` (Postgres) with a generated `id` primary key plus `title TEXT`. `GET /schema/tables?schema=public` does not list it. `GET /schema/tables?schema=nope` → **400**.

Default omit/`public`/`main` keeps prior behavior for existing clients.

## Not in Jord yet

Schema create/drop UI · Studio schema picker ([[../../../plan/Jord/phase-03/S0050-schema-picker-ui|S0050]]) · cross-schema FK embeds ([[../../../plan/Jord/phase-03/S0078-fk-embeds|S0078]]) · schema on `jord_policies` / `jord_triggers` / `jord_changes` · arbitrary SQL · column-level policies. Boot history is `jord_migrations` — [[../overview/README#boot-migrations]].
