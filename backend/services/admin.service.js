const bcrypt = require('bcryptjs');
const EmailService = require('./email.service');
const AdminRepository = require('../repositories/admin.repository');

class AdminService {
    constructor(db) {
        this.repo = new AdminRepository(db);
    }

    async inviteStudent({ actor, studentEmail, registerNumber }) {
        if (!studentEmail || !registerNumber) {
            const err = new Error('studentEmail and registerNumber are required.');
            err.statusCode = 400;
            throw err;
        }

        const existing = await this.repo.getInviteByEmail(studentEmail);
        if (existing) {
            const err = new Error('Student already invited.');
            err.statusCode = 409;
            throw err;
        }

        const existingUser = await this.repo.getUserByEmail(studentEmail);
        if (existingUser) {
            const err = new Error('User is already registered in the system.');
            err.statusCode = 409;
            throw err;
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expires = new Date(Date.now() + 5 * 60 * 1000);

        await this.repo.insertStudentInvite({
            studentEmail,
            registerNumber,
            invitedBy: actor.userId,
            otpHash,
            expires,
        });

        await EmailService.sendOTP(studentEmail, otp);
        return { success: true, message: 'Invitation sent' };
    }
}

module.exports = AdminService;
