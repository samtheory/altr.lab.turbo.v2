-- jord migration 0018_auth_console
-- S0071: provider toggles, custom claims, and one sealed per-project JWT key.
-- The sealed key is AES-GCM ciphertext (JORD_MASTER_KEY); it is never returned.

ALTER TABLE jord_auth_settings ADD COLUMN email_password_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE jord_auth_settings ADD COLUMN anonymous_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE jord_auth_settings ADD COLUMN custom_claims TEXT;
ALTER TABLE jord_auth_settings ADD COLUMN jwt_key_sealed TEXT;
ALTER TABLE jord_auth_settings ADD COLUMN jwt_key_fingerprint TEXT;
ALTER TABLE jord_auth_settings ADD COLUMN jwt_key_rotated_at BIGINT;
