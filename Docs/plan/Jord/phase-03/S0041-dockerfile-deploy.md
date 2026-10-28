---
title: "S0041 — Dockerfile + one deploy recipe"
description: "Multi-stage server image, healthcheck on /health/ready, and one documented deploy recipe with migrations on boot"
created: 2026-10-28
updated: 2026-10-28
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0041
---

# S0041 — Dockerfile + one deploy recipe

> **Status:** todo · **Phase:** [[README]] · Parent: [[../../../feature_list/Jord/todo/jord-F0013-production-ops|jord-F0013]] · After ship: [[../../../tech_space/jord/overview/README]]

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
| Intent | [[../../../feature_list/Jord/todo/jord-F0013-production-ops|jord-F0013]] |
| As-built | [[../../../tech_space/jord/overview/README]] |
| Code today | `cloud/jord/package.json` (`start`, `dev`) · workspace root `pnpm-workspace.yaml` · `.github/workflows/jord.yml` |
| Related | [[S0040-backup-restore-drill|S0040]] · [[S0034-health-probes|S0034]] |

**Do not break:** the image must not bake `.env`, `data/`, or `*.db`; workspace build order stays `@altr/base` → `@altr/jord` → `@altr/jord-client` → server.

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
  B[build stage: pnpm install + build] --> R[runtime image]
  R -->|HEALTHCHECK| H[/health/ready]
  R --> V[(volume: data/)]
  R --> PG[(external Postgres)]
```

## Steps (do in order)

1. Read workspace build order and the server `start` script.
2. Add `Dockerfile` + `.dockerignore` (repo root or `cloud/jord/` — document which and why).
3. Build + compose smoke locally; paste output.
4. Write the recipe + env table into tech_space.
5. **docs_man**: overview tech_space; tick card.

## Done when

- [ ] `docker build` succeeds from a clean checkout (no `.env`, no `data/`)
- [ ] Container serves `/health/ready` 200 against Postgres
- [ ] Runs as non-root
- [ ] Recipe written with env table
- [ ] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| | `docker build …` | |
| | `curl -f localhost:8787/health/ready` | |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/overview/README.md` |
| Queue | [[README]] |
