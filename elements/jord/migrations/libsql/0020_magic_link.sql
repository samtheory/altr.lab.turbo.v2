-- jord migration 0020_magic_link
-- S0074: magic-link tokens reuse jord_auth_tokens (purpose = 'magic'); record the requesting IP.

ALTER TABLE jord_auth_tokens ADD COLUMN created_ip TEXT;
