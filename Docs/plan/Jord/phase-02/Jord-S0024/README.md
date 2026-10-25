---
title: "Jord-S0024 — Studio power tools"
description: "Engine-enforced SQL editor, no URL editor, type-mapped migrate wizard, batched redacted logs"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - Jord-S0024
  - phase-02
  - jord-studio
---

# Jord-S0024 — Studio power tools

> Who: **mimir → apollo**. **Status: in tree** (file libSQL, 2026-10-25). **Execution #10.** Next: [[../Jord-S0025/README]].

**Sprint id:** `Jord-S0024`  
**Hats:** **apollo** · **sindri** · **heimdall** · **docs_man**

## Goal

Operator tools that do not weaken the secret-in-env invariant or the write queue.

## SQL editor (admin operator only)

- Textarea or CodeMirror. **Monaco is rejected** for this sprint (bundle size). A later card may adopt an Apolyx editor if one exists then
- **Reads use a separate read connection and never enter the write queue.** libSQL cannot interrupt a running statement; a queued read would block writers until it finishes
- Read-only is **engine-enforced**, not parsed:
  - libSQL: `PRAGMA query_only=ON` on that dedicated connection
  - Postgres: `BEGIN READ ONLY` plus `SET LOCAL statement_timeout`
- Writes (when the read-only toggle is off) go **through the write queue**
- Statement timeout, row cap, history, execution time
- **Every statement is audit-logged**
- Document: raw SQL **bypasses migrations** and, on libSQL, **bypasses the outbox**

## Connection page — URL editor is cut

The connection URL editor is **cut**, not deferred. Editing `DATABASE_URL` in Studio conflicts with secrets staying in process env.

**Ship instead:** a read-only labels page (dialect, file vs hosted, vector backend) plus documented env vars and a restart step.

A writable editor needs a new ADR. This sprint does not build one.

## Migration wizard

File → Turso or Postgres. Resumable. Verify row counts. **Never delete the source.** Postgres advisory lock around the copy.

Type map:

| SQLite | Postgres |
|--------|----------|
| TEXT | text |
| INTEGER | bigint (ms timestamps stay bigint) |
| REAL | double precision |
| BLOB | bytea |

Do **not** copy `jord_vix_*` shadow tables. Rebuild vector indexes on the target (S0020 rules).

History stays the S0021 forward-only runner (checksum mismatch refuses boot; that behavior is Part A, not a second system).

## Auth admin

List users, revoke sessions, disable a user (needs S0021).

## Logs

- Persist to `jord_logs` with retention
- **Buffer and batch** inserts **outside** the hot write queue
- **Redact** `Authorization` and token-shaped strings
- Reading logs must **not** write another log row (no loop)

## Out of scope

Writable connection URLs (cut) · Monaco (rejected) · deleting the source DB

## Definition of Done

- [x] Read-only proven by engine pragma / `BEGIN READ ONLY`, including a statement the parser would miss
- [x] Reads do not take the write queue
- [x] No URL field that posts a connection string
- [x] Type-map test for the four SQLite affinities; `jord_vix_*` not copied
- [x] Log batch skips the hot queue; redaction test; log-read does not recurse
- [x] Apolyx-first
- [x] Category `studio` updated
