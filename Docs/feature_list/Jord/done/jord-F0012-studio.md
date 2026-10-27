---
title: "jord-F0012 — studio"
feature_id: jord-F0012
description: "Shipped: Jord Studio control plane surfaces + phase-02 SQL editor / migrate wizard"
created: 2026-10-18
updated: 2026-10-27
tags:
  - feature
  - jord
  - done
  - studio
---

# jord-F0012 — studio

> Control plane. As-built: [[../../../tech_space/jord/studio/README]]. Package: `apps/jord-studio` (`@altr/apolyx` only).

## Rules

- Never opens `data/jord.db` or connection secrets in the browser.
- Table-editor UX (not “JSON document store”); `records.body` is text that often holds JSON.
- Talks to `@altr/jord-server` over HTTP (+ SSE/WS for live).

## Phase-01 surfaces (all Done)

| Surface | Plan |
|---------|------|
| Records browser + insert/edit | S0002–S0003 |
| Schema visualizer | S0004 · S0016 |
| Auth roles | S0005 → [[jord-F0005-auth]] |
| Generated CRUD / custom / functions UI | S0006–S0008 → [[jord-F0006-apis]] |
| Jobs / logs | S0007 → [[jord-F0007-jobs]] |
| Policies / triggers UI | S0009 → [[jord-F0008-policies]] |
| Connection labels (file / PG / Turso) | S0010 · S0019 → [[jord-F0002-dialects]] |
| Live / realtime UI | S0011 · S0018 → [[jord-F0009-realtime]] |
| Multi-table + CREATE TABLE | S0012 → [[jord-F0004-schema]] |
| Storage UI | S0013 → [[jord-F0010-blobs]] |
| Vectors UI | S0014 · S0020 → [[jord-F0011-vectors]] |

Archive: [[../../../plan/Jord/phase-01/README]].

## Studio tools (F6)

SQL editor (reads off queue; read-only pragma / `BEGIN READ ONLY`; writes queued; audit). **No URL editor** — labels + env restart docs. Migrate wizard type map; skip `jord_vix_*`; resumable; never delete source. Logs batched outside hot queue, redacted.

**Done**. Plan: [[../../../plan/Jord/phase-02/Jord-S0024/README|S0024]].
