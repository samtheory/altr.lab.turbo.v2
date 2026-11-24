# S0092 — authorized Strix scope (lab only)

**Authorization:** Local lab owned by the altr.lab workspace operator. Not a third-party host.

| Item | Value |
|------|-------|
| Target host | `http://127.0.0.1:8787` only |
| Surfaces | `/api/v1` · `/auth` · `/blobs` · `/realtime` · admin probes for function-level authz |
| Out of scope | DoS/load · social · physical · any non-loopback host |
| Rate limits | Respect server defaults (auth 30/min, data 120/min); stop if 429 storms |
| Principals | `service` (shared secret) · `operator` admin · `user` restricted · `anon` |
| Data | Seeded scratch `file:` DB under `data/jord-s0092.db` (gitignored) |
| Credentials | Lab-only tokens in `Docs/temp/input/S0092-seed-creds.json` (staging; never commit secrets to vault truth) |
| Scan mode | Strix `--scan-mode quick` then expand if clean; `--max-budget 15` |
| Report staging | `Docs/temp/output/S0092-strix/` |

## OWASP API classes to verify

1. BOLA / IDOR on records + blobs
2. Function-level authz on `/admin/*` and manage routes
3. Mass assignment on PATCH/POST bodies
4. SSRF via outbound URL fields (mailer/OAuth/bucket endpoints if exposed)
5. Injection via filters / `select`
6. Auth/token flaws (alg none, expired, confused operator vs user JWT)
7. Enumeration on auth endpoints
