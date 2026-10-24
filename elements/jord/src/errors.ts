/** Unsupported or not-yet-enabled DATABASE_URL scheme. */
export class JordUrlError extends Error {
  readonly code = "JORD_URL" as const;

  constructor(url: string, detail: string) {
    super(`[@altr/jord] ${detail} (got ${JSON.stringify(url)})`);
    this.name = "JordUrlError";
  }
}

/**
 * @deprecated Prefer JordUrlError. Kept so existing tests/imports keep working.
 * Thrown when a URL scheme is not accepted.
 */
export class JordSlice0UrlError extends JordUrlError {
  constructor(url: string) {
    super(
      url,
      "DATABASE_URL scheme is not accepted. Use file: (default), postgres:/postgresql:, or libsql: (with LIBSQL_AUTH_TOKEN)",
    );
    this.name = "JordSlice0UrlError";
  }
}

/** Optimistic concurrency: UPDATE matched zero rows. */
export class JordVersionConflictError extends Error {
  readonly code = "JORD_VERSION_CONFLICT" as const;

  constructor(id: string, version: number) {
    super(
      `[@altr/jord] version conflict for record ${id} at version ${version}`,
    );
    this.name = "JordVersionConflictError";
  }
}

/** Operation not supported on this dialect. */
export class JordUnsupportedError extends Error {
  readonly code = "JORD_UNSUPPORTED" as const;

  constructor(operation: string, dialect: string) {
    super(
      `[@altr/jord] ${operation} is not supported on dialect ${JSON.stringify(dialect)}`,
    );
    this.name = "JordUnsupportedError";
  }
}
