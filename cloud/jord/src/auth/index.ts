export {
  resolveAuthConfig,
  resolveLegacyMode,
  type JordAuthConfig,
  type LegacySecretMode,
} from "./config.js";
export {
  allowsInvoke,
  allowsRecordWrite,
  routeAllowed,
} from "./access.js";
export {
  confirmUser,
  normalizeEmail,
  rotateRefreshToken,
  signupUser,
} from "./identity.js";
export {
  ACCESS_TTL_SEC,
  ANON_TTL_SEC,
  CLOCK_SKEW_SEC,
  CURRENT_KID,
  PREVIOUS_KID,
  signAccessToken,
  verifyJwt,
} from "./jwt.js";
export { ConsoleMailer, type MailerPort, type OutboundMail } from "./mailer.js";
export {
  createAuthMiddleware,
  requireAlterSchema,
  requireInvokeApis,
  requireManageApis,
  requireManageBlobs,
  requireManageJobs,
  requireOperatorAdmin,
  requireSubscribeRealtime,
  requireWriteBlobs,
  requireWriteRecords,
  requireWriteTableRows,
  requireWriteVectors,
  type JordAuthVariables,
} from "./middleware.js";
export { hashPassword, verifyPassword } from "./password.js";
export {
  isPrincipalKind,
  PRINCIPAL_KINDS,
  type Principal,
  type PrincipalKind,
} from "./principal.js";
export { createAuthRoutes, tokenFromMail } from "./routes.js";
export {
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
  isJordRole,
  JORD_ROLES,
  type JordRole,
} from "./roles.js";
export {
  DEFAULT_SESSION_TTL_MS,
  parseAuthorizationHeader,
  resetRawBearerWarning,
  resolveBearerRole,
  resolvePrincipal,
  signSessionToken,
  warnRawBearer,
  type JordSessionClaims,
  type ResolvedAccess,
} from "./token.js";
