import { randomUUID } from "node:crypto";

import { Hono } from "hono";

import type { JordDriverPort } from "@altr/jord";

import {
  AUTH_EMAIL_TEMPLATE_KEYS,
  renderAuthEmail,
  sampleEmailVariables,
  type AuthEmailTemplateKey,
} from "./email-templates.js";
import {
  DEFAULT_JWT_OVERLAP_SECONDS,
  auditKeyEvent,
  effectiveOverlapSeconds,
  parseOverlapSeconds,
} from "./key-sets.js";
import type { JwtKeyring } from "./keyring.js";
import { MailerError, type MailerPort } from "./mailer.js";
import type { RateLimitStore } from "../http/rate-limit-store.js";
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
  // Dialect-aware placeholders (the old inline `?` broke on Postgres).
  await auditKeyEvent(jord, {
    source: "auth.jwt",
    message: `jwt key ${input.action}`,
    actor: input.actor,
    action: input.action,
    detail: input.detail,
  });
}

function keyUnavailable(err: unknown, fallback: string): Response {
  return Response.json(
    {
      error: "jwt_key_unavailable",
      message: err instanceof Error ? err.message : fallback,
    },
    { status: 503 },
  );
}

async function auditEmail(
  jord: JordDriverPort,
  input: {
    actor: string | null;
    to: string;
    template: string;
    messageId: string | null;
  },
): Promise<void> {
  try {
    await jord.query(
      `INSERT INTO jord_logs (id, at, level, source, message, meta_json)
       VALUES (?, ?, 'info', 'auth.email', ?, ?)`,
      [
        randomUUID(),
        Date.now(),
        `email test send ${input.template}`,
        JSON.stringify(input),
      ],
    );
  } catch (err) {
    console.error("[@altr/jord-server] auth email audit failed", err);
  }
}

/** `GET/PATCH /admin/auth/settings` + JWT key routes — operator admin only. */
export function createAuthSettingsRoutes(input: {
  jord: JordDriverPort;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  keyring: JwtKeyring;
  mailer: MailerPort;
  /** Shared limiter for test sends (S0036); memory fallback when absent. */
  rateLimit?: RateLimitStore;
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
        email_provider: input.mailer.kind ?? "custom",
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
    // S0093: body `{ overlap_seconds?, revoke_previous? }`. Omitted overlap =
    // DEFAULT_JWT_OVERLAP_SECONDS (0: old tokens die at once); explicit 0 = none.
    const body = await readJson(c.req.raw);
    const overlap = parseOverlapSeconds(body.overlap_seconds);
    if (!overlap.ok) return c.json({ error: "invalid_overlap", message: overlap.error }, 400);
    const revokePrevious = body.revoke_previous === true;
    try {
      const key = await input.keyring.rotate({
        overlapSeconds: overlap.seconds,
        revokePrevious,
      });
      await auditJwt(input.jord, {
        actor: principal.uid ?? principal.role,
        action: "rotated",
        detail: {
          fingerprint: key.fingerprint,
          overlap_seconds: effectiveOverlapSeconds({
            overlapSeconds: overlap.seconds,
            revokePrevious,
            defaultSeconds: DEFAULT_JWT_OVERLAP_SECONDS,
          }),
          revoke_previous: revokePrevious,
          previous_expires_at: key.previous?.expiresAt ?? null,
        },
      });
      const until = key.previous?.expiresAt ?? null;
      return c.json({
        key,
        invalidated:
          until !== null
            ? `none until previous key expires at ${new Date(until).toISOString()}`
            : "all existing access tokens",
        // Anon keys are JWTs signed with the outgoing key: they stop verifying
        // when the overlap ends. Reissue (POST /auth/anon-key) and redeploy
        // clients before `anon_keys_valid_until`.
        anon_keys_affected: true as const,
        anon_keys_valid_until: until,
      });
    } catch (err) {
      return keyUnavailable(err, "JWT signing key rotation is unavailable.");
    }
  });

  routes.post("/email/send-test", async (c) => {
    const principal = c.get("principal");
    const actor = principal.uid ?? principal.role;
    const body = await readJson(c.req.raw);
    const to = typeof body.to === "string" ? body.to.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return c.json({ error: "invalid_recipient" }, 400);
    }
    const key = body.template;
    if (
      typeof key !== "string" ||
      !(AUTH_EMAIL_TEMPLATE_KEYS as readonly string[]).includes(key)
    ) {
      return c.json({ error: "unknown_template" }, 400);
    }

    if (input.rateLimit) {
      try {
        const hits = await input.rateLimit.hit(`admin:email-test:${actor}`, 60_000);
        if (hits > 10) return c.json({ error: "too_many_test_sends" }, 429);
      } catch (err) {
        console.error("[@altr/jord-server] test-send limiter failed", err);
      }
    }

    const settings = await loadAuthSettings(input.jord);
    const template = settings.email_templates[key as AuthEmailTemplateKey];
    const rendered = renderAuthEmail(template, {
      ...sampleEmailVariables(),
      email: to,
    });
    try {
      const result = await input.mailer.send({
        to,
        subject: rendered.subject,
        text: rendered.text,
        ...(rendered.html ? { html: rendered.html } : {}),
      });
      await auditEmail(input.jord, {
        actor,
        to,
        template: key,
        messageId: result?.messageId ?? null,
      });
      return c.json({
        ok: true as const,
        provider: input.mailer.kind ?? "custom",
        message_id: result?.messageId ?? null,
        subject: rendered.subject,
        to,
      });
    } catch (err) {
      const mailerErr =
        err instanceof MailerError
          ? err
          : null;
      return c.json(
        {
          error: "email_send_failed",
          code: mailerErr?.code ?? "provider_error",
          provider_status: mailerErr?.providerStatus ?? null,
          message: err instanceof Error ? err.message : "Mailer rejected the test",
        },
        502,
      );
    }
  });

  // S0093 — emergency: stop accepting the retiring key right now (stored
  // previous AND env JORD_JWT_SECRET_PREVIOUS) until the next rotation.
  routes.post("/jwt/revoke-previous", async (c) => {
    const principal = c.get("principal");
    try {
      const key = await input.keyring.revokePrevious();
      await auditJwt(input.jord, {
        actor: principal.uid ?? principal.role,
        action: "previous_revoked",
        detail: { fingerprint: key.fingerprint, previous_revoked: key.previousRevoked },
      });
      return c.json({ key });
    } catch (err) {
      return keyUnavailable(err, "JWT previous-key revoke failed.");
    }
  });

  routes.delete("/jwt/key", async (c) => {
    const principal = c.get("principal");
    try {
      const key = await input.keyring.reset();
      await auditJwt(input.jord, {
        actor: principal.uid ?? principal.role,
        action: "reset_to_env",
      });
      return c.json({ key });
    } catch (err) {
      return keyUnavailable(err, "JWT key reset failed.");
    }
  });

  return routes;
}
