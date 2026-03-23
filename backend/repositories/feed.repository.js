const { pool } = require('../utils/transaction.util');

class FeedRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async listPublished({ collegeId, includeGlobal = true, type, limit, offset, bypassCollegeScope }) {
        const conditions = [`fp.status = 'published'`];
        const params = [];
        let idx = 1;

        if (!bypassCollegeScope && collegeId) {
            conditions.push(`(fp.college_id = $${idx++} OR ${includeGlobal ? 'fp.college_id IS NULL' : 'false'})`);
            params.push(collegeId);
        }

        if (type && ['announcement', 'achievement'].includes(type)) {
            conditions.push(`fp.type = $${idx++}`);
            params.push(type);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const rows = await this.db.query(
            `SELECT fp.* FROM feed_posts fp
             ${whereClause}
             ORDER BY fp.created_at DESC
             LIMIT $${idx++} OFFSET $${idx++}`,
            [...params, limit, offset]
        );

        const count = await this.db.query(
            `SELECT COUNT(*) FROM feed_posts fp ${whereClause}`,
            params
        );

        return { rows: rows.rows, total: parseInt(count.rows[0].count) };
    }

    async createPost({ title, content, type, authorId, authorRole, studentName, department, collegeId }) {
        const r = await this.db.query(
            `INSERT INTO feed_posts (title, content, type, author_id, author_role, student_name, department, college_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'published')
             RETURNING *`,
            [title, content, type, authorId, authorRole, studentName, department, collegeId]
        );
        return r.rows[0];
    }

    async archivePost(id) {
        const r = await this.db.query(
            `UPDATE feed_posts SET status = 'archived', updated_at = NOW()
             WHERE id = $1 AND status != 'archived'
             RETURNING id`,
            [id]
        );
        return r.rows[0]?.id || null;
    }

    async listActiveUsersInCollege(collegeId) {
        const r = await this.db.query(
            `SELECT id FROM users WHERE college_id = $1 AND status = 'ACTIVE' LIMIT 100`,
            [collegeId]
        );
        return r.rows.map(x => x.id);
    }
}

module.exports = FeedRepository;
