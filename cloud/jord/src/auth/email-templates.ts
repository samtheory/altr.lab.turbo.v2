/** Auth email templates (S0072). Pure functions — no DB, no mailer. */

export const AUTH_EMAIL_TEMPLATE_KEYS = [
  "confirm",
  "magic_link",
  "reset",
  "invite",
] as const;

export type AuthEmailTemplateKey = (typeof AUTH_EMAIL_TEMPLATE_KEYS)[number];

export type AuthEmailTemplate = {
  subject: string;
  text: string;
  html: string | null;
};

export type AuthEmailTemplates = Record<AuthEmailTemplateKey, AuthEmailTemplate>;

export type AuthEmailSender = {
  from_name: string;
  from_address: string;
  reply_to: string | null;
};

export const AUTH_EMAIL_VARIABLES = [
  "email",
  "token",
  "link",
  "expires_in",
  "project",
  "app_name",
] as const;

export type AuthEmailVariable = (typeof AUTH_EMAIL_VARIABLES)[number];

export const AUTH_EMAIL_BOUNDS = {
  subject: 200,
  text: 10_000,
  html: 20_000,
  fromName: 100,
} as const;

export const DEFAULT_AUTH_EMAIL_SENDER: AuthEmailSender = {
  from_name: "Jord",
  from_address: "no-reply@jord.local",
  reply_to: null,
};

function template(
  subject: string,
  text: string,
  html: string | null,
): AuthEmailTemplate {
  return { subject, text, html };
}

/**
 * Defaults keep the pre-S0072 bodies (`confirm:<token>` / `reset:<token>`) so
 * existing console-mailer tooling and tests continue to work.
 */
export function defaultAuthEmailTemplates(): AuthEmailTemplates {
  return {
    confirm: template(
      "Confirm your Jord account",
      "Confirm your account for {{project}} ({{email}}).\n\nconfirm:{{token}}\n\nThis link expires in {{expires_in}}.",
      "<p>Confirm your account for <strong>{{project}}</strong> ({{email}}).</p><p><a href=\"{{link}}\">Confirm email</a></p><p>This link expires in {{expires_in}}.</p>",
    ),
    magic_link: template(
      "Your Jord sign-in link",
      "Sign in to {{project}} as {{email}}.\n\nmagic:{{token}}\n\nThis link expires in {{expires_in}} and works once.",
      "<p>Sign in to <strong>{{project}}</strong> as {{email}}.</p><p><a href=\"{{link}}\">Sign in</a></p><p>Expires in {{expires_in}}; single use.</p>",
    ),
    reset: template(
      "Reset your Jord password",
      "Reset the password for {{email}} on {{project}}.\n\nreset:{{token}}\n\nThis link expires in {{expires_in}}.",
      "<p>Reset the password for {{email}} on <strong>{{project}}</strong>.</p><p><a href=\"{{link}}\">Choose a new password</a></p><p>Expires in {{expires_in}}.</p>",
    ),
    invite: template(
      "You are invited to Jord",
      "You have been invited to {{project}}.\n\nconfirm:{{token}}\n\nThis invitation expires in {{expires_in}}.",
      "<p>You have been invited to <strong>{{project}}</strong>.</p><p><a href=\"{{link}}\">Accept invitation</a></p><p>Expires in {{expires_in}}.</p>",
    ),
  };
}

export function defaultAuthEmailTemplate(
  key: AuthEmailTemplateKey,
): AuthEmailTemplate {
  return defaultAuthEmailTemplates()[key];
}

export function defaultAuthEmailTemplatesForReset(): AuthEmailTemplates {
  return defaultAuthEmailTemplates();
}

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function substitute(
  source: string,
  variables: Record<string, string>,
  escape: boolean,
): string {
  return source.replace(VARIABLE_PATTERN, (whole, name: string) => {
    if (!(name in variables)) return whole;
    const value = variables[name] ?? "";
    return escape ? escapeHtml(value) : value;
  });
}

export type RenderedAuthEmail = {
  subject: string;
  text: string;
  html: string | null;
};

/**
 * `{{variable}}` substitution. Text keeps raw values; HTML escapes every
 * substituted value so a user-supplied email can never inject markup.
 */
export function renderAuthEmail(
  template: AuthEmailTemplate,
  variables: Record<string, string>,
): RenderedAuthEmail {
  return {
    subject: substitute(template.subject, variables, false),
    text: substitute(template.text, variables, false),
    html: template.html ? substitute(template.html, variables, true) : null,
  };
}

