---
title: "Phase 2 — jord-server generated API catalog"
description: "GET catalog + PATCH enable/disable; guard disabled CRUD"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0006
---

# Phase 2 — jord-server generated API catalog

> Who: **sindri**. Heimdall: admin-only toggle; disabled → status from [[01-api-contract]].

Sprint index: [[README]]

## Status

**done** (2026-10-21)

## Routes (proposed)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/apis/generated` | Any authenticated | Full catalog JSON |
| `GET` | `/apis/generated/:resource` | Any authenticated | One resource or 404 |
| `PATCH` | `/apis/generated/:resource` | **admin** | Body `{ enabled: boolean }` |

Protect under the same middleware as `/records` and `/schema`.

## Registry

- Module-level Map: `resourceId → { enabled: boolean }`
- Seed from optional env (see contract)
- CRUD handlers for `records` check `enabled` **before** queue / DB work

## Catalog payload (sketch)

```json
{
  "resources": [
    {
      "id": "records",
      "table": "records",
      "enabled": true,
      "operations": [
        { "method": "GET", "path": "/records", "auth": "read", "summary": "List by bucket" },
        { "method": "POST", "path": "/records", "auth": "write", "summary": "Insert row" },
        { "method": "GET", "path": "/records/:id", "auth": "read", "summary": "Get by id" },
        { "method": "PATCH", "path": "/records/:id", "auth": "write", "summary": "OCC update" },
        { "method": "DELETE", "path": "/records/:id", "auth": "write", "summary": "Delete row" }
      ]
    }
  ]
}
```

Path strings are relative to jord-server origin (Studio BFF documents the proxy prefix).

## Tasks

- [x] Registry module + env seed
- [x] Catalog GET routes + tests
- [x] Admin PATCH + 403 for non-admin
- [x] Wire disable guard into existing `/records*` handlers

## Done when

With `dev:jord` up, authenticated curl lists `records` ops; admin can disable and list/insert returns the contracted disabled status.
