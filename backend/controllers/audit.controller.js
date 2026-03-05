const { pool } = require('../utils/transaction.util');

class AuditController {

    // ─── GET /audit ───────────────────────────────────────────────────────────
    // Real audit_logs schema:
    //   id, actor_id, college_id, role, action, entity_type, entity_id, metadata, timestamp, created_at
    static async getLogs(req, res, next) {
        try {
            const { page = 1, limit = 50, action, userId } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const user = req.user;

            const conditions = [];
            const params = [];
            let idx = 1;

            // College isolation
            if (user.level < 7 && user.collegeId) {
                conditions.push(`al.college_id = $${idx++}`);
                params.push(user.collegeId);
            }
            if (action) {
                conditions.push(`al.action ILIKE $${idx++}`);
                params.push(`%${action}%`);
            }
            if (userId) {
                conditions.push(`al.actor_id = $${idx++}`);
                params.push(userId);
            }

            const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

            const [rows, count] = await Promise.all([
                pool.query(
                    `SELECT al.*, u.email AS actor_email
                     FROM audit_logs al
                     LEFT JOIN users u ON u.id = al.actor_id
                     ${whereClause}
                     ORDER BY al.timestamp DESC
                     LIMIT $${idx++} OFFSET $${idx++}`,
                    [...params, parseInt(limit), offset]
                ),
                pool.query(
                    `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
                    params
                )
            ]);

            res.json({
                success: true,
                data: rows.rows,
                total: parseInt(count.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit),
            });
        } catch (err) { next(err); }
    }
}

module.exports = AuditController;
