/**
 * Student Routes
 * GET  /api/v1/students/me          — get own profile
 * PUT  /api/v1/students/me          — save own profile (all fields)
 * POST /api/v1/students/me/submit   — lock profile (student submits for approval)
 * POST /api/v1/students/me/request-edit — request temp unlock from mentor
 * POST /api/v1/students/me/documents/:docType — upload a document (local storage)
 * GET  /api/v1/students             — list all students (admin/HOD/mentor scoped)
 * GET  /api/v1/students/:id         — get a specific student profile
 * POST /api/v1/students/:id/approve-edit — mentor approves temp unlock
 */

const express = require('express');
const router = express.Router();
const { uploadStudentDocument, uploadStudentPhoto } = require('../middleware/upload.middleware');
const { pool } = require('../utils/transaction.util');
const { authorizeRoles } = require('../middleware/auth.middleware');

// ─── Helper: profile row → camelCase object ───────────────────────────────────
function mapProfile(row) {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.student_id,
        mentorId: row.mentor_id,

        // Basic
        name: row.name || '',
        gender: row.gender || '',
        dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : '',
        nationality: row.nationality || '',
        religion: row.religion || '',
        community: row.community || '',
        communityCertNumber: row.community_cert_number || '',
        bloodGroup: row.blood_group || '',

        // Contact
        emisNumber: row.emis_number || '',
        aadhaarNumber: row.aadhaar_number || '',
        phone: row.phone || '',
        email: row.email || '',
        parentPhone: row.parent_phone || '',
        parentEmail: row.parent_email || '',
        permanentAddress: row.permanent_address || '',
        communicationAddress: row.communication_address || '',
        communicationDistrict: row.communication_district || '',
        communicationTown: row.communication_town || '',
        communicationVillagePanchayat: row.communication_village || '',
        pinCode: row.pin_code || '',

        // Bank
        bankAccountNumber: row.bank_account_number || '',
        bankAccountHolderName: row.bank_holder_name || '',
        bankName: row.bank_name || '',
        bankBranchName: row.bank_branch_name || '',
        bankIfscCode: row.bank_ifsc_code || '',

        // Parent
        fatherPhoto: row.documents?.fatherPhoto || '',
        motherPhoto: row.documents?.motherPhoto || '',
        guardianPhoto: row.documents?.guardianPhoto || '',
        fatherName: row.father_name || '',
        motherName: row.mother_name || '',
        guardianName: row.guardian_name || '',
        siblingName: row.sibling_name || '',
        siblingOccupation: row.sibling_occupation || '',
        fatherOccupation: row.parent_occupation || '',
        motherOccupation: row.mother_occupation || '',
        parentAnnualIncome: row.parent_annual_income || '',
        fatherPhone: row.father_phone || '',
        motherPhone: row.mother_phone || '',

        // Academic
        registerNumber: row.register_number || '',
        admissionDate: row.admission_date ? new Date(row.admission_date).toISOString().split('T')[0] : '',
        markSheet: row.documents?.marksheet12 || row.documents?.marksheet10 || '',
        academicYear: row.academic_year || '',
        programme: row.programme || '',
        courseBranch: row.course_branch || '',
        department: row.department || '',
        year: row.year || 1,
        section: row.section || '',
        semester: row.semester || 1,
        modeOfAdmission: row.mode_of_admission || '',
        mediumOfInstruction: row.medium_of_instruction || '',

        // Academic History
        tenthInstitutionName: row.tenth_institution_name || '',
        tenthBoard: row.tenth_board || '',
        tenthPercentage: row.tenth_percentage || '',
        eleventhInstitutionName: row.eleventh_institution_name || '',
        eleventhBoard: row.eleventh_board || '',
        eleventhPercentage: row.eleventh_percentage || '',
        twelfthInstitutionName: row.twelfth_institution_name || '',
        twelfthBoard: row.twelfth_board || '',
        twelfthPercentage: row.twelfth_percentage || '',

        // Photo
        photo: row.photo_url || '',

        // Admission & Scholarship
        admissionQuota: row.admission_quota || '',
        scholarship: row.scholarship || '',

        // Metadata
        profileStatus: row.status || 'DRAFT',
        profileSubmitted: !!row.profile_submitted,
        editRequestPending: !!row.edit_request_pending,
        quotaEditRequested: !!row.quota_edit_requested,
        scholarshipEditRequested: !!row.scholarship_edit_requested,
        tempUnlockExpiry: row.temp_unlock_expiry || undefined,
    };
}

