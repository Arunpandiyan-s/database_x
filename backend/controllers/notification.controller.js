const { pool } = require('../utils/transaction.util');

class NotificationController {

    // ─── GET /notifications ───────────────────────────────────────────────────
    static async getNotifications(req, res, next) {
        try {
            const { page = 1, limit = 30 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);

            const [rows, count] = await Promise.all([
                pool.query(
                    `SELECT * FROM notifications
                     WHERE user_id = $1
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3`,
                    [req.user.userId, parseInt(limit), offset]
                ),
                pool.query(
                    `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false`,
                    [req.user.userId]
                )
            ]);

            res.json({
                success: true,
                data: rows.rows,
                unreadCount: parseInt(count.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit),
            });
        } catch (err) { next(err); }
    }

    // ─── PUT /notifications/:id/read ─────────────────────────────────────────
    static async markRead(req, res, next) {
        try {
            const result = await pool.query(
                `UPDATE notifications SET read = true
                 WHERE id = $1 AND user_id = $2
                 RETURNING id`,
                [req.params.id, req.user.userId]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Notification not found' });
            }
            res.json({ success: true, message: 'Notification marked as read' });
        } catch (err) { next(err); }
    }

    // ─── PUT /notifications/read-all ─────────────────────────────────────────
    static async markAllRead(req, res, next) {
        try {
            await pool.query(
                `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
                [req.user.userId]
            );
            res.json({ success: true, message: 'All notifications marked as read' });
        } catch (err) { next(err); }
    }
}

module.exports = NotificationController;
