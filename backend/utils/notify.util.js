const { pool } = require('./transaction.util');

/**
 * Insert a notification row for a given user.
 * Fire-and-forget: errors are logged but never propagate.
 */
async function notify(userId, message, type = 'info', client = null) {
    const db = client || pool;
    try {
        await db.query(
            `INSERT INTO notifications (user_id, message, type)
             VALUES ($1, $2, $3)`,
            [userId, message, type]
        );
    } catch (err) {
        console.error('[Notify] Failed to insert notification:', err.message);
    }
}

/**
 * Bulk-notify multiple users at once.
 */
async function notifyMany(userIds, message, type = 'info', client = null) {
    for (const uid of userIds) {
        await notify(uid, message, type, client);
    }
}

module.exports = { notify, notifyMany };
