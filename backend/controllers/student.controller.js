const StudentService = require('../services/student.service');
const { pool } = require('../utils/transaction.util');

class StudentController {
    static async getMe(req, res, next) {
        try {
            const service = new StudentService(pool);
            const data = await service.getMyProfile(req.user.userId);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    static async putMe(req, res, next) {
        try {
            const service = new StudentService(pool);
            const data = await service.saveMyProfile(req.user.userId, req.body || {});
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    static async submit(req, res, next) {
        try {
            const service = new StudentService(pool);
            const data = await service.submitProfile(req.user.userId);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    static async requestEdit(req, res, next) {
        try {
            const service = new StudentService(pool);
            const data = await service.requestEdit(req.user.userId);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    static async uploadDocument(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded or file rejected by filter.' });
            }

            const docType = req.params.docType;
            const folderName = require('path').basename(req.file.destination);
            const fileUrl = `/uploads/${folderName}/${req.file.filename}`;

            const ALLOWED_DOC_TYPES = ['community', 'aadhaar', 'marksheet10', 'marksheet12', 'firstgrad', 'transfer', 'allotment', 'photo'];
            if (!ALLOWED_DOC_TYPES.includes(docType)) {
                require('fs').unlinkSync(req.file.path);
                return res.status(400).json({ success: false, message: `Unknown document type: ${docType}` });
            }

            const service = new StudentService(pool);
            const data = await service.uploadDocument({ userId: req.user.userId, docType, fileUrl });
            return res.status(200).json(data);
        } catch (err) {
            if (req.file?.path) {
                require('fs').unlinkSync(req.file.path);
            }
            next(err);
        }
    }

    static async list(req, res, next) {
        try {
            const service = new StudentService(pool);
            const data = await service.listStudents(req.query || {});
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    static async getById(req, res, next) {
        try {
            const service = new StudentService(pool);
            const data = await service.getStudentById(req.params.id);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    static async approveEdit(req, res, next) {
        try {
            const service = new StudentService(pool);
            const data = await service.approveEdit(req.params.id);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    static async quotaRequest(req, res, next) {
        try {
            const service = new StudentService(pool);
            const data = await service.quotaRequest(req.params.id);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    static async scholarshipRequest(req, res, next) {
        try {
            const service = new StudentService(pool);
            const data = await service.scholarshipRequest(req.params.id);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = StudentController;
