---
title: "Jord-S0014 — vectors / searchVectors (as-built)"
description: "jord_embeddings + Float32 LE cosine search; /vectors* REST; Studio Vectors panel"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - Jord-S0014
  - vectors
  - embeddings
---

# Jord-S0014 — vectors / searchVectors (as-built)

> Who: anyone extending embeddings. Plan: [[../../plan/Jord/Jord-S0014/README]]. Prior: [[12-s0013-blobs]].

## What shipped

| Layer | Change |
|-------|--------|
| `@altr/jord` | Table `jord_embeddings`; port `listVectorNamespaces` / `listEmbeddings` / `upsertEmbedding` / `deleteEmbedding` / `searchVectors`; Float32 LE pack + cosine rank (`vectors/f32.ts`, `vectors/search.ts`) |
| Dialects | LibSQL + Postgres store BLOB/BYTEA; **lab search** = in-process cosine (sqlite-vec / pgvector not required for green tests) |
| `@altr/jord-server` | `/vectors/*` routes; writes via write queue; `canWriteVectors` / `requireWriteVectors` |
| Studio | Nav **Vectors** → `/vectors`; BFF `/api/vectors/*`; Apolyx-only UI |

## Limits (v1)

| Limit | Value |
|-------|-------|
| Dims | 8–1536; fixed per namespace after first write (`dims_mismatch` → 409) |
| Search `limit` | default 10, max 50 |
| List per namespace | capped (`MAX_LIST_EMBEDDINGS` = 100) |
| Embed model | **Caller-supplied** floats (no OpenAI inside Jord) |

## HTTP

| Method | Path | Role |
|--------|------|------|
| `GET` | `/vectors/namespaces` | any authenticated |
| `GET` | `/vectors/:namespace` | any authenticated |
| `POST` | `/vectors/:namespace/search` | any authenticated (`{ embedding, limit? }`) |
| `PUT` | `/vectors/:namespace/:id` | `editor`+ (`{ embedding, ref_id?, metadata? }`) |
| `DELETE` | `/vectors/:namespace/:id` | `editor`+ |

## Verify

- `pnpm --filter @altr/jord test` — `vectors/f32.test.ts`, `vectors/embeddings.test.ts`
- `pnpm --filter @altr/jord-server test` — vectors upsert/search + readonly 403
- Manual: `dev:jord` + Studio → Vectors → upsert sample → search → ranked hits

## Not in this ship

Hosted embed APIs · hard sqlite-vec/pgvector deps · embedding CDC on realtime · namespace wipe admin API · Artemis retrieval product screens.
