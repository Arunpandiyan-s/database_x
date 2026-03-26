const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const { authorizeRoles, SUPPORTED_ROLES } = require('../middleware/auth.middleware');

// ─── Multi-role management access ─────────────────────────────────────────────
// Any role that has subordinates can access user management endpoints.
const USER_MGMT_ROLES = ['admin', 'technical_director', 'principal', 'vice_principal', 'cluster_hod', 'hod'];

// Student invite (legacy)
router.post('/invite-student', authorizeRoles('admin', 'principal', 'technical_director'), AdminController.inviteStudent);

// ─── User Management ─────────────────────────────────────────────────────────
router.get('/users',          authorizeRoles(...USER_MGMT_ROLES), AdminController.listUsers);
router.post('/users',         authorizeRoles(...USER_MGMT_ROLES), AdminController.createUser);
router.put('/users/:id',      authorizeRoles(...USER_MGMT_ROLES), AdminController.updateUser);
router.delete('/users/:id',   authorizeRoles(...USER_MGMT_ROLES), AdminController.deactivateUser);

// ─── Roles (assignable by current actor) ─────────────────────────────────────
router.get('/roles',          authorizeRoles(...USER_MGMT_ROLES), AdminController.listAssignableRoles);

module.exports = router;
