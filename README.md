# Unified Campus Placement and Eligibility Intelligence

A centralized, intelligent placement automation system connecting students, placement officers, and recruiting companies. The system evaluates multi-criteria eligibility transparently, tracks interview rounds, and enforces offer compliance.

## Tech Stack

- **Frontend:** React 18, Vite, React Router, CSS design system, Context API
- **Backend:** Node.js, Express, PostgreSQL (`pg`)
- **Authentication:** Supabase Auth access tokens verified by the backend; application roles are read from PostgreSQL `profiles`
- **Database:** PostgreSQL / Supabase, SQL migrations, constraints, and reporting views
- **Testing:** Jest and Supertest; API tests use mocks, with optional PostgreSQL report-view integration tests

## Repository Structure

```text
frontend/                 React application and Supabase client
backend/                  Express API, services, middleware, Jest tests
database/
  schema.sql              Base PostgreSQL schema for a fresh database
  migrations/             Ordered schema changes
  seed.sql                Optional legacy sample records
  seed_skills.sql         Optional skills catalog seed
  setup.sh                Fresh-database bootstrap script
docs/
  API.md                  API paths, roles, payloads, and response details
  postman_collection.json Requests for API testing
```

## 1. Current Status

“Done” means the backend behavior and its primary interface are implemented. “Partial” means an API or backend feature exists but a dedicated end-user interface is not complete.

| Feature | Status | Relevant files |
|---|---|---|
| Supabase authentication and student registration | Done | [authService.js](./frontend/src/services/authService.js), [AuthContext.jsx](./frontend/src/context/AuthContext.jsx), [requireAuth.js](./backend/src/middleware/requireAuth.js) |
| Roles and route permissions | Done | [requireRole.js](./backend/src/middleware/requireRole.js), [routes/](./backend/src/routes/), [002_supabase_alignment.sql](./database/migrations/002_supabase_alignment.sql) |
| Student profile and academic data | Done | [students.routes.js](./backend/src/routes/students.routes.js), [students.service.js](./backend/src/services/students.service.js), [Profile.jsx](./frontend/src/pages/student/Profile.jsx) |
| Company directory and company API | Partial — API supports CRUD; directory UI currently lists and adds companies | [companies.routes.js](./backend/src/routes/companies.routes.js), [companies.service.js](./backend/src/services/companies.service.js), [Companies.jsx](./frontend/src/pages/officer/Companies.jsx) |
| Job drives, company links, statuses, and eligibility rules | Done | [jobDrives.routes.js](./backend/src/routes/jobDrives.routes.js), [jobDrives.service.js](./backend/src/services/jobDrives.service.js), [DriveManage.jsx](./frontend/src/pages/officer/DriveManage.jsx), [005_skills_filters.sql](./database/migrations/005_skills_filters.sql) |
| Eligibility evaluation and readable reasons | Done | [eligibilityService.js](./backend/src/services/eligibilityService.js), [DriveList.jsx](./frontend/src/pages/student/DriveList.jsx), [DriveDetails.jsx](./frontend/src/pages/student/DriveDetails.jsx) |
| Applications and status changes | Done | [applications.routes.js](./backend/src/routes/applications.routes.js), [applicationService.js](./backend/src/services/applicationService.js), [MyApplications.jsx](./frontend/src/pages/student/MyApplications.jsx) |
| Interview rounds | Partial — API and transactional rules exist; dedicated management UI is not available yet | [interviewRounds.routes.js](./backend/src/routes/interviewRounds.routes.js), [interviewRounds.service.js](./backend/src/services/interviewRounds.service.js) |
| Offers and acceptance policy | Partial — API and transactional rules exist; dedicated offer-management UI is not available yet | [offers.routes.js](./backend/src/routes/offers.routes.js), [offerService.js](./backend/src/services/offerService.js) |
| Reports and dashboards | Done — PostgreSQL reports and officer dashboard are available | [reports.routes.js](./backend/src/routes/reports.routes.js), [reports.service.js](./backend/src/services/reports.service.js), [OfficerDashboard.jsx](./frontend/src/pages/officer/OfficerDashboard.jsx), [StudentDashboard.jsx](./frontend/src/pages/student/StudentDashboard.jsx) |
| Drive filters, skills, and saved-filter API | Partial — drive filtering and skills work; saved-filter endpoints exist, but saved-filter UI is not available yet | [jobDrives.service.js](./backend/src/services/jobDrives.service.js), [studentFilters.routes.js](./backend/src/routes/studentFilters.routes.js), [DriveList.jsx](./frontend/src/pages/student/DriveList.jsx) |
| Admin user search and role-management API | Partial — endpoints exist; admin user-management UI is not available yet | [admin.routes.js](./backend/src/routes/admin.routes.js), [admin.service.js](./backend/src/services/admin.service.js) |
| RAG chatbot, Gemini client, and pgvector | Not started | Not available yet |

