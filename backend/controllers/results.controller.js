const { pool } = require('../utils/transaction.util');
const { notify } = require('../utils/notify.util');
const path = require('path');
const fs = require('fs');

class ResultsController {

    // ─── GET /results/me ──────────────────────────────────────────────────────
    static async getMyResults(req, res, next) {
        try {
            const result = await pool.query(
                `SELECT * FROM results WHERE student_id = $1 ORDER BY semester ASC`,
                [req.user.userId]
            );
            res.json({ success: true, data: result.rows });
        } catch (err) { next(err); }
    }

    // ─── GET /results/student/:studentId ─────────────────────────────────────
    static async getStudentResults(req, res, next) {
        try {
            const result = await pool.query(
                `SELECT * FROM results WHERE student_id = $1 ORDER BY semester ASC`,
                [req.params.studentId]
            );
            res.json({ success: true, data: result.rows });
        } catch (err) { next(err); }
    }

    // ─── POST /results/upload ─────────────────────────────────────────────────
    static async uploadResult(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Please select a PDF file' });
            }

            const { studentId, semester } = req.body;
            if (!studentId || !semester) {
                // Clean up orphaned file
                if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(400).json({ success: false, message: 'studentId and semester are required' });
            }

            const relativePath = path.relative(
                path.join(__dirname, '..'),
                req.file.path
            ).replace(/\\/g, '/');

            const result = await pool.query(
                `INSERT INTO results (student_id, semester, file_name, file_url, mentor_id, college_id, uploaded_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())
                 RETURNING *`,
                [
                    studentId,
                    parseInt(semester),
                    req.file.originalname,
                    relativePath,
                    req.user.userId,
                    req.user.collegeId || null,
                ]
            );

            await notify(studentId, `Semester ${semester} result uploaded by your mentor`, 'info');

            res.status(201).json({ success: true, data: result.rows[0], message: 'Result uploaded' });
        } catch (err) {
            if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            next(err);
        }
    }

    // ─── PUT /results/:id ─────────────────────────────────────────────────────
    static async editResult(req, res, next) {
        try {
            const { semester, fileName } = req.body;
            const result = await pool.query(
                `UPDATE results
                 SET semester   = COALESCE($1, semester),
                     file_name  = COALESCE($2, file_name),
                     updated_at = NOW()
                 WHERE id = $3
                 RETURNING *`,
                [semester ? parseInt(semester) : null, fileName || null, req.params.id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Result not found' });
            }
            res.json({ success: true, data: result.rows[0], message: 'Result updated' });
        } catch (err) { next(err); }
    }

    // ─── DELETE /results/:id ──────────────────────────────────────────────────
    static async deleteResult(req, res, next) {
        try {
            const result = await pool.query(
                `DELETE FROM results WHERE id = $1 RETURNING file_url`,
                [req.params.id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Result not found' });
            }
            // Clean up file from disk
            const fileUrl = result.rows[0].file_url;
            if (fileUrl) {
                const filePath = path.join(__dirname, '..', fileUrl);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
            res.json({ success: true, message: 'Result deleted' });
        } catch (err) { next(err); }
    }

    // ─── GET /results/:id/download ────────────────────────────────────────────
    static async downloadResult(req, res, next) {
        try {
            const result = await pool.query(
                `SELECT file_url, file_name FROM results WHERE id = $1`,
                [req.params.id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Result not found' });
            }
            const { file_url, file_name } = result.rows[0];
            const filePath = path.join(__dirname, '..', file_url);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ success: false, message: 'File not found on disk' });
            }
            res.download(filePath, file_name || 'result.pdf');
        } catch (err) { next(err); }
    }

    // ─── GET /results/:id/view ────────────────────────────────────────────────
    static async viewResult(req, res, next) {
        try {
            const result = await pool.query(
                `SELECT file_url FROM results WHERE id = $1`,
                [req.params.id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Result not found' });
            }
            const filePath = path.join(__dirname, '..', result.rows[0].file_url);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ success: false, message: 'File not found on disk' });
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            fs.createReadStream(filePath).pipe(res);
        } catch (err) { next(err); }
    }
}

module.exports = ResultsController;
