#!/usr/bin/env bash
set -euo pipefail

# DB-027 / QA-DB-001: apply migrations on a clean database and run constraint tests.
# Uses a dedicated local database. Never targets production.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEST_DB="${MARUTI_TEST_DB:-maruti_galaxy_phase2_test}"
ADMIN_DB="${PGDATABASE:-postgres}"

export PGHOST="${PGHOST:-localhost}"
export PGUSER="${PGUSER:-$(whoami)}"

psql_admin() {
  psql -d "$ADMIN_DB" -v ON_ERROR_STOP=1 "$@"
}

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

echo "Running QA-DB-001..."
psql -d "$TEST_DB" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/qa_db_001.sql"

echo "DB-027 and QA-DB-001 passed on ${TEST_DB}."
