/**
 * Campus Feed Routes
 * GET    /api/v1/feed         — list posts (scoped to college)
 * POST   /api/v1/feed         — create post (admin, principal)
 * DELETE /api/v1/feed/:id     — delete post (admin, principal)
 */

const express = require('express');
const router = express.Router();
const FeedController = require('../controllers/feed.controller');
const { authorizeRoles } = require('../middleware/auth.middleware');

// All authenticated users can read the feed
router.get('/', FeedController.getFeed);

// Only admin or principal can create/delete posts
router.post('/', authorizeRoles('admin', 'principal'), FeedController.createPost);
router.delete('/:id', authorizeRoles('admin', 'principal'), FeedController.deletePost);

module.exports = router;
