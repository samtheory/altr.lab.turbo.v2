import type { JordDriverPort } from "@altr/jord";

import { issueRefreshToken } from "./identity.js";
import { signAccessToken } from "./jwt.js";

/**
 * S0076 — server-side sessions.
 *
 * A session id is the refresh-token family id, so revoking a session also
 * revokes its refresh tokens. Access tokens carry `sid`; the auth middleware
 * rejects a revoked/expired/unknown session on the next request.
 *
 * Legacy policy: tokens minted before this card have no `sid` and keep working
 * until their (short) access expiry; their refresh tokens have no session row
 * and mint a row on first refresh so they join the new model.
 */

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** `last_seen_at` is written at most once per minute per session. */
export const LAST_SEEN_THROTTLE_MS = 60_000;
/** Dead rows are kept this long for the audit view, then swept. */
export const SESSION_RETAIN_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionRow = {
  id: string;
  user_id: string;
  device: string;
  ip: string | null;
  created_at: number;
  last_seen_at: number;
  revoked_at: number | null;
  expires_at: number;
};

function q(
  jord: JordDriverPort,
  sql: string,
  args: Array<string | number | null> = [],
): Promise<Array<Record<string, unknown>>> {
  if (jord.dialect === "postgres") {
    let i = 0;
    return jord.query(
      sql.replace(/\?/g, () => `$${++i}`),
      args,
    );
  }
  return jord.query(sql, args);
}

function num(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

/** "Chrome on Windows"-style label; never the raw header. */
export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : /node|undici|curl|axios|fetch/i.test(ua)
              ? "API client"
              : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/.test(ua)
        ? "iOS"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  return os ? `${browser} on ${os}` : browser;
}

export function clientIp(header: string | undefined): string | null {
  const ip = header?.split(",")[0]?.trim();
  return ip ? ip.slice(0, 64) : null;
}

export async function createSession(input: {
  jord: JordDriverPort;
  id: string;
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
  nowMs?: number;
}): Promise<void> {
  const now = input.nowMs ?? Date.now();
  await q(
    input.jord,
    "INSERT INTO jord_sessions (id, user_id, user_agent, ip, created_at, last_seen_at, revoked_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?) ON CONFLICT (id) DO NOTHING",
    [
      input.id,
      input.userId,
      deviceLabel(input.userAgent),
      input.ip ?? null,
      now,
      now,
      now + SESSION_TTL_MS,
    ],
  );
}

/** Push the expiry out when the refresh token rotates; adopt legacy families. */
export async function renewSession(input: {
  jord: JordDriverPort;
  id: string;
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
  nowMs?: number;
}): Promise<void> {
  const now = input.nowMs ?? Date.now();
  const rows = await q(
    input.jord,
    "UPDATE jord_sessions SET expires_at = ?, last_seen_at = ? WHERE id = ? AND revoked_at IS NULL AND expires_at >= ? RETURNING id",
    [now + SESSION_TTL_MS, now, input.id, now],
  );
  if (rows.length > 0) return;
  // Adopt a legacy family only when no row exists: a revoked or expired
  // session is never resurrected (the insert is a no-op on conflict).
  await createSession({ ...input, nowMs: now });
}

/**
 * Live check used on every request. A missing row is dead: a session id only
 * exists in a token that was issued with a row. Writes `last_seen_at` at most
 * once per throttle window.
 */
export async function sessionLive(input: {
  jord: JordDriverPort;
  id: string;
  userId: string;
  nowMs?: number;
}): Promise<boolean> {
  const now = input.nowMs ?? Date.now();
  const rows = await q(
    input.jord,
    "SELECT s.user_id, s.last_seen_at, s.revoked_at, s.expires_at, u.disabled_at FROM jord_sessions s JOIN jord_users u ON u.id = s.user_id WHERE s.id = ?",
    [input.id],
  );
  const row = rows[0];
  // No joined row = unknown session or deleted user. Banned users are dead too.
  if (!row) return false;
  if (row.disabled_at != null) return false;
  if (String(row.user_id) !== input.userId) return false;
  if (row.revoked_at != null) return false;
  if (num(row.expires_at) < now) return false;
  if (now - num(row.last_seen_at) >= LAST_SEEN_THROTTLE_MS) {
    await q(
      input.jord,
      "UPDATE jord_sessions SET last_seen_at = ? WHERE id = ? AND revoked_at IS NULL",
      [now, input.id],
    ).catch(() => undefined);
  }
  return true;
}

