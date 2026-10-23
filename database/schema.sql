-- ==============================================================================
-- Schema Definition: Unified Campus Placement and Eligibility Intelligence [P3]
-- Dialect: PostgreSQL / Supabase
-- Description: Core tables, foreign keys, constraints, and performance indexes.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('student', 'officer', 'admin');
CREATE TYPE application_status AS ENUM ('applied', 'shortlisted', 'in_interview', 'offered', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE drive_status AS ENUM ('draft', 'active', 'closed', 'completed');
CREATE TYPE round_type AS ENUM ('online_assessment', 'technical', 'gd', 'hr', 'final');

-- 3. USERS & PROFILES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role user_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    batch_year INTEGER,
    cgpa NUMERIC(4, 2) CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
    tenth_percentage NUMERIC(5, 2) CHECK (tenth_percentage >= 0 AND tenth_percentage <= 100),
    twelfth_percentage NUMERIC(5, 2) CHECK (twelfth_percentage >= 0 AND twelfth_percentage <= 100),
    active_backlogs INTEGER DEFAULT 0 CHECK (active_backlogs >= 0),
    total_backlogs_history INTEGER NOT NULL DEFAULT 0 CHECK (total_backlogs_history >= 0),
    degree VARCHAR(100),
    resume_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    website VARCHAR(255),
    industry VARCHAR(100),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. JOB DRIVES & ELIGIBILITY RULES
CREATE TABLE IF NOT EXISTS job_drives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    role_description TEXT,
    job_location VARCHAR(255),
    ctc_annual NUMERIC(12, 2) NOT NULL CHECK (ctc_annual > 0),
    min_cgpa NUMERIC(4, 2) NOT NULL DEFAULT 6.00 CHECK (min_cgpa >= 0.00 AND min_cgpa <= 10.00),
    max_active_backlogs INTEGER NOT NULL DEFAULT 0 CHECK (max_active_backlogs >= 0),
    eligible_departments TEXT[] NOT NULL DEFAULT '{}',
    eligible_batch_years INTEGER[] NOT NULL DEFAULT '{}',
    application_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status drive_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. APPLICATIONS & INTERVIEWS
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    drive_id UUID NOT NULL REFERENCES job_drives(id) ON DELETE CASCADE,
    status application_status NOT NULL DEFAULT 'applied',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_drive_application UNIQUE (student_id, drive_id)
);

CREATE TABLE IF NOT EXISTS interview_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID NOT NULL REFERENCES job_drives(id) ON DELETE CASCADE,
    round_order INTEGER NOT NULL CHECK (round_order > 0),
    name VARCHAR(100) NOT NULL,
    round_type round_type NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_drive_round_order UNIQUE (drive_id, round_order)
);

CREATE TABLE IF NOT EXISTS interview_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID NOT NULL REFERENCES interview_rounds(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT FALSE,
    cleared BOOLEAN DEFAULT FALSE,
    feedback TEXT,
    CONSTRAINT unique_round_participant UNIQUE (round_id, application_id)
);

-- 6. OFFERS & POLICY ENFORCEMENT
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    ctc_offered NUMERIC(12, 2) NOT NULL CHECK (ctc_offered > 0),
    offer_letter_url TEXT,
    is_accepted BOOLEAN DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_students_dept_batch ON students(department, batch_year);
CREATE INDEX IF NOT EXISTS idx_drives_company_status ON job_drives(company_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_drive ON applications(drive_id);
CREATE INDEX IF NOT EXISTS idx_offers_student ON offers(student_id);
