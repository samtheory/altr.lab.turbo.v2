---
title: "jord-F0017 — table API v2"
feature_id: jord-F0017
description: "FK embeds with per-table policies, keyset pagination, bulk upsert, RPC"
created: 2026-10-25
updated: 2026-10-27
tags:
  - feature
  - jord
  - todo
  - jord-F0017
  - phase-03
---

# jord-F0017 — table API v2

> **Status:** todo · **Id:** `jord-F0017` (was P5) · Index: [[../INDEX]]

## What

One-level FK embeds (`select=*,author(*)`) with policies per embedded table · cursor (keyset) pagination · bulk insert/upsert with per-row results · RPC to registered server functions.

## Acceptance

Embed never returns a row the caller could not read directly; keyset paging stable under concurrent inserts.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0006-apis\|jord-F0006]] | F4 has no embeds today |
| [[../done/jord-F0008-policies\|jord-F0008]] | Must apply per embedded table |
