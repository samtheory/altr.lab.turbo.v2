# Jord key-rotation runbook

Covers the three signing secrets: JWT key, blob signed-URL HMAC key, project keys.
All routes need an **operator admin** bearer (`$ADMIN`); user tokens get 403.
Base: `$JORD=https://your-host`. Every rotate/revoke writes a `jord_logs` row
(`auth.jwt`, `storage.keys`, `projects.keys`) holding actor, fingerprint, expiry, never key material.
Fingerprints are keyed (HMAC-SHA256 under a key derived from `JORD_SERVER_TOKEN` with context
`jord:fingerprint:v1`, 12 hex chars): they tell keys apart but cannot be used to test guesses of a
secret offline. They stay stable across restarts while `JORD_SERVER_TOKEN` is unchanged.

## Pre-checks (all types)

1. `JORD_MASTER_KEY` is set (rotation stores sealed keys; without it the routes return 503).
2. Migration `0028_key_sets` applied (server boot does it).
3. You hold an admin token and can reach `GET $JORD/admin/auth/jwt` (200).
4. Pick the window: **routine** = overlap; **suspected leak** = `revoke_previous: true`.

## Overlap durations and why

`overlap_seconds` means the same thing for every key type:

| `overlap_seconds` | Effect |
|-------------------|--------|
| omitted | the per-type default below |
| `0` (explicit) | no overlap: old credentials stop verifying at once (all three types) |
| `1`-`604800` | old credentials verify for that many seconds |
| `revoke_previous: true` | no overlap, whatever `overlap_seconds` says |

| Key | Default when omitted | Recommended | Why |
|-----|----------------------|-------------|-----|
| JWT | `0` (no overlap) | `86400` | A bare `POST` keeps the legacy behaviour and kills all old tokens (and anon keys) at once. Sessions are long, so pass an overlap for routine rotation. |
| Blob HMAC | `7200` (2 h) | default | Signed URLs live at most 1 h; 2 h covers them with margin. |
| Project keys | `86400` (24 h) | default | Time to redeploy clients/CI with the new key. |

Max overlap anywhere: 604800 s (7 days); larger values are rejected with 400.

**Only one retiring ("previous") key exists per type.** Rotating again inside the overlap drops the
oldest key at once. Example: rotate JWT at 09:00 (key A → B, A valid until tomorrow 09:00), then rotate
again at 10:00 (B → C): **A stops verifying at 10:00**, only B is kept as previous. Wait for the overlap to
end (or accept that the oldest generation dies) before rotating again.

**Wait at least 10 s between two rotations of the same type**, and never rotate within 10 s of a rotation
made on another server process: peers cache keys for up to 5 s, so a peer may still be signing with the key
that a quick second rotation drops, and its fresh tokens/URLs would fail without any overlap.

## Routine rotation

### 1. JWT signing key
```bash
curl -sX POST $JORD/admin/auth/jwt/rotate -H "Authorization: Bearer $ADMIN" \
  -H 'content-type: application/json' -d '{"overlap_seconds":86400}'
```
Response `key.previous.expiresAt` is when old tokens stop verifying. New tokens are signed with the new key immediately.

**Anon keys are affected.** Anon keys (`POST /auth/anon-key`) are JWTs signed with the current key; they
verify with the outgoing key only until `key.previous.expiresAt` (the response also carries
`anon_keys_affected: true` and `anon_keys_valid_until`). Previous-key validity is never extended past the
7-day cap, so **before the overlap ends**:
```bash
curl -sX POST $JORD/auth/anon-key -H "Authorization: Bearer $ADMIN"   # new anon key, signed with the new key
```
put the new anon key into every client build/config and redeploy them. Clients still holding the old anon
key get 401 once the overlap ends (immediately on a no-overlap rotate).

### 2. Blob HMAC key
```bash
curl -sX POST $JORD/admin/storage/keys/rotate -H "Authorization: Bearer $ADMIN" \
  -H 'content-type: application/json' -d '{"overlap_seconds":7200}'
curl -s $JORD/admin/storage/keys -H "Authorization: Bearer $ADMIN"   # fingerprint + previous expiry
```
New URLs are signed with the new key; old URLs verify until the overlap ends (or their own TTL).

### 3. Project keys
```bash
curl -sX POST $JORD/admin/projects/$PID/rotate-keys -H "Authorization: Bearer $ADMIN" \
  -H 'content-type: application/json' -d '{"overlap_seconds":86400}'
```
The response is the **only** time the new `secret_key` / `publishable_key` / `barrier_key` are shown. Store them in your vault now. Roll them out to clients during the overlap.

Order when rotating everything: project keys first (slowest rollout), then blob key, then JWT key last.

## Prove it worked (the drill)

Run in staging, or prod with a throwaway project. The automated version is `cloud/jord/src/auth/key-rotation.test.ts`.

