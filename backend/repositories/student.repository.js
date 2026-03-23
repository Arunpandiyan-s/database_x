const { pool } = require('../utils/transaction.util');

function toIsoDate(val) {
    if (!val) return null;
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
}

function mapProfileRow(row) {
    if (!row) return null;

    return {
        studentId: row.student_id,
        name: row.name,
        registerNumber: row.register_number,
        email: row.email,
        mobile: row.mobile,
        dob: toIsoDate(row.dob),
        gender: row.gender,
        address: row.address,
        city: row.city,
        state: row.state,
        pincode: row.pincode,

        fatherName: row.father_name,
        fatherMobile: row.father_mobile,
        motherName: row.mother_name,
        motherMobile: row.mother_mobile,
        parentEmail: row.parent_email,
        parentRelationship: row.parent_relationship,

        admissionYear: row.admission_year,
        course: row.course,
        department: row.department,
        classSection: row.class_section,
        semester: row.semester,
        modeOfAdmission: row.mode_of_admission,
        mediumOfInstruction: row.medium_of_instruction,
        previousInstitution: row.previous_institution,
        previousInstitutionAddress: row.previous_institution_address,
        yearOfPassing: row.year_of_passing,
        board: row.board,
        marksOrCutoff: row.marks_or_cutoff,
        admissionQuota: row.admission_quota,
        scholarship: row.scholarship,

        status: row.status,
        profileSubmitted: row.profile_submitted,
        editRequestPending: row.edit_request_pending,
        quotaEditRequested: row.quota_edit_requested,
        scholarshipEditRequested: row.scholarship_edit_requested,
        tempUnlockExpiry: row.temp_unlock_expiry,

        documents: row.documents || {},
        photoUrl: row.photo_url,

        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

class StudentRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async getProfileByStudentId(studentId) {
        const r = await this.db.query('SELECT * FROM student_profiles WHERE student_id = $1', [studentId]);
        return r.rows[0] ? mapProfileRow(r.rows[0]) : null;
    }

    async ensureDraftProfile(studentId) {
        await this.db.query(
            `INSERT INTO student_profiles (student_id, status, profile_submitted, edit_request_pending)
             VALUES ($1, 'DRAFT', false, false)
             ON CONFLICT (student_id) DO NOTHING`,
            [studentId]
        );
    }

    async upsertProfile(studentId, b) {
        const result = await this.db.query(
            `INSERT INTO student_profiles (
                student_id, name, register_number, email, mobile, dob, gender,
                address, city, state, pincode,
                father_name, father_mobile, mother_name, mother_mobile,
                parent_email, parent_relationship,
                admission_year, course, department, class_section, semester,
                mode_of_admission, medium_of_instruction,
                previous_institution, previous_institution_address,
                year_of_passing, board, marks_or_cutoff,
                admission_quota, scholarship,
                status, profile_submitted, edit_request_pending
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11,
                $12, $13, $14, $15,
                $16, $17,
                $18, $19, $20, $21, $22,
                $23, $24,
                $25, $26,
                $27, $28, $29,
                $30, $31,
                'DRAFT', false, false
            )
            ON CONFLICT (student_id) DO UPDATE SET
                name = EXCLUDED.name,
                register_number = EXCLUDED.register_number,
                email = EXCLUDED.email,
                mobile = EXCLUDED.mobile,
                dob = EXCLUDED.dob,
                gender = EXCLUDED.gender,
                address = EXCLUDED.address,
                city = EXCLUDED.city,
                state = EXCLUDED.state,
                pincode = EXCLUDED.pincode,
                father_name = EXCLUDED.father_name,
                father_mobile = EXCLUDED.father_mobile,
                mother_name = EXCLUDED.mother_name,
                mother_mobile = EXCLUDED.mother_mobile,
                parent_email = EXCLUDED.parent_email,
                parent_relationship = EXCLUDED.parent_relationship,
                admission_year = EXCLUDED.admission_year,
                course = EXCLUDED.course,
                department = EXCLUDED.department,
                class_section = EXCLUDED.class_section,
                semester = EXCLUDED.semester,
                mode_of_admission = EXCLUDED.mode_of_admission,
                medium_of_instruction = EXCLUDED.medium_of_instruction,
                previous_institution = EXCLUDED.previous_institution,
                previous_institution_address = EXCLUDED.previous_institution_address,
                year_of_passing = EXCLUDED.year_of_passing,
                board = EXCLUDED.board,
                marks_or_cutoff = EXCLUDED.marks_or_cutoff,
                admission_quota = EXCLUDED.admission_quota,
                scholarship = EXCLUDED.scholarship,
                updated_at = NOW()
            RETURNING *`,
            [
                studentId,
                b.name,
                b.registerNumber,
                b.email,
                b.mobile,
                b.dob,
                b.gender,
                b.address,
                b.city,
                b.state,
                b.pincode,
                b.fatherName,
                b.fatherMobile,
                b.motherName,
                b.motherMobile,
                b.parentEmail,
                b.parentRelationship,
                b.admissionYear ? parseInt(b.admissionYear) : null,
                b.course,
                b.department,
                b.classSection,
                b.semester ? parseInt(b.semester) : null,
                b.modeOfAdmission,
                b.mediumOfInstruction,
                b.previousInstitution,
                b.previousInstitutionAddress,
                b.yearOfPassing,
                b.board,
                b.marksOrCutoff,
                b.admissionQuota,
                b.scholarship,
            ]
        );

        return mapProfileRow(result.rows[0]);
    }

    async updateDocuments(studentId, documents) {
        await this.db.query(
            `UPDATE student_profiles SET documents = $1::jsonb, updated_at = NOW() WHERE student_id = $2`,
            [JSON.stringify(documents), studentId]
        );
    }

    async updatePhotoUrl(studentId, photoUrl) {
        await this.db.query(
            `UPDATE student_profiles SET photo_url = $1, updated_at = NOW() WHERE student_id = $2`,
            [photoUrl, studentId]
        );
    }

    async submitProfile(studentId) {
        await this.db.query(
            `UPDATE student_profiles
             SET status = 'PENDING_APPROVAL', profile_submitted = true, updated_at = NOW()
             WHERE student_id = $1 AND status = 'DRAFT'`,
            [studentId]
        );
    }

    async requestEdit(studentId) {
        await this.db.query(
            `UPDATE student_profiles SET edit_request_pending = true, updated_at = NOW() WHERE student_id = $1`,
            [studentId]
        );
    }

    async listProfiles({ limit, offset }) {
        const r = await this.db.query(
            `SELECT sp.*, u.email AS user_email
             FROM student_profiles sp
             JOIN users u ON u.id = sp.student_id
             ORDER BY sp.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        const count = await this.db.query('SELECT COUNT(*) FROM student_profiles');
        return {
            data: r.rows.map(mapProfileRow),
            total: parseInt(count.rows[0].count),
        };
    }

    async approveEdit(studentId) {
        await this.db.query(
            `UPDATE student_profiles
             SET status = 'TEMP_UNLOCKED',
                 edit_request_pending = false,
                 temp_unlock_expiry = NOW() + INTERVAL '24 hours',
                 updated_at = NOW()
             WHERE student_id = $1`,
            [studentId]
        );
    }

    async setQuotaEditRequested(studentId, flag) {
        await this.db.query(
            `UPDATE student_profiles SET quota_edit_requested = $1, updated_at = NOW() WHERE student_id = $2`,
            [flag, studentId]
        );
    }

    async setScholarshipEditRequested(studentId, flag) {
        await this.db.query(
            `UPDATE student_profiles SET scholarship_edit_requested = $1, updated_at = NOW() WHERE student_id = $2`,
            [flag, studentId]
        );
    }
}

module.exports = StudentRepository;
