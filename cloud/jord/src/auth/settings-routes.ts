import { Hono } from "hono";

import type { JordDriverPort } from "@altr/jord";

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

/** `GET/PATCH /admin/auth/settings` — operator admin only (S0069). */
export function createAuthSettingsRoutes(input: {
  jord: JordDriverPort;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();
  routes.use("*", requireOperatorAdmin());

  routes.get("/settings", async (c) => {
    return c.json({ settings: await loadAuthSettings(input.jord) });
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

  return routes;
}
