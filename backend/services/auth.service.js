const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const AuthRepository = require('../repositories/auth.repository');
const EmailService = require('./email.service');
const { withTransactionRetry } = require('../utils/transaction.util');

class AuthService {
    constructor(db) {
        this.repo = new AuthRepository(db);
    }

    // Supports BOTH modes for backward compatibility:
    // 1) email+password (frontend expects this)
    // 2) Firebase Bearer token (legacy)
    async login({ email, password, bearerToken }) {
        // Prefer email/password if present (prevents stale Bearer tokens from hijacking login).
        if (email && password) {
            const user = await this.repo.findUserAuthByEmail(email);
            if (!user || !user.passwordHash) {
                const err = new Error('Invalid credentials');
                err.statusCode = 401;
                throw err;
            }

            const match = await bcrypt.compare(password, user.passwordHash);
            if (!match) {
                const err = new Error('Invalid credentials');
                err.statusCode = 401;
                throw err;
            }

            if (user.status !== 'ACTIVE') {
                const err = new Error(`Account is ${user.status}.`);
                err.statusCode = 403;
                throw err;
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.activeEmail || user.email,
                    role: user.roleName,
                    level: user.roleLevel,
                },
            };
        }

        if (bearerToken) {
            const admin = require('../config/firebase');
            const decoded = await admin.auth().verifyIdToken(bearerToken);
            const user = await this.repo.findUserByFirebaseUid(decoded.uid);
            if (!user) {
                const err = new Error('User not found in system. Contact your administrator.');
                err.statusCode = 404;
                throw err;
            }
            if (user.status !== 'ACTIVE') {
                const err = new Error(`Account is ${user.status}. Contact your administrator.`);
                err.statusCode = 403;
                throw err;
            }
            return {
                id: user.id,
                userId: user.id,
                email: user.activeEmail,
                name: decoded.name || user.activeEmail.split('@')[0],
                role: user.roleName,
                level: user.roleLevel,
                campusId: user.collegeId,
                collegeId: user.collegeId,
                departmentId: user.departmentId,
                clusterId: user.clusterId,
            };
        }

