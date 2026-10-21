import type { JordDriverPort } from "@altr/jord";

export const DEFAULT_WAL_CHECKPOINT_MS = 60_000;

export function resolveWalCheckpointMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.JORD_WAL_CHECKPOINT_MS;
  if (raw === undefined || raw === "") return DEFAULT_WAL_CHECKPOINT_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WAL_CHECKPOINT_MS;
}

/** `PRAGMA wal_checkpoint(TRUNCATE)` — fold WAL back into the main file. */
export async function truncateWalCheckpoint(
  jord: JordDriverPort,
): Promise<void> {
  await jord.checkpointTruncate();
}

export type WalHygiene = {
  stop: () => void;
};

/**
 * Periodic TRUNCATE checkpoints. Call `stop()` from signal handlers after a
 * final checkpoint (or from tests).
 */
export function startWalHygiene(
  jord: JordDriverPort,
  intervalMs: number = resolveWalCheckpointMs(),
): WalHygiene {
  const timer = setInterval(() => {
    void truncateWalCheckpoint(jord).catch((err) => {
      console.error("[@altr/jord-server] wal_checkpoint(TRUNCATE) failed", err);
    });
  }, intervalMs);
  // Do not keep the process alive solely for the timer in tests.
  if (typeof timer.unref === "function") timer.unref();

  return {
    stop() {
      clearInterval(timer);
    },
  };
}
