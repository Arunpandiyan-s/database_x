const { mapDbToCamelCase } = require('../utils/mapper');

class AuthRepository {
    constructor(db) {
        this.db = db;
    }

    async getRoleByName(roleName) {
        const r = await this.db.query(`SELECT id, name, level FROM roles WHERE name = $1 LIMIT 1`, [roleName]);
        return r.rows[0] ? mapDbToCamelCase(r.rows[0]) : null;
    }

    async findUserAuthByEmail(email) {
        const r = await this.db.query(
            `SELECT u.id, u.email, u.active_email, u.password_hash, u.status,
                    r.name AS role_name, r.level AS role_level
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.email = $1 OR u.active_email = $1
             LIMIT 1`,
            [email]
        );
        return r.rows[0] ? mapDbToCamelCase(r.rows[0]) : null;
    }

    async findUserByFirebaseUid(firebaseUid) {
        const r = await this.db.query(
            `SELECT u.id, u.email, u.active_email, u.status, u.college_id, u.department_id, u.cluster_id,
                    r.name AS role_name, r.level AS role_level
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.firebase_uid = $1
             LIMIT 1`,
            [firebaseUid]
        );
        return r.rows[0] ? mapDbToCamelCase(r.rows[0]) : null;
    }

    async linkFirebaseUidByEmail(email, firebaseUid) {
        const r = await this.db.query(
            `UPDATE users SET firebase_uid = $1, updated_at = NOW()
             WHERE (email = $2 OR active_email = $2)
             RETURNING id`,
            [firebaseUid, email]
        );
        return r.rows[0] ? mapDbToCamelCase(r.rows[0]) : null;
    }

    // ─── Admission prospects ───────────────────────────────────────────────────
    async upsertAdmissionProspect({ name, email, tempPassword }, client = this.db) {
        const r = await client.query(
            `INSERT INTO admission_prospects (name, email, temp_password, status)
             VALUES ($1, $2, $3, 'pending_admin_approval')
             ON CONFLICT (email) DO UPDATE SET 
                name = EXCLUDED.name,
                temp_password = EXCLUDED.temp_password,
                status = EXCLUDED.status
             RETURNING id, name, email, temp_password, status, department, created_at`,
            [name, email, tempPassword]
        );
        return mapDbToCamelCase(r.rows[0]);
    }

    async listPendingAdmissionProspects() {
        const r = await this.db.query(
            `SELECT id, name, email, temp_password AS "tempPassword", status, department, created_at AS "createdAt"
             FROM admission_prospects
             WHERE status = 'pending_admin_approval'
             ORDER BY created_at DESC`
        );
        return r.rows.map(mapDbToCamelCase);
    }

    async findAdmissionProspectByEmail(email) {
        const r = await this.db.query(
            `SELECT id, name, email, temp_password AS "tempPassword", status, department
             FROM admission_prospects
             WHERE email = $1
             LIMIT 1`,
            [email]
        );
        return r.rows[0] ? mapDbToCamelCase(r.rows[0]) : null;
    }

    async approveAdmissionProspect(prospectId, department) {
        const r = await this.db.query(
            `UPDATE admission_prospects
             SET status = 'active', department = $1
             WHERE id = $2
             RETURNING id, name, email, temp_password AS "tempPassword", status, department, created_at AS "createdAt"`,
            [department, prospectId]
        );
        return r.rows[0] ? mapDbToCamelCase(r.rows[0]) : null;
    }

    // ─── Student invites / OTP (current system uses student_invites) ────────────
    async ensureInviteRowForEmail(studentEmail) {
        await this.db.query(
            `INSERT INTO student_invites (student_email, register_number)
             VALUES ($1, 'PENDING')
             ON CONFLICT (student_email) DO NOTHING`,
            [studentEmail]
        );
    }

    async getInviteByEmail(studentEmail) {
        const r = await this.db.query(
            `SELECT * FROM student_invites WHERE student_email = $1 LIMIT 1`,
            [studentEmail]
        );
        return r.rows[0] ? mapDbToCamelCase(r.rows[0]) : null;
    }

    async updateInviteOtp(studentEmail, otpHash, otpExpires) {
        await this.db.query(
            `UPDATE student_invites SET otp_hash = $1, otp_expires = $2 WHERE student_email = $3`,
            [otpHash, otpExpires, studentEmail]
        );
    }

    async markInviteVerified(studentEmail) {
        await this.db.query(
            `UPDATE student_invites SET verified = true WHERE student_email = $1`,
            [studentEmail]
        );
    }

    async createAdminInvite({ studentEmail, registerNumber, invitedBy, otpHash, otpExpires, name = null, departmentId = null, collegeId = null }) {
        const r = await this.db.query(
            `INSERT INTO student_invites (student_email, register_number, invited_by, otp_hash, otp_expires, name, department_id, college_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'sent')
             RETURNING *`,
            [studentEmail, registerNumber, invitedBy, otpHash, otpExpires, name, departmentId, collegeId]
        );
        return mapDbToCamelCase(r.rows[0]);
    }

    // ─── User + profile creation ───────────────────────────────────────────────
    async upsertUserByEmail({ email, firebaseUid, roleId, status = 'ACTIVE' }, client = this.db) {
        const r = await client.query(
            `INSERT INTO users (firebase_uid, email, active_email, role_id, status)
             VALUES ($1, $2, $2, $3, $4)
             ON CONFLICT (email) DO UPDATE SET firebase_uid = EXCLUDED.firebase_uid
             RETURNING id, email, active_email, status, college_id, department_id, cluster_id, role_id`,
            [firebaseUid, email, roleId, status]
        );
        return mapDbToCamelCase(r.rows[0]);
    }

    async ensureStudentProfile({ studentId, name, registerNumber }, client = this.db) {
        await client.query(
            `INSERT INTO student_profiles (student_id, name, register_number, status, profile_submitted, edit_request_pending)
             VALUES ($1, $2, $3, 'DRAFT', false, false)
             ON CONFLICT (student_id) DO NOTHING`,
            [studentId, name, registerNumber]
        );
    }

    async ensurePendingParentUser({ email, roleId }, client = this.db) {
        const existing = await client.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);
        if (existing.rows.length > 0) return existing.rows[0].id;

        const inserted = await client.query(
            `INSERT INTO users (email, active_email, role_id, status)
             VALUES ($1, $1, $2, 'PENDING')
             RETURNING id`,
            [email, roleId]
        );
        return inserted.rows[0].id;
    }

    async linkParentStudent({ parentId, studentId, relationship }, client = this.db) {
        await client.query(
            `INSERT INTO parent_student_mapping (parent_id, student_id, relationship, active)
             VALUES ($1, $2, $3, true)
             ON CONFLICT (parent_id, student_id) DO NOTHING`,
            [parentId, studentId, relationship || 'guardian']
        );
    }

    async isInviteVerified(studentEmail) {
        const r = await this.db.query(
            `SELECT verified FROM student_invites WHERE student_email = $1 LIMIT 1`,
            [studentEmail]
        );
        return !!r.rows[0]?.verified;
    }

    async updateUserPasswordHash(email, passwordHash) {
        await this.db.query(
            `UPDATE users SET password_hash = $1 WHERE email = $2 OR active_email = $2`,
            [passwordHash, email]
        );
    }

    async clearAdmissionProspectTempPassword(email) {
        await this.db.query(`UPDATE admission_prospects SET temp_password = NULL WHERE email = $1`, [email]);
    }
}

module.exports = AuthRepository;
