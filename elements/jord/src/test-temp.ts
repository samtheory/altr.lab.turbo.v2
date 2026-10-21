import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/** Windows often keeps libSQL WAL locks briefly after close. */
export async function rmTempDir(dir: string): Promise<void> {
  for (let i = 0; i < 10; i++) {
    try {
      await rm(dir, { recursive: true, force: true });
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" && code !== "EPERM") throw err;
      await new Promise((r) => setTimeout(r, 40 * (i + 1)));
    }
  }
  // Orphan temp dirs rather than fail the suite on stubborn Windows locks.
}

export async function makeTempDir(prefix = "jord-"): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefix));
}
