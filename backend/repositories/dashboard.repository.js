const { pool } = require('../utils/transaction.util');

class DashboardRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async countMentorStudents(mentorId) {
        const r = await this.db.query(
            `SELECT COUNT(*) FROM mentor_mappings WHERE mentor_id = $1 AND active = true`,
            [mentorId]
        );
        return parseInt(r.rows[0].count);
    }

    async countActiveStudents({ collegeId }) {
        if (collegeId) {
            const r = await this.db.query(
                `SELECT COUNT(*) FROM users u
                 JOIN roles r ON r.id = u.role_id
                 WHERE r.name = 'student' AND u.status = 'ACTIVE' AND u.college_id = $1`,
                [collegeId]
            );
            return parseInt(r.rows[0].count);
        }

        const r = await this.db.query(
            `SELECT COUNT(*) FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE r.name = 'student' AND u.status = 'ACTIVE'`
        );
        return parseInt(r.rows[0].count);
    }

    async countPendingLeaves({ user }) {
        if (user.role === 'mentor') {
            const r = await this.db.query(
                `SELECT COUNT(*) FROM leave_requests
                 WHERE status = 'pending_mentor' AND mentor_id = $1`,
                [user.userId]
            );
            return parseInt(r.rows[0].count);
        }

        if (user.role === 'hod') {
            const r = await this.db.query(
                `SELECT COUNT(*) FROM leave_requests
                 WHERE status = 'pending_hod' AND hod_id = $1`,
                [user.userId]
            );
            return parseInt(r.rows[0].count);
        }

        if (user.collegeId) {
            const r = await this.db.query(
                `SELECT COUNT(*) FROM leave_requests
                 WHERE status IN ('pending_mentor','pending_hod') AND college_id = $1`,
                [user.collegeId]
            );
            return parseInt(r.rows[0].count);
        }

        const r = await this.db.query(
            `SELECT COUNT(*) FROM leave_requests WHERE status IN ('pending_mentor','pending_hod')`
        );
        return parseInt(r.rows[0].count);
    }

    async countPendingODs({ user }) {
        if (user.role === 'mentor') {
            const r = await this.db.query(
                `SELECT COUNT(*) FROM od_requests
                 WHERE mentor_approval = 'pending' AND mentor_id = $1`,
                [user.userId]
            );
            return parseInt(r.rows[0].count);
        }

        if (user.role === 'hod') {
            const r = await this.db.query(
                `SELECT COUNT(*) FROM od_requests
                 WHERE hod_approval = 'pending' AND hod_id = $1`,
                [user.userId]
            );
            return parseInt(r.rows[0].count);
        }

        if (user.collegeId) {
            const r = await this.db.query(
                `SELECT COUNT(*) FROM od_requests
                 WHERE mentor_approval = 'pending' AND college_id = $1`,
                [user.collegeId]
            );
            return parseInt(r.rows[0].count);
        }

        const r = await this.db.query(
            `SELECT COUNT(*) FROM od_requests WHERE mentor_approval = 'pending'`
        );
        return parseInt(r.rows[0].count);
    }

    async countPendingQuotaRequests(mentorId) {
        const r = await this.db.query(
            `SELECT COUNT(*) FROM student_profiles WHERE mentor_id = $1 AND quota_edit_requested = true`,
            [mentorId]
        );
        return parseInt(r.rows[0].count);
    }

    async countPendingScholarshipRequests(mentorId) {
        const r = await this.db.query(
            `SELECT COUNT(*) FROM student_profiles WHERE mentor_id = $1 AND scholarship_edit_requested = true`,
            [mentorId]
        );
        return parseInt(r.rows[0].count);
    }

    async listAttendanceRecordsForDate({ date, collegeId }) {
        if (collegeId) {
            const r = await this.db.query(
                `SELECT ar.records FROM attendance_records ar
                 JOIN classes c ON c.id = ar.class_id
                 WHERE ar.date = $1 AND c.college_id = $2`,
                [date, collegeId]
            );
            return r.rows;
        }

        const r = await this.db.query(
            `SELECT records FROM attendance_records WHERE date = $1`,
            [date]
        );
        return r.rows;
    }

    async listUnreadNotifications(userId) {
        const r = await this.db.query(
            `SELECT * FROM notifications
             WHERE user_id = $1 AND read = false
             ORDER BY created_at DESC LIMIT 5`,
            [userId]
        );
        return r.rows;
    }
}

module.exports = DashboardRepository;
