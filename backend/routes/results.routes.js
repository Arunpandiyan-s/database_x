/**
 * Results Routes
 * GET    /api/v1/results/student/:studentId  — all results for a given student
 * GET    /api/v1/results/me                  — student's own results
 * POST   /api/v1/results/upload              — mentor/admin uploads PDF
 * PUT    /api/v1/results/:id                 — edit result metadata
 * DELETE /api/v1/results/:id                 — delete result
 * GET    /api/v1/results/:id/download        — serve file for download
 * GET    /api/v1/results/:id/view            — serve file for inline view
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ResultsController = require('../controllers/results.controller');
const { authorizeRoles } = require('../middleware/auth.middleware');

// ─── Multer Upload for Result PDFs ────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'results');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}${ext}`);
    },
});
const fileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed for result uploads.'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Routes ───────────────────────────────────────────────────────────────────
router.get('/me', ResultsController.getMyResults);
router.get('/student/:studentId', authorizeRoles('mentor', 'hod', 'cluster_hod', 'principal', 'technical_director', 'admin'), ResultsController.getStudentResults);
router.post('/upload', authorizeRoles('mentor', 'hod', 'admin'), upload.single('file'), ResultsController.uploadResult);
router.put('/:id', authorizeRoles('mentor', 'hod', 'admin'), ResultsController.editResult);
router.delete('/:id', authorizeRoles('mentor', 'hod', 'admin'), ResultsController.deleteResult);
router.get('/:id/download', ResultsController.downloadResult);
router.get('/:id/view', ResultsController.viewResult);

module.exports = router;
