---
title: "S0082 — image transforms (non-native)"
description: "Resize/format conversion at request time or on finalize, cached beside the original, without a native image binary in the server"
created: 2026-10-28
updated: 2026-10-28
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0082
---

# S0082 — image transforms (non-native)

> **Status:** todo · **Depends on** [[S0081-multipart-uploads|S0081]] · **Phase:** [[README]] · Parent: [[../../../feature_list/Jord/todo/jord-F0018-storage-realtime-v2|jord-F0018]] · After ship: [[../../../tech_space/jord/blobs/README]]

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
| Intent | [[../../../feature_list/Jord/todo/jord-F0018-storage-realtime-v2|jord-F0018]] (image transforms, invariant 7) |
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

- [ ] Transformed URL returns resized bytes and caches by key
- [ ] Tampered transform params → 403 (tested)
- [ ] Oversized image rejected with a clear error
- [ ] No native image binary added
- [ ] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| | `pnpm --filter @altr/jord-server test` | |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/blobs/README.md` |
| Queue | [[README]] |
