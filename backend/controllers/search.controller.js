const { pool } = require('../utils/transaction.util');
const SearchService = require('../services/search.service');

class SearchController {
    // ─── GET /search?query=&scope= ────────────────────────────────────────────
    static async search(req, res, next) {
        try {
            const service = new SearchService(pool);
            const result = await service.search({
                query: req.query?.query,
                scope: req.query?.scope,
                user: req.user,
            });
            res.json(result);
        } catch (err) { next(err); }
    }
}

module.exports = SearchController;
