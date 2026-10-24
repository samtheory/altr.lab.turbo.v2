---
title: "Phase 3 — SSE endpoint"
description: "GET stream on jord-server; fanout from emit hook; auth + filters"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0011
  - sindri
  - sse
---

# Phase 3 — SSE endpoint

> Who: **sindri**. Depends on [[02-emit-hook]].

Sprint index: [[README]] · Auth as-built: [[../../../../tech_space/jord/auth]]

## Status

**done** (2026-10-24)

## Goal

Expose an authenticated SSE route (exact path locked in phase 1 / code) that:

1. Validates session / role
2. Filters by `table` (+ optional `id`)
3. Streams `jord.change` events until the client disconnects
4. Sends periodic heartbeat comments so proxies do not idle-kill the stream

## Done when

- [ ] `curl`-able (or test) SSE stream receives events after a mutate
- [ ] Unauthenticated / under-privileged callers get 401/403 (same pattern as other Studio routes)
- [ ] Disconnect cleans up the subscriber (no leak in a short soak test)
- [ ] `/health` still healthy; no connection string in stream or health