        const err = new Error('Email/password or Bearer token is required.');
        err.statusCode = 400;
        throw err;
    }


    async localLogin({ email, password, role }) {
        if (!email || !password) {
            const err = new Error('Email and password are required.');
            err.statusCode = 400;
            throw err;
        }

        // admission_prospects (students)
        if (role === 'student') {
            const p = await this.repo.findAdmissionProspectByEmail(email);
            if (p?.tempPassword && p.tempPassword === password) {
                return {
                    success: true,
                    requirePasswordChange: true,
                    user: { id: p.id, name: p.name, email: p.email, role: 'student', status: p.status },
                };
            }
        }

        const user = await this.repo.findUserAuthByEmail(email);
        if (user?.passwordHash) {
            const match = await bcrypt.compare(password, user.passwordHash);
            if (match) {
                if (user.status !== 'ACTIVE') {
                    const err = new Error(`Account is ${user.status}.`);
                    err.statusCode = 403;
                    throw err;
                }
                return {
                    success: true,
                    user: { id: user.id, email: user.email, role: user.roleName, level: user.roleLevel },
                };
            }
        }

        const err = new Error('Invalid credentials');
        err.statusCode = 401;
        throw err;
    }

    async sendEmailOtp({ email }) {
        if (!email) {
            const err = new Error('Email is required.');
            err.statusCode = 400;
            throw err;
        }

        await this.repo.ensureInviteRowForEmail(email);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expires = new Date(Date.now() + 5 * 60 * 1000);

        await this.repo.updateInviteOtp(email, otpHash, expires);
        await EmailService.sendOTP(email, otp);

        return { success: true, message: 'OTP sent successfully.' };
    }

    async verifyEmailOtp({ email, otp }) {
        if (!email || !otp) {
            const err = new Error('Email and OTP are required.');
            err.statusCode = 400;
            throw err;
        }

        const invite = await this.repo.getInviteByEmail(email);
        if (!invite) {
            const err = new Error('This email is not registered by the institution.');
            err.statusCode = 403;
            throw err;
        }

        if (!invite.otpHash || (invite.otpExpires && new Date() > new Date(invite.otpExpires))) {
            const err = new Error('Invalid or expired OTP.');
            err.statusCode = 400;
            throw err;
        }

        const isValid = await bcrypt.compare(String(otp), invite.otpHash);
        if (!isValid) {
            const err = new Error('Invalid or expired OTP.');
            err.statusCode = 400;
            throw err;
        }

        await this.repo.markInviteVerified(email);
        return { success: true, message: 'OTP verified successfully.' };
    }

    // Admin invite student (new canonical location; existing /admin/invite-student still works)
    async inviteStudent({ studentEmail, registerNumber, name, departmentId, collegeId }, reqUser) {
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

        const existingUser = await this.repo.findUserAuthByEmail(studentEmail);
        if (existingUser) {
            const err = new Error('User is already registered in the system.');
            err.statusCode = 409;
            throw err;
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expires = new Date(Date.now() + 5 * 60 * 1000);

        const invite = await this.repo.createAdminInvite({
            studentEmail,
            registerNumber,
            invitedBy: reqUser.userId,
            otpHash,
            otpExpires: expires,
            name,
            departmentId,
            collegeId,
        });

        await EmailService.sendOTP(studentEmail, otp);
        return { success: true, message: 'Invitation sent', data: invite };
    }

    async registerStudent(payload) {
        const {
            firstName, lastName, initial,
            studentEmail, parentEmail, relationship,
            password,
            firebaseUid,
        } = payload;

        const email = studentEmail || payload.email;
        if (!email) {
            const err = new Error('Student email is required.');
            err.statusCode = 400;
            throw err;
        }

        const invite = await this.repo.getInviteByEmail(email);
        if (!invite || !invite.verified) {
            const err = new Error('Email not verified or not invited.');
            err.statusCode = 403;
            throw err;
        }

        const registerNumber = invite.registerNumber;
        const name = [firstName, lastName, initial].filter(Boolean).join(' ');

        const studentRole = await this.repo.getRoleByName('student');
        if (!studentRole) {
            const err = new Error("Role 'student' not found in system.");
            err.statusCode = 500;
            throw err;
        }

        const parentRole = await this.repo.getRoleByName('parent');

        const admin = require('../config/firebase');
        let fbUid = firebaseUid;
        const pwd = password || crypto.randomBytes(8).toString('hex');

        if (!fbUid) {
            try {
                const firebaseUser = await admin.auth().createUser({
                    email,
                    password: pwd,
                    displayName: name || email.split('@')[0],
                });
                fbUid = firebaseUser.uid;
            } catch (fbErr) {
                if (fbErr.code === 'auth/email-already-exists') {
                    const existingUser = await admin.auth().getUserByEmail(email);
                    fbUid = existingUser.uid;
                } else {
                    const err = new Error(fbErr.message);
                    err.statusCode = 400;
                    throw err;
                }
            }
        }

        const { pool } = require('../utils/transaction.util');
        const result = await withTransactionRetry(async (client) => {
            const user = await this.repo.upsertUserByEmail({
                email,
                firebaseUid: fbUid,
                roleId: studentRole.id,
                status: 'ACTIVE',
            }, client);

            await this.repo.ensureStudentProfile({ studentId: user.id, name, registerNumber }, client);

            if (parentEmail && parentRole?.id) {
                const parentId = await this.repo.ensurePendingParentUser({ email: parentEmail, roleId: parentRole.id }, client);
                await this.repo.linkParentStudent({ parentId, studentId: user.id, relationship }, client);
            }

            return { user, role: studentRole.name };
        });

        // Set custom claims for faster middleware lookup
        admin.auth().setCustomUserClaims(fbUid, {
            user_id: result.user.id,
            level: studentRole.level,
        }).catch(() => { });

        return {
            success: true,
            id: result.user.id,
            userId: result.user.id,
            email: result.user.activeEmail,
            name: name || result.user.activeEmail.split('@')[0],
            role: result.role,
        };
    }

    async forgotPassword({ email, frontendBaseUrl }) {
        if (!email) {
            const err = new Error('Email is required');
            err.statusCode = 400;
            throw err;
        }

        const link = `${frontendBaseUrl || 'http://localhost:5173'}/change-password?email=${encodeURIComponent(email)}&mode=reset`;
        await EmailService.sendPasswordReset(email, link);
        return { message: 'Password reset instructions sent' };
    }

    async verifyToken({ token }) {
        if (!token) {
            const err = new Error('Unauthorized');
            err.statusCode = 401;
            throw err;
        }
        const admin = require('../config/firebase');
        try {
            const decoded = await admin.auth().verifyIdToken(token);
            return { valid: true, uid: decoded.uid };
        } catch {
            const err = new Error('Invalid token');
            err.statusCode = 401;
            throw err;
        }
    }

    async sendAdmissionCredentials({ email, name, tempPassword }) {
        if (!email || !name || !tempPassword) {
            const err = new Error('email, name, and tempPassword are required');
            err.statusCode = 400;
            throw err;
        }
        await EmailService.sendAdmissionCredentials(email, name, tempPassword);
        return { success: true, message: 'Admission credentials sent successfully' };
    }

    async addAdmissionProspect({ name, email, tempPassword }) {
        if (!name || !email || !tempPassword) {
            const err = new Error('name, email, and tempPassword are required');
            err.statusCode = 400;
            throw err;
        }

        const admin = require('../config/firebase');
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().createUser({
                email,
                password: tempPassword,
                displayName: name
            });
        } catch (fbErr) {
            if (fbErr.code === 'auth/email-already-exists') {
                firebaseUser = await admin.auth().getUserByEmail(email);
                await admin.auth().updateUser(firebaseUser.uid, { password: tempPassword });
            } else {
                const err = new Error(`Firebase account creation failed: ${fbErr.message}`);
                err.statusCode = 500;
                throw err;
            }
        }

        const studentRole = await this.repo.getRoleByName('student');
        if (!studentRole) {
            const err = new Error("Student role not configured in DB.");
            err.statusCode = 500;
            throw err;
        }
        
        let prospect = null;
        let insertedUserId = null;

        try {
            // ✅ 1. Execute DB Operations Inside Atomically Managed Transaction 
            await withTransactionRetry(async (client) => {
                const userRes = await client.query(`
                    INSERT INTO users (
                        firebase_uid, email, active_email, role_id, status
                    )
                    VALUES ($1, $2, $2, $3, 'ACTIVE')
                    ON CONFLICT (active_email) DO UPDATE SET 
                        firebase_uid = EXCLUDED.firebase_uid,
                        status = 'ACTIVE'
                    RETURNING id
                `, [firebaseUser.uid, email, studentRole.id]);
                
                insertedUserId = userRes.rows[0].id;
                prospect = await this.repo.upsertAdmissionProspect({ name, email, tempPassword }, client);
            });
        } catch (dbErr) {
            // DB Transaction Failed -> Cleanup Firebase artifact to prevent ghost accounts
            admin.auth().deleteUser(firebaseUser.uid).catch(() => {});
            
            const err = new Error(`Database synchronization failed. Action reverted. Details: ${dbErr.message}`);
            err.statusCode = 500;
            throw err;
        }

        // ✅ 2. Attach Custom Claims 
        try {
            await admin.auth().setCustomUserClaims(firebaseUser.uid, {
                user_id: insertedUserId,
                level: studentRole.level,
            });
        } catch (e) {
            console.error("Failed to set Firebase custom claims", e);
        }

        // ✅ 3. Send Email AFTER Guaranteed DB Commit
        let emailWarning = null;
        try {
            await EmailService.sendAdmissionCredentials(email, name, tempPassword);
        } catch (emailErr) {
            console.error("Email sending failed but DB succeeded:", emailErr.message);
            emailWarning = "Prospect saved successfully, but email dispatch failed.";
        }

        return { success: true, prospect, warning: emailWarning };
    }

    async listAdmissionProspects() {
        const prospects = await this.repo.listPendingAdmissionProspects();
        return { success: true, prospects };
    }

    async approveAdmissionProspect({ id, department, mentorId }) {
        if (!department) {
            const err = new Error('department is required');
            err.statusCode = 400;
            throw err;
        }

        const { pool } = require('../utils/transaction.util');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Update the prospect record
            const updateRes = await client.query(
                `UPDATE admission_prospects
                 SET status = 'active', department = $1, mentor_id = $2
                 WHERE id = $3
                 RETURNING *`,
                [department, mentorId || null, id]
            );
            if (updateRes.rows.length === 0) {
                await client.query('ROLLBACK');
                const err = new Error('Prospect not found');
                err.statusCode = 404;
                throw err;
            }
            const approved = updateRes.rows[0];

            // 2. If a mentor was specified AND student has a user account, create mentor_mapping
            if (mentorId) {
                const userRes = await client.query(
                    `SELECT id FROM users WHERE email = $1 OR active_email = $1 LIMIT 1`,
                    [approved.email]
                );
                if (userRes.rows.length > 0) {
                    const studentId = userRes.rows[0].id;
                    await client.query(
                        `INSERT INTO mentor_mappings (student_id, mentor_id, active)
                         VALUES ($1, $2, true)
                         ON CONFLICT (student_id) DO UPDATE
                           SET mentor_id = EXCLUDED.mentor_id, active = true`,
                        [studentId, mentorId]
                    );
                    await client.query(
                        `UPDATE student_profiles SET mentor_id = $1, updated_at = NOW()
                         WHERE student_id = $2`,
                        [mentorId, studentId]
                    );
                }
            }

            await client.query('COMMIT');
            return { success: true, prospect: approved };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async registerStaff({ email, password, firstName, lastName, role }) {
        if (!email || !role) {
            const err = new Error('Email and Role are required.');
            err.statusCode = 400;
            throw err;
        }

        const verified = await this.repo.isInviteVerified(email);
        if (!verified) {
            const err = new Error('Email not verified or OTP expired.');
            err.statusCode = 403;
            throw err;
        }

        const roleRow = await this.repo.getRoleByName(role);
        if (!roleRow) {
            const err = new Error(`Role ${role} not found in database.`);
            err.statusCode = 400;
            throw err;
        }

        const admin = require('../config/firebase');
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUserByEmail(email);
        } catch (err) {
            if (err.code === 'auth/user-not-found') {
                firebaseUser = await admin.auth().createUser({
                    email,
                    password,
                    displayName: `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
                });
            } else {
                throw err;
            }
        }

        const user = await this.repo.upsertUserByEmail({
            email,
            firebaseUid: firebaseUser.uid,
            roleId: roleRow.id,
            status: 'ACTIVE',
        });

        admin.auth().setCustomUserClaims(firebaseUser.uid, {
            user_id: user.id,
            level: roleRow.level,
        }).catch(() => { });

        return { success: true, message: 'Staff registered successfully', userId: user.id };
    }

    async changePassword({ email, newPassword }) {
        if (!email || !newPassword) {
            const err = new Error('Email and new password are required.');
            err.statusCode = 400;
            throw err;
        }

        const admin = require('../config/firebase');
        try {
            const fbUser = await admin.auth().getUserByEmail(email);
            await admin.auth().updateUser(fbUser.uid, { password: newPassword });
        } catch {
            // ignore; DB-only accounts handled below
        }

        const hash = await bcrypt.hash(newPassword, 10);
        await this.repo.updateUserPasswordHash(email, hash);
        await this.repo.clearAdmissionProspectTempPassword(email);

        return { success: true, message: 'Password updated successfully' };
    }
}

module.exports = AuthService;
