# Backend API

Base URL: `/api`. Protected routes require a Supabase access token:
`Authorization: Bearer <access-token>`.

Authentication is verified server-side with `SUPABASE_URL` and
`SUPABASE_SERVICE_KEY`. A missing `profiles` row is provisioned from the
verified Supabase user as `STUDENT`; role metadata from the token is ignored.
The legacy `users` table is retained for existing data, but password-based
login and registration routes are disabled.

## Health

### GET `/health`

Runs `SELECT 1` against PostgreSQL. Returns 200 only when the database is
reachable.

## Authentication

### GET `/auth/me`

Returns the verified profile (`id`, `email`, uppercase `role`, and `fullName`).

## Students

### GET `/students/me`

Student-only. Returns the current profile and academic record.

### PUT `/students/me`

Student-only. Validates and upserts `department`, `degree`, `cgpa` (0–10),
`graduationYear` (2000–2100), and `backlogs` (non-negative integer) to both
`students` and `academic_records` in one transaction. Any subset may be
updated; send `null` to clear nullable academic fields.

### GET `/students?page=1&limit=25`

Officer/admin-only. Returns paginated student profiles and the total count.
`limit` must be between 1 and 100.

The legacy `/students/profile` GET/PUT aliases remain for compatibility.

## Companies

All authenticated roles can use `GET /companies` and `GET /companies/:id`.
Officer, admin, and recruiter roles can create, update, and delete companies:

- `POST /companies`
- `PUT /companies/:id`
- `DELETE /companies/:id`

Recruiters are assigned as `owner_id` when creating a company and may mutate
only companies they own. Ownership is checked in the service layer. Deleting a
company referenced by a drive is rejected by the database foreign key.

## Placement chatbot

### POST `/chatbot/ask`

Student, officer, and admin roles may ask a placement question. Gemini is
called only by the backend. The optional `companyId` or `driveId` limits
placement-record context to that selection; eligibility rules and required
skills are included when those tables are available.

```json
{
  "message": "What skills should I build for this role?",
  "companyId": "00000000-0000-0000-0000-000000000000",
  "history": [
    { "role": "user", "text": "Tell me about the role." },
    { "role": "assistant", "text": "I can help with placement information." }
  ]
}
```

`message` is required (1–1000 trimmed characters), IDs must be UUIDs, and
`history` is optional with at most 10 messages of up to 2000 characters each.
Success returns `{ "answer": "..." }`. The service allows 15 requests per user
per minute. It returns 400 for invalid input, 429 when rate limited, 502 when
Gemini is unavailable, and 503 when Gemini is not configured or placement
records cannot be read. Configure `GEMINI_API_KEY` and optionally
`GEMINI_MODEL` in `backend/.env`.

## Job drives and eligibility

The canonical job-drive API is `/job-drives`. `/drives` remains mounted as a
compatibility alias for the existing frontend.

### GET `/job-drives`

Any authenticated user may list drives. Supports `role_type`, `location`,
`work_mode`, `min_package` (LPA), `q` (title/company search), `active_only`,
`page`, and `limit` (1–100). Students always receive active drives whose
deadline has not passed; `active` is the published state, while drafts are
staff-only. Student records are checked against the eligibility rules and
each listed drive includes `isEligible` and readable `eligibilityReasons`.
The older `keyword`, `minPackage`, and `eligibleOnly`
query parameters are accepted for frontend compatibility. Invalid filters
return 400; no matches return an empty `data` array.

Example:

```http
GET /api/job-drives?role_type=Software%20Engineer&min_package=8&q=backend&active_only=true&page=1&limit=20
```

```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0 }
}
```

### GET `/job-drives/:id`

Returns the drive, nested `company`, and `eligibility_rules`. Recruiters can
read only drives belonging to their companies. Students see only active,
unexpired drives.

### GET `/job-drives/:id/eligibility`

Student-only. Returns `{ "eligible": true, "reasons": [] }`; non-mandatory
rule failures appear as warnings without denying eligibility.

### POST `/job-drives`

Officer/admin/recruiter. Recruiters may create only for a company they own.
Drive and eligibility rules are inserted in one transaction. The
`application_deadline` must be a future ISO timestamp with an explicit
timezone. New drives default to `active`.

```json
{
  "company_id": "c0000000-0000-0000-0000-000000000001",
  "title": "Software Engineer",
  "role_type": "Full time",
  "package_lpa": 12,
  "location": "Bengaluru",
  "work_mode": "onsite",
  "application_deadline": "2099-12-31T23:59:59Z",
  "eligibility_rules": [
    { "field_name": "cgpa", "operator": ">=", "value": 7.5, "mandatory": true },
    { "field_name": "department", "operator": "IN", "value": "Computer Science, Information Technology", "mandatory": true }
  ]
}
```

