---
title: "Jord-S0013 — Studio S10 blob buckets"
description: "Done: local blob storage on disk + metadata in Jord; Studio browser/upload via jord-server"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0013
  - jord-studio
  - sprint
  - blobs
  - storage
---

# Jord-S0013 — Studio S10 blob buckets

> Who: **mimir**. **Status: done (2026-10-24).** Intent S10: [[../../../../feature_list/Jord/done/jord-F0012-studio]]. Pillar: [[../../../../feature_list/Jord/INDEX]]. Prior: [[../Jord-S0012/README]]. As-built: [[../../../../tech_space/jord/blobs]].

**Sprint id:** `Jord-S0013`  
**Opened:** 2026-10-24 · **Closed:** 2026-10-24 · **Owner:** mimir  
**Hats:** **sindri** · **saga** · **heimdall** · **apollo** · **docs_man**

## Why this next

S0001–S0012 closed the engine + Studio control plane through multi-table. The next Supabase-parity pillar was **local blob storage**.

## Design lock (v1)

| Piece | Choice |
|-------|--------|
| Bytes | Files on disk under `data/blobs/<bucket>/<key…>` (gitignored) |
| Metadata | Table `jord_blobs` in the active dialect (libSQL + Postgres) |
| API shape | S3-*shaped* REST on `@altr/jord-server` — **not** full S3/MinIO compatibility |
| Writes | Metadata + bytes via the single write queue |
| Browser | Never opens `data/` — Studio talks BFF → jord-server only |

## Phases

| # | Card | Hat | Status |
|---|------|-----|--------|
| 1 | [[01-contract]] | mimir / heimdall | **done** |
| 2 | [[02-engine-store]] | saga / sindri | **done** |
| 3 | [[03-server-routes]] | sindri / heimdall | **done** |
| 4 | [[04-studio-browser]] | apollo | **done** |
| 5 | [[05-role-gates]] | heimdall / apollo | **done** |
| 6 | [[06-verify]] | mimir → docs_man | **done** |

## Definition of done

- [x] Every card's "Done when" holds
- [x] Operator can create/list a bucket, upload a file, list objects, download, and delete via Studio
- [x] Bytes live under `data/blobs/`; metadata in `jord_blobs`; both dialects supported for metadata
- [x] Role gates: manage buckets = `admin`; upload/delete = write-capable; list/download = read
- [x] Browser never opens `data/jord.db` or blob paths
- [x] No kit primitives invented in `apps/jord-studio` (Apolyx-first)
- [x] Tests + typecheck green (`@altr/jord`, `@altr/jord-server`); as-built `Docs/tech_space/jord/blobs/README.md`
- [x] STATUS / plan / feature_list / brain refreshed; sprint marked done

## Explicitly out of this sprint

- Full S3 API / SigV4 / multipart / presigned URLs
- CDN, image transforms, virus scan
- Remote object backends (S3, R2, GCS) — local disk only
- Vectors (S11) / hosted `libsql://` / `pgvector`
- Blob CDC on realtime bus (optional follow-up)
- Artemis trading screens / product media pipeline

## Links

- Track: [[../README]]
- Intent: [[../../../../feature_list/Jord/done/jord-F0012-studio]] · Later: [[../../../../feature_list/Jord/INDEX]]
- Roadmap: [[../../../00-roadmap-apolyx-jord-artemis]]
- Status: [[../../../../report/STATUS]]
