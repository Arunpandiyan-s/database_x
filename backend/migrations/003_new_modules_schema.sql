-- Migration 003: New ERP Modules (Fixed — idempotent)
-- Adds: classes, attendance_records, feed_posts, parent_student_mapping
-- Alters: leave_requests, od_requests, results, student_profiles
-- NOTE: audit_logs table already exists from a prior migration — skip it.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Add new role entries (class_advisor, parent) ─────────────────────────────
INSERT INTO roles (name, level) VALUES
    ('class_advisor', 2),
    ('parent',        0)
ON CONFLICT (name) DO NOTHING;

-- ─── classes ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id    UUID REFERENCES colleges(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    department    VARCHAR(100)  NOT NULL,
    year          INT           NOT NULL CHECK (year BETWEEN 1 AND 6),
    section       VARCHAR(10)   NOT NULL,
    advisor_id    UUID REFERENCES users(id),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (college_id, department_id, year, section)
);

CREATE INDEX IF NOT EXISTS idx_classes_advisor    ON classes(advisor_id);
CREATE INDEX IF NOT EXISTS idx_classes_college    ON classes(college_id);
CREATE INDEX IF NOT EXISTS idx_classes_department ON classes(department_id);

-- ─── class_student_mapping ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_student_mapping (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_csm_class   ON class_student_mapping(class_id);
CREATE INDEX IF NOT EXISTS idx_csm_student ON class_student_mapping(student_id);

-- ─── attendance_records ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date       DATE NOT NULL,
    records    JSONB NOT NULL DEFAULT '[]',
    saved_by   UUID REFERENCES users(id),
    college_id UUID REFERENCES colleges(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (class_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_class   ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_college ON attendance_records(college_id);

-- ─── feed_posts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feed_posts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    type         VARCHAR(30) NOT NULL DEFAULT 'announcement'
                     CHECK (type IN ('announcement','achievement')),
    author_id    UUID REFERENCES users(id),
    author_role  VARCHAR(30) NOT NULL,
    student_name VARCHAR(255),
    department   VARCHAR(255),
    college_id   UUID REFERENCES colleges(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'published'
                     CHECK (status IN ('draft','published','archived')),
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_college ON feed_posts(college_id);
CREATE INDEX IF NOT EXISTS idx_feed_created ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_status  ON feed_posts(status);

-- ─── parent_student_mapping ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_student_mapping (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation   VARCHAR(50) NOT NULL DEFAULT 'guardian',
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_psm_parent  ON parent_student_mapping(parent_id);
CREATE INDEX IF NOT EXISTS idx_psm_student ON parent_student_mapping(student_id);

-- ─── Extend leave_requests ────────────────────────────────────────────────────
ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS parent_confirmed BOOLEAN DEFAULT NULL;

-- ─── Extend od_requests ───────────────────────────────────────────────────────
ALTER TABLE od_requests
    ADD COLUMN IF NOT EXISTS parent_confirmed  BOOLEAN DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS days_requested    INT DEFAULT 1;

-- ─── Extend results ───────────────────────────────────────────────────────────
ALTER TABLE results
    ADD COLUMN IF NOT EXISTS mentor_id   UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ─── Extend student_profiles ─────────────────────────────────────────────────
-- (sibling_name, sibling_occupation, previous_institution_address already exist from schema_output)
ALTER TABLE student_profiles
    ADD COLUMN IF NOT EXISTS quota_edit_requested       BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS scholarship_edit_requested BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS father_photo               TEXT,
    ADD COLUMN IF NOT EXISTS mother_photo               TEXT,
    ADD COLUMN IF NOT EXISTS guardian_photo             TEXT,
    ADD COLUMN IF NOT EXISTS father_occupation          TEXT,
    ADD COLUMN IF NOT EXISTS mother_occupation          TEXT;
