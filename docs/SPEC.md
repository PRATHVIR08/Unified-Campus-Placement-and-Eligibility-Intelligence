# System Specification (SPEC.md) [P4]

## 1. Project Title
**Unified Campus Placement and Eligibility Intelligence**

---

## 2. Objective
Automate, streamline, and govern campus recruitment operations. The system eliminates manual verification of student credentials by introducing an automated, transparent rule evaluation engine. It facilitates communication across students, placement officers, and recruiting companies, while tracking interview stages and enforcing placement policies.

---

## 3. User Roles & Capabilities

### Student
- **Profile Management**: View and update academic details, resume link, contact details.
- **Drive Discovery**: View active recruitment drives with real-time eligibility evaluation (Clear reasons if ineligible: CGPA, backlogs, department, etc.).
- **One-Click Application**: Apply for eligible drives before the deadline.
- **Status Tracking**: Track application progression through multiple interview rounds.
- **Offer Management**: Review offer letters and accept or decline offers according to placement policy.

### Placement Officer
- **Company Management**: Onboard companies, manage POCs and industry tags.
- **Drive Creation & Rule Builder**: Configure job drives, set dynamic eligibility criteria (Min CGPA, Backlog limits, Eligible branches, Batches).
- **Applicant Processing**: View applicants, export CSV lists, advance candidates across interview rounds.
- **Offer Release & Policy Control**: Monitor offers released, enforce single/dual offer policies.
- **Analytics & Reporting**: View department-wise placement rates, average CTC, drive funnel conversions, and export placement reports.

---

## 4. Key Functional Modules
1. **Authentication & RBAC**: JWT-based session security with bcrypt hashed credentials.
2. **Dynamic Eligibility Engine**: Deterministic evaluation of student records against drive criteria.
3. **Application & Interview Tracking**: State transitions (`applied` -> `shortlisted` -> `in_interview` -> `offered` -> `accepted` / `rejected`).
4. **Offer Transaction System**: Atomic transactions ensuring single-offer policy rules are preserved.
5. **Analytics & Views**: Pre-aggregated database views for real-time reporting.
