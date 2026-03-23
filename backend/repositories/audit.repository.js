const { pool } = require('../utils/transaction.util');

class AuditRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async listLogs({ user, action, userId, limit, offset }) {
        const conditions = [];
        const params = [];
        let idx = 1;

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

        const rows = await this.db.query(
            `SELECT al.*, u.email AS actor_email
             FROM audit_logs al
             LEFT JOIN users u ON u.id = al.actor_id
             ${whereClause}
             ORDER BY al.timestamp DESC
             LIMIT $${idx++} OFFSET $${idx++}`,
            [...params, limit, offset]
        );

        const count = await this.db.query(
            `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
            params
        );

        return { rows: rows.rows, total: parseInt(count.rows[0].count) };
    }
}

module.exports = AuditRepository;
