/**
 * S0091 — structured function invocation logs (jord_logs / LogSink).
 * Console capture is bounded and redacted; never store secrets.
 */

import type { LogSink } from "../logs/sink.js";

export const INVOCATION_LOG_SOURCE = "function" as const;

export const INVOCATION_LOG_LIMITS = {
  maxConsoleLines: 50,
  maxLineChars: 500,
  maxTotalChars: 8_000,
} as const;

export type InvocationStatus =
  | "ok"
  | "error"
  | "timeout"
  | "oom"
  | "crashed"
  | "denied";

export type InvocationLogInput = {
  invocationId: string;
  functionSlug?: string;
  modulePath?: string;
  status: InvocationStatus;
  durationMs: number;
  code?: string;
  message?: string;
  consoleLines?: string[];
  principal: {
    subject: string;
    uid?: string | null;
    role?: string;
  };
};

/** Drop obvious secret-shaped tokens from captured console text. */
export function redactConsoleLine(line: string): string {
  let out = line.slice(0, INVOCATION_LOG_LIMITS.maxLineChars);
  out = out.replace(
    /\b(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi,
    "$1[REDACTED]",
  );
  out = out.replace(
    /\b([A-Za-z0-9_]*(?:SECRET|TOKEN|PASSWORD|API[_-]?KEY|PRIVATE[_-]?KEY)[A-Za-z0-9_]*)\s*[=:]\s*\S+/gi,
    "$1=[REDACTED]",
  );
  out = out.replace(
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    "[REDACTED_JWT]",
  );
  return out;
}

export function boundConsoleLines(lines: string[]): string[] {
  const out: string[] = [];
  let total = 0;
  for (const raw of lines) {
    if (out.length >= INVOCATION_LOG_LIMITS.maxConsoleLines) break;
    const line = redactConsoleLine(String(raw ?? ""));
    if (total + line.length > INVOCATION_LOG_LIMITS.maxTotalChars) {
      const room = INVOCATION_LOG_LIMITS.maxTotalChars - total;
      if (room > 16) out.push(line.slice(0, room) + "…");
      break;
    }
    out.push(line);
    total += line.length;
  }
  return out;
}

export function statusFromFailureCode(
  code: string | undefined,
): InvocationStatus {
  switch (code) {
    case "function_timeout":
      return "timeout";
    case "function_oom":
      return "oom";
    case "policy_denied":
    case "forbidden":
      return "denied";
    case "function_crashed":
      return "crashed";
    default:
      return "error";
  }
}

export function appendInvocationLog(
  logs: LogSink | undefined,
  input: InvocationLogInput,
): void {
  if (!logs) return;
  const consoleLines = boundConsoleLines(input.consoleLines ?? []);
  logs.append({
    level: input.status === "ok" ? "info" : "error",
    source: INVOCATION_LOG_SOURCE,
    message: `function.invoke ${input.status}`,
    meta: {
      kind: "function_invoke",
      invocationId: input.invocationId,
      functionSlug: input.functionSlug,
      modulePath: input.modulePath
        ? input.modulePath.replace(/\\/g, "/").split("/").slice(-2).join("/")
        : undefined,
      status: input.status,
      durationMs: input.durationMs,
      code: input.code,
      message: input.message
        ? redactConsoleLine(input.message).slice(0, 200)
        : undefined,
      console: consoleLines,
      principal: {
        subject: input.principal.subject,
        uid: input.principal.uid ?? null,
        role: input.principal.role,
      },
    },
  });
}
