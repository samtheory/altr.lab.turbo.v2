import { describe, expect, it, vi } from "vitest";

import {
  ConsoleMailer,
  MailerError,
  createMailerFromEnv,
  createResendMailer,
  createSesMailer,
} from "./mailer.js";

describe("mailer port", () => {
  it("console mailer records sent messages", async () => {
    const mailer = new ConsoleMailer();
    expect(mailer.sent).toHaveLength(0);
    await mailer.send({ to: "ada@lab.test", subject: "Hi", text: "hello" });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe("ada@lab.test");
  });

  it("defaults to console with no config", () => {
    const mailer = createMailerFromEnv({ env: {} });
    expect(mailer.kind).toBe("console");
  });

  it("refuses unknown JORD_MAILER and missing resend keys", () => {
    expect(() =>
      createMailerFromEnv({ env: { JORD_MAILER: "postmark" } }),
    ).toThrow(/JORD_MAILER must be one of/);
    expect(() =>
      createMailerFromEnv({
        env: { JORD_MAILER: "resend", JORD_MAIL_FROM: "a@b.co" },
      }),
    ).toThrow(/JORD_RESEND_API_KEY/);
  });

  it("resend succeeds and reports the message id", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "re_123" }), { status: 200 }),
    );
    const mailer = createResendMailer({
      apiKey: "re_test",
      from: "Jord <auth@lab.test>",
      fetchImpl,
    });
    const result = await mailer.send({
      to: "ops@lab.test",
      subject: "Hello",
      text: "plain",
      html: "<p>plain</p>",
    });
    expect(result).toEqual({ messageId: "re_123" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_test",
    });
    expect(String(init.body)).toContain('"html":"<p>plain</p>"');
  });

  it("maps 401 to invalid_credentials without crashing", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("bad key", { status: 401 }),
    );
    const mailer = createResendMailer({
      apiKey: "bad",
      from: "a@b.co",
      fetchImpl,
    });
    await expect(
      mailer.send({ to: "ops@lab.test", subject: "x", text: "y" }),
    ).rejects.toMatchObject({
      code: "invalid_credentials",
      providerStatus: 401,
    } satisfies Partial<MailerError>);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("retries once on 5xx then reports provider_error", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("boom", { status: 503 }))
      .mockResolvedValueOnce(new Response("still down", { status: 503 }));
    const mailer = createResendMailer({
      apiKey: "re_test",
      from: "a@b.co",
      fetchImpl,
    });
    await expect(
      mailer.send({ to: "ops@lab.test", subject: "x", text: "y" }),
    ).rejects.toMatchObject({
      code: "provider_error",
      providerStatus: 503,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries once on 5xx then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "re_ok" }), { status: 200 }),
      );
    const mailer = createResendMailer({
      apiKey: "re_test",
      from: "a@b.co",
      fetchImpl,
    });
    await expect(
      mailer.send({ to: "ops@lab.test", subject: "x", text: "y" }),
    ).resolves.toEqual({ messageId: "re_ok" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries once on network failure then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "re_net" }), { status: 200 }),
      );
    const mailer = createResendMailer({
      apiKey: "re_test",
      from: "a@b.co",
      fetchImpl,
    });
    await expect(
      mailer.send({ to: "ops@lab.test", subject: "x", text: "y" }),
    ).resolves.toEqual({ messageId: "re_net" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("ses parses MessageId from the XML body", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          "<SendEmailResponse><SendEmailResult><MessageId>010201</MessageId></SendEmailResult></SendEmailResponse>",
          { status: 200 },
        ),
    );
    const mailer = createSesMailer({
      region: "us-east-1",
      accessKeyId: "AKIATEST",
      secretAccessKey: "secret",
      from: "auth@lab.test",
      fetchImpl,
    });
    await expect(
      mailer.send({ to: "ops@lab.test", subject: "Hi", text: "body" }),
    ).resolves.toEqual({ messageId: "010201" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(String(init.body)).toContain("Action=SendEmail");
    expect(init.headers).toMatchObject({
      Authorization: expect.stringContaining("AWS4-HMAC-SHA256"),
    });
  });
});
