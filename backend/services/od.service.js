const ODRepository = require('../repositories/od.repository');
const { notify } = require('../utils/notify.util');

class ODService {
    constructor(db) {
        this.repo = new ODRepository(db);
    }

    mapOD(row) {
        if (!row) return null;
        return {
            id: row.id,
            studentId: row.student_id,
            studentName: row.student_name || '',
            year: row.year || 1,
            branch: row.department || '',
            section: row.section || '',
            registerNumber: row.register_number || '',
            semester: row.semester || 1,
            daysAvailed: row.days_availed || 0,
            daysRequested: row.days_requested || 0,
            dates: row.dates || [],
            reason: row.reason || '',
            parentsInformed: row.parents_informed || false,
            mentorApproval: row.mentor_approval || 'pending',
            hodApproval: row.hod_approval || 'pending',
            parentConfirmation: row.parent_confirmed || false,
            brochureUrl: row.brochure_url || undefined,
            registrationProofUrl: row.registration_proof_url || undefined,
            participationCertUrl: row.participation_cert_url || undefined,
            status: row.status || 'Pending',
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
            mentorId: row.mentor_id || '',
            hodId: row.hod_id || '',
        };
    }

    async list({ user }) {
        const rows = await this.repo.listScoped({ user });
        return { success: true, data: rows.map(r => this.mapOD(r)) };
    }

    async create({ user, body }) {
        const { dates, reason, daysRequested, parentsInformed, mentorId, hodId } = body || {};
        if (!dates?.length || !reason || !daysRequested) {
            const err = new Error('dates, reason, and daysRequested are required');
            err.statusCode = 400;
            throw err;
        }

        const od = await this.repo.create({
            studentId: user.userId,
            mentorId,
            hodId,
            collegeId: user.collegeId,
            departmentId: user.departmentId,
            dates,
            reason,
            parentsInformed,
            daysRequested,
        });

        if (od.mentor_id) {
            await notify(od.mentor_id, `New OD request awaiting your approval`, 'info');
        }

        return { success: true, data: this.mapOD(od), message: 'OD request submitted successfully' };
    }

    async uploadAttachment({ user, id, file, type }) {
        if (!file) {
            const err = new Error('No file uploaded');
            err.statusCode = 400;
            throw err;
        }

        const allowed = ['brochure', 'registration_proof', 'participation_cert'];
        if (!allowed.includes(type)) {
            const err = new Error(`type must be one of: ${allowed.join(', ')}`);
            err.statusCode = 400;
            throw err;
        }

        const folderName = require('path').basename(file.destination);
        const fileUrl = `/uploads/${folderName}/${file.filename}`;
        const col = `${type}_url`;

        const updatedId = await this.repo.updateAttachment({
            id,
            studentId: user.userId,
            columnName: col,
            fileUrl,
        });

        if (!updatedId) {
            const err = new Error('OD request not found or not yours');
            err.statusCode = 404;
            throw err;
        }

        return { success: true, fileUrl, message: 'File uploaded' };
    }

    async mentorApproval({ id, status }) {
        if (!['approved', 'rejected'].includes(status)) {
            const err = new Error('status must be approved or rejected');
            err.statusCode = 400;
            throw err;
        }

        const newStatus = status === 'approved' ? 'Awaiting HOD Approval' : 'Rejected by Mentor';
        const od = await this.repo.updateMentorApproval({ id, status, newStatus });

        if (!od) {
            const err = new Error('OD not found or already actioned');
            err.statusCode = 409;
            throw err;
        }

        await notify(od.student_id, `Your OD request was ${status} by mentor`, status === 'approved' ? 'success' : 'warning');
        if (status === 'approved' && od.hod_id) {
            await notify(od.hod_id, `OD request requires your approval`, 'info');
        }

        return { success: true, data: this.mapOD(od), message: `OD ${status} by mentor` };
    }

    async hodApproval({ id, status }) {
        if (!['approved', 'rejected'].includes(status)) {
            const err = new Error('status must be approved or rejected');
            err.statusCode = 400;
            throw err;
        }

        const newStatus = status === 'approved' ? 'Approved — Under Review for Certificate' : 'Rejected by HOD';
        const od = await this.repo.updateHodApproval({ id, status, newStatus });

        if (!od) {
            const err = new Error('OD not found, already actioned, or mentor not yet approved');
            err.statusCode = 409;
            throw err;
        }

        await notify(od.student_id, `Your OD request was ${status} by HOD`, status === 'approved' ? 'success' : 'warning');
        return { success: true, data: this.mapOD(od), message: `OD ${status} by HOD` };
    }

    async parentConfirmation({ id }) {
        const studentId = await this.repo.markParentConfirmed({ id });
        if (!studentId) {
            const err = new Error('OD request not found');
            err.statusCode = 404;
            throw err;
        }
        await notify(studentId, 'Your parent confirmed the OD request', 'success');
        return { success: true, message: 'OD parent confirmation recorded' };
    }
}

module.exports = ODService;
