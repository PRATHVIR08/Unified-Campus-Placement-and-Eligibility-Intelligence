# REST API Specification (API.md) [P2]

Base URL: `/api`

All protected endpoints require the HTTP Header:
`Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication (`/api/auth`)

### POST `/api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "student1@campus.edu",
    "password": "Password@123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "b0000000-0000-0000-0000-000000000001",
      "email": "student1@campus.edu",
      "role": "student"
    }
  }
  ```

---

### GET `/api/auth/me`
- **Access**: Protected
- **Response**: The authenticated user's id, email, and role loaded from PostgreSQL.

### POST `/api/auth/provision`
- **Access**: Valid Supabase access token
- **Purpose**: Idempotently creates a missing student application/profile row for the authenticated Supabase user. Public provisioning always assigns the `student` role; existing database roles are retained.
- **Signup metadata**: `full_name` and `usn` are collected by the student registration form. Academic fields are completed later through `PUT /api/students/profile`.

## 2. Students (`/api/students`)

### GET `/api/students/profile`
- **Access**: Protected (`student`, `officer`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "b0000000-0000-0000-0000-000000000001",
      "rollNumber": "CS2024001",
      "name": "Aarav Sharma",
      "department": "Computer Science",
      "batchYear": 2025,
      "cgpa": 8.75,
      "activeBacklogs": 0
    }
  }
  ```

---

## 3. Job Drives (`/api/drives`)

### GET `/api/drives`
- **Access**: Protected (All authenticated users)
- **Response (200 OK)**: List of active drives including dynamic eligibility check for students.

### POST `/api/drives`
- **Access**: Protected (`officer` only)
- **Request Body**:
  ```json
  {
    "companyId": "c0000000-0000-0000-0000-000000000001",
    "title": "Full Stack Engineer",
    "ctcAnnual": 1400000,
    "minCgpa": 7.5,
    "maxActiveBacklogs": 0,
    "eligibleDepartments": ["Computer Science", "Information Technology"],
    "eligibleBatchYears": [2025],
    "applicationDeadline": "2026-11-01T23:59:59Z"
  }
  ```

---

## 4. Applications (`/api/applications`)

### POST `/api/applications`
- **Access**: Protected (`student` only)
- **Request Body**:
  ```json
  {
    "driveId": "d0000000-0000-0000-0000-000000000001"
  }
  ```

### GET `/api/applications/my`
- **Access**: Protected (`student` only)
- **Response**: List of student's current applications and statuses.

### PATCH `/api/applications/:id/status`
- **Access**: Protected (`officer`; a student may send `withdrawn` only for their own `applied` application)
- **Request Body**:
  ```json
  {
    "status": "shortlisted"
  }
  ```

---

## 5. Reports (`/api/reports`)

### GET `/api/reports/department-summary`
- **Access**: Protected (`officer` only)
- **Response**: Summary of placed vs unplaced by department, avg CTC.

### GET `/api/reports/export/applications/:driveId`
- **Access**: Protected (`officer` only)
- **Response**: CSV file download of drive applicants.
