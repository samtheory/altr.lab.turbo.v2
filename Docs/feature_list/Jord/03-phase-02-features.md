---
title: "Jord — phase-02 features (to implement)"
description: "Phase-02 features after the hardening addendum: CI first, principal model, then public API"
created: 2026-10-24
updated: 2026-10-25
tags:
  - feature
  - jord
  - phase-02
  - backlog
---

# Jord — phase-02 features

> **What to build next.** Baseline: [[04-phase-01-capabilities]]. Soft leftovers: [[01-phase-02-candidates]]. Plans: [[../../plan/Jord/phase-02/README]]. Review brief: [[../../report/Jord-phase-02-plan-review]].

**Process lock:** implement **one stop at a time**. **S0027** through **S0026** are complete for phase-02 execution (file libSQL for server stops; S0026 is ADR-only). Postgres tests were not run (`JORD_TEST_POSTGRES_URL` unset). Functions v2 **runtime** stays soft backlog until a follow-up sprint is approved.

## Execution order

| Order | Id | Feature |
|-------|-----|---------|
| 1 | S0027 | F9 CI |
| 2 | S0021-A | F1 Migrations |
| 3 | S0021-B | F2 Principals |
| 4 | S0021 ADR | Threat model (doc; before C) |
| 5 | S0021-C | F3 Policies |
| 6 | S0028 | F10 HTTP hardening |
| 7 | S0022 | F4 Table API |
| 8 | S0023 | F5 CDC |
| 9 | S0029 | F11 Client SDK |
| 10 | S0024 | F6 Studio tools |
| 11 | S0025 | F7 Storage |
| 12 | S0026 | F8 Functions ADR only |

Sprint **ids are stable**. Execution order is not numeric order.

## F1 — Migration foundation (`jord-s0021-a`)

| | |
|--|--|
| **Why** | Ad-hoc `CREATE TABLE IF NOT EXISTS` cannot evolve schema safely |
| **What** | Forward-only `jord_migrations`; baseline adopt; checksum = SHA-256 hex lowercase of LF-normalized SQL bytes; mismatch **refuses boot**; baseline body frozen. Postgres **advisory lock** on concurrent boot. Fixture from commit `eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c` via `git worktree add ../jord-p01` that commit, `pnpm install --frozen-lockfile`, dump script created in S0021-A, header `-- source: eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c`, copy back, `git worktree remove`. Re-run dump diffs empty |
| **Status** | In tree for file libSQL (2026-10-25). Postgres double-apply test is written and skipped until `JORD_TEST_POSTGRES_URL` is set |
| **Acceptance** | Fresh DB and the fixture converge; seed row survives; stored checksum equals the file; re-run is a no-op; bad checksum does not boot; two PG boots do not double-apply |

## F2 — Principals (`jord-s0021-b`)

| | |
|--|--|
| **Why** | Shared-secret roles are Studio ops, not end-user identity |
| **What** | `Principal { kind: service \| user \| anon \| operator, uid?, role, claims }`. Operator = admin/editor/readonly HMAC tokens (**stay valid**). `JORD_LEGACY_SECRET_ROLE`: **default `admin` for the S0021-B transition**, then **flip default to `service`** before the card closes; update curl / README / `.env.example` / `authHeaders("raw")` in the same sprint. User = JWT. Anon = long-lived JWT minted from `JORD_JWT_SECRET`. Async scrypt + maxmem; no email enumeration; `MailerPort` console adapter; JWT HS256 only, iss/aud/sub/role/iat/exp, kid rotation, 60s skew. SSE/WS close at exp |
| **Status** | In tree for file libSQL (2026-10-25). Unset legacy default is `service`. Postgres identity tests were not run |
| **Acceptance** | Route-group matrix documented and tested; HMAC stays operator; tests for both switch modes; caller list on the S0021-B card; docs/helpers updated before flip; refresh reuse kills family; enumeration tests; console mail only |

## F3 — Policies (`jord-s0021-c`)

| | |
|--|--|
| **Why** | Middleware rules do not express ownership, and a side route can bypass them |
| **What** | Deny overrides allow. No policy → default-deny for anon and user. `rls_enabled` per table. UPDATE USING + WITH CHECK. Owner column immutable for non-service. Route inventory test. PG: **FORCE ROW LEVEL SECURITY** and non-owner role `jord_app`. Grants from `JORD_MIGRATE_URL`: create with `CREATEROLE`, or verify-only fallback (role exists, no `BYPASSRLS`, non-owner) then grants. Refuse boot if migrate and runtime URLs match (parsed host/port/db/user). Runtime stays **`DATABASE_URL`**. Startup refuses a Postgres role that owns tables or has `BYPASSRLS`. `file:` ignores the migrate URL. `SET LOCAL` in-transaction only. Shared dialect conformance suite. Threat model: [[../../plan/Jord/phase-02/Jord-S0021/ADR-threat-model]] |
| **Status** | File libSQL enforcement is in the tree (2026-10-25). Postgres pool-leak and dialect-pair runs were not executed |
| **Acceptance** | Identical fixtures on libSQL and Postgres; pool uid-leak test; inventory test fails closed; migrate≠runtime URL test; CREATEROLE fallback verify path |

## F4 — Table API (`Jord-S0022`)

