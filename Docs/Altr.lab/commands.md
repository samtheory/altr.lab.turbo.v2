# Commands

## Package manager

This monorepo uses **pnpm** workspaces (`packageManager`: `pnpm@10.27.0` in root `package.json`).

```bash
# From repo root
pnpm install
```

npm is not the primary manager; prefer pnpm so workspace:* links resolve correctly.

## Dev

```bash
pnpm dev                 # all packages with a "dev" script (turbo)
pnpm dev:web             # @altr/web       → http://localhost:3000
pnpm dev:dashboard       # @altr/dashboard → http://localhost:3001
pnpm dev:trading-ui      # @altr/trading-ui→ http://localhost:3002
pnpm dev:api             # @altr/hono-server → http://localhost:8787 (requires Bun)
```

Filter any package:

```bash
pnpm --filter @altr/web dev
pnpm --filter @altr/ui-kit typecheck
```

## Build / typecheck

```bash
pnpm build               # turbo build (dependsOn ^build)
pnpm typecheck           # turbo typecheck
pnpm lint
pnpm clean
```

## Turbo pipelines

Defined in root `turbo.json`:

| Task | Notes |
|------|--------|
| `build` | Depends on upstream `^build`; outputs `.next/**`, `dist/**` |
| `dev` | Persistent, no cache |
| `lint` / `typecheck` | Depend on `^build` |
| `clean` | No cache |

## Bun (API)

`@altr/hono-server` expects [Bun](https://bun.sh). Install Bun on Windows, then `pnpm dev:api`. Health check: `GET http://localhost:8787/health`.
