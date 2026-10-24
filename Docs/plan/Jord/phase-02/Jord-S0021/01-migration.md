---
title: "S0021 Part A — migration foundation"
description: "Forward-only jord_migrations runner, baseline adopt, checksum refuse, Postgres boot lock"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - Jord-S0021
  - jord-s0021-a
  - migrations
---

# Part A — migration foundation

> Sprint: [[README]]. **After S0027 CI is green. Stop for review before Part B.** Tag: `jord-s0021-a`.

## Status

**implemented locally** for file libSQL (2026-10-25). Postgres advisory-lock tests are in `elements/jord/src/schema/migrations/migrations.test.ts` and were **skipped** (`JORD_TEST_POSTGRES_URL` unset; Docker daemon not running). Stop for review before Part B.

## Lock

| Piece | Choice |
|-------|--------|
| Table | `jord_migrations(id, name, checksum, applied_at)` |
| Runner | Ordered, idempotent, **forward-only** (no down migrations). Both dialects. Replaces ad-hoc `CREATE TABLE IF NOT EXISTS` at boot |
| Baseline | One migration that adopts existing phase-01 tables without destroying data |
| Checksum mismatch | **Refuse to boot** with a clear error naming the migration. Do not silently re-apply or skip. Algorithm is **R1** below |
| Concurrent boot | Postgres: **advisory lock** for the runner so two processes cannot apply at once. libSQL: the single write queue plus a runner mutex in-process |
| Wizard | Studio migrate wizard (S0024, execution #10) calls this runner; it does not invent a second history |
| Baseline fixture | `cloud/jord/fixtures/phase-01-baseline.sql` — a **text** dump, not a binary sqlite file |

## R1. Baseline checksum

Checksum = SHA-256 (hex, lowercase) of the migration SQL file bytes after converting CRLF to LF.

The baseline migration body is frozen. Any edit changes the checksum and boot refuses (checksum mismatch).

A fixture test asserts the stored checksum equals the value computed from the file.

## R2. WAL scope

WAL / `journal_mode` and truncate checkpoints apply only to `file:` URLs. Never for hosted `libsql://` or `postgres://`.

Confirmed in code before this card is built (`rg -n "WAL|journal_mode" elements/jord/src`):

- `elements/jord/src/adapter/libsql.ts` runs `PRAGMA journal_mode = WAL` and `PRAGMA wal_checkpoint(TRUNCATE)` only when `urlScheme === "file"` (`open` after the `libsql:` branch, `close`, `checkpointTruncate`).
- The `libsql:` branch returns before `WAL_PRAGMAS`.
- `elements/jord/src/adapter/postgres.ts` checkpoint is a no-op.
- `elements/jord/src/client.ts` documents `` `file:` → LibSqlAdapter (mkdir + WAL) ``.

No WAL code change in S0021-A. The invariant stays as written.

## R3. Dump environment

Fixture is pinned to commit `eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c`.

The dump script does not exist yet. Create `dump:phase-01-baseline` on `@altr/jord-server` in this sprint, then run it only inside a worktree of that commit:

```
git worktree add ../jord-p01 eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c
```

In `../jord-p01`: `pnpm install --frozen-lockfile`, then run the dump script (the script file is copied or checked out into that worktree as part of this step; it must boot phase-01 code, not the S0021 runner).

The script writes the header `-- source: eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c`.

Copy the dump into the main repo at `cloud/jord/fixtures/phase-01-baseline.sql`, then `git worktree remove ../jord-p01`.

Check: re-running the script produces an identical dump (diff is empty).

The script must:

1. Boot the phase-01 server against an empty `file:` database so the current `CREATE TABLE IF NOT EXISTS` path runs.
2. Insert one `records` row with a known id.
3. Dump schema and that row to SQL.

The Part A test loads that SQL into a fresh file, runs the baseline migration, and asserts the row is still there and `jord_migrations` contains the baseline.

Do not point the test at a developer's live `data/jord.db`. Do not regenerate the fixture from a tree that already contains S0021 runner code.

## R4. Doc ownership (this card)

This card's PR updates `Docs/tech_space/jord/overview/README.md` (boot / migration runner). It does not leave that page for the verify step.

## Queue

Execution **#2**. Blocked by [[../Jord-S0027/README]] only.

## Definition of Done (`jord-s0021-a`)

- [x] Fresh DB applies the full chain
- [x] Checksum is SHA-256 hex lowercase of LF-normalized SQL bytes; fixture test matches the stored checksum; editing the frozen baseline refuses boot
- [x] Fixture from commit `eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c` via the worktree steps in R3; header `-- source: eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c`; second dump diffs empty (`fc.exe`: no differences)
- [x] Fixture test: baseline migration against `phase-01-baseline.sql` keeps the seed row
- [x] Second boot applies nothing
- [x] `Docs/tech_space/jord/overview/README.md` updated in this change
- [ ] Two concurrent Postgres boots do not double-apply (advisory lock) — **UNVERIFIED** here. Test exists; `JORD_TEST_POSTGRES_URL` was unset
- [x] File libSQL tests green; Postgres opt-in via `JORD_TEST_POSTGRES_URL` (skipped on this host)
