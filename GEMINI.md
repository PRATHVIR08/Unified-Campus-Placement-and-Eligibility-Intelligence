# AI Agent Guidelines & Architecture Rules (GEMINI.md)

This document defines the operational rules, architectural boundaries, tech stack constraints, and development workflow for AI agents working in this repository.

---

## 1. Tech Stack Definition

Agents MUST strictly adhere to the following stack. Do not introduce alternative frameworks or libraries without explicit user request.

| Layer | Technology | Key Details |
|---|---|---|
| **Frontend** | React (Vite) | Vanilla CSS for styling, Context API for auth, standard fetch client |
| **Backend** | Node.js with Express | RESTful architecture, Modular MVC (Routes -> Controllers -> Services -> DB) |
| **Database** | PostgreSQL / Supabase | Relational schema, integrity constraints, views for reporting, connection pool |
| **Authentication** | JWT & bcrypt | Bearer token authorization, password hashing, role-based access control |
| **Testing** | Jest & Postman | Jest for unit/service tests, Postman collection for API verification |

---

## 2. Phased Priority Model

The system is organized into four distinct priority tracks:

- **[P1] Frontend (`frontend/`)**: React application, client-side routing, auth context, student & officer interfaces, design system.
- **[P2] Backend (`backend/`, `docs/API.md`, `docs/postman.json`)**: Express REST API, JWT auth, middleware, business services (eligibility, application, offer transactions), input validation, unit tests.
- **[P3] Database (`database/`, `docs/ER_DIAGRAM.md`)**: PostgreSQL schema, indexes, constraints, seed datasets, analytical views, migration/setup scripts.
- **[P4] Quality, CI/CD, Documentation (`.github/`, `docs/`, `README.md`, `CONTRIBUTING.md`)**: GitHub Actions workflow, issue/PR templates, specification, test reports.

---

## 3. Architecture & Code Boundaries

### Backend Architecture (`backend/src/`)
1. **Routes (`routes/*.routes.js`)**: Pure routing definitions and middleware attachment. No business logic.
2. **Controllers (`controllers/*.controller.js`)**: Handle HTTP request extraction, call appropriate services, return standard JSON responses (`{ success: true, data: ... }` or `{ success: false, error: ... }`).
3. **Services (`services/*.service.js`)**: Encapsulate all domain business rules:
   - `eligibilityService.js`: Dynamic rule evaluation with transparent human-readable explanations.
   - `applicationService.js`: Deadline enforcement, duplicate application prevention, valid status transitions.
   - `offerService.js`: Database transaction guarantees for offer acceptance/revocation and multi-offer rules.
4. **Middleware (`middleware/`)**:
   - `requireAuth.js`: Validates JWT token from `Authorization: Bearer <token>` header.
   - `requireRole.js`: Enforces role-based access (`student`, `officer`, `admin`).
   - `errorHandler.js`: Centralized error catching and formatted response handler.
5. **Database Access (`db/pool.js`)**: Centralized `pg.Pool` instance. Use parameterized queries at all times (`$1, $2, ...`) to prevent SQL injection.

### Frontend Architecture (`frontend/src/`)
1. **API Layer (`api/`)**: `client.js` wraps `fetch` to automatically append JWT from `localStorage`/AuthContext. Specific API modules (`auth.js`, `students.js`, `drives.js`, etc.) export async functions.
2. **Context (`context/AuthContext.jsx`)**: Holds user authentication state, current role, and login/logout methods.
3. **Components (`components/`)**: Reusable UI elements (`Navbar`, `ProtectedRoute`, `DataTable`, `StatusBadge`, `EligibilityBadge`, `RuleBuilder`).
4. **Pages (`pages/`)**: Segregated by role:
   - `pages/student/`: Student profile, eligible drives list, drive details with eligibility breakdown, my applications.
   - `pages/officer/`: Officer dashboard, company directory, drive management, applicant review, round tracking, offer manager, reports.
5. **Styling (`styles/main.css`)**: Vanilla CSS with curated CSS variables (dark mode, glassmorphism, accent colors) without external CSS frameworks.

### Database Architecture (`database/`)
1. Always enforce foreign key constraints with explicit `ON DELETE` rules.
2. Store monetary values (CTC) as `NUMERIC(12, 2)` and CGPA as `NUMERIC(4, 2)`.
3. Check constraints must validate allowable status values and ranges.
4. Complex reporting metrics must be encapsulated in SQL views (`views.sql`).

---

## 4. AI Agent Operational Rules

1. **No Out-of-Scope Code Modification**: Implement changes only in the requested priority domain. Do not rewrite unrelated modules.
2. **Preserve Comments & Annotations**: Retain file header notes, priority badges `[P1]`, `[P2]`, etc.
3. **Never Store Secrets**: Use `.env.example` templates. Never commit real passwords, DB credentials, or JWT secrets.
4. **Zero Ad-Hoc Dependencies**: Stick to the approved stack. Check `package.json` before introducing any new dependency.
5. **Strict RBAC Enforcement**: Placement officer operations must be blocked for student tokens at both API and UI route levels.
