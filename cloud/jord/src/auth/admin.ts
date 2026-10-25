import type { JordDriverPort } from "@altr/jord";

export type AdminUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  disabledAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export async function listUsers(jord: JordDriverPort): Promise<AdminUser[]> {
  const rows = await jord.query(
    `SELECT id, email, email_confirmed, disabled_at, created_at, updated_at FROM jord_users ORDER BY created_at DESC`,
  );
  return rows.map(mapUser);
}

export async function setUserDisabled(input: {
  jord: JordDriverPort;
  userId: string;
  disabled: boolean;
}): Promise<AdminUser | null> {
  const now = Date.now();
  const disabledAt = input.disabled ? now : null;
  await input.jord.query(
    input.jord.dialect === "postgres"
      ? `UPDATE jord_users SET disabled_at = $1, updated_at = $2 WHERE id = $3`
      : `UPDATE jord_users SET disabled_at = ?, updated_at = ? WHERE id = ?`,
    [disabledAt, now, input.userId],
  );
  if (input.disabled) {
    await input.jord.query(
      input.jord.dialect === "postgres"
        ? `UPDATE jord_refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL`
        : `UPDATE jord_refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
      [now, input.userId],
    );
  }
  const rows = await input.jord.query(
    input.jord.dialect === "postgres"
      ? `SELECT id, email, email_confirmed, disabled_at, created_at, updated_at FROM jord_users WHERE id = $1 LIMIT 1`
      : `SELECT id, email, email_confirmed, disabled_at, created_at, updated_at FROM jord_users WHERE id = ? LIMIT 1`,
    [input.userId],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function revokeUserSessions(input: {
  jord: JordDriverPort;
  userId: string;
}): Promise<{ revoked: number }> {
  const now = Date.now();
  await input.jord.query(
    input.jord.dialect === "postgres"
      ? `UPDATE jord_refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL`
      : `UPDATE jord_refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`,
    [now, input.userId],
  );
  return { revoked: 1 };
}

function mapUser(row: Record<string, unknown>): AdminUser {
  return {
    id: String(row.id),
    email: String(row.email),
    emailConfirmed: Boolean(row.email_confirmed),
    disabledAt: row.disabled_at == null ? null : Number(row.disabled_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}
