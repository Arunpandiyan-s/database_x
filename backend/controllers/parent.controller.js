const { pool } = require('../utils/transaction.util');
const { notify } = require('../utils/notify.util');

class ParentController {

    // ─── GET /parent/student/:studentId ───────────────────────────────────────
    static async getStudentData(req, res, next) {
        try {
            const parentId = req.user.userId;
            const { studentId } = req.params;

            // Verify parent-student mapping
            const mapping = await pool.query(
                `SELECT id FROM parent_student_mapping
                 WHERE parent_id = $1 AND student_id = $2 AND active = true`,
                [parentId, studentId]
            );
            if (mapping.rows.length === 0) {
                return res.status(403).json({ success: false, message: 'Permission denied: Not linked to this student' });
            }

            // Fetch student profile
            const [profile, leaves, ods, attendance] = await Promise.all([
                pool.query(
                    `SELECT sp.*, u.email FROM student_profiles sp
                     JOIN users u ON u.id = sp.student_id
                     WHERE sp.student_id = $1`,
                    [studentId]
                ),
                pool.query(
                    `SELECT * FROM leave_requests WHERE student_id = $1 ORDER BY created_at DESC LIMIT 10`,
                    [studentId]
                ),
                pool.query(
                    `SELECT * FROM od_requests WHERE student_id = $1 ORDER BY created_at DESC LIMIT 10`,
                    [studentId]
                ),
                // Attendance summary
                pool.query(
                    `SELECT records FROM attendance_records WHERE records::text LIKE $1`,
                    [`%${studentId}%`]
                ),
            ]);

            let present = 0, absent = 0, od = 0;
            for (const row of attendance.rows) {
                const entry = row.records.find(r => r.studentId === studentId);
                if (entry) {
                    if (entry.status === 'present') present++;
                    else if (entry.status === 'absent') absent++;
                    else if (entry.status === 'od') od++;
                }
            }
            const total = present + absent + od;
            const percentage = total > 0 ? Math.round(((present + od) / total) * 100) : 0;

            res.json({
                success: true,
                data: {
                    profile: profile.rows[0] || null,
                    leaves: leaves.rows,
                    ods: ods.rows,
                    attendance: { present, absent, od, total, percentage },
                }
            });
        } catch (err) { next(err); }
    }

    // ─── PUT /parent/od/:id/confirm ───────────────────────────────────────────
    static async confirmOD(req, res, next) {
        try {
            const parentId = req.user.userId;

            // Verify parent is linked to the student in this OD
            const od = await pool.query(
                `SELECT od.student_id FROM od_requests od
                 JOIN parent_student_mapping psm ON psm.student_id = od.student_id
                 WHERE od.id = $1 AND psm.parent_id = $2 AND psm.active = true`,
                [req.params.id, parentId]
            );
            if (od.rows.length === 0) {
                return res.status(403).json({ success: false, message: 'Not authorized to confirm this OD' });
            }

            await pool.query(
                `UPDATE od_requests SET parent_confirmed = true, parents_informed = true, updated_at = NOW()
                 WHERE id = $1`,
                [req.params.id]
            );

            await notify(od.rows[0].student_id, 'Your parent confirmed the OD request', 'success');
            res.json({ success: true, message: 'OD parent confirmation recorded' });
        } catch (err) { next(err); }
    }

    // ─── PUT /parent/leave/:id/confirm ────────────────────────────────────────
    static async confirmLeave(req, res, next) {
        try {
            const parentId = req.user.userId;

            const leave = await pool.query(
                `SELECT lr.student_id FROM leave_requests lr
                 JOIN parent_student_mapping psm ON psm.student_id = lr.student_id
                 WHERE lr.id = $1 AND psm.parent_id = $2 AND psm.active = true`,
                [req.params.id, parentId]
            );
            if (leave.rows.length === 0) {
                return res.status(403).json({ success: false, message: 'Not authorized to confirm this leave' });
            }

            await pool.query(
                `UPDATE leave_requests SET parent_confirmed = true, updated_at = NOW()
                 WHERE id = $1`,
                [req.params.id]
            );

            await notify(leave.rows[0].student_id, 'Your parent confirmed the leave request', 'success');
            res.json({ success: true, message: 'Leave parent confirmation recorded' });
        } catch (err) { next(err); }
    }
}

module.exports = ParentController;
