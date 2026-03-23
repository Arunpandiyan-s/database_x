const { pool } = require('../utils/transaction.util');

class ResultsRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async listByStudent(studentId) {
        const result = await this.db.query(
            `SELECT * FROM results WHERE student_id = $1 ORDER BY semester ASC`,
            [studentId]
        );
        return result.rows;
    }

    async parentHasMapping({ parentId, studentId }) {
        const mapping = await this.db.query(
            `SELECT id FROM parent_student_mapping
             WHERE parent_id = $1 AND student_id = $2 AND active = true`,
            [parentId, studentId]
        );
        return mapping.rows.length > 0;
    }

    async createResult({ studentId, semester, fileName, fileUrl, mentorId, collegeId }) {
        const result = await this.db.query(
            `INSERT INTO results (student_id, semester, file_name, file_url, mentor_id, college_id, uploaded_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             RETURNING *`,
            [studentId, parseInt(semester), fileName, fileUrl, mentorId, collegeId || null]
        );
        return result.rows[0];
    }

    async updateResultMeta({ id, semester, fileName }) {
        const result = await this.db.query(
            `UPDATE results
             SET semester   = COALESCE($1, semester),
                 file_name  = COALESCE($2, file_name),
                 updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [semester ? parseInt(semester) : null, fileName || null, id]
        );
        return result.rows[0] || null;
    }

    async deleteResult(id) {
        const result = await this.db.query(
            `DELETE FROM results WHERE id = $1 RETURNING file_url`,
            [id]
        );
        return result.rows[0]?.file_url || null;
    }

    async getFileById(id) {
        const result = await this.db.query(
            `SELECT file_url, file_name FROM results WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async getFileUrlById(id) {
        const result = await this.db.query(
            `SELECT file_url FROM results WHERE id = $1`,
            [id]
        );
        return result.rows[0]?.file_url || null;
    }
}

module.exports = ResultsRepository;
