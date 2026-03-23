const { pool } = require('../utils/transaction.util');

class ODRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async listScoped({ user }) {
        const base = `
            SELECT od.*, sp.name AS student_name, sp.register_number,
                   sp.department, sp.year, sp.section, sp.semester
            FROM od_requests od
            LEFT JOIN student_profiles sp ON sp.student_id = od.student_id
        `;

        let query = base;
        let params = [];

        if (user.role === 'student') {
            query += ` WHERE od.student_id = $1 ORDER BY od.created_at DESC`;
            params = [user.userId];
        } else if (user.role === 'mentor') {
            query += ` WHERE od.mentor_id = $1 ORDER BY od.created_at DESC`;
            params = [user.userId];
        } else if (user.role === 'hod') {
            query += ` WHERE od.hod_id = $1 ORDER BY od.created_at DESC`;
            params = [user.userId];
        } else if (user.role === 'parent') {
            query += `
                WHERE od.student_id IN (
                    SELECT student_id FROM parent_student_mapping WHERE parent_id = $1 AND active = true
                ) ORDER BY od.created_at DESC`;
            params = [user.userId];
        } else if (user.level >= 4 && user.collegeId) {
            query += ` WHERE od.college_id = $1 ORDER BY od.created_at DESC`;
            params = [user.collegeId];
        } else {
            query += ` ORDER BY od.created_at DESC LIMIT 100`;
        }

        const result = await this.db.query(query, params);
        return result.rows;
    }

    async create({ studentId, mentorId, hodId, collegeId, departmentId, dates, reason, parentsInformed, daysRequested }) {
        const result = await this.db.query(
            `INSERT INTO od_requests
                (student_id, mentor_id, hod_id, college_id, department_id, dates, reason,
                 parents_informed, days_requested, mentor_approval, hod_approval, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending','pending','Pending Mentor Approval')
             RETURNING *`,
            [
                studentId,
                mentorId || null,
                hodId || null,
                collegeId || null,
                departmentId || null,
                Array.isArray(dates) ? dates : [dates],
                reason,
                parentsInformed || false,
                parseInt(daysRequested),
            ]
        );
        return result.rows[0];
    }

    async updateAttachment({ id, studentId, columnName, fileUrl }) {
        const result = await this.db.query(
            `UPDATE od_requests SET "${columnName}" = $1, updated_at = NOW()
             WHERE id = $2 AND student_id = $3
             RETURNING id`,
            [fileUrl, id, studentId]
        );
        return result.rows[0]?.id || null;
    }

    async updateMentorApproval({ id, status, newStatus }) {
        const result = await this.db.query(
            `UPDATE od_requests
             SET mentor_approval = $1, status = $2, updated_at = NOW()
             WHERE id = $3 AND mentor_approval = 'pending'
             RETURNING *`,
            [status, newStatus, id]
        );
        return result.rows[0] || null;
    }

    async updateHodApproval({ id, status, newStatus }) {
        const result = await this.db.query(
            `UPDATE od_requests
             SET hod_approval = $1, status = $2, updated_at = NOW()
             WHERE id = $3 AND hod_approval = 'pending' AND mentor_approval = 'approved'
             RETURNING *`,
            [status, newStatus, id]
        );
        return result.rows[0] || null;
    }

    async markParentConfirmed({ id }) {
        const result = await this.db.query(
            `UPDATE od_requests
             SET parent_confirmed = true, updated_at = NOW()
             WHERE id = $1
             RETURNING student_id`,
            [id]
        );
        return result.rows[0]?.student_id || null;
    }
}

module.exports = ODRepository;
