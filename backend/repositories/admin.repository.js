const { pool } = require('../utils/transaction.util');

/**
 * AdminRepository — data access for admin-level operations.
 * Covers: student invites, user management (CRUD by role)
 */
class AdminRepository {
    constructor(db = pool) {
        this.db = db;
    }

    // ─── Student Invites ──────────────────────────────────────────────────────

    async getInviteByEmail(studentEmail) {
        const r = await this.db.query(
            `SELECT id FROM student_invites WHERE student_email = $1`,
            [studentEmail]
        );
        return r.rows[0] || null;
    }

    async getUserByEmail(email) {
        const r = await this.db.query(
            `SELECT id FROM users WHERE email = $1 OR active_email = $1`,
            [email]
        );
        return r.rows[0] || null;
    }

    async insertStudentInvite({ studentEmail, registerNumber, invitedBy, otpHash, expires }) {
        await this.db.query(
            `INSERT INTO student_invites (student_email, register_number, invited_by, otp_hash, otp_expires)
             VALUES ($1, $2, $3, $4, $5)`,
            [studentEmail, registerNumber, invitedBy, otpHash, expires]
        );
    }

    // ─── User Management ─────────────────────────────────────────────────────

    /**
     * List users filtered by allowed roles.
     * If createdBy is set, only show users created by that actor (for hierarchy scoping).
     */
    async listUsers({ roles, createdBy = null, page = 1, limit = 50 }) {
        const offset = (page - 1) * limit;
        const params = [];
        let whereSub = "";
        
        if (roles && roles.length > 0) {
            params.push(roles);
            whereSub = `r.name = ANY($${params.length})`;
        }

        if (createdBy) {
            params.push(createdBy);
            whereSub += (whereSub ? " AND " : "") + `u.created_by = $${params.length}`;
        }
        
        const whereClause = whereSub ? `WHERE ${whereSub}` : "";

        const rows = await this.db.query(
            `SELECT u.id, u.email, u.active_email,
                    u.status, u.college_id, u.department_id,
                    u.created_by, u.created_at,
                    r.name AS role_name, r.level AS role_level,
                    COALESCE(sp.name, u.email) AS display_name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN student_profiles sp ON sp.student_id = u.id
             ${whereClause}
             ORDER BY u.created_at DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
            [...params, limit, offset]
        );

        const count = await this.db.query(
            `SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id ${whereClause}`,
            params
        );

        return { rows: rows.rows, total: parseInt(count.rows[0].count) };
    }

    /**
     * Get a single user by id, with role info.
     */
    async getUserById(id) {
        const r = await this.db.query(
            `SELECT u.id, u.email, u.active_email, u.status,
                    u.college_id, u.department_id, u.created_by, u.created_at,
                    r.name AS role_name, r.level AS role_level,
                    COALESCE(sp.name, u.email) AS display_name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN student_profiles sp ON sp.student_id = u.id
             WHERE u.id = $1 LIMIT 1`,
            [id]
        );
        return r.rows[0] || null;
    }

    /**
     * Create a new staff user (non-student).
     * Stores password_hash for local login. Firebase UID can be linked later.
     */
    async createUser({ email, passwordHash, roleId, collegeId = null, departmentId = null, createdBy, name }) {
        const r = await this.db.query(
            `INSERT INTO users (email, active_email, password_hash, role_id, status, college_id, department_id, created_by)
             VALUES ($1, $1, $2, $3, 'ACTIVE', $4, $5, $6)
             ON CONFLICT (active_email) DO UPDATE SET
               password_hash = EXCLUDED.password_hash,
               role_id = EXCLUDED.role_id,
               status = 'ACTIVE',
               college_id = EXCLUDED.college_id,
               department_id = EXCLUDED.department_id,
               created_by = EXCLUDED.created_by
             RETURNING id, email, active_email, status, college_id, department_id, created_at`,
            [email, passwordHash, roleId, collegeId, departmentId, createdBy]
        );
        return r.rows[0];
    }

    /**
     * Update a user (role, status, collegeId, departmentId, password_hash).
     * Only non-null fields are updated.
     */
    async updateUser({ id, roleId = null, status = null, collegeId = null, departmentId = null, passwordHash = null }) {
        const updates = [];
        const params = [];
        let idx = 1;

        if (roleId !== null) { updates.push(`role_id = $${idx++}`); params.push(roleId); }
        if (status !== null) { updates.push(`status = $${idx++}`); params.push(status); }
        if (collegeId !== null) { updates.push(`college_id = $${idx++}`); params.push(collegeId); }
        if (departmentId !== null) { updates.push(`department_id = $${idx++}`); params.push(departmentId); }
        if (passwordHash !== null) { updates.push(`password_hash = $${idx++}`); params.push(passwordHash); }

        if (updates.length === 0) return null;
        updates.push(`updated_at = NOW()`);

        params.push(id);
        const r = await this.db.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, status`,
            params
        );
        return r.rows[0] || null;
    }

    /**
     * Soft-delete: mark user as ARCHIVED (to preserve audit trail).
     */
    async deactivateUser(id) {
        const r = await this.db.query(
            `UPDATE users SET status = 'ARCHIVED', updated_at = NOW() WHERE id = $1 RETURNING id, email, status`,
            [id]
        );
        return r.rows[0] || null;
    }

    /**
     * Hard-delete (only used internally for cleanup / rollback).
     * Prefer deactivateUser for production use.
     */
    async deleteUser(id) {
        await this.db.query(`DELETE FROM users WHERE id = $1`, [id]);
    }

    /**
     * Get all roles from the roles table.
     */
    async listRoles() {
        const r = await this.db.query(`SELECT id, name, level FROM roles ORDER BY level DESC`);
        return r.rows;
    }

    /**
     * Log an audit action.
     */
    async logAudit({ actorId, action, targetId = null, collegeId = null, metadata = {} }) {
        try {
            await this.db.query(
                `INSERT INTO audit_logs (actor_id, action, target_id, college_id, metadata)
                 VALUES ($1, $2, $3, $4, $5)`,
                [actorId, action, targetId, collegeId, JSON.stringify(metadata)]
            );
        } catch (_) { /* non-critical */ }
    }
}

module.exports = AdminRepository;
