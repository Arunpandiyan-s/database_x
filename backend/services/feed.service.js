const FeedRepository = require('../repositories/feed.repository');
const { notifyMany } = require('../utils/notify.util');

class FeedService {
    constructor(db) {
        this.repo = new FeedRepository(db);
    }

    mapFeedPost(row) {
        return {
            id: row.id,
            title: row.title || '',
            content: row.content || '',
            type: row.type || 'announcement',
            status: row.status || 'draft',
            authorRole: row.author_role || '',
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
            studentName: row.student_name || undefined,
            department: row.department || undefined,
        };
    }

    async getFeed({ user, page = 1, limit = 20, type }) {
        const p = parseInt(page);
        const l = parseInt(limit);
        const offset = (p - 1) * l;

        const bypassCollegeScope = user.level >= 6; // admin/technical_director
        const { rows, total } = await this.repo.listPublished({
            collegeId: user.collegeId,
            includeGlobal: true,
            type,
            limit: l,
            offset,
            bypassCollegeScope,
        });

        return {
            success: true,
            data: rows.map(r => this.mapFeedPost(r)),
            total,
            page: p,
            limit: l,
        };
    }

    async createPost({ user, title, content, type = 'announcement', studentName, department }) {
        if (!title?.trim() || !content?.trim()) {
            const err = new Error('Title and content are required');
            err.statusCode = 400;
            throw err;
        }
        if (type === 'achievement' && !studentName?.trim()) {
            const err = new Error('Student name is required for achievement posts');
            err.statusCode = 400;
            throw err;
        }

        const post = await this.repo.createPost({
            title: title.trim(),
            content: content.trim(),
            type,
            authorId: user.userId,
            authorRole: user.role,
            studentName: studentName?.trim() || null,
            department: department?.trim() || null,
            collegeId: user.collegeId || null,
        });

        if (user.collegeId) {
            this.repo.listActiveUsersInCollege(user.collegeId)
                .then(uids => notifyMany(uids, `New campus post: ${title.trim()}`, 'info'))
                .catch(() => { });
        }

        return { success: true, data: this.mapFeedPost(post), message: 'Post published to Campus Feed' };
    }

    async deletePost({ id }) {
        const archivedId = await this.repo.archivePost(id);
        if (!archivedId) {
            const err = new Error('Post not found or already deleted');
            err.statusCode = 404;
            throw err;
        }
        return { success: true, message: 'Post deleted' };
    }
}

module.exports = FeedService;
