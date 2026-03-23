const { pool } = require('../utils/transaction.util');
const FeedService = require('../services/feed.service');

class FeedController {
    // ─── GET /feed ─────────────────────────────────────────────────────────────
    static async getFeed(req, res, next) {
        try {
            const service = new FeedService(pool);
            const result = await service.getFeed({ user: req.user, ...req.query });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── POST /feed ────────────────────────────────────────────────────────────
    static async createPost(req, res, next) {
        try {
            const service = new FeedService(pool);
            const result = await service.createPost({ user: req.user, ...(req.body || {}) });
            res.status(201).json(result);
        } catch (err) { next(err); }
    }

    // ─── DELETE /feed/:id ─────────────────────────────────────────────────────
    static async deletePost(req, res, next) {
        try {
            const service = new FeedService(pool);
            const result = await service.deletePost({ id: req.params.id });
            res.json(result);
        } catch (err) { next(err); }
    }
}

module.exports = FeedController;
