const { pool } = require('../utils/transaction.util');
const ResultsService = require('../services/results.service');

class ResultsController {
    // ─── GET /results/me ──────────────────────────────────────────────────────
    static async getMyResults(req, res, next) {
        try {
            const service = new ResultsService(pool);
            const result = await service.getMyResults({ userId: req.user.userId });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── GET /results/student/:studentId ─────────────────────────────────────
    static async getStudentResults(req, res, next) {
        try {
            const service = new ResultsService(pool);
            const result = await service.getStudentResults({ viewer: req.user, studentId: req.params.studentId });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── POST /results/upload ─────────────────────────────────────────────────
    static async uploadResult(req, res, next) {
        try {
            const service = new ResultsService(pool);
            const result = await service.uploadResult({ uploader: req.user, file: req.file, body: req.body });
            res.status(201).json(result);
        } catch (err) { next(err); }
    }

    // ─── PUT /results/:id ─────────────────────────────────────────────────────
    static async editResult(req, res, next) {
        try {
            const service = new ResultsService(pool);
            const result = await service.editResult({ id: req.params.id, body: req.body });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── DELETE /results/:id ──────────────────────────────────────────────────
    static async deleteResult(req, res, next) {
        try {
            const service = new ResultsService(pool);
            const result = await service.deleteResult({ id: req.params.id });
            res.json(result);
        } catch (err) { next(err); }
    }

    // ─── GET /results/:id/download ────────────────────────────────────────────
    static async downloadResult(req, res, next) {
        try {
            const service = new ResultsService(pool);
            const { filePath, fileName } = await service.getDownload({ id: req.params.id });
            res.download(filePath, fileName);
        } catch (err) { next(err); }
    }

    // ─── GET /results/:id/view ────────────────────────────────────────────────
    static async viewResult(req, res, next) {
        try {
            const service = new ResultsService(pool);
            const { filePath } = await service.getView({ id: req.params.id });
            res.sendFile(filePath);
        } catch (err) { next(err); }
    }
}

module.exports = ResultsController;
