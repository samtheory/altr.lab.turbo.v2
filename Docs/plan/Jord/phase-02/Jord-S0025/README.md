---
title: "Jord-S0025 — Storage v2 (S3 / R2 / MinIO)"
description: "Sign-time policy, pending/finalize GC, HMAC local URLs, local-to-S3 copy plan"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0025
  - phase-02
  - blobs
  - s3
---

# Jord-S0025 — Storage v2

> Who: **mimir**. **Status: planned.** **Execution #11.** Blocked by [[../Jord-S0024/README]]. Next in queue docs: [[../Jord-S0026/README]] (ADR only; no product dependency).

**Sprint id:** `Jord-S0025`  
**Hats:** **sindri** · **heimdall** · **docs_man**

## Goal

Same HTTP shape for local and S3. Policy is checked when the URL is signed, not only when it is later fetched.

## In scope

- `JordStoragePort`; keep `LocalStorageAdapter`; add `S3StorageAdapter` (`@aws-sdk/client-s3` — S3, R2, MinIO)
- **Policy check at sign time.** Short TTLs (default 15m, cap 1h)
- Lifecycle: object row is **`pending`**, client uploads, **`finalize`** promotes it. A GC job deletes stale pending rows and orphaned bytes
- **Local adapter issues HMAC-signed URLs** so clients use the same presign API as S3
- Multipart; configurable size limits
- Metadata stays in `jord_blobs`
- **Move plan (this sprint writes the steps and a dry-run command; switch is explicit):** copy local bytes to the bucket, verify checksums, then flip the adapter. Do not delete local bytes in the same step as the flip

## Out of scope

A hosted embed API · new native deps · automatic cutover without an operator flag

## Definition of Done

- [ ] Sign denied when policy denies, even if the object exists
- [ ] GC removes pending rows past TTL and unreferenced bytes
- [ ] Local HMAC URL and S3 presign share one client shape
- [ ] Copy/verify plan documented in `tech_space/jord/blobs`; local remains the default
- [ ] No secrets in Studio JSON
