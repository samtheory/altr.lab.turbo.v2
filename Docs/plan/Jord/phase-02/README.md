---
title: "plan/Jord/phase-02 — next Jord sprints"
description: "Execution order after the hardening addendum: S0027 first, then S0021, S0028, S0022…"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - phase-02
  - readme
---

# plan / Jord / phase-02

> Phase-01 archive: [[../phase-01/README]]. Features: [[../../../feature_list/Jord/03-phase-02-features]]. Review: [[../../../report/Jord-phase-02-plan-review]].

| Item | Status |
|------|--------|
| Active sprint | **Phase-02 execution complete** (stops 1–12). Last stop [[Jord-S0026/README\|S0026]] ADR written 2026-10-25. Functions **runtime** stays gated. |
| Done in tree | [[Jord-S0027/README\|S0027]] · [[Jord-S0021/01-migration\|S0021-A]] · [[Jord-S0021/02-auth\|S0021-B]] · [[Jord-S0021/ADR-threat-model\|ADR]] · [[Jord-S0021/03-policy\|S0021-C]] (file libSQL) · [[Jord-S0028/README\|S0028]] · [[Jord-S0022/README\|S0022]] (file libSQL) · [[Jord-S0023/README\|S0023]] (file libSQL) · [[Jord-S0029/README\|S0029]] · [[Jord-S0024/README\|S0024]] · [[Jord-S0025/README\|S0025]] (file libSQL) · [[Jord-S0026/README\|S0026]] (ADR only) |
| Soft backlog | [[00-remaining-backlog]] |
| Progress report | [[../../../report/jord-phase-02-report/00-phase-02-tasks]] |

Ids are **not** execution order. This table is the order. S0027 runs first. S0028 and S0029 are new. When a stop lands, update that row's **Status**, **Implemented**, and **Remains**.

## Execution order

| #   | Id                                   | Title                            | Blocked by             | Status                | Implemented                                                                                                                                          | Remains                                                                                                                                                   |
| --- | ------------------------------------ | -------------------------------- | ---------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [[Jord-S0027/README\|S0027]]         | CI (safety net)                  | —                      | Done                  | GitHub Actions typecheck and test for `@altr/jord`, `@altr/jord-server`, and Studio typecheck (`381051e`)                                            | Actions green on a PR, plus branch-protection admin. Card still says awaiting that                                                                        |
| 2   | [[Jord-S0021/README\|S0021]] A       | Migrations (`jord-s0021-a`)      | S0027                  | Done (file libSQL)    | Forward-only `jord_migrations`, phase-01 baseline adopt, checksum mismatch refuses boot (`60bf66a`)                                                  | Postgres advisory-lock test skipped (`JORD_TEST_POSTGRES_URL` unset). Does not block later stops                                                          |
| 3   | [[Jord-S0021/02-auth\|S0021]] B      | Principals (`jord-s0021-b`)      | A                      | Done (file libSQL)    | `service` / `user` / `anon` / `operator`, HS256 JWTs, scrypt, console mail, refresh-token families (`b16888b`)                                       | Live Postgres auth tests not run. Same URL gap                                                                                                            |
| 4   | [[Jord-S0021/ADR-threat-model\|ADR]] | Threat model (accepted before C) | S0021-B                | Accepted              | Attack rows, trust boundaries, and non-goals accepted for Part C. Unset legacy role stays `service`                                                  | Nothing. Gate for Part C is closed                                                                                                                        |
| 5   | [[Jord-S0021/03-policy\|S0021]] C    | Policies (`jord-s0021-c`)        | B + ADR                | Done (file libSQL)    | Per-table RLS, deny-overrides, owner immutability, `jord_app` plus a separate migrate URL (`b16888b`)                                                | Postgres pool-leak test and dialect pair. Same URL gap. Does not block later stops                                                                        |
| 6   | [[Jord-S0028/README\|S0028]]         | HTTP hardening                   | S0021-C                | Done                  | CORS default-deny, 1 MiB JSON cap, data-route 120/min (auth stays 30/min), idempotency keys, write-queue drain on shutdown (`b16888b`)               | Nothing on this card                                                                                                                                      |
| 7   | [[Jord-S0022/README\|S0022]]         | Table API + OpenAPI              | S0028                  | In tree (file libSQL) | `/api/v1/:table` filters, caps, `all=true`, OpenAPI, Studio playground                                                                               | Postgres RETURNING conformance not run                                                                                                                    |
| 8   | [[Jord-S0023/README\|S0023]]         | Outbox CDC                       | S0022                  | In tree (file libSQL) | `jord_changes` outbox, tracked tables, 410 `since`, single `jord.change` path, prune job                                                             | Live Postgres watermark race not run                                                                                                                      |
| 9   | [[Jord-S0029/README\|S0029]]         | `@altr/jord-client`              | S0023                  | In tree               | Private fetch client: refresh once, `refresh_reused` signs out, table API, SSE `since`, 410 resync. No `@altr/jord` dependency. CI typecheck + test  | Nothing on this card                                                                                                                                      |
| 10  | [[Jord-S0024/README\|S0024]]         | Studio power tools               | S0029                  | In tree (file libSQL) | SQL console (`PRAGMA query_only` / READ ONLY), migrate wizard type map, users admin, batched redacted `jord_logs`. Connection page stays labels-only | Postgres statement_timeout path not live-tested                                                                                                           |
| 11  | [[Jord-S0025/README\|S0025]]         | Storage v2                       | S0024                  | In tree (file libSQL) | `JordStoragePort`, local HMAC + S3 adapters, sign-time policy, pending/finalize, `blobs_gc`, copy-plan dry-run (`delete_local: false`)                 | Live S3/R2 against a real bucket not run here. Postgres migration apply not live-tested (`JORD_TEST_POSTGRES_URL` unset)                                  |
| 12  | [[Jord-S0026/README\|S0026]]         | Functions v2 ADR only            | — (no product blocker) | Done (ADR)            | [[../../../tech_space/jord/apis/ADR-functions-v2\|ADR]] recommends `worker_threads`; rejects `isolated-vm`; no runtime code                                                                 | Functions v2 **implementation** still gated — soft backlog until a follow-up sprint is approved                                                         |

## Process

1. One stop per session. Stop for review.
2. S0027 through S0026 are complete for phase-02 execution (file libSQL for server stops; S0026 is ADR-only). Open Postgres / live S3 boxes do not reopen closed cards. Functions **runtime** is soft backlog after ADR approval for implementation.
3. Each card's PR updates its own `tech_space/jord/*` page. Verify reconciles links, ticks features, and refreshes STATUS. It writes no new content.
4. Task rollup: [[../../../report/jord-phase-02-report/00-phase-02-tasks]].
