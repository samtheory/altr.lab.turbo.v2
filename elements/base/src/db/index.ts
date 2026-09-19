/**
 * Turso / libSQL client stub.
 *
 * Primary DB decision: Turso (libSQL).
 * Replace this stub with `@libsql/client` when wiring real persistence.
 *
 * Expected env (see @altr/base/env):
 * - TURSO_DATABASE_URL
 * - TURSO_AUTH_TOKEN
 */

export type TursoConfig = {
  url: string;
  authToken?: string;
};

export type DbClient = {
  execute: (sql: string, args?: unknown[]) => Promise<unknown>;
};

/**
 * Creates a placeholder client. Throws if used before real libSQL wiring.
 */
export function createTursoClient(_config: TursoConfig): DbClient {
  return {
    async execute(_sql: string, _args?: unknown[]) {
      throw new Error(
        "[@altr/base/db] Turso client stub — install @libsql/client and implement createTursoClient.",
      );
    },
  };
}

export function getDefaultTursoConfig(
  env: Record<string, string | undefined> = process.env,
): TursoConfig {
  const url = env.TURSO_DATABASE_URL ?? "libsql://localhost:8080";
  return {
    url,
    authToken: env.TURSO_AUTH_TOKEN,
  };
}
