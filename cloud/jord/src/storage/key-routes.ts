import { Hono } from "hono";

import type { JordDriverPort } from "@altr/jord";

import {
  DEFAULT_BLOB_OVERLAP_SECONDS,
  auditKeyEvent,
  effectiveOverlapSeconds,
  parseOverlapSeconds,
} from "../auth/key-sets.js";
import {
  requireOperatorAdmin,
  type JordAuthVariables,
} from "../auth/middleware.js";
import type { BlobKeySet } from "./blob-keys.js";

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return {};
    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * S0093 — `/admin/storage/keys*`: blob signed-URL HMAC key set.
 * Operator admin only. Responses and audit rows carry fingerprints and expiry,
 * never key material.
 */
export function createBlobKeyRoutes(input: {
  jord: JordDriverPort;
  keys: BlobKeySet;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();
  routes.use("*", requireOperatorAdmin());

  routes.get("/", async (c) => {
    await input.keys.ready();
    return c.json({ key: input.keys.info() });
  });

  routes.post("/rotate", async (c) => {
    const principal = c.get("principal");
    const actor = principal.uid ?? principal.role;
    const body = await readJson(c.req.raw);
    const overlap = parseOverlapSeconds(body.overlap_seconds);
    if (!overlap.ok) {
      return c.json({ error: "invalid_overlap", message: overlap.error }, 400);
    }
    const revokePrevious = body.revoke_previous === true;
    try {
      const key = await input.keys.rotate({
        overlapSeconds: overlap.seconds,
        revokePrevious,
      });
      await auditKeyEvent(input.jord, {
        source: "storage.keys",
        message: "blob signing key rotated",
        actor,
        action: "rotated",
        detail: {
          key: "blob_hmac",
          fingerprint: key.fingerprint,
          overlap_seconds: effectiveOverlapSeconds({
            overlapSeconds: overlap.seconds,
            revokePrevious,
            defaultSeconds: DEFAULT_BLOB_OVERLAP_SECONDS,
          }),
          revoke_previous: revokePrevious,
          previous_expires_at: key.previous?.expiresAt ?? null,
        },
      });
      return c.json({ key });
    } catch (err) {
      return c.json(
        {
          error: "blob_key_unavailable",
          message:
            err instanceof Error ? err.message : "blob key rotation failed",
        },
        503,
      );
    }
  });

  routes.post("/revoke-previous", async (c) => {
    const principal = c.get("principal");
    try {
      const key = await input.keys.revokePrevious();
      await auditKeyEvent(input.jord, {
        source: "storage.keys",
        message: "blob signing previous key revoked",
        actor: principal.uid ?? principal.role,
        action: "previous_revoked",
        detail: {
          key: "blob_hmac",
          fingerprint: key.fingerprint,
          previous_revoked: key.previousRevoked,
        },
      });
      return c.json({ key });
    } catch (err) {
      return c.json(
        {
          error: "blob_key_unavailable",
          message: err instanceof Error ? err.message : "revoke failed",
        },
        503,
      );
    }
  });

  return routes;
}
