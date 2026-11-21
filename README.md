# Unified Campus Placement and Eligibility Intelligence

A campus placement platform that connects students, placement officers, and recruiters in a single workflow. The system helps students discover eligible drives, officers manage job postings and interviews, and recruiters track application outcomes through a structured eligibility pipeline.

## Overview

This project combines:

- a React frontend for student and officer workflows
- an Express backend for business logic and role-based APIs
- a PostgreSQL/Supabase data layer with migration-based schema changes
- JWT-based access control, role enforcement, and eligibility evaluation rules

The platform focuses on transparent eligibility checks, application workflow tracking, and reporting for placement operations.

## Features

- Student registration and authentication with Supabase
- Role-based access for students, officers, admins, and recruiters
- Academic profile management and drive eligibility evaluation
- Drive creation, publishing, skills-based filtering, and application lifecycle management
- Interview round tracking and offer acceptance workflows
- Reporting views for placement summary and recruitment funnel insights
- centralized backend validation and service-layer business rules

## Tech Stack

- Frontend: React + Vite + React Router
- Styling: custom CSS, component-based UI, shared frontend state
- Backend: Node.js + Express
- Database: PostgreSQL / Supabase
- Auth: Supabase authentication + JWT verification on the backend
- Validation: Zod for request validation
- Testing: Jest + Supertest

## Repository Structure

```text
backend/                 Express API, services, middleware, and tests
frontend/                React application and client-side auth flow
database/                PostgreSQL schema, migrations, and seed scripts
docs/                    API docs, ER diagram, Postman collections, and notes
README.md                Project overview and setup instructions
```

## Current Project Status

The project is in active development, with core placement workflows implemented and a few administrative or UI flows still partial.

| Area | Status | Notes |
|---|---|---|
| Student authentication and onboarding | Done | Registration and login flow are in place |
| Officer/admin role enforcement | Done | Backend route checks are implemented |
| Drive creation and eligibility rules | Done | Drives, skills, and evaluation logic are supported |
| Student applications and status handling | Done | Application lifecycle is implemented |
| Interview round processing | Partial | API logic exists; some management screens remain limited |
| Offer management | Partial | Backend workflow exists; dedicated UI is still limited |
| Reporting dashboards | Done | Reporting views and dashboard APIs are included |
| Admin user-management UI | Partial | API exists, but some management screens remain incomplete |

## Prerequisites

Before running the project, ensure you have:

- Node.js 18 or newer
- npm
- Git
- A PostgreSQL-compatible database or Supabase project

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd Unified-Campus-Placement-and-Eligibility-Intelligence
```

### 2. Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 3. Configure environment variables

Copy the sample env files and set your own values.

Backend:

```bash
cp backend/.env.example backend/.env
```

Frontend:

```bash
cp frontend/.env.example frontend/.env
```

Example backend variables:

```dotenv
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@host:5432/dbname
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
FRONTEND_ORIGIN=http://localhost:5173
MAX_ACCEPTED_OFFERS_PER_STUDENT=2
```

Example frontend variables:

```dotenv
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Important:

- never commit `.env` files
- keep `SUPABASE_SERVICE_KEY` only on the backend
- do not expose service-role credentials in the browser

### 4. Apply the database schema

For a new database, run the database bootstrap in order using the migration files under `database/`.

```bash
cd database
./setup.sh
```

If you are using Supabase, apply the files from `database/schema.sql` and `database/migrations/` in sequence using the SQL editor. Review the migration order before running them on an existing database.

### 5. Run the app

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend usually runs on:

```text
http://localhost:5173
```

The backend typically runs on:

```text
http://localhost:5000
```

## Database and Migration Notes

The database layer includes base schema definitions, migration scripts, and optional seed data for testing or demo usage.

Key migration-related files:

