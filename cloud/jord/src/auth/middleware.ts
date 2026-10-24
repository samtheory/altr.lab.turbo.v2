import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { JordAuthConfig } from "./config.js";
import {
  canAlterSchema,
  canInvokeApis,
  canManageApis,
  canManageBlobs,
  canManageJobs,
  canSubscribeRealtime,
  canWriteBlobs,
  canWriteRecords,
  canWriteTableRows,
  canWriteVectors,
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

export function requireWriteTableRows() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const role = c.get("jordRole");
      if (!canWriteTableRows(role)) {
        throw new HTTPException(403, {
          message: "role cannot write table rows",
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

export function requireSubscribeRealtime() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const role = c.get("jordRole");
      if (!canSubscribeRealtime(role)) {
        throw new HTTPException(403, {
          message: "role cannot subscribe to realtime",
        });
      }
      await next();
    },
  );
}

export function requireInvokeApis() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const role = c.get("jordRole");
      if (!canInvokeApis(role)) {
        throw new HTTPException(403, {
          message: "role cannot invoke custom or function APIs",
        });
      }
      await next();
    },
  );
}

export function requireManageBlobs() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const role = c.get("jordRole");
      if (!canManageBlobs(role)) {
        throw new HTTPException(403, {
          message: "role cannot manage blob buckets",
        });
      }
      await next();
    },
  );
}

export function requireWriteBlobs() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const role = c.get("jordRole");
      if (!canWriteBlobs(role)) {
        throw new HTTPException(403, {
          message: "role cannot write blobs",
        });
      }
      await next();
    },
  );
}

export function requireWriteVectors() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const role = c.get("jordRole");
      if (!canWriteVectors(role)) {
        throw new HTTPException(403, {
          message: "role cannot write vectors",
        });
      }
      await next();
    },
  );
}
