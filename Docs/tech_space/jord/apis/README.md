---
title: "Jord — APIs"
description: "Generated records CRUD catalog, built-in function steps, and custom /x/:slug bindings"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - apis
---

# Jord — APIs

> Who: anyone exposing or disabling HTTP. Roles: [[../auth/README]]. Writes inside steps: [[../writes/README]].

## Why

Studio should show which HTTP exists and let an admin turn a surface off, without uploading JavaScript. Functions are ordered built-in steps. Custom APIs are a method + slug bound to a function.

## What

**Generated catalog** (in-process Map, seeded by `JORD_GENERATED_API_DISABLED`). Resource in the catalog today: `records`. Read: any authenticated role. Toggle: admin. Disabled calls return **503** `{ error: "api_disabled", resource }`. Schema routes are not in this catalog.

| Method | Path |
|--------|------|
| `GET` | `/apis/generated` and `/apis/generated/:resource` |
| `PATCH` | `/apis/generated/:resource` `{ enabled }` |

**Functions** persist in `jord_functions`. Steps: `echo`, `records_list`, `records_get`, `records_insert`, `records_count`. No `eval`. Invoke is editor+. Manage is admin. Delete returns **409** `has_dependents` while a custom API still points at the function.

| Method | Path |
|--------|------|
| `GET` / `POST` | `/functions` |
| `PATCH` / `DELETE` | `/functions/:id` |
| `POST` | `/functions/:id/invoke` |

**Custom APIs** persist in `jord_custom_apis`. Dispatch is `ALL /x/:slug`. Disabled → **503** `{ error: "api_disabled", kind: "custom", id }`. Optional seed: `JORD_CUSTOM_API_DISABLED`.

## How

| Piece | Path |
|-------|------|
| Generated registry | `cloud/jord/src/generated-api/` |
| Step runner | `cloud/jord/src/functions/` |
| Tables | `elements/jord/src/schema/functions.ts` |
| Studio | `/apis/generated`, Function APIs, Custom APIs |

Step writes call `enqueueWrite`. `records_*` steps use the same policy gate as HTTP.

## Example

Bind `POST /x/count-notes` to a function whose only step is `records_count`. An editor `POST /x/count-notes` runs the pipeline. A readonly token gets **403**. An admin toggle off returns **503** on the next call.

## Not in Jord yet

OpenAPI export, per-operation toggles, arbitrary SQL steps, user-uploaded code, a generated catalog per user table.
