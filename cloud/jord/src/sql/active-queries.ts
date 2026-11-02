/**
 * In-flight Studio SQL queries keyed by client-supplied id (S0065).
 * Cancel aborts the AbortController passed into `executeSql`.
 */

export type ActiveSqlQuery = {
  controller: AbortController;
  startedAt: number;
};

const active = new Map<string, ActiveSqlQuery>();

const MAX_QUERY_ID_LEN = 64;
const QUERY_ID_RE = /^[A-Za-z0-9._:-]+$/;

export function normalizeSqlQueryId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!id || id.length > MAX_QUERY_ID_LEN) return null;
  if (!QUERY_ID_RE.test(id)) return null;
  return id;
}

export function registerActiveSqlQuery(id: string): AbortController {
  const existing = active.get(id);
  if (existing) {
    existing.controller.abort();
    active.delete(id);
  }
  const controller = new AbortController();
  active.set(id, { controller, startedAt: Date.now() });
  return controller;
}

export function unregisterActiveSqlQuery(id: string, controller: AbortController): void {
  const current = active.get(id);
  if (current?.controller === controller) active.delete(id);
}

/** Returns true when a running (not-yet-aborted) query was signalled. */
export function cancelActiveSqlQuery(id: string): boolean {
  const current = active.get(id);
  if (!current || current.controller.signal.aborted) return false;
  current.controller.abort();
  return true;
}

export function activeSqlQueryCount(): number {
  return active.size;
}

/** Test helper — clears the registry between cases. */
export function resetActiveSqlQueries(): void {
  for (const entry of active.values()) entry.controller.abort();
  active.clear();
}
