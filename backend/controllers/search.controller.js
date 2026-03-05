const { pool } = require('../utils/transaction.util');

class SearchController {

    // ─── GET /search?query=&scope= ────────────────────────────────────────────
    static async search(req, res, next) {
        try {
            const { query, scope = 'all' } = req.query;
            if (!query || query.trim().length < 2) {
                return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
            }
            const q = `%${query.trim().toLowerCase()}%`;
            const user = req.user;
            const results = { students: [], staff: [] };

            // ── Students ───────────────────────────────────────────────────────
            if (scope === 'all' || scope === 'students') {
                let studentQuery = `
                    SELECT sp.student_id AS id, sp.name, sp.register_number,
                           sp.department, sp.year, sp.section, sp.status AS profile_status, u.email
                    FROM student_profiles sp
                    JOIN users u ON u.id = sp.student_id
                    WHERE (LOWER(sp.name) LIKE $1 OR LOWER(sp.register_number) LIKE $1 OR LOWER(u.email) LIKE $1)
                `;
                const params = [q];

                // Scope: mentor can only search their own students
                if (user.role === 'mentor') {
                    studentQuery += ` AND sp.mentor_id = $2`;
                    params.push(user.userId);
                } else if (user.level < 6 && user.collegeId) {
                    // College isolation for non-admin
                    studentQuery += ` AND u.college_id = $2`;
                    params.push(user.collegeId);
                }

                studentQuery += ` ORDER BY sp.name LIMIT 20`;
                const rows = await pool.query(studentQuery, params);
                results.students = rows.rows;
            }

            // ── Staff ──────────────────────────────────────────────────────────
            if ((scope === 'all' || scope === 'staff') && user.level >= 2) {
                let staffQuery = `
                    SELECT u.id, u.email, r.name AS role, u.college_id
                    FROM users u
                    JOIN roles r ON r.id = u.role_id
                    WHERE u.status = 'ACTIVE'
                      AND r.name != 'student'
                      AND (LOWER(u.email) LIKE $1)
                `;
                const params = [q];

                if (user.level < 6 && user.collegeId) {
                    staffQuery += ` AND u.college_id = $2`;
                    params.push(user.collegeId);
                }

                staffQuery += ` ORDER BY u.email LIMIT 20`;
                const rows = await pool.query(staffQuery, params);
                results.staff = rows.rows;
            }

            res.json({ success: true, data: results, query: query.trim(), scope });
        } catch (err) { next(err); }
    }
}

module.exports = SearchController;
