---
title: "Jord-S0001 — libSQL file and one server"
description: "Opened plan for Jord’s first slice. data/jord.db, elements/jord, cloud/jord. Jord Studio out of scope."
created: 2026-10-18
updated: 2026-10-18
tags:
  - plan
  - jord
  - Jord-S0001
---

# Jord-S0001 — libSQL file and one server

> Checkbox overlay for [[../../../feature_list/Jord/00-intent]]. Status: opened 2026-10-18, not started. Layout: [[../../../feature_list/Jord/02-architecture]].

## In scope

- [ ] `elements/jord` (`@altr/jord`) opens `data/jord.db` and creates it on first boot
- [ ] `data/*.db` is gitignored
- [ ] Drizzle schema for `records` migrates on boot
- [ ] `DATABASE_URL` defaults to `file:./data/jord.db`; other schemes fail clearly
- [ ] `cloud/jord` (`@altr/jord-server`): `GET /health`, `POST /records`, `GET /records?bucket=`, `GET /records/:id`
- [ ] One insert/read round-trip through that server
- [ ] `@altr/base/db` is not a second live client

## Out of scope

- [ ] Jord Studio (`apps/jord-studio`)
- [ ] Auth, jobs UI, logs UI, schema visualizer, generated/custom APIs
- [ ] Postgres, cache, websockets, sqlite-vec, bot process

## Done when

[[../../../feature_list/Jord/00-intent]] acceptance is true, and a `tech_space` note records the wiring.
