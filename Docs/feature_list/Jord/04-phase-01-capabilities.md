---
title: "Jord — phase-01 shipped capabilities"
description: "Authoritative inventory of what Jord and Studio provide after S0001–S0020"
created: 2026-10-24
updated: 2026-10-24
tags:
  - feature
  - jord
  - phase-01
  - capabilities
---

# Jord — phase-01 shipped capabilities

> Who: **mimir**, reviewers, anyone planning phase-02. This is the **feature_list** view of “what we have.” As-built narratives: [[../../tech_space/jord/README]]. Sprint archive: [[../../plan/Jord/phase-01/README]]. Review packet: [[../../report/Jord-implemented-review]].

Foundation contract (Slice 0 only): [[00-intent]]. Architecture: [[02-architecture]]. Studio surfaces: [[03-jord-studio]].

## Packages

| Package | Path | Role |
|---------|------|------|
| `@altr/jord` | `elements/jord` | `JordDriverPort`, adapters, schema, vectors |
| `@altr/jord-server` | `cloud/jord` | HTTP + write queue + WAL hygiene + Studio APIs |
| `@altr/jord-studio` | `apps/jord-studio` | Control plane (Apolyx-first; never opens the DB file) |

## Engine & store

| Capability | Status | Plan / as-built |
|------------|--------|-----------------|
| `file:` libSQL + WAL + truncate checkpoints + snapshot | **Done** | [[../../plan/Jord/phase-01/Jord-S0001/README\|S0001]] · [[../../tech_space/jord/overview]] |
| OCC `records` + HTTP **409** + one write queue | **Done** | S0001 |
| `postgres://` / `postgresql://` (`PostgresAdapter`) | **Done** | [[../../plan/Jord/phase-01/Jord-S0010/README\|S0010]] · [[../../tech_space/jord/dialects]] |
| Hosted `libsql://` (Turso) + token env | **Done** | [[../../plan/Jord/phase-01/Jord-S0019/README\|S0019]] · [[../../tech_space/jord/dialects]] |
| Schema introspect + ADD COLUMN | **Done** | [[../../plan/Jord/phase-01/Jord-S0004/README\|S0004]] |
| CREATE TABLE + multi-table browse | **Done** | [[../../plan/Jord/phase-01/Jord-S0012/README\|S0012]] |
| User-table row writes | **Done** | [[../../plan/Jord/phase-01/Jord-S0015/README\|S0015]] |
| Schema DROP / RENAME / type change | **Done** | [[../../plan/Jord/phase-01/Jord-S0016/README\|S0016]] |
| Policies + triggers (middleware) | **Done** | [[../../plan/Jord/phase-01/Jord-S0009/README\|S0009]] |
| Native Postgres RLS on `records` | **Done** | [[../../plan/Jord/phase-01/Jord-S0017/README\|S0017]] |
| Realtime SSE | **Done** | [[../../plan/Jord/phase-01/Jord-S0011/README\|S0011]] |
| Realtime WebSockets + multi-table fanout | **Done** | [[../../plan/Jord/phase-01/Jord-S0018/README\|S0018]] |
| Local blob buckets (`data/blobs/` + metadata) | **Done** | [[../../plan/Jord/phase-01/Jord-S0013/README\|S0013]] |
| Vectors (caller floats; cosine / libSQL engine / pgvector) | **Done** | [[../../plan/Jord/phase-01/Jord-S0014/README\|S0014]] · [[../../plan/Jord/phase-01/Jord-S0020/README\|S0020]] |

## Studio (control plane)

| Surface | Status | Notes |
|---------|--------|-------|
| Records browser + table-editor UX | **Done** | S0002–S0003 |
| Schema visualizer | **Done** | S0004 + S0016 |
| Auth + feature roles | **Done** | S0005 |
| Generated CRUD API panel | **Done** | S0006 |
| Jobs / cron + logs | **Done** | S0007 |
| Custom + function APIs | **Done** | S0008 |
| Policies / triggers UI | **Done** | S0009 |
| Connection (file / Postgres / Turso) | **Done** | S0010 · S0019 |
| Live / realtime UI | **Done** | S0011 · S0018 |
| Multi-table + CREATE TABLE | **Done** | S0012 |
| Storage (blobs) | **Done** | S0013 |
| Vectors UI | **Done** | S0014 · S0020 badges |

## Explicitly not in phase-01

See [[01-phase-02-candidates]] and [[../../plan/Jord/phase-02/00-remaining-backlog]].

- Remote S3 / multipart / large blob limits
- Redis-compatible cache
- Separate bot / second cloud process
- Hosted embed API · embedding CDC
- True SQLite update hooks / Postgres LISTEN
- Artemis trading domain (product fork, not Jord)

## Hard invariants (still true)

1. Browser never opens `data/jord.db` or blob paths.
2. Hot writes go through one write queue.
3. `@altr/base` is a leaf; Studio is Apolyx-first.
4. Artemis trading entities must not live in `records.body`.
5. Embeddings are caller-supplied — Jord does not call host embed APIs.
