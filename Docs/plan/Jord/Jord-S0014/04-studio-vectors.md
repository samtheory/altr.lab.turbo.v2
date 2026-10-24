---
title: "Phase 4 — Studio Vectors UI"
description: "Nav + panel: namespaces, upsert, search results — Apolyx-first"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0014
  - vectors
  - studio
  - apollo
---

# Phase 4 — Studio Vectors UI

> Who: **mimir → apollo**.

Sprint: [[README]]

## Status

**done** (2026-10-24)

## Work

| Piece | Notes |
|-------|--------|
| Nav | **Vectors** under Data (or Database) |
| Panel | Namespace picker/create; list embeddings meta; form: id + JSON float array upsert; search box (paste query vector) + results table (id, score, ref_id) |
| Copy | Label as **local lab vectors** — operators supply embeddings; Jord does not call OpenAI |
| Kit | `@altr/apolyx` only |

## Done when

- [ ] Operator can upsert + search from Studio without opening the DB file
- [ ] No local kit forks
