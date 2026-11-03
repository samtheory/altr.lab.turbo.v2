import { randomBytes, createHash } from "node:crypto";

import type { AesGcmSecretPort, JordDriverPort, SecretPort } from "@altr/jord";

import type { JordAuthConfig } from "./config.js";
import { CURRENT_KID, PREVIOUS_KID, type JwtKey } from "./jwt.js";
import { AUTH_SETTINGS_ID } from "./settings.js";

/** Secret-port id for the project's rotated JWT signing key. */
export const JWT_SECRET_ID = "auth.jwt.key";
const CACHE_MS = 5_000;

export type JwtKeySource = "env" | "database" | "none";

export type JwtKeyInfo = {
  /** Where the signing key comes from right now. */
  source: JwtKeySource;
  /** Non-secret sha256 prefix used to tell keys apart. */
  fingerprint: string | null;
  rotatedAt: number | null;
  configured: boolean;
};

export type JwtKeyring = {
  current(): Promise<string | null>;
  keys(): Promise<JwtKey[]>;
  info(): Promise<JwtKeyInfo>;
  invalidate(): void;
  /** Replace the signing key with a fresh random secret (needs the master key). */
  rotate(): Promise<JwtKeyInfo>;
  /** Drop the stored key and fall back to `JORD_JWT_SECRET`. */
  reset(): Promise<JwtKeyInfo>;
};

type KeyRow = {
  sealed: string | null;
  fingerprint: string | null;
  rotatedAt: number | null;
};

function fingerprintOf(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 16);
}

function placeholder(jord: JordDriverPort, n: number): string {
  return jord.dialect === "postgres" ? `$${n}` : "?";
}

async function loadKeyRow(jord: JordDriverPort): Promise<KeyRow> {
  const rows = await jord.query(
    `SELECT jwt_key_sealed, jwt_key_fingerprint, jwt_key_rotated_at
       FROM jord_auth_settings WHERE id = ${placeholder(jord, 1)} LIMIT 1`,
    [AUTH_SETTINGS_ID],
  );
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return { sealed: null, fingerprint: null, rotatedAt: null };
  return {
    sealed: typeof row.jwt_key_sealed === "string" ? row.jwt_key_sealed : null,
    fingerprint:
      typeof row.jwt_key_fingerprint === "string"
        ? row.jwt_key_fingerprint
        : null,
    rotatedAt:
      row.jwt_key_rotated_at == null ? null : Number(row.jwt_key_rotated_at),
  };
}

async function saveKeyRow(input: {
  jord: JordDriverPort;
  sealed: string | null;
  fingerprint: string | null;
  rotatedAt: number | null;
}): Promise<void> {
  const now = Date.now();
  if (input.jord.dialect === "postgres") {
    await input.jord.query(
      `INSERT INTO jord_auth_settings (
        id, updated_at, jwt_key_sealed, jwt_key_fingerprint, jwt_key_rotated_at
      ) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (id) DO UPDATE SET
        jwt_key_sealed = $3,
        jwt_key_fingerprint = $4,
        jwt_key_rotated_at = $5`,
      [
        AUTH_SETTINGS_ID,
        now,
        input.sealed,
        input.fingerprint,
        input.rotatedAt,
      ],
    );
    return;
  }
  await input.jord.query(
    `INSERT INTO jord_auth_settings (
      id, updated_at, jwt_key_sealed, jwt_key_fingerprint, jwt_key_rotated_at
    ) VALUES (?,?,?,?,?)
    ON CONFLICT (id) DO UPDATE SET
      jwt_key_sealed = excluded.jwt_key_sealed,
      jwt_key_fingerprint = excluded.jwt_key_fingerprint,
      jwt_key_rotated_at = excluded.jwt_key_rotated_at`,
    [AUTH_SETTINGS_ID, now, input.sealed, input.fingerprint, input.rotatedAt],
  );
}

