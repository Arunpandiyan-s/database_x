/**
 * Audit Log Routes
 * GET /api/v1/audit  — list audit logs (admin / technical_director only)
 */

const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/audit.controller');
const { authorizeRoles } = require('../middleware/auth.middleware');

router.get('/', authorizeRoles('admin', 'technical_director'), AuditController.getLogs);

module.exports = router;
