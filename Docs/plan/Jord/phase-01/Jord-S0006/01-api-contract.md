---
title: "Phase 1 — generated API contract"
description: "Catalog shape, toggle semantics, HTTP status, and S4 scope before code"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0006
  - generated-api
---

# Phase 1 — generated API contract

> Who: **mimir** (scope) · **heimdall** (auth / disable status). Studio and server implement against this note.

Sprint index: [[README]] · Intent: [[../../../../feature_list/Jord/03-jord-studio]] · Auth: [[../../../../tech_space/jord/auth]]

## Status

**done** (2026-10-21) — disable status locked to **503**

## What “generated” means in S4

Jord does **not** invent a second database. Generated API = the **stable HTTP CRUD** jord-server already exposes for product tables, described in a catalog and controllable from Studio.

| Layer | Truth |
|-------|--------|
| Storage | Still libSQL `file:` / `records` (+ schema introspect from S2) |
| CRUD home | `@altr/jord-server` routes (today under `/records`) |
| Catalog | JSON descriptor: resource id, table, enabled flag, operations[] |
| Toggle | Process-local registry (Map / module state) seeded from env; **not** a SQL table in S4 |
| Custom routes | Out of sprint (S6) |

## Resources in scope

| Resource id | Table | Notes |
|-------------|-------|-------|
| `records` | `records` | Only resource required for S4 acceptance |

Future tables that gain first-class CRUD can join the same catalog shape later without a sprint rename.

## Catalog operation shape (proposed)

Each operation documents:

| Field | Example |
|-------|---------|
| `method` | `GET` / `POST` / `PATCH` / `DELETE` |
| `path` | `/records`, `/records/:id` |
| `summary` | Short label |
| `auth` | `read` \| `write` (maps to S3 capabilities) |
| `query` / `params` / `body` | Human + machine hints for Studio try-it |

## Toggle semantics

| Actor | May |
|-------|-----|
| Any authenticated role | `GET` catalog |
| `admin` only | Enable / disable a resource |
| `editor` / `readonly` | Inspect only; toggle → **403** |

When a resource is **disabled**:

| Decision | Pick in this card before implement |
|----------|-------------------------------------|
| Status | Prefer **503** with `{ error: "api_disabled", resource }` (clearer than 404 for operators) |
| Health | `GET /health` stays public and unaffected |
| Schema routes | **Not** part of generated CRUD catalog; schema stays always-on for Studio |

## Env (lab)

| Var | Role |
|-----|------|
| Existing `JORD_SERVER_TOKEN` / session | Unchanged from S3 |
| Optional `JORD_GENERATED_API_DISABLED` | Comma-separated resource ids disabled at boot (e.g. `records`) |

## Out of contract

- Per-operation toggles (resource-level only in S4)
- Public anonymous CRUD
- OpenAPI 3 file download (defer unless trivial)

## Tasks

- [x] Lock disable HTTP status (**503**)
- [x] Lock catalog route paths (see [[02-server-catalog]])
- [x] Confirm DELETE is in-scope for “CRUD” ([[03-records-delete]])

## Done when

Implementers can code catalog + Studio panel without inventing a second auth model or a Mongo-style document API.

