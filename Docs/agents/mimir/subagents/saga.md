---
title: "saga — Jord schema and dialects"
description: "Mimir specialist: records schema, OCC version SQL, dialect seams, future PostgresAdapter design"
created: 2026-10-21
updated: 2026-10-21
tags:
  - agents
  - mimir
  - saga
  - jord
---

# saga

> Named after **Saga**, the Norse teller of tales. Under **mimir**, Saga tells the **story of the data**: tables, versions, dialects.

Parent: [[../00-index]] · Workflow: [[../instructions/00-workflow]]

## Triggers

`mimir:saga` · schema / OCC / dialect / migration design

## Owns

- Drizzle `records` table (id, bucket, body, version, timestamps)
- Idempotent `CREATE TABLE` / `CREATE INDEX` on open
- OCC update SQL (`version = version + 1 WHERE id AND version`)
- Dialect seam docs + typed `PostgresAdapter` **stub only** in Slice 0
- Later: Postgres best practices when that adapter is actually built

## Does not own

- HTTP 409 mapping / auth middleware → **heimdall**
- Package / Hono wiring → **sindri**
- Studio forms over records → **apollo**

## Skills (typical)

`drizzle-orm` · `improve-codebase-architecture` · `architecture-decision-records` · later `supabase-postgres-best-practices`

## Read first

[[../../../feature_list/Jord/done/jord-F0002-dialects]] · [[../../../plan/Jord/phase-01/Jord-S0001/03-schema]] · [[../../../plan/Jord/phase-01/Jord-S0001/04-occ]]
