const AttendanceRepository = require('../repositories/attendance.repository');
const { notify } = require('../utils/notify.util');

class AttendanceService {
    constructor(db) {
        this.repo = new AttendanceRepository(db);
    }

    mapClass(row) {
        if (!row) return null;
        return {
            id: row.id,
            department: row.department || '',
            year: row.year || '',
            section: row.section || '',
            advisorId: row.advisor_id || '',
        };
    }

    mapAttendanceRecord(row) {
        if (!row) return null;
        return {
            id: row.id,
            classId: row.class_id,
            date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
            records: Array.isArray(row.records) ? row.records : [],
        };
    }

    async getClasses({ user }) {
        const rows = await this.repo.listClassesForUser(user);
        return { success: true, data: rows.map(r => this.mapClass(r)) };
    }

    async createClass({ user, body }) {
        const { department, year, section, advisor_id, college_id, department_id } = body || {};
        if (!department || !year || !section) {
            const err = new Error('department, year and section are required');
            err.statusCode = 400;
            throw err;
        }

        const created = await this.repo.createClass({
            department,
            year,
            section,
            advisorId: advisor_id,
            collegeId: college_id || user.collegeId,
            departmentId: department_id,
        });

        return { success: true, data: this.mapClass(created) };
    }

    async getClassById({ classId }) {
        const row = await this.repo.getClassById(classId);
        if (!row) {
            const err = new Error('Class not found');
            err.statusCode = 404;
            throw err;
        }
        return { success: true, data: row };
    }

    async getStudentsInClass({ classId }) {
        const rows = await this.repo.listStudentsInClass(classId);
        return { success: true, data: rows };
    }

    async getAttendanceByDate({ classId, date }) {
        const row = await this.repo.getAttendanceByDate({ classId, date });
        if (!row) return { success: true, data: null, message: 'No record for this date' };
        return { success: true, data: this.mapAttendanceRecord(row) };
    }

    async saveAttendance({ user, body }) {
        const { classId, date, records } = body || {};
        if (!classId || !date || !Array.isArray(records)) {
            const err = new Error('classId, date, and records[] are required');
            err.statusCode = 400;
            throw err;
        }

        const row = await this.repo.upsertAttendance({
            classId,
            date,
            records,
            savedBy: user.userId,
            collegeId: user.collegeId,
        });

        await notify(user.userId, `Attendance for ${date} saved successfully`, 'success');
        return { success: true, data: this.mapAttendanceRecord(row), message: 'Attendance saved' };
    }

    async updateAttendance({ user, classId, date, body }) {
        const { records } = body || {};
        if (!Array.isArray(records)) {
            const err = new Error('records[] is required');
            err.statusCode = 400;
            throw err;
        }

        const row = await this.repo.updateAttendance({
            classId,
            date,
            records,
            savedBy: user.userId,
        });

        if (!row) {
            const err = new Error('Attendance record not found. Use POST to create.');
            err.statusCode = 404;
            throw err;
        }

        return { success: true, data: this.mapAttendanceRecord(row), message: 'Attendance updated' };
    }

    async getStudentSummary({ userId }) {
        const rows = await this.repo.listAttendanceRecordsContainingStudent(userId);

        let present = 0, absent = 0, od = 0;
        const history = [];

        for (const row of rows) {
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

        return { success: true, data: { present, absent, od, total, percentage, history } };
    }
}

module.exports = AttendanceService;
