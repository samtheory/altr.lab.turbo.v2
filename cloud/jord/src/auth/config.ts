import { isJordRole, type JordRole } from "./roles.js";

export type LegacySecretMode = "admin" | "service";

export type JordAuthConfig = {
  /** Shared HMAC / raw bearer secret (`JORD_SERVER_TOKEN`). */
  secret: string;
  /**
   * Operator role when `JORD_LEGACY_SECRET_ROLE=admin`.
   * Ignored when the unset default (`service`) is in effect.
   */
  defaultRole: JordRole;
  /**
   * Unset default is `service` (raw bearer → kind `service`, role `service_role`).
   * `admin` is a temporary escape that keeps today's operator mapping.
   */
  legacyMode: LegacySecretMode;
  /** HS256 signing secret. Separate from the shared HMAC secret. */
  jwtSecret: string | null;
  jwtSecretPrevious: string | null;
  jwtIss: string;
  jwtAud: string;
};

export function resolveLegacyMode(env: NodeJS.ProcessEnv): LegacySecretMode {
  const raw = env.JORD_LEGACY_SECRET_ROLE?.trim().toLowerCase() ?? "";
  if (raw === "" ) return "service";
  if (raw === "admin" || raw === "service") return raw;
  throw new Error(
    `[@altr/jord-server] JORD_LEGACY_SECRET_ROLE must be admin|service (got ${JSON.stringify(raw)})`,
  );
}

export function resolveAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): JordAuthConfig {
  const secret = env.JORD_SERVER_TOKEN?.trim();
  if (!secret) {
    throw new Error(
      "[@altr/jord-server] JORD_SERVER_TOKEN is required (Studio S3). Set a non-empty shared secret.",
    );
  }

  const rawRole = (env.JORD_DEFAULT_ROLE?.trim() || "admin").toLowerCase();
  if (!isJordRole(rawRole)) {
    throw new Error(
      `[@altr/jord-server] JORD_DEFAULT_ROLE must be admin|editor|readonly (got ${JSON.stringify(rawRole)})`,
    );
  }

  const jwtSecret = env.JORD_JWT_SECRET?.trim() || null;
  const jwtSecretPrevious = env.JORD_JWT_SECRET_PREVIOUS?.trim() || null;
  const jwtIss = env.JORD_JWT_ISS?.trim() || "jord";
  const jwtAud = env.JORD_JWT_AUD?.trim() || "jord";

  return {
    secret,
    defaultRole: rawRole,
    legacyMode: resolveLegacyMode(env),
    jwtSecret,
    jwtSecretPrevious,
    jwtIss,
    jwtAud,
  };
}