There are no intentionally stubbed endpoints in the current API route modules. Some workflows above are API-only and therefore do not yet have dedicated UI screens.

## 2. Setup and Run

1. **Install Node.js and Git.** Install a current Node.js LTS release (Node 18 or newer) and Git. Confirm `node --version`, `npm --version`, and `git --version` work in a terminal.
2. **Clone the repository.** Replace the placeholder with your repository URL:

   ```bash
   git clone <repository-url>
   cd Unified-Campus-Placement-and-Eligibility-Intelligence
   ```

3. **Install backend dependencies:**

   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies** in a second terminal from the repository root:

   ```bash
   cd frontend
   npm install
   ```

5. **Create a Supabase project.** In the Supabase dashboard, create a project and configure Authentication for your development URL. In Project Settings, copy the project URL and the server-side service-role key. The frontend uses only the project URL and a publishable/anon key.
6. **Create environment files.** Copy `backend/.env.example` to `backend/.env`, and `frontend/.env.example` to `frontend/.env`. Put your own values in those local files; the variable names are:

   `backend/.env`:

   ```dotenv
   PORT
   NODE_ENV
   DATABASE_URL
   SUPABASE_URL
   SUPABASE_SERVICE_KEY
   FRONTEND_ORIGIN
   MAX_ACCEPTED_OFFERS_PER_STUDENT
   ```

   `frontend/.env`:

   ```dotenv
   VITE_API_URL
   VITE_SUPABASE_URL
   VITE_SUPABASE_PUBLISHABLE_KEY
   ```

   Never commit `.env` files. **Never put `SUPABASE_SERVICE_KEY` or a service-role key in the frontend**; it belongs only in `backend/.env`. The backend accepts a `DATABASE_URL`; alternatively, it can use `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
7. **Apply the database schema and migrations.** For a new, empty database, use the order in [Database Migrations](#3-database-migrations), or run `database/setup.sh` in a shell that has `psql` installed and configured. For an existing Supabase database, use SQL Editor and apply only migrations that have not already run.
8. **Start the backend** in a terminal:

   ```bash
   cd backend
   npm run dev
   ```

9. **Start the frontend** in another terminal:

   ```bash
   cd frontend
   npm run dev
   ```

10. **Open the app URL** printed by Vite (by default, `http://localhost:5173`). The backend defaults to `http://localhost:5000`; set `VITE_API_URL` to `http://localhost:5000/api` for local development.

