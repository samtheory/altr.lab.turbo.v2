---
title: "Jord — phase-03 candidates"
description: "Proposed phase-03 features after phase-02.5 acceptance: ops, typed DX, Functions runtime, auth v2, API v2, storage/realtime v2, security pass"
created: 2026-10-25
updated: 2026-10-26
tags:
  - feature
  - jord
  - phase-03
  - backlog
---

# Jord — phase-03 candidates

> **Proposed, not approved — needs a plan.** Gate: [[../../plan/Jord/phase-02.75/README|phase-02.75]] is **closed** (2026-10-26). Planning can start now. Phase-02.75 items moved here (decided 2026-10-26): B6 `JORD_PG_WRITE_CONCURRENCY` (P1), B7 custom JWT claims (P4). C1 MinIO S3 live landed in 02.75, so P6 starts with the S3 adapter already exercised. Rationale and rating: [[../../report/Jord-phase-02-closeout-review]]. Phase-02 features: [[03-phase-02-features]]. Older soft list: [[01-phase-02-candidates]].

The overall rating after phase-02 is **6/10**: lab-grade on file libSQL. Phase-03 should move Jord to a backend an Altr app can run in production. Order is by what blocks real use first.

## P1 — Production ops (multi-instance ready)

|                |                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Why**        | Rate limits, idempotency keys, SQL history, and realtime fan-out live in one process's memory. A second instance breaks all four                                                                                                                                                                                                                                                             |
| **What**       | Postgres-backed rate-limit + idempotency tables (no Redis). `LISTEN/NOTIFY` seq fan-out (the `pg_notify` trigger exists; phase-02.5 moved the `LISTEN` side here from F5). Shared commit watermark across instances. `/health/live` + `/health/ready` (DB + migrations + queue). OpenTelemetry traces/metrics (request, queue depth, outbox lag). Structured JSON logs. Backup + **restore drill** for `file:` (snapshot) and Postgres (`pg_dump` runbook). Dockerfile + one deploy recipe |
| **Acceptance** | Two server instances behind one URL: rate limit shared, idempotent replay works across instances, SSE client on instance B receives a write made on A. Restore drill documented with command output                                                                                                                                                                                          |

## P2 — Typed developer experience

| | |
|--|--|
| **Why** | Apps call `/api/v1` with untyped rows. Phase-02 built the client, not the types |
| **What** | `jord gen types` → TS row types from introspection/OpenAPI. Typed `@altr/jord-client` table builder. React bindings (`useJordQuery`, `useJordLive` on SSE `since`) in a separate package so the client stays framework-free. First consumer: one Apolyx app screen |
| **Acceptance** | A column rename breaks the consumer app's typecheck; live hook resyncs on 410 |

## P3 — Functions v2 runtime

|                |                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Why**        | ADR accepted the design; Functions are still the phase-01 built-in kinds only                                                                                                                                |
| **What**       | Implement [[../../tech_space/jord/apis/ADR-functions-v2]]: `worker_threads` pool, timeout + memory cap, a scoped Jord client inside the worker (principal-bound, goes through policies), logs to `jord_logs` |
| **Acceptance** | Infinite loop is killed at timeout; worker cannot read env secrets; writes respect policies                                                                                                                  |

## P4 — Auth v2

|                |                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**       | Real `MailerPort` (Resend or SES) · magic link · one OAuth provider (GitHub or Google) · Studio "run as user" policy tester that shows which policy allowed/denied · session list + revoke in Studio |
| **Acceptance** | Enumeration tests still pass; OAuth state/PKCE tested; policy tester matches server decisions on a fixture matrix                                                                                    |
|                |                                                                                                                                                                                                      |

## P5 — Table API v2

| | |
|--|--|
| **What** | One-level FK embeds (`select=*,author(*)`) with policies applied per embedded table · cursor (keyset) pagination · bulk insert/upsert with per-row results · RPC to registered server functions |
| **Acceptance** | Embed never returns a row the caller could not read directly; keyset paging stable under concurrent inserts |

## P6 — Storage and realtime v2

| | |
|--|--|
| **What** | Multipart + resumable uploads · image transforms (sharp is native, so evaluate a pure-JS or worker alternative first; invariant 7) · live S3/R2 test in CI with MinIO container · realtime presence + broadcast channels with policy-gated join |
| **Acceptance** | 1 GiB upload resumes after disconnect; MinIO CI job green |

## P7 — Security pass

| | |
|--|--|
| **What** | Authorized Strix pentest of `/api/v1`, `/auth`, `/blobs`, `/realtime` (heimdall) · JWT/HMAC/blob-signing key-rotation runbook · dependency audit in CI |
| **Acceptance** | Findings triaged into cards; no open high/critical |

## Still out (unless a product asks)

Embedded Turso replicas · hosted embedding API / embedding CDC · Redis · Bun · Artemis trading tables in `records.body` · multi-project (many DBs per server) · npm publish.

## Rule

Promote into a phase-03 plan (`plan/Jord/phase-03/`) when this candidate list is approved. One stop per session, with pasted proof for every ticked box.
