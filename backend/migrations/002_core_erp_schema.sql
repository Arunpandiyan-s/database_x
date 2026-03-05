-- Migration 002: Core ERP Tables
-- Creates roles, users, student_profiles, leave_requests, and related tables
-- All idempotent (safe to run multiple times)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── roles ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(50) UNIQUE NOT NULL,  -- 'student','mentor','hod','cluster_hod','principal','technical_director','admin'
    level        INT NOT NULL,                  -- 1=student, 2=mentor, 3=hod, 4=cluster_hod, 5=principal, 6=technical_director, 7=admin
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed core roles (idempotent)
INSERT INTO roles (name, level) VALUES
    ('student',            1),
    ('mentor',             2),
    ('hod',                3),
    ('cluster_hod',        4),
    ('principal',          5),
    ('technical_director', 6),
    ('admin',              7)
ON CONFLICT (name) DO NOTHING;

-- ─── colleges ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colleges (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── departments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── clusters ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clusters (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid   VARCHAR(255) UNIQUE NOT NULL,
    email          VARCHAR(255) NOT NULL,
    active_email   VARCHAR(255) NOT NULL,
    role_id        UUID NOT NULL REFERENCES roles(id),
    status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    college_id     UUID REFERENCES colleges(id),
    department_id  UUID REFERENCES departments(id),
    cluster_id     UUID REFERENCES clusters(id),
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(active_email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- ─── student_profiles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_profiles (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id              UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentor_id               UUID REFERENCES users(id),

    -- Basic Details
    name                    VARCHAR(255),
    gender                  VARCHAR(20),
    dob                     DATE,
    nationality             VARCHAR(100),
    religion                VARCHAR(100),
    community               VARCHAR(100),
    community_cert_number   VARCHAR(100),
    blood_group             VARCHAR(10),

    -- Contact
    emis_number             VARCHAR(50),
    aadhaar_number          VARCHAR(20),
    phone                   VARCHAR(20),
    email                   VARCHAR(255),
    parent_phone            VARCHAR(20),
    parent_email            VARCHAR(255),
    permanent_address       TEXT,
    communication_address   TEXT,
    communication_district  VARCHAR(100),
    communication_town      VARCHAR(100),
    communication_village   VARCHAR(100),

    -- Bank
    bank_account_number     VARCHAR(50),
    bank_holder_name        VARCHAR(255),
    bank_name               VARCHAR(255),
    bank_branch_name        VARCHAR(255),
    bank_ifsc_code          VARCHAR(20),

    -- Parents
    father_name             VARCHAR(255),
    mother_name             VARCHAR(255),
    guardian_name           VARCHAR(255),
    parent_occupation       VARCHAR(255),
    parent_annual_income    VARCHAR(50),
    father_phone            VARCHAR(20),
    mother_phone            VARCHAR(20),

    -- Academic
    register_number         VARCHAR(50),
    admission_date          DATE,
    academic_year           VARCHAR(20),
    programme               VARCHAR(50),
    course_branch           VARCHAR(100),
    department              VARCHAR(100),
    year                    INT,
    section                 VARCHAR(10),
    semester                INT,
    mode_of_admission       VARCHAR(50),
    medium_of_instruction   VARCHAR(50),
    previous_institution    VARCHAR(255),
    year_of_passing         VARCHAR(10),
    board                   VARCHAR(100),
    marks_or_cutoff         VARCHAR(50),
    admission_quota         VARCHAR(50),
    scholarship             VARCHAR(100),

    -- Status
    status                  VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','LOCKED','PENDING_APPROVAL','TEMP_UNLOCKED','ARCHIVED')),
    profile_submitted       BOOLEAN NOT NULL DEFAULT FALSE,
    edit_request_pending    BOOLEAN NOT NULL DEFAULT FALSE,
    temp_unlock_expiry      TIMESTAMP WITH TIME ZONE,

    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_mentor ON student_profiles(mentor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status  ON student_profiles(status);

-- ─── leave_requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID NOT NULL REFERENCES users(id),
    mentor_id       UUID REFERENCES users(id),
    hod_id          UUID REFERENCES users(id),
    college_id      UUID REFERENCES colleges(id),
    department_id   UUID REFERENCES departments(id),
    from_date       DATE NOT NULL,
    to_date         DATE NOT NULL,
    reason          TEXT NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending_mentor'
                        CHECK (status IN ('pending_mentor','pending_hod','approved','rejected','ARCHIVED')),
    mentor_approval BOOLEAN,
    hod_approval    BOOLEAN,
    remarks         TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_student    ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_mentor     ON leave_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_leave_status     ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_college    ON leave_requests(college_id);

-- ─── od_requests ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS od_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id          UUID NOT NULL REFERENCES users(id),
    mentor_id           UUID REFERENCES users(id),
    hod_id              UUID REFERENCES users(id),
    college_id          UUID REFERENCES colleges(id),
    department_id       UUID REFERENCES departments(id),
    dates               DATE[] NOT NULL,
    reason              TEXT NOT NULL,
    parents_informed    BOOLEAN NOT NULL DEFAULT FALSE,
    mentor_approval     VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (mentor_approval IN ('pending','approved','rejected')),
    hod_approval        VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (hod_approval IN ('pending','approved','rejected')),
    brochure_url        TEXT,
    registration_proof_url TEXT,
    participation_cert_url TEXT,
    status              VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_od_student   ON od_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_od_mentor    ON od_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_od_college   ON od_requests(college_id);

-- ─── results ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id  UUID NOT NULL REFERENCES users(id),
    semester    INT NOT NULL,
    file_name   VARCHAR(255) NOT NULL,
    file_url    TEXT,
    college_id  UUID REFERENCES colleges(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);

-- ─── notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    type        VARCHAR(20) NOT NULL DEFAULT 'info'
                    CHECK (type IN ('info','success','warning','error')),
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- ─── mentor_mappings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_mappings (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id  UUID UNIQUE NOT NULL REFERENCES users(id),
    mentor_id   UUID NOT NULL REFERENCES users(id),
    college_id  UUID REFERENCES colleges(id),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mapping_mentor ON mentor_mappings(mentor_id);
