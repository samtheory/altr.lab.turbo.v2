import { isCustomApiEnvDisabled } from "./slug.js";

/**
 * Single exposure decision for a custom API row, shared by `/x/:slug` and
 * `POST /api/v1/rpc/:fn`: the row must be enabled and not listed in the
 * `JORD_CUSTOM_API_DISABLED` kill switch (by id or slug).
 */
export function isCustomApiExposed(
  api: { id: string; slug: string; enabled: boolean },
  envDisabled: Set<string>,
): boolean {
  return api.enabled && !isCustomApiEnvDisabled(api, envDisabled);
}
