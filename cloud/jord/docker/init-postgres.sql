-- Compose smoke init (S0041). Runs once on empty PGDATA.
-- Owner = POSTGRES_USER (jord_owner). Runtime = jord_app (DATABASE_URL).
-- Password must match docker-compose.yml; change before any real deploy.

DO $$ BEGIN
  CREATE ROLE jord_app LOGIN PASSWORD 'jord_app_dev' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

GRANT CONNECT ON DATABASE jord TO jord_app;
GRANT USAGE ON SCHEMA public TO jord_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jord_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO jord_app;
