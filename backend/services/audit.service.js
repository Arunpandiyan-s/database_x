const AuditRepository = require('../repositories/audit.repository');

class AuditService {
    constructor(db) {
        this.repo = new AuditRepository(db);
    }

    mapAudit(row) {
        if (!row) return null;
        return {
            id: row.id,
            userId: row.actor_id || '',
            userName: row.actor_email || '',
            action: row.action || '',
            details: row.metadata ? JSON.stringify(row.metadata) : '',
            createdAt: row.timestamp ? new Date(row.timestamp).toISOString() : '',
        };
    }

    async getLogs({ user, query }) {
        const { page = 1, limit = 50, action, userId } = query || {};
        const p = parseInt(page);
        const l = parseInt(limit);
        const offset = (p - 1) * l;

        const { rows, total } = await this.repo.listLogs({
            user,
            action,
            userId,
            limit: l,
            offset,
        });

        return {
            success: true,
            data: rows.map(r => this.mapAudit(r)),
            total,
            page: p,
            limit: l,
        };
    }
}

module.exports = AuditService;
