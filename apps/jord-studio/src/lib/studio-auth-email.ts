/** Auth email template helpers (S0072) — preview mirror of the server. */

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

export const AUTH_EMAIL_TEMPLATE_LABELS: Record<AuthEmailTemplateKey, string> = {
  confirm: "Confirm sign-up",
  magic_link: "Magic link",
  reset: "Password reset",
  invite: "Invite",
};

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

export function defaultAuthEmailTemplates(): AuthEmailTemplates {
  return {
    confirm: {
      subject: "Confirm your Jord account",
      text: "Confirm your account for {{project}} ({{email}}).\n\nconfirm:{{token}}\n\nThis link expires in {{expires_in}}.",
      html: '<p>Confirm your account for <strong>{{project}}</strong> ({{email}}).</p><p><a href="{{link}}">Confirm email</a></p><p>This link expires in {{expires_in}}.</p>',
    },
    magic_link: {
      subject: "Your Jord sign-in link",
      text: "Sign in to {{project}} as {{email}}.\n\nmagic:{{token}}\n\nThis link expires in {{expires_in}} and works once.",
      html: '<p>Sign in to <strong>{{project}}</strong> as {{email}}.</p><p><a href="{{link}}">Sign in</a></p><p>Expires in {{expires_in}}; single use.</p>',
    },
    reset: {
      subject: "Reset your Jord password",
      text: "Reset the password for {{email}} on {{project}}.\n\nreset:{{token}}\n\nThis link expires in {{expires_in}}.",
      html: '<p>Reset the password for {{email}} on <strong>{{project}}</strong>.</p><p><a href="{{link}}">Choose a new password</a></p><p>Expires in {{expires_in}}.</p>',
    },
    invite: {
      subject: "You are invited to Jord",
      text: "You have been invited to {{project}}.\n\nconfirm:{{token}}\n\nThis invitation expires in {{expires_in}}.",
      html: '<p>You have been invited to <strong>{{project}}</strong>.</p><p><a href="{{link}}">Accept invitation</a></p><p>Expires in {{expires_in}}.</p>',
    },
  };
}

export function defaultAuthEmailTemplate(
  key: AuthEmailTemplateKey,
): AuthEmailTemplate {
  return defaultAuthEmailTemplates()[key];
}

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function renderAuthEmail(
  template: AuthEmailTemplate,
  variables: Record<string, string>,
): { subject: string; text: string; html: string | null } {
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

export function sampleEmailVariables(
  overrides?: Record<string, string>,
): Record<string, string> {
  return {
    email: "user@example.com",
    token: "sample-token",
    link: "https://app.example.com/auth/confirm?token=sample-token",
    expires_in: "24 hours",
    project: "Jord",
    app_name: "Jord",
    ...overrides,
  };
}

/** Same rules as the server; returns human-readable problems. */
export function validateAuthEmailTemplate(
  template: AuthEmailTemplate,
  label: string,
): string[] {
  const errors: string[] = [];
  if (template.subject.trim() === "") errors.push(`${label}: subject is required`);
  if (template.subject.length > AUTH_EMAIL_BOUNDS.subject) {
    errors.push(`${label}: subject is too long`);
  }
  if (template.text.trim() === "") errors.push(`${label}: text body is required`);
  if (template.text.length > AUTH_EMAIL_BOUNDS.text) {
    errors.push(`${label}: text body is too long`);
  }
  if (template.html && template.html.length > AUTH_EMAIL_BOUNDS.html) {
    errors.push(`${label}: HTML body is too long`);
  }
  const unknown = templateVariableNames(template).filter(
    (name) => !(AUTH_EMAIL_VARIABLES as readonly string[]).includes(name),
  );
  for (const name of unknown) {
    errors.push(`${label}: unknown variable {{${name}}}`);
  }
  return errors;
}

export function validateAuthEmailSender(sender: AuthEmailSender): string[] {
  const errors: string[] = [];
  if (sender.from_name.trim() === "") errors.push("Sender name is required");
  if (sender.from_name.length > AUTH_EMAIL_BOUNDS.fromName) {
    errors.push("Sender name is too long");
  }
  if (!EMAIL_PATTERN.test(sender.from_address.trim())) {
    errors.push("From address must be an email address");
  }
  if (sender.reply_to !== null && !EMAIL_PATTERN.test(sender.reply_to.trim())) {
    errors.push("Reply-to must be an email address or empty");
  }
  return errors;
}

/** Insert a `{{variable}}` token into a body at the end (chip affordance). */
export function insertTemplateVariable(body: string, variable: string): string {
  const token = `{{${variable}}}`;
  if (body.endsWith(" ") || body.endsWith("\n") || body === "") {
    return `${body}${token}`;
  }
  return `${body} ${token}`;
}
