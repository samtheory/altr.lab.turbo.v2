/** Mirrors `@altr/jord-server` feature roles (Studio S3). Keep in sync. */

export const JORD_ROLES = ["admin", "editor", "readonly"] as const;

export type JordRole = (typeof JORD_ROLES)[number];

export function isJordRole(value: string): value is JordRole {
  return (JORD_ROLES as readonly string[]).includes(value);
}

export function canWriteRecords(role: JordRole): boolean {
  return role === "admin" || role === "editor";
}

export function canAlterSchema(role: JordRole): boolean {
  return role === "admin";
}
