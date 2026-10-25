# `@altr/jord-server`

Hono API over `@altr/jord` (write queue, OCC, dialect-aware health). Studio and agents talk HTTP only — never open `data/jord.db` from the browser. WAL checkpoints run for `file:` libSQL only.

## Dev

```bash
# from repo root — copy cloud/jord/.env.example → cloud/jord/.env first
pnpm dev:jord
```

Default: [http://127.0.0.1:8787](http://127.0.0.1:8787). `startJordServer` loads `.env` if present (does not override shell env).

## Env

| Var | Required | Role |
|-----|----------|------|
| `JORD_SERVER_TOKEN` | **yes** | HMAC key for operator sessions. Raw bearer is `service` / `service_role` unless `JORD_LEGACY_SECRET_ROLE=admin` |
| `JORD_DEFAULT_ROLE` | no (default `admin`) | Operator role when `JORD_LEGACY_SECRET_ROLE=admin` and the raw secret is the bearer |
| `JORD_LEGACY_SECRET_ROLE` | no (default `service`) | `service` or `admin`. `admin` is a temporary escape |
| `JORD_JWT_SECRET` | for `/auth/*` tokens | HS256 signing secret (kid `current`). Separate from the HMAC secret |
| `JORD_JWT_SECRET_PREVIOUS` | no | Previous HS256 secret (kid `previous`, verify only) |
| `DATABASE_URL` | no | `file:` (default) or `postgres://` / `postgresql://` |
| `PORT` | no (default `8787`) | Listen port |
| `JORD_WAL_CHECKPOINT_MS` | no | WAL truncate interval |

## Auth (Studio S3)

| Route | Auth |
|-------|------|
| `GET /health` | Public |
| `/records/*`, `/schema/*` | `Authorization: Bearer <token>` |

Bearer may be:

1. An HMAC operator token from Studio login (`payload.sig`, roles `admin` / `editor` / `readonly`)
2. An end-user or anon JWT (`Authorization: Bearer <access_token>` from `/auth/signin` or `/auth/anon-key`)
3. The raw `JORD_SERVER_TOKEN` → kind `service`, role `service_role` (set `JORD_LEGACY_SECRET_ROLE=admin` to keep the old operator mapping)

```bash
curl -s http://127.0.0.1:8787/records?bucket=lab \
  -H "Authorization: Bearer $JORD_SERVER_TOKEN"
```

That call is a **service** principal. It can read and write records. It cannot change schema, jobs, policies, or triggers. Mint operator tokens with Studio, or sign an HMAC session, when you need `admin`.

| Role | Read | Write records | ADD COLUMN |
|------|------|---------------|------------|
| `readonly` | yes | 403 | 403 |
| `editor` | yes | yes | 403 |
| `admin` | yes | yes | yes |
| `service_role` | yes | yes | 403 |

Missing/invalid credentials → **401**. Insufficient role → **403**. Stale OCC → **409**.
