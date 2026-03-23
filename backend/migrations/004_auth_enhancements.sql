-- Migration 004: Auth System Enhancements
-- Adds student_invites and otp_verifications tables
-- Creates indexes for performance

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── student_invites ──────────────────────────────────────────────────────────
-- Stores admin invitations + OTP verification state for student onboarding.
-- NOTE: This schema is aligned with existing runtime code which expects:
--   student_email, register_number, invited_by, otp_hash, otp_expires, verified
CREATE TABLE IF NOT EXISTS student_invites (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_email   VARCHAR(255) UNIQUE NOT NULL,
    register_number VARCHAR(100),
    name            VARCHAR(255),
    department_id   UUID REFERENCES departments(id),
    college_id      UUID REFERENCES colleges(id),
    invited_by      UUID REFERENCES users(id) ON DELETE SET NULL,

    -- OTP verification
    otp_hash        TEXT,
    otp_expires     TIMESTAMP WITH TIME ZONE,
    verified        BOOLEAN NOT NULL DEFAULT FALSE,

    -- Lifecycle
    status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'accepted', 'expired', 'cancelled')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at     TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_invites_student_email ON student_invites(student_email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON student_invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_expires ON student_invites(otp_expires);

-- ─── otp_verifications ────────────────────────────────────────────────────────
-- Stores OTP codes for email/phone verification
CREATE TABLE IF NOT EXISTS otp_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier      VARCHAR(255) NOT NULL,  -- Email or phone number
    identifier_type VARCHAR(20) NOT NULL    -- 'email' or 'phone'
                        CHECK (identifier_type IN ('email', 'phone')),
    otp_code        VARCHAR(6) NOT NULL,
    purpose         VARCHAR(50) NOT NULL    -- 'registration', 'password_reset', 'verification'
                        CHECK (purpose IN ('registration', 'password_reset', 'verification', 'account_creation')),
    attempts        INT NOT NULL DEFAULT 0,
    verified        BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at     TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_verifications(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_purpose ON otp_verifications(purpose);

-- Cleanup expired OTPs automatically (optional - can be done via cron job)
-- CREATE OR REPLACE FUNCTION cleanup_expired_otps()
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM otp_verifications WHERE expires_at < NOW() AND verified = FALSE;
-- END;
-- $$ LANGUAGE plpgsql;
