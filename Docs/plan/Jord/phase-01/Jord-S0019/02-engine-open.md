---
title: "Phase 2 — engine URL + LibSqlAdapter.open"
description: "Accept libsql://; branch file vs remote in open/close/snapshot"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0019
  - sindri
---

# Phase 2 — engine URL + LibSqlAdapter.open

> Who: **sindri**. Sprint: [[README]] · Contract: [[01-contract]].

## Status

**done** (2026-10-24)

## Touch

| File | Change |
|------|--------|
| `elements/jord/src/url.ts` | Accept `libsql:`; return `{ scheme: "libsql", url }` |
| `elements/jord/src/errors.ts` | Message for missing token / stop saying “reserved for later” |
| `elements/jord/src/client.ts` | `libsql` → `LibSqlAdapter.open(url, { authToken })` |
| `elements/jord/src/adapter/libsql.ts` | `open` branches: file mkdir+WAL vs remote token client |
| `elements/jord/src/adapter/libsql.test.ts` | Flip reject test; unit-test resolve; optional live gate |
| `elements/jord/src/snapshot.ts` | Already rejects non-`file:` once scheme is `libsql` — confirm |

## Open sketch

```ts
// Pseudocode — not final API
static async open(url: string, opts?: { authToken?: string }) {
  if (url.startsWith("file:")) {
    // existing mkdir + WAL + ensureRecordsSchema
  }
  // libsql://
  const authToken = opts?.authToken ?? process.env.LIBSQL_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN
  if (!authToken) throw new JordUrlError(url, "LIBSQL_AUTH_TOKEN (or TURSO_AUTH_TOKEN) required for libsql://")
  const client = createClient({ url, authToken })
  await ensureRecordsSchema(client)
  return new LibSqlAdapter(client)
}
```

`close()` / `checkpointTruncate()`: keep best-effort for file; on remote, no-op or swallow pragma failures so shutdown never hard-fails on hosted.

## Tests

- Unit: `resolveDatabaseUrl("libsql://…")` returns scheme `libsql`
- Unit: `createJordClient({ url: "libsql://…" })` without token rejects with Jord error
- Unit: previous “rejects libsql as later slice” **removed** / inverted
- Live (optional): `JORD_TEST_LIBSQL_URL` + token → open, insert, close — skip when unset (mirror Postgres pattern)

## Done when

- [ ] Hosted URL opens with token; file path unchanged
- [ ] Default unit suite green without a Turso account
