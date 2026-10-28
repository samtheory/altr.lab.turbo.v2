---
title: "jord-F0018 — storage and realtime v2"
feature_id: jord-F0018
description: "Multipart/resumable uploads, image transforms, MinIO CI, presence + broadcast"
created: 2026-10-25
updated: 2026-10-28
tags:
  - feature
  - jord
  - todo
  - jord-F0018
  - phase-03
---

# jord-F0018 — storage and realtime v2

> **Status:** todo · **Id:** `jord-F0018` (was P6) · Index: [[../INDEX]]

## What

Multipart + resumable uploads · image transforms (prefer non-native; invariant 7) · MinIO CI · realtime presence + broadcast with policy-gated join.

## Acceptance

1 GiB upload resumes after disconnect; MinIO CI job green.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0010-blobs\|jord-F0010]] | S3/MinIO already exist — extend, do not replace |
| [[../done/jord-F0009-realtime\|jord-F0009]] | Presence/broadcast on top of CDC/SSE |

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/S0081-multipart-uploads\|S0081]] — multipart + resumable uploads | 3 h | todo |
| [[../../../plan/Jord/phase-03/S0082-image-transforms\|S0082]] — image transforms | 2–3 h | todo |
| [[../../../plan/Jord/phase-03/S0083-presence-broadcast\|S0083]] — presence + broadcast | 3 h | todo |

Queue: [[../../../plan/Jord/phase-03/README]].