Returns 201 with the created drive. Rule fields are `cgpa`, `department`,
`backlogs`, and `graduation_year`; operators are `>=`, `<=`, `>`, `<`, `=`,
and `IN`. `IN` values are comma-separated. Rules default to mandatory.

### PUT `/job-drives/:id`

Officer/admin/recruiter; recruiters are restricted to their own companies.
Updates supplied drive fields. Supplying `eligibility_rules` replaces the
existing rules transactionally. If applications exist, rule replacement
returns 409 unless an admin explicitly sends `"force": true`.

### DELETE `/job-drives/:id`

Officer/admin/recruiter with the same ownership restriction. Returns 409 when
applications exist.

### GET `/job-drives/:id/applications`

Officer/admin/recruiter; recruiters may view applicants only for their own
drives. Returns applicant name, USN, department, CGPA, and current status.

## Applications

### POST `/job-drives/:id/applications`

Student-only. Rechecks the deadline and database eligibility inside the
application transaction. Returns 422 for a passed deadline, a non-active drive,
or failed mandatory rules (with the eligibility reasons), and 409 for a
duplicate application.
The unique key uses the existing database columns `(student_id, drive_id)`.

An ineligible response includes machine-readable reasons:

```json
{
  "error": "Student is not eligible",
  "reasons": ["CGPA 6.8 must be at least 7.5"]
}
```

```json
{
  "success": true,
  "data": {
    "id": "a0000000-0000-0000-0000-000000000001",
    "student_id": "b0000000-0000-0000-0000-000000000001",
    "drive_id": "d0000000-0000-0000-0000-000000000001",
    "status": "applied"
  }
}
```

### GET `/applications/me`

Student-only. Lists only the caller's applications with drive, company, and
current status. `/applications/my` remains a compatibility alias.

### PATCH `/applications/:id/status`

Statuses are stored in lowercase; uppercase request values are normalized.
Staff transitions are:

- `applied` → `shortlisted` or `rejected`
- `shortlisted` → `selected` or `rejected`
- `in_interview` → `selected` or `rejected`

Students may move their own `applied` or `shortlisted` application to
`withdrawn`. Officer/admin staff transitions return 403 for students and
invalid jumps return 422. An application may become `selected` if it has no
interview rounds, or after all its interview rounds have passed.

### POST `/interviews`

Officer/admin-only. Body: `applicationId`, `roundNumber`, `name`, `roundType`,
and optional `scheduledAt`. Rounds may be added to `shortlisted` or
`in_interview` applications. Adding the first round moves `shortlisted` to
`in_interview` in the same transaction.

### POST `/interviews/participants/attendance`

Officer/admin-only. Body: `roundId`, `applicationId`, and boolean `attended`.

### POST `/interviews/participants/result`

Officer/admin-only. Body: `roundId`, `applicationId`, `result` (`passed` or
`failed`), and optional `feedback`. A failed round moves the application to
`rejected` in the same transaction.

### GET `/interviews/drive/:driveId`

Returns interview rounds and participant results for the drive.

## Offers

### POST `/offers`

Officer/admin-only. Body: `applicationId`, positive `ctc`, and optional
`offerLetterUrl`. Creation requires `selected` status; inserting the offer and
moving the application to `offered` are one transaction.

### GET `/offers/my`

Student-only. Returns the authenticated student's offers.

### PATCH `/offers/:id/decision`

Student-only. Body: `{ "decision": "accept" }`. Accepting updates the offer and
moves its application from `offered` to `accepted` in one transaction. Decline,
withdrawal, and rejection are not offer decisions.

### GET `/offers/all`

Officer/admin-only. Returns all offers.

An `ACCEPTED` offer defines placement. Database errors are returned
as `{ "error": "..." }`: invalid input/constraints (400), unauthenticated (401),
role/ownership denied (403), missing record (404), duplicate/foreign key
conflict (409), and rule violation (422).

## Current complete endpoint reference

The endpoint table below is authoritative for the current route surface,
including the application-scoped interview/offer workflows and compatibility
aliases documented above. Every protected request uses the Supabase bearer
token and a profile role loaded by the backend; token role metadata is ignored.

