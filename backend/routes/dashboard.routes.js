/**
 * Dashboard Routes
 * GET /api/v1/dashboard/metrics — role-aware ERP metrics
 */

const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');

router.get('/metrics', DashboardController.getMetrics);

module.exports = router;
