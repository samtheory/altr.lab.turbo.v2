import path from "node:path";

import { createJordClient } from "./client.js";
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
 */
export async function snapshotDatabase(
  options: SnapshotOptions = {},
): Promise<string> {
  const url = resolveDatabaseUrl(options.url);
  const sourcePath = fileUrlToFsPath(url);
  const destPath =
    options.destPath ??
    path.join(
      path.dirname(sourcePath),
      "snapshots",
      `jord-${Date.now()}.db`,
    );

  const jord = await createJordClient({ url });
  try {
    return await jord.snapshotTo(destPath);
  } finally {
    await jord.close();
  }
}
