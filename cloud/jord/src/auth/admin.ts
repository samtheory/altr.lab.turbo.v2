import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { JordDriverPort } from "@altr/jord";

import { sendAuthEmail } from "./email-send.js";
import type { MailerPort } from "./mailer.js";
import { hashPassword, passwordPolicyError } from "./password.js";

const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;

export type AdminUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  disabledAt: number | null;
  banReason: string | null;
  userMetadata: Record<string, unknown>;
  appMetadata: Record<string, unknown>;
  lastSignInAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type AdminUserPatch = {
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
  emailConfirmed?: boolean;
  banReason?: string | null;
};

const USER_COLUMNS =
  "id, email, email_confirmed, disabled_at, ban_reason, user_metadata, app_metadata, last_sign_in_at, created_at, updated_at";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || value.trim() === "") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function mapUser(row: Record<string, unknown>): AdminUser {
  return {
    id: String(row.id),
    email: String(row.email),
    emailConfirmed: Boolean(row.email_confirmed),
    disabledAt: row.disabled_at == null ? null : Number(row.disabled_at),
    banReason: typeof row.ban_reason === "string" ? row.ban_reason : null,
    userMetadata: jsonObject(row.user_metadata),
    appMetadata: jsonObject(row.app_metadata),
    lastSignInAt:
      row.last_sign_in_at == null ? null : Number(row.last_sign_in_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

async function q(
  jord: JordDriverPort,
  sql: string,
  args: Array<string | number | null | boolean> = [],
): Promise<Array<Record<string, unknown>>> {
  if (jord.dialect === "postgres") {
    let index = 0;
    const text = sql.replace(/\?/g, () => `$${++index}`);
    // Postgres accepts real booleans; the port's arg type predates them.
    return jord.query(text, args as Array<string | number | null>);
  }
  return jord.query(sql, args as Array<string | number | null>);
}

export async function listUsers(jord: JordDriverPort): Promise<AdminUser[]> {
  const rows = await q(
    jord,
    `SELECT ${USER_COLUMNS} FROM jord_users ORDER BY created_at DESC`,
  );
  return rows.map(mapUser);
}

export async function getAdminUser(
  jord: JordDriverPort,
  userId: string,
): Promise<AdminUser | null> {
  const rows = await q(
    jord,
    `SELECT ${USER_COLUMNS} FROM jord_users WHERE id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function setUserDisabled(input: {
  jord: JordDriverPort;
  userId: string;
  disabled: boolean;
  reason?: string | null;
}): Promise<AdminUser | null> {
  const existing = await getAdminUser(input.jord, input.userId);
  if (!existing) return null;
  const now = Date.now();
  await q(
    input.jord,
    "UPDATE jord_users SET disabled_at = ?, ban_reason = ?, updated_at = ? WHERE id = ?",
    [input.disabled ? now : null, input.disabled ? (input.reason ?? null) : null, now, input.userId],
  );
  if (input.disabled) {
    await q(
      input.jord,
      "UPDATE jord_refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
      [now, input.userId],
    );
  }
  return getAdminUser(input.jord, input.userId);
}

export async function revokeUserSessions(input: {
  jord: JordDriverPort;
  userId: string;
}): Promise<{ revoked: number }> {
  const rows = await q(
    input.jord,
    "SELECT COUNT(*) AS n FROM jord_refresh_tokens WHERE user_id = ? AND revoked_at IS NULL",
    [input.userId],
  );
  const revoked = Number(rows[0]?.n ?? 0);
  await q(
    input.jord,
    "UPDATE jord_refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
    [Date.now(), input.userId],
  );
  return { revoked };
}

export type CreateAdminUserInput = {
  jord: JordDriverPort;
  mailer: MailerPort;
  email: string;
  password?: string;
  mode?: "create" | "invite";
  emailConfirm?: boolean;
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
  minPasswordLength?: number;
};

export type CreateAdminUserResult =
  | { ok: true; user: AdminUser }
  | {
      ok: false;
      status: 400 | 409;
      error: string;
      details?: string[];
    };

export async function createAdminUser(
  input: CreateAdminUserInput,
): Promise<CreateAdminUserResult> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    return { ok: false, status: 400, error: "invalid_email" };
  }

  const mode = input.mode ?? "create";
  const password = input.password ?? "";
  if (mode === "create") {
    const policy = passwordPolicyError(password, email, {
      minLength: input.minPasswordLength,
    });
    if (policy) {
      return { ok: false, status: 400, error: "invalid_password", details: [policy] };
    }
  }

  const existing = await q(
    input.jord,
    "SELECT id FROM jord_users WHERE email = ? LIMIT 1",
    [email],
  );
  if (existing.length > 0) {
    return { ok: false, status: 409, error: "email_exists" };
  }

  const id = randomUUID();
  const now = Date.now();
  const plainPassword =
    mode === "invite" || !password
      ? randomBytes(32).toString("base64url")
      : password;
  const passwordHash = await hashPassword(plainPassword);
  const confirmed =
    mode === "invite" ? false : (input.emailConfirm ?? true);
  const confirmedParam =
    input.jord.dialect === "postgres" ? confirmed : confirmed ? 1 : 0;

  await q(
    input.jord,
    `INSERT INTO jord_users (
      id, email, password_hash, email_confirmed, disabled_at, ban_reason,
      user_metadata, app_metadata, last_sign_in_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, NULL, ?, ?)`,
    [
      id,
      email,
      passwordHash,
      confirmedParam,
      JSON.stringify(input.userMetadata ?? {}),
      JSON.stringify(input.appMetadata ?? {}),
      now,
      now,
    ],
  );

  if (!confirmed) {
    const token = randomBytes(32).toString("base64url");
    await q(
      input.jord,
      "INSERT INTO jord_auth_tokens (id, user_id, purpose, token_hash, expires_at, used_at, created_at) VALUES (?, ?, 'confirm', ?, ?, NULL, ?)",
      [randomUUID(), id, sha256(token), now + CONFIRM_TTL_MS, now],
    );
    await sendAuthEmail({
      jord: input.jord,
      mailer: input.mailer,
      kind: mode === "invite" ? "invite" : "confirm",
      to: email,
      token,
      expiresInSeconds: CONFIRM_TTL_MS / 1000,
    });
  }

  const user = await getAdminUser(input.jord, id);
  if (!user) {
    return { ok: false, status: 400, error: "user_readback_failed" };
  }
  return { ok: true, user };
}

export async function patchAdminUser(input: {
  jord: JordDriverPort;
  userId: string;
  patch: AdminUserPatch;
}): Promise<AdminUser | null> {
  const existing = await getAdminUser(input.jord, input.userId);
  if (!existing) return null;
  const next: AdminUserPatch = {
    userMetadata: input.patch.userMetadata ?? existing.userMetadata,
    appMetadata: input.patch.appMetadata ?? existing.appMetadata,
    emailConfirmed: input.patch.emailConfirmed ?? existing.emailConfirmed,
    banReason:
      input.patch.banReason !== undefined
        ? input.patch.banReason
        : existing.banReason,
  };
  const now = Date.now();
  const confirmedParam =
    input.jord.dialect === "postgres"
      ? next.emailConfirmed === true
      : next.emailConfirmed === true
        ? 1
        : 0;
  await q(
    input.jord,
    `UPDATE jord_users SET
      user_metadata = ?, app_metadata = ?, email_confirmed = ?, ban_reason = ?, updated_at = ?
     WHERE id = ?`,
    [
      JSON.stringify(next.userMetadata ?? {}),
      JSON.stringify(next.appMetadata ?? {}),
      confirmedParam,
      next.banReason ?? null,
      now,
      input.userId,
    ],
  );
  return getAdminUser(input.jord, input.userId);
}

export async function deleteAdminUser(input: {
  jord: JordDriverPort;
  userId: string;
}): Promise<boolean> {
  const existing = await getAdminUser(input.jord, input.userId);
  if (!existing) return false;
  await q(input.jord, "DELETE FROM jord_auth_tokens WHERE user_id = ?", [
    input.userId,
  ]);
  await q(input.jord, "DELETE FROM jord_refresh_tokens WHERE user_id = ?", [
    input.userId,
  ]);
  await q(input.jord, "DELETE FROM jord_users WHERE id = ?", [input.userId]);
  return true;
}

/** Audit row for every admin user mutation; never includes secrets. */
export async function logAdminUserAudit(
  jord: JordDriverPort,
  input: {
    actor: string | null;
    userId: string;
    action: string;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const meta = JSON.stringify({
      actor: input.actor,
      userId: input.userId,
      action: input.action,
      ...(input.detail ?? {}),
    });
    await q(
      jord,
      `INSERT INTO jord_logs (id, at, level, source, message, meta_json)
       VALUES (?, ?, 'info', 'auth.users', ?, ?)`,
      [randomUUID(), Date.now(), `user ${input.action}`, meta],
    );
  } catch (err) {
    console.error("[@altr/jord-server] auth user audit failed", err);
  }
}
