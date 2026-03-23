const NotificationRepository = require('../repositories/notification.repository');

class NotificationService {
    constructor(db) {
        this.repo = new NotificationRepository(db);
    }

    mapNotification(row) {
        return {
            id: row.id,
            userId: row.user_id,
            message: row.message || '',
            read: !!row.read,
            type: row.type || 'info',
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
        };
    }

    async getNotifications({ userId, page = 1, limit = 30 }) {
        const p = parseInt(page);
        const l = parseInt(limit);
        const offset = (p - 1) * l;

        const [rows, unreadCount] = await Promise.all([
            this.repo.listForUser({ userId, limit: l, offset }),
            this.repo.countUnread(userId),
        ]);

        return {
            success: true,
            data: rows.map(r => this.mapNotification(r)),
            unreadCount,
            page: p,
            limit: l,
        };
    }

    async markRead({ userId, id }) {
        const updatedId = await this.repo.markRead({ id, userId });
        if (!updatedId) {
            const err = new Error('Notification not found');
            err.statusCode = 404;
            throw err;
        }
        return { success: true, message: 'Notification marked as read' };
    }

    async markAllRead({ userId }) {
        await this.repo.markAllRead(userId);
        return { success: true, message: 'All notifications marked as read' };
    }
}

module.exports = NotificationService;
