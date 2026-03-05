/**
 * Notification Routes
 * GET /api/v1/notifications       — get user's notifications
 * PUT /api/v1/notifications/:id/read — mark one as read
 * PUT /api/v1/notifications/read-all — mark all as read
 */

const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');

router.get('/', NotificationController.getNotifications);
router.put('/read-all', NotificationController.markAllRead);
router.put('/:id/read', NotificationController.markRead);

module.exports = router;
