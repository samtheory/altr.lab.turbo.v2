import { createHash, createHmac, randomUUID } from "node:crypto";

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  /** Optional template HTML (variables already escaped). */
  html?: string;
};

export type MailResult = { messageId?: string };

/** Auth mail. Console is the default; Resend / SES are env-selected (S0073). */
export interface MailerPort {
  /** Adapter name for the console / settings UI ("console", "resend", "ses", …). */
  readonly kind?: string;
  /** Test-only expose of sent messages. */
  readonly sent?: readonly OutboundMail[];
  send(message: OutboundMail): Promise<MailResult | void>;
}

export type MailerFailureCode =
  | "invalid_credentials"
  | "provider_error"
  | "timeout"
  | "network"
  | "config";

export class MailerError extends Error {
  readonly code: MailerFailureCode;
  readonly providerStatus: number | null;

  constructor(
    code: MailerFailureCode,
    message: string,
    providerStatus: number | null = null,
  ) {
    super(message);
    this.name = "MailerError";
    this.code = code;
    this.providerStatus = providerStatus;
  }
}

export class ConsoleMailer implements MailerPort {
  readonly kind = "console";
  readonly sent: OutboundMail[] = [];

  async send(message: OutboundMail): Promise<MailResult> {
    this.sent.push(message);
    console.info(
      `[@altr/jord-server] mail to=${message.to} subject=${message.subject}`,
    );
    return { messageId: `console:${randomUUID()}` };
  }
}

export type HttpMailerFetch = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = 5_000;

async function fetchWithTimeout(
  fetchImpl: HttpMailerFetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === "AbortError" || /aborted/i.test(err.message))
    ) {
      throw new MailerError("timeout", `mailer timed out after ${timeoutMs}ms`);
    }
    throw new MailerError(
      "network",
      err instanceof Error ? err.message : "mailer network error",
    );
  } finally {
    clearTimeout(timer);
  }
}

function classifyHttpFailure(status: number, body: string): MailerError {
  if (status === 401 || status === 403) {
    return new MailerError(
      "invalid_credentials",
      body || "mailer rejected credentials",
      status,
    );
  }
  return new MailerError(
    "provider_error",
    body || `mailer provider returned ${status}`,
    status,
  );
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 500);
  } catch {
    return "";
  }
}

/** One retry on 5xx / 429 / network / timeout (S0073). */
async function sendWithOneRetry(
  attempt: () => Promise<Response>,
): Promise<Response> {
  try {
    const first = await attempt();
    if (first.status >= 500 || first.status === 429) {
      return attempt();
    }
    return first;
  } catch (err) {
    if (
      err instanceof MailerError &&
      (err.code === "network" || err.code === "timeout")
    ) {
      return attempt();
    }
    throw err;
  }
}

export type ResendMailerOptions = {
  apiKey: string;
  from: string;
  /** Override for tests (default https://api.resend.com/emails). */
  endpoint?: string;
  fetchImpl?: HttpMailerFetch;
  timeoutMs?: number;
};

export function createResendMailer(options: ResendMailerOptions): MailerPort {
  const endpoint = options.endpoint ?? "https://api.resend.com/emails";
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    kind: "resend",
    async send(message) {
      const payload = {
        from: options.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      };
      const attempt = async () =>
        fetchWithTimeout(
          fetchImpl,
          endpoint,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${options.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
          timeoutMs,
        );

      const res = await sendWithOneRetry(attempt);
      if (!res.ok) {
        throw classifyHttpFailure(res.status, await readErrorBody(res));
      }
      const body = (await res.json().catch(() => ({}))) as { id?: string };
      return { messageId: body.id ?? `resend:${randomUUID()}` };
    },
  };
}

export type SesMailerOptions = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  from: string;
  /** Override host for tests (default email.{region}.amazonaws.com). */
  endpoint?: string;
  fetchImpl?: HttpMailerFetch;
  timeoutMs?: number;
  sessionToken?: string;
};

