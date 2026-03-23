const { pool } = require('../utils/transaction.util');

class SearchRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async searchStudents({ q, user }) {
        let studentQuery = `
            SELECT sp.student_id AS id, sp.name, sp.register_number,
                   sp.department, sp.year, sp.section, sp.status AS profile_status, u.email
            FROM student_profiles sp
            JOIN users u ON u.id = sp.student_id
            WHERE (LOWER(sp.name) LIKE $1 OR LOWER(sp.register_number) LIKE $1 OR LOWER(u.email) LIKE $1)
        `;
        const params = [q];

        if (user.role === 'mentor') {
            studentQuery += ` AND sp.mentor_id = $2`;
            params.push(user.userId);
        } else if (user.level < 6 && user.collegeId) {
            studentQuery += ` AND u.college_id = $2`;
            params.push(user.collegeId);
        }

        studentQuery += ` ORDER BY sp.name LIMIT 20`;
        const rows = await this.db.query(studentQuery, params);
        return rows.rows;
    }

    async searchStaff({ q, user }) {
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
        const rows = await this.db.query(staffQuery, params);
        return rows.rows;
    }
}

module.exports = SearchRepository;
