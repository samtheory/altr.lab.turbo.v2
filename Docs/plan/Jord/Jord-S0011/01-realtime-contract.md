---
title: "Phase 1 — realtime contract"
description: "Event shape, channels, SSE auth, dialect notes — lock before code"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0011
  - realtime
  - contract
---

# Phase 1 — realtime contract

> Who: **mimir** (scope) · **heimdall** (auth on stream). Engine and Studio implement against this note.

Sprint index: [[README]] · Intent S9: [[../../../feature_list/Jord/03-jord-studio]] · Pillar: [[../../../feature_list/Jord/01-later]]

## Status

**done** (2026-10-24)

## Goal

Define what a “change” is, who may listen, and how SSE carries it — without inventing a second write path.

## Model (v1)

| Piece | Choice |
|-------|--------|
| Source of truth | Emits **after** a successful mutation already on the write queue (CDC-*equivalent*, not raw DB hooks) |
| Channel | Table name, v1 required: `"records"` (reject others with clear error; leave seam) |
| Ops | `insert` \| `update` \| `delete` |
| Transport | SSE only (`GET` stream) |
| Auth | Same session / bearer as other Studio routes; reject anonymous when auth is on |
| Filter | Optional `id` query for single-row; default = whole table |

### Event payload (JSON)

| Field | Notes |
|-------|-------|
| `type` | `"jord.change"` |
| `table` | `"records"` |
| `op` | `insert` \| `update` \| `delete` |
| `id` | Record id when known |
| `version` | New version after OCC write (omit on delete if gone) |
| `at` | Server ms timestamp |
| `dialect` | `"libsql"` \| `"postgres"` (informational) |

**Never** send: connection strings, passwords, full `body` by default (opt-in later if needed; keep payload small).

## Safety

| Rule | Choice |
|------|--------|
| Hot writes | Still only via `enqueueWrite` |
| Browser DB | Never open `data/jord.db` |
| Fanout | In-process on `@altr/jord-server` only (no Redis this sprint) |
| Backpressure | Document max clients / drop-oldest or close with 503 when over limit |

## Done when

- [ ] This contract is agreed (no open “SSE vs WS” debate for v1)
- [ ] Payload + channel + auth rules written above are the implementer checklist
- [ ] Out-of-sprint items listed on [[README]] stay out
