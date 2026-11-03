-- jord migration 0019_auth_email
-- S0072: per-project auth email templates (JSON) and sender identity (JSON).
-- Missing/NULL columns mean the built-in defaults.

ALTER TABLE jord_auth_settings ADD COLUMN IF NOT EXISTS email_templates TEXT;
ALTER TABLE jord_auth_settings ADD COLUMN IF NOT EXISTS email_sender TEXT;
