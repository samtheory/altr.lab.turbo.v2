import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { JordDriverPort } from "@altr/jord";

import type { MailerPort } from "./mailer.js";
import {
  dummyPasswordHash,
  hashPassword,
  passwordPolicyError,
  verifyPassword,
} from "./password.js";

const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  emailConfirmed: boolean;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "t";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.length > 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function q(
  jord: JordDriverPort,
  sql: string,
  args: Array<string | number | null> = [],
): Promise<Array<Record<string, unknown>>> {
  if (!jord.query) {
    throw new Error("[@altr/jord-server] driver has no query()");
  }
  if (jord.dialect === "postgres") {
    let i = 0;
    const text = sql.replace(/\?/g, () => `$${++i}`);
    return jord.query(text, args);
  }
  return jord.query(sql, args);
}

type AuthUserRow = AuthUser & { disabledAt: number | null };

function mapUser(row: Record<string, unknown>): AuthUserRow {
  return {
    id: asString(row.id),
    email: asString(row.email),
    passwordHash: asString(row.password_hash),
    emailConfirmed: asBool(row.email_confirmed),
    disabledAt: row.disabled_at == null ? null : Number(row.disabled_at),
  };
}

async function findUserByEmail(
  jord: JordDriverPort,
  email: string,
): Promise<AuthUserRow | null> {
  const rows = await q(
    jord,
    "SELECT id, email, password_hash, email_confirmed, disabled_at FROM jord_users WHERE email = ?",
    [email],
  );
  const row = rows[0];
  return row ? mapUser(row) : null;
}

async function findUserById(
  jord: JordDriverPort,
  id: string,
): Promise<AuthUserRow | null> {
  const rows = await q(
    jord,
    "SELECT id, email, password_hash, email_confirmed, disabled_at FROM jord_users WHERE id = ?",
    [id],
  );
  const row = rows[0];
  return row ? mapUser(row) : null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function signupUser(input: {
  jord: JordDriverPort;
  mailer: MailerPort;
  email: string;
  password: string;
  nowMs?: number;
  /** S0069: skip the confirm mail and mark the account confirmed. */
  autoconfirm?: boolean;
  /** S0069: project password policy (defaults to 10). */
  minPasswordLength?: number;
}): Promise<{ ok: true } | { ok: false; error: "invalid_password" | "invalid_email" }> {
  const email = normalizeEmail(input.email);
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    return { ok: false, error: "invalid_email" };
  }
  if (
    passwordPolicyError(input.password, email, {
      minLength: input.minPasswordLength,
    })
  ) {
    return { ok: false, error: "invalid_password" };
  }
  const now = input.nowMs ?? Date.now();
  const passwordHash = await hashPassword(input.password);
  const existing = await findUserByEmail(input.jord, email);
  if (!existing) {
    const id = randomUUID();
    const autoconfirm = input.autoconfirm === true;
    const confirmed = autoconfirm
      ? input.jord.dialect === "postgres"
        ? "TRUE"
        : "1"
      : input.jord.dialect === "postgres"
        ? "FALSE"
        : "0";
    await q(
      input.jord,
      `INSERT INTO jord_users (id, email, password_hash, email_confirmed, created_at, updated_at) VALUES (?, ?, ?, ${confirmed}, ?, ?)`,
      [id, email, passwordHash, now, now],
    );
    if (!autoconfirm) {
      const token = randomBytes(32).toString("base64url");
      await q(
        input.jord,
        "INSERT INTO jord_auth_tokens (id, user_id, purpose, token_hash, expires_at, used_at, created_at) VALUES (?, ?, 'confirm', ?, ?, NULL, ?)",
        [randomUUID(), id, sha256(token), now + CONFIRM_TTL_MS, now],
      );
      await input.mailer.send({
        to: email,
        subject: "Confirm your Jord account",
        text: `confirm:${token}`,
      });
    }
  }
  return { ok: true };
}

