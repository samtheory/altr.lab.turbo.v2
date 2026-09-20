# altr.lab

Turborepo monorepo for **altr.lab** — Next.js apps, Hono API, shared UI kit, and foundation packages.

## Package manager

**pnpm** workspaces (`pnpm-workspace.yaml`). Node ≥ 20.

```bash
pnpm install
pnpm dev:hub      # http://localhost:3000 — landing (markdown content/)
pnpm build
pnpm typecheck
```

See [Docs/Altr.lab/commands.md](Docs/Altr.lab/commands.md).

## Layout

```
apps/          # hub, dashboard, trading-ui, web (Next.js)
cloud/         # hono-server, pocketbase, ai-bot-agent
elements/      # ui-kit, base
Docs/          # Obsidian second brain
```

## Stack (short)

- **Landing:** `@altr/hub` — content from `apps/hub/content/*.md`
- **DB:** Turso (libSQL) primary — stub in `@altr/base/db`
- **UI:** Tailwind v4 + shadcn + Motion in `@altr/ui-kit`
- **API:** Hono + Bun (`@altr/hono-server`) — requires Bun
- **Optional:** PocketBase under `cloud/pocketbase`

Full decisions: [Docs/Altr.lab/stack.md](Docs/Altr.lab/stack.md) · As-built: [Docs/tech_space/01-hub-ui-kit-base.md](Docs/tech_space/01-hub-ui-kit-base.md)

## Theme in apps

```tsx
import "@altr/ui-kit/globals.css";
import { ThemeProvider, ThemeToggle, FadeIn } from "@altr/ui-kit";
```

Wrap with `ThemeProvider` (`attribute="class"`). Details: `elements/ui-kit/README.md`.
