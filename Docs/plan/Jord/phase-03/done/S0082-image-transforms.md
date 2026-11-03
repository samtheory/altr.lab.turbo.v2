---
title: "S0082 — image transforms (non-native)"
description: "Resize/format conversion at request time or on finalize, cached beside the original, without a native image binary in the server"
created: 2026-10-28
updated: 2026-11-03
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0082
  - done
---

# S0082 — image transforms (non-native)

> **Status:** **done** 2026-11-03 · **Depends on** [[S0081-multipart-uploads|S0081]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0018-storage-realtime-v2|jord-F0018]] · After ship: [[../../../../tech_space/jord/blobs/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **sindri** |
| **Companion skills** | `.agents/skills/graft/` · `.agents/skills/nodejs-backend-patterns/` |
| **Suggested model** | `gpt-5.6-sol-medium` |
| **Est. time** | **2–3 h** |
| **Parallel?** | **No** |

## Goal

Signed image URLs accept transform parameters (width, height, fit, quality, format) and return a transformed derivative, cached as a separate stored object keyed by the transform hash, generated **without** a native binary in the server (pure-JS or an isolated worker).

## Why now

`jord-F0018` lists transforms and invariant 7 requires non-native. Without them client apps ship their own thumbnailing.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../../feature_list/Jord/todo/jord-F0018-storage-realtime-v2|jord-F0018]] (image transforms, invariant 7) |
| Depends on | [[S0066-bucket-registry|S0066]] · [[S0081-multipart-uploads|S0081]] |
| Code today | `cloud/jord/src/storage/sign-policy.ts` · `blobs/routes.ts` |
| Constraints | no `sharp`-style native module in the server image; transforms must not run on the request thread for large images (or must be bounded) |

**Do not break:** signed-URL semantics (transform params must be inside the signature, not appended afterwards); original bytes never overwritten.

## In scope

- Transform param grammar + validation (max dimensions, allowed formats, quality range) included in the signature.
- Renderer: pure-JS resize (e.g. a WASM or JS decoder already acceptable in the repo) with a size/time cap; reject images above a pixel budget.
- Derivative storage: key `<original>.<hash>.<ext>`, pending → ready lifecycle reused, served with the same signed-URL rules.
- Cache hit path avoids re-encoding; miss path enqueues a bounded job and returns 202 or the derivative inline (pick one, document).
- Tests: same transform yields the same key; signed param tampering → 403; oversized image rejected.

## Out of scope

Video · AVIF/WebP fallback negotiation by `Accept` · CDN integration · on-the-fly text/watermark.

## Diagram

```mermaid
flowchart LR
  U["signed URL + ?w=320&fm=webp"] --> V{params signed?}
  V -->|no| E403[403]
  V --> K["key = original.<hash>"]
  K -->|hit| S[serve derivative]
  K -->|miss| R[render (bounded)] --> S
```

## Steps (do in order)

1. Read `sign-policy.ts`; extend the canonical string with transform params.
2. Implement validation + pixel budget.
3. Implement the renderer + derivative key + lifecycle.
4. Cache hit/miss paths; bounded job.
5. Tests for tampering, caching, oversize.
6. Typecheck + test; paste proof.
7. **docs_man**: blobs tech_space transforms; tick card.

## Done when

- [x] Transformed URL returns resized bytes and caches by key
- [x] Tampered transform params → 403 (tested)
- [x] Oversized image rejected with a clear error
- [x] No native image binary added
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-03 | `pnpm --filter @altr/jord-server test` (four cards + review fixes, one tree) | **347 passed** \| 22 skipped (44 files, 3 skipped) |
| 2026-11-03 | `pnpm --filter @altr/jord-server exec tsc --noEmit` / `@altr/jord` tsc | clean / clean |
| 2026-11-03 | `pnpm --filter @altr/jord test` | **138 passed** \| 12 skipped |
| 2026-11-03 | `pnpm --filter @altr/jord-client test` | **16 passed** |

## What shipped

| Piece | Fact |
|-------|------|
| URL | sign with `POST /blobs/:b/objects/:k/sign` `{intent:"download", transform:{w,h,fit,q,fm}}`; served from `/blobs/signed/:bucket/transform/:key?w&h&fit&q&fm&X-Jord-*` for local and S3 buckets. The signature covers the transform string, so any change = 403; a plain download signature cannot be reused on the transform route; unknown or out-of-range params = 400 |
| Renderer | pure JS: `jpeg-js@0.4.4` (BSD-3) + `pngjs@7.0.0` (MIT), no native binary, output jpeg or png only (no WebP/AVIF); runs in a `worker_thread` with a 15 s timeout, 2 concurrent renders, queue of 8 then 503; identical concurrent misses share one render |
| Limits | output side up to 4096 px, q 1..100, fit `cover` / `contain` / `fill`; source 20 MiB and 16 MP, 16-bit or interlaced PNG 8 MP, all checked from the header **before** decode; magic bytes sniffed (SVG or non-jpeg/png = 415, over budget = 413) |
| Cache | **inline** render on a miss (no 202): the derivative is stored as a separate object with the pending -> ready lifecycle and key `<original>.<sha256(params + original etag)[:16]>.<jpg|png>`; a hit never reads the original or re-renders (render count asserted); a paused bucket = 503 |
| Identity | derivatives are marked in the database (`derived_from`, `derived_src_etag`, migration `0027_blob_derivatives`), **never** recognised by key shape: a user file named like a derivative is never deleted, swept, or served as one. Writes onto a derivative row are refused with 409; if a user row occupies the derivative key the render is served with `X-Jord-Transform-Cache: bypass` and not stored |
| Lifecycle | deleting or overwriting the original removes its derivatives (best effort); `blobs_gc` sweeps derivatives whose original is gone or whose etag changed; blob keys now reject control characters (so a newline cannot shift the HMAC canonical string) |
| Serving | content type comes from the output format (never stored metadata), `nosniff`, inline; errors to clients are `render_failed` / `render_timeout` / `source_invalid` only; HEAD is answered from cache metadata (cached) or 405 (uncached) |

**Review (heimdall, opus):** three HIGH findings (GC deleting hash-named user files, an uploaded derivative-shaped key served with the uploader's content type, original-delete removing other objects) and a stale-derivative finding — all fixed by moving identity into the database and adding the etag to the hash; 8 regression tests.

**Known / follow-up:** derivatives appear in `GET /blobs/:bucket` listings; no bucket quota exists so derivatives are not counted against one; concurrency limits are per process; `contain` does no padding; a hash collision with a chosen user key could still race the claim (documented in code). New dependencies need the S0094 audit to cover them (no advisories checked beyond the lockfile audit).

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/blobs/README.md` |
| Queue | [[../README]] |