export async function signinUser(input: {
  jord: JordDriverPort;
  email: string;
  password: string;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: "invalid_credentials" }> {
  const email = normalizeEmail(input.email);
  const user = email ? await findUserByEmail(input.jord, email) : null;
  const hash = user?.passwordHash ?? (await dummyPasswordHash());
  const match = await verifyPassword(input.password, hash);
  if (!user || !match || !user.emailConfirmed || user.disabledAt != null) {
    return { ok: false, error: "invalid_credentials" };
  }
  await q(
    input.jord,
    "UPDATE jord_users SET last_sign_in_at = ? WHERE id = ?",
    [Date.now(), user.id],
  );
  return { ok: true, user };
}

async function consumeOneTime(input: {
  jord: JordDriverPort;
  purpose: "confirm" | "reset";
  token: string;
  nowMs: number;
}): Promise<AuthUser | null> {
  const rows = await q(
    input.jord,
    "SELECT id, user_id, expires_at, used_at FROM jord_auth_tokens WHERE token_hash = ? AND purpose = ?",
    [sha256(input.token), input.purpose],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.used_at != null) return null;
  const expires = asNumber(row.expires_at);
  if (expires == null || expires < input.nowMs) return null;
  await q(
    input.jord,
    "UPDATE jord_auth_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL",
    [input.nowMs, asString(row.id)],
  );
  return findUserById(input.jord, asString(row.user_id));
}

export async function confirmUser(input: {
  jord: JordDriverPort;
  token: string;
  nowMs?: number;
}): Promise<boolean> {
  const now = input.nowMs ?? Date.now();
  const user = await consumeOneTime({
    jord: input.jord,
    purpose: "confirm",
    token: input.token,
    nowMs: now,
  });
  if (!user) return false;
  const confirmed = input.jord.dialect === "postgres" ? "TRUE" : "1";
  await q(
    input.jord,
    `UPDATE jord_users SET email_confirmed = ${confirmed}, updated_at = ? WHERE id = ?`,
    [now, user.id],
  );
  return true;
}

export async function recoverUser(input: {
  jord: JordDriverPort;
  mailer: MailerPort;
  email: string;
  nowMs?: number;
}): Promise<{ ok: true }> {
  const email = normalizeEmail(input.email);
  await verifyPassword(email || "missing", await dummyPasswordHash());
  const user = email ? await findUserByEmail(input.jord, email) : null;
  if (user) {
    const now = input.nowMs ?? Date.now();
    const token = randomBytes(32).toString("base64url");
    await q(
      input.jord,
      "INSERT INTO jord_auth_tokens (id, user_id, purpose, token_hash, expires_at, used_at, created_at) VALUES (?, ?, 'reset', ?, ?, NULL, ?)",
      [randomUUID(), user.id, sha256(token), now + RESET_TTL_MS, now],
    );
    await input.mailer.send({
      to: email,
      subject: "Reset your Jord password",
      text: `reset:${token}`,
    });
  }
  return { ok: true };
}

export async function resetUserPassword(input: {
  jord: JordDriverPort;
  token: string;
  password: string;
  nowMs?: number;
  /** S0069: project password policy (defaults to 10). */
  minPasswordLength?: number;
}): Promise<{ ok: true } | { ok: false; error: "invalid_token" | "invalid_password" }> {
  const now = input.nowMs ?? Date.now();
  const user = await consumeOneTime({
    jord: input.jord,
    purpose: "reset",
    token: input.token,
    nowMs: now,
  });
  if (!user) return { ok: false, error: "invalid_token" };
  if (
    passwordPolicyError(input.password, user.email, {
      minLength: input.minPasswordLength,
    })
  ) {
    return { ok: false, error: "invalid_password" };
  }
  const passwordHash = await hashPassword(input.password);
  await q(
    input.jord,
    "UPDATE jord_users SET password_hash = ?, updated_at = ? WHERE id = ?",
    [passwordHash, now, user.id],
  );
  await q(
    input.jord,
    "UPDATE jord_refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
    [now, user.id],
  );
  return { ok: true };
}

export async function issueRefreshToken(input: {
  jord: JordDriverPort;
  userId: string;
  familyId?: string;
  nowMs?: number;
}): Promise<{ refreshToken: string; familyId: string }> {
  const now = input.nowMs ?? Date.now();
  const refreshToken = randomBytes(32).toString("base64url");
  const familyId = input.familyId ?? randomUUID();
  await q(
    input.jord,
    "INSERT INTO jord_refresh_tokens (id, family_id, user_id, token_hash, expires_at, revoked_at, replaced_by, created_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)",
    [
      randomUUID(),
      familyId,
      input.userId,
      sha256(refreshToken),
      now + REFRESH_TTL_MS,
      now,
    ],
  );
  return { refreshToken, familyId };
}

export type RefreshResult =
  | { ok: true; user: AuthUser; refreshToken: string }
  | { ok: false; error: "invalid_refresh" | "refresh_reused" };

export async function rotateRefreshToken(input: {
  jord: JordDriverPort;
  refreshToken: string;
  nowMs?: number;
}): Promise<RefreshResult> {
  const now = input.nowMs ?? Date.now();
  const rows = await q(
    input.jord,
    "SELECT id, family_id, user_id, expires_at, revoked_at, replaced_by FROM jord_refresh_tokens WHERE token_hash = ?",
    [sha256(input.refreshToken)],
  );
  const row = rows[0];
  if (!row) return { ok: false, error: "invalid_refresh" };
  const familyId = asString(row.family_id);
  const reused = row.revoked_at != null || row.replaced_by != null;
  if (reused) {
    await q(
      input.jord,
      "UPDATE jord_refresh_tokens SET revoked_at = ? WHERE family_id = ? AND revoked_at IS NULL",
      [now, familyId],
    );
    return { ok: false, error: "refresh_reused" };
  }
  const expires = asNumber(row.expires_at);
  if (expires == null || expires < now) {
    return { ok: false, error: "invalid_refresh" };
  }
  const user = await findUserById(input.jord, asString(row.user_id));
  if (!user) return { ok: false, error: "invalid_refresh" };
  const next = await issueRefreshToken({
    jord: input.jord,
    userId: user.id,
    familyId,
    nowMs: now,
  });
  await q(
    input.jord,
    "UPDATE jord_refresh_tokens SET revoked_at = ?, replaced_by = ? WHERE id = ?",
    [now, sha256(next.refreshToken), asString(row.id)],
  );
  return { ok: true, user, refreshToken: next.refreshToken };
}

export async function revokeRefreshFamily(input: {
  jord: JordDriverPort;
  refreshToken: string;
  nowMs?: number;
}): Promise<void> {
  const now = input.nowMs ?? Date.now();
  const rows = await q(
    input.jord,
    "SELECT family_id FROM jord_refresh_tokens WHERE token_hash = ?",
    [sha256(input.refreshToken)],
  );
  const familyId = rows[0] ? asString(rows[0].family_id) : "";
  if (!familyId) return;
  await q(
    input.jord,
    "UPDATE jord_refresh_tokens SET revoked_at = ? WHERE family_id = ? AND revoked_at IS NULL",
    [now, familyId],
  );
}
