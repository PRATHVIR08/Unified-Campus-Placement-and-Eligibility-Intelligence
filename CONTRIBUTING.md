# Contributing Guidelines [P4]

Thank you for contributing to the Unified Campus Placement and Eligibility Intelligence platform! To maintain code quality and architectural integrity, please adhere to these guidelines.

---

## 1. Branch Naming Conventions

Use prefix branches corresponding to the project phase or task type:
- `feat/p1-frontend-<feature-name>` (Frontend features)
- `feat/p2-backend-<endpoint-or-service>` (Backend API & domain services)
- `feat/p3-db-<schema-or-query>` (Database schemas, migrations, views)
- `docs/p4-<doc-name>` (Documentation, CI, PR templates)
- `fix/<issue-description>` (Bug fixes)

---

## 2. Commit Message Standards

Follow Conventional Commits syntax:
```
<type>(<scope>): <short description>
```
**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring without behavioral changes
- `test`: Adding or updating test suites
- `chore`: Build tasks, dependency updates, configs

*Examples:*
- `feat(eligibility): implement dynamic rule engine with rejection breakdown`
- `fix(auth): correct token expiration handling in requireAuth middleware`
- `test(offers): add transaction rollback test for multi-offer cap`

---

## 3. Pull Request (PR) Workflow

1. **Self-Review**: Ensure all linting checks and unit tests pass locally (`npm test` in `backend/`).
2. **Template**: Fill out all sections of `.github/pull_request_template.md`.
3. **Phased Review**: Assign the appropriate CODEOWNER based on the touched paths (`frontend/`, `backend/`, `database/`, etc.).
4. **CI Requirement**: All checks in `.github/workflows/ci.yml` must succeed before merging.
