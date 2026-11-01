---
title: "S0041 — Dockerfile + one deploy recipe"
description: "Multi-stage server image, healthcheck on /health/ready, and one documented deploy recipe with migrations on boot"
created: 2026-10-28
updated: 2026-11-01
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0041
  - done
---

# S0041 — Dockerfile + one deploy recipe

> **Status:** **done** 2026-11-01 · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/done/jord-F0013-production-ops|jord-F0013]] · After ship: [[../../../../tech_space/jord/overview/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **sindri** |
| **Companion skills** | `.agents/skills/graft/` · `.agents/skills/nodejs-backend-patterns/` |
| **Suggested model** | `gpt-5.6-sol-medium` |
| **Est. time** | **1.5–2 h** |
| **Parallel?** | **No** |

## Goal

A multi-stage `Dockerfile` for `@altr/jord-server` and one written recipe (compose or single VM) that boots, migrates, and passes the readiness probe.

## Why now

Last piece of `jord-F0013`: probes, logs and backup exist, but nothing shows how the server actually runs.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../../feature_list/Jord/done/jord-F0013-production-ops|jord-F0013]] |
| As-built | [[../../../../tech_space/jord/overview/README]] |
| Code today | `cloud/jord/Dockerfile` · `cloud/jord/docker-compose.yml` · `cloud/jord/docker/init-postgres.sql` · root `.dockerignore` |
| Related | [[S0040-backup-restore-drill\|S0040]] · [[S0034-health-probes\|S0034]] |

**Do not break:** the image must not bake `.env`, `data/`, or `*.db`; workspace build order stays `@altr/base` → `@altr/jord` → `@altr/jord-client` → server (server runtime needs `@altr/jord` only today).

## In scope

- `Dockerfile` (deps → build → runtime, non-root user, `EXPOSE`, `HEALTHCHECK CMD` on `/health/ready`).
- `.dockerignore` (node_modules, data, Docs, apps).
- Recipe: env table, migrate-on-boot behavior, volume for local blobs / libSQL file, one `docker compose` example with Postgres.
- Smoke: build the image, run against compose Postgres, `curl /health/ready` → 200.

## Out of scope

Kubernetes manifests · registry publishing from CI · Terraform.

## Diagram

```mermaid
flowchart LR
  B[build stage: pnpm install + sources] --> R[runtime image]
  R -->|HEALTHCHECK| H[/health/ready]
  R --> V[(volume: data/)]
  R --> PG[(external Postgres)]
```

## Steps (do in order)

1. Read workspace build order and the server `start` script. ✅
2. Add `Dockerfile` + `.dockerignore` (under `cloud/jord/` + root context; documented why). ✅
3. Build + compose smoke locally; paste output. ✅
4. Write the recipe + env table into tech_space. ✅
5. **docs_man**: overview tech_space; tick card → `done/`. ✅

## Done when

- [x] `docker build` succeeds from a clean checkout (no `.env`, no `data/`)
- [x] Container serves `/health/ready` 200 against Postgres
- [x] Runs as non-root
- [x] Recipe written with env table
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-01 | `docker build -f cloud/jord/Dockerfile -t altr/jord-server:local .` | ok · image `altr/jord-server:local` |
| 2026-11-01 | `docker compose -f cloud/jord/docker-compose.yml up -d` | postgres healthy → jord started |
| 2026-11-01 | `curl -sf http://127.0.0.1:8787/health/ready` | `{"ok":true}` · HTTP 200 |
| 2026-11-01 | `docker exec jord-server id` | `uid=1000(node)` · `User=node` · Health=`healthy` |
| 2026-11-01 | image check | no baked `.env` · no `/app/data` · `data/blobs` volume only |

Shipped: `cloud/jord/Dockerfile` · `cloud/jord/docker-compose.yml` · `cloud/jord/docker/init-postgres.sql` · root `.dockerignore` · `tsx` moved to server runtime deps for container start.

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/overview/README.md` |
| Queue | [[../README]] |