1. Before: capture a user access token `T_old`, a signed URL `U_old`, a project secret `K_old`.
2. Rotate each with a 2 h overlap (commands above).
3. Within overlap: `GET /auth/me` with `T_old` returns 200; `curl "$JORD$U_old"` returns 200; `K_old` is accepted.
4. New credentials: sign in again, mint a new URL, use the new project key, reissue the anon key: all work.
5. After the overlap (or advance the clock in tests): `T_old` returns 401, `U_old` returns 403, `K_old` is rejected.
6. Check `GET $JORD/admin/auth/jwt` shows `key.previous: null`, and `jord_logs` has one row per rotation.

## What breaks if you skip a step

- Rotate JWT without `overlap_seconds`: every signed-in user is logged out at once, and every anon key dies.
- Forget to reissue anon keys before the JWT overlap ends: anonymous clients get 401.
- Rotate twice inside one overlap (or within 10 s of a peer's rotation): the oldest key dies without overlap.
- Skip the master key: 503, nothing changes.
- Roll out new project keys after the overlap ends: clients using the old key start failing.
- Forget to store the project keys from the rotate response: they cannot be shown again; rotate again.
- Rotate blob key with a very short overlap while clients hold fresh URLs: those downloads 403 and must re-sign.

## Rollback

Rotation cannot be undone, but during the overlap the old key still works, so rollback is a roll-forward:
keep serving the old credentials until clients are fixed, then rotate again with a fresh overlap. Do not
revoke previous until clients are confirmed on the new key. After revoke there is no rollback; reissue.

## Emergency revoke (key compromised)

Rotate with no overlap, so the leaked key dies now:
```bash
curl -sX POST $JORD/admin/auth/jwt/rotate -H "Authorization: Bearer $ADMIN" -H 'content-type: application/json' -d '{"revoke_previous":true}'
curl -sX POST $JORD/admin/storage/keys/rotate -H "Authorization: Bearer $ADMIN" -H 'content-type: application/json' -d '{"revoke_previous":true}'
curl -sX POST $JORD/admin/projects/$PID/rotate-keys -H "Authorization: Bearer $ADMIN" -H 'content-type: application/json' -d '{"revoke_previous":true}'
```
If the leaked key is already the *previous* one (mid-overlap), just end the overlap:
```bash
curl -sX POST $JORD/admin/auth/jwt/revoke-previous -H "Authorization: Bearer $ADMIN"
curl -sX POST $JORD/admin/storage/keys/revoke-previous -H "Authorization: Bearer $ADMIN"
curl -sX POST $JORD/admin/projects/$PID/revoke-previous-keys -H "Authorization: Bearer $ADMIN"
```
Expect forced re-login for all users after a JWT revoke. JWT `revoke-previous` also disables the env
`JORD_JWT_SECRET_PREVIOUS` until the next rotation; the response reports `key.previousRevoked: true` and
`key.previous: null`. Revoke is subject to the same peer propagation window as rotate: other server
processes stop accepting the revoked key **within about 5 s**, and already-open realtime sockets are dropped
at their next credential recheck, not instantly. Also revoke sessions if user tokens were stolen
(`POST /admin/users/:id/revoke`). If `JORD_SERVER_TOKEN` itself leaked, change it in env and restart (it is not a rotatable key set).

## Failure behaviour (fail closed)

- Rotation writes current + previous + expiry + fingerprints in one transaction (JWT, blob, project keys).
  If any statement fails the route returns 503 (project routes 500) and the old key set is fully intact.
- Once a key is stored in the database, the env key is never used in its place. If the stored key cannot be
  unsealed (wrong or missing `JORD_MASTER_KEY`) or the key set cannot be read (and no good read happened in
  the last 60 s), token/URL verification fails and issuance (sign-in, refresh, anon key, signed URLs)
  returns 503; an error is logged. `GET /admin/auth/jwt` and `GET /admin/storage/keys` show
  `available: false`. Fix the master key or database; to recover with a lost master key, rotate with
  `revoke_previous: true` (needs a working `JORD_MASTER_KEY`).
- The env key is used only when the database confirms there is no stored key (fresh install, or after
  `DELETE /admin/auth/jwt/key`).
- Project-key lookups that cannot read `jord_project_key_previous` reject retiring keys and log
  `project key lookup table_missing|permission_denied|read_failed` at most once a minute.

## Known limits

- The env fallback keys (`JORD_JWT_SECRET`, `JORD_BLOB_SIGNING_SECRET`) do not expire; after the first DB rotation they are superseded. `JORD_JWT_SECRET_PREVIOUS` has no expiry: revoke it with `revoke-previous` (stays off until the next rotation) and remove it from env by hand. There is no env "previous" key for blob signing.
- Multi-process: peers pick up a rotation **or a revoke** within about 5 s.
- Project keys are verified by one constant-time verifier (`projects/key-lookup.ts`); `verifyProjectKey` delegates to it.
- Background jobs (`jobs/kinds.ts`) build their storage port with the env blob secret, not the key set: a job must not mint signed URLs until that is wired to the key set.
- Production hardening path: move the master key and signing keys to a KMS (out of scope here).
