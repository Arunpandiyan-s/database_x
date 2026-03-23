const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const { authorizeRoles } = require('../middleware/auth.middleware');

router.post('/invite-student', authorizeRoles('admin', 'principal', 'technical_director'), AdminController.inviteStudent);

module.exports = router;
