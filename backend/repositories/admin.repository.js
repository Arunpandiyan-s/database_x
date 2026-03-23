const { pool } = require('../utils/transaction.util');

class AdminRepository {
    constructor(db = pool) {
        this.db = db;
    }

    async getInviteByEmail(studentEmail) {
        const r = await this.db.query(
            `SELECT id FROM student_invites WHERE student_email = $1`,
            [studentEmail]
        );
        return r.rows[0] || null;
    }

    async getUserByEmail(email) {
        const r = await this.db.query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );
        return r.rows[0] || null;
    }

    async insertStudentInvite({ studentEmail, registerNumber, invitedBy, otpHash, expires }) {
        await this.db.query(
            `INSERT INTO student_invites (student_email, register_number, invited_by, otp_hash, otp_expires)
             VALUES ($1, $2, $3, $4, $5)`,
            [studentEmail, registerNumber, invitedBy, otpHash, expires]
        );
    }
}

module.exports = AdminRepository;
