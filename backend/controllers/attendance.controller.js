const { pool } = require('../utils/transaction.util');
const AttendanceService = require('../services/attendance.service');

class AttendanceController {
    // ─── GET /classes ─────────────────────────────────────────────────────────
    static async getClasses(req, res, next) {
        try {
            const service = new AttendanceService(pool);
            const result = await service.getClasses({ user: req.user });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── POST /classes ────────────────────────────────────────────────────────
    static async createClass(req, res, next) {
        try {
            const service = new AttendanceService(pool);
            const result = await service.createClass({ user: req.user, body: req.body });
            res.status(201).json(result);
        } catch (err) { next(err); }
    }

    // ─── GET /classes/:classId ────────────────────────────────────────────────
    static async getClassById(req, res, next) {
        try {
            const service = new AttendanceService(pool);
            const result = await service.getClassById({ classId: req.params.classId });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── GET /classes/:classId/students ───────────────────────────────────────
    static async getStudentsInClass(req, res, next) {
        try {
            const service = new AttendanceService(pool);
            const result = await service.getStudentsInClass({ classId: req.params.classId });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── GET /attendance/class/:classId/date/:date ────────────────────────────
    static async getAttendanceByDate(req, res, next) {
        try {
            const service = new AttendanceService(pool);
            const result = await service.getAttendanceByDate({ classId: req.params.classId, date: req.params.date });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── POST /attendance ─────────────────────────────────────────────────────
    static async saveAttendance(req, res, next) {
        try {
            const service = new AttendanceService(pool);
            const result = await service.saveAttendance({ user: req.user, body: req.body });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── PUT /attendance/class/:classId/date/:date ────────────────────────────
    static async updateAttendance(req, res, next) {
        try {
            const service = new AttendanceService(pool);
            const result = await service.updateAttendance({
                user: req.user,
                classId: req.params.classId,
                date: req.params.date,
                body: req.body,
            });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── GET /attendance/student/me/summary ───────────────────────────────────
    static async getStudentSummary(req, res, next) {
        try {
            const service = new AttendanceService(pool);
            const result = await service.getStudentSummary({ userId: req.user.userId });
            res.json(result);
        } catch (err) { next(err); }
    }
}

module.exports = AttendanceController;
