---
title: "S0066 — jord_buckets registry + per-bucket provider resolution"
description: "Buckets become rows with their own provider; storage resolution builds a port per bucket, env backend stays the default"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0066
  - done
---

# S0066 — jord_buckets registry + per-bucket provider resolution

> **Status:** **done** 2026-11-02 · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0029-storage-buckets|jord-F0029]] · After ship: [[../../../../tech_space/jord/blobs/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **saga** (table + migration) + **sindri** (resolution wiring) |
| **Companion skills** | `.agents/skills/supabase-postgres-best-practices/` · `.agents/skills/graft/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** — S0067/S0068 depend on this shape |

## Goal

A `jord_buckets` table holds name/slug, provider (`local` · `s3` · `r2` · `minio` · `s3-compatible`), connection fields, limits (max size, MIME allowlist, TTL), access defaults, status and optional linked table. The storage layer resolves a **port per bucket**, falling back to the env backend for buckets with no explicit provider.

## What shipped

| Piece | Fact |
|-------|------|
| Migration | `0015_buckets_registry` (libSQL + Postgres) → `jord_buckets` |
| Schema | `elements/jord/src/schema/buckets.ts` (`jordBuckets`, providers, statuses) |
| Registry | `cloud/jord/src/storage/bucket-registry.ts` — get/list/materialize, limits from row |
| Resolver | `createBucketResolver` — env fallback, port cache keyed by provider+endpoint+physical+creds fingerprint |
| Limits | Size / MIME / TTL enforced at PUT + sign (+ signed local PUT); TTL still hard-capped at 1 h |
| Routes | Blob + signed routes call `resolveBucket`; `POST /blobs/buckets` materializes env-default row |
| GC | `blobs_gc` resolves storage per pending bucket |
| Tests | Mixed local+s3 memory ports; env-only orphan; limits + cache reuse; materialize |

## Done when

- [x] Two buckets with different providers serve upload/download/delete in one test
- [x] A bucket with no row still uses the env backend unchanged
- [x] Size/MIME/TTL limits come from the bucket row
- [x] Port cache does not leak or re-authenticate per request
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord-server test` | **178 passed** \| 20 skipped (29 files + 1 skipped) |
| 2026-11-02 | `pnpm --filter @altr/jord-server exec tsc --noEmit` | clean |
| 2026-11-02 | `pnpm --filter @altr/jord exec tsc --noEmit` | clean |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/blobs/README.md` |
| Queue | [[../README]] |
