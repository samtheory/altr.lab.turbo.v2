---
title: "Jord — phase-02 candidates"
description: "Unshipped Jord intent only — promote into plan/Jord/phase-02 when a product need opens a sprint"
created: 2026-10-18
updated: 2026-10-24
tags:
  - feature
  - jord
  - phase-02
  - backlog
---

# Jord — phase-02 candidates

> After phase-01 ([[04-phase-01-capabilities]]). Architecture: [[02-architecture]]. Studio: [[03-jord-studio]]. Plan queue: [[../../plan/Jord/phase-02/README]]. Seed backlog: [[../../plan/Jord/phase-02/00-remaining-backlog]].

**Only unshipped rows live here.** Shipped phase-01 work is inventoried in [[04-phase-01-capabilities]] and archived under [[../../plan/Jord/phase-01/README]].

## Engine / infra candidates

| Candidate | Outcome | Promote when |
|-----------|---------|--------------|
| Artemis agent scratchpad | Writer uses bucket `artemis` on `records` via `@altr/jord-server` (not typed `orders` / `positions`) | Bot has a scratchpad payload shape |
| Redis-compatible cache | One measured cache for live state / leaderboards | Live state needs it |
| Bot / second cloud process | Separate process if in-process writer is the wrong shape | Model / writer must leave jord-server |
| Remote blob store | Multipart, larger limits, S3 / SigV4 | Local disk is no longer enough |
| Hosted embed API · embedding CDC | Jord (or a sidecar) produces embeddings; optional CDC | Callers should not supply floats |
| True CDC hooks | SQLite update hooks / Postgres `LISTEN` | Write-path emit is not enough |

## Studio / dialect carryovers (from closed ships)

These were deferred inside phase-01 cards — still not sprints until promoted:

| Carryover | From |
|-----------|------|
| Native SQL triggers on Postgres; column-level policies | S0009 |
| Studio URL editor; migrate file→Postgres wizard | S0010 |
| OCC editor for arbitrary tables | S0012 |
| Full remote object store; blob CDC | S0013 |
| Non-`records` RLS; drop middleware on Postgres | S0017 |
| Embedded replicas; file→Turso wizard; Studio paste-URL UI | S0019 |

## Explicitly not Jord phase-02 cards

| Item | Home |
|------|------|
| Artemis trading domain / terminal | [[../../idea/artemis/README]] |
| Tia map engine | [[../tia/README]] |
| Apolyx kit carryovers | [[../ui-kit/01-apolyx-s0001-carryovers]] |
| CI / npm publish | Lab infra |

## Rule

Do **not** invent sprint ids here. When the next report lands, promote one candidate into `Docs/plan/Jord/phase-02/<sprint>/` and leave this list as intent only.
