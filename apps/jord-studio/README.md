# Jord Studio (`@altr/jord-studio`)

Local control plane for Jord Slice 0: browse and edit `records` through `@altr/jord-server`. The browser never opens `data/jord.db`.

## Dev (two processes)

```bash
# terminal 1 — API (write queue + WAL)
pnpm dev:jord

# terminal 2 — UI (BFF + Apolyx)
pnpm dev:jord-studio
```

Studio: [http://127.0.0.1:3005](http://127.0.0.1:3005)  
API: [http://127.0.0.1:8787](http://127.0.0.1:8787)

Copy `.env.example` → `.env.local` if needed. Defaults:

| Var | Default | Role |
|-----|---------|------|
| `JORD_SERVER_URL` | `http://127.0.0.1:8787` | BFF upstream |
| `JORD_STUDIO_OPEN` | `1` | Local-dev gate (must be `1`) |

## Stack

- Next.js App Router + Tailwind v4
- UI: workspace `@altr/apolyx` only (Apolyx-first)
- Data: Route Handlers under `/api/*` → jord-server
