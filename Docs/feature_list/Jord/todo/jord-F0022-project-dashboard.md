---
title: "jord-F0022 — project dashboard"
feature_id: jord-F0022
description: "First menu item per project: request charts, database counters, connection/credential card, app-connected state"
created: 2026-10-28
updated: 2026-10-28
tags:
  - feature
  - jord
  - todo
  - jord-F0022
  - studio
  - dashboard
---

# jord-F0022 — project dashboard

> **Status:** todo · **Id:** `jord-F0022` · Index: [[../INDEX]] · Depends on [[jord-F0021-projects-provisioning|jord-F0021]]

## What

A **Dashboard** screen as the first menu item of every project — the operator's answer to "is this database healthy, who is connected, and what do I hand an app team?"

| Block | Content |
|-------|---------|
| Health | Engine + dialect, connection status, last successful connect, server version, uptime |
| Request charts | Reads / writes / errors per interval (1 h · 24 h · 7 d), p50/p95 latency, write-queue depth, SQL error rate |
| Database report | Table count, row estimates, database size, blob bytes, tracked tables, policy count, job failures |
| Top tables | Most read / most written tables in the window |
| Realtime | Current subscribers, events/min, last event age |
| **Connect card** | DB URL / file path · user · **DB password reveal + rotate** · publishable key · **secret key reveal-once + rotate** · API barrier key · copy-ready env block and client init snippet |
| App connected | Last client request, project id, SDK version, allowed origins, live/WS connection state |
| Recent errors | Last N failed requests with table / route / status |

Charts use Apolyx charts. Numbers come from existing request logs, write queue, `jord_sql_audit`, outbox, and a new read-only `GET /admin/projects/:id/stats` aggregate — **not** a second telemetry pipeline.

## Acceptance

1. Charts reconcile with recorded requests for a fixed test window (same counts, stated tolerance).
2. No credential appears in page HTML, client bundle, or list JSON — reveal is a separate audited admin call.
3. Password and secret rotation invalidate the old value immediately (client request with the old secret → 401).
4. Dashboard loads with an unreachable database and shows the failure state instead of an empty chart.

## Overlap

| Id | Change |
|----|--------|
| [[jord-F0021-projects-provisioning\|jord-F0021]] | Owns the project record and secret storage; dashboard only reads/rotates |
| [[../done/jord-F0009-realtime\|jord-F0009]] | Subscriber/event counters come from the existing realtime layer |
| [[../done/jord-F0007-jobs\|jord-F0007]] · [[../done/jord-F0008-policies\|jord-F0008]] | Job and policy counts reuse existing admin endpoints |

## Out of scope

Long-term metrics retention (Prometheus/Grafana) · alerting · billing/quota dashboards.

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/done/S0095-project-stats-endpoint\|S0095]] — stats endpoint | 2.5–3 h | **done** 2026-11-03 |
| [[../../../plan/Jord/phase-03/done/S0096-dashboard-ui\|S0096]] — dashboard UI | 3 h | **done** 2026-11-03 |

Queue: [[../../../plan/Jord/phase-03/README]].