function mapRow(row: Record<string, unknown>): SessionRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    device: typeof row.user_agent === "string" ? row.user_agent : "Unknown device",
    ip: typeof row.ip === "string" ? row.ip : null,
    created_at: num(row.created_at),
    last_seen_at: num(row.last_seen_at),
    revoked_at: row.revoked_at == null ? null : num(row.revoked_at),
    expires_at: num(row.expires_at),
  };
}

/** Live sessions for a user, newest activity first. */
export async function listSessions(
  jord: JordDriverPort,
  userId: string,
  nowMs: number = Date.now(),
): Promise<SessionRow[]> {
  const rows = await q(
    jord,
    "SELECT id, user_id, user_agent, ip, created_at, last_seen_at, revoked_at, expires_at FROM jord_sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at >= ? ORDER BY last_seen_at DESC",
    [userId, nowMs],
  );
  return rows.map(mapRow);
}

/** Revoke one session (scoped to its owner) and its refresh family. */
export async function revokeSession(input: {
  jord: JordDriverPort;
  id: string;
  /** Pass the owner for self-service; omit for admin. */
  userId?: string;
  nowMs?: number;
}): Promise<boolean> {
  const now = input.nowMs ?? Date.now();
  const rows = await q(
    input.jord,
    input.userId
      ? "UPDATE jord_sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL RETURNING id"
      : "UPDATE jord_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL RETURNING id",
    input.userId ? [now, input.id, input.userId] : [now, input.id],
  );
  if (rows.length === 0) return false;
  await q(
    input.jord,
    "UPDATE jord_refresh_tokens SET revoked_at = ? WHERE family_id = ? AND revoked_at IS NULL",
    [now, input.id],
  );
  return true;
}

/** Revoke every live session of a user; `exceptId` keeps the caller's own. */
export async function revokeAllSessions(input: {
  jord: JordDriverPort;
  userId: string;
  exceptId?: string;
  nowMs?: number;
}): Promise<{ revoked: number }> {
  const now = input.nowMs ?? Date.now();
  const rows = await q(
    input.jord,
    input.exceptId
      ? "UPDATE jord_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND id <> ? RETURNING id"
      : "UPDATE jord_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL RETURNING id",
    input.exceptId ? [now, input.userId, input.exceptId] : [now, input.userId],
  );
  // Also covers legacy refresh families that never had a session row.
  await q(
    input.jord,
    input.exceptId
      ? "UPDATE jord_refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND family_id <> ?"
      : "UPDATE jord_refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
    input.exceptId ? [now, input.userId, input.exceptId] : [now, input.userId],
  );
  return { revoked: rows.length };
}

/** Job: drop sessions that have been dead for the retention window. */
export async function gcSessions(
  jord: JordDriverPort,
  nowMs: number = Date.now(),
): Promise<{ deleted: number }> {
  const cutoff = nowMs - SESSION_RETAIN_MS;
  const rows = await q(
    jord,
    "DELETE FROM jord_sessions WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?) RETURNING id",
    [cutoff, cutoff],
  );
  return { deleted: rows.length };
}

/**
 * Mint a refresh family + session row + access token (with `sid`) for a user.
 * Shared by password sign-in, magic link and OAuth so all three are revocable.
 */
export async function issueUserSession(input: {
  jord: JordDriverPort;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  secret: string;
  iss: string;
  aud: string;
  user: { id: string; email: string };
  ttlSec: number;
  extraClaims: Record<string, unknown>;
  userAgent?: string | null;
  ip?: string | null;
}) {
  const refresh = await input.enqueueWrite(async () => {
    const issued = await issueRefreshToken({
      jord: input.jord,
      userId: input.user.id,
    });
    await createSession({
      jord: input.jord,
      id: issued.familyId,
      userId: input.user.id,
      userAgent: input.userAgent,
      ip: input.ip,
    });
    return issued;
  });
  const access = signAccessToken({
    secret: input.secret,
    iss: input.iss,
    aud: input.aud,
    sub: input.user.id,
    role: "user",
    email: input.user.email,
    ttlSec: input.ttlSec,
    extraClaims: input.extraClaims,
    sid: refresh.familyId,
  });
  return {
    token_type: "bearer" as const,
    access_token: access.token,
    refresh_token: refresh.refreshToken,
    expires_in: input.ttlSec,
    session_id: refresh.familyId,
  };
}
