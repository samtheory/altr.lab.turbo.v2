---
title: "Prompt — Jord next phase (S0021+) feature list and plan"
created: 2026-10-24
tags: [prompt, jord, planning]
---

# Role

You are the planning and implementation agent for **Jord** in the `altr.lab` monorepo. First produce a feature list and sprint plan. Then implement sprint by sprint, one at a time, stopping after each for review.

# Step 0: Ground truth (do this before writing anything)

1. Read `Docs/report/Jord-technical-brief*.md` (the brief for S0001–S0020).
2. The code beats the docs: read `elements/jord`, `cloud/jord`, `apps/jord-studio`, and the category manual `Docs/tech_space/jord/README.md` (open only the category you are changing).
3. Ignore `00-intent.md` and `2026-10-18-sharpen.md` as status. They only describe Slice 0.
4. Runtime is **Node >= 20** with pnpm and Turbo. It is NOT Bun. Do not introduce Bun-only APIs.

# Output of the planning phase

Create:
- `Docs/feature_list/Jord/03-next-phase.md`: the feature list, with acceptance criteria per feature.
- `Docs/plan/Jord/phase-01/Jord-S0021/README.md` … one card per sprint, in the same format as the existing cards.
- Update `Docs/plan/Jord/phase-02/00-remaining-backlog.md`.

Each card must contain: goal, in-scope, out-of-scope, file-level change list, schema changes, HTTP routes, tests required (dialect matrix: file libSQL always, Postgres opt-in via `JORD_TEST_POSTGRES_URL`), Studio changes, and a Definition of Done.

# Invariants (never break)

1. Studio and the browser never import `@altr/jord`, open the DB file, or see connection strings or tokens.
2. libSQL hot writes go through one in-process queue. On Postgres, make queue concurrency configurable (`JORD_PG_WRITE_CONCURRENCY`, default 1 to stay backward-compatible).
3. `records` OCC returns 409 on a version mismatch. Never silently overwrite.
4. WAL pragmas and checkpoints only for `file:`.
5. `@altr/base` stays a leaf. Studio uses `@altr/apolyx` only. Missing controls are built in `elements/ui-kit` first.
6. Artemis domain tables are never stored in `records.body`.
7. No new native (node-gyp) dependencies.
8. Every new route has a role check, a policy check, and tests.

# Sprint order (follow it; justify any deviation in writing)

## S0021: Migration foundation + principal auth

**Part A: migration history (do this first)**
- Table `jord_migrations(id, name, checksum, applied_at)`.
- An ordered, idempotent migration runner for both dialects, replacing ad-hoc `CREATE TABLE IF NOT EXISTS`.
- Baseline migration that adopts the existing tables.

