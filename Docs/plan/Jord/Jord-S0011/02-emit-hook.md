---
title: "Phase 2 — write-path emit hook"
description: "Publish jord.change after successful enqueueWrite mutations"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0011
  - sindri
  - realtime
---

# Phase 2 — write-path emit hook

> Who: **sindri**. Depends on [[01-realtime-contract]].

Sprint index: [[README]]

## Status

**done** (2026-10-24)

## Goal

After a successful `records` insert/update/delete on the server write queue, publish one in-process event matching the contract. Works for both libSQL and Postgres (emit is dialect-agnostic).

## Approach

- Small pub/sub (or EventEmitter) owned by `@altr/jord-server`
- Call sites: existing mutate handlers only (no second writer)
- Failures on emit must not roll back a committed write (log + continue)

## Done when

- [ ] Successful mutate → at least one subscriber-visible event in unit/integration test
- [ ] Failed mutate / 409 → **no** change event
- [ ] Both dialects covered when Postgres test URL is set; default suite stays file:-only
