const { pool } = require('../utils/transaction.util');
const { notify } = require('../utils/notify.util');

class AttendanceController {

    // ─── GET /classes ─────────────────────────────────────────────────────────
    static async getClasses(req, res, next) {
        try {
            const user = req.user;
            let query, params;

            if (user.level >= 6) {
                // Admin / Technical Director — all classes
                query = `SELECT c.*, u.email AS advisor_email
                         FROM classes c LEFT JOIN users u ON u.id = c.advisor_id
                         ORDER BY c.department, c.year, c.section`;
                params = [];
            } else if (user.role === 'class_advisor') {
                // Class advisor sees only their class
                query = `SELECT c.*, u.email AS advisor_email
                         FROM classes c LEFT JOIN users u ON u.id = c.advisor_id
                         WHERE c.advisor_id = $1`;
                params = [user.userId];
            } else if (user.collegeId) {
                // HOD/Principal/etc. — scoped to college
                query = `SELECT c.*, u.email AS advisor_email
                         FROM classes c LEFT JOIN users u ON u.id = c.advisor_id
                         WHERE c.college_id = $1
                         ORDER BY c.department, c.year, c.section`;
                params = [user.collegeId];
            } else {
                return res.json({ success: true, data: [] });
            }

            const result = await pool.query(query, params);
            res.json({ success: true, data: result.rows });
        } catch (err) { next(err); }
    }

    // ─── POST /classes ────────────────────────────────────────────────────────
    static async createClass(req, res, next) {
        try {
            const { department, year, section, advisor_id, college_id, department_id } = req.body;
            if (!department || !year || !section) {
                return res.status(400).json({ success: false, message: 'department, year and section are required' });
            }
            const result = await pool.query(
                `INSERT INTO classes (department, year, section, advisor_id, college_id, department_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [department, year, section, advisor_id || null, college_id || req.user.collegeId || null, department_id || null]
            );
            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (err) { next(err); }
    }

    // ─── GET /classes/:classId ────────────────────────────────────────────────
    static async getClassById(req, res, next) {
        try {
            const result = await pool.query(
                `SELECT c.*, u.email AS advisor_email FROM classes c
                 LEFT JOIN users u ON u.id = c.advisor_id
                 WHERE c.id = $1`,
                [req.params.classId]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Class not found' });
            }
            res.json({ success: true, data: result.rows[0] });
        } catch (err) { next(err); }
    }

    // ─── GET /classes/:classId/students ───────────────────────────────────────
    static async getStudentsInClass(req, res, next) {
        try {
            const result = await pool.query(
                `SELECT u.id AS student_id, u.email,
                        sp.name, sp.register_number, sp.department, sp.year, sp.section, sp.status AS profile_status
                 FROM class_student_mapping csm
                 JOIN users u ON u.id = csm.student_id
                 LEFT JOIN student_profiles sp ON sp.student_id = u.id
                 WHERE csm.class_id = $1
                 ORDER BY sp.name`,
                [req.params.classId]
            );
            res.json({ success: true, data: result.rows });
        } catch (err) { next(err); }
    }

    // ─── GET /attendance/class/:classId/date/:date ────────────────────────────
    static async getAttendanceByDate(req, res, next) {
        try {
            const { classId, date } = req.params;
            const result = await pool.query(
                `SELECT * FROM attendance_records WHERE class_id = $1 AND date = $2`,
                [classId, date]
            );
            if (result.rows.length === 0) {
                return res.json({ success: true, data: null, message: 'No record for this date' });
            }
            res.json({ success: true, data: result.rows[0] });
        } catch (err) { next(err); }
    }

    // ─── POST /attendance ─────────────────────────────────────────────────────
    static async saveAttendance(req, res, next) {
        try {
            const { classId, date, records } = req.body;
            if (!classId || !date || !Array.isArray(records)) {
                return res.status(400).json({ success: false, message: 'classId, date, and records[] are required' });
            }

            // Upsert: insert or update on (class_id, date) conflict
            const result = await pool.query(
                `INSERT INTO attendance_records (class_id, date, records, saved_by, college_id)
                 VALUES ($1, $2, $3::jsonb, $4, $5)
                 ON CONFLICT (class_id, date) DO UPDATE
                    SET records    = EXCLUDED.records,
                        saved_by   = EXCLUDED.saved_by,
                        updated_at = NOW()
                 RETURNING *`,
                [classId, date, JSON.stringify(records), req.user.userId, req.user.collegeId || null]
            );

            // Notify class advisor that attendance was saved
            await notify(req.user.userId, `Attendance for ${date} saved successfully`, 'success');

            res.json({ success: true, data: result.rows[0], message: 'Attendance saved' });
        } catch (err) { next(err); }
    }

    // ─── PUT /attendance/class/:classId/date/:date ────────────────────────────
    static async updateAttendance(req, res, next) {
        try {
            const { classId, date } = req.params;
            const { records } = req.body;
            if (!Array.isArray(records)) {
                return res.status(400).json({ success: false, message: 'records[] is required' });
            }

            const result = await pool.query(
                `UPDATE attendance_records
                 SET records = $1::jsonb, saved_by = $2, updated_at = NOW()
                 WHERE class_id = $3 AND date = $4
                 RETURNING *`,
                [JSON.stringify(records), req.user.userId, classId, date]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Attendance record not found. Use POST to create.' });
            }
            res.json({ success: true, data: result.rows[0], message: 'Attendance updated' });
        } catch (err) { next(err); }
    }

    // ─── GET /attendance/student/me/summary ───────────────────────────────────
    static async getStudentSummary(req, res, next) {
        try {
            const userId = req.user.userId;

            // Collect all attendance_records rows that contain this student
            const result = await pool.query(
                `SELECT records, date FROM attendance_records
                 WHERE records::text LIKE $1
                 ORDER BY date DESC`,
                [`%${userId}%`]
            );

            let present = 0, absent = 0, od = 0;
            const history = [];

            for (const row of result.rows) {
                const entry = row.records.find(r => r.studentId === userId);
                if (entry) {
                    if (entry.status === 'present') present++;
                    else if (entry.status === 'absent') absent++;
                    else if (entry.status === 'od') od++;
                    history.push({ date: row.date, status: entry.status });
                }
            }

            const total = present + absent + od;
            const percentage = total > 0 ? Math.round(((present + od) / total) * 100) : 0;

            res.json({
                success: true,
                data: { present, absent, od, total, percentage, history }
            });
        } catch (err) { next(err); }
    }
}

module.exports = AttendanceController;
