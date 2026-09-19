# altr.lab

Turborepo monorepo for **altr.lab** — Next.js apps, Hono API, shared UI kit, and foundation packages.

## Package manager

**pnpm** workspaces (`pnpm-workspace.yaml`). Node ≥ 20.

```bash
pnpm install
pnpm dev:web      # http://localhost:3000 — demo of @altr/ui-kit light/dark
pnpm build
pnpm typecheck
```

See [Docs/Altr.lab/commands.md](Docs/Altr.lab/commands.md).

## Layout

```
apps/          # web, dashboard, trading-ui (Next.js)
cloud/         # hono-server, pocketbase, ai-bot-agent
elements/      # ui-kit, base
Docs/          # Obsidian second brain
```

## Stack (short)

- **DB:** Turso (libSQL) primary — stub in `@altr/base/db`
- **UI:** Tailwind v4 + shadcn-style components in `@altr/ui-kit`
- **API:** Hono + Bun (`@altr/hono-server`) — requires Bun
- **Optional:** PocketBase under `cloud/pocketbase`
- **Later layers:** Postgres / MongoDB — documented only, not default

Full decisions: [Docs/Altr.lab/stack.md](Docs/Altr.lab/stack.md).

## Theme in apps

```tsx
import "@altr/ui-kit/globals.css";
import { ThemeProvider, ThemeToggle } from "@altr/ui-kit";
```

Wrap the app with `ThemeProvider` (`attribute="class"`). Details: `elements/ui-kit/README.md`.
