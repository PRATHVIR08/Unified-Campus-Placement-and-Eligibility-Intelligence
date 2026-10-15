# Unified Campus Placement and Eligibility Intelligence [P4]

A centralized, intelligent placement automation system connecting students, placement officers, and recruiting companies. The system evaluates multi-criteria eligibility transparently, tracks interview rounds, and enforces offer compliance.

---

## 🚀 Tech Stack

- **Frontend**: React (Vite), Vanilla CSS (Design System), Context API
- **Backend**: Node.js & Express (REST API, Modular Layered Architecture)
- **Database**: PostgreSQL / Supabase (Relational schema, SQL views, constraints)
- **Authentication**: JWT & bcrypt (RBAC: Student, Placement Officer)
- **Testing**: Jest (Unit & Transaction tests), Postman (API end-to-end collection)

---

## 📁 Repository Structure

```
campus-placement/
│
├── README.md                        [P4]  setup, run steps, screenshots
├── GEMINI.md                        [P4]  AI agent rules (Prompt 0)
├── .gitignore                       [P4]  node_modules, .env, build output
├── CONTRIBUTING.md                  [P4]  branch, commit message, PR rules
│
├── .github/                         [P4]
│   ├── CODEOWNERS                   maps folders to owners (auto-requests reviews)
│   ├── pull_request_template.md     checklist every PR must fill in
│   └── workflows/
│       └── ci.yml                   runs backend tests and frontend build on every PR
│
├── frontend/                        [P1]
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── .env.example                 VITE_API_URL
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                  routes
│       ├── api/                     API fetch wrappers
│       ├── context/                 AuthContext & global state
│       ├── components/              Reusable UI components
│       ├── pages/                   Student & Officer views
│       └── styles/main.css          Design tokens & global styles
│
├── backend/                         [P2]
│   ├── package.json
│   ├── .env.example                 DB credentials, JWT secret, PORT
│   ├── server.js
│   └── src/
│       ├── app.js
│       ├── db/pool.js               pg connection pool
│       ├── middleware/              Auth, Role & Error handlers
│       ├── routes/                  Express route modules
│       ├── controllers/             Route controller handlers
│       ├── services/                Domain logic (Eligibility, Application, Offers)
│       ├── validators/              Request schema validation
│       └── utils/csvExport.js       Report export utility
│   └── tests/                       Jest test suites
│
├── database/                        [P3]
│   ├── schema.sql                   DDL tables, constraints, indexes
│   ├── seed.sql                     Sample initial dataset
│   ├── views.sql                    Analytical reporting views
│   ├── queries/                     Report & constraint verification queries
│   ├── setup.sh                     Automated DB bootstrap script
│   └── README.md                    Database documentation & ER reference
│
└── docs/
    ├── SPEC.md                      [P4]  Detailed system requirements
    ├── API.md                       [P2]  Endpoint specifications & payloads
    ├── postman.json                 [P2]  Postman API collection
    ├── ER_DIAGRAM.md                [P3]  Mermaid ER diagram
    ├── REVIEW_LOG.md                [P4]  Peer review & code audit log
    ├── TEST_REPORT.md               [P4]  Test execution outcomes
    └── screenshots/                 [P1 + P4] UI & report screenshots
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+) & npm
- PostgreSQL (v14+) or Supabase instance

### 1. Database Setup
```bash
cd database
bash setup.sh
```
Or execute `schema.sql`, `seed.sql`, and `views.sql` in your PostgreSQL / Supabase SQL Editor.

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

---

## 🧪 Testing

```bash
# Run backend Jest test suites
cd backend
npm test
```

Import `docs/postman.json` into Postman to test all endpoints.

---

## 📸 Screenshots

*(Screenshots will be placed in `docs/screenshots/` once UI views are generated)*
