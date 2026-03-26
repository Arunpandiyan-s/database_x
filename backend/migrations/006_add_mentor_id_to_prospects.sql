-- Migration 006: Add mentor_id to admission_prospects
-- Allows admin to assign a mentor when pushing a student to the mentor pool

ALTER TABLE admission_prospects
    ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ap_mentor ON admission_prospects(mentor_id);
