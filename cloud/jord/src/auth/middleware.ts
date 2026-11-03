import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import {
  allowsInvoke,
  allowsManageApis,
  allowsManageBlobs,
  allowsManageJobs,
  allowsRecordWrite,
  allowsSchemaDdl,
  allowsWriteBlobs,
  allowsWriteVectors,
  routeAllowed,
} from "./access.js";
import type { JordDriverPort } from "@altr/jord";

import type { JordAuthConfig } from "./config.js";
import { sessionLive } from "./sessions.js";
import type { Principal } from "./principal.js";
import type { JwtKeyring } from "./keyring.js";
import {
  jwtEnvKeys,
  parseAuthorizationHeader,
  resolvePrincipalWithKeys,
} from "./token.js";

export type JordAuthVariables = {
  principal: Principal;
  accessExp: number | null;
};

export function createAuthMiddleware(
  auth: JordAuthConfig,
  keyring?: JwtKeyring,
  /** S0076: when given, user tokens carrying sid must have a live session. */
  jord?: JordDriverPort,
) {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const bearer = parseAuthorizationHeader(c.req.header("Authorization"));
      if (!bearer) {
        throw new HTTPException(401, {
          message: "missing Authorization Bearer token",
        });
      }

      let keys = jwtEnvKeys(auth);
      if (keyring) {
        try {
          keys = await keyring.keys();
        } catch (err) {
          console.error(
            "[@altr/jord-server] JWT keyring unavailable; using env keys",
            err,
          );
        }
      }
      const resolved = resolvePrincipalWithKeys(bearer, auth, keys);
      if (!resolved) {
        throw new HTTPException(401, {
          message: "invalid or expired credentials",
        });
      }

      const sid = resolved.principal.claims.sid;
      if (
        jord &&
        resolved.principal.kind === "user" &&
        typeof sid === "string" &&
        resolved.principal.uid
      ) {
        let live = false;
        try {
          live = await sessionLive({
            jord,
            id: sid,
            userId: resolved.principal.uid,
          });
        } catch (err) {
          // Fail closed: an unreadable session store must not grant access.
          console.error("[@altr/jord-server] session check failed", err);
        }
        if (!live) {
          throw new HTTPException(401, { message: "session revoked or expired" });
        }
      }

      c.set("principal", resolved.principal);
      c.set("accessExp", resolved.accessExp);
      const path = c.req.path;
      if (!routeAllowed(resolved.principal, c.req.method, path)) {
        throw new HTTPException(403, {
          message: "principal is not allowed on this route",
        });
      }
      await next();
    },
  );
}

function deny(
  allowed: boolean,
  message: string,
): void {
  if (!allowed) throw new HTTPException(403, { message });
}

export function requireWriteRecords() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      deny(
        allowsRecordWrite(c.get("principal")),
        "role cannot write records",
      );
      await next();
    },
  );
}

export function requireWriteTableRows() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      deny(
        allowsRecordWrite(c.get("principal")),
        "role cannot write table rows",
      );
      await next();
    },
  );
}

export function requireAlterSchema() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      deny(
        allowsSchemaDdl(c.get("principal")),
        "role cannot alter schema",
      );
      await next();
    },
  );
}

export function requireManageApis() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      deny(
        allowsManageApis(c.get("principal")),
        "role cannot manage generated APIs",
      );
      await next();
    },
  );
}

export function requireManageJobs() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      deny(allowsManageJobs(c.get("principal")), "role cannot manage jobs");
      await next();
    },
  );
}

export function requireSubscribeRealtime() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      await next();
    },
  );
}

export function requireInvokeApis() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      deny(
        allowsInvoke(c.get("principal")),
        "role cannot invoke custom or function APIs",
      );
      await next();
    },
  );
}

export function requireManageBlobs() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      deny(
        allowsManageBlobs(c.get("principal")),
        "role cannot manage blob buckets",
      );
      await next();
    },
  );
}

export function requireWriteBlobs() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      deny(
        allowsWriteBlobs(c.get("principal")),
        "role cannot write blobs",
      );
      await next();
    },
  );
}

export function requireWriteVectors() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      deny(
        allowsWriteVectors(c.get("principal")),
        "role cannot write vectors",
      );
      await next();
    },
  );
}

export function requireOperatorAdmin() {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      const principal = c.get("principal");
      deny(
        principal.kind === "operator" && principal.role === "admin",
        "operator admin required",
      );
      await next();
    },
  );
}
