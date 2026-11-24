# Strix instructions — Jord S0092 lab

Authorized target only: `http://127.0.0.1:8787` (local lab). Do not scan any other host.

## Credentials (from Docs/temp/input/S0092-seed-creds.json — re-seed if tokens expired)

- Service (shared secret): Bearer `dev-jord-token-change-me`
- Operator admin: Bearer from `operatorAdminBearer` in the seed file
- Restricted user: Bearer from `restrictedUser.accessToken` (or sign in with email/password in that file)

## Focus (OWASP API)

1. BOLA/IDOR: can the restricted user read/update/delete another principal’s records or blobs (`lab` vs `private` buckets, record ids in seed file)?
2. Function-level authz: can user/anon hit `/admin/*`, manage functions, migrate, or SQL console?
3. Mass assignment: owner/role/claims fields on PATCH/POST.
4. SSRF: any server-side URL fetch fields (mailer, OAuth, bucket endpoints).
5. Injection via table-API filters / `select`.
6. Auth flaws: `alg=none`, expired JWT, operator HMAC confused as user JWT, refresh reuse.
7. Auth enumeration: signup/signin/reset response differences.

## Rules

- Stay on 127.0.0.1:8787.
- Prefer validated PoCs; do not DoS.
- Record severity + proof for each confirmed finding.
