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
| Active sprint | Stops **1–7 are in the tree** (file libSQL). Next untouched stop is [[Jord-S0023/README\|S0023]] (execution #8). |
| Done in tree | [[Jord-S0027/README\|S0027]] · [[Jord-S0021/01-migration\|S0021-A]] · [[Jord-S0021/02-auth\|S0021-B]] · [[Jord-S0021/ADR-threat-model\|ADR]] · [[Jord-S0021/03-policy\|S0021-C]] (file libSQL) · [[Jord-S0028/README\|S0028]] · [[Jord-S0022/README\|S0022]] (file libSQL) |
| Soft backlog | [[00-remaining-backlog]] |

Ids are **not** execution order. This table is the order. S0027 runs first. S0028 and S0029 are new. When a stop lands, update that row's **Status**, **Implemented**, and **Remains**.

## Execution order

| # | Id | Title | Blocked by | Status | Implemented | Remains |
|---|-----|-------|------------|--------|-------------|---------|
| 1 | [[Jord-S0027/README\|S0027]] | CI (safety net) | — | Done | GitHub Actions typecheck and test for `@altr/jord`, `@altr/jord-server`, and Studio typecheck (`381051e`) | Actions green on a PR, plus branch-protection admin. Card still says awaiting that |
| 2 | [[Jord-S0021/README\|S0021]] A | Migrations (`jord-s0021-a`) | S0027 | Done (file libSQL) | Forward-only `jord_migrations`, phase-01 baseline adopt, checksum mismatch refuses boot (`60bf66a`) | Postgres advisory-lock test skipped (`JORD_TEST_POSTGRES_URL` unset). Does not block later stops |
| 3 | [[Jord-S0021/02-auth\|S0021]] B | Principals (`jord-s0021-b`) | A | Done (file libSQL) | `service` / `user` / `anon` / `operator`, HS256 JWTs, scrypt, console mail, refresh-token families (`b16888b`) | Live Postgres auth tests not run. Same URL gap |
| 4 | [[Jord-S0021/ADR-threat-model\|ADR]] | Threat model (accepted before C) | S0021-B | Accepted | Attack rows, trust boundaries, and non-goals accepted for Part C. Unset legacy role stays `service` | Nothing. Gate for Part C is closed |
| 5 | [[Jord-S0021/03-policy\|S0021]] C | Policies (`jord-s0021-c`) | B + ADR | Done (file libSQL) | Per-table RLS, deny-overrides, owner immutability, `jord_app` plus a separate migrate URL (`b16888b`) | Postgres pool-leak test and dialect pair. Same URL gap. Does not block later stops |
| 6 | [[Jord-S0028/README\|S0028]] | HTTP hardening | S0021-C | Done | CORS default-deny, 1 MiB JSON cap, data-route 120/min (auth stays 30/min), idempotency keys, write-queue drain on shutdown (`b16888b`) | Nothing on this card |
| 7 | [[Jord-S0022/README\|S0022]] | Table API + OpenAPI | S0028 | In tree (file libSQL) | `/api/v1/:table` filters, caps, `all=true`, OpenAPI, Studio playground | Postgres RETURNING conformance not run |
| 8 | [[Jord-S0023/README\|S0023]] | Outbox CDC | S0022 | Not started | — | Tracked tables, commit watermark, notify-by-seq, 410 on expired `since`, one emit path |
| 9 | [[Jord-S0029/README\|S0029]] | `@altr/jord-client` | S0023 | Not started | — | Private fetch client: auth refresh, table API, realtime resume |
| 10 | [[Jord-S0024/README\|S0024]] | Studio power tools | S0029 | Not started | — | Engine-enforced SQL editor, type-mapped migrate wizard, batched redacted logs. No connection-URL editor |
| 11 | [[Jord-S0025/README\|S0025]] | Storage v2 | S0024 | Not started | — | S3 / R2 / MinIO: sign-time policy, pending/finalize GC, HMAC local URLs, local-to-S3 copy plan |
| 12 | [[Jord-S0026/README\|S0026]] | Functions v2 ADR only | — (no product blocker) | Not started | — | ADR that picks the handler runtime. No product code until that ADR is explicitly approved. May be written any time; queue position is documentation order |

## Process

1. One stop per session. Stop for review.
2. S0027 through S0022 are in the tree (file libSQL). Two S0021-C Postgres boxes and the S0022 Postgres RETURNING box stay open and do not block later stops. Next untouched stop is S0023.
3. Each card's PR updates its own `tech_space/jord/*` page. Verify reconciles links, ticks features, and refreshes STATUS. It writes no new content.