- `database/schema.sql`
- `database/setup.sh`
- `database/migrations/001_essential_api_fields.sql`
- `database/migrations/002_supabase_alignment.sql`
- `database/migrations/003_eligibility_rule_mandatory.sql`
- `database/migrations/004_workflow_reports.sql`
- `database/migrations/005_skills_filters.sql`
- `database/migrations/006_repair_drive_skills.sql`

Always back up production data before applying schema-changing queries. Do not run the fresh database setup script against an existing database without reviewing the migration sequence.

## Testing

Run backend tests:

```bash
cd backend
npm test
```

Optional database integration validation:

```bash
cd backend
npm run test:db
```

This command is intended for a disposable PostgreSQL database and is not meant for production data.

## API Documentation

Project API documentation is available in:

- `docs/API.md`
- `docs/postman_collection.json`
- `docs/postman.json`

These files cover request structures, route expectations, and role-based access patterns.

## Role Management

To promote a user to an officer or admin role, update the `profiles.role` value in Supabase.

Example:

```sql
UPDATE profiles SET role = 'OFFICER' WHERE id = '<SUPABASE_AUTH_USER_UUID>';
```

After changing a role, the user should sign out and sign back in so the updated token/profile state is refreshed.

## Database Connection Troubleshooting

### Direct connection vs Session Pooler

Supabase provides two connection strings. Use the **Session Pooler** for local development:

| Type | Host pattern | Port | When to use |
|---|---|---|---|
| **Direct** | `db.<ref>.supabase.co` | 5432 | Requires IPv6; migrations & admin tasks |
| **Session Pooler** ✓ | `aws-0-<region>.pooler.supabase.com` | 5432 | Local dev, CI, most home/office networks |
| Transaction Pooler | `aws-0-<region>.pooler.supabase.com` | 6543 | Stateless short-lived queries only; avoid for this project |

Copy the Session Pooler string from **Supabase Dashboard → Settings → Database → Connection string → Session mode**.

```dotenv
# backend/.env — Session Pooler (recommended)
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

### IPv6 note

The direct host (`db.<ref>.supabase.co`) resolves to an IPv6 address only. If your network has no IPv6 support (most home routers, campus Wi-Fi, some VPNs), every connection attempt will fail with:

```
connect ETIMEDOUT <IPv6 address>:5432
```

**Solution:** switch `DATABASE_URL` to the Session Pooler URL above.

### URL-encoding special characters in the password

If your Supabase database password contains special characters (`@`, `/`, `:`, `?`, `#`, `%`, `+`, space), they must be percent-encoded in the URL:

| Character | Encoded |
|---|---|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `:` | `%3A` |
| `/` | `%2F` |
| `+` | `%2B` |
| space | `%20` |

Example — password `p@ss#word` becomes `p%40ss%23word` in the URL.

### How to test connectivity with a phone hotspot

If you are unsure whether your network has IPv6:

1. Enable your phone's personal hotspot (mobile data provides dual-stack IPv4+IPv6 on most carriers).
2. Connect your laptop to the hotspot.
3. Start the backend (`npm --prefix backend run dev`).
4. Watch the startup log for `✓ Database connection verified` or the ETIMEDOUT hint.

If the direct host works on the hotspot but not on your regular network, your regular network lacks IPv6 — switch to the pooler URL permanently.

### Quick checklist

- [ ] `DATABASE_URL` in `backend/.env` uses the Session Pooler host, not the direct host.
- [ ] Special characters in the password are percent-encoded.
- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set correctly.
- [ ] Backend startup log shows `✓ Database connection verified`.
- [ ] `GET /api/health` returns `{ "success": true }`.

## Troubleshooting

Common issues:

- Authentication errors: verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- API connection issues: confirm `VITE_API_URL` is set correctly in the frontend
- Database errors: verify the schema and migrations were applied in the right order
- Missing role access: confirm the user profile has the required role and the app was refreshed

## Contributing

Contributions are welcome. Please keep changes focused, maintain existing project structure, and update relevant documentation if you modify workflows or environment variables.
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
