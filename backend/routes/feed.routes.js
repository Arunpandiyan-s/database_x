/**
 * Campus Feed Routes
 * GET    /api/v1/feeds              — list published posts (all authenticated users)
 * GET    /api/v1/feeds/manage       — list all posts for admin/VP management
 * POST   /api/v1/feeds              — create post (admin, principal, VP)
 * POST   /api/v1/feeds/:id/approve  — approve post (admin)
 * POST   /api/v1/feeds/:id/reject   — reject post (admin, VP)
 * POST   /api/v1/feeds/:id/publish  — publish approved post (VP, admin)
 * DELETE /api/v1/feeds/:id          — archive/delete post (admin, principal)
 */

const express = require('express');
const router = express.Router();
const FeedController = require('../controllers/feed.controller');
const { authorizeRoles, SUPPORTED_ROLES } = require('../middleware/auth.middleware');

// All authenticated users can read the public feed
router.get('/', authorizeRoles(...SUPPORTED_ROLES), FeedController.getFeed);

// Admin/VP management view of all posts
router.get('/manage', authorizeRoles('admin', 'technical_director', 'vice_principal', 'principal'), FeedController.listAllPosts);

// Create a post
router.post('/', authorizeRoles('admin', 'principal', 'vice_principal', 'technical_director'), FeedController.createPost);

// Workflow actions
router.post('/:id/approve',  authorizeRoles('admin', 'technical_director'), FeedController.approvePost);
router.post('/:id/reject',   authorizeRoles('admin', 'technical_director', 'vice_principal'), FeedController.rejectPost);
router.post('/:id/publish',  authorizeRoles('vice_principal', 'admin', 'technical_director'), FeedController.publishPost);

// Delete
router.delete('/:id', authorizeRoles('admin', 'principal', 'vice_principal', 'technical_director'), FeedController.deletePost);

module.exports = router;
