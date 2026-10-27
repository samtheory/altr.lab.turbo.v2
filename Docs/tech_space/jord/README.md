---
title: "tech_space/jord — system manual"
description: "Living as-built categories for Jord: why, what, how. Update a category when code changes; do not add sprint folders"
created: 2026-10-24
updated: 2026-10-27
tags:
  - tech-space
  - jord
  - readme
---

# tech_space / jord

> **The Jord system manual.** Open one category. Sprint history stays in [[../../plan/Jord/phase-01/README]]. Intent inventory: [[../../feature_list/Jord/done/README]] · open [[../../feature_list/Jord/INDEX]]. Code wins if this folder disagrees.

When something ships, **edit the category** (or add a note inside that category). Do not create `phase-NN/` or `s00xx` files here.

## Categories

| Open this | When you need |
|-----------|----------------|
| [[overview/README]] | Packages, boot, **migration runner**, request path, invariants, **CI** (`.github/workflows/jord.yml`) |
| [[dialects/README]] | `file:` / `libsql://` / `postgres://`, WAL, health |
| [[writes/README]] | Write queue, OCC `records`, user-table row writes |
| [[schema/README]] | Introspect, CREATE, ADD, DROP, RENAME, type change |
| [[auth/README]] | Principals, HMAC operators, JWT, scrypt, route matrix |
| [[apis/README]] | Generated CRUD, function steps, `/x/:slug`, `/api/v1` table API, [[apis/ADR-functions-v2\|Functions v2 ADR]] |
| [[jobs/README]] | Scheduler, built-in kinds, log ring |
| [[policies/README]] | Deny-overrides, user/anon default-deny, `jord_app`, Postgres RLS |
| [[realtime/README]] | Outbox CDC, SSE / WebSocket, `since` resume |
| [[blobs/README]] | Local HMAC + S3/R2/MinIO, sign-time policy, pending/finalize/GC |
| [[vectors/README]] | Embeddings, cosine, libSQL engine, pgvector |
| [[studio/README]] | Control plane, BFF, nav, Apolyx-only |

## How a category note is shaped

1. **Why** — the constraint this part exists to satisfy
2. **What** — current contract (tables, HTTP, roles)
3. **How** — code paths (`elements/jord`, `cloud/jord`, `apps/jord-studio`)
4. **Example** — one concrete call or sequence
5. **Not in Jord yet** — so the next change has a home

Plans: [[../../plan/Jord/README]]. Review: [[../../report/Jord-implemented-review]].
