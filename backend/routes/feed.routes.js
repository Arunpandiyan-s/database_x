/**
 * Campus Feed Routes
 * GET    /api/v1/feeds         — list posts (scoped to college)
 * POST   /api/v1/feeds         — create post (admin, principal)
 * DELETE /api/v1/feeds/:id     — delete post (admin, principal)
 */

const express = require('express');
const router = express.Router();
const FeedController = require('../controllers/feed.controller');
const { authorizeRoles, SUPPORTED_ROLES } = require('../middleware/auth.middleware');

// All authenticated users can read the feed
router.get('/', authorizeRoles(...SUPPORTED_ROLES), FeedController.getFeed);

// Only admin or principal can create/delete posts
router.post('/', authorizeRoles('admin', 'principal'), FeedController.createPost);
router.delete('/:id', authorizeRoles('admin', 'principal'), FeedController.deletePost);

module.exports = router;
