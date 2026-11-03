/** Auth console user helpers (S0070). */

export const AUTH_USERS_CHANGED_EVENT = "jord:auth-users-changed";

export function emitAuthUsersChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_USERS_CHANGED_EVENT));
}

export type AuthAdminUser = {
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

export type AuthUserStatus = "active" | "unconfirmed" | "banned";

export function authUserStatus(user: AuthAdminUser): AuthUserStatus {
  if (user.disabledAt != null) return "banned";
  if (!user.emailConfirmed) return "unconfirmed";
  return "active";
}

export function authUserStatusLabel(status: AuthUserStatus): string {
  return status === "banned"
    ? "banned"
    : status === "unconfirmed"
      ? "unconfirmed"
      : "active";
}

export function filterAuthUsers(
  users: AuthAdminUser[],
  query: string,
): AuthAdminUser[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return users;
  return users.filter(
    (user) =>
      user.email.toLowerCase().includes(needle) ||
      user.id.toLowerCase().includes(needle),
  );
}

export const AUTH_USERS_PAGE_SIZE = 25;

export function paginateAuthUsers(
  users: AuthAdminUser[],
  page: number,
): { items: AuthAdminUser[]; page: number; pages: number; total: number } {
  const total = users.length;
  const pages = Math.max(1, Math.ceil(total / AUTH_USERS_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * AUTH_USERS_PAGE_SIZE;
  return {
    items: users.slice(start, start + AUTH_USERS_PAGE_SIZE),
    page: current,
    pages,
    total,
  };
}

export type MetadataParse =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

/** Editor text → metadata object. Arrays, scalars and invalid JSON fail. */
export function parseMetadataJson(text: string): MetadataParse {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, value: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Metadata must be a JSON object" };
  }
  return { ok: true, value: parsed as Record<string, unknown> };
}

export function stringifyMetadata(value: Record<string, unknown>): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

/** Compact one-line preview for list rows. */
export function metadataKeys(value: Record<string, unknown>): string {
  const keys = Object.keys(value);
  return keys.length === 0 ? "no metadata" : keys.join(", ");
}
