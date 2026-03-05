/**
 * Attendance Routes
 * GET  /api/v1/attendance/class/:classId/date/:date  — fetch record for a date
 * POST /api/v1/attendance                            — save new attendance
 * PUT  /api/v1/attendance/:classId/date/:date        — update existing attendance
 * GET  /api/v1/attendance/student/me/summary         — student's own summary
 * GET  /api/v1/classes/:classId/students             — list students in a class
 * GET  /api/v1/classes                               — list classes (scoped)
 * POST /api/v1/classes                               — create class (admin)
 * GET  /api/v1/classes/:id                           — get single class
 */

const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/attendance.controller');
const { authorizeRoles, authorize } = require('../middleware/auth.middleware');

// ─── Class Management ─────────────────────────────────────────────────────────
router.get('/classes', AttendanceController.getClasses);
router.post('/classes', authorizeRoles('admin'), AttendanceController.createClass);
router.get('/classes/:classId', AttendanceController.getClassById);
router.get('/classes/:classId/students', AttendanceController.getStudentsInClass);

// ─── Attendance ───────────────────────────────────────────────────────────────
router.get('/class/:classId/date/:date', AttendanceController.getAttendanceByDate);
router.post('/', authorizeRoles('class_advisor', 'admin'), AttendanceController.saveAttendance);
router.put('/class/:classId/date/:date', authorizeRoles('class_advisor', 'admin'), AttendanceController.updateAttendance);

// ─── Student self-view ────────────────────────────────────────────────────────
router.get('/student/me/summary', authorizeRoles('student'), AttendanceController.getStudentSummary);

module.exports = router;
