import type { Principal } from "./principal.js";

const CONTROL_PREFIXES = ["/jobs", "/policies", "/triggers"];

function starts(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isControlPlane(path: string): boolean {
  return CONTROL_PREFIXES.some((prefix) => starts(path, prefix));
}

/** Schema DDL, not row DML under `/rows`. */
function isSchemaDdl(method: string, path: string): boolean {
  if (method === "GET" || method === "HEAD") return false;
  if (!starts(path, "/schema")) return false;
  return !path.includes("/rows");
}

/** `/schema/tables/:name/rows` and `/schema/tables/:name/rows/:pk`. */
function isSchemaRowPath(path: string): boolean {
  return /^\/schema\/tables\/[^/]+\/rows(?:\/[^/]+)?$/.test(path);
}

/**
 * Kind-level route matrix for groups that exist today.
 * `user` and `anon` may call `/records` and schema row routes; other surfaces stay closed.
 * `/api/v1` is denied until S0022 (registered separately).
 */
export function routeAllowed(
  principal: Principal,
  method: string,
  rawPath: string,
): boolean {
  const path =
    rawPath === "/me" || rawPath === "/logout" || rawPath === "/anon-key"
      ? `/auth${rawPath}`
      : rawPath;
  if (starts(path, "/api/v1")) return false;

  if (path === "/auth/me" || path === "/auth/logout") return true;
  if (path === "/auth/anon-key") {
    return principal.kind === "operator" && principal.role === "admin";
  }

  if (path === "/realtime" || path === "/realtime/ws") return true;

  if (starts(path, "/x")) {
    if (principal.kind === "operator" && principal.role === "readonly") {
      return false;
    }
    return true;
  }

  if (principal.kind === "user" || principal.kind === "anon") {
    if (starts(path, "/records")) return true;
    if (isSchemaRowPath(path)) return true;
    return false;
  }

  if (isSchemaDdl(method, path)) {
    return principal.kind === "operator" && principal.role === "admin";
  }

  if (principal.kind === "service") {
    if (isControlPlane(path)) return false;
    if (starts(path, "/functions") || starts(path, "/custom-apis")) return false;
    if (path === "/logs") return false;
    if (method === "POST" && path === "/auth/anon-key") return false;
    return true;
  }

  if (principal.kind === "operator" && principal.role === "editor") {
    if (isControlPlane(path)) return false;
  }

  return true;
}

export function allowsRecordWrite(principal: Principal): boolean {
  if (principal.kind === "service") return true;
  // User and anon reach the handler so policies can default-deny or allow.
  if (principal.kind === "user" || principal.kind === "anon") return true;
  if (principal.kind !== "operator") return false;
  return principal.role === "admin" || principal.role === "editor";
}

export function allowsSchemaDdl(principal: Principal): boolean {
  return principal.kind === "operator" && principal.role === "admin";
}

export function allowsManageApis(principal: Principal): boolean {
  return principal.kind === "operator" && principal.role === "admin";
}

export function allowsManageJobs(principal: Principal): boolean {
  return principal.kind === "operator" && principal.role === "admin";
}

export function allowsInvoke(principal: Principal): boolean {
  if (principal.kind === "service") return true;
  if (principal.kind === "user" || principal.kind === "anon") return true;
  if (principal.kind !== "operator") return false;
  return principal.role === "admin" || principal.role === "editor";
}

export function allowsManageBlobs(principal: Principal): boolean {
  return principal.kind === "operator" && principal.role === "admin";
}

export function allowsWriteBlobs(principal: Principal): boolean {
  return allowsRecordWrite(principal);
}

export function allowsWriteVectors(principal: Principal): boolean {
  return allowsRecordWrite(principal);
}
