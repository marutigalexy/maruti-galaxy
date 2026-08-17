#!/usr/bin/env bash
set -euo pipefail

# PERF-001 / PERF-002: seed 1k jobs / 5k entries and EXPLAIN ANALYZE list queries.
# Local/CI only. Never targets production.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DB="${MARUTI_TEST_DB:-maruti_galaxy_phase2_test}"
ADMIN_DB="${PGDATABASE:-postgres}"
REUSE=0

if [[ "${1:-}" == "--reuse" ]]; then
  REUSE=1
fi

export PGHOST="${PGHOST:-localhost}"
export PGUSER="${PGUSER:-$(whoami)}"

psql_admin() {
  psql -d "$ADMIN_DB" -v ON_ERROR_STOP=1 "$@"
}

db_exists() {
  psql_admin -tAc "SELECT 1 FROM pg_database WHERE datname = '${TEST_DB}'" | grep -q 1
}

apply_schema() {
  echo "Resetting ${TEST_DB}..."
  psql_admin -c "DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE);"
  psql_admin -c "CREATE DATABASE ${TEST_DB};"

  echo "Applying test harness (auth stubs for local Postgres)..."
  psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/harness.sql"

  echo "Applying migration_01.sql..."
  psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/migration_01.sql"

  echo "Applying migration_02.sql..."
  psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/migration_02.sql"

  echo "Applying migration_03.sql..."
  psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/migration_03.sql"

  echo "Applying migration_04.sql..."
  psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/migration_04.sql"
}

if [[ "$REUSE" -eq 1 ]] && db_exists; then
  echo "Reusing ${TEST_DB} (schema already applied)."
  echo "Applying later migrations if needed..."
  psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/migration_03.sql"
  psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/migration_04.sql"
else
  apply_schema
fi

echo "Seeding 1k jobs / 5k entries (PERF-001)..."
psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/seeds/seed_staging_volume.sql"

echo "Running PERF-002 EXPLAIN ANALYZE..."
psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/qa_perf.sql"

echo "Asserting volume seed aborts when maruti.environment=production..."
if psql -d "$TEST_DB" -v ON_ERROR_STOP=1 \
  -c "SET maruti.environment = 'production';" \
  -f "$ROOT/supabase/seeds/seed_staging_volume.sql"
then
  echo "FAIL: volume seed ran against a production-marked database."
  exit 1
fi

echo "PERF-001 and PERF-002 passed on ${TEST_DB}."
