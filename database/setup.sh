#!/bin/bash
# ==============================================================================
# Database Bootstrap Script: Unified Campus Placement [P3]
# Description: Creates DB schema, loads seeds, and configures views.
# ==============================================================================

set -e

DB_NAME=${DB_NAME:-"campus_placement"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}

echo "🚀 Setting up Campus Placement Database on ${DB_HOST}:${DB_PORT}..."

# Execute Schema
echo "📝 Applying schema.sql..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f schema.sql

# Execute Seeds
echo "🌱 Loading seed.sql..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f seed.sql

# Execute Views
echo "📊 Initializing views.sql..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f views.sql

echo "✅ Database initialized successfully!"
