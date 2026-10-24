import path from "node:path";

import { createJordClient } from "./client.js";
import { JordUnsupportedError } from "./errors.js";
import { fileUrlToFsPath, resolveDatabaseUrl } from "./url.js";

export type SnapshotOptions = {
  /** Source `file:` URL. Defaults like createJordClient. */
  url?: string;
  /** Destination file. Defaults to `data/snapshots/jord-<timestamp>.db`. */
  destPath?: string;
};

/**
 * SQLite-consistent snapshot of the live Jord file via `VACUUM INTO`.
 * Opens a short-lived connection (single-process utility, not a hot writer).
 * Postgres URLs throw JordUnsupportedError.
 */
export async function snapshotDatabase(
  options: SnapshotOptions = {},
): Promise<string> {
  const resolved = resolveDatabaseUrl(options.url);
  if (resolved.scheme !== "file") {
    throw new JordUnsupportedError("snapshotDatabase", resolved.scheme);
  }
  const sourcePath = fileUrlToFsPath(resolved.url);
  const destPath =
    options.destPath ??
    path.join(
      path.dirname(sourcePath),
      "snapshots",
      `jord-${Date.now()}.db`,
    );

  const jord = await createJordClient({ url: resolved.url });
  try {
    return await jord.snapshotTo(destPath);
  } finally {
    await jord.close();
  }
}
