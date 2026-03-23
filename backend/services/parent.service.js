const ParentRepository = require('../repositories/parent.repository');
const { notify } = require('../utils/notify.util');

class ParentService {
    constructor(db) {
        this.repo = new ParentRepository(db);
    }

    async registerParent({ studentEmail, parentEmail, password, parentName, relationship }) {
        if (!studentEmail || !parentEmail || !password) {
            const err = new Error('Student email, parent email, and password are required.');
            err.statusCode = 400;
            throw err;
        }

        const studentId = await this.repo.findStudentIdByEmail(studentEmail);
        if (!studentId) {
            const err = new Error('Student email not found in system.');
            err.statusCode = 404;
            throw err;
        }

        const parentRole = await this.repo.getRoleByName('parent');
        if (!parentRole) {
            const err = new Error('Parent role not configured.');
            err.statusCode = 500;
            throw err;
        }

        const admin = require('../config/firebase');
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().createUser({
                email: parentEmail,
                password,
                displayName: parentName || parentEmail.split('@')[0],
            });
        } catch (fbErr) {
            if (fbErr.code === 'auth/email-already-exists') {
                firebaseUser = await admin.auth().getUserByEmail(parentEmail);
            } else {
                const err = new Error(fbErr.message);
                err.statusCode = 400;
                throw err;
            }
        }

        const parentId = await this.repo.upsertParentUser({
            firebaseUid: firebaseUser.uid,
            parentEmail,
            roleId: parentRole.id,
        });

        await this.repo.linkParentStudent({ parentId, studentId, relationship });
        return { success: true, message: 'Parent account created and linked.' };
    }

    async getStudentData({ parentId, studentId }) {
        const linked = await this.repo.isLinked(parentId, studentId);
        if (!linked) {
            const err = new Error('Permission denied: Not linked to this student');
            err.statusCode = 403;
            throw err;
        }

        const [profile, leaves, ods, attendanceRows] = await Promise.all([
            this.repo.getStudentProfile(studentId),
            this.repo.getRecentLeaves(studentId),
            this.repo.getRecentOds(studentId),
            this.repo.getAttendanceRecordsContaining(studentId),
        ]);

        let present = 0, absent = 0, od = 0;
        for (const row of attendanceRows) {
            const entry = row.records?.find?.(r => r.studentId === studentId);
            if (entry) {
                if (entry.status === 'present') present++;
                else if (entry.status === 'absent') absent++;
                else if (entry.status === 'od') od++;
            }
        }
        const total = present + absent + od;
        const percentage = total > 0 ? Math.round(((present + od) / total) * 100) : 0;

        return {
            success: true,
            data: {
                profile: profile || null,
                leaves,
                ods,
                attendance: { present, absent, od, total, percentage },
            },
        };
    }

    async confirmOD({ parentId, odId }) {
        const studentId = await this.repo.getOdStudentIfLinked(odId, parentId);
        if (!studentId) {
            const err = new Error('Not authorized to confirm this OD');
            err.statusCode = 403;
            throw err;
        }

        await this.repo.confirmOd(odId);
        await notify(studentId, 'Your parent confirmed the OD request', 'success');
        return { success: true, message: 'OD parent confirmation recorded' };
    }

    async confirmLeave({ parentId, leaveId }) {
        const studentId = await this.repo.getLeaveStudentIfLinked(leaveId, parentId);
        if (!studentId) {
            const err = new Error('Not authorized to confirm this leave');
            err.statusCode = 403;
            throw err;
        }

        await this.repo.confirmLeave(leaveId);
        await notify(studentId, 'Your parent confirmed the leave request', 'success');
        return { success: true, message: 'Leave parent confirmation recorded' };
    }
}

module.exports = ParentService;
