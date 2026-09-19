/**
 * Environment helpers — placeholders for validated env loading (e.g. zod later).
 */

export type AltrEnv = {
  NODE_ENV: "development" | "production" | "test";
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
};

export function readEnv(
  source: Record<string, string | undefined> = process.env,
): AltrEnv {
  const nodeEnv = source.NODE_ENV ?? "development";
  return {
    NODE_ENV:
      nodeEnv === "production" || nodeEnv === "test" ? nodeEnv : "development",
    TURSO_DATABASE_URL: source.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: source.TURSO_AUTH_TOKEN,
  };
}

export function requireEnv(
  key: keyof AltrEnv,
  env: AltrEnv = readEnv(),
): string {
  const value = env[key];
  if (!value) {
    throw new Error(`[@altr/base/env] Missing required env: ${key}`);
  }
  return value;
}
