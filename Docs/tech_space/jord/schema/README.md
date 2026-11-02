---
title: "Jord — schema"
description: "Schema-scoped list/describe, CREATE/ADD/DROP/RENAME/type change, type registry (S0052), column settings + write validation (S0053), FK relationships (S0055), per-table relations (S0060), ERD canvas (S0061)"
created: 2026-10-24
updated: 2026-11-02
tags:
  - tech-space
  - jord
  - schema
  - ddl
  - S0049
  - S0052
  - S0053
  - S0055
  - S0060
  - S0061
---

# Jord — schema

> Who: anyone changing tables. Row DML: [[../writes/README]]. Admin role: [[../auth/README]]. Ship: [[../../../plan/Jord/phase-03/done/S0049-schema-scoped-introspection|S0049]] · types [[../../../plan/Jord/phase-03/done/S0052-type-registry|S0052]] · settings [[../../../plan/Jord/phase-03/done/S0053-column-settings|S0053]] · FKs [[../../../plan/Jord/phase-03/done/S0055-fk-relationship-editor|S0055]] · relations view [[../../../plan/Jord/phase-03/done/S0060-table-relationships-view|S0060]] · ERD canvas [[../../../plan/Jord/phase-03/done/S0061-erd-canvas|S0061]].

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

### Column settings + validation (S0053)

Per-column settings ride beside DDL: constraints that the engine can express (`NOT NULL`, `DEFAULT`, `UNIQUE`, `CHECK`, `COLLATE`, Postgres `COMMENT ON COLUMN`) go into CREATE/ADD SQL; validation rules, auto-update timestamps, and comments (libSQL) live in `jord_column_settings` (migration `0012_column_settings`) and attach on `describeTable` as `column.settings`.

| Setting | Where |
|---------|-------|
| `nullable` / default / unique / check / collation | DDL fragment via `columnConstraintSql` |
| `validation` (min/max, length, regex, enum, date bounds) | `jord_column_settings` → `validateColumnValue` on insert/update |
| `autoUpdateTimestamp` | Write path stamps `Date.now()` ms into the column |
| `comment` | Postgres `COMMENT ON COLUMN`; always stored in settings JSON |

Write callers that share the validator: schema table-row routes, table API (`/api/v1/:table`), and `planInsertRow` / `planUpdateRow`. Rule failures → **422** `{ error: "validation", field, reason, message }`. Tables without settings keep accepting writes.

Unsafe DDL requires `confirm: true` after planning succeeds: drop table/column, type change (rebuild), and adding `NOT NULL` without a default. Without the flag → **400** `confirm_required`.

Studio schema explorer exposes the settings on ADD COLUMN and sends `confirm` for destructive alters/drops.

### Generated id strategies (S0054)

`settings.idStrategy` selects how missing values are filled. Module: `elements/jord/src/schema/id-strategy.ts` (no new npm deps).

| Strategy | Postgres DDL | libSQL / write path |
|----------|--------------|---------------------|
| `identity` | `GENERATED … AS IDENTITY` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `serial` | column type `SERIAL` | same AUTOINCREMENT path |
| `sequence(name)` | `DEFAULT nextval('name')` | app-side unique token (`name_ts_hex`) |
| `uuid_v4` | `DEFAULT gen_random_uuid()` (also generated app-side so inserts may omit the column) | app-side `crypto.randomUUID()` |
| `uuid_v7` / `ulid` / `nanoid` / `cuid2` | app-side on insert | app-side on insert |
| `custom(expression)` | `DEFAULT <expression>` | same |

Tables without `idStrategy` behave as before (caller must supply the PK). Concurrency: 50 parallel inserts → 50 unique ids for the app-side strategies (`id-strategy.test.ts`). Studio ADD COLUMN includes an id-strategy picker.

### Foreign keys / relationships (S0055)

Module: `elements/jord/src/schema/fk.ts`. A foreign key targets **schema + table + column(s)** with optional `ON DELETE` / `ON UPDATE` (`cascade` · `set null` · `restrict` · `no action` · `set default`).

