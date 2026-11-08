# Database Architecture & Reference [P3]

This directory contains the relational database assets for the Unified Campus Placement and Eligibility Intelligence platform.

---

## 1. Relational Entities & Tables

| Table | Primary Key | Foreign Keys / Associations | Description |
|---|---|---|---|
| `users` | `id` (UUID) | - | Authentication credentials and role definition (`student`, `officer`, `admin`) |
| `students` | `id` (UUID) | `users(id)` | Academic record, department, CGPA, backlogs |
| `companies` | `id` (UUID) | - | Corporate recruiter profile |
| `job_drives` | `id` (UUID) | `companies(id)` | Campus drive details, eligibility criteria, CTC, deadlines |
| `applications` | `id` (UUID) | `students(id)`, `job_drives(id)` | Student application status tracking (unique per student + drive) |
| `interview_rounds` | `id` (UUID) | `job_drives(id)` | Ordered interview rounds (OA, Tech, HR, etc.) |
| `interview_participants` | `id` (UUID) | `interview_rounds(id)`, `applications(id)` | Attendance and clearance status per round |
| `offers` | `id` (UUID) | `applications(id)`, `students(id)` | Formal job offer record and acceptance state |

---

## 2. Integrity Constraints & Business Rules

1. **Academic Range Checking**:
   - `cgpa`: CHECK (`cgpa >= 0.00 AND cgpa <= 10.00`)
   - `active_backlogs`: CHECK (`active_backlogs >= 0`)
2. **Duplicate Application Prevention**:
   - `CONSTRAINT unique_student_drive_application UNIQUE (student_id, drive_id)`
3. **Sequential Round Integrity**:
   - `CONSTRAINT unique_drive_round_order UNIQUE (drive_id, round_order)`

---

## 3. Database Views

- `view_department_placement_stats`: Aggregated placement percentage, average & max CTC per department.
- `view_drive_conversion_metrics`: Applicant pipeline progression from application to accepted offer.
- `view_student_academic_summary`: Student academic standing, backlogs, and eligibility tier.

---

## 4. Setup Instructions

```bash
# From this directory; provide DB_NAME/DB_USER/DB_HOST/DB_PORT as needed.
bash setup.sh
```
The bootstrap script applies `schema.sql`, the optional legacy seed, numbered
migrations in order, the skills seed, and compatibility views. It is intended
for an empty database. For an existing installation, apply only migrations
that have not already run; do not rerun the non-idempotent base schema or seed.
In Supabase SQL Editor, execute the same files in the migration order below.

## 5. Supabase Alignment Migration

For existing deployments, apply `migrations/002_supabase_alignment.sql` after
the current schema/migrations. It creates/backfills `profiles` and
`academic_records`, adds the new ownership and drive fields, and retains the
legacy `users` table and all existing application rows. The migration changes
application status storage to lowercase text with a CHECK constraint allowing
`applied`, `shortlisted`, `in_interview`, `selected`, `offered`, `accepted`,
`rejected`, and `withdrawn`. It does not remap statuses.

The migration also aligns placement views so accepted application status is
the source of placement counts. It is transactional and safe to rerun.

Apply `migrations/003_eligibility_rule_mandatory.sql` after migration 002. This
adds the mandatory/warning flag used by nested drive eligibility rules; the
column defaults to `TRUE` for existing rules. It also idempotently converts
legacy drive CGPA, backlog, department, and batch-year criteria to eligibility
rules so existing drives keep their eligibility behavior.

Backend integration tests use Supertest with a transactional in-memory test
double: each mocked transaction snapshots its state and restores it on failure.
This tests API status behavior and rollback paths without writing to the
configured development or Supabase database. The test command is
`npm test -- --runInBand` from `backend/`.

## 6. Workflow, Reporting, Skills, and Filter Migrations

For a fresh database, apply the database assets in this order:

1. `schema.sql`
2. `seed.sql` (optional legacy seed; apply before profile alignment)
3. `migrations/001_essential_api_fields.sql`
4. `migrations/002_supabase_alignment.sql`
5. `migrations/003_eligibility_rule_mandatory.sql`
6. `migrations/004_workflow_reports.sql`
7. `migrations/005_skills_filters.sql`
8. `migrations/006_repair_drive_skills.sql`
9. `seed_skills.sql`

Migration 005 must run after `schema.sql` and migrations 001–004: it creates
`skills` and `drive_skills` (with cascading drive deletion, restricted skill
deletion, and a composite `(drive_id, skill_id)` primary key) as well as saved
student filters. If the API reports `relation "drive_skills" does not exist`,
apply `migrations/005_skills_filters.sql` to the existing database; it uses
`CREATE TABLE IF NOT EXISTS` and does not drop or delete data.

Migration 006 is an additive repair for databases where migration 005 was
recorded or partially applied but `drive_skills` is still missing. It creates
the `skills` parent table if needed, then creates the drive-skill join table
with the same foreign keys and composite primary key as migration 005. It is
safe to rerun and does not drop tables or delete data. On an existing database
with migration 005 already applied, apply `migrations/006_repair_drive_skills.sql`
in Supabase SQL Editor (New query → paste → Run). If 005 has not been applied,
apply 005 followed by 006.

The existing analytical views in `views.sql` are retained for compatibility;
the application reports use the versioned views created by migration 004.
Migration 004 adds interview outcomes and offer status while preserving the
legacy columns. Placement means a student with at least one `ACCEPTED` offer.
Migration 005 creates the normalized skills catalog, drive-skill relation,
and per-student saved filters. Migration 006 repairs missing `skills` or
`drive_skills` tables on installations that missed or partially applied 005.

The view integration tests require a disposable PostgreSQL database with all
migrations applied. Set `TEST_DATABASE_URL` and run `npm run test:db` from
`backend/`. Fixture rows are inserted inside a transaction and rolled back;
the normal `npm test` command uses isolated mocks and does not touch PostgreSQL.