function requireSealPort(secrets: SecretPort | null): AesGcmSecretPort {
  if (!secrets) {
    throw new Error(
      "JORD_MASTER_KEY is required to store a rotated JWT signing key",
    );
  }
  if (typeof (secrets as AesGcmSecretPort).peekSealed !== "function") {
    throw new Error("secret port must support peekSealed for JWT rotation");
  }
  return secrets as AesGcmSecretPort;
}

/**
 * Signing key resolution for one server process (S0071).
 *
 * Order: sealed per-project key → `JORD_JWT_SECRET` → none. A stored key is
 * authoritative: env secrets are not accepted as `previous` after rotation, so
 * rotating invalidates every access token immediately (documented policy).
 * The row is cached for a few seconds; rotate/reset invalidate the cache.
 */
export function createJwtKeyring(input: {
  jord: JordDriverPort;
  auth: JordAuthConfig;
  secrets: SecretPort | null;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
}): JwtKeyring {
  let cache:
    | { at: number; secret: string | null; keys: JwtKey[]; info: JwtKeyInfo }
    | null = null;

  async function resolve(): Promise<{
    secret: string | null;
    keys: JwtKey[];
    info: JwtKeyInfo;
  }> {
    if (cache && Date.now() - cache.at < CACHE_MS) {
      return { secret: cache.secret, keys: cache.keys, info: cache.info };
    }

    const row = await loadKeyRow(input.jord).catch((err: unknown) => {
      console.error("[@altr/jord-server] auth settings key read failed", err);
      return null;
    });

    let secret: string | null = input.auth.jwtSecret;
    let source: JwtKeySource = secret ? "env" : "none";
    if (row?.sealed) {
      if (input.secrets) {
        try {
          secret = input.secrets.unseal(row.sealed);
          source = "database";
        } catch (err) {
          console.error(
            "[@altr/jord-server] stored JWT key could not be unsealed; falling back to env",
            err,
          );
        }
      } else {
        console.error(
          "[@altr/jord-server] stored JWT key present but JORD_MASTER_KEY is unset",
        );
      }
    }

    const keys: JwtKey[] = [];
    if (secret) keys.push({ kid: CURRENT_KID, secret });
    // The env `previous` key only participates while no stored key is in use.
    if (source !== "database" && input.auth.jwtSecretPrevious) {
      keys.push({ kid: PREVIOUS_KID, secret: input.auth.jwtSecretPrevious });
    }

    const info: JwtKeyInfo = {
      source,
      fingerprint: row?.fingerprint ?? (secret ? fingerprintOf(secret) : null),
      rotatedAt: row?.rotatedAt ?? null,
      configured: Boolean(secret),
    };
    cache = { at: Date.now(), secret, keys, info };
    return { secret, keys, info };
  }

  return {
    async current() {
      return (await resolve()).secret;
    },
    async keys() {
      return (await resolve()).keys;
    },
    async info() {
      return (await resolve()).info;
    },
    invalidate() {
      cache = null;
    },
    async rotate() {
      const port = requireSealPort(input.secrets);
      const next = randomBytes(32).toString("base64url");
      const row = await loadKeyRow(input.jord).catch(() => null);
      if (row?.sealed) await port.rotate(JWT_SECRET_ID, next);
      else await port.putSecret(JWT_SECRET_ID, next);
      const sealed = port.peekSealed(JWT_SECRET_ID);
      if (!sealed) throw new Error("failed to seal the new JWT key");
      const rotatedAt = Date.now();
      const fingerprint = fingerprintOf(next);
      await input.enqueueWrite(() =>
        saveKeyRow({
          jord: input.jord,
          sealed,
          fingerprint,
          rotatedAt,
        }),
      );
      cache = null;
      return { source: "database", fingerprint, rotatedAt, configured: true };
    },
    async reset() {
      await input.enqueueWrite(() =>
        saveKeyRow({
          jord: input.jord,
          sealed: null,
          fingerprint: null,
          rotatedAt: Date.now(),
        }),
      );
      cache = null;
      return (await resolve()).info;
    },
  };
}
