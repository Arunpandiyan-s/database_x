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
const { uploadResultFile } = require('../middleware/upload.middleware');
const ResultsController = require('../controllers/results.controller');
const { authorizeRoles } = require('../middleware/auth.middleware');

// ─── Routes ───────────────────────────────────────────────────────────────────
router.get('/me', ResultsController.getMyResults);
router.get('/student/:studentId', authorizeRoles('mentor', 'hod', 'cluster_hod', 'principal', 'technical_director', 'admin', 'parent'), ResultsController.getStudentResults);
router.post('/upload', authorizeRoles('mentor', 'hod', 'admin'), uploadResultFile.single('file'), ResultsController.uploadResult);
router.put('/:id', authorizeRoles('mentor', 'hod', 'admin'), ResultsController.editResult);
router.delete('/:id', authorizeRoles('mentor', 'hod', 'admin'), ResultsController.deleteResult);
router.get('/:id/download', ResultsController.downloadResult);
router.get('/:id/view', ResultsController.viewResult);

module.exports = router;
