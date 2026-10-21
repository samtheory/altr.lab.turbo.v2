import { isJordRole, type JordRole } from "./roles";

export const SESSION_COOKIE = "jord_session";

export function getServerToken(): string | null {
  const secret = process.env.JORD_SERVER_TOKEN?.trim();
  return secret && secret.length > 0 ? secret : null;
}

export function getStudioPassword(): string | null {
  const password = process.env.JORD_STUDIO_PASSWORD?.trim();
  return password && password.length > 0 ? password : null;
}

export function getStudioRole(): JordRole {
  const raw = (process.env.JORD_STUDIO_ROLE?.trim() || "admin").toLowerCase();
  return isJordRole(raw) ? raw : "admin";
}

export function getDefaultServerRole(): JordRole {
  const raw = (process.env.JORD_DEFAULT_ROLE?.trim() || "admin").toLowerCase();
  return isJordRole(raw) ? raw : "admin";
}

/** Lab-only: skip login UI and mint upstream bearer from env. */
export function isStudioOpenBypass(): boolean {
  return process.env.JORD_STUDIO_OPEN === "1";
}
