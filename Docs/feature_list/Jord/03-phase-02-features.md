---
title: "Jord — phase-02 features (to implement)"
description: "Ordered phase-02 feature list with acceptance criteria; source gap analysis from Jord-next-phase2-prompt"
created: 2026-10-24
updated: 2026-10-24
tags:
  - feature
  - jord
  - phase-02
  - backlog
---

# Jord — phase-02 features

> **What to build next.** Gap analysis source: [[../../report/Jord-next-phase2-prompt]]. Shipped baseline: [[04-phase-01-capabilities]]. Soft leftovers: [[01-phase-02-candidates]]. Plans: [[../../plan/Jord/phase-02/README]].

**Process lock:** roadmap the whole phase once (this note + sprint cards). Implement **one session-sized chunk at a time**, stop for review. Do not implement the whole phase in one run.

## Planning corrections vs the review prompt

| Prompt said | Lab truth |
|-------------|-----------|
| Cards under `plan/Jord/phase-01/Jord-S0021…` | **Wrong.** Phase-01 is closed archive. Cards live under [[../../plan/Jord/phase-02/README]] |
| As-built as `tech_space/jord/20-…md` | Update the matching **category** under [[../../tech_space/jord/README]] |
| Bun | **Node ≥ 20** + pnpm + Turbo only |

## Ordered features

### F1 — Migration foundation

| | |
|--|--|
| **Sprint** | [[../../plan/Jord/phase-02/Jord-S0021/README\|Jord-S0021]] Part A |
| **Why** | Ad-hoc `CREATE TABLE IF NOT EXISTS` cannot evolve schema safely across dialects |
| **What** | `jord_migrations` + ordered idempotent runner + baseline that adopts existing tables |
| **Acceptance** | Fresh DB and existing phase-01 DB both reach the same schema; re-run is a no-op; file libSQL + opt-in Postgres covered |

### F2 — Principal auth (users / sessions / JWT)

| | |
|--|--|
| **Sprint** | Jord-S0021 Part B |
| **Why** | Shared-secret roles (`admin` / `editor` / `readonly`) are enough for Studio ops, not for end-user apps |
| **What** | `jord_users`, `jord_sessions`; scrypt passwords; HS256 access JWT (15m); opaque hashed refresh with rotation + family revoke; routes signup/signin/refresh/logout/me; rate limits; roles `anon` / `authenticated` / keep Studio roles; legacy secret → `service_role` |
| **Acceptance** | Timing-safe verify; refresh reuse kills family; Studio shared-secret still works; no OAuth / magic links |

### F3 — Unified policy model (owner + claims)

| | |
|--|--|
| **Sprint** | Jord-S0021 Part C |
| **Why** | Policies today are middleware rules; row ownership (`auth.uid()`) is missing; Postgres RLS is incomplete defense-in-depth |
| **What** | AST: `owner_eq(column)`, `claim_eq`; inject parameterized `WHERE` on select/update/delete; insert check + force owner column; PG `set_config('jord.uid', …, true)` **inside transactions only**; identical results on libSQL vs Postgres |
| **Acceptance** | Same policy fixture → same allow/deny on both dialects; pooled PG never leaks uid across requests |

### F4 — Table API (PostgREST-lite) + OpenAPI

| | |
|--|--|
| **Sprint** | [[../../plan/Jord/phase-02/Jord-S0022/README\|Jord-S0022]] |
| **Why** | Generated `/records` is not a portable table CRUD for app clients |
| **What** | `/api/v1/:table` GET/POST/PATCH/DELETE; filter ops; `select`/`order`/`limit`/`offset`; Prefer count; identifier validation + bound params; optional OCC on `version`; OpenAPI from introspection; Studio docs + playground |
| **Acceptance** | No embeds/joins; every route role+policy gated; openapi.json matches live schema |

### F5 — Outbox CDC + realtime resume

| | |
|--|--|
| **Sprint** | [[../../plan/Jord/phase-02/Jord-S0023/README\|Jord-S0023]] |
| **Why** | Write-path emit alone cannot resume; SQLite update hooks unsupported on `@libsql/client` |
| **What** | Transactional `jord_changes` outbox; PG triggers + `LISTEN` for external writers; fanout `?since=seq`; retention job; policy-filtered events; optional ephemeral broadcast/presence (non-durable) |
| **Acceptance** | libSQL documents API-path-only capture; PG captures external writers; clients resume by seq |

### F6 — Studio power tools

| | |
|--|--|
| **Sprint** | [[../../plan/Jord/phase-02/Jord-S0024/README\|Jord-S0024]] |
| **Why** | Operators still need SQL, connection editing, migrate wizards, auth admin, durable logs |
| **What** | Admin SQL editor (timeout, row cap, history); server-side URL editor (never echo); file→Turso/Postgres migrate wizard; auth admin; `jord_logs` + retention |
| **Acceptance** | Apolyx-first; browser never sees tokens/URL secrets; migrate is resumable and never deletes source |

### F7 — Storage v2 (S3 / R2 / MinIO)

| | |
|--|--|
| **Sprint** | [[../../plan/Jord/phase-02/Jord-S0025/README\|Jord-S0025]] |
| **Why** | Local `data/blobs/` does not scale |
| **What** | `JordStoragePort`; keep Local; add S3 adapter (`@aws-sdk/client-s3`); presign + multipart; size limits; bucket policies on F2 principals; metadata stays in `jord_blobs` |
| **Acceptance** | Local still default; no secrets in Studio JSON |

### F8 — Functions v2 (plan only)

| | |
|--|--|
| **Sprint** | [[../../plan/Jord/phase-02/Jord-S0026/README\|Jord-S0026]] — **plan / ADR only** |
| **Why** | Built-in function steps are not enough for user TS handlers |
| **What** | Evaluate (a) directory-loaded handlers (b) `worker_threads` (c) `isolated-vm`; recommend (b); risk note; **do not implement without approval** |
| **Acceptance** | Written recommendation + risks; no native `isolated-vm` pick |

### F9 — CI for Jord packages

| | |
|--|--|
| **Sprint** | [[../../plan/Jord/phase-02/Jord-S0027/README\|Jord-S0027]] |
| **Why** | Typecheck + tests are not gated in CI today |
| **What** | GitHub Action: typecheck + unit/integration for `@altr/jord`, `@altr/jord-server`, `@altr/jord-studio`; Postgres opt-in stays manual/secret |
| **Acceptance** | PR fails on type/test break; no secrets in logs |

## Invariants (every feature)

1. Studio / browser never import `@altr/jord`, open the DB, or see connection strings / tokens.
2. libSQL hot writes → one in-process queue. Postgres: `JORD_PG_WRITE_CONCURRENCY` (default **1**).
3. `records` OCC → **409**. Never silent overwrite.
4. WAL / checkpoints only for `file:`.
5. `@altr/base` stays a leaf. Studio = `@altr/apolyx` only.
6. Artemis domain tables never in `records.body`.
7. No new node-gyp / native deps.
8. Every new route: role check + policy check + tests (file libSQL always; Postgres via `JORD_TEST_POSTGRES_URL`).

## Explicitly out of phase-02 (unless re-opened)

OAuth / magic links · embeds/joins in table API · hosted embed API · Redis cache · Artemis trading domain · Bun · `isolated-vm` implementation
