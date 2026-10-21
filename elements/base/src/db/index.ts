/**
 * @deprecated Database access lives in `@altr/jord` (`createJordClient`, `DATABASE_URL`).
 * `@altr/base` is a leaf utils package and must not ship a live DB client.
 */

export type DeprecatedDbRedirect = {
  /** Always throws — use `@altr/jord`. */
  execute: (sql: string, args?: unknown[]) => Promise<never>;
};

/**
 * @deprecated Use `createJordClient` from `@altr/jord` with a `file:` `DATABASE_URL`.
 */
export function createTursoClient(_config?: unknown): DeprecatedDbRedirect {
  return {
    async execute(_sql: string, _args?: unknown[]): Promise<never> {
      throw new Error(
        "[@altr/base/db] Removed. Use createJordClient from @altr/jord (DATABASE_URL file:…).",
      );
    },
  };
}

/**
 * @deprecated Prefer `DATABASE_URL` with `@altr/jord`.
 */
export function getDefaultTursoConfig(
  _env: Record<string, string | undefined> = process.env,
): { message: string } {
  return {
    message:
      "[@altr/base/db] Use @altr/jord with DATABASE_URL (Slice 0: file:./data/jord.db).",
  };
}
