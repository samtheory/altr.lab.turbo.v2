---
title: "Jord phase-02 — closeout review (mimir)"
description: "Is phase-02 complete? Code-truth audit of S0027…S0026, fixes applied, overall Jord rating, phase-03 direction"
created: 2026-10-25
updated: 2026-10-25
tags:
  - report
  - jord
  - phase-02
  - review
---

# Jord phase-02 — closeout review

> Who: **mimir**, 2026-10-25. Audited against code, not the plan text. Fix queue: [[../plan/Jord/phase-02.5/README]]. Next: [[../feature_list/Jord/05-phase-03-candidates]].

## Verdict

**Phase-02 is not complete.** It is **built on file libSQL but not accepted**.

All 12 stops have code in the tree, and the file libSQL suites pass. Three acceptance criteria fail on code truth. Every Postgres box was never run.

| Feature | Claimed | Code truth |
|---------|---------|------------|
| F3 Policies | Done (file libSQL) | `owner_eq` leaked other users' rows on `/api/v1` reads/writes and Studio row reads. **Fixed in this review.** `claim_eq` has the same leak (open, S0032) |
| F5 CDC | "Same-transaction outbox, one producer path" | Outbox insert runs after the data commit, outside the write queue, errors swallowed. `/api/v1` writes emit nothing. Watermark is a no-op. No `pg_notify`. Open, S0031 |
| F9 CI | "Workflow green" | Never confirmed on Actions. Postgres job could never run. Container job added in this review; green **UNVERIFIED** (S0030) |
| All Postgres boxes | "env gap, does not block" | Zero Postgres runs in phase-02. The CDC race "test" only asserts the env var is set. Open, S0030 |
| S0021 verify card | — | Never executed; all five boxes unchecked. Open, S0033 |

## Proof (this session)

| Command | Result |
|---------|--------|
| `pnpm --filter @altr/jord test` | 69 passed / 6 skipped (Postgres) |
| `pnpm --filter @altr/jord-server test` | 89 passed / 1 skipped (was 88; +1 new leak test) |
| `pnpm --filter @altr/jord-client test` | 6 passed |
| typecheck `@altr/jord`, `@altr/jord-server`, `@altr/jord-studio` | clean |
| New leak test with the fix stashed | **fails**: user-1 listed `['1','2']` |

## Changes made in this review

1. **Security fix: owner row scope.** `ListTableRowsInput.ownerFilter` (libSQL + Postgres adapters, fails closed on unknown column). `/api/v1/:table` appends `owner = uid` to select, count, update, and delete when the policy decision carries an owner constraint. Studio `GET /schema/tables/:name/rows` passes the same filter. Test in `cloud/jord/src/policies/part-c.test.ts`.
2. **CI.** `.github/workflows/jord.yml` `jord-postgres` runs against a `pgvector/pgvector:pg16` service container and tests both `@altr/jord` and `@altr/jord-server`. Not a required check until green.

## What phase-02 got right

- Migration runner with checksum-refuse and a frozen baseline fixture: solid foundation.
- Principal model (service / user / anon / operator), JWT `kid` rotation, refresh families, and SSE/WS close at `exp` are all in code.
- HTTP edge (CORS deny, body cap, rate limits, idempotency, queue drain) landed before the public API, as ordered.
- `@altr/jord-client` really has no engine dependency.
- Studio stayed Apolyx-only; no connection-URL editor.

## Overall Jord rating (phase-01 + phase-02, as of 2026-10-25)

| Dimension | Score /10 | Why |
|-----------|-----------|-----|
| Architecture | 8 | Clean port/adapter split, dialect seams, forward-only migrations, outbox concept, leaf `@altr/base` |
| Security | 6 | Good layering and threat model, but a row-level leak shipped "done" and Postgres RLS on user tables is unproven |
| Data correctness | 5 | OCC is solid; CDC is not transactional; Postgres paths never executed |
| Tests / CI | 6 | ~165 file-libSQL tests; Postgres tests placeholder or skipped; Actions never confirmed green |
| Developer experience | 6.5 | OpenAPI, playground, fetch client; no generated types, no React bindings |
| Operations | 4 | Single process; in-memory rate limit / idempotency / SQL history; no metrics, readiness, deploy recipe, or restore drill |
| Docs | 7.5 | Excellent coverage, but status drifted ahead of code (claims of "done" that were not) |
| **Overall** | **6 / 10** | A strong **lab-grade** data plane on file libSQL. Not yet a production backend, and not yet a proven Postgres one |

Process note: three phases of docs said "done" on items that tests never exercised. From phase-02.5 on, a box is ticked only with pasted command output, and a placeholder test counts as **no test**.

## Phase-03 direction

Do phase-02.5 first. Then, in priority order (detail in [[../feature_list/Jord/05-phase-03-candidates]]):

1. **Production ops**: shared state in Postgres (rate limit, idempotency), `LISTEN/NOTIFY` fan-out → multi-instance, health/readiness, OpenTelemetry metrics, backup + restore drill, Docker deploy recipe.
2. **Typed DX**: types generated from introspection into `@altr/jord-client`, React hooks with live queries, consumed by an Apolyx app.
3. **Functions v2 runtime** per [[../tech_space/jord/apis/ADR-functions-v2]] (`worker_threads`).
4. **Auth v2**: real `MailerPort` provider, magic link, OAuth (one provider), Studio "run as user" policy tester.
5. **Table API v2**: one-level FK embeds, cursor pagination, bulk upsert, RPC.
6. **Storage / realtime v2**: multipart + resumable uploads, image transforms, presence/broadcast channels.
7. **Security pass**: authorized Strix pentest of `/api/v1`, `/auth`, `/blobs` (heimdall), plus a key-rotation runbook.

## Links

- Phase-02 queue: [[../plan/Jord/phase-02/README]] · rollup [[jord-phase-02-report/00-phase-02-tasks]]
- Code: `cloud/jord/src/table-api/routes.ts` · `cloud/jord/src/app.ts` · `cloud/jord/src/realtime/outbox.ts` · `.github/workflows/jord.yml`