| Path | Fact |
|------|------|
| Column settings | `settings.foreignKey: { schema, table, column, onDelete?, onUpdate? }` → inline `REFERENCES` on CREATE / ADD COLUMN |
| Table-level / composite | `createTable({ foreignKeys: [{ columns, references, onDelete?, onUpdate? }] })` |
| Introspection | `describeTable` returns `foreignKeys[]` with `{ schema, table, column }` targets + `cardinality` (`1:1` / `1:N` / `M:N`) |
| Postgres alter | `addForeignKey` → `ALTER TABLE … ADD FOREIGN KEY` (cross-schema OK) |
| libSQL alter | `addForeignKey` → **`fk_unsupported`** (clear error — declare on CREATE / ADD COLUMN or rebuild) |
| libSQL cross-schema | rejected (`fk_unsupported`); only `main` |
| Enforcement | libSQL boots with `PRAGMA foreign_keys = ON` so ON DELETE/UPDATE is observable |

Cardinality: unique/PK local columns → **1:1**; otherwise **1:N**; join table with two FKs whose columns cover a composite PK → **M:N**. Invalid targets (missing table/column, non-key ref) → **`invalid_fk`** before DDL. Studio ADD COLUMN has a schema → searchable table → column picker (Apolyx Combobox), behavior selects, and SQL preview; the column browser lists introspected relationships.

### Per-table relationships view (S0060)

