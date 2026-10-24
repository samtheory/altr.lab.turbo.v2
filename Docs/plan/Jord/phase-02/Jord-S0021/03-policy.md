---
title: "S0021 Part C — unified policy model"
description: "owner_eq / claim_eq; server WHERE injection; Postgres set_config in-transaction only"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0021
  - policies
---

# Part C — unified policy model

> Sprint: [[README]]. **After Part B only. Stop for review.** Hardest part of S0021.

## Status

**planned** (blocked on Part B)

## Lock

| Piece | Choice |
|-------|--------|
| New AST | `owner_eq(column)` → row column == `auth.uid()`; `claim_eq` |
| Enforcement | Server is single point: compile to parameterized `WHERE` on select/update/delete; check insert; force owner column when configured |
| Postgres | Also compile RLS as defense in depth; `set_config('jord.uid', $1, true)` **inside the transaction only** — never on pooled connection outside a tx |
| Parity | Same policy fixture → identical allow/deny on file libSQL and Postgres |

## Done when

- [ ] Dialect matrix tests prove identical results
- [ ] No uid leak across pooled PG connections
- [ ] Existing `role_in` / `bucket_in` policies still work
- [ ] `service_role` bypasses user policies
