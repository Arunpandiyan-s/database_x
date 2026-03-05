CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Hierarchical Entities
CREATE TABLE colleges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    level INT NOT NULL UNIQUE
);

-- 3. Users and Students
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    personal_email VARCHAR(255),
    institutional_email VARCHAR(255),
    active_email VARCHAR(255) NOT NULL,
    email_status VARCHAR(50) NOT NULL CHECK (email_status IN ('PERSONAL', 'INSTITUTIONAL', 'SYNC_PENDING')),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id) ON DELETE RESTRICT,
    cluster_id UUID REFERENCES clusters(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    register_number VARCHAR(100) UNIQUE NOT NULL,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED', 'TRANSFERRED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'LOCKED', 'TEMP_UNLOCK')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Hierarchy Mappings
CREATE TABLE mentor_student_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RELEASED', 'REASSIGNED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_active_mentor_mapping ON mentor_student_mappings(student_id) WHERE status = 'ACTIVE';

CREATE TABLE hod_mentor_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hod_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RELEASED', 'REASSIGNED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cluster_hod_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_head_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    hod_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RELEASED', 'REASSIGNED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Workflows
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_mentor' CHECK (status IN ('pending_mentor', 'pending_hod', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE od_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    mentor_approval VARCHAR(50) DEFAULT 'pending' CHECK (mentor_approval IN ('pending', 'approved', 'rejected')),
    hod_approval VARCHAR(50) DEFAULT 'pending' CHECK (hod_approval IN ('pending', 'approved', 'rejected')),
    overall_status VARCHAR(50) NOT NULL DEFAULT 'pending_mentor' CHECK (overall_status IN ('pending_mentor', 'pending_hod', 'approved', 'rejected')),
    certificate_upload_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Results & Documents
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    semester INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'verified', 'published')),
    published BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for result immutability
CREATE OR REPLACE FUNCTION prevent_published_update()
RETURNS trigger AS $$
BEGIN
  IF OLD.published = true THEN
    RAISE EXCEPTION 'Published results are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_published_update
BEFORE UPDATE ON results
FOR EACH ROW
WHEN (OLD.published = true)
EXECUTE FUNCTION prevent_published_update();

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    document_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'verified', 'rejected')),
    verified_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Audit & Event Outbox
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    role VARCHAR(100) NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE event_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID UNIQUE NOT NULL,
    type TEXT NOT NULL,
    actor_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB,
    status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE student_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE email_change_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
    old_email VARCHAR(255) NOT NULL,
    new_email VARCHAR(255) NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Global Index Strategy
CREATE INDEX idx_dept_status ON users(department_id, status);
CREATE INDEX idx_mentor_mapping_status ON mentor_student_mappings(mentor_id, status);
CREATE INDEX idx_cluster_id ON users(cluster_id);
CREATE INDEX idx_college_id ON users(college_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_outbox_pending ON event_outbox (status, created_at) WHERE status = 'PENDING';
CREATE INDEX idx_student_register ON students(register_number);
