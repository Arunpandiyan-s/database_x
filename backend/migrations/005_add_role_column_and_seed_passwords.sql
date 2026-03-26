-- Migration 005: Add denormalized `role` column to users + ensure password_hash exists
-- Safe to run multiple times (idempotent)

-- ─── 1. Add `role` column (denormalized role name for quick lookup) ─────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(50);

-- ─── 2. Ensure `password_hash` column exists ────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ─── 3. Backfill `role` from the roles table for ALL existing users ─────────────
--        (Updates every row so the denormalized column stays in sync)
UPDATE users u
SET    role = r.name
FROM   roles r
WHERE  r.id = u.role_id
  AND  (u.role IS NULL OR u.role <> r.name);

-- ─── 4. Index for fast role-based queries ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role_name ON users(role);
