/**
 * OD Routes
 * GET  /api/v1/ods                          — list OD requests (scoped)
 * POST /api/v1/ods                          — student creates OD request
 * POST /api/v1/ods/:id/upload               — upload attachment for an OD
 * PUT  /api/v1/ods/:id/mentor-approval      — mentor approve/reject
 * PUT  /api/v1/ods/:id/hod-approval         — HOD approve/reject
 * PUT  /api/v1/ods/:id/parent-confirmation  — parent confirms
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { uploadODFile } = require('../middleware/upload.middleware');
const ODController = require('../controllers/od.controller');
const { authorizeRoles, SUPPORTED_ROLES } = require('../middleware/auth.middleware');

// ─── Routes ───────────────────────────────────────────────────────────────────
router.get('/', authorizeRoles(...SUPPORTED_ROLES), ODController.getODRequests);
router.post('/', authorizeRoles('student'), ODController.createOD);
router.post('/:id/upload', authorizeRoles('student'), uploadODFile.single('file'), ODController.uploadAttachment);
router.put('/:id/mentor-approval', authorizeRoles('mentor', 'hod', 'admin'), ODController.mentorApproval);
router.put('/:id/hod-approval', authorizeRoles('hod', 'cluster_hod', 'admin'), ODController.hodApproval);
router.put('/:id/parent-confirmation', authorizeRoles('parent'), ODController.parentConfirmation);

module.exports = router;
