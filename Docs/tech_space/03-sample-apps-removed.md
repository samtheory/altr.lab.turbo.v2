---
title: "Sample apps and cloud placeholders removed"
description: "As-built note for deleting the sample Next apps and the Hono and AI-agent placeholders"
created: 2026-10-18
updated: 2026-10-18
tags:
  - tech-space
  - monorepo
  - cleanup
---

# Sample apps and cloud placeholders removed

> Who: anyone reading the repo layout after 2026-10-18. The folders below are gone. Product ideas that named them are future homes, not current code.

## Removed

| Package | Path | What it was |
|---------|------|-------------|
| `@altr/hub` | `apps/hub` | Landing Next.js app (:3000) and markdown content |
| `@altr/dashboard` | `apps/dashboard` | Admin scaffold (:3001) |
| `@altr/trading-ui` | `apps/trading-ui` | Trading scaffold (:3002) |
| `@altr/web` | `apps/web` | Spare Next scaffold (:3003) |
| `@service/hono-server` | `cloud/hono-server` | Hono + Bun health API (:8787) |
| `@service/ai-bot-agent` | `cloud/ai-bot-agent` | Empty AI agent package |

## Still in the workspace

| Package | Path |
|---------|------|
| `@altr/apolyx-docs` | `apps/apolyx` |
| `@service/pocketbase` | `cloud/pocketbase` |
| `@altr/apolyx` | `elements/ui-kit` |
| `apolyx` | `elements/apolyx-cli` |
| `@altr/base` | `elements/base` |

`pnpm-workspace.yaml` still globs `apps/*`, `cloud/*`, and `elements/*`. `turbo.json` has no per-package tasks, so Turbo picks up whatever workspaces remain. Root scripts `dev:hub`, `dev:web`, `dev:dashboard`, `dev:trading-ui`, and `dev:api` were removed with their filters.

`@altr/base/content` still loads markdown from a directory an app passes in. No app in the repo calls it after hub was removed.

Closed Apolyx-S0001 plan cards still mention the sample apps. Those cards record the sprint as it was. Current layout is [[../Altr.lab/structure]].

## Links

- Layout: [[../Altr.lab/structure]]
- Commands: [[../Altr.lab/commands]]
- Status: [[../report/STATUS]]
- Earlier hub notes: [[01-hub-ui-kit-base]] · [[../feature_list/01-hub-ui-kit-base]]
