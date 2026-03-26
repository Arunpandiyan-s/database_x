-- Migration 007: Admin User Management Support
-- Adds created_by tracking, vice_principal role, and feed_posts status enhancements
-- Idempotent (safe to run multiple times)

-- ─── 1. Add created_by column to users (tracks which admin/manager created this user) ───
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);

-- ─── 2. Add vice_principal role if missing ───────────────────────────────────────────────
INSERT INTO roles (name, level) VALUES ('vice_principal', 4)
ON CONFLICT (name) DO NOTHING;

-- ─── 3. Adjust cluster_hod level to make room for vice_principal ─────────────────────────
-- Hierarchy: student(1) < mentor(2) < hod(3) < cluster_hod(4.5→5) < vice_principal(4) < principal(5→6) < technical_director(6→7) < admin(7→8)
-- Note: Do NOT change existing levels if already correct — only add vice_principal

-- Bump existing roles to make space
UPDATE roles SET level = 5 WHERE name = 'cluster_hod' AND level = 4;
UPDATE roles SET level = 6 WHERE name = 'principal' AND level = 5;
UPDATE roles SET level = 7 WHERE name = 'technical_director' AND level = 6;
UPDATE roles SET level = 8 WHERE name = 'admin' AND level = 7;
UPDATE roles SET level = 4 WHERE name = 'vice_principal' AND level != 4;

-- ─── 4. Ensure feed_posts.updated_at column exists ────────────────────────────────────
ALTER TABLE feed_posts
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ─── 5. Allow firebase_uid to be NULL for local-login-only accounts ───────────────────
ALTER TABLE users
    ALTER COLUMN firebase_uid DROP NOT NULL;

-- Keep unique constraint but allow NULLs (multiple NULLs allowed in unique index)
DROP INDEX IF EXISTS idx_users_firebase_uid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid
    ON users(firebase_uid)
    WHERE firebase_uid IS NOT NULL;
