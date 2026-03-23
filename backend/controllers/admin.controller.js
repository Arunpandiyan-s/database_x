const { pool } = require('../utils/transaction.util');
const AdminService = require('../services/admin.service');

class AdminController {
    // ─── POST /api/admin/invite-student ──────────────────────────────
    static async inviteStudent(req, res, next) {
        try {
            const service = new AdminService(pool);
            const result = await service.inviteStudent({
                actor: req.user,
                studentEmail: req.body?.studentEmail,
                registerNumber: req.body?.registerNumber,
            });
            return res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = AdminController;
