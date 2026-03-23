const ResultsRepository = require('../repositories/results.repository');
const { notify } = require('../utils/notify.util');
const path = require('path');
const fs = require('fs');

class ResultsService {
    constructor(db) {
        this.repo = new ResultsRepository(db);
    }

    mapResult(row) {
        if (!row) return null;
        return {
            id: row.id,
            studentId: row.student_id,
            semester: row.semester,
            fileName: row.file_name || '',
            uploadDate: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : '',
            fileUrl: row.file_url || '',
        };
    }

    async getMyResults({ userId }) {
        const rows = await this.repo.listByStudent(userId);
        return { success: true, data: rows.map(r => this.mapResult(r)) };
    }

    async getStudentResults({ viewer, studentId }) {
        if (viewer.role === 'parent') {
            const ok = await this.repo.parentHasMapping({ parentId: viewer.userId, studentId });
            if (!ok) {
                const err = new Error('Permission denied: Not linked to this student');
                err.statusCode = 403;
                throw err;
            }
        }
        const rows = await this.repo.listByStudent(studentId);
        return { success: true, data: rows.map(r => this.mapResult(r)) };
    }

    async uploadResult({ uploader, file, body }) {
        if (!file) {
            const err = new Error('Please select a PDF file');
            err.statusCode = 400;
            throw err;
        }

        const { studentId, semester } = body || {};
        if (!studentId || !semester) {
            if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
            const err = new Error('studentId and semester are required');
            err.statusCode = 400;
            throw err;
        }

        const folderName = path.basename(file.destination);
        const fileUrl = `/uploads/${folderName}/${file.filename}`;
        const dbPath = `uploads/${folderName}/${file.filename}`;

        try {
            const created = await this.repo.createResult({
                studentId,
                semester,
                fileName: file.originalname,
                fileUrl: dbPath,
                mentorId: uploader.userId,
                collegeId: uploader.collegeId,
            });

            await notify(studentId, `Semester ${semester} result uploaded by your mentor`, 'info');

            return {
                success: true,
                fileUrl,
                data: this.mapResult(created),
                message: 'Result uploaded',
            };
        } catch (err) {
            if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
            throw err;
        }
    }

    async editResult({ id, body }) {
        const { semester, fileName } = body || {};
        const updated = await this.repo.updateResultMeta({ id, semester, fileName });
        if (!updated) {
            const err = new Error('Result not found');
            err.statusCode = 404;
            throw err;
        }
        return { success: true, data: this.mapResult(updated), message: 'Result updated' };
    }

    async deleteResult({ id }) {
        const fileUrl = await this.repo.deleteResult(id);
        if (!fileUrl) {
            const err = new Error('Result not found');
            err.statusCode = 404;
            throw err;
        }

        if (fileUrl) {
            const filePath = path.join(__dirname, '..', fileUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        return { success: true, message: 'Result deleted' };
    }

    async getDownload({ id }) {
        const file = await this.repo.getFileById(id);
        if (!file) {
            const err = new Error('Result not found');
            err.statusCode = 404;
            throw err;
        }

        const filePath = path.join(__dirname, '..', file.file_url);
        if (!fs.existsSync(filePath)) {
            const err = new Error('File not found on disk');
            err.statusCode = 404;
            throw err;
        }

        return { filePath, fileName: file.file_name || 'result.pdf' };
    }

    async getView({ id }) {
        const fileUrl = await this.repo.getFileUrlById(id);
        if (!fileUrl) {
            const err = new Error('Result not found');
            err.statusCode = 404;
            throw err;
        }

        const filePath = path.join(__dirname, '..', fileUrl);
        if (!fs.existsSync(filePath)) {
            const err = new Error('File not found on disk');
            err.statusCode = 404;
            throw err;
        }

        return { filePath };
    }
}

module.exports = ResultsService;
