const FeedRepository = require('../repositories/feed.repository');
const { notifyMany } = require('../utils/notify.util');

// Feed workflow statuses:
// 'draft' → 'submitted_to_admin' → 'approved_by_admin' → 'published' | 'rejected'
// Admins/principals can directly publish (skip review).
// VPs can publish posts that are 'approved_by_admin'.

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
            authorEmail: row.author_email || '',
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
            studentName: row.student_name || undefined,
            department: row.department || undefined,
        };
    }

    // ─── Public campus feed (only published posts) ────────────────────────────

    async getFeed({ user, page = 1, limit = 20, type }) {
        const p = parseInt(page);
        const l = parseInt(limit);
        const offset = (p - 1) * l;

        const bypassCollegeScope = user.level >= 6;
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

    // ─── Admin/management: list all posts with status filter ──────────────────

    async listAllPosts({ user, page = 1, limit = 50, status, type }) {
        const p = parseInt(page);
        const l = parseInt(limit);
        const offset = (p - 1) * l;

        const bypassCollegeScope = user.level >= 6;
        const { rows, total } = await this.repo.listAllPosts({
            collegeId: user.collegeId,
            status,
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

    // ─── Create post ──────────────────────────────────────────────────────────

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

        // Determine initial status based on role:
        // VP finishes the chain → published
        // admin role can publish directly OR submit through workflow
        // principal submits for admin review
        let initialStatus = 'submitted_to_admin';
        if (['vice_principal'].includes(user.role)) {
            initialStatus = 'published';
        } else if (['admin', 'technical_director'].includes(user.role)) {
            initialStatus = 'submitted_to_admin'; // goes through approval
        }

        const post = await this.repo.createPost({
            title: title.trim(),
            content: content.trim(),
            type,
            authorId: user.userId || user.user_id,
            authorRole: user.role,
            studentName: studentName?.trim() || null,
            department: department?.trim() || null,
            collegeId: user.collegeId || null,
            status: initialStatus,
        });

        if (initialStatus === 'published' && user.collegeId) {
            this.repo.listActiveUsersInCollege(user.collegeId)
                .then(uids => notifyMany(uids, `New campus post: ${title.trim()}`, 'info'))
                .catch(() => { });
        }

        return {
            success: true,
            data: this.mapFeedPost(post),
            message: initialStatus === 'published'
                ? 'Post published to Campus Feed'
                : 'Post submitted for review',
        };
    }

    // ─── Approve a post (admin approves → forwards to VP for publishing) ───────

    async approvePost({ id, user }) {
        const allowedApprovers = ['admin', 'technical_director'];
        if (!allowedApprovers.includes(user.role)) {
            const err = new Error('Only Admin can approve posts.');
            err.statusCode = 403;
            throw err;
        }

        const updated = await this.repo.updatePostStatus(id, 'approved_by_admin');
        if (!updated) {
            const err = new Error('Post not found or already processed.');
            err.statusCode = 404;
            throw err;
        }
        return { success: true, data: this.mapFeedPost(updated), message: 'Post approved — forwarded to Vice Principal for publishing.' };
    }

    // ─── Reject a post ────────────────────────────────────────────────────────

    async rejectPost({ id, user }) {
        const allowedRejecters = ['admin', 'technical_director', 'vice_principal'];
        if (!allowedRejecters.includes(user.role)) {
            const err = new Error('You do not have permission to reject posts.');
            err.statusCode = 403;
            throw err;
        }

        const updated = await this.repo.updatePostStatus(id, 'rejected');
        if (!updated) {
            const err = new Error('Post not found or already processed.');
            err.statusCode = 404;
            throw err;
        }
        return { success: true, data: this.mapFeedPost(updated), message: 'Post rejected.' };
    }

    // ─── Publish a post (VP publishes approved posts) ─────────────────────────

    async publishPost({ id, user }) {
        const allowedPublishers = ['vice_principal', 'admin', 'technical_director'];
        if (!allowedPublishers.includes(user.role)) {
            const err = new Error('You do not have permission to publish posts.');
            err.statusCode = 403;
            throw err;
        }

        const updated = await this.repo.updatePostStatus(id, 'published');
        if (!updated) {
            const err = new Error('Post not found or already processed.');
            err.statusCode = 404;
            throw err;
        }

        if (user.collegeId) {
            this.repo.listActiveUsersInCollege(user.collegeId)
                .then(uids => notifyMany(uids, `New campus post: ${updated.title}`, 'info'))
                .catch(() => { });
        }

        return { success: true, data: this.mapFeedPost(updated), message: 'Post published to Campus Feed.' };
    }

    // ─── Delete post ──────────────────────────────────────────────────────────

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
