-- jord migration 0010_project_db_password_sealed
-- Persist AES-GCM sealed DB passwords for registered projects (S0043).

ALTER TABLE jord_projects ADD COLUMN IF NOT EXISTS db_password_sealed TEXT;
