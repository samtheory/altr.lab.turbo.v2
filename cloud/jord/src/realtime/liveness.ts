import type { JordDriverPort } from "@altr/jord";

import type { Principal } from "../auth/principal.js";
import { sessionLive } from "../auth/sessions.js";

/** Default cadence for re-checking a long-lived stream's session / access. */
export const REALTIME_RECHECK_MS = 30_000;

/**
 * Same rule as `createAuthMiddleware` (S0076), re-run on open streams so a
 * revoked or expired session eventually drops them. Principals without a
 * session id (operator, service, anon, legacy user tokens) are always live.
 * Fails closed on a store error.
 */
export async function principalSessionLive(
  jord: JordDriverPort,
  principal: Principal,
): Promise<boolean> {
  const sid = principal.claims.sid;
  if (principal.kind !== "user" || typeof sid !== "string" || !principal.uid) {
    return true;
  }
  try {
    return await sessionLive({ jord, id: sid, userId: principal.uid });
  } catch (err) {
    console.error("[@altr/jord-server] realtime session re-check failed", err);
    return false;
  }
}
