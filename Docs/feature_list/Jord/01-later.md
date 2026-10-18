---
title: "Jord — later slices"
description: "Order after Jord-S0001: Studio phases, hosted libSQL, Postgres, vectors, jobs, auth"
created: 2026-10-18
updated: 2026-10-18
tags:
  - feature
  - jord
  - database
---

# Jord — later slices

> After [[00-intent]]. Studio detail: [[03-jord-studio]]. Dialects: [[02-architecture]].

## Engine slices

| Slice | Outcome | Starts when |
|-------|---------|-------------|
| Hosted libSQL | `DATABASE_URL=libsql://…` with the same Drizzle schema | The file should leave one laptop |
| Artemis agent scratchpad | Writer uses bucket `artemis` on `records` (not typed `orders` / `positions`) | The bot has a scratchpad payload shape |
| Vectors | `sqlite-vec` on `data/jord.db` via a dialect adapter | Bot retrieval needs search |
| Postgres driver | Same table schema, `postgres://` accepted. Plugins via Postgres adapters | A product needs a Postgres plugin or SLA |
| Cache | One Redis-compatible store, measured choice | Live state or leaderboards exist |
| Bot process | Second cloud package only if the Jord server should not run the model | In-process writer is the wrong shape |

## Jord Studio slices

Named in [[03-jord-studio]]. Summary:

| Slice | Outcome |
|-------|---------|
| Studio S1 | `apps/jord-studio` lists `records` |
| Studio S2 | Schema visualizer + live save |
| Studio S3 | Auth + roles |
| Studio S4 | Generated CRUD API panel |
| Studio S5 | Jobs / cron + logs |
| Studio S6 | Custom APIs + function APIs |
| Studio S7 | Triggers, policies, dialect-aware functions |
| Studio S8 | Postgres connection in Studio |

S0001 is one file and one server. The first Studio plan opens only after that acceptance list is true.
