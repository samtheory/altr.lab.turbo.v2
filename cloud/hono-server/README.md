# @altr/hono-server

Minimal **Hono + Bun** API for altr.lab.

## Run

Requires [Bun](https://bun.sh):

```bash
pnpm --filter @altr/hono-server dev
# or from this folder:
bun run --watch src/index.ts
```

Default port: `8787` (override with `PORT`).

## Routes

- `GET /` — service info
- `GET /health` — health check

Depends on `@altr/base` for env helpers (Turso placeholders live there, not wired here yet).
