const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/auth.controller');
const { verifyFirebaseToken, authorizeRoles } = require('../middleware/auth.middleware');

// Public
router.get('/', AuthController.info);
router.get('/ping', AuthController.ping);

// Backward-compatible login:
// - If Authorization: Bearer <firebase token> is present -> Firebase mode
// - Else expects {email,password} -> DB password_hash mode (frontend expects this)
router.post('/login', AuthController.login);

// Existing endpoints used by frontend
router.post('/local-login', AuthController.localLogin);
router.post('/send-email-otp', AuthController.sendEmailOtp);
router.post('/verify-email-otp', AuthController.verifyEmailOtp);
router.post('/register-student', AuthController.registerStudent);

// Frontend uses these
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/verify', AuthController.verify);
router.post('/send-admission-credentials', verifyFirebaseToken, authorizeRoles('admin', 'principal', 'technical_director'), AuthController.sendAdmissionCredentials);
router.post('/admission-prospects', verifyFirebaseToken, authorizeRoles('admin', 'principal', 'technical_director'), AuthController.addAdmissionProspect);
router.get('/admission-prospects', verifyFirebaseToken, authorizeRoles('admin', 'principal', 'technical_director'), AuthController.listAdmissionProspects);
router.post('/admission-prospects/:id/approve', verifyFirebaseToken, authorizeRoles('admin', 'principal', 'technical_director'), AuthController.approveAdmissionProspect);

router.post('/register-staff', AuthController.registerStaff);
router.post('/change-password', AuthController.changePassword);

// NEW: canonical admin invite endpoint under /auth (also exists under /admin)
router.post('/invite-student', verifyFirebaseToken, authorizeRoles('admin', 'principal', 'technical_director'), AuthController.inviteStudent);

module.exports = router;
