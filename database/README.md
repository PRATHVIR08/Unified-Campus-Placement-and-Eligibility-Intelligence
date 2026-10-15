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
# Execute full migration and seeding
bash setup.sh
```
Or connect via Supabase SQL Editor and execute:
1. `schema.sql`
2. `seed.sql`
3. `views.sql`
