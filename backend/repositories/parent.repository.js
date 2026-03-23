const { pool } = require('../utils/transaction.util');

class ParentRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async findStudentIdByEmail(studentEmail) {
        const r = await this.db.query(
            `SELECT id FROM users WHERE email = $1 AND role_id = (SELECT id FROM roles WHERE name = 'student')`,
            [studentEmail]
        );
        return r.rows[0]?.id || null;
    }

    async getRoleByName(roleName) {
        const r = await this.db.query(`SELECT id, name, level FROM roles WHERE name = $1 LIMIT 1`, [roleName]);
        return r.rows[0] || null;
    }

    async upsertParentUser({ firebaseUid, parentEmail, roleId }) {
        const r = await this.db.query(
            `INSERT INTO users (firebase_uid, email, active_email, role_id, status)
             VALUES ($1, $2, $2, $3, 'ACTIVE')
             ON CONFLICT (email) DO UPDATE SET status = 'ACTIVE', firebase_uid = EXCLUDED.firebase_uid
             RETURNING id`,
            [firebaseUid, parentEmail, roleId]
        );
        return r.rows[0].id;
    }

    async linkParentStudent({ parentId, studentId, relationship }) {
        await this.db.query(
            `INSERT INTO parent_student_mapping (parent_id, student_id, relationship, active)
             VALUES ($1, $2, $3, true)
             ON CONFLICT (parent_id, student_id) DO NOTHING`,
            [parentId, studentId, relationship || 'guardian']
        );
    }

    async isLinked(parentId, studentId) {
        const r = await this.db.query(
            `SELECT id FROM parent_student_mapping WHERE parent_id = $1 AND student_id = $2 AND active = true`,
            [parentId, studentId]
        );
        return r.rows.length > 0;
    }

    async getStudentProfile(studentId) {
        const r = await this.db.query(
            `SELECT sp.*, u.email
             FROM student_profiles sp
             JOIN users u ON u.id = sp.student_id
             WHERE sp.student_id = $1`,
            [studentId]
        );
        return r.rows[0] || null;
    }

    async getRecentLeaves(studentId) {
        const r = await this.db.query(
            `SELECT * FROM leave_requests WHERE student_id = $1 ORDER BY created_at DESC LIMIT 10`,
            [studentId]
        );
        return r.rows;
    }

    async getRecentOds(studentId) {
        const r = await this.db.query(
            `SELECT * FROM od_requests WHERE student_id = $1 ORDER BY created_at DESC LIMIT 10`,
            [studentId]
        );
        return r.rows;
    }

    async getAttendanceRecordsContaining(studentId) {
        const r = await this.db.query(
            `SELECT records FROM attendance_records WHERE records::text LIKE $1`,
            [`%${studentId}%`]
        );
        return r.rows;
    }

    async getOdStudentIfLinked(odId, parentId) {
        const r = await this.db.query(
            `SELECT od.student_id FROM od_requests od
             JOIN parent_student_mapping psm ON psm.student_id = od.student_id
             WHERE od.id = $1 AND psm.parent_id = $2 AND psm.active = true`,
            [odId, parentId]
        );
        return r.rows[0]?.student_id || null;
    }

    async confirmOd(odId) {
        await this.db.query(
            `UPDATE od_requests SET parent_confirmed = true, parents_informed = true, updated_at = NOW() WHERE id = $1`,
            [odId]
        );
    }

    async getLeaveStudentIfLinked(leaveId, parentId) {
        const r = await this.db.query(
            `SELECT lr.student_id FROM leave_requests lr
             JOIN parent_student_mapping psm ON psm.student_id = lr.student_id
             WHERE lr.id = $1 AND psm.parent_id = $2 AND psm.active = true`,
            [leaveId, parentId]
        );
        return r.rows[0]?.student_id || null;
    }

    async confirmLeave(leaveId) {
        await this.db.query(
            `UPDATE leave_requests SET parent_confirmed = true, updated_at = NOW() WHERE id = $1`,
            [leaveId]
        );
    }
}

module.exports = ParentRepository;
