import { isJordRole, type JordRole } from "./roles.js";

export type JordAuthConfig = {
  /** Shared HMAC / raw bearer secret (`JORD_SERVER_TOKEN`). */
  secret: string;
  /** Role when the raw secret is presented as Bearer. */
  defaultRole: JordRole;
};

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

  return { secret, defaultRole: rawRole };
}