// ─── GET /students/me ─────────────────────────────────────────────────────────
router.get('/me', authorizeRoles('student'), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        let result = await pool.query(
            'SELECT * FROM student_profiles WHERE student_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Auto-create an empty DRAFT profile on first access
            await pool.query(
                `INSERT INTO student_profiles (student_id, status, profile_submitted, edit_request_pending)
                 VALUES ($1, 'DRAFT', false, false)`,
                [userId]
            );
            result = await pool.query(
                'SELECT * FROM student_profiles WHERE student_id = $1',
                [userId]
            );
        }

        return res.json(mapProfile(result.rows[0]));
    } catch (err) {
        next(err);
    }
});

// ─── PUT /students/me ─────────────────────────────────────────────────────────
router.put('/me', authorizeRoles('student'), async (req, res, next) => {
    try {
        const userId = req.user.userId;

        // Verify edit is allowed
        const check = await pool.query(
            `SELECT status, profile_submitted FROM student_profiles WHERE student_id = $1`,
            [userId]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        const { status, profile_submitted } = check.rows[0];
        if (profile_submitted && !['TEMP_UNLOCKED', 'DRAFT'].includes(status)) {
            return res.status(409).json({ error: 'Profile is locked. Request an edit unlock from your mentor.' });
        }

        const b = req.body;
        const result = await pool.query(
            `UPDATE student_profiles SET
                name                        = COALESCE($1,  name),
                gender                      = COALESCE($2,  gender),
                dob                         = COALESCE($3,  dob),
                nationality                 = COALESCE($4,  nationality),
                religion                    = COALESCE($5,  religion),
                community                   = COALESCE($6,  community),
                community_cert_number       = COALESCE($7,  community_cert_number),
                blood_group                 = COALESCE($8,  blood_group),
                emis_number                 = COALESCE($9,  emis_number),
                aadhaar_number              = COALESCE($10, aadhaar_number),
                phone                       = COALESCE($11, phone),
                email                       = COALESCE($12, email),
                parent_phone                = COALESCE($13, parent_phone),
                parent_email                = COALESCE($14, parent_email),
                permanent_address           = COALESCE($15, permanent_address),
                communication_address       = COALESCE($16, communication_address),
                communication_district      = COALESCE($17, communication_district),
                communication_town          = COALESCE($18, communication_town),
                communication_village       = COALESCE($19, communication_village),
                bank_account_number         = COALESCE($20, bank_account_number),
                bank_holder_name            = COALESCE($21, bank_holder_name),
                bank_name                   = COALESCE($22, bank_name),
                bank_branch_name            = COALESCE($23, bank_branch_name),
                bank_ifsc_code              = COALESCE($24, bank_ifsc_code),
                father_name                 = COALESCE($25, father_name),
                mother_name                 = COALESCE($26, mother_name),
                guardian_name               = COALESCE($27, guardian_name),
                sibling_name                = COALESCE($28, sibling_name),
                sibling_occupation          = COALESCE($29, sibling_occupation),
                parent_occupation           = COALESCE($30, parent_occupation),
                parent_annual_income        = COALESCE($31, parent_annual_income),
                father_phone                = COALESCE($32, father_phone),
                mother_phone                = COALESCE($33, mother_phone),
                register_number             = COALESCE($34, register_number),
                admission_date              = COALESCE($35, admission_date),
                academic_year               = COALESCE($36, academic_year),
                programme                   = COALESCE($37, programme),
                course_branch               = COALESCE($38, course_branch),
                department                  = COALESCE($39, department),
                year                        = COALESCE($40, year),
                section                     = COALESCE($41, section),
                semester                    = COALESCE($42, semester),
                mode_of_admission           = COALESCE($43, mode_of_admission),
                medium_of_instruction       = COALESCE($44, medium_of_instruction),
                previous_institution        = COALESCE($45, previous_institution),
                previous_institution_address= COALESCE($46, previous_institution_address),
                year_of_passing             = COALESCE($47, year_of_passing),
                board                       = COALESCE($48, board),
                marks_or_cutoff             = COALESCE($49, marks_or_cutoff),
                admission_quota             = COALESCE($50, admission_quota),
                scholarship                 = COALESCE($51, scholarship),
                updated_at                  = NOW()
             WHERE student_id = $52
             RETURNING *`,
            [
                b.name,                      // $1
                b.gender,                    // $2
                b.dob || null,               // $3
                b.nationality,               // $4
                b.religion,                  // $5
                b.community,                 // $6
                b.communityCertNumber,       // $7
                b.bloodGroup,               // $8
                b.emisNumber,               // $9
                b.aadhaarNumber,            // $10
                b.phone,                    // $11
                b.email,                    // $12
                b.parentPhone,              // $13
                b.parentEmail,              // $14
                b.permanentAddress,         // $15
                b.communicationAddress,     // $16
                b.communicationDistrict,    // $17
                b.communicationTown,        // $18
                b.communicationVillagePanchayat, // $19
                b.bankAccountNumber,        // $20
                b.bankAccountHolderName,    // $21
                b.bankName,                 // $22
                b.bankBranchName,           // $23
                b.bankIfscCode,             // $24
                b.fatherName,              // $25
                b.motherName,              // $26
                b.guardianName,            // $27
                b.siblingName,             // $28
                b.siblingOccupation,       // $29
                b.parentOccupation,        // $30
                b.parentAnnualIncome,      // $31
                b.fatherPhone,             // $32
                b.motherPhone,             // $33
                b.registerNumber,          // $34
                b.admissionDate || null,   // $35
                b.academicYear,            // $36
                b.programme,               // $37
                b.courseBranch,            // $38
                b.department,              // $39
                b.year ? parseInt(b.year) : null,     // $40
                b.section,                 // $41
                b.semester ? parseInt(b.semester) : null, // $42
                b.modeOfAdmission,         // $43
                b.mediumOfInstruction,     // $44
                b.previousInstitution,     // $45
                b.previousInstitutionAddress, // $46
                b.yearOfPassing,           // $47
                b.board,                   // $48
                b.marksOrCutoff,           // $49
                b.admissionQuota,          // $50
                b.scholarship,             // $51
                userId,                    // $52
            ]
        );

        return res.json(mapProfile(result.rows[0]));
    } catch (err) {
        next(err);
    }
});

// ─── POST /students/me/documents/:docType ────────────────────────────────────
// docType: community | aadhaar | marksheet10 | marksheet12 | firstgrad | transfer | allotment | photo
router.post('/me/documents/:docType', authorizeRoles('student'), (req, res, next) => {
    if (req.params.docType === 'photo') {
        uploadStudentPhoto.single('file')(req, res, next);
    } else {
        uploadStudentDocument.single('file')(req, res, next);
    }
}, async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded or file rejected by filter.' });
        }

        const userId = req.user.userId;
        const docType = req.params.docType;
        const { pool } = require('../utils/transaction.util');

        const ALLOWED_DOC_TYPES = ['community', 'aadhaar', 'marksheet10', 'marksheet12',
            'firstgrad', 'transfer', 'allotment', 'photo'];

        if (!ALLOWED_DOC_TYPES.includes(docType)) {
            const fs = require('fs');
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: `Unknown document type: ${docType}` });
        }

        const folderName = require('path').basename(req.file.destination);
        const fileUrl = `/uploads/${folderName}/${req.file.filename}`;

        const existing = await pool.query(
            'SELECT documents, photo_url FROM student_profiles WHERE student_id = $1',
            [userId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Profile not found. Save your profile first.' });
        }

        if (docType === 'photo') {
            await pool.query(
                `UPDATE student_profiles SET photo_url = $1, updated_at = NOW() WHERE student_id = $2`,
                [fileUrl, userId]
            );
        } else {
            const currentDocs = existing.rows[0].documents || {};
            currentDocs[docType] = fileUrl;
            await pool.query(
                `UPDATE student_profiles SET documents = $1::jsonb, updated_at = NOW() WHERE student_id = $2`,
                [JSON.stringify(currentDocs), userId]
            );
        }

        return res.status(200).json({
            success: true,
            fileUrl: fileUrl
        });
    } catch (err) {
        if (req.file?.path) {
            require('fs').unlinkSync(req.file.path);
        }
        next(err);
    }
});

