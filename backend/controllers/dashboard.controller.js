const { pool } = require('../utils/transaction.util');

class DashboardController {

    // ─── GET /dashboard/metrics ───────────────────────────────────────────────
    static async getMetrics(req, res, next) {
        try {
            const user = req.user;
            const metrics = {};

            // ── Total students ─────────────────────────────────────────────────
            let studentCount;
            if (user.role === 'mentor') {
                // Mentor only sees their own students
                studentCount = await pool.query(
                    `SELECT COUNT(*) FROM mentor_mappings WHERE mentor_id = $1 AND active = true`,
                    [user.userId]
                );
            } else if (user.level < 6 && user.collegeId) {
                studentCount = await pool.query(
                    `SELECT COUNT(*) FROM users u
                     JOIN roles r ON r.id = u.role_id
                     WHERE r.name = 'student' AND u.status = 'ACTIVE' AND u.college_id = $1`,
                    [user.collegeId]
                );
            } else {
                studentCount = await pool.query(
                    `SELECT COUNT(*) FROM users u
                     JOIN roles r ON r.id = u.role_id
                     WHERE r.name = 'student' AND u.status = 'ACTIVE'`
                );
            }
            metrics.totalStudents = parseInt(studentCount.rows[0].count);

            // ── Pending leaves ─────────────────────────────────────────────────
            let pendingLeaves;
            if (user.role === 'mentor') {
                pendingLeaves = await pool.query(
                    `SELECT COUNT(*) FROM leave_requests
                     WHERE status = 'pending_mentor' AND mentor_id = $1`,
                    [user.userId]
                );
            } else if (user.role === 'hod') {
                pendingLeaves = await pool.query(
                    `SELECT COUNT(*) FROM leave_requests
                     WHERE status = 'pending_hod' AND hod_id = $1`,
                    [user.userId]
                );
            } else if (user.collegeId) {
                pendingLeaves = await pool.query(
                    `SELECT COUNT(*) FROM leave_requests
                     WHERE status IN ('pending_mentor','pending_hod') AND college_id = $1`,
                    [user.collegeId]
                );
            } else {
                pendingLeaves = await pool.query(
                    `SELECT COUNT(*) FROM leave_requests WHERE status IN ('pending_mentor','pending_hod')`
                );
            }
            metrics.pendingLeaves = parseInt(pendingLeaves.rows[0].count);

            // ── Pending ODs ────────────────────────────────────────────────────
            let pendingODs;
            if (user.role === 'mentor') {
                pendingODs = await pool.query(
                    `SELECT COUNT(*) FROM od_requests
                     WHERE mentor_approval = 'pending' AND mentor_id = $1`,
                    [user.userId]
                );
            } else if (user.role === 'hod') {
                pendingODs = await pool.query(
                    `SELECT COUNT(*) FROM od_requests
                     WHERE hod_approval = 'pending' AND hod_id = $1`,
                    [user.userId]
                );
            } else if (user.collegeId) {
                pendingODs = await pool.query(
                    `SELECT COUNT(*) FROM od_requests
                     WHERE mentor_approval = 'pending' AND college_id = $1`,
                    [user.collegeId]
                );
            } else {
                pendingODs = await pool.query(
                    `SELECT COUNT(*) FROM od_requests WHERE mentor_approval = 'pending'`
                );
            }
            metrics.pendingODs = parseInt(pendingODs.rows[0].count);

            // ── Quota / Scholarship pending requests (mentor view) ─────────────
            if (user.role === 'mentor') {
                const [quotaQ, schQ] = await Promise.all([
                    pool.query(
                        `SELECT COUNT(*) FROM student_profiles WHERE mentor_id = $1 AND quota_edit_requested = true`,
                        [user.userId]
                    ),
                    pool.query(
                        `SELECT COUNT(*) FROM student_profiles WHERE mentor_id = $1 AND scholarship_edit_requested = true`,
                        [user.userId]
                    ),
                ]);
                metrics.pendingQuotaRequests = parseInt(quotaQ.rows[0].count);
                metrics.pendingScholarshipRequests = parseInt(schQ.rows[0].count);
            }

            // ── Today's attendance % ───────────────────────────────────────────
            const today = new Date().toISOString().split('T')[0];
            const attendQ = user.collegeId
                ? await pool.query(
                    `SELECT ar.records FROM attendance_records ar
                     JOIN classes c ON c.id = ar.class_id
                     WHERE ar.date = $1 AND c.college_id = $2`,
                    [today, user.collegeId]
                )
                : await pool.query(
                    `SELECT records FROM attendance_records WHERE date = $1`,
                    [today]
                );

            if (attendQ.rows.length > 0) {
                let present = 0, total = 0;
                for (const row of attendQ.rows) {
                    for (const r of row.records) {
                        total++;
                        if (r.status === 'present' || r.status === 'od') present++;
                    }
                }
                metrics.todayAttendancePct = total > 0 ? Math.round((present / total) * 100) : null;
            } else {
                metrics.todayAttendancePct = null;
            }

            // ── Recent / unread notifications ──────────────────────────────────
            const notifQ = await pool.query(
                `SELECT * FROM notifications
                 WHERE user_id = $1 AND read = false
                 ORDER BY created_at DESC LIMIT 5`,
                [user.userId]
            );
            metrics.recentNotifications = notifQ.rows;
            metrics.unreadNotifications = notifQ.rows.length;

            res.json({ success: true, data: metrics });
        } catch (err) { next(err); }
    }
}

module.exports = DashboardController;
