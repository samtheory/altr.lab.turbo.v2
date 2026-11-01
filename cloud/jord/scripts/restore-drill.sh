#!/usr/bin/env bash
# S0040 — restore a Jord backup into a scratch DB and compare counts + jord_changes max seq.
# NEVER restores over the live DATABASE_URL / JORD_DATABASE_URL.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

load_dotenv() {
  local env_file="${ROOT_DIR}/.env"
  [[ -f "${env_file}" ]] || return 0
  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%$'\r'}"
    [[ -z "${line}" || "${line}" == \#* ]] && continue
    local key="${line%%=*}"
    local val="${line#*=}"
    key="$(echo "${key}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -z "${key}" || -n "${!key+x}" ]] && continue
    val="$(echo "${val}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    if [[ "${val}" == \"*\" && "${val}" == *\" ]]; then
      val="${val:1:${#val}-2}"
    elif [[ "${val}" == \'*\' && "${val}" == *\' ]]; then
      val="${val:1:${#val}-2}"
    fi
    export "${key}=${val}"
  done < "${env_file}"
}

usage() {
  cat <<'EOF'
Usage: restore-drill.sh --dump PATH [--source-url URL] [--target-url URL] [--yes]

  --dump         Backup from backup.sh (.dump custom or .db file copy)
  --source-url   Source / live URL to compare against (default: DATABASE_URL)
  --target-url   Scratch restore target. Must NOT equal the live URL.
                 Postgres default: same host/user, database <db>_drill
                 file: default: <source-dir>/jord_drill.db
  --yes          Required. Confirms the destructive restore into the scratch target.

Refuses when target equals DATABASE_URL or JORD_DATABASE_URL (live).

Blob bytes are not restored — SQL/metadata only. data/blobs/ and S3 stay untouched.
EOF
}

load_dotenv

DUMP=""
SOURCE_URL=""
TARGET_URL=""
YES=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dump)
      DUMP="${2:-}"
      shift 2
      ;;
    --source-url)
      SOURCE_URL="${2:-}"
      shift 2
      ;;
    --target-url)
      TARGET_URL="${2:-}"
      shift 2
      ;;
    --yes)
      YES=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown arg: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "${DUMP}" ]]; then
  echo "--dump is required" >&2
  usage >&2
  exit 2
fi
if [[ ! -f "${DUMP}" ]]; then
  echo "dump not found: ${DUMP}" >&2
  exit 1
fi
if [[ "${YES}" -ne 1 ]]; then
  echo "refusing: pass --yes to restore into the scratch target (never the live DB)" >&2
  exit 2
fi

if [[ -z "${SOURCE_URL}" ]]; then
  SOURCE_URL="${DATABASE_URL:-}"
fi
if [[ -z "${SOURCE_URL}" ]]; then
  SOURCE_URL="file:./data/jord.db"
fi

LIVE_URLS=()
[[ -n "${DATABASE_URL:-}" ]] && LIVE_URLS+=("${DATABASE_URL}")
[[ -n "${JORD_DATABASE_URL:-}" ]] && LIVE_URLS+=("${JORD_DATABASE_URL}")
# Always treat SOURCE_URL as live for this drill.
LIVE_URLS+=("${SOURCE_URL}")

normalize_url() {
  # strip trailing slash; lowercase scheme+host for compare (keep path/user as-is enough)
  local u="$1"
  u="${u%/}"
  echo "${u}"
}

urls_equal() {
  local a b
  a="$(normalize_url "$1")"
  b="$(normalize_url "$2")"
  [[ "${a}" == "${b}" ]]
}

is_postgres() {
  case "$1" in
    postgres://*|postgresql://*) return 0 ;;
    *) return 1 ;;
  esac
}

is_file_libsql() {
  case "$1" in
    file:*) return 0 ;;
    *) return 1 ;;
  esac
}

