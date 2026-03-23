const { pool } = require('../utils/transaction.util');
const DashboardService = require('../services/dashboard.service');

class DashboardController {
    static async getMetrics(req, res, next) {
        try {
            const service = new DashboardService(pool);
            const result = await service.getMetrics({ user: req.user });
            res.json(result);
        } catch (err) { next(err); }
    }
}

module.exports = DashboardController;
