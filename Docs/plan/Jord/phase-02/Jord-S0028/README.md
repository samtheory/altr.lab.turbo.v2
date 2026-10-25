---
title: "Jord-S0028 — HTTP hardening"
description: "CORS, data-route rate limits, body limits, write-queue drain, idempotency keys — before the public table API"
created: 2026-10-24
updated: 2026-10-25
tags:
  - plan
  - jord
  - Jord-S0028
  - phase-02
  - hardening
---

# Jord-S0028 — HTTP hardening

> Who: **mimir**. **Status: in tree** (file libSQL, 2026-10-25). **Execution #6.** Next: [[../Jord-S0022/README]] (execution #7). Postgres was not required for this stop.

**Sprint id:** `Jord-S0028`  
**Hats:** **sindri** · **heimdall** · **docs_man**

## Goal

Close the edge before `/api/v1` and `@altr/jord-client` exist.

## In scope

- CORS allow-list from env (default deny cross-origin)
- Per-route rate limits on **data** routes (`/records`, schema row routes, generated API, vectors, blobs). Auth routes keep the S0021-B limits
- Request body max (default 1 MiB JSON; blob routes use the storage cap)
- **Graceful shutdown** drains the write queue, then closes pools and realtime sockets
- Optional **`Idempotency-Key`** on writes (records, table API once mounted, blob finalize). Same key + same principal + same body returns the stored response. Same key + different body → 409. Needed by retrying bots. TTL on stored keys

## Out of scope

A public multi-tenant gateway · Redis rate-limit store (in-process is enough for one node)

## Definition of Done

- [x] Disallowed Origin does not get `Access-Control-Allow-Origin`
- [x] Body over the cap → 413
- [x] Shutdown test: queued write finishes; process does not exit mid-write
- [x] Idempotency replay test green
- [x] Note in `tech_space/jord/overview` and `writes`
