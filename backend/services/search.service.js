const SearchRepository = require('../repositories/search.repository');

class SearchService {
    constructor(db) {
        this.repo = new SearchRepository(db);
    }

    async search({ query, scope = 'all', user }) {
        if (!query || query.trim().length < 2) {
            const err = new Error('Query must be at least 2 characters');
            err.statusCode = 400;
            throw err;
        }

        const q = `%${query.trim().toLowerCase()}%`;
        const results = { students: [], staff: [] };

        if (scope === 'all' || scope === 'students') {
            results.students = await this.repo.searchStudents({ q, user });
        }

        if ((scope === 'all' || scope === 'staff') && user.level >= 2) {
            results.staff = await this.repo.searchStaff({ q, user });
        }

        return { success: true, data: results, query: query.trim(), scope };
    }
}

module.exports = SearchService;
