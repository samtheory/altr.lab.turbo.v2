---
title: "S0067 — bucket config API, encrypted credentials, test connection"
description: "Admin endpoints to configure a bucket per provider, store credentials encrypted, and verify a connection before saving anything"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0067
  - done
---

# S0067 — bucket config API, encrypted credentials, test connection

> **Status:** **done** 2026-11-02 · **Depends on** [[S0066-bucket-registry|S0066]] + [[S0042-control-plane-store-adr|S0042]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0029-storage-buckets|jord-F0029]] · After ship: [[../../../../tech_space/jord/blobs/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **sindri** (routes) + **saga** (credential storage) · **heimdall** reviews the secret surface |
| **Companion skills** | `.agents/skills/graft/` · `.agents/skills/hono-typescript/` · `.agents/skills/security-and-hardening/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** |

## Goal

`/admin/buckets` CRUD: create/update bucket config per provider (endpoint, region, physical bucket, prefix, path-style), write-only credentials via the control-plane secret store, a **test connection** that saves nothing on failure, credential rotation, and pause/resume. No secret ever appears in a response.

## What shipped

| Piece | Fact |
|-------|------|
| Admin HTTP | `GET/POST /admin/buckets`, `GET/PATCH /admin/buckets/:name`, `POST …/test|rotate|pause|resume` |
| Validation | Provider matrix (endpoint for minio/compatible; region+physical for s3/r2; r2 needs endpoint; path-style default for minio) |
| Credentials | Write-only → AES-GCM `SecretPort`; sealed columns on `jord_buckets`; responses use `configured` + access-key prefix/last4 only |
| Probe | put → head → delete (or injectable test probe); failed create/test writes **no** row; failed rotate keeps old seals |
| Resolve | `createBucketResolver` unseals row credentials when present (env fallback unchanged) |
| Tests | Failed test → no row; serialized-body secret assertion; rotation revokes old seals; pause/resume; non-admin 403 |

## Done when

- [x] CRUD + test + rotate + pause work for all five providers
- [x] Failed test saves nothing
- [x] Serialized responses contain no credential material (asserted)
- [x] Old credentials fail immediately after rotation
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord-server test` | **188 passed** \| 20 skipped (30 files + 1 skipped) |
| 2026-11-02 | `pnpm --filter @altr/jord-server exec tsc --noEmit` | clean |
| 2026-11-02 | `pnpm --filter @altr/jord exec tsc --noEmit` | clean |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/blobs/README.md` |
| Queue | [[../README]] |
