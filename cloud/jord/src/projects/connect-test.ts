import { Client as PgClient } from "pg";

import {
  createJordClient,
  fsPathToFileUrl,
  type JordProjectEngine,
} from "@altr/jord";

export type ProjectTlsMode = "disable" | "require" | "verify-full";

export type ProjectConnectInput = {
  engine: JordProjectEngine;
  target: string;
  dbUser?: string | null;
  password?: string | null;
  tlsMode?: ProjectTlsMode | null;
  /** Wall-clock budget for the ping (ms). */
  timeoutMs?: number;
};

export type ProjectConnectResult =
  | { ok: true }
  | { ok: false; error: string };

export type ProjectConnectTester = (
  input: ProjectConnectInput,
) => Promise<ProjectConnectResult>;

const DEFAULT_TIMEOUT_MS = 5_000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return String(err);
}

function normalizeFileTarget(target: string): string {
  const trimmed = target.trim();
  if (trimmed.startsWith("file:")) return trimmed;
  return fsPathToFileUrl(trimmed);
}

function buildPostgresUrl(input: ProjectConnectInput): string {
  const raw = input.target.trim();
  const url = new URL(raw);
  if (input.dbUser?.trim()) url.username = input.dbUser.trim();
  if (input.password != null) url.password = input.password;
  const tls = input.tlsMode ?? null;
  if (tls === "disable") url.searchParams.set("sslmode", "disable");
  else if (tls === "require") url.searchParams.set("sslmode", "require");
  else if (tls === "verify-full") {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

async function pingLibsql(input: ProjectConnectInput): Promise<void> {
  const isHosted = input.engine === "libsql-turso";
  const url = isHosted
    ? input.target.trim()
    : normalizeFileTarget(input.target);
  const authToken = isHosted
    ? input.password?.trim() || undefined
    : undefined;
  const client = await createJordClient({ url, authToken });
  try {
    await client.query("SELECT 1");
  } finally {
    await client.close();
  }
}

async function pingPostgres(input: ProjectConnectInput): Promise<void> {
  const connectionString = buildPostgresUrl(input);
  const client = new PgClient({
    connectionString,
    connectionTimeoutMillis: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
  } finally {
    await client.end().catch(() => undefined);
  }
}

/**
 * Short-lived connect check for register+test (S0043). Does not write
 * control-plane rows. Engine errors are returned verbatim.
 */
export const defaultProjectConnectTest: ProjectConnectTester = async (
  input,
) => {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    if (input.engine === "postgres") {
      await withTimeout(pingPostgres(input), timeoutMs, "postgres connect");
    } else {
      await withTimeout(pingLibsql(input), timeoutMs, "libsql connect");
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
};
