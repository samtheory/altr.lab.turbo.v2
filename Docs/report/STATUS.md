---
title: "Status — complete vs remaining"
description: "Audited snapshot: Jord-S0001–S0013 shipped; next vectors or Artemis"
created: 2026-09-19
updated: 2026-10-24
tags:
  - report
  - status
  - Apolyx-S0005
  - Jord-S0001
  - Jord-S0002
  - Jord-S0003
  - Jord-S0004
  - Jord-S0005
  - Jord-S0006
  - Jord-S0007
  - Jord-S0008
  - Jord-S0009
  - Jord-S0010
  - Jord-S0011
  - Jord-S0012
  - Jord-S0013
---

# Status

Last updated: 2026-10-24 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **Jord-S0013** (blob buckets) · **Active Jord sprint:** none · Sequence: [[../plan/00-roadmap-apolyx-jord-artemis]]

## Implemented

- **Jord Slice 0 (`Jord-S0001`)** — [[../tech_space/jord/00-s0001-slice0]]
- **Jord Studio S1–S9 + multi-table** — through [[../tech_space/jord/11-s0012-multi-table]]
- **Jord-S0013 (Studio S10 blobs)** — [[../tech_space/jord/12-s0013-blobs]]
  - `jord_blobs` metadata + `data/blobs/` bytes
  - S3-shaped `/blobs*` on jord-server (10 MiB cap; write queue)
  - Studio **Storage** browser (Apolyx-first); roles `canManageBlobs` / `canWriteBlobs`
- **`@altr/apolyx`** through **S0005** · Apolyx-first · docs_man / apollo / mimir

## Planned (repo) — **do next**

1. **Vector ops UI** (Studio S11) — plan not opened · [[../feature_list/Jord/03-jord-studio]]
2. Engine later: hosted `libsql://`, `pgvector` / native RLS, Redis, bot process · [[../feature_list/Jord/01-later]]
3. Artemis — idea [[../idea/artemis/README]] (product fork)
4. Tia — intent [[../feature_list/tia/README]]
5. CI pipeline

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