resolve_file_path() {
  local u="$1"
  local p="${u#file:}"
  if [[ "${p}" == ///* ]]; then
    p="${p#//}"
  elif [[ "${p}" == //* ]]; then
    p="${p#//}"
  fi
  if [[ "${p}" != /* && "${p}" != [A-Za-z]:* ]]; then
    p="${ROOT_DIR}/${p}"
  fi
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -u "${p}" 2>/dev/null || echo "${p}"
  else
    echo "${p}"
  fi
}

# postgres://user:pass@host:port/dbname → parts via python/node for robust parse
pg_dbname() {
  node -e 'const u=new URL(process.argv[1]); const p=u.pathname.replace(/^\//,""); if(!p) process.exit(2); process.stdout.write(p.split("/")[0]);' "$1"
}

pg_url_with_db() {
  local url="$1"
  local db="$2"
  node -e 'const u=new URL(process.argv[1]); u.pathname="/"+process.argv[2]; process.stdout.write(u.toString());' "${url}" "${db}"
}

# Rewrite localhost:hostPort → 127.0.0.1:5432 for use inside the PG container.
pg_url_inside_container() {
  local url="$1"
  node -e '
    const u = new URL(process.argv[1]);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "host.docker.internal") {
      u.hostname = "127.0.0.1";
      u.port = "5432";
    }
    process.stdout.write(u.toString());
  ' "${url}"
}

refuse_if_live() {
  local target="$1"
  local live
  for live in "${LIVE_URLS[@]}"; do
    if urls_equal "${target}" "${live}"; then
      echo "refusing: target URL matches live database (${live})" >&2
      echo "restore-drill only writes to a scratch DB (e.g. *_drill)." >&2
      exit 1
    fi
  done
}

run_psql() {
  local url="$1"
  shift
  if command -v psql >/dev/null 2>&1; then
    psql --dbname="${url}" "$@"
    return
  fi
  if [[ -n "${JORD_BACKUP_PG_CONTAINER:-}" ]]; then
    local inside
    inside="$(pg_url_inside_container "${url}")"
    docker exec -i "${JORD_BACKUP_PG_CONTAINER}" psql --dbname="${inside}" "$@"
    return
  fi
  echo "psql not found. Install client tools or set JORD_BACKUP_PG_CONTAINER." >&2
  exit 1
}

run_pg_restore() {
  local url="$1"
  local dump="$2"
  if command -v pg_restore >/dev/null 2>&1; then
    pg_restore --clean --if-exists --no-owner --no-acl --dbname="${url}" "${dump}"
    return
  fi
  if [[ -n "${JORD_BACKUP_PG_CONTAINER:-}" ]]; then
    local inside
    inside="$(pg_url_inside_container "${url}")"
    docker exec -i "${JORD_BACKUP_PG_CONTAINER}" \
      pg_restore --clean --if-exists --no-owner --no-acl --dbname="${inside}" < "${dump}"
    return
  fi
  echo "pg_restore not found. Install client tools or set JORD_BACKUP_PG_CONTAINER." >&2
  exit 1
}

sql_scalar_pg() {
  local url="$1"
  local sql="$2"
  run_psql "${url}" -v ON_ERROR_STOP=1 -Atc "${sql}" | tr -d '\r'
}

sql_scalar_sqlite() {
  local db="$1"
  local sql="$2"
  if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "sqlite3 CLI required for file: restore drill" >&2
    exit 1
  fi
  sqlite3 "${db}" "${sql}"
}

CORE_TABLES=(
  records
  jord_jobs
  jord_job_runs
  jord_functions
  jord_custom_apis
  jord_policies
  jord_triggers
  jord_blobs
  jord_embeddings
  jord_users
  jord_auth_tokens
  jord_refresh_tokens
  jord_table_rls
  jord_changes
  jord_tracked_tables
  jord_logs
  jord_sql_audit
  jord_migrate_jobs
  jord_migrations
  jord_rate_limits
  jord_idempotency
)

compare_counts() {
  local dialect="$1" # pg | sqlite
  local src="$2"
  local dst="$3"
  local mismatches=0
  local t src_n dst_n

  echo "--- row counts ---"
  printf '%-28s %12s %12s %s\n' "table" "source" "scratch" "ok?"
  for t in "${CORE_TABLES[@]}"; do
    if [[ "${dialect}" == "pg" ]]; then
      src_n="$(sql_scalar_pg "${src}" "SELECT COUNT(*)::text FROM ${t}" 2>/dev/null || echo "missing")"
      dst_n="$(sql_scalar_pg "${dst}" "SELECT COUNT(*)::text FROM ${t}" 2>/dev/null || echo "missing")"
    else
      src_n="$(sql_scalar_sqlite "${src}" "SELECT COUNT(*) FROM ${t};" 2>/dev/null || echo "missing")"
      dst_n="$(sql_scalar_sqlite "${dst}" "SELECT COUNT(*) FROM ${t};" 2>/dev/null || echo "missing")"
    fi
    local mark="OK"
    if [[ "${src_n}" != "${dst_n}" ]]; then
      mark="FAIL"
      mismatches=$((mismatches + 1))
    fi
    printf '%-28s %12s %12s %s\n' "${t}" "${src_n}" "${dst_n}" "${mark}"
  done

  echo "--- jord_changes max seq ---"
  local src_seq dst_seq
  if [[ "${dialect}" == "pg" ]]; then
    src_seq="$(sql_scalar_pg "${src}" "SELECT COALESCE(MAX(seq),0)::text FROM jord_changes" 2>/dev/null || echo "missing")"
    dst_seq="$(sql_scalar_pg "${dst}" "SELECT COALESCE(MAX(seq),0)::text FROM jord_changes" 2>/dev/null || echo "missing")"
  else
    src_seq="$(sql_scalar_sqlite "${src}" "SELECT COALESCE(MAX(seq),0) FROM jord_changes;" 2>/dev/null || echo "missing")"
    dst_seq="$(sql_scalar_sqlite "${dst}" "SELECT COALESCE(MAX(seq),0) FROM jord_changes;" 2>/dev/null || echo "missing")"
  fi
  local seq_mark="OK"
  if [[ "${src_seq}" != "${dst_seq}" ]]; then
    seq_mark="FAIL"
    mismatches=$((mismatches + 1))
  fi
  printf '%-28s %12s %12s %s\n' "max(jord_changes.seq)" "${src_seq}" "${dst_seq}" "${seq_mark}"

  return "${mismatches}"
}

# --- derive default target ---
if [[ -z "${TARGET_URL}" ]]; then
  if is_postgres "${SOURCE_URL}"; then
    SRC_DB="$(pg_dbname "${SOURCE_URL}")"
    case "${SRC_DB}" in
      *_drill)
        echo "source database already ends with _drill (${SRC_DB}); pass --target-url explicitly" >&2
        exit 1
        ;;
    esac
    TARGET_URL="$(pg_url_with_db "${SOURCE_URL}" "${SRC_DB}_drill")"
  elif is_file_libsql "${SOURCE_URL}"; then
    SRC_PATH="$(resolve_file_path "${SOURCE_URL}")"
    TARGET_URL="file:$(dirname "${SRC_PATH}")/jord_drill.db"
  else
    echo "unsupported source URL: ${SOURCE_URL}" >&2
    exit 1
  fi
fi

refuse_if_live "${TARGET_URL}"

echo "restore-drill"
echo "  source: ${SOURCE_URL}"
echo "  target: ${TARGET_URL}"
echo "  dump:   ${DUMP}"
echo "  blobs:  NOT restored (SQL metadata only)"

if is_postgres "${SOURCE_URL}"; then
  if ! is_postgres "${TARGET_URL}"; then
    echo "postgres source requires postgres target" >&2
    exit 1
  fi
  TARGET_DB="$(pg_dbname "${TARGET_URL}")"
  case "${TARGET_DB}" in
    *_drill) ;;
    *)
      echo "refusing: postgres target database must end with _drill (got ${TARGET_DB})" >&2
      exit 1
      ;;
  esac

  # Connect to maintenance DB to DROP/CREATE scratch.
  MAINT_URL="$(pg_url_with_db "${TARGET_URL}" "postgres")"
  echo "recreating scratch database ${TARGET_DB}…"
  run_psql "${MAINT_URL}" -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TARGET_DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${TARGET_DB}";
CREATE DATABASE "${TARGET_DB}";
SQL

  echo "pg_restore…"
  # pg_restore may exit 1 on benign notices; treat real errors via compare step.
  set +e
  run_pg_restore "${TARGET_URL}" "${DUMP}"
  restore_rc=$?
  set -e
  if [[ "${restore_rc}" -gt 1 ]]; then
    echo "pg_restore failed (rc=${restore_rc})" >&2
    exit "${restore_rc}"
  fi

  set +e
  compare_counts pg "${SOURCE_URL}" "${TARGET_URL}"
  rc=$?
  set -e
  if [[ "${rc}" -ne 0 ]]; then
    echo "FAIL: ${rc} mismatch(es)" >&2
    exit 1
  fi
  echo "PASS: postgres restore drill (counts + max seq match)"
  exit 0
fi

if is_file_libsql "${SOURCE_URL}"; then
  if ! is_file_libsql "${TARGET_URL}"; then
    echo "file: source requires file: target" >&2
    exit 1
  fi
  SRC_PATH="$(resolve_file_path "${SOURCE_URL}")"
  DST_PATH="$(resolve_file_path "${TARGET_URL}")"
  if [[ "${SRC_PATH}" == "${DST_PATH}" ]]; then
    echo "refusing: source and target resolve to the same path (${SRC_PATH})" >&2
    exit 1
  fi
  case "${DST_PATH}" in
    *jord_drill.db|*_drill.db) ;;
    *)
      echo "refusing: file target should be named *jord_drill.db or *_drill.db (got ${DST_PATH})" >&2
      exit 1
      ;;
  esac

  echo "restoring file dump → ${DST_PATH}"
  rm -f "${DST_PATH}" "${DST_PATH}-wal" "${DST_PATH}-shm"
  if command -v sqlite3 >/dev/null 2>&1 && [[ "${DUMP}" == *.db ]]; then
    # Prefer sqlite backup API into the scratch path.
    sqlite3 "${DUMP}" ".backup '${DST_PATH}'"
  else
    cp -f "${DUMP}" "${DST_PATH}"
  fi

  if command -v sqlite3 >/dev/null 2>&1; then
    set +e
    compare_counts sqlite "${SRC_PATH}" "${DST_PATH}"
    rc=$?
    set -e
    if [[ "${rc}" -ne 0 ]]; then
      echo "FAIL: ${rc} mismatch(es)" >&2
      exit 1
    fi
    echo "PASS: file libSQL restore drill (counts + max seq match)"
    exit 0
  fi

  # Windows / minimal shells often lack sqlite3 — use the Node helper via @libsql/client.
  echo "sqlite3 CLI missing; comparing via restore-drill-compare.mjs"
  node "${SCRIPT_DIR}/restore-drill-compare.mjs" "${SRC_PATH}" "${DST_PATH}"
  exit $?
fi

echo "unsupported source URL scheme: ${SOURCE_URL}" >&2
exit 1
