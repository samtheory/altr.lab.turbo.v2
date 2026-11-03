import type { JordDriverPort } from "@altr/jord";

import {
  renderAuthEmail,
  type AuthEmailTemplateKey,
} from "./email-templates.js";
import type { MailResult, MailerPort } from "./mailer.js";
import { loadAuthSettings } from "./settings.js";

/**
 * Render the project's template and hand it to the mailer. Used by signup,
 * admin invite and password recovery so the console controls real mail.
 */
export async function sendAuthEmail(input: {
  jord: JordDriverPort;
  mailer: MailerPort;
  kind: AuthEmailTemplateKey;
  to: string;
  token: string;
  expiresInSeconds: number;
}): Promise<MailResult | void> {
  const settings = await loadAuthSettings(input.jord);
  const template = settings.email_templates[input.kind];
  const site = settings.site_url?.replace(/\/$/, "") ?? "";
  const link = site
    ? `${site}/auth/${input.kind}?token=${encodeURIComponent(input.token)}`
    : `jord://auth/${input.kind}?token=${encodeURIComponent(input.token)}`;
  const appName = settings.email_sender.from_name ?? "Jord";
  const expiresLabel =
    input.expiresInSeconds >= 3600
      ? `${Math.round(input.expiresInSeconds / 3600)} hours`
      : `${Math.max(1, Math.round(input.expiresInSeconds / 60))} minutes`;
  const rendered = renderAuthEmail(template, {
    email: input.to,
    token: input.token,
    link,
    expires_in: expiresLabel,
    project: appName,
    app_name: appName,
  });
  return input.mailer.send({
    to: input.to,
    subject: rendered.subject,
    text: rendered.text,
    ...(rendered.html ? { html: rendered.html } : {}),
  });
}
