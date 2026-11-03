-- jord migration 0017_auth_user_admin
-- S0070: admin-managed users — metadata, last sign-in and ban reason.

ALTER TABLE jord_users ADD COLUMN IF NOT EXISTS user_metadata TEXT;
ALTER TABLE jord_users ADD COLUMN IF NOT EXISTS app_metadata TEXT;
ALTER TABLE jord_users ADD COLUMN IF NOT EXISTS last_sign_in_at BIGINT;
ALTER TABLE jord_users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