Public registration creates student accounts. To grant staff access, an existing database administrator must update the user’s `profiles.role` using the SQL in [Supabase SQL Snippets](#4-supabase-sql-snippets). Sign out and sign back in after a role change.

## 3. Database Migrations

For a **fresh database**, apply these files in order. In Supabase, open **SQL Editor**, choose **New query**, paste the contents of one file, and click **Run**. Wait for it to finish before applying the next file.

| Order | File | Purpose |
|---:|---|---|
| 0 | [`database/schema.sql`](./database/schema.sql) | Creates the base enums and core tables: users, students, companies, drives, applications, interview rounds, participants, and offers. Fresh databases only. |
| Optional | [`database/seed.sql`](./database/seed.sql) | Adds legacy/sample records for a local or demo database. Do not run unless you want those records. |
| 1 | [`database/migrations/001_essential_api_fields.sql`](./database/migrations/001_essential_api_fields.sql) | Adds essential nullable academic/profile fields and allows Supabase-managed accounts without local password hashes. |
| 2 | [`database/migrations/002_supabase_alignment.sql`](./database/migrations/002_supabase_alignment.sql) | Adds/backfills profiles and academic records, aligns drive/company fields and application status constraints, and adds relational constraints while retaining existing records. |
| 3 | [`database/migrations/003_eligibility_rule_mandatory.sql`](./database/migrations/003_eligibility_rule_mandatory.sql) | Adds the `mandatory` flag to `eligibility_rules` and converts legacy drive criteria into rules. |
| 4 | [`database/migrations/004_workflow_reports.sql`](./database/migrations/004_workflow_reports.sql) | Adds interview outcomes and offer status, then creates the four `v_*` reporting views. |
| 5 | [`database/migrations/005_skills_filters.sql`](./database/migrations/005_skills_filters.sql) | Creates `skills`, `drive_skills`, and `student_filters`, including the drive-skill composite primary key and foreign keys. |
| 6 | [`database/migrations/006_repair_drive_skills.sql`](./database/migrations/006_repair_drive_skills.sql) | Idempotently repairs a missing `skills` or `drive_skills` table when migration 005 was missed or partially applied; preserves existing rows and the same foreign keys and composite key. |
| Optional | [`database/seed_skills.sql`](./database/seed_skills.sql) | Inserts a starter skills catalog; safe to rerun because it uses `ON CONFLICT DO NOTHING`. |
| Optional | [`database/views.sql`](./database/views.sql) | Creates compatibility reporting views for older consumers. |

For a new database, `database/setup.sh` applies the base schema, legacy seed, migrations 001–006, skills seed, and compatibility views. It requires `psql` and database connection settings; note that the script runs `seed.sql` and therefore adds its sample records. Do **not** run this full bootstrap against an existing database: `schema.sql` has enum creation statements that are not designed to be rerun, and the seed may add sample records.

For an existing database where the Drive Manager reports `relation "drive_skills" does not exist`, apply migration 006 in Supabase SQL Editor (New query → paste the contents of `006_repair_drive_skills.sql` → Run). If migration 005 has never been applied, run 005 first, then 006. Both use `CREATE TABLE IF NOT EXISTS` and do not drop tables or delete data. Do not rerun the base schema or old migrations blindly. This project does not maintain a migration-history table; compare the deployed schema with the migration files and coordinate with the database owner before applying pending files in order. Never edit an old migration file to repair an installation; add a new, numbered migration instead.

### Supabase “destructive operations” warning

Supabase may show a warning when a query changes schema objects. The numbered migrations do not drop tables or delete existing table rows. Migration 002 does intentionally drop and recreate selected foreign-key constraints and drops a legacy view before replacing the related schema/view definitions; these operations affect database objects, not table contents. Read the migration and confirm you are applying it to the intended project. Back up important data first. Do not run the fresh-database schema or seed on a live/existing database.

The optional [`database/queries/constraint_tests.sql`](./database/queries/constraint_tests.sql) intentionally attempts invalid inserts. It is for a disposable database only; do not run it on production.

## 4. Supabase SQL Snippets

Run these in Supabase **SQL Editor → New query → paste → Run**. Replace `<SUPABASE_AUTH_USER_UUID>` and `<DRIVE_UUID>` with real IDs; do not paste secrets into SQL.

**Make a user an officer, administrator, or recruiter.** Use exactly one statement for the desired role; then log out and back in so the app reloads the profile role.

```sql
UPDATE profiles SET role = 'OFFICER' WHERE id = '<SUPABASE_AUTH_USER_UUID>';
-- Or: UPDATE profiles SET role = 'ADMIN' WHERE id = '<SUPABASE_AUTH_USER_UUID>';
-- Or: UPDATE profiles SET role = 'RECRUITER' WHERE id = '<SUPABASE_AUTH_USER_UUID>';
```

**Check existing user roles.** The app stores role names in uppercase in `profiles.role`.

```sql
SELECT id, email, full_name, role FROM profiles ORDER BY created_at DESC;
```

**Count records in the main tables.** A zero count is valid if the application has not created records yet.

```sql
SELECT 'profiles' AS table_name, COUNT(*) FROM profiles
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'companies', COUNT(*) FROM companies
UNION ALL SELECT 'job_drives', COUNT(*) FROM job_drives
UNION ALL SELECT 'eligibility_rules', COUNT(*) FROM eligibility_rules
UNION ALL SELECT 'applications', COUNT(*) FROM applications
UNION ALL SELECT 'interview_rounds', COUNT(*) FROM interview_rounds
UNION ALL SELECT 'offers', COUNT(*) FROM offers
UNION ALL SELECT 'skills', COUNT(*) FROM skills
UNION ALL SELECT 'drive_skills', COUNT(*) FROM drive_skills
UNION ALL SELECT 'student_filters', COUNT(*) FROM student_filters
ORDER BY table_name;
```

**Check application workflow counts.** Status values are lowercase.

```sql
SELECT status, COUNT(*) AS total
FROM applications
GROUP BY status
ORDER BY status;
```

**Check that eligibility rules have the `mandatory` column.**

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'eligibility_rules'
  AND column_name = 'mandatory';
```

**Publish a drive.** Replace the UUID; publishing means `status = 'active'`.

```sql
UPDATE job_drives
SET status = 'active'
WHERE id = '<DRIVE_UUID>';
```

**Test the report views.** These views are created by migration 004; the query returns their current database-backed results.

```sql
SELECT * FROM v_placement_summary;
SELECT * FROM v_department_placement LIMIT 20;
SELECT * FROM v_drive_funnel LIMIT 20;
SELECT * FROM v_upcoming_deadlines LIMIT 20;
```

## 5. How to Test

### Automated backend tests

```bash
cd backend
npm test
```

The normal Jest/Supertest suite uses a mocked database and does not write to PostgreSQL. The report-view integration tests are optional and require a migrated, **disposable** PostgreSQL database:

```bash
# Set TEST_DATABASE_URL in your local shell to the disposable test database.
npm run test:db
```

### Manual end-to-end test

1. Open the app and register a student account using the registration form. Supabase Auth creates the account; public registration receives the `STUDENT` role.
2. Sign in as the student, complete the academic profile (department, CGPA, graduation year, and backlogs), and confirm the student dashboard and drive list load.
3. Promote a separate test account to `OFFICER` or `ADMIN` with the role SQL snippet above, then sign out and sign in again.
4. As the officer/admin, add or select a company in Company Directory and create a drive in Drive Manager. Set its company, deadline, package, status, and eligibility requirements. Use `active` to publish; drafts are not shown to students.
5. As the student, refresh Job Drives. The API only returns active drives whose deadlines have not passed. Check the eligibility badge and reasons; apply only when eligible.
6. As the officer/admin, verify the application and reports. The reports dashboard uses PostgreSQL data. Interview and offer workflows are available through the API; dedicated management screens are **not available yet**.
7. As the student, view personal applications in the UI and test personal offers with `GET /api/offers/me` in Postman; a dedicated offers screen is **not available yet**. Saved-filter persistence and admin user-management screens are also **not available yet**.

### Postman

Import [`docs/postman_collection.json`](./docs/postman_collection.json) into Postman. Set `baseUrl` to the backend API base URL (for local development, `http://localhost:5000/api`). Sign in to Supabase as each test role and set the matching `studentToken`, `officerToken`, `recruiterToken`, or `adminToken` collection variable to that account’s access token. Requests use `Authorization: Bearer <token>`; do not use a service-role key as a bearer token. Role changes require signing out and in again.

### Troubleshooting

| Message or symptom | What to check |
|---|---|
| `Supabase authentication is not configured` | Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `backend/.env`, restart the backend, and ensure the service key remains server-side only. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `frontend/.env` for frontend sign-in. |
| `Access restricted to roles: student` | The endpoint requires `STUDENT`. Check `profiles.role`; staff-only endpoints require their listed staff role. After changing a role in SQL, log out and back in. |
| HTTP 500 | Check backend terminal logs, `DATABASE_URL`, Supabase settings, network access, and whether all required migrations were applied. Do not paste credentials into issue reports. |
| `column does not exist` | The database is behind the application code. Apply the pending migrations in order; don’t edit old migration files or guess a column name. |
| A drive is not visible to students | Confirm the `job_drives.company_id` links to an existing company, `status` is `active`, and `application_deadline` is in the future. Check the student’s values in `academic_records`/`students` against mandatory `eligibility_rules`, and clear drive-list filters such as skills or “Eligible only.” Draft, closed, and expired drives are intentionally hidden. |

## 6. API Endpoints

All paths below are under `/api`. Protected routes require a Supabase access token in the `Authorization: Bearer ...` header. The API route source is in [`backend/src/routes/`](./backend/src/routes/); request/response details are in [`docs/API.md`](./docs/API.md). Compatibility drive aliases are mounted at both `/job-drives` and `/drives`.

| Method | Path | Roles |
|---|---|---|
| `GET` | `/health` | Public |
| `GET` | `/auth/me` | Any authenticated |
| `GET`, `PUT` | `/students/me` | Student |
| `GET`, `PUT` | `/students/profile` (legacy aliases) | Student |
| `GET` | `/students` | Officer, Admin |
| `GET`, `POST`, `PUT`, `DELETE` | `/students/me/filters`, `/students/me/filters/:id` | Student |
| `GET` | `/companies`, `/companies/:id` | Any authenticated |
| `POST`, `PUT`, `DELETE` | `/companies`, `/companies/:id` | Officer, Admin, Recruiter (recruiter ownership applies) |
| `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `/job-drives`, `/job-drives/:id`, `/job-drives/:id/status` | Read: any authenticated; writes: Officer, Admin, Recruiter (ownership applies) |
| `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `/drives`, `/drives/:id`, `/drives/:id/status` | Same as `/job-drives` compatibility alias |
| `GET` | `/job-drives/:id/eligibility` | Student |
| `GET` | `/job-drives/:id/applications` | Officer, Admin, Recruiter (own drive) |
| `POST` | `/job-drives/:id/applications` | Student |
| `POST` | `/applications` | Student |
| `POST` | `/applications/:id/offers` | Officer, Admin |
| `GET` | `/applications/me`, `/applications/my` | Student |
| `GET` | `/applications/drive/:driveId` | Officer, Admin, Recruiter (own drive) |
| `PATCH` | `/applications/:id/status` | Student (own withdrawal), Officer, Admin |
| `GET`, `POST` | `/applications/:id/interview-rounds` | Officer, Admin, Recruiter (own drive) |
| `GET` | `/interviews/drive/:driveId` | Officer, Admin, Recruiter (own drive) |
| `POST` | `/interviews`, `/interviews/participants/attendance`, `/interviews/participants/result` | Officer, Admin |
| `PATCH` | `/interview-rounds/:id` | Officer, Admin, Recruiter (own drive) |
| `POST` | `/applications/:id/offers`, `/offers` | Officer, Admin |
| `GET` | `/offers/me`, `/offers/my` | Student |
| `GET` | `/offers/all` | Officer, Admin |
| `PATCH` | `/offers/:id/status`, `/offers/:id/decision` | Student (own offer); Officer/Admin may withdraw via status endpoint |
| `GET` | `/reports/placement-summary`, `/reports/:name`, `/reports/department-summary`, `/reports/funnel-metrics`, `/reports/export/drive/:driveId` | Officer, Admin |
| `GET` | `/skills` | Any authenticated |
| `GET` | `/admin/users`, `PATCH /admin/users/:id/role` | Admin |

There is no mounted public `/auth/register` or `/auth/login` API route: signup/sign-in use Supabase Auth from the frontend. The backend verifies bearer tokens and loads roles from `profiles`. No route in the current API router is intentionally a stub. RAG chatbot/Gemini/pgvector endpoints are **not available yet**.

## 7. Roles and Permissions

| Role | Permissions |
|---|---|
| `STUDENT` | Maintain own profile; browse active, unexpired drives; see eligibility reasons; apply when eligible; read own applications/offers; withdraw own eligible application; accept or decline own offered offer; manage own saved-filter API records. |
| `OFFICER` | Manage companies and drives; manage applications and interview rounds; issue/withdraw offers; view reports and student lists. |
| `ADMIN` | Officer capabilities plus list users, change roles, and use the explicit eligibility-rule override where allowed. An admin cannot demote themselves if they are the last admin. |
| `RECRUITER` | Manage drives for owned companies, view applicants and manage rounds for owned drives. Recruiters cannot issue offers or view officer/admin reports. |

The backend does not trust role metadata in the Supabase token. It reads the role from `profiles.role` after validating the Supabase access token. Public signup creates a student; staff roles must be assigned by an administrator.

## 8. Application Status Workflow

Application status values are lowercase in PostgreSQL.

| Current status | Allowed next status | Actor / condition |
|---|---|---|
| `applied` | `shortlisted`, `rejected`, `withdrawn` | Officer/Admin may shortlist or reject; student may withdraw own application. Adding the first application-scoped interview round promotes it to `shortlisted` transactionally. |
| `shortlisted` | `selected`, `rejected`, `withdrawn` | Officer/Admin may select or reject; student may withdraw. Interview rounds may be added while shortlisted. |
| `in_interview` | `selected`, `rejected` | Officer/Admin; selection requires all associated rounds to have passed. The legacy `/interviews` flow can move shortlisted applications into this state. |
| `selected` | `offered` | Issuing an offer moves the application to `offered` in the same transaction. |
| `offered` | `accepted`, `rejected` | Student acceptance sets `accepted`; a declined offer sets the application to `rejected`. Staff withdrawal also sets the application to `rejected`. |
| `accepted`, `rejected`, `withdrawn` | None | Terminal application states for these workflows. |

Interview-round failures reject the application. An application-scoped round may only be added to a shortlisted application (or an applied application, which is first promoted to shortlisted in the same transaction). Only `OFFERED` offers can be changed. By default, a student may accept one offer; configure `MAX_ACCEPTED_OFFERS_PER_STUDENT` to change the limit. Placement reporting defines a placed student as one with an accepted offer.

## 9. Known Issues and Remaining Work

- Interview-round and offer operations have backend APIs and tests, but dedicated frontend management screens are **not available yet**.
- Saved student filters have backend endpoints; UI for saving and restoring them is **not available yet**.
- Admin user search/role endpoints are implemented; an admin user-management page is **not available yet**.
- RAG chatbot endpoints, Gemini client integration, and pgvector schema are **not started**.
- PostgreSQL view integration tests require `TEST_DATABASE_URL` pointed at a disposable database with migrations applied. They are skipped when it is unset.
- `database/setup.sh` is for fresh databases only. For existing deployments, apply pending migrations individually and in order.

## Screenshots

Screenshots will be placed in `docs/screenshots/` when UI views are generated.
