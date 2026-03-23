const { pool } = require('../utils/transaction.util');
const AuditService = require('../services/audit.service');

class AuditController {
    static async getLogs(req, res, next) {
        try {
            const service = new AuditService(pool);
            const result = await service.getLogs({ user: req.user, query: req.query });
            res.json(result);
        } catch (err) { next(err); }
    }
}

module.exports = AuditController;
