const { pool } = require('../utils/transaction.util');
const ODService = require('../services/od.service');

class ODController {
    // ─── GET /od ──────────────────────────────────────────────────────────────
    static async getODRequests(req, res, next) {
        try {
            const service = new ODService(pool);
            const result = await service.list({ user: req.user });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── POST /od ─────────────────────────────────────────────────────────────
    static async createOD(req, res, next) {
        try {
            const service = new ODService(pool);
            const result = await service.create({ user: req.user, body: req.body });
            res.status(201).json(result);
        } catch (err) { next(err); }
    }

    // ─── POST /od/:id/upload ──────────────────────────────────────────────────
    static async uploadAttachment(req, res, next) {
        try {
            const service = new ODService(pool);
            const result = await service.uploadAttachment({
                user: req.user,
                id: req.params.id,
                file: req.file,
                type: req.query?.type,
            });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── PUT /od/:id/mentor-approval ──────────────────────────────────────────
    static async mentorApproval(req, res, next) {
        try {
            const service = new ODService(pool);
            const result = await service.mentorApproval({ id: req.params.id, status: req.body?.status });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── PUT /od/:id/hod-approval ─────────────────────────────────────────────
    static async hodApproval(req, res, next) {
        try {
            const service = new ODService(pool);
            const result = await service.hodApproval({ id: req.params.id, status: req.body?.status });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── PUT /od/:id/parent-confirmation ──────────────────────────────────────
    static async parentConfirmation(req, res, next) {
        try {
            const service = new ODService(pool);
            const result = await service.parentConfirmation({ id: req.params.id });
            res.json(result);
        } catch (err) { next(err); }
    }
}

module.exports = ODController;
