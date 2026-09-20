---
title: "Commands — install run build"
description: "How to install, develop, and build altr.lab with pnpm and turbo"
created: 2026-09-19
updated: 2026-09-20
tags:
  - altr-lab
  - commands
---

# Commands

Package manager: **pnpm** (`packageManager`: `pnpm@10.27.0`).

```bash
pnpm install
pnpm dev                 # all packages with a dev script
pnpm build
pnpm typecheck
pnpm lint

pnpm dev:hub             # @altr/hub :3000  (landing + markdown content)
pnpm dev:dashboard       # @altr/dashboard :3001
pnpm dev:trading-ui      # @altr/trading-ui :3002
pnpm dev:web             # @altr/web :3003
pnpm dev:api             # @altr/hono-server :8787 (needs Bun)
```

Turbo pipelines: `dev`, `build`, `lint`, `typecheck`, `clean` — see root `turbo.json`.