export function templateVariableNames(
  template: Pick<AuthEmailTemplate, "subject" | "text" | "html">,
): string[] {
  const names = new Set<string>();
  for (const source of [template.subject, template.text, template.html ?? ""]) {
    for (const match of source.matchAll(VARIABLE_PATTERN)) {
      if (match[1]) names.add(match[1]);
    }
  }
  return [...names];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string" && value.trim() !== "") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function validateTemplate(value: unknown, label: string): string[] {
  const errors: string[] = [];
  const raw = parseObject(value);
  if (!raw) return [`${label} must be an object with subject, text and html`];
  const subject = asString(raw.subject);
  const text = asString(raw.text);
  const htmlRaw = raw.html;
  if (subject.trim() === "") errors.push(`${label}.subject is required`);
  if (subject.length > AUTH_EMAIL_BOUNDS.subject) {
    errors.push(`${label}.subject must be at most ${AUTH_EMAIL_BOUNDS.subject} characters`);
  }
  if (text.trim() === "") errors.push(`${label}.text is required`);
  if (text.length > AUTH_EMAIL_BOUNDS.text) {
    errors.push(`${label}.text must be at most ${AUTH_EMAIL_BOUNDS.text} characters`);
  }
  if (htmlRaw !== null && htmlRaw !== undefined && typeof htmlRaw !== "string") {
    errors.push(`${label}.html must be a string or null`);
  }
  const html = typeof htmlRaw === "string" && htmlRaw.trim() !== "" ? htmlRaw : null;
  if (html && html.length > AUTH_EMAIL_BOUNDS.html) {
    errors.push(`${label}.html must be at most ${AUTH_EMAIL_BOUNDS.html} characters`);
  }
  const unknown = templateVariableNames({ subject, text, html }).filter(
    (name) => !(AUTH_EMAIL_VARIABLES as readonly string[]).includes(name),
  );
  for (const name of unknown) {
    errors.push(
      `${label} uses unknown variable "{{${name}}}" (allowed: ${AUTH_EMAIL_VARIABLES.join(", ")})`,
    );
  }
  return errors;
}

/** Patch body → validated template set, or the list of problems. */
export function parseAuthEmailTemplatesPatch(
  value: unknown,
): { ok: true; value: Partial<AuthEmailTemplates> } | { ok: false; errors: string[] } {
  const raw = parseObject(value);
  if (!raw) return { ok: false, errors: ["email_templates must be an object"] };
  const errors: string[] = [];
  const next: Partial<AuthEmailTemplates> = {};
  for (const key of Object.keys(raw)) {
    if (!(AUTH_EMAIL_TEMPLATE_KEYS as readonly string[]).includes(key)) {
      errors.push(`email_templates has unknown template "${key}"`);
      continue;
    }
    const label = `email_templates.${key}`;
    const problems = validateTemplate(raw[key], label);
    if (problems.length > 0) {
      errors.push(...problems);
      continue;
    }
    const entry = parseObject(raw[key]) as Record<string, unknown>;
    next[key as AuthEmailTemplateKey] = {
      subject: asString(entry.subject).trim(),
      text: asString(entry.text),
      html:
        typeof entry.html === "string" && entry.html.trim() !== ""
          ? entry.html
          : null,
    };
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: next };
}

export function parseAuthEmailSenderPatch(
  value: unknown,
): { ok: true; value: Partial<AuthEmailSender> } | { ok: false; errors: string[] } {
  const raw = parseObject(value);
  if (!raw) return { ok: false, errors: ["email_sender must be an object"] };
  const errors: string[] = [];
  const next: Partial<AuthEmailSender> = {};
  for (const key of Object.keys(raw)) {
    if (!["from_name", "from_address", "reply_to"].includes(key)) {
      errors.push(`email_sender has unknown field "${key}"`);
    }
  }
  if (raw.from_name !== undefined) {
    const name = asString(raw.from_name).trim();
    if (name === "") errors.push("email_sender.from_name is required");
    else if (name.length > AUTH_EMAIL_BOUNDS.fromName) {
      errors.push(
        `email_sender.from_name must be at most ${AUTH_EMAIL_BOUNDS.fromName} characters`,
      );
    } else next.from_name = name;
  }
  if (raw.from_address !== undefined) {
    const address = asString(raw.from_address).trim();
    if (!EMAIL_PATTERN.test(address)) {
      errors.push("email_sender.from_address must be an email address");
    } else next.from_address = address;
  }
  if (raw.reply_to !== undefined) {
    if (raw.reply_to === null || raw.reply_to === "") next.reply_to = null;
    else {
      const reply = asString(raw.reply_to).trim();
      if (!EMAIL_PATTERN.test(reply)) {
        errors.push("email_sender.reply_to must be an email address or null");
      } else next.reply_to = reply;
    }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: next };
}

export function normalizeAuthEmailTemplates(value: unknown): AuthEmailTemplates {
  const defaults = defaultAuthEmailTemplates();
  const raw = parseObject(value);
  if (!raw) return defaults;
  for (const key of AUTH_EMAIL_TEMPLATE_KEYS) {
    if (validateTemplate(raw[key], key).length > 0) continue;
    const entry = raw[key] as Record<string, unknown>;
    defaults[key] = {
      subject: asString(entry.subject).trim(),
      text: asString(entry.text),
      html:
        typeof entry.html === "string" && entry.html.trim() !== ""
          ? entry.html
          : null,
    };
  }
  return defaults;
}

export function normalizeAuthEmailSender(value: unknown): AuthEmailSender {
  const raw = parseObject(value);
  if (!raw) return { ...DEFAULT_AUTH_EMAIL_SENDER };
  return {
    from_name:
      asString(raw.from_name).trim() || DEFAULT_AUTH_EMAIL_SENDER.from_name,
    from_address:
      EMAIL_PATTERN.test(asString(raw.from_address).trim())
        ? asString(raw.from_address).trim()
        : DEFAULT_AUTH_EMAIL_SENDER.from_address,
    reply_to: EMAIL_PATTERN.test(asString(raw.reply_to).trim())
      ? asString(raw.reply_to).trim()
      : null,
  };
}

/** Stable sample values for previews and test sends. */
export function sampleEmailVariables(): Record<string, string> {
  return {
    email: "user@example.com",
    token: "sample-token",
    link: "https://app.example.com/auth/confirm?token=sample-token",
    expires_in: "24 hours",
    project: "Jord",
    app_name: "Jord",
  };
}
