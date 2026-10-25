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
| Active sprint | **Accepted on local proof (2026-10-25).** Stops 1–12 pass on file libSQL and live Postgres after [[../phase-02.5/README\|phase-02.5]] closed the review gaps. Formal sign-off waits on the first green `jord-postgres` Actions run and branch protection ([[../phase-02.75/README\|phase-02.75]] group A). Review: [[../../../report/Jord-phase-02-closeout-review]]. Functions **runtime** stays gated. |
| Done in tree | [[Jord-S0027/README\|S0027]] · [[Jord-S0021/01-migration\|S0021-A]] · [[Jord-S0021/02-auth\|S0021-B]] · [[Jord-S0021/ADR-threat-model\|ADR]] · [[Jord-S0021/03-policy\|S0021-C]] · [[Jord-S0028/README\|S0028]] · [[Jord-S0022/README\|S0022]] · [[Jord-S0023/README\|S0023]] · [[Jord-S0029/README\|S0029]] · [[Jord-S0024/README\|S0024]] · [[Jord-S0025/README\|S0025]] · [[Jord-S0026/README\|S0026]] (ADR only) |
| Soft backlog | [[00-remaining-backlog]] |
| Progress report | [[../../../report/jord-phase-02-report/00-phase-02-tasks]] |

Ids are **not** execution order. This table is the order. S0027 runs first. S0028 and S0029 are new. When a stop lands, update that row's **Status**, **Implemented**, and **Remains**.

## Execution order

| #   | Id                                   | Title                            | Blocked by             | Status                | Implemented                                                                                                                                          | Remains                                                                                                                                                   |
| --- | ------------------------------------ | -------------------------------- | ---------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [[Jord-S0027/README\|S0027]]         | CI (safety net)                  | —                      | Done                  | GitHub Actions typecheck and test for `@altr/jord`, `@altr/jord-server`, and Studio typecheck (`381051e`)                                            | Actions green on a PR, plus branch-protection admin → [[../phase-02.75/README\|phase-02.75]] A2–A3                                                         |
| 2   | [[Jord-S0021/README\|S0021]] A       | Migrations (`jord-s0021-a`)      | S0027                  | Done                  | Forward-only `jord_migrations`, phase-01 baseline adopt, checksum mismatch refuses boot (`60bf66a`). Postgres lock tests pass live (02.5)            | Nothing on this card                                                                                                                                      |
| 3   | [[Jord-S0021/02-auth\|S0021]] B      | Principals (`jord-s0021-b`)      | A                      | Done                  | `service` / `user` / `anon` / `operator`, HS256 JWTs, scrypt, console mail, refresh-token families (`b16888b`)                                       | Nothing on this card. Custom JWT claims → [[../phase-02.75/README\|phase-02.75]] B7                                                                       |
| 4   | [[Jord-S0021/ADR-threat-model\|ADR]] | Threat model (accepted before C) | S0021-B                | Accepted              | Attack rows, trust boundaries, and non-goals accepted for Part C. Unset legacy role stays `service`                                                  | Nothing. Gate for Part C is closed                                                                                                                        |
| 5   | [[Jord-S0021/03-policy\|S0021]] C    | Policies (`jord-s0021-c`)        | B + ADR                | Done                  | Per-table RLS, deny-overrides, owner immutability, `jord_app` plus a separate migrate URL (`b16888b`). Row scope + user-table `CREATE POLICY` (02.5) | Rename-table RLS move done in [[../phase-02.75/README\|phase-02.75]] B1                                                                                    |
| 6   | [[Jord-S0028/README\|S0028]]         | HTTP hardening                   | S0021-C                | Done                  | CORS default-deny, 1 MiB JSON cap, data-route 120/min (auth stays 30/min), idempotency keys, write-queue drain on shutdown (`b16888b`)               | Nothing on this card                                                                                                                                      |
| 7   | [[Jord-S0022/README\|S0022]]         | Table API + OpenAPI              | S0028                  | Done                  | `/api/v1/:table` filters, caps, `all=true`, OpenAPI, Studio playground. RETURNING passes on both dialects (02.5)                                      | Nothing on this card                                                                                                                                      |
| 8   | [[Jord-S0023/README\|S0023]]         | Outbox CDC                       | S0022                  | Done                  | `jord_changes` outbox, tracked tables, 410 `since`, single transactional `jord.change` path, prune job. Watermark race passes live (02.5)             | Hosted `libsql://` atomicity, console emits, PATCH `old` → [[../phase-02.75/README\|phase-02.75]] B3–B5                                                   |
| 9   | [[Jord-S0029/README\|S0029]]         | `@altr/jord-client`              | S0023                  | Done                  | Private fetch client: refresh once, `refresh_reused` signs out, table API, SSE `since`, 410 resync. No `@altr/jord` dependency. CI typecheck + test  | Nothing on this card                                                                                                                                      |
| 10  | [[Jord-S0024/README\|S0024]]         | Studio power tools               | S0029                  | Done                  | SQL console (`PRAGMA query_only` / READ ONLY), migrate wizard type map, users admin, batched redacted `jord_logs`. Connection page stays labels-only | Nothing on this card. `statement_timeout` cancel tested live (02.5)                                                                                       |
| 11  | [[Jord-S0025/README\|S0025]]         | Storage v2                       | S0024                  | Done                  | `JordStoragePort`, local HMAC + S3 adapters, sign-time policy, pending/finalize, `blobs_gc`, copy-plan dry-run (`delete_local: false`). Metadata tests on both dialects (02.5) | Live S3/R2 → [[../phase-02.75/README\|phase-02.75]] C1                                                                                  |
| 12  | [[Jord-S0026/README\|S0026]]         | Functions v2 ADR only            | — (no product blocker) | Done (ADR)            | [[../../../tech_space/jord/apis/ADR-functions-v2\|ADR]] recommends `worker_threads`; rejects `isolated-vm`; no runtime code                                                                 | Functions v2 **implementation** still gated — soft backlog until a follow-up sprint is approved                                                         |

## Process

1. One stop per session. Stop for review.
2. S0027 through S0026 are done (S0026 is ADR-only). The acceptance gaps were fixed in [[../phase-02.5/README|phase-02.5]] (S0030–S0033). What is left is in [[../phase-02.75/README|phase-02.75]]. Do not reopen these cards; fix there. Functions **runtime** is soft backlog after ADR approval for implementation.
3. Each card's PR updates its own `tech_space/jord/*` page. Verify reconciles links, ticks features, and refreshes STATUS. It writes no new content.
4. Task rollup: [[../../../report/jord-phase-02-report/00-phase-02-tasks]].
