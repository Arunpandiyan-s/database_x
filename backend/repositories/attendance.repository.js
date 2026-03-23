const { pool } = require('../utils/transaction.util');

class AttendanceRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async listClassesForUser(user) {
        let query, params;

        if (user.level >= 6) {
            query = `SELECT c.*, u.email AS advisor_email
                     FROM classes c LEFT JOIN users u ON u.id = c.advisor_id
                     ORDER BY c.department, c.year, c.section`;
            params = [];
        } else if (user.role === 'class_advisor') {
            query = `SELECT c.*, u.email AS advisor_email
                     FROM classes c LEFT JOIN users u ON u.id = c.advisor_id
                     WHERE c.advisor_id = $1`;
            params = [user.userId];
        } else if (user.collegeId) {
            query = `SELECT c.*, u.email AS advisor_email
                     FROM classes c LEFT JOIN users u ON u.id = c.advisor_id
                     WHERE c.college_id = $1
                     ORDER BY c.department, c.year, c.section`;
            params = [user.collegeId];
        } else {
            return [];
        }

        const result = await this.db.query(query, params);
        return result.rows;
    }

    async createClass({ department, year, section, advisorId, collegeId, departmentId }) {
        const result = await this.db.query(
            `INSERT INTO classes (department, year, section, advisor_id, college_id, department_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [department, year, section, advisorId || null, collegeId || null, departmentId || null]
        );
        return result.rows[0];
    }

    async getClassById(classId) {
        const result = await this.db.query(
            `SELECT c.*, u.email AS advisor_email FROM classes c
             LEFT JOIN users u ON u.id = c.advisor_id
             WHERE c.id = $1`,
            [classId]
        );
        return result.rows[0] || null;
    }

    async listStudentsInClass(classId) {
        const result = await this.db.query(
            `SELECT u.id AS student_id, u.email,
                    sp.name, sp.register_number, sp.department, sp.year, sp.section, sp.status AS profile_status
             FROM class_student_mapping csm
             JOIN users u ON u.id = csm.student_id
             LEFT JOIN student_profiles sp ON sp.student_id = u.id
             WHERE csm.class_id = $1
             ORDER BY sp.name`,
            [classId]
        );
        return result.rows;
    }

    async getAttendanceByDate({ classId, date }) {
        const result = await this.db.query(
            `SELECT * FROM attendance_records WHERE class_id = $1 AND date = $2`,
            [classId, date]
        );
        return result.rows[0] || null;
    }

    async upsertAttendance({ classId, date, records, savedBy, collegeId }) {
        const result = await this.db.query(
            `INSERT INTO attendance_records (class_id, date, records, saved_by, college_id)
             VALUES ($1, $2, $3::jsonb, $4, $5)
             ON CONFLICT (class_id, date) DO UPDATE
                SET records    = EXCLUDED.records,
                    saved_by   = EXCLUDED.saved_by,
                    updated_at = NOW()
             RETURNING *`,
            [classId, date, JSON.stringify(records), savedBy, collegeId || null]
        );
        return result.rows[0];
    }

    async updateAttendance({ classId, date, records, savedBy }) {
        const result = await this.db.query(
            `UPDATE attendance_records
             SET records = $1::jsonb, saved_by = $2, updated_at = NOW()
             WHERE class_id = $3 AND date = $4
             RETURNING *`,
            [JSON.stringify(records), savedBy, classId, date]
        );
        return result.rows[0] || null;
    }

    async listAttendanceRecordsContainingStudent(studentId) {
        const result = await this.db.query(
            `SELECT records, date FROM attendance_records
             WHERE records::text LIKE $1
             ORDER BY date DESC`,
            [`%${studentId}%`]
        );
        return result.rows;
    }
}

module.exports = AttendanceRepository;
