const express = require('express');
const router = express.Router();
const { uploadHierarchyFile, formatUploadResponse } = require('../middleware/upload.middleware');
const { authorizeRoles } = require('../middleware/auth.middleware');

/**
 * Hierarchy Routes
 * POST /api/v1/hierarchy/upload — admin uploads hierarchy configuration docs
 */

// We just mount the middleware then the formatter. The formatter will return the requested `{ success: true, fileUrl }` json.
router.post('/upload', authorizeRoles('admin', 'technical_director'), uploadHierarchyFile.single('file'), formatUploadResponse);

module.exports = router;
