-- jord migration 0017_auth_user_admin
-- S0070: admin-managed users — metadata, last sign-in and ban reason.

ALTER TABLE jord_users ADD COLUMN user_metadata TEXT;
ALTER TABLE jord_users ADD COLUMN app_metadata TEXT;
ALTER TABLE jord_users ADD COLUMN last_sign_in_at INTEGER;
ALTER TABLE jord_users ADD COLUMN ban_reason TEXT;