function amzDate(now: Date): { amz: string; date: string } {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amz: iso, date: iso.slice(0, 8) };
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/** Minimal SigV4 for SES Query API SendEmail (S0073). */
function signSesQuery(input: {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  host: string;
  body: string;
  now?: Date;
}): { authorization: string; amzDate: string; token?: string } {
  const { amz, date } = amzDate(input.now ?? new Date());
  const service = "ses";
  const canonicalHeaders =
    `content-type:application/x-www-form-urlencoded\n` +
    `host:${input.host}\n` +
    `x-amz-date:${amz}\n` +
    (input.sessionToken ? `x-amz-security-token:${input.sessionToken}\n` : "");
  const signedHeaders = input.sessionToken
    ? "content-type;host;x-amz-date;x-amz-security-token"
    : "content-type;host;x-amz-date";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    sha256Hex(input.body),
  ].join("\n");
  const credentialScope = `${date}/${input.region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amz,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const kDate = hmac(`AWS4${input.secretAccessKey}`, date);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");
  return {
    amzDate: amz,
    token: input.sessionToken,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export function createSesMailer(options: SesMailerOptions): MailerPort {
  const host =
    options.endpoint?.replace(/^https?:\/\//, "").replace(/\/$/, "") ??
    `email.${options.region}.amazonaws.com`;
  const url = options.endpoint?.startsWith("http")
    ? options.endpoint.replace(/\/$/, "")
    : `https://${host}/`;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    kind: "ses",
    async send(message) {
      const params = new URLSearchParams();
      params.set("Action", "SendEmail");
      params.set("Version", "2010-12-01");
      params.set("Source", options.from);
      params.set("Destination.ToAddresses.member.1", message.to);
      params.set("Message.Subject.Data", message.subject);
      params.set("Message.Subject.Charset", "UTF-8");
      params.set("Message.Body.Text.Data", message.text);
      params.set("Message.Body.Text.Charset", "UTF-8");
      if (message.html) {
        params.set("Message.Body.Html.Data", message.html);
        params.set("Message.Body.Html.Charset", "UTF-8");
      }
      const body = params.toString();

      const attempt = async () => {
        const signed = signSesQuery({
          region: options.region,
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey,
          sessionToken: options.sessionToken,
          host,
          body,
        });
        const headers: Record<string, string> = {
          "Content-Type": "application/x-www-form-urlencoded",
          Host: host,
          "X-Amz-Date": signed.amzDate,
          Authorization: signed.authorization,
        };
        if (signed.token) headers["X-Amz-Security-Token"] = signed.token;
        return fetchWithTimeout(
          fetchImpl,
          url,
          { method: "POST", headers, body },
          timeoutMs,
        );
      };

      const res = await sendWithOneRetry(attempt);
      if (!res.ok) {
        throw classifyHttpFailure(res.status, await readErrorBody(res));
      }
      const text = await res.text();
      const match = text.match(/<MessageId>([^<]+)<\/MessageId>/);
      return { messageId: match?.[1] ?? `ses:${randomUUID()}` };
    },
  };
}

export const JORD_MAILER_KINDS = ["console", "resend", "ses"] as const;
export type JordMailerKind = (typeof JORD_MAILER_KINDS)[number];

export type CreateMailerFromEnvOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: HttpMailerFetch;
};

/**
 * Resolve the process mailer. Default / missing / empty → console.
 * Unknown `JORD_MAILER` or missing provider credentials refuse boot.
 */
export function createMailerFromEnv(
  options: CreateMailerFromEnvOptions = {},
): MailerPort {
  const env = options.env ?? process.env;
  const raw = (env.JORD_MAILER ?? "console").trim().toLowerCase();
  if (raw === "" || raw === "console") {
    return new ConsoleMailer();
  }
  if (raw === "resend") {
    const apiKey = env.JORD_RESEND_API_KEY?.trim() ?? "";
    const from =
      env.JORD_MAIL_FROM?.trim() || env.JORD_RESEND_FROM?.trim() || "";
    if (!apiKey) {
      throw new MailerError(
        "config",
        "JORD_RESEND_API_KEY is required when JORD_MAILER=resend",
      );
    }
    if (!from) {
      throw new MailerError(
        "config",
        "JORD_MAIL_FROM (or JORD_RESEND_FROM) is required when JORD_MAILER=resend",
      );
    }
    return createResendMailer({
      apiKey,
      from,
      endpoint: env.JORD_RESEND_ENDPOINT?.trim() || undefined,
      fetchImpl: options.fetchImpl,
    });
  }
  if (raw === "ses") {
    const region =
      env.JORD_SES_REGION?.trim() || env.AWS_REGION?.trim() || "";
    const accessKeyId =
      env.JORD_SES_ACCESS_KEY_ID?.trim() ||
      env.AWS_ACCESS_KEY_ID?.trim() ||
      "";
    const secretAccessKey =
      env.JORD_SES_SECRET_ACCESS_KEY?.trim() ||
      env.AWS_SECRET_ACCESS_KEY?.trim() ||
      "";
    const from = env.JORD_MAIL_FROM?.trim() || "";
    if (!region || !accessKeyId || !secretAccessKey || !from) {
      throw new MailerError(
        "config",
        "JORD_MAILER=ses requires JORD_SES_REGION (or AWS_REGION), AWS credentials, and JORD_MAIL_FROM",
      );
    }
    return createSesMailer({
      region,
      accessKeyId,
      secretAccessKey,
      from,
      endpoint: env.JORD_SES_ENDPOINT?.trim() || undefined,
      sessionToken:
        env.JORD_SES_SESSION_TOKEN?.trim() ||
        env.AWS_SESSION_TOKEN?.trim() ||
        undefined,
      fetchImpl: options.fetchImpl,
    });
  }
  throw new MailerError(
    "config",
    `JORD_MAILER must be one of ${JORD_MAILER_KINDS.join("|")} (got "${raw}")`,
  );
}
