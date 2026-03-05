const express = require('express');
const LeaveController = require('../controllers/leave.controller');
const { authorize, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

// ─── Student creates leave ────────────────────────────────────────────────────
router.post('/', authorizeRoles('student'), LeaveController.createLeave);

// ─── GET all leaves (filtered dynamically via Scope Matrix inside Repository) ─
router.get('/', LeaveController.getLeaves);

// ─── Approve leave (Mentor level >= 2 minimum, service handles HOD escalation) ──
router.post('/:id/approve', authorize(2), LeaveController.approveLeave);

// ─── Reject leave ───────────────────────────────────────────────────────────
router.post('/:id/reject', authorize(2), LeaveController.rejectLeave);

// ─── Generic approval endpoint matching frontend PUT /leaves/:id/approval ─────
router.put('/:id/approval', authorize(2), LeaveController.actionLeave);

// ─── Parent confirmation ────────────────────────────────────────────────────
router.put('/:id/parent-confirmation', authorizeRoles('parent'), LeaveController.parentConfirmation);

module.exports = router;
