---
title: "jord-F0028 — SQL editor v2"
feature_id: jord-F0028
description: "Full-page Monaco SQL workspace: schema-aware completion, tabs, history, results grid, explain, cancel, guarded writes"
created: 2026-10-28
updated: 2026-11-02
tags:
  - feature
  - jord
  - todo
  - jord-F0028
  - studio
  - sql
---

# jord-F0028 — SQL editor v2

> **Status:** todo · **Id:** `jord-F0028` · Index: [[../INDEX]] · Today: textarea-ish console · [[../../../tech_space/jord/studio/README]]

## What

Upgrade `/database/sql` from a console into a complete per-project SQL workspace.

| Area | Detail |
|------|--------|
| Editor | **Monaco**, full page; dialect-aware syntax highlighting; schema-aware completion (tables, columns, FKs, functions, keywords); bracket matching, multi-cursor, find/replace, format document |
| Tabs | Multiple query tabs, rename, reorder, close-with-unsaved guard; saved queries per project |
| History | Searchable per-project/per-user history with timestamp, duration, status; re-run |
| Results | Apolyx DataGrid results with sort/filter/copy, CSV/JSON export, affected-row count, timing, fetch-more, cell detail for JSON/blob |
| Explain | `EXPLAIN` and `EXPLAIN ANALYZE` (Postgres) / `EXPLAIN QUERY PLAN` (libSQL), rendered as a readable plan tree |
| Safety | Read-only default (existing pragma / `BEGIN READ ONLY`); write toggle requires confirmation; every statement audited in `jord_sql_audit`; transaction controls (BEGIN / COMMIT / ROLLBACK) visible while open |
| Control | Cancel running query (Postgres `pg_cancel_backend` equivalent / libSQL interrupt), statement timeout, row-limit guard |
| Errors | Engine message mapped to line/column where the engine supplies a position |

## Acceptance

1. Completion offers only tables/columns of the **active project** (no leakage across projects).
2. A long query can be cancelled in under 2 s without killing the Studio session.
3. Read-only mode rejects `INSERT`/`UPDATE`/`DELETE`/DDL with a clear message and writes an audit row; writes with the toggle enabled are audited.
4. Tabs, saved queries, and history survive reload; CSV export matches the visible result set.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0012-studio\|jord-F0012]] | Extends the S0024 console; read-only/audit rules must not regress |
| [[../../ui-kit/apolyx-F0008-datagrid\|apolyx-F0008]] | Results use the Apolyx DataGrid, not a local table |
| [[jord-F0023-studio-shell-v2\|jord-F0023]] | Contextual sidebar hosts saved queries/history |
| [[../done/jord-F0007-jobs\|jord-F0007]] | Multi-statement/queued writes keep using the existing write path |

## Out of scope

Schema diff/migration authoring from SQL · saved stored procedures UI · query sharing between users.

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/done/S0063-monaco-sql-editor\|S0063]] — Monaco + completion | 2–3 h | **done** 2026-11-02 |
| [[../../../plan/Jord/phase-03/done/S0064-query-tabs-history\|S0064]] — tabs, saved queries, history | 2–3 h | **done** 2026-11-02 |
| [[../../../plan/Jord/phase-03/S0065-results-explain-cancel\|S0065]] — results, explain, cancel | 2.5–3 h | todo |

Queue: [[../../../plan/Jord/phase-03/README]].
