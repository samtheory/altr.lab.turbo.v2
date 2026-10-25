---
title: "Jord phase-02 — task completion rollup"
description: "Every execution-order stop from plan/Jord/phase-02 with status after S0026"
created: 2026-10-25
updated: 2026-10-25
tags:
  - report
  - jord
  - phase-02
  - tasks
---

# Jord phase-02 — task completion rollup

> Source order: [[../../plan/Jord/phase-02/README]]. Code/docs truth after **S0026**. Folder: [[README]].

- **Done:** 12
- **Remains:** 0
- **Total:** 12

Phase-02’s numbered execution queue (S0027 through S0026) is complete; environment-gated Postgres/S3 boxes and the Functions **runtime** implementation remain soft follow-ups, not open queue stops.

---

### 1. S0027 — CI (safety net)
- **Task:** CI workflow for Jord packages
- **Description:** Add a GitHub Actions safety net that typechecks and tests `@altr/jord`, `@altr/jord-server`, and Studio typecheck before later phase-02 stops land.
- **What it does:** Ships `.github/workflows/jord.yml`; as-built note under tech_space overview CI. Actions green on a PR and branch-protection admin remain manual caveats on the card.
- **Status:** `done`

### 2. S0021-A — Migrations (`jord-s0021-a`)
- **Task:** Forward-only migration runner
- **Description:** Replace ad-hoc schema bootstrap with `jord_migrations`, baseline adopt, and checksum refuse-on-mismatch.
- **What it does:** Boots apply forward-only migrations; phase-01 baseline adopt; checksum mismatch refuses boot (file libSQL). Postgres advisory-lock live test skipped when `JORD_TEST_POSTGRES_URL` unset.
- **Status:** `done`

### 3. S0021-B — Principals (`jord-s0021-b`)
- **Task:** Auth principals and tokens
- **Description:** Introduce `service` / `user` / `anon` / `operator` subjects with JWTs, scrypt, and refresh families before policies.
- **What it does:** HS256 access JWTs, scrypt password hashing, console mail, refresh-token families (file libSQL). Live Postgres auth tests not run here.
- **Status:** `done`

### 4. S0021 ADR — Threat model
- **Task:** Principal threat model ADR
- **Description:** Accept attack rows, trust boundaries, and non-goals before Part C policy code.
- **What it does:** Accepted ADR documents principals, trust boundaries, and defenses; unset legacy role stays `service`. Gate for Part C closed.
- **Status:** `done`

### 5. S0021-C — Policies (`jord-s0021-c`)
- **Task:** Table policies / RLS
- **Description:** Enforce deny-overrides, owner immutability, and per-table rules for user/anon after the threat model.
- **What it does:** Per-table RLS, deny-overrides, owner immutability, `jord_app` plus separate migrate URL (file libSQL). Postgres pool-leak and dialect-pair remain env-gated.
- **Status:** `done`

### 6. S0028 — HTTP hardening
- **Task:** Edge hardening before public data API
- **Description:** CORS default-deny, body caps, data-route rate limits, idempotency, and write-queue drain on shutdown.
- **What it does:** CORS allow-list, 1 MiB JSON cap, data-route 120/min (auth 30/min), Idempotency-Key, write-queue drain on shutdown.
- **Status:** `done`

### 7. S0022 — Table API + OpenAPI
- **Task:** Public table HTTP + OpenAPI
- **Description:** Authenticated `/api/v1/:table` with filters, caps, OpenAPI, and a Studio playground after hardening.
- **What it does:** Table CRUD filters/caps/`all=true`, OpenAPI document, Studio playground (file libSQL). Postgres RETURNING conformance not live-tested.
- **Status:** `done`

### 8. S0023 — Outbox CDC
- **Task:** Change outbox / realtime resume
- **Description:** Durable `jord_changes` outbox with tracked tables, 410 `since`, and a single change event path.
- **What it does:** Outbox + prune job, SSE/WS resume via `since`, 410 resync (file libSQL). Live Postgres watermark race not run.
- **Status:** `done`

### 9. S0029 — `@altr/jord-client`
- **Task:** Private fetch client SDK
- **Description:** Workspace client for refresh-once auth, table API, and SSE without depending on `@altr/jord`.
- **What it does:** Private fetch client; refresh once; `refresh_reused` signs out; table API; SSE `since`; 410 resync; CI typecheck + test; no engine dependency.
- **Status:** `done`

### 10. S0024 — Studio power tools
- **Task:** Studio operator tools
- **Description:** SQL console, migrate wizard, users admin, and batched redacted logs for operators.
- **What it does:** Read-only SQL console, migrate wizard type map, users admin, batched redacted `jord_logs` (file libSQL). Postgres `statement_timeout` path not live-tested.
- **Status:** `done`

### 11. S0025 — Storage v2
- **Task:** Blob storage port + S3
- **Description:** Unify local HMAC and S3 adapters with sign-time policy, pending/finalize/GC, and a copy-plan dry-run.
- **What it does:** `JordStoragePort`, local HMAC + S3 adapters, sign-time policy, pending/finalize, `blobs_gc`, copy-plan dry-run (`delete_local: false`). Live S3/R2 and Postgres migration apply not exercised here.
- **Status:** `done`

### 12. S0026 — Functions v2 ADR only
- **Task:** Functions runtime ADR
- **Description:** Choose a safe execution model for future user TypeScript handlers without shipping a runtime.
- **What it does:** ADR at `Docs/tech_space/jord/apis/ADR-functions-v2.md` recommends `worker_threads`, rejects `isolated-vm`, records timeout/non-goals, and STATUS gates implementation. No worker/runtime product code; no vitest for this card.
- **Status:** `done`
