const { pool } = require('../utils/transaction.util');
const NotificationService = require('../services/notification.service');

class NotificationController {
    // ─── GET /notifications ───────────────────────────────────────────────────
    static async getNotifications(req, res, next) {
        try {
            const service = new NotificationService(pool);
            const result = await service.getNotifications({ userId: req.user.userId, ...req.query });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── PUT /notifications/:id/read ─────────────────────────────────────────
    static async markRead(req, res, next) {
        try {
            const service = new NotificationService(pool);
            const result = await service.markRead({ userId: req.user.userId, id: req.params.id });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── PUT /notifications/read-all ─────────────────────────────────────────
    static async markAllRead(req, res, next) {
        try {
            const service = new NotificationService(pool);
            const result = await service.markAllRead({ userId: req.user.userId });
            res.json(result);
        } catch (err) { next(err); }
    }
}

module.exports = NotificationController;