**Part B: users and sessions**
- Tables `jord_users(id uuid, email unique, password_hash, raw_meta json, confirmed_at, created_at, updated_at)` and `jord_sessions(id, user_id, refresh_token_hash, expires_at, revoked_at, user_agent, created_at)`.
- Password hashing with `node:crypto` scrypt. Use a per-user salt, encode the params in the hash string, and compare with `timingSafeEqual`.
- Access token is a standard **HS256 JWT**: `sub`, `role`, `email`, `iat`, `exp` (15m). The refresh token is opaque, stored only as a hash, rotated on every refresh. Reuse of a rotated token revokes the whole session family.
- Routes: `POST /auth/signup`, `/auth/signin`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`. Rate-limit signin and signup in-process.
- Roles: keep the legacy shared secret as `service_role` (bypasses user policies). Add `anon` and `authenticated`. Existing `admin/editor/readonly` keep working for Studio.
- No OAuth or magic links in this sprint.

**Part C: unified policy model (the hard part)**
- Extend the policy AST with `owner_eq(column)` (row column == `auth.uid()`) and `claim_eq`.
- The server is the **single enforcement point**: for user tables, compile the policy into a parameterized `WHERE` predicate and inject it on select, update, and delete. Check the policy on insert, and force the owner column to `auth.uid()` where configured.
- On Postgres, additionally compile RLS as defense in depth. Use `set_config('jord.uid', $1, true)` inside the transaction only. Never set it on a pooled connection outside a transaction.
- Add a test matrix proving that libSQL and Postgres return identical results for the same policy.

## S0022: Table API (PostgREST-lite) + OpenAPI

- Route `/api/v1/:table`. Methods: GET, POST, PATCH, DELETE.
- Operators: `eq neq gt gte lt lte like ilike in is`. Also `select`, `order`, `limit`, `offset` and the `Prefer: count=exact` header.
- NO embeds or joins in this sprint.
- Validate every identifier against introspected columns. Bind every value. Never concatenate user input into SQL.
- Optional OCC for user tables that have a `version` column (409 on mismatch).
- Honor the S0021 policies and the generated-API disable list.
- `GET /api/v1/openapi.json` generated from introspection. Do not build a custom TS type generator. Document using `openapi-typescript` for clients.
- Studio: API docs page and a request playground.

## S0023: Outbox CDC + realtime upgrade

- Table `jord_changes(seq autoincrement, table_name, op, pk, old jsonb, new jsonb, actor, ts)`.
- Write the change row **in the same transaction** as the data change (transactional outbox). Do NOT use SQLite update hooks (unsupported by `@libsql/client` and remote Turso).
- Postgres: also add triggers on tracked tables that insert into `jord_changes` and `pg_notify`. This captures external writers. Subscribe with a dedicated LISTEN connection with reconnect and backoff.
- libSQL: only API-path writes are captured. Document this limit in the UI and docs.
- The realtime fanout reads from `jord_changes`. Clients can resume with `?since=<seq>`. Add retention pruning (job).
- Realtime respects S0021 policies (filter events per principal).
- Broadcast and presence channels (ephemeral, in-memory, single-node) are an optional second half. Mark them clearly as non-durable.

## S0024: Studio power tools

- SQL editor (admin only). Use a plain textarea or CodeMirror, not Monaco, unless Apolyx already has an editor. Add statement timeout, row cap, a read-only mode toggle, and query history. Show execution time.
- Connection page: URL editor. The URL is stored server-side, never echoed.
- Migration wizard: file -> Turso/Postgres. Copy schema and data in batches, verify row counts, and make it resumable. Never delete the source.
- Auth admin: list users, revoke sessions, disable a user.
- Log explorer: persist logs to a `jord_logs` table with retention (replace the memory-only ring).

## S0025: Storage v2

- `JordStoragePort`. Keep `LocalStorageAdapter`. Add `S3StorageAdapter` (S3, R2, MinIO) with `@aws-sdk/client-s3`.
- Presigned upload and download URLs, multipart upload, configurable size limits. Bucket policies are tied to S0021 principals.
- Metadata stays in `jord_blobs`.

## S0026 (deferred; plan only, do not implement without approval): Functions v2

- Evaluate: (a) registered TypeScript handlers loaded from a directory, (b) `worker_threads` with a timeout and a restricted context, (c) `isolated-vm`. Recommend one, with the risk analysis. Default recommendation: (b). Do not pick (c) because of its native build.

# Cross-cutting requirements

- Every sprint: unit tests, an integration test on file libSQL, an opt-in Postgres test, a `tech_space` as-built note (`20-…md` onward), and an update of the technical brief.
- Typecheck must pass in `@altr/jord`, `@altr/jord-server`, and `@altr/jord-studio`.
- No secrets in logs, health output, or Studio JSON.
- Add a CI workflow (typecheck + tests) as a small standalone card. It is currently missing.
- Keep each PR/sprint small and reviewable.

# Process

1. Do the planning phase and **stop for approval**.
2. After approval, implement S0021 Part A only and stop. Then Part B, then Part C. Report test results each time.
3. If anything in the repo contradicts this prompt, say so and propose a fix instead of guessing.