// ─── POST /students/me/submit ─────────────────────────────────────────────────
router.post('/me/submit', authorizeRoles('student'), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        await pool.query(
            `UPDATE student_profiles
             SET status = 'PENDING_APPROVAL', profile_submitted = true, updated_at = NOW()
             WHERE student_id = $1 AND status = 'DRAFT'`,
            [userId]
        );
        return res.json({ message: 'Profile submitted for approval.' });
    } catch (err) {
        next(err);
    }
});

// ─── POST /students/me/request-edit ──────────────────────────────────────────
router.post('/me/request-edit', authorizeRoles('student'), async (req, res, next) => {
    try {
        const userId = req.user.userId;
        await pool.query(
            `UPDATE student_profiles
             SET edit_request_pending = true, updated_at = NOW()
             WHERE student_id = $1`,
            [userId]
        );
        return res.json({ message: 'Edit request sent to your mentor.' });
    } catch (err) {
        next(err);
    }
});

// ─── GET /students — admin/HOD/mentor scoped list ─────────────────────────────
router.get('/', authorizeRoles('admin', 'hod', 'cluster_hod', 'principal', 'technical_director', 'mentor'), async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const result = await pool.query(
            `SELECT sp.*, u.email AS user_email
             FROM student_profiles sp
             JOIN users u ON u.id = sp.student_id
             ORDER BY sp.created_at DESC
             LIMIT $1 OFFSET $2`,
            [parseInt(limit), offset]
        );
        const countResult = await pool.query('SELECT COUNT(*) FROM student_profiles');
        return res.json({
            data: result.rows.map(mapProfile),
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (err) {
        next(err);
    }
});

// ─── GET /students/:id ────────────────────────────────────────────────────────
router.get('/:id', authorizeRoles('admin', 'hod', 'cluster_hod', 'principal', 'technical_director', 'mentor'), async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT * FROM student_profiles WHERE student_id = $1',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Student profile not found.' });
        }
        return res.json(mapProfile(result.rows[0]));
    } catch (err) {
        next(err);
    }
});