| Method and path | Role | Request | Success response | Error codes |
|---|---|---|---|---|
| `GET /api/health` | Public | None | `{success,message}` after `SELECT 1` | 500 |
| `GET /api/auth/me` | Any authenticated | Bearer token | `{success,data:{id,email,role,fullName}}` | 401, 500 |
| `GET /api/students/me` | Student | None | Current profile and academics | 401, 403, 404 |
| `PUT /api/students/me` | Student | Any subset of `department`, `degree`, `cgpa`, `graduationYear`, `backlogs` | Updated profile | 400, 401, 403, 404 |
| `GET /api/students` | Officer, admin | `page`, `limit` | `{success,data,total,page,limit}` | 400, 401, 403 |
| `GET /api/students/profile` | Student | None | Legacy profile aliases (`name`, `rollNumber`, etc.) | 401, 403, 404 |
| `PUT /api/students/profile` | Student | Legacy academic profile fields | Updated legacy profile | 400, 401, 403, 404 |
| `GET /api/students/me/filters` | Student | None | `{success,data:[saved filters]}` | 401, 403 |
| `POST /api/students/me/filters` | Student | `{name,criteria,is_default?}` | 201 saved filter | 400, 401, 403, 409, 422 |
| `PUT /api/students/me/filters/:id` | Student | `{name?,criteria?,is_default?}` | Updated saved filter | 400, 401, 403, 404, 409 |
| `DELETE /api/students/me/filters/:id` | Student | None | 204 | 400, 401, 403, 404 |
| `GET /api/companies` | Any authenticated | None | Managed companies | 401 |
| `GET /api/companies/:id` | Any authenticated | UUID | Company data | 400, 401, 404 |
| `POST /api/companies` | Officer, admin, recruiter | Company fields (`name` required) | 201 company | 400, 401, 403, 409 |
| `PUT /api/companies/:id` | Officer, admin, recruiter | Partial company fields | Updated company | 400, 401, 403, 404, 409 |
| `DELETE /api/companies/:id` | Officer, admin, recruiter | UUID | 204 | 400, 401, 403, 404, 409 |
| `POST /api/chatbot/ask` | Student, officer, admin | `{message, companyId?, driveId?, history?}` | `{answer}` | 400, 401, 403, 429, 502, 503 |
| `GET /api/job-drives/filter-options` and `/api/drives/filter-options` | Any authenticated | None | Distinct locations, role types, work modes, and package range | 401 |
| `GET /api/job-drives` and `/api/drives` | Any authenticated | `role`, `skills`, `skillMatch=any\|all`, `minPackage`, `maxPackage`, `location`, `workMode`, `eligibleOnly`, `hideClosed`, `sort=deadline\|package\|newest`, `page`, `limit` | `{success,data,pagination}` | 400, 401 |
| `GET /api/job-drives/:id` and `/api/drives/:id` | Any authenticated | UUID | Drive, company, eligibility rules, skills | 400, 401, 403, 404 |
| `GET /api/job-drives/:id/eligibility` and `/api/drives/:id/eligibility` | Student | UUID | Eligibility result and reasons | 400, 401, 403, 404 |
| `GET /api/job-drives/:id/applications` and `/api/drives/:id/applications` | Officer, admin, recruiter (own drive) | UUID | Applicant list | 400, 401, 403, 404 |
| `POST /api/job-drives` and `/api/drives` | Officer, admin, recruiter (own company) | Drive fields; optional `skills:[id or name]` | 201 drive | 400, 401, 403, 404, 409 |
| `PUT /api/job-drives/:id` and `/api/drives/:id` | Officer, admin, recruiter (own drive) | Partial drive fields; optional skills array | Updated drive | 400, 401, 403, 404, 409 |
| `PATCH /api/job-drives/:id/status` and `/api/drives/:id/status` | Officer, admin, recruiter (own drive) | `{status}` | Updated drive | 400, 401, 403, 404 |
| `DELETE /api/job-drives/:id` and `/api/drives/:id` | Officer, admin, recruiter (own drive) | UUID | 204 | 400, 401, 403, 404, 409 |
| `POST /api/job-drives/:id/applications` and `/api/drives/:id/applications` | Student | UUID | 201 application | 400, 401, 403, 409, 422 |
| `POST /api/applications` | Student | `{driveId}` | 201 application | 400, 401, 403, 409, 422 |
| `GET /api/applications/me` and `/api/applications/my` | Student | None | Own applications | 401, 403 |
| `GET /api/applications/drive/:driveId` | Officer, admin, recruiter (own drive) | UUID | Drive applicants | 400, 401, 403, 404 |
| `PATCH /api/applications/:id/status` | Student (own withdrawal), officer, admin | `{status}` | Updated application | 400, 401, 403, 404, 422 |
| `GET /api/applications/:id/interview-rounds` | Officer, admin, recruiter (own drive) | None | Round list | 400, 401, 403, 404 |
| `POST /api/applications/:id/interview-rounds` | Officer, admin, recruiter (own drive) | `{roundNumber,name,roundType,scheduledAt?}` | 201 round | 400, 401, 403, 404, 409, 422 |
| `GET /api/interviews/drive/:driveId` | Officer, admin, recruiter (own drive) | UUID | Drive rounds and results | 400, 401, 403, 404 |
| `POST /api/interviews` | Officer, admin | Legacy `{applicationId,roundNumber,name,roundType,scheduledAt?}` | 201 round | 400, 401, 403, 404, 409, 422 |
| `POST /api/interviews/participants/attendance` | Officer, admin | `{roundId,applicationId,attended}` | Updated attendance | 400, 401, 403, 404 |
| `POST /api/interviews/participants/result` | Officer, admin | Legacy `{roundId,applicationId,result,feedback?}` | Updated participant result | 400, 401, 403, 404, 422 |
| `PATCH /api/interview-rounds/:id` | Officer, admin, recruiter (own drive) | `{result:"PASSED"\|"FAILED"\|"PENDING",feedback?,score?}`; score 0–100 | Updated round | 400, 401, 403, 404, 422 |
| `POST /api/applications/:id/offers` | Officer, admin | `{ctc,offerLetterUrl?}` | 201 offer with `status:"OFFERED"` | 400, 401, 403, 404, 409, 422 |
| `GET /api/offers/me` and `/api/offers/my` | Student | None | Own offers with company, role, CTC, status | 401, 403 |
| `PATCH /api/offers/:id/status` | Student (own offer), officer, admin | Student: `ACCEPTED` or `DECLINED`; staff: `WITHDRAWN` | Updated offer | 400, 401, 403, 404, 422 |
| `POST /api/offers` | Officer, admin | Legacy `{applicationId,ctc,offerLetterUrl?}` | 201 offer | 400, 401, 403, 404, 409, 422 |
| `PATCH /api/offers/:id/decision` | Student (own offer) | Legacy `{decision:"accept"}` | Accepted offer | 400, 401, 403, 404, 422 |
| `GET /api/offers/all` | Officer, admin | None | All offers | 401, 403 |
| `GET /api/reports/placement-summary` | Officer, admin | Optional `format=json\|csv` | Summary object or CSV attachment | 400, 401, 403 |
| `GET /api/reports/:name` | Officer, admin | `name` is `department-placement`, `drive-funnel`, `upcoming-deadlines`, or `placement-summary`; optional `format=json\|csv` | Rows or escaped CSV attachment | 400, 401, 403, 404 |
| `GET /api/reports/department-summary` and `/funnel-metrics` | Officer, admin | None | Legacy PostgreSQL analytics | 401, 403 |
| `GET /api/reports/export/drive/:driveId` | Officer, admin | UUID | Escaped CSV attachment | 400, 401, 403, 404 |
| `GET /api/skills` | Any authenticated | None | `{success,data:[{id,name}]}` | 401 |
| `GET /api/admin/users` | Admin | `page`, `limit`, optional `search`/`q` | Paginated profiles | 400, 401, 403 |
| `PATCH /api/admin/users/:id/role` | Admin | `{role:"STUDENT"\|"OFFICER"\|"RECRUITER"\|"ADMIN"}` | Updated profile | 400, 401, 403, 404, 422 |

Saved `filter_json` accepts only drive-search keys: `role_type`, `roleType`,
`location`, `work_mode`, `workMode`, `min_package`, `minPackage`, `q`,
`keyword`, `active_only`, `eligible_only`, `eligibleOnly`, `skills`, `page`,
and `limit`. Attempts to use any other key return 400.

All write methods (`POST`, `PUT`, `PATCH`, and `DELETE`) are rate-limited to
100 requests per IP per 15 minutes and may return 429.

Offer and interview result values are persisted in lowercase/uppercase-normalized
columns as applicable and returned as uppercase offer statuses. A student may
accept at most `MAX_ACCEPTED_OFFERS_PER_STUDENT` offers (default 1); a further
acceptance returns 422. CSV cells and headers quote commas, quotes, and line
breaks. Report view names are mapped through a fixed allowlist and are never
used directly as SQL identifiers.
