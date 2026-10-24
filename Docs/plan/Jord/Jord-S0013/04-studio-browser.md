---
title: "Phase 4 — Studio blob buckets UI"
description: "Storage nav, bucket list, upload, object table, download — Apolyx-first"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0013
  - blobs
  - studio
  - apollo
---

# Phase 4 — Studio blob buckets UI

> Who: **mimir → apollo**. Apolyx-first; missing kit control → build in `@altr/apolyx` first.

Sprint index: [[README]] · Server: [[03-server-routes]]

## Status

**done** (2026-10-24)

## Goal

Operators browse buckets and objects in Jord Studio without leaving the control plane.

## Work

| Piece | Notes |
|-------|--------|
| Nav | Add **Storage** (or **Blobs**) under Database / side nav — one clear entry |
| Buckets | List + create bucket form (`admin`) |
| Objects | Table: key, content type, size, updated; empty/error states |
| Upload | File picker + upload action (`editor`+); show progress if cheap |
| Download | Link or button that hits BFF download |
| Delete | Confirm + delete (`editor`+) |
| Components | Compose `@altr/apolyx` only — Button, Input, Table/list primitives, Dialog if needed |

### UX notes

- One job per view: bucket list **or** objects in one bucket (drill-in).
- Do not invent a second “media CDN” story; label as **local lab blobs**.
- Never teach operators that files live in `records.body`.

## Done when

- [x] With `dev:jord` + Studio up, operator can create bucket → upload → see row → download → delete
- [x] No Radix / local kit forks in `apps/jord-studio`
- [x] `readonly` can list/download; cannot create bucket / upload / delete (wired in [[05-role-gates]])
