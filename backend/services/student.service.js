const StudentRepository = require('../repositories/student.repository');

class StudentService {
    constructor(db) {
        this.repo = new StudentRepository(db);
    }

    async getMyProfile(userId) {
        await this.repo.ensureDraftProfile(userId);
        return this.repo.getProfileByStudentId(userId);
    }

    async saveMyProfile(userId, body) {
        return this.repo.upsertProfile(userId, body);
    }

    async uploadDocument({ userId, docType, fileUrl }) {
        const profile = await this.repo.getProfileByStudentId(userId);
        if (!profile) {
            const err = new Error('Profile not found. Save your profile first.');
            err.statusCode = 404;
            throw err;
        }

        if (docType === 'photo') {
            await this.repo.updatePhotoUrl(userId, fileUrl);
            return { success: true, fileUrl };
        }

        const documents = profile.documents || {};
        documents[docType] = fileUrl;
        await this.repo.updateDocuments(userId, documents);
        return { success: true, fileUrl };
    }

    async submitProfile(userId) {
        await this.repo.submitProfile(userId);
        return { message: 'Profile submitted for approval.' };
    }

    async requestEdit(userId) {
        await this.repo.requestEdit(userId);
        return { message: 'Edit request sent to your mentor.' };
    }

    async listStudents({ page = 1, limit = 20 }) {
        const p = parseInt(page);
        const l = parseInt(limit);
        const offset = (p - 1) * l;
        const result = await this.repo.listProfiles({ limit: l, offset });
        return { ...result, page: p, limit: l };
    }

    async getStudentById(studentId) {
        const profile = await this.repo.getProfileByStudentId(studentId);
        if (!profile) {
            const err = new Error('Student profile not found.');
            err.statusCode = 404;
            throw err;
        }
        return profile;
    }

    async approveEdit(studentId) {
        await this.repo.approveEdit(studentId);
        return { message: 'Edit access granted for 24 hours.' };
    }

    async quotaRequest(studentId) {
        await this.repo.setQuotaEditRequested(studentId, true);
        return { message: 'Quota edit request sent to mentor.' };
    }

    async scholarshipRequest(studentId) {
        await this.repo.setScholarshipEditRequested(studentId, true);
        return { message: 'Scholarship edit request sent to mentor.' };
    }
}

module.exports = StudentService;
