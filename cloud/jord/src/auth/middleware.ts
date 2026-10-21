import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { JordAuthConfig } from "./config.js";
import {
  canAlterSchema,
  canManageApis,
  canManageJobs,
  canWriteRecords,
  type JordRole,
} from "./roles.js";
import {
  parseAuthorizationHeader,
  resolveBearerRole,
} from "./token.js";

export type JordAuthVariables = {
  jordRole: JordRole;
};

export function createAuthMiddleware(auth: JordAuthConfig) {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const bearer = parseAuthorizationHeader(
        c.req.header("Authorization"),
      );
      if (!bearer) {
        throw new HTTPException(401, {
          message: "missing Authorization Bearer token",
        });
      }

      const role = resolveBearerRole(
        bearer,
        auth.secret,
        auth.defaultRole,
      );
      if (!role) {
        throw new HTTPException(401, {
          message: "invalid or expired credentials",
        });
      }

      c.set("jordRole", role);
      await next();
    },
  );
}

export function requireWriteRecords() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const role = c.get("jordRole");
      if (!canWriteRecords(role)) {
        throw new HTTPException(403, {
          message: "role cannot write records",
        });
      }
      await next();
    },
  );
}

export function requireAlterSchema() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const role = c.get("jordRole");
      if (!canAlterSchema(role)) {
        throw new HTTPException(403, {
          message: "role cannot alter schema",
        });
      }
      await next();
    },
  );
}

export function requireManageApis() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const role = c.get("jordRole");
      if (!canManageApis(role)) {
        throw new HTTPException(403, {
          message: "role cannot manage generated APIs",
        });
      }
      await next();
    },
  );
}

export function requireManageJobs() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const role = c.get("jordRole");
      if (!canManageJobs(role)) {
        throw new HTTPException(403, {
          message: "role cannot manage jobs",
        });
      }
      await next();
    },
  );
}
