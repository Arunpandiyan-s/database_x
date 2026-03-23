/**
 * Notification Routes
 * GET /api/v1/notifications       — get user's notifications
 * PUT /api/v1/notifications/:id/read — mark one as read
 * PUT /api/v1/notifications/read-all — mark all as read
 */

const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');

const { authorizeRoles, SUPPORTED_ROLES } = require('../middleware/auth.middleware');

router.get('/', authorizeRoles(...SUPPORTED_ROLES), NotificationController.getNotifications);
router.put('/read-all', authorizeRoles(...SUPPORTED_ROLES), NotificationController.markAllRead);
router.put('/:id/read', authorizeRoles(...SUPPORTED_ROLES), NotificationController.markRead);

module.exports = router;
