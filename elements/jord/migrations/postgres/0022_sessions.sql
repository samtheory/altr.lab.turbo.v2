-- jord migration 0022_sessions
-- S0076: server-side session rows. A session id is the refresh-token family id,
-- so revoking a session also kills its refresh tokens. Access tokens carry `sid`.

CREATE TABLE IF NOT EXISTS jord_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  user_agent TEXT,
  ip TEXT,
  created_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL,
  revoked_at BIGINT,
  expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS jord_sessions_user_idx
ON jord_sessions (user_id);
