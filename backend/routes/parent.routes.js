/**
 * Parent Portal Routes
 * GET /api/v1/parent/student/:studentId    — parent views student data
 * PUT /api/v1/parent/od/:id/confirm        — parent confirms OD
 * PUT /api/v1/parent/leave/:id/confirm     — parent confirms leave
 */

const express = require('express');
const router = express.Router();
const ParentController = require('../controllers/parent.controller');
const { authorizeRoles } = require('../middleware/auth.middleware');

// Only parents can use this portal
router.get('/student/:studentId', authorizeRoles('parent'), ParentController.getStudentData);
router.put('/od/:id/confirm', authorizeRoles('parent'), ParentController.confirmOD);
router.put('/leave/:id/confirm', authorizeRoles('parent'), ParentController.confirmLeave);

module.exports = router;