// ─── POST /students/:id/approve-edit ─────────────────────────────────────────
router.post('/:id/approve-edit', authorizeRoles('mentor', 'admin'), async (req, res, next) => {
    try {
        await pool.query(
            `UPDATE student_profiles
             SET status = 'TEMP_UNLOCKED',
                 edit_request_pending = false,
                 temp_unlock_expiry = NOW() + INTERVAL '24 hours',
                 updated_at = NOW()
             WHERE student_id = $1`,
            [req.params.id]
        );
        return res.json({ message: 'Edit access granted for 24 hours.' });
    } catch (err) {
        next(err);
    }
});

// ─── POST /students/:id/quota-request ────────────────────────────────────────
router.post('/:id/quota-request', authorizeRoles('mentor', 'admin'), async (req, res, next) => {
    try {
        await pool.query(
            `UPDATE student_profiles
             SET quota_edit_requested = true,
                 updated_at = NOW()
             WHERE student_id = $1`,
            [req.params.id]
        );
        return res.json({ message: 'Quota edit request sent to mentor.' });
    } catch (err) {
        next(err);
    }
});

// ─── POST /students/:id/scholarship-request ──────────────────────────────────
router.post('/:id/scholarship-request', authorizeRoles('mentor', 'admin'), async (req, res, next) => {
    try {
        await pool.query(
            `UPDATE student_profiles
             SET scholarship_edit_requested = true,
                 updated_at = NOW()
             WHERE student_id = $1`,
            [req.params.id]
        );
        return res.json({ message: 'Scholarship edit request sent to mentor.' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

