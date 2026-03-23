const { pool } = require('../utils/transaction.util');

class NotificationRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async listForUser({ userId, limit, offset }) {
        const r = await this.db.query(
            `SELECT * FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        return r.rows;
    }

    async countUnread(userId) {
        const r = await this.db.query(
            `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false`,
            [userId]
        );
        return parseInt(r.rows[0].count);
    }

    async markRead({ id, userId }) {
        const r = await this.db.query(
            `UPDATE notifications SET read = true
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [id, userId]
        );
        return r.rows[0]?.id || null;
    }

    async markAllRead(userId) {
        await this.db.query(`UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`, [userId]);
    }
}

module.exports = NotificationRepository;
