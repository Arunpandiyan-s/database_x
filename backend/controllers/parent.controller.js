const { pool } = require('../utils/transaction.util');
const ParentService = require('../services/parent.service');

class ParentController {

    // ─── POST /parent/register ────────────────────────────────────────────────
    static async registerParent(req, res, next) {
        try {
            const service = new ParentService(pool);
            const result = await service.registerParent(req.body || {});
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    // ─── GET /parent/student/:studentId ───────────────────────────────────────
    static async getStudentData(req, res, next) {
        try {
            const service = new ParentService(pool);
            const result = await service.getStudentData({ parentId: req.user.userId, studentId: req.params.studentId });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // ─── PUT /parent/od/:id/confirm ───────────────────────────────────────────
    static async confirmOD(req, res, next) {
        try {
            const service = new ParentService(pool);
            const result = await service.confirmOD({ parentId: req.user.userId, odId: req.params.id });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // ─── PUT /parent/leave/:id/confirm ────────────────────────────────────────
    static async confirmLeave(req, res, next) {
        try {
            const service = new ParentService(pool);
            const result = await service.confirmLeave({ parentId: req.user.userId, leaveId: req.params.id });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = ParentController;
