import { randomUUID } from "node:crypto";

import { Hono } from "hono";

import type { JordDriverPort } from "@altr/jord";

import type { JwtKeyring } from "./keyring.js";
import {
  requireOperatorAdmin,
  type JordAuthVariables,
} from "./middleware.js";
import { loadAuthSettings, updateAuthSettings } from "./settings.js";

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return {};
    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function auditJwt(
  jord: JordDriverPort,
  input: { actor: string | null; action: string; detail?: Record<string, unknown> },
): Promise<void> {
  try {
    const meta = JSON.stringify({
      actor: input.actor,
      action: input.action,
      ...(input.detail ?? {}),
    });
    await jord.query(
      `INSERT INTO jord_logs (id, at, level, source, message, meta_json)
       VALUES (?, ?, 'info', 'auth.jwt', ?, ?)`,
      [randomUUID(), Date.now(), `jwt key ${input.action}`, meta],
    );
  } catch (err) {
    console.error("[@altr/jord-server] auth jwt audit failed", err);
  }
}

/** `GET/PATCH /admin/auth/settings` + JWT key routes — operator admin only. */
export function createAuthSettingsRoutes(input: {
  jord: JordDriverPort;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  keyring: JwtKeyring;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();
  routes.use("*", requireOperatorAdmin());

  routes.get("/settings", async (c) => {
    const [settings, key] = await Promise.all([
      loadAuthSettings(input.jord),
      input.keyring.info(),
    ]);
    return c.json({
      settings: {
        ...settings,
        jwt_key_fingerprint: key.fingerprint,
        jwt_key_rotated_at: key.rotatedAt,
        jwt_key_configured: key.configured,
        jwt_key_source: key.source,
      },
    });
  });

  routes.patch("/settings", async (c) => {
    const principal = c.get("principal");
    const body = await readJson(c.req.raw);
    const result = await updateAuthSettings({
      jord: input.jord,
      enqueueWrite: input.enqueueWrite,
      patch: body,
      updatedBy: principal.uid ?? principal.role,
    });
    if (!result.ok) {
      return c.json(
        {
          error: "invalid_auth_settings",
          message: "Auth settings failed validation.",
          details: result.errors,
        },
        400,
      );
    }
    return c.json({ settings: result.settings, changed: result.changed });
  });

  routes.get("/jwt", async (c) => {
    const [settings, key] = await Promise.all([
      loadAuthSettings(input.jord),
      input.keyring.info(),
    ]);
    return c.json({
      key,
      session_ttl_seconds: settings.session_ttl_seconds,
      custom_claims: settings.custom_claims,
    });
  });

  routes.post("/jwt/rotate", async (c) => {
    const principal = c.get("principal");
    try {
      const key = await input.keyring.rotate();
      await auditJwt(input.jord, {
        actor: principal.uid ?? principal.role,
        action: "rotated",
        detail: { fingerprint: key.fingerprint },
      });
      return c.json({
        key,
        invalidated: "all existing access tokens",
      });
    } catch (err) {
      return c.json(
        {
          error: "jwt_key_unavailable",
          message:
            err instanceof Error
              ? err.message
              : "JWT signing key rotation is unavailable.",
        },
        503,
      );
    }
  });

  routes.delete("/jwt/key", async (c) => {
    const principal = c.get("principal");
    const key = await input.keyring.reset();
    await auditJwt(input.jord, {
      actor: principal.uid ?? principal.role,
      action: "reset_to_env",
    });
    return c.json({ key });
  });

  return routes;
}
