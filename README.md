# altr.lab

Turborepo monorepo for **altr.lab** — Apolyx docs app, shared UI kit, and foundation packages.

## Package manager

**pnpm** workspaces (`pnpm-workspace.yaml`). Node ≥ 20.

```bash
pnpm install
pnpm dev:apolyx   # http://localhost:3004 — Apolyx docs
pnpm build
pnpm typecheck
```

See [Docs/Altr.lab/commands.md](Docs/Altr.lab/commands.md).

## Layout

```
apps/          # apolyx (Apolyx docs, Next.js)
cloud/         # pocketbase (optional placeholder)
elements/      # ui-kit, apolyx-cli, base
Docs/          # Obsidian second brain
```

## Stack (short)

- **Docs app:** `@altr/apolyx-docs` — `apps/apolyx` (:3004)
- **DB:** Turso (libSQL) primary — stub in `@altr/base/db`
- **UI:** Tailwind v4 + Motion in `@altr/apolyx` — Storybook: `pnpm storybook:ui-kit` (:6006)
- **Optional:** PocketBase under `cloud/pocketbase`

Sample Next apps (`hub`, `dashboard`, `trading-ui`, `web`) and cloud placeholders (`hono-server`, `ai-bot-agent`) were removed 2026-10-18. See [Docs/tech_space/03-sample-apps-removed.md](Docs/tech_space/03-sample-apps-removed.md).

Full decisions: [Docs/Altr.lab/stack.md](Docs/Altr.lab/stack.md) · As-built: [Docs/tech_space/ui-kit/README.md](Docs/tech_space/ui-kit/README.md)

## Theme in apps

```tsx
import "@altr/apolyx/globals.css";
import { ThemeProvider, ThemeToggle, FadeIn } from "@altr/apolyx";
```

Wrap with `ThemeProvider` (`attribute="class"`). Details: `elements/ui-kit/README.md`.
