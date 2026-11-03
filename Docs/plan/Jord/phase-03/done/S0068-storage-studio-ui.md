---
title: "S0068 — Studio bucket wizard, object browser and settings"
description: "Storage sidebar lists buckets with provider badges; wizard creates a bucket with a live connection test; detail view uploads, lists, previews, deletes and edits config"
created: 2026-10-28
updated: 2026-11-03
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0068
  - done
---

# S0068 — Studio bucket wizard, object browser and settings

> **Status:** **done** 2026-11-03 · **Depends on** [[S0067-bucket-config-api|S0067]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0029-storage-buckets|jord-F0029]] · After ship: [[../../../../tech_space/jord/studio/README#storage-buckets-s0066--s0067--s0068|Studio as-built]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/vercel-react-best-practices/` · `.agents/skills/web-design-guidelines/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **3 h** |
| **Parallel?** | **No** |

## Goal

The **Storage** section becomes bucket-centric: sidebar list with provider badge + object count, a New-bucket wizard in the inspector (provider → connection → test → save), and a bucket detail view with drag-and-drop upload (progress), object list (type/size/updated), preview, download, copy signed URL, delete, plus a settings tab for config, limits and credential rotation.

## What shipped

| Piece | Fact |
|-------|------|
| Sidebar | `StudioBucketsSidebar` (`buckets` contextual) — rows with provider badge, object count, paused badge, search, `?bucket=` selection; `New bucket` footer (admin). Non-admin 403 falls back to `GET /api/blobs/buckets` names with an `env` badge |
| Wizard | Inspector `create-bucket` (`?inspector=create-bucket`) — name + provider matrix → connection fields → write-only credentials → **Test connection** → **Create**. Save is gated on a fingerprint of the tested draft, so editing any field forces a re-test |
| Detail | `StoragePanel` — tags, object count/total size, drag-and-drop + picker upload with per-file XHR progress, search, key/type/size/updated table, image/PDF/text preview dialog, download, signed-URL copy with expiry banner, delete confirm |
| Settings | `BucketSettingsPanel` tab (admin) — provider/connection, path-style, max size MB, MIME allowlist, signed TTL, public read, linked table, pause/resume, test connection, credential rotation (probe first; old seals revoked) |
| BFF | `api/admin/buckets` (GET/POST) · `api/admin/buckets/[name]` (GET/PATCH) · `api/admin/buckets/[name]/[action]` (test/rotate/pause/resume) · `api/blobs/[bucket]/objects/[key]/sign` |
| Client model | `src/lib/bucket-admin.ts` — provider matrix, draft validation/serialization, test signature, JSON-or-text error reader, preview kind |
| Server errors | Upload and settings show the server reason (`413` size, `415` MIME, provider probe detail) via `parseErrorText`, not a generic toast |
| Apolyx | `Tabs`, `Progress`, `Dialog`, `AlertDialog`, `PasswordInput`, `Switch`, `Field`, `Alert` only — no local primitives |

## Done when

- [x] Sidebar shows buckets with provider badges (two providers come from `GET /admin/buckets`; env buckets fall back unchanged)
- [x] Wizard cannot save without a passing connection test (draft-signature gate)
- [x] Upload / download / preview / delete are wired through the existing blob routes
- [x] Size/MIME rejections show the server reason
- [x] Settings persist through `PATCH /admin/buckets/:name`; rotation uses the S0067 rotate probe
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-03 | `pnpm --filter @altr/jord-studio typecheck` | clean · exit 0 |
| 2026-11-03 | `pnpm --filter @altr/jord-studio build` | compiled · `/p/[project]/storage` 9.04 kB, 216 kB first load · exit 0 |

**Not run this session:** live browser drill plus a real MinIO/S3 bucket (needs `pnpm dev:jord`, a running provider and Studio login). The API side of that path is covered by the S0067 probe/rotation tests.

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` |
| Queue | [[../README]] |
