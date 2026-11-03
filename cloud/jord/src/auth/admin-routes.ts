import { Hono } from "hono";

import type { JordDriverPort } from "@altr/jord";

import {
  createAdminUser,
  deleteAdminUser,
  getAdminUser,
  listUsers,
  logAdminUserAudit,
  patchAdminUser,
  revokeUserSessions,
  setUserDisabled,
  type AdminUserPatch,
} from "./admin.js";
import type { MailerPort } from "./mailer.js";
import {
  requireOperatorAdmin,
  type JordAuthVariables,
} from "./middleware.js";
import { loadAuthSettings } from "./settings.js";

const MAX_METADATA_CHARS = 16_384;

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return {};
    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}

type MetadataField =
  | { ok: true; value: Record<string, unknown> | undefined }
  | { ok: false; error: string };

function parseMetadataField(value: unknown, label: string): MetadataField {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: {} };
  if (typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: `${label} must be a JSON object` };
  }
  const text = JSON.stringify(value);
  if (text.length > MAX_METADATA_CHARS) {
    return {
      ok: false,
      error: `${label} must be at most ${MAX_METADATA_CHARS} characters`,
    };
  }
  return { ok: true, value: value as Record<string, unknown> };
}

function actorOf(c: {
  get: (key: "principal") => JordAuthVariables["principal"];
}): string | null {
  const principal = c.get("principal");
  return principal.uid ?? principal.role;
}

/** `/admin/auth/users*` — admin CRUD for end users (S0070). */
export function createAdminAuthUserRoutes(input: {
  jord: JordDriverPort;
  mailer: MailerPort;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();
  routes.use("*", requireOperatorAdmin());

  routes.get("/users", async (c) => {
    return c.json({ users: await listUsers(input.jord) });
  });

  routes.get("/users/:id", async (c) => {
    const user = await getAdminUser(input.jord, c.req.param("id"));
    if (!user) return c.json({ error: "user_not_found" }, 404);
    return c.json({ user });
  });

  routes.post("/users", async (c) => {
    const body = await readJson(c.req.raw);
    const userMetadata = parseMetadataField(body.user_metadata, "user_metadata");
    if (!userMetadata.ok) {
      return c.json({ error: "invalid_metadata", message: userMetadata.error }, 400);
    }
    const appMetadata = parseMetadataField(body.app_metadata, "app_metadata");
    if (!appMetadata.ok) {
      return c.json({ error: "invalid_metadata", message: appMetadata.error }, 400);
    }

    const mode =
      body.mode === "invite" ? "invite" : body.mode === "create" ? "create" : null;
    if (!mode) {
      return c.json({ error: "mode must be create or invite" }, 400);
    }
    const email = typeof body.email === "string" ? body.email : "";
    if (mode === "create" && typeof body.password !== "string") {
      return c.json({ error: "password is required for create" }, 400);
    }

    const settings = await loadAuthSettings(input.jord);
    const result = await input.enqueueWrite(() =>
      createAdminUser({
        jord: input.jord,
        mailer: input.mailer,
        email,
        mode,
        password:
          typeof body.password === "string" ? body.password : undefined,
        emailConfirm:
          typeof body.email_confirm === "boolean" ? body.email_confirm : undefined,
        userMetadata: userMetadata.value,
        appMetadata: appMetadata.value,
        minPasswordLength: settings.password_min_length,
      }),
    );
    if (!result.ok) {
      return c.json(
        {
          error: result.error,
          ...(result.details ? { details: result.details } : {}),
        },
        result.status,
      );
    }
    await logAdminUserAudit(input.jord, {
      actor: actorOf(c),
      userId: result.user.id,
      action: mode === "invite" ? "invited" : "created",
    });
    return c.json({ user: result.user }, 201);
  });

  routes.patch("/users/:id", async (c) => {
    const body = await readJson(c.req.raw);
    const userMetadata = parseMetadataField(body.user_metadata, "user_metadata");
    if (!userMetadata.ok) {
      return c.json({ error: "invalid_metadata", message: userMetadata.error }, 400);
    }
    const appMetadata = parseMetadataField(body.app_metadata, "app_metadata");
    if (!appMetadata.ok) {
      return c.json({ error: "invalid_metadata", message: appMetadata.error }, 400);
    }
    if (body.email_confirm !== undefined && typeof body.email_confirm !== "boolean") {
      return c.json({ error: "email_confirm must be a boolean" }, 400);
    }
    if (body.ban_reason !== undefined && body.ban_reason !== null && typeof body.ban_reason !== "string") {
      return c.json({ error: "ban_reason must be a string or null" }, 400);
    }

    const patch: AdminUserPatch = {};
    if (userMetadata.value !== undefined) patch.userMetadata = userMetadata.value;
    if (appMetadata.value !== undefined) patch.appMetadata = appMetadata.value;
    if (typeof body.email_confirm === "boolean") {
      patch.emailConfirmed = body.email_confirm;
    }
    if (body.ban_reason !== undefined) {
      patch.banReason =
        typeof body.ban_reason === "string" && body.ban_reason.trim() !== ""
          ? body.ban_reason.trim()
          : null;
    }
    if (Object.keys(patch).length === 0) {
      return c.json({ error: "nothing_to_update" }, 400);
    }

    const user = await input.enqueueWrite(() =>
      patchAdminUser({ jord: input.jord, userId: c.req.param("id"), patch }),
    );
    if (!user) return c.json({ error: "user_not_found" }, 404);
    await logAdminUserAudit(input.jord, {
      actor: actorOf(c),
      userId: user.id,
      action: "updated",
      detail: { fields: Object.keys(patch) },
    });
    return c.json({ user });
  });

  routes.post("/users/:id/ban", async (c) => {
    const body = await readJson(c.req.raw);
    const disabled = body.disabled !== false;
    const reason =
      typeof body.reason === "string" && body.reason.trim() !== ""
        ? body.reason.trim()
        : null;
    const user = await input.enqueueWrite(() =>
      setUserDisabled({
        jord: input.jord,
        userId: c.req.param("id"),
        disabled,
        reason,
      }),
    );
    if (!user) return c.json({ error: "user_not_found" }, 404);
    await logAdminUserAudit(input.jord, {
      actor: actorOf(c),
      userId: user.id,
      action: disabled ? "banned" : "unbanned",
      ...(reason ? { detail: { reason } } : {}),
    });
    return c.json({ user });
  });

  routes.post("/users/:id/revoke", async (c) => {
    const user = await getAdminUser(input.jord, c.req.param("id"));
    if (!user) return c.json({ error: "user_not_found" }, 404);
    const result = await input.enqueueWrite(() =>
      revokeUserSessions({ jord: input.jord, userId: user.id }),
    );
    await logAdminUserAudit(input.jord, {
      actor: actorOf(c),
      userId: user.id,
      action: "sessions_revoked",
      detail: { revoked: result.revoked },
    });
    return c.json(result);
  });

  routes.delete("/users/:id", async (c) => {
    const id = c.req.param("id");
    const deleted = await input.enqueueWrite(() =>
      deleteAdminUser({ jord: input.jord, userId: id }),
    );
    if (!deleted) return c.json({ error: "user_not_found" }, 404);
    await logAdminUserAudit(input.jord, {
      actor: actorOf(c),
      userId: id,
      action: "deleted",
    });
    return c.json({ ok: true as const, id });
  });

  return routes;
}
