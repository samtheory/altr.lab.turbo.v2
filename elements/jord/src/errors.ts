/** Slice 0 accepts only `file:` DATABASE_URL schemes. */
export class JordSlice0UrlError extends Error {
  readonly code = "JORD_SLICE0_URL" as const;

  constructor(url: string) {
    super(
      `[@altr/jord] Slice 0 accepts only file: DATABASE_URL (got ${JSON.stringify(url)}). libsql: and postgres: are reserved for later slices.`,
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
