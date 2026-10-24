/** Feature roles for Jord Studio / API (S3). Not SQL policies (S7). */

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

/** Enable/disable generated API resources (Studio S4). Admin only. */
export function canManageApis(role: JordRole): boolean {
  return role === "admin";
}

/** Create / update / run / delete scheduled jobs (Studio S5). Admin only. */
export function canManageJobs(role: JordRole): boolean {
  return role === "admin";
}

/** Invoke custom / function APIs (Studio S6). Editor + admin; not readonly. */
export function canInvokeApis(role: JordRole): boolean {
  return role === "admin" || role === "editor";
}

/** Open the records SSE stream (Studio S9). Mutate stays on canWriteRecords. */
export function canSubscribeRealtime(role: JordRole): boolean {
  return role === "admin" || role === "editor" || role === "readonly";
}

/** Create blob buckets (Studio S10). Admin only. */
export function canManageBlobs(role: JordRole): boolean {
  return role === "admin";
}

/** Upload / delete blob objects (Studio S10). Same as write records. */
export function canWriteBlobs(role: JordRole): boolean {
  return role === "admin" || role === "editor";
}
