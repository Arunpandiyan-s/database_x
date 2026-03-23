const DashboardRepository = require('../repositories/dashboard.repository');

class DashboardService {
    constructor(db) {
        this.repo = new DashboardRepository(db);
    }

    async getMetrics({ user }) {
        const metrics = {};

        // Total students
        if (user.role === 'mentor') {
            metrics.totalStudents = await this.repo.countMentorStudents(user.userId);
        } else if (user.level < 6 && user.collegeId) {
            metrics.totalStudents = await this.repo.countActiveStudents({ collegeId: user.collegeId });
        } else {
            metrics.totalStudents = await this.repo.countActiveStudents({ collegeId: null });
        }

        // Pending leaves
        metrics.pendingLeaves = await this.repo.countPendingLeaves({ user });

        // Pending ODs
        metrics.pendingODs = await this.repo.countPendingODs({ user });

        // Mentor-specific pending requests
        if (user.role === 'mentor') {
            const [quota, scholarship] = await Promise.all([
                this.repo.countPendingQuotaRequests(user.userId),
                this.repo.countPendingScholarshipRequests(user.userId),
            ]);
            metrics.pendingQuotaRequests = quota;
            metrics.pendingScholarshipRequests = scholarship;
        }

        // Today's attendance %
        const today = new Date().toISOString().split('T')[0];
        const attendRows = await this.repo.listAttendanceRecordsForDate({ date: today, collegeId: user.collegeId || null });

        if (attendRows.length > 0) {
            let present = 0, total = 0;
            for (const row of attendRows) {
                for (const r of row.records) {
                    total++;
                    if (r.status === 'present' || r.status === 'od') present++;
                }
            }
            metrics.todayAttendancePct = total > 0 ? Math.round((present / total) * 100) : null;
        } else {
            metrics.todayAttendancePct = null;
        }

        // Recent / unread notifications
        const recent = await this.repo.listUnreadNotifications(user.userId);
        metrics.recentNotifications = recent;
        metrics.unreadNotifications = recent.length;

        return { success: true, data: metrics };
    }
}

module.exports = DashboardService;
