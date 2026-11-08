#!/bin/bash
# ==============================================================================
# Database Bootstrap Script: Unified Campus Placement [P3]
# Description: Creates DB schema, loads seeds, and configures views.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME=${DB_NAME:-"campus_placement"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}

echo "🚀 Setting up Campus Placement Database on ${DB_HOST}:${DB_PORT}..."

run_sql() {
  local file="$1"
  echo "📝 Applying ${file}..."
  psql -v ON_ERROR_STOP=1 \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -f "${SCRIPT_DIR}/${file}"
}

# Core schema and optional legacy fixtures must precede profile alignment.
run_sql "schema.sql"
run_sql "seed.sql"

# Apply additive migrations in dependency order.
run_sql "migrations/001_essential_api_fields.sql"
run_sql "migrations/002_supabase_alignment.sql"
run_sql "migrations/003_eligibility_rule_mandatory.sql"
run_sql "migrations/004_workflow_reports.sql"
run_sql "migrations/005_skills_filters.sql"
run_sql "migrations/006_repair_drive_skills.sql"

run_sql "seed_skills.sql"
run_sql "views.sql"

echo "✅ Database initialized successfully!"
