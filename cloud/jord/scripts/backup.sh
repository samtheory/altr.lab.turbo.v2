#!/usr/bin/env bash
# S0040 — dump the live Jord database (Postgres custom format, or copy a file: libSQL DB).
# Does NOT copy blob bytes (data/blobs/ or the S3 bucket). See Docs/tech_space/jord/overview.
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
Usage: backup.sh [--url URL] [--out PATH] [--help]

  --url   Source database URL (default: DATABASE_URL, else file:./data/jord.db)
  --out   Dump path. Postgres default: ./backups/jord-<stamp>.dump
          file: libSQL default: ./backups/jord-<stamp>.db

Env:
  DATABASE_URL              Live / source URL (canonical)
  JORD_DATABASE_URL         Optional alias; if set, treated as live URL for guards
  JORD_BACKUP_PG_CONTAINER  Optional docker container with pg_dump (e.g. jord-pg)

Blob bytes are NOT included. Back up data/blobs/ or the S3 bucket separately.
EOF
}

load_dotenv

URL=""
OUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      URL="${2:-}"
      shift 2
      ;;
    --out)
      OUT="${2:-}"
      shift 2
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

if [[ -z "${URL}" ]]; then
  URL="${DATABASE_URL:-}"
fi
if [[ -z "${URL}" ]]; then
  URL="file:./data/jord.db"
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${ROOT_DIR}/backups"

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
  # strip optional // authority (file:///C:/... or file://./data/...)
  if [[ "${p}" == ///* ]]; then
    p="${p#//}"
  elif [[ "${p}" == //* ]]; then
    p="${p#//}"
  fi
  if [[ "${p}" != /* && "${p}" != [A-Za-z]:* ]]; then
    p="${ROOT_DIR}/${p}"
  fi
  # Git Bash: convert /c/foo → usable path via cygpath when available
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -u "${p}" 2>/dev/null || echo "${p}"
  else
    echo "${p}"
  fi
}

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

run_pg_dump() {
  local url="$1"
  local out="$2"
  if command -v pg_dump >/dev/null 2>&1; then
    pg_dump --format=custom --no-owner --no-acl --dbname="${url}" --file="${out}"
    return
  fi
  if [[ -n "${JORD_BACKUP_PG_CONTAINER:-}" ]]; then
    local inside
    inside="$(pg_url_inside_container "${url}")"
    # Stream custom dump from the container to the host path.
    docker exec -i "${JORD_BACKUP_PG_CONTAINER}" \
      pg_dump --format=custom --no-owner --no-acl --dbname="${inside}" > "${out}"
    return
  fi
  echo "pg_dump not found. Install client tools or set JORD_BACKUP_PG_CONTAINER." >&2
  exit 1
}

if is_postgres "${URL}"; then
  if [[ -z "${OUT}" ]]; then
    OUT="${ROOT_DIR}/backups/jord-${STAMP}.dump"
  fi
  echo "backup: postgres → ${OUT}"
  run_pg_dump "${URL}" "${OUT}"
  echo "ok: $(wc -c < "${OUT}" | tr -d ' ') bytes"
  echo "note: blob bytes NOT in this dump (local data/blobs/ or S3)"
  exit 0
fi

if is_file_libsql "${URL}"; then
  SRC="$(resolve_file_path "${URL}")"
  if [[ ! -f "${SRC}" ]]; then
    echo "file database not found: ${SRC}" >&2
    exit 1
  fi
  if [[ -z "${OUT}" ]]; then
    OUT="${ROOT_DIR}/backups/jord-${STAMP}.db"
  fi
  echo "backup: file libSQL ${SRC} → ${OUT}"
  # Prefer a consistent checkpoint copy. sqlite3 .backup when available; else cp.
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "${SRC}" ".backup '${OUT}'"
  else
    cp -f "${SRC}" "${OUT}"
    # Best-effort sidecar WAL/SHM (may be empty / absent)
    [[ -f "${SRC}-wal" ]] && cp -f "${SRC}-wal" "${OUT}-wal" || true
    [[ -f "${SRC}-shm" ]] && cp -f "${SRC}-shm" "${OUT}-shm" || true
  fi
  echo "ok: $(wc -c < "${OUT}" | tr -d ' ') bytes"
  echo "note: blob bytes NOT in this dump (local data/blobs/ or S3)"
  exit 0
fi

echo "unsupported DATABASE_URL scheme (need postgres://, postgresql://, or file:): ${URL}" >&2
echo "hosted libsql:// backups are out of scope for S0040 (use provider tooling)." >&2
exit 1
