const { pool } = require('../utils/transaction.util');
const { notifyMany } = require('../utils/notify.util');

class FeedController {

    // ─── GET /feed ─────────────────────────────────────────────────────────────
    static async getFeed(req, res, next) {
        try {
            const { page = 1, limit = 20, type } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const user = req.user;

            const conditions = [`fp.status = 'published'`];
            const params = [];
            let idx = 1;

            // Scope to college unless admin/technical_director
            if (user.level < 6 && user.collegeId) {
                conditions.push(`(fp.college_id = $${idx++} OR fp.college_id IS NULL)`);
                params.push(user.collegeId);
            }

            if (type && ['announcement', 'achievement'].includes(type)) {
                conditions.push(`fp.type = $${idx++}`);
                params.push(type);
            }

            const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

            const [rows, count] = await Promise.all([
                pool.query(
                    `SELECT fp.* FROM feed_posts fp
                     ${whereClause}
                     ORDER BY fp.created_at DESC
                     LIMIT $${idx++} OFFSET $${idx++}`,
                    [...params, parseInt(limit), offset]
                ),
                pool.query(
                    `SELECT COUNT(*) FROM feed_posts fp ${whereClause}`,
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

    // ─── POST /feed ────────────────────────────────────────────────────────────
    static async createPost(req, res, next) {
        try {
            const { title, content, type = 'announcement', studentName, department } = req.body;

            if (!title?.trim() || !content?.trim()) {
                return res.status(400).json({ success: false, message: 'Title and content are required' });
            }
            if (type === 'achievement' && !studentName?.trim()) {
                return res.status(400).json({ success: false, message: 'Student name is required for achievement posts' });
            }

            const result = await pool.query(
                `INSERT INTO feed_posts (title, content, type, author_id, author_role, student_name, department, college_id, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'published')
                 RETURNING *`,
                [
                    title.trim(),
                    content.trim(),
                    type,
                    req.user.userId,
                    req.user.role,
                    studentName?.trim() || null,
                    department?.trim() || null,
                    req.user.collegeId || null,
                ]
            );

            const post = result.rows[0];

            // Notify all users in the college about the new post (fire-and-forget)
            pool.query(
                `SELECT id FROM users WHERE college_id = $1 AND status = 'ACTIVE' LIMIT 100`,
                [req.user.collegeId]
            ).then(async ({ rows }) => {
                const uids = rows.map(r => r.id);
                await notifyMany(uids, `New campus post: ${title.trim()}`, 'info');
            }).catch(() => { });

            res.status(201).json({ success: true, data: post, message: 'Post published to Campus Feed' });
        } catch (err) { next(err); }
    }

    // ─── DELETE /feed/:id ─────────────────────────────────────────────────────
    static async deletePost(req, res, next) {
        try {
            const result = await pool.query(
                `UPDATE feed_posts SET status = 'archived', updated_at = NOW()
                 WHERE id = $1 AND status != 'archived'
                 RETURNING id`,
                [req.params.id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Post not found or already deleted' });
            }
            res.json({ success: true, message: 'Post deleted' });
        } catch (err) { next(err); }
    }
}

module.exports = FeedController;
