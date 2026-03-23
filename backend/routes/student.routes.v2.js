const express = require('express');
const router = express.Router();

const StudentController = require('../controllers/student.controller');
const { authorizeRoles } = require('../middleware/auth.middleware');
const { uploadStudentDocument, uploadStudentPhoto } = require('../middleware/upload.middleware');

// GET /students/me
router.get('/me', authorizeRoles('student'), StudentController.getMe);

// PUT /students/me
router.put('/me', authorizeRoles('student'), StudentController.putMe);

// POST /students/me/documents/:docType
router.post(
    '/me/documents/:docType',
    authorizeRoles('student'),
    (req, res, next) => {
        if (req.params.docType === 'photo') {
            uploadStudentPhoto.single('file')(req, res, next);
        } else {
            uploadStudentDocument.single('file')(req, res, next);
        }
    },
    StudentController.uploadDocument
);

// POST /students/me/submit
router.post('/me/submit', authorizeRoles('student'), StudentController.submit);

// POST /students/me/request-edit
router.post('/me/request-edit', authorizeRoles('student'), StudentController.requestEdit);

// GET /students (scoped list)
router.get('/', authorizeRoles('admin', 'hod', 'cluster_hod', 'principal', 'technical_director', 'mentor'), StudentController.list);

// GET /students/:id
router.get('/:id', authorizeRoles('admin', 'hod', 'cluster_hod', 'principal', 'technical_director', 'mentor'), StudentController.getById);

// POST /students/:id/approve-edit
router.post('/:id/approve-edit', authorizeRoles('mentor', 'admin'), StudentController.approveEdit);

// POST /students/:id/quota-request
router.post('/:id/quota-request', authorizeRoles('mentor', 'admin'), StudentController.quotaRequest);

// POST /students/:id/scholarship-request
router.post('/:id/scholarship-request', authorizeRoles('mentor', 'admin'), StudentController.scholarshipRequest);

module.exports = router;