| | |
|--|--|
| **What** | `/api/v1/:table`. Coerce query values by column type. libSQL `ilike` = `lower()`. Caps: limit default 100 / max 1000, `in` max 100, body 1 MiB. PATCH/DELETE without filter rejected; `?all=true` **service only**. Composite PKs supported; no stable key → no PATCH/DELETE. `count=planned` default-ish; `count=exact` documented as costly. `Prefer: return=representation` via RETURNING |
| **Status** | File libSQL is in the tree (2026-10-25). Postgres RETURNING was not run |
| **Acceptance** | Caps, all=true, coerce, RETURNING, and ilike documented and tested. Test-folder fetch helper does not import `@altr/jord` (S0029 promotes it). No embeds |

## F5 — CDC (`Jord-S0023`)

| | |
|--|--|
| **What** | Opt-in `jord_tracked_tables`. Same-transaction outbox. Watermark: libSQL relies on the write queue; Postgres withholds seqs that are ahead of an in-flight lower seq. Indexes on `seq` and `(table_name, seq)`. Retention default 7 days and 100_000 rows. `pg_notify` carries **seq only**. `since` past retention → **410**. Delivery-time policy filter. **Replace** the in-process producer; keep the event name `jord.change`. BLOBs omitted or referenced. libSQL Studio raw SQL is not captured |
| **Status** | File libSQL is in the tree (2026-10-25). Live Postgres watermark race was not run |
| **Acceptance** | Postgres race test does not skip; libSQL queue-order test; 410 test; one producer path |

## F6 — Studio tools (`Jord-S0024`)

| | |
|--|--|
| **Status** | In tree for file libSQL (2026-10-25). Connection page stays labels-only |
| **What** | SQL editor: reads off the write queue; read-only via `PRAGMA query_only` or `BEGIN READ ONLY` + `statement_timeout`; writes queued; audit log. **No connection URL editor** — read-only labels + env restart docs. Wizard type map TEXT/INTEGER/REAL/BLOB → text/bigint/double/bytea; skip `jord_vix_*` and rebuild; resumable; never delete source. Logs batched **outside** the hot queue, redacted, no read-loop |
| **Acceptance** | Engine-level read-only test; no secret URL field; type-map test; log redaction |

## F7 — Storage (`Jord-S0025`)

| | |
|--|--|
| **Status** | In tree for file libSQL (2026-10-25). Local default; S3/R2/MinIO via env. As-built [[../../tech_space/jord/blobs/README]] |
| **What** | S3 adapter. Policy at **sign time**, short TTL. pending → finalize → GC. Local HMAC-signed URLs match the S3 shape. Copy/verify/switch plan for existing local bytes (no silent delete) |
| **Acceptance** | Denied principal cannot mint a URL; GC test; local and S3 share the client shape |

## F8 — Functions v2 (`Jord-S0026`, ADR only)

| | |
|--|--|
| **Status** | ADR written (2026-10-25). Recommend `worker_threads`. Reject `isolated-vm`. **No runtime code.** Gate: do not implement until a follow-up sprint is approved. As-built [[../../tech_space/jord/apis/ADR-functions-v2]] |
| **What** | Recommend `worker_threads`. Reject `isolated-vm`. No implementation without approval |
| **Acceptance** | Written ADR only — **met** |

## F9 — CI (`Jord-S0027`, runs first)

| | |
|--|--|
| **What** | GitHub Action typecheck + tests for jord, jord-server, jord-studio. Postgres opt-in |
| **Acceptance** | Workflow green on current tree before S0021-A starts |

## F10 — HTTP hardening (`Jord-S0028`, before public data API)

| | |
|--|--|
| **Status** | In tree for file libSQL (2026-10-25). Auth routes stay at 30/minute. Data routes 120/minute. CORS default deny. JSON 1 MiB. Idempotency TTL 24h |
| **What** | CORS allow-list, data-route rate limits, body limit, shutdown drains the write queue, optional Idempotency-Key |
| **Acceptance** | 413, CORS deny, drain test, idempotency replay — all green before S0022 |

## F11 — Client SDK (`Jord-S0029`, after CDC)

| | |
|--|--|
| **Status** | In tree (2026-10-25). `elements/jord-client`. CI typecheck + mock-fetch tests |
| **What** | Private `@altr/jord-client` (fetch). Auto refresh, table API, realtime `since`. On 410, surface resync. **Must not depend on `@altr/jord`** |
| **Acceptance** | Mock-fetch tests; CI includes the package; no engine dependency |

## Invariants

1. Studio / browser never import `@altr/jord`, open the DB, or see connection strings / tokens.
2. libSQL hot writes → one in-process queue. Postgres: `JORD_PG_WRITE_CONCURRENCY` default 1. SQL **reads** use a different connection (F6).
3. `records` OCC → 409.
4. WAL / checkpoints only for `file:`.
5. `@altr/base` stays a leaf. Studio = `@altr/apolyx` only.
6. Artemis domain tables never in `records.body`.
7. No new node-gyp / native deps.
8. Every new route: declared access rule + tests (file libSQL always; Postgres via `JORD_TEST_POSTGRES_URL`).

## Out of phase-02

OAuth / magic links · real mail provider · embeds/joins · writable DB URL in Studio · hosted embed API · Redis · Artemis trading tables · Bun · `isolated-vm` · dual realtime emit
