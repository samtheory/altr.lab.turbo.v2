---
title: "jord-F0006 — apis"
feature_id: jord-F0006
description: "Shipped: generated CRUD, /api/v1 table API, HTTP hardening, client SDK; Functions v2 ADR only"
created: 2026-10-24
updated: 2026-10-27
tags:
  - feature
  - jord
  - done
  - apis
---

# jord-F0006 — apis

> HTTP + client. As-built: [[../../../tech_space/jord/apis/README]]. Next: embeds / typed DX / Functions runtime → [[../INDEX]].

## Generated + custom (phase-01)

CRUD panel, custom APIs, function APIs (built-in kinds) — **Done** (S0006–S0008).

## Table API `/api/v1/:table` (F4)

Coerce by column type; libSQL `ilike` = `lower()`; caps (limit 100/1000, `in` 100, body 1 MiB); PATCH/DELETE need filter; `?all=true` **service only**; composite PKs; `count=exact` costly; `Prefer: return=representation`. **No embeds** (phase-03 P5).

**Done** 2026-10-25. Plan: [[../../../plan/Jord/phase-02/Jord-S0022/README|S0022]].

## HTTP hardening (F10)

CORS allow-list; data rate 120/min; auth 30/min; JSON 1 MiB; shutdown drains write queue; Idempotency-Key TTL 24h.

**Rate limit + idempotency storage.** libSQL is in-process; Postgres is shared on `jord_rate_limits` / `jord_idempotency` (S0036). Auth signup/signin limits stay process-local (S0021-B).

**Done**. Plan: [[../../../plan/Jord/phase-02/Jord-S0028/README|S0028]] · [[../../plan/Jord/phase-03/S0036-shared-rate-limit-idempotency|S0036]].

## Client SDK (F11)

`@altr/jord-client` — fetch, auto refresh, table API, realtime `since`, 410 → resync. Must not depend on `@altr/jord`.

**Done**. Plan: [[../../../plan/Jord/phase-02/Jord-S0029/README|S0029]]. Typed builders / React hooks → phase-03 P2.

## Shared rate limit + idempotency (S0036)

Data-route limits and `Idempotency-Key` replay are **shared across instances on Postgres** via migration `0007_rate_limit_idempotency` (`jord_rate_limits`, `jord_idempotency` + TTL index + sweep). libSQL stays in-process. Auth signup/signin limits remain process-local. 429 body unchanged: `{ error: "too_many_requests" }`.

**Done** 2026-10-29. Plan: [[../../plan/Jord/phase-03/S0036-shared-rate-limit-idempotency|S0036]]. As-built: [[../../../tech_space/jord/apis/README#shared-rate-limit--idempotency-s0036]] · [[../../../tech_space/jord/writes/README]].

## Functions v2 (F8)

ADR only: recommend `worker_threads`, reject `isolated-vm`. **No runtime.** [[../../../tech_space/jord/apis/ADR-functions-v2]]. Runtime → phase-03 P3. Plan: [[../../../plan/Jord/phase-02/Jord-S0026/README|S0026]].
