---
title: "jord-F0010 — blobs"
feature_id: jord-F0010
description: "Shipped: local buckets + S3/R2/MinIO adapter, sign-time policy, pending/finalize/GC"
created: 2026-10-24
updated: 2026-10-27
tags:
  - feature
  - jord
  - done
  - blobs
---

# jord-F0010 — blobs

> Object storage. As-built: [[../../../tech_space/jord/blobs/README]]. Multipart / resumable / transforms → [[../INDEX|P6]].

## Phase-01

Local buckets under `data/blobs/` + metadata — **Done** (S0013).

## Storage adapter (F7)

S3/R2/MinIO via env; local HMAC-signed URLs match S3 shape; policy at **sign time**, short TTL; pending → finalize → GC; copy/verify/switch for existing local bytes (no silent delete). MinIO live exercised in phase-02.75 C1.

**Done**. Plan: [[../../../plan/Jord/phase-02/Jord-S0025/README|S0025]] · [[../../../plan/Jord/phase-02.75/README|02.75 C1]].