Focused Studio view (not the free canvas — that is [[#erd-canvas-s0061|S0061]]). Reuses existing `describeTable` / catalog introspection; no new schema reader.

| Piece | Fact |
|-------|------|
| Entry | Schema toolbar **Relations**; browser “Open relationships view”; table grid **Relationships** → `/schema?view=relations&table=&schema=` |
| Layout | Center table · **Incoming** (referenced-by) · **Outgoing** (references); column pairs, cardinality badge, `ON DELETE` / `ON UPDATE` chips |
| URL | Shareable `?view=relations&table=&schema=&edge=`; click neighbour re-centers; click edge selects constraint detail |
| Detail | Constraint name (or unnamed), columns, target, behaviors, link to column editor (`view=browser`) |
| Empty | “No relationships” + link to add an FK in the column editor |
| Helpers | `apps/jord-studio/src/lib/studio-table-relations.ts` · `components/table-relationships-view.tsx` |

### ERD canvas (S0061)

Full free canvas on Schema **ERD** (`?view=visualizer`). SVG + CSS-transform only — no canvas library. Layout coordinates stay in memory (persistence / FK drag / export → [[../../../plan/Jord/phase-03/S0062-canvas-layout|S0062]]).

| Piece | Fact |
|-------|------|
| Viewport | Pan (drag empty / Space / middle-mouse / shift-wheel), wheel zoom toward cursor (10–400 %), Fit, keyboard arrows / `+` `/` `-` / `F` |
| Nodes | One card per table: qualified name, pk/fk badges, type, selected/hover; shift-click + marquee multi-select |
| Edges | Orthogonal elbows with cardinality chips (`1—1` / `1—N` / `N—M`); cross-schema FKs use dashed strokes; highlight when an endpoint is selected |
| Drag | Single + multi-select drag, alignment guides, snap-to-grid toggle; no DB writes |
| Jump | Toolbar select lists tables and centers the viewport |
| Perf | Seeded 100 tables / ≥500 relations: graph + path build **~3.4 ms** (`studio-erd-canvas.test.ts`) |
| Empty | “No tables in this schema” |
| Helpers | `apps/jord-studio/src/lib/studio-erd-canvas.ts` · `components/erd-canvas.tsx` |

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
| `GET` | `/schema/tables/:name/rows?schema=&total=1` | authenticated | 1–100 rows; optional `total=1` adds exact `COUNT(*)` |
| `POST` | `/schema/tables` | admin | `{ name, columns, schema?, foreignKeys? }` (+ `?schema=`) |
| `POST` | `/schema/tables/:name/columns` | admin | `{ name, type, settings?, confirm? }` ADD COLUMN |
| `PATCH` | `/schema/tables/:name` | admin | rename `{ name }` |
| `DELETE` | `/schema/tables/:name` | admin | drop table (`{ confirm: true }`) |
| `PATCH` | `/schema/tables/:name/columns/:column` | admin | `{ name?, type?, settings?, confirm? }` |
| `DELETE` | `/schema/tables/:name/columns/:column` | admin | drop column (`{ confirm: true }`) |

CREATE requires exactly one primary key. If none is marked and `id` exists, `id` becomes PK; otherwise Jord prepends `id TEXT PRIMARY KEY`. Reserved names (`records`, `jord_*`, `sqlite_*`, `pg_*`) → **400**. Duplicate table or column → **409**. Type change rebuilds the table and `CAST`s values (needs `confirm`). Changing or dropping the primary-key column is rejected. Unknown schema → **400** (never 500). Validation miss → **422** with `field`.

All DDL runs on the write queue. On Postgres, RLS sync and DML grants for `jord_app` run in the table's schema (`GRANT USAGE` skipped for `public`). The runtime role only lists schemas it already has `USAGE` on — operators must grant that once for a new schema.

## How

| Piece | Path |
|-------|------|
| Type registry | `elements/jord/src/schema/types/` (`toSql` / `fromSql` / migrate) |
| Column settings | `elements/jord/src/schema/column-settings.ts` · `column-meta.ts` |
| Foreign keys | `elements/jord/src/schema/fk.ts` |
| Schema helpers | `elements/jord/src/schema/schema-scope.ts` |
| Introspect + ADD + CREATE | `elements/jord/src/schema/ddl.ts` |
| DROP / RENAME / type | `elements/jord/src/schema/ddl-alter.ts` |
| Row write + validation | `elements/jord/src/schema/row-write.ts` |
| RLS planner (qualified) | `elements/jord/src/schema/ddl-rls.ts` |
| Migration | `elements/jord/migrations/*/0011_schema_scope.sql` · `0012_column_settings.sql` |
| Adapters | `elements/jord/src/adapter/{postgres,libsql}.ts` (`listSchemas`, `resolveSchema`, FK introspect, …) |
| Routes | `cloud/jord/src/app.ts` (`resolveSchemaQuery`) |
| Table API | `cloud/jord/src/table-api/{routes,sql,query}.ts` (`schema` reserved param) |
| Outbox tracking | `cloud/jord/src/realtime/outbox.ts` (`{ schema, table }`) |
| Studio | Schema explorer FK picker + [[../../../plan/Jord/phase-03/done/S0060-table-relationships-view\|S0060]] relations view + [[../../../plan/Jord/phase-03/done/S0061-erd-canvas\|S0061]] ERD canvas · schema picker [[../../../plan/Jord/phase-03/done/S0050-schema-picker-ui\|S0050]] |

`listTables(schema)` uses `sqlite_master` (libSQL / `main`) or `pg_tables` filtered by schema. `describeTable(name, schema)` uses `PRAGMA table_info` + `PRAGMA foreign_key_list` on libSQL (Postgres: `pg_attribute` + `pg_constraint`).

## Example

```json
POST /schema/tables?schema=app
{ "name": "notes", "columns": [{ "name": "title", "type": "TEXT" }] }
```

Jord creates `app.notes` (Postgres) with a generated `id` primary key plus `title TEXT`. `GET /schema/tables?schema=public` does not list it. `GET /schema/tables?schema=nope` → **400**.

Default omit/`public`/`main` keeps prior behavior for existing clients.

## Not in Jord yet

Schema create/drop UI · cross-schema FK embeds ([[../../../plan/Jord/phase-03/S0078-fk-embeds|S0078]]) · canvas layout persistence / FK drag / export ([[../../../plan/Jord/phase-03/S0062-canvas-layout|S0062]]) · schema on `jord_policies` / `jord_triggers` / `jord_changes` · arbitrary SQL · column-level policies. Boot history is `jord_migrations` — [[../overview/README#boot-migrations]].
