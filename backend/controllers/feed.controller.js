const { pool } = require('../utils/transaction.util');
const FeedService = require('../services/feed.service');

class FeedController {
    // ─── GET /feeds — public published feed ───────────────────────────────────
    static async getFeed(req, res, next) {
        try {
            const service = new FeedService(pool);
            const result = await service.getFeed({ user: req.user, ...req.query });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── GET /feeds/manage — admin view of all posts (with status filter) ─────
    static async listAllPosts(req, res, next) {
        try {
            const service = new FeedService(pool);
            const result = await service.listAllPosts({ user: req.user, ...req.query });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── POST /feeds — create post ────────────────────────────────────────────
    static async createPost(req, res, next) {
        try {
            const service = new FeedService(pool);
            const result = await service.createPost({ user: req.user, ...(req.body || {}) });
            res.status(201).json(result);
        } catch (err) { next(err); }
    }

    // ─── POST /feeds/:id/approve ──────────────────────────────────────────────
    static async approvePost(req, res, next) {
        try {
            const service = new FeedService(pool);
            const result = await service.approvePost({ id: req.params.id, user: req.user });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── POST /feeds/:id/reject ───────────────────────────────────────────────
    static async rejectPost(req, res, next) {
        try {
            const service = new FeedService(pool);
            const result = await service.rejectPost({ id: req.params.id, user: req.user });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── POST /feeds/:id/publish ──────────────────────────────────────────────
    static async publishPost(req, res, next) {
        try {
            const service = new FeedService(pool);
            const result = await service.publishPost({ id: req.params.id, user: req.user });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── DELETE /feeds/:id ────────────────────────────────────────────────────
    static async deletePost(req, res, next) {
        try {
            const service = new FeedService(pool);
            const result = await service.deletePost({ id: req.params.id });
            res.json(result);
        } catch (err) { next(err); }
    }
}

module.exports = FeedController;
