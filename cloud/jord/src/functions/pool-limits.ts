/**
 * S0090 — Functions v2 worker pool knobs (ADR-functions-v2).
 * Numbers are intentional defaults; env can raise them up to a hard cap.
 */

export const FUNCTION_POOL_DEFAULTS = {
  /** Warm workers per pool (per process; one pool per project id). */
  maxWorkers: 2,
  /** Invokes waiting for a free worker before 429. */
  maxQueued: 16,
  /** Wall-clock deadline per invoke (ms). */
  timeoutMs: 5_000,
  /** Hard upper bound for timeoutMs (reject configs above). */
  timeoutHardCapMs: 60_000,
  /** V8 old-space cap for each worker (MB). */
  maxOldGenerationSizeMb: 64,
  /** Hard upper bound for memory cap. */
  memoryHardCapMb: 512,
  /** Max JSON-serialized result bytes. */
  maxOutputBytes: 1 * 1024 * 1024,
  /** Recycle a worker after this many successful/failed invokes. */
  recycleAfterInvocations: 32,
} as const;

export type FunctionPoolConfig = {
  maxWorkers: number;
  maxQueued: number;
  timeoutMs: number;
  maxOldGenerationSizeMb: number;
  maxOutputBytes: number;
  recycleAfterInvocations: number;
  /**
   * Absolute directory prefixes a module path must start with.
   * Empty = deny all (tests pass explicit roots).
   */
  moduleRoots: string[];
  /**
   * Env keys copied into the worker. Secrets never listed here stay out.
   * OS-minimal keys are always added for the platform to boot.
   */
  envAllowlist: string[];
};

export function clampPoolConfig(
  partial: Partial<FunctionPoolConfig> = {},
): FunctionPoolConfig {
  const timeoutMs = Math.min(
    Math.max(1, partial.timeoutMs ?? FUNCTION_POOL_DEFAULTS.timeoutMs),
    FUNCTION_POOL_DEFAULTS.timeoutHardCapMs,
  );
  const maxOldGenerationSizeMb = Math.min(
    Math.max(8, partial.maxOldGenerationSizeMb ?? FUNCTION_POOL_DEFAULTS.maxOldGenerationSizeMb),
    FUNCTION_POOL_DEFAULTS.memoryHardCapMb,
  );
  return {
    maxWorkers: Math.max(1, partial.maxWorkers ?? FUNCTION_POOL_DEFAULTS.maxWorkers),
    maxQueued: Math.max(0, partial.maxQueued ?? FUNCTION_POOL_DEFAULTS.maxQueued),
    timeoutMs,
    maxOldGenerationSizeMb,
    maxOutputBytes: Math.max(
      256,
      partial.maxOutputBytes ?? FUNCTION_POOL_DEFAULTS.maxOutputBytes,
    ),
    recycleAfterInvocations: Math.max(
      1,
      partial.recycleAfterInvocations ?? FUNCTION_POOL_DEFAULTS.recycleAfterInvocations,
    ),
    moduleRoots: [...(partial.moduleRoots ?? [])],
    envAllowlist: [...(partial.envAllowlist ?? [])],
  };
}

/** OS keys workers need to start; never include app secrets. */
export function osMinimalEnvKeys(platform: NodeJS.Platform = process.platform): string[] {
  if (platform === "win32") {
    return ["SYSTEMROOT", "SYSTEMDRIVE", "WINDIR", "TEMP", "TMP", "PATH", "PATHEXT", "COMSPEC"];
  }
  return ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "USER", "SHELL"];
}

export function buildWorkerEnv(
  allowlist: string[],
  source: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): Record<string, string> {
  const keys = new Set([...osMinimalEnvKeys(platform), ...allowlist]);
  const out: Record<string, string> = {};
  for (const key of keys) {
    const v = source[key];
    if (typeof v === "string" && v.length > 0) out[key] = v;
  }
  return out;
}
