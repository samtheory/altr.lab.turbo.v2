---
title: "jord-F0024 — column model v2 (types, constraints, ids, relations)"
feature_id: jord-F0024
description: "Rich dialect-aware column types, nullability/default/unique/check, generated id strategies, PK/FK relationships"
created: 2026-10-28
updated: 2026-10-28
tags:
  - feature
  - jord
  - todo
  - jord-F0024
  - schema
  - studio
---

# jord-F0024 — column model v2

> **Status:** todo · **Id:** `jord-F0024` · Index: [[../INDEX]] · Today: introspect + create/alter only · [[../done/jord-F0004-schema|jord-F0004]]

## What

Studio's column editor currently exposes a thin type list. It grows into a real schema editor for both dialects.

### Types

| Family | libSQL / SQLite | Postgres |
|--------|-----------------|----------|
| Strings | `text`, `varchar(n)`, `char(n)` | `text`, `varchar(n)`, `char(n)`, `citext` |
| Numbers | `integer`, `bigint`, `smallint`, `real`, `double`, `numeric(p,s)`, `decimal(p,s)` | `smallint`, `integer`, `bigint`, `numeric(p,s)`, `real`, `double precision` |
| Boolean | `boolean` (0/1 check) | `boolean` |
| Time | `date`, `datetime`, `timestamp`, `time` | `date`, `time`, `timetz`, `timestamp`, `timestamptz` |
| Identity | `uuid` | `uuid` |
| Documents | `json` | `json`, `jsonb` |
| Binary | `blob` | `bytea` |
| Network / other | — | `inet`, `cidr`, `macaddr`, `array<T>` |
| Enumerated | `text` + `CHECK (col IN …)` | native `enum` or text + check |

### Per-column settings

- **Nullable** or `NOT NULL`, with a required explicit choice at create.
- **Default**: literal, expression, `now()`/`CURRENT_TIMESTAMP`, `gen_random_uuid()`, or none.
- **Unique**, **primary key**, **auto-update timestamp**.
- **Generated id**: identity always / by default, serial, sequence, uuid v4, uuid v7, ULID, nanoid, cuid2 — plus "custom/default value".
- **Validation**: min/max, length range, regex/pattern, enum values, date bounds — enforced **server-side on write** and mirrored in Studio forms.
- **Check expression**, collation, comment.

### Relationships

- PK/FK declaration in the column editor: referenced **schema + table** + column (cross-schema FKs allowed where the engine permits), composite keys, and `ON DELETE` / `ON UPDATE` (`cascade`, `set null`, `restrict`, `no action`).
- The target picker obeys the active sidebar schema ([[jord-F0023-studio-shell-v2|jord-F0023]]) but can reach another schema explicitly.
- Cardinality display (1:1, 1:N, M:N via join table) reused by [[jord-F0027-relationship-canvas|the relationship canvas]].
- Existing columns are introspected into this model; unsupported legacy types show as read-only text with a warning instead of being silently coerced.

Unsafe changes (type change, drop column/table, adding `NOT NULL` without default) require a confirmation step and go through the write queue — never an implicit destructive migration.

## Acceptance

1. A table can be created with every type in the table above on both engines and round-trips through introspection unchanged.
2. Invalid input (bad regex, out-of-range, enum miss, FK miss) is rejected with a field-level message from the server, not only the form.
3. Generated-id strategies produce unique values under concurrent inserts.
4. FK delete/update behavior is observable in a test (delete parent → expected child state).

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0004-schema\|jord-F0004]] | Extends the existing DDL path; do not add a second migration writer |
| [[../done/jord-F0003-writes\|jord-F0003]] | Server-side validation hooks into the write path |
| [[../done/jord-F0008-policies\|jord-F0008]] | Relations widen what a policy must consider (row scope on embedded rows) |
| [[jord-F0025-tables-workspace-v2\|jord-F0025]] | Column create/edit UI lives in the new grid + inspector |

## Out of scope

Automatic migration generation from diffs · database-level enums management screens · PostGIS/custom extension types.

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/done/S0052-type-registry\|S0052]] — dialect type registry | 2–3 h | **done** 2026-11-02 |
| [[../../../plan/Jord/phase-03/done/S0053-column-settings\|S0053]] — column settings + validation | 2.5–3 h | **done** 2026-11-02 |
| [[../../../plan/Jord/phase-03/done/S0054-id-strategies\|S0054]] — generated id strategies | 1.5–2 h | **done** 2026-11-02 |
| [[../../../plan/Jord/phase-03/done/S0055-fk-relationship-editor\|S0055]] — FK editor | 2.5–3 h | **done** 2026-11-02 |

Queue: [[../../../plan/Jord/phase-03/README]].
