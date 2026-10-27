---
title: "Jord phase-02 — task completion rollup"
description: "Every execution-order stop from plan/Jord/phase-02 with status after S0026 + 02.5/02.75"
created: 2026-10-25
updated: 2026-10-27
tags:
  - plan
  - jord
  - phase-02
  - tasks
---

# Jord phase-02 — task completion rollup

> Source order: [[README]]. Code/docs truth after **S0026**. Acceptance closeout: [[../phase-02.5/README]] · leftovers: [[../phase-02.75/README]]. Living status: [[../../../report/STATUS]].

- **Done:** 12
- **Remains:** 0
- **Total:** 12

Phase-02’s numbered execution queue (S0027 through S0026) has code in tree. The 2026-10-25 closeout found S0021-C row-scope leaks, an S0023 outbox that was not transactional and was bypassed by `/api/v1`, and zero Postgres runs — those drove [[../phase-02.5/README|phase-02.5]] (closed the same day). [[../phase-02.75/README|Phase-02.75]] closed 2026-10-26 (correctness leftovers + MinIO live + local CI mirror). Branch protection remains a one-shot admin step on S0027.

**Process lock (from that closeout):** a plan box is ticked only with pasted command output; a placeholder / env-only “test” counts as **no test**.

---

### 1. S0027 — CI (safety net)
- **Task:** CI workflow for Jord packages
- **Description:** Add a GitHub Actions safety net that typechecks and tests `@altr/jord`, `@altr/jord-server`, and Studio typecheck before later phase-02 stops land.
- **What it does:** Ships `.github/workflows/jord.yml`; as-built note under tech_space overview CI. Actions green on a PR and branch-protection admin remain manual caveats on the card.
- **Status:** `done`

### 2. S0021-A — Migrations (`jord-s0021-a`)
- **Task:** Forward-only migration runner
- **Description:** Replace ad-hoc schema bootstrap with `jord_migrations`, baseline adopt, and checksum refuse-on-mismatch.
- **What it does:** Boots apply forward-only migrations; phase-01 baseline adopt; checksum mismatch refuses boot. Postgres advisory-lock and concurrent-boot tests pass on live Postgres (phase-02.5).
- **Status:** `done`

### 3. S0021-B — Principals (`jord-s0021-b`)
- **Task:** Auth principals and tokens
- **Description:** Introduce `service` / `user` / `anon` / `operator` subjects with JWTs, scrypt, and refresh families before policies.
- **What it does:** HS256 access JWTs, scrypt password hashing, console mail, refresh-token families. User identity reaches Postgres RLS through the `jord.uid` / `jord.claims` session settings.
- **Status:** `done`

### 4. S0021 ADR — Threat model
- **Task:** Principal threat model ADR
- **Description:** Accept attack rows, trust boundaries, and non-goals before Part C policy code.
- **What it does:** Accepted ADR documents principals, trust boundaries, and defenses; unset legacy role stays `service`. Gate for Part C closed.
- **Status:** `done`

### 5. S0021-C — Policies (`jord-s0021-c`)
- **Task:** Table policies / RLS
- **Description:** Enforce deny-overrides, owner immutability, and per-table rules for user/anon after the threat model.
- **What it does:** Per-table RLS, deny-overrides, owner immutability, `jord_app` plus separate migrate URL. Row scope for `owner_eq` and `claim_eq` (ORed across allows) in the server, and compiled `CREATE POLICY` for every `rls_enabled` table on Postgres. Pool-leak and dialect-pair pass on live Postgres (phase-02.5).
- **Status:** `done`

### 6. S0028 — HTTP hardening
- **Task:** Edge hardening before public data API
- **Description:** CORS default-deny, body caps, data-route rate limits, idempotency, and write-queue drain on shutdown.
- **What it does:** CORS allow-list, 1 MiB JSON cap, data-route 120/min (auth 30/min), Idempotency-Key, write-queue drain on shutdown.
- **Status:** `done`

### 7. S0022 — Table API + OpenAPI
- **Task:** Public table HTTP + OpenAPI
- **Description:** Authenticated `/api/v1/:table` with filters, caps, OpenAPI, and a Studio playground after hardening.
- **What it does:** Table CRUD filters/caps/`all=true`, OpenAPI document, Studio playground. RETURNING and `count=exact` pass on both dialects (phase-02.5).
- **Status:** `done`

### 8. S0023 — Outbox CDC
- **Task:** Change outbox / realtime resume
- **Description:** Durable `jord_changes` outbox with tracked tables, 410 `since`, and a single change event path (true since phase-02.5 S0031).
- **What it does:** Outbox + prune job, SSE/WS resume via `since`, 410 resync. For every API write route, the data write and the outbox row share one transaction inside the write queue; a failed outbox insert fails the request. Watermark race test passes on live Postgres (phase-02.5).
- **Status:** `done`

### 9. S0029 — `@altr/jord-client`
- **Task:** Private fetch client SDK
- **Description:** Workspace client for refresh-once auth, table API, and SSE without depending on `@altr/jord`.
- **What it does:** Private fetch client; refresh once; `refresh_reused` signs out; table API; SSE `since`; 410 resync; CI typecheck + test; no engine dependency.
- **Status:** `done`

### 10. S0024 — Studio power tools
- **Task:** Studio operator tools
- **Description:** SQL console, migrate wizard, users admin, and batched redacted logs for operators.
- **What it does:** Read-only SQL console, migrate wizard type map, users admin, batched redacted `jord_logs`. Postgres `statement_timeout` cancel is tested live (phase-02.5).
- **Status:** `done`

### 11. S0025 — Storage v2
- **Task:** Blob storage port + S3
- **Description:** Unify local HMAC and S3 adapters with sign-time policy, pending/finalize/GC, and a copy-plan dry-run.
- **What it does:** `JordStoragePort`, local HMAC + S3 adapters, sign-time policy, pending/finalize, `blobs_gc`, copy-plan dry-run (`delete_local: false`). Blob metadata tests pass on both dialects (phase-02.5). MinIO live sign → upload → finalize exercised in phase-02.75 / `jord-postgres`.
- **Status:** `done`

### 12. S0026 — Functions v2 ADR only
- **Task:** Functions runtime ADR
- **Description:** Choose a safe execution model for future user TypeScript handlers without shipping a runtime.
- **What it does:** ADR at `Docs/tech_space/jord/apis/ADR-functions-v2.md` recommends `worker_threads`, rejects `isolated-vm`, records timeout/non-goals, and STATUS gates implementation. No worker/runtime product code; no vitest for this card.
- **Status:** `done`
