/**
 * Dashboard Routes
 * GET /api/v1/dashboard/metrics — role-aware ERP metrics
 */

const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const { authorizeRoles, SUPPORTED_ROLES } = require('../middleware/auth.middleware');

router.get('/metrics', authorizeRoles(...SUPPORTED_ROLES), DashboardController.getMetrics);

module.exports = router;
