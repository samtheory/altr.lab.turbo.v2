import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import { createWriteQueue } from "../queue.js";
import type { JordAuthConfig } from "./config.js";
import {
  defaultAuthEmailTemplates,
  renderAuthEmail,
} from "./email-templates.js";
import { ConsoleMailer, type MailerPort, type OutboundMail } from "./mailer.js";
import { signSessionToken } from "./token.js";

const temps: string[] = [];

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "test-jwt-secret",
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

class StubMailer implements MailerPort {
  readonly kind = "stub";
  readonly sent: OutboundMail[] = [];
  async send(message: OutboundMail) {
    this.sent.push(message);
    return { messageId: `stub-${this.sent.length}` };
  }
}

class FailingMailer implements MailerPort {
  readonly kind = "failing";
  async send(): Promise<void> {
    throw new Error("provider down");
  }
}

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (!dir) continue;
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

async function boot(options?: { mailer?: MailerPort }) {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-email-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const mailer = options?.mailer ?? new ConsoleMailer();
  const app = createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    mailer,
  });
  return { app, jord, mailer };
}

function admin(): Record<string, string> {
  return { authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}` };
}

async function patch(
  app: ReturnType<typeof createJordApp>,
  body: Record<string, unknown>,
) {
  return app.request("/admin/auth/settings", {
    method: "PATCH",
    headers: { ...admin(), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function signup(
  app: ReturnType<typeof createJordApp>,
  email: string,
  password = "correct-horse",
) {
  return app.request("/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

describe("auth email templates S0072", () => {
  it("renders defaults and uses them for signup mail", async () => {
    const ctx = await boot();
    try {
      const rendered = renderAuthEmail(defaultAuthEmailTemplates().confirm, {
        email: "ada@lab.test",
        token: "tok",
        link: "https://app.test/cb",
        expires_in: "24 hours",
        project: "Jord",
        app_name: "Jord",
      });
      expect(rendered.subject).toBe("Confirm your Jord account");
      expect(rendered.text).toContain("confirm:tok");
      expect(rendered.html).toContain("https://app.test/cb");

      expect((await signup(ctx.app, "ada@lab.test")).status).toBe(200);
      const sent = ctx.mailer.sent ?? [];
      const mail = sent[0];
      expect(mail?.subject).toBe("Confirm your Jord account");
      expect(mail?.text).toContain("confirm:");
      expect(mail?.text).toContain("ada@lab.test");
      expect(mail?.html != null).toBe(true);
    } finally {
      await ctx.jord.close();
    }
  });

  it("escapes user-controlled values in HTML and rejects unknown variables", async () => {
    const ctx = await boot();
    try {
      const badVariable = await patch(ctx.app, {
        email_templates: {
          confirm: {
            subject: "Hi",
            text: "{{nope}}",
            html: null,
          },
        },
      });
      expect(badVariable.status).toBe(400);

      const escaped = renderAuthEmail(
        {
          subject: "Welcome {{email}}",
          text: "confirm:{{token}} · {{email}}",
          html: "<p>{{email}}</p>",
        },
        {
          email: '<script>alert("x")</script>@lab.test',
          token: "tok",
        },
      );
      expect(escaped.html).toBe(
        "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;@lab.test</p>",
      );
      expect(escaped.text).toContain('<script>alert("x")</script>@lab.test');

      const good = await patch(ctx.app, {
        email_templates: {
          confirm: {
            subject: "Welcome {{email}}",
            text: "confirm:{{token}}",
            html: "<p>{{email}}</p>",
          },
        },
      });
      expect(good.status).toBe(200);

      expect((await signup(ctx.app, "ada+tag@lab.test")).status).toBe(200);
      const sent = ctx.mailer.sent ?? [];
      const mail = sent[0];
      if (mail?.html == null) {
        throw new Error("console mailer did not send HTML");
      }
      expect(mail.html).toBe("<p>ada+tag@lab.test</p>");
      expect(mail.text).toContain("confirm:");
    } finally {
      await ctx.jord.close();
    }
  });

  it("sends a test through the configured mailer and reports the id", async () => {
    const mailer = new StubMailer();
    const ctx = await boot({ mailer });
    try {
      const res = await ctx.app.request("/admin/auth/email/send-test", {
        method: "POST",
        headers: { ...admin(), "content-type": "application/json" },
        body: JSON.stringify({ to: "ops@lab.test", template: "reset" }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        ok: true,
        provider: "stub",
        message_id: "stub-1",
        subject: "Reset your Jord password",
        to: "ops@lab.test",
      });
      expect(mailer.sent[0]?.text).toContain("reset:sample-token");
      expect(mailer.sent[0]?.html).toContain("ops@lab.test");

      const audit = await ctx.jord.query(
        "SELECT source FROM jord_logs WHERE source = 'auth.email'",
      );
      expect(audit).toHaveLength(1);

      const settings = await ctx.app.request("/admin/auth/settings", {
        headers: admin(),
      });
      expect(
        ((await settings.json()) as { settings: Record<string, unknown> })
          .settings.email_provider,
      ).toBe("stub");
    } finally {
      await ctx.jord.close();
    }
  });

  it("validates the test request and surfaces provider failures", async () => {
    const mailer = new FailingMailer();
    const ctx = await boot({ mailer });
    try {
      const badRecipient = await ctx.app.request(
        "/admin/auth/email/send-test",
        {
          method: "POST",
          headers: { ...admin(), "content-type": "application/json" },
          body: JSON.stringify({ to: "not-an-email", template: "confirm" }),
        },
      );
      expect(badRecipient.status).toBe(400);

      const badTemplate = await ctx.app.request(
        "/admin/auth/email/send-test",
        {
          method: "POST",
          headers: { ...admin(), "content-type": "application/json" },
          body: JSON.stringify({ to: "ops@lab.test", template: "nope" }),
        },
      );
      expect(badTemplate.status).toBe(400);

      const failed = await ctx.app.request("/admin/auth/email/send-test", {
        method: "POST",
        headers: { ...admin(), "content-type": "application/json" },
        body: JSON.stringify({ to: "ops@lab.test", template: "confirm" }),
      });
      expect(failed.status).toBe(502);
      expect(await failed.json()).toMatchObject({ error: "email_send_failed" });
    } finally {
      await ctx.jord.close();
    }
  });

  it("validates sender identity and stays admin-only", async () => {
    const ctx = await boot();
    try {
      const badSender = await patch(ctx.app, {
        email_sender: { from_name: "", from_address: "nope" },
      });
      expect(badSender.status).toBe(400);

      const okSender = await patch(ctx.app, {
        email_sender: {
          from_name: "Lab Auth",
          from_address: "auth@lab.test",
          reply_to: "support@lab.test",
        },
      });
      expect(okSender.status).toBe(200);

      const editor = await ctx.app.request("/admin/auth/email/send-test", {
        method: "POST",
        headers: {
          authorization: `Bearer ${signSessionToken("editor", AUTH.secret)}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ to: "ops@lab.test", template: "confirm" }),
      });
      expect(editor.status).toBe(403);
    } finally {
      await ctx.jord.close();
    }
  });
});
