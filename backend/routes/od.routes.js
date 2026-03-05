/**
 * OD Routes
 * GET  /api/v1/od                          — list OD requests (scoped)
 * POST /api/v1/od                          — student creates OD request
 * POST /api/v1/od/:id/upload               — upload attachment for an OD
 * PUT  /api/v1/od/:id/mentor-approval      — mentor approve/reject
 * PUT  /api/v1/od/:id/hod-approval         — HOD approve/reject
 * PUT  /api/v1/od/:id/parent-confirmation  — parent confirms
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ODController = require('../controllers/od.controller');
const { authorizeRoles } = require('../middleware/auth.middleware');

// ─── Multer Upload for OD attachments ────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'od');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}${ext}`);
    },
});
const fileFilter = (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed.'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Routes ───────────────────────────────────────────────────────────────────
router.get('/', ODController.getODRequests);
router.post('/', authorizeRoles('student'), ODController.createOD);
router.post('/:id/upload', upload.single('file'), ODController.uploadAttachment);
router.put('/:id/mentor-approval', authorizeRoles('mentor', 'hod', 'admin'), ODController.mentorApproval);
router.put('/:id/hod-approval', authorizeRoles('hod', 'cluster_hod', 'admin'), ODController.hodApproval);
router.put('/:id/parent-confirmation', authorizeRoles('parent'), ODController.parentConfirmation);

module.exports = router;
