const express = require('express');
const router = express.Router();

/**
 * GET /api/v1/auth
 * Root info — must be declared here so it is caught by authRoutes and does NOT
 * fall through to the global verifyFirebaseToken guard.
 */
router.get('/', (_req, res) => {
    res.json({
        service: 'Auth Service',
        endpoints: {
            ping: 'GET  /api/v1/auth/ping   — health check',
            login: 'POST /api/v1/auth/login  — exchange Firebase ID token for user profile'
        }
    });
});

/**
 * POST /api/v1/auth/send-admission-credentials
 * Sends the auto-generated passkey to the admission student via EmailService.
 */
router.post('/send-admission-credentials', async (req, res, next) => {
    try {
        const EmailService = require('../services/email.service');
        const { email, name, tempPassword } = req.body;
        
        if (!email || !tempPassword || !name) {
            return res.status(400).json({ error: 'Email, name, and temporary password are required.' });
        }

        await EmailService.sendAdmissionCredentials(email, name, tempPassword);

        return res.json({ success: true, message: 'Admission credentials sent successfully.' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/admission-prospects
 * Add a new admission prospect to the database
 */
router.post('/admission-prospects', async (req, res, next) => {
    try {
        const { pool } = require('../utils/transaction.util');
        const { name, email, tempPassword } = req.body;

        if (!name || !email || !tempPassword) {
            return res.status(400).json({ error: 'Name, email, and temp password are required.' });
        }

        const result = await pool.query(
            `INSERT INTO admission_prospects (name, email, temp_password, status)
             VALUES ($1, $2, $3, 'pending_admin_approval')
             ON CONFLICT (email) DO UPDATE SET temp_password = EXCLUDED.temp_password
             RETURNING id, name, email, temp_password, status, department, created_at`,
            [name, email, tempPassword]
        );

        res.json({ success: true, prospect: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/auth/admission-prospects
 * Get pending admission prospects
 */
router.get('/admission-prospects', async (req, res, next) => {
    try {
        const { pool } = require('../utils/transaction.util');
        
        const result = await pool.query(
            `SELECT id, name, email, temp_password AS "tempPassword", status, department, created_at AS "createdAt"
             FROM admission_prospects
             WHERE status = 'pending_admin_approval'`
        );

        res.json({ success: true, prospects: result.rows });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/admission-prospects/:id/approve
 * Admin approves a prospect and assigns department
 */
router.post('/admission-prospects/:id/approve', async (req, res, next) => {
    try {
        const { pool } = require('../utils/transaction.util');
        const { department } = req.body;
        const prospectId = req.params.id;

        if (!department) {
            return res.status(400).json({ error: 'Department is required for approval.' });
        }

        const result = await pool.query(
            `UPDATE admission_prospects
             SET status = 'active', department = $1
             WHERE id = $2
             RETURNING id, name, email, temp_password, status, department, created_at`,
            [department, prospectId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Prospect not found.' });
        }

        res.json({ success: true, prospect: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/v1/auth/login
 * Friendly message when browser hits this URL directly — it is POST-only.
 */
router.get('/login', (_req, res) => {
    res.status(405).json({
        error: 'Method Not Allowed',
        message: '/api/v1/auth/login only accepts POST requests.',
        usage: {
            method: 'POST',
            headers: { Authorization: 'Bearer <Firebase ID Token>' },
            description: 'Sign in via Firebase Client SDK on the frontend, then POST the ID token here to get your user profile.'
        }
    });
});

/**
 * POST /api/v1/auth/login
 *
 * Public endpoint — no Firebase token required here at the route level.
 * The token is read and verified manually inside the handler.
 *
 * Flow:
 *   1. Frontend signs in via Firebase (email/password, Google, etc.)
 *   2. Frontend sends the Firebase ID token in the Authorization header
 *   3. This endpoint verifies the token and returns user profile from DB
 */
router.post('/login', async (req, res, next) => {
    try {
        const admin = require('../config/firebase');
        const { pool } = require('../utils/transaction.util');

        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        // Verify the Firebase ID token
        const decoded = await admin.auth().verifyIdToken(token);

        // Fetch full user profile from database using the Firebase UID
        let result = await pool.query(
            `SELECT u.id, u.email, u.active_email, u.status, u.college_id,
                    u.department_id, u.cluster_id, u.role_id,
                    r.name AS role_name, r.level AS role_level, u.firebase_uid
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.firebase_uid = $1`,
            [decoded.uid]
        );

        // If not found by firebase_uid, try finding by email (for pre-registered staff or students)
        if (result.rows.length === 0 && decoded.email) {
            result = await pool.query(
                `SELECT u.id, u.email, u.active_email, u.status, u.college_id,
                        u.department_id, u.cluster_id, u.role_id,
                        r.name AS role_name, r.level AS role_level, u.firebase_uid
                 FROM users u
                 JOIN roles r ON r.id = u.role_id
                 WHERE u.active_email = $1 OR u.email = $1`,
                [decoded.email]
            );

            if (result.rows.length > 0) {
                const userToLink = result.rows[0];
                if (!userToLink.firebase_uid) {
                    // Link the newly authenticated Firebase UID to the pre-existing database user
                    await pool.query(
                        `UPDATE users SET firebase_uid = $1 WHERE id = $2`,
                        [decoded.uid, userToLink.id]
                    );
                } else if (userToLink.firebase_uid !== decoded.uid) {
                    return res.status(403).json({ error: 'This email is already linked to another authentication provider.' });
                }
            }
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found in system. Contact your administrator.' });
        }

        const user = result.rows[0];

        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: `Account is ${user.status}. Contact your administrator.` });
        }

        return res.json({
            id: user.id,
            userId: user.id,
            email: user.active_email,
            name: decoded.name || user.active_email.split('@')[0],
            role: user.role_name,
            level: user.role_level,
            campusId: user.college_id,
            collegeId: user.college_id,
            departmentId: user.department_id,
            clusterId: user.cluster_id
        });

    } catch (err) {
        if (err.code === 'auth/argument-error' || err.code === 'auth/id-token-expired') {
            return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
        }
        next(err);
    }
});

/**
 * GET /api/v1/auth/ping
 * Quick public health-check for the auth subsystem.
 */
router.get('/ping', (_req, res) => {
    res.json({ status: 'auth-service online' });
});

/**
 * POST /api/v1/auth/send-email-otp
 * Generates an OTP for an invited email and sends it.
 */
router.post('/send-email-otp', async (req, res, next) => {
    try {
        const { pool } = require('../utils/transaction.util');
        const EmailService = require('../services/email.service');
        const bcrypt = require('bcryptjs');

        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required.' });

        // Check if email is in student_invites
        const inviteResult = await pool.query(
            `SELECT id FROM student_invites WHERE student_email = $1`,
            [email]
        );

        // For now, allow ANY email to receive OTP during prototype testing
        // You could uncomment this block to restrict registration to invited only
        /*
        const inviteResult = await pool.query(
            `SELECT id FROM student_invites WHERE student_email = $1`,
            [email]
        );

        if (inviteResult.rows.length === 0) {
            return res.status(403).json({ error: 'This email is not registered by the institution.' });
        }
        */

        // Upsert into student_invites for tracking the OTP
        await pool.query(
            `INSERT INTO student_invites (id, student_email, register_number)
             VALUES (gen_random_uuid(), $1, 'PENDING')
             ON CONFLICT (student_email) DO NOTHING`,
            [email]
        );

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);

        // 5 minutes expiry
        const expires = new Date(Date.now() + 5 * 60 * 1000);

        await pool.query(
            `UPDATE student_invites 
             SET otp_hash = $1, otp_expires = $2 
             WHERE student_email = $3`,
            [otpHash, expires, email]
        );

        await EmailService.sendOTP(email, otp);

        res.json({ success: true, message: 'OTP sent successfully.' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/verify-email-otp
 * Verifies the OTP sent to the email.
 */
router.post('/verify-email-otp', async (req, res, next) => {
    try {
        const { pool } = require('../utils/transaction.util');
        const bcrypt = require('bcryptjs');

        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

        const inviteResult = await pool.query(
            `SELECT otp_hash, otp_expires FROM student_invites WHERE student_email = $1`,
            [email]
        );

        if (inviteResult.rows.length === 0) {
            return res.status(403).json({ error: 'This email is not registered by the institution.' });
        }

        const invite = inviteResult.rows[0];

        if (!invite.otp_hash || new Date() > new Date(invite.otp_expires)) {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }

        const isValid = await bcrypt.compare(otp.toString(), invite.otp_hash);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }

        // Mark as verified
        await pool.query(
            `UPDATE student_invites SET verified = true WHERE student_email = $1`,
            [email]
        );

        res.json({ success: true, message: 'OTP verified successfully.' });
    } catch (err) {
        next(err);
    }
});

// Admission routes moved to top

/**
 * POST /api/v1/auth/local-login
 * Direct email/password authentication against the database.
 */
router.post('/local-login', async (req, res, next) => {
    try {
        const { pool } = require('../utils/transaction.util');
        const bcrypt = require('bcryptjs');
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // 1. Check admission_prospects (Students with temp password)
        if (role === 'student') {
            const prospectRes = await pool.query(
                `SELECT id, name, email, temp_password, status, department 
                 FROM admission_prospects WHERE email = $1`,
                [email]
            );
            if (prospectRes.rows.length > 0) {
                const p = prospectRes.rows[0];
                if (p.temp_password === password) {
                    return res.json({
                        success: true,
                        requirePasswordChange: true,
                        user: {
                            id: p.id,
                            name: p.name,
                            email: p.email,
                            role: 'student',
                            status: p.status
                        }
                    });
                }
            }
        }

        // 2. Check users table
        const userRes = await pool.query(
            `SELECT u.id, u.email, u.password_hash, r.name AS role_name, r.level AS role_level, u.status
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.email = $1 OR u.active_email = $1`,
            [email]
        );

        if (userRes.rows.length > 0) {
            const user = userRes.rows[0];
            if (user.password_hash) {
                const match = await bcrypt.compare(password, user.password_hash);
                if (match) {
                    if (user.status !== 'ACTIVE') {
                        return res.status(403).json({ error: `Account is ${user.status}.` });
                    }
                    return res.json({
                        success: true,
                        user: {
                            id: user.id,
                            email: user.email,
                            role: user.role_name,
                            level: user.role_level
                        }
                    });
                }
            }
        }

        return res.status(401).json({ success: false, error: 'Invalid credentials' });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/change-password
 * Updates password in both Firebase and database.
 */
router.post('/change-password', async (req, res, next) => {
    try {
        const { pool } = require('../utils/transaction.util');
        const admin = require('../config/firebase');
        const bcrypt = require('bcryptjs');
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ error: 'Email and new password are required.' });
        }

        // 1. Update Firebase
        try {
            const fbUser = await admin.auth().getUserByEmail(email);
            await admin.auth().updateUser(fbUser.uid, { password: newPassword });
        } catch (fbErr) {
            console.error('Firebase password update failed:', fbErr.message);
            // If they are only in DB (prospects), we handle it below
        }

        // 2. Update DB password_hash
        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            `UPDATE users SET password_hash = $1 WHERE email = $2 OR active_email = $2`,
            [hash, email]
        );

        // 3. If in admission_prospects, clear temp_password and set final password field if exists
        // (Assuming we might want to store it there too or just rely on users table once approved)
        await pool.query(
            `UPDATE admission_prospects SET temp_password = NULL WHERE email = $1`,
            [email]
        );

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        next(err);
    }
});

router.post('/register-student', async (req, res, next) => {
    try {
        const admin = require('../config/firebase');
        const { pool } = require('../utils/transaction.util');
        const crypto = require('crypto');

        // frontend sends: firstName, lastName, initial, studentEmail, parentEmail, relationship
        const { firstName, lastName, initial, studentEmail, parentEmail, relationship, password } = req.body;

        // Use studentEmail as the main email if present
        const email = studentEmail || req.body.email;

        if (!email) {
            return res.status(400).json({ error: 'Student email is required.' });
        }

        // Verify the email was actually invited and OTP verified
        const inviteResult = await pool.query(
            `SELECT register_number, verified FROM student_invites WHERE student_email = $1`,
            [email]
        );

        if (inviteResult.rows.length === 0 || !inviteResult.rows[0].verified) {
            return res.status(403).json({ error: 'Email not verified or not invited.' });
        }

        const registerNumber = inviteResult.rows[0].register_number;
        const name = [firstName, lastName, initial].filter(Boolean).join(' ');

        // ── Resolve roles ──────────────────────────────────────────────────────
        const roleResult = await pool.query(`SELECT id, name, level FROM roles WHERE name = 'student' LIMIT 1`);
        if (roleResult.rows.length === 0) {
            return res.status(500).json({ error: `Role 'student' not found in system.` });
        }
        const studentRoleRow = roleResult.rows[0];

        const parentRoleResult = await pool.query(`SELECT id FROM roles WHERE name = 'parent' LIMIT 1`);
        const parentRoleId = parentRoleResult.rows.length > 0 ? parentRoleResult.rows[0].id : null;

        // ── Use existing or create Firebase Auth user ───────────────────────
        let fbUid = req.body.firebaseUid;
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
                    // Try getting existing
                    const existingUser = await admin.auth().getUserByEmail(email);
                    fbUid = existingUser.uid;
                } else {
                    return res.status(400).json({ error: fbErr.message });
                }
            }
        }

        // ── Database Transaction ───────────────────────────────────────
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert student user
            const insertResult = await client.query(
                `INSERT INTO users (firebase_uid, email, active_email, role_id, status)
                 VALUES ($1, $2, $2, $3, 'ACTIVE')
                 ON CONFLICT (email) DO UPDATE SET firebase_uid = EXCLUDED.firebase_uid
                 RETURNING id, email, active_email, status, college_id, department_id, cluster_id, role_id`,
                [fbUid, email, studentRoleRow.id]
            );
            const user = insertResult.rows[0];

            // Create student_profile
            await client.query(
                `INSERT INTO student_profiles (student_id, name, register_number, status, profile_submitted, edit_request_pending)
                 VALUES ($1, $2, $3, 'DRAFT', false, false) ON CONFLICT (student_id) DO NOTHING`,
                [user.id, name, registerNumber]
            );

            // Handle parent linking if parentEmail is provided
            if (parentEmail && parentRoleId) {
                // Check if parent account exists in users table
                let parentUserRes = await client.query(`SELECT id FROM users WHERE email = $1`, [parentEmail]);
                let parentId;

                if (parentUserRes.rows.length === 0) {
                    // Create pending parent record so mapping can be established
                    const insertedParent = await client.query(
                        `INSERT INTO users (email, active_email, role_id, status)
                         VALUES ($1, $1, $2, 'PENDING')
                         RETURNING id`,
                        [parentEmail, parentRoleId]
                    );
                    parentId = insertedParent.rows[0].id;
                } else {
                    parentId = parentUserRes.rows[0].id;
                }

                // Map student and parent
                await client.query(
                    `INSERT INTO parent_student_mapping (parent_id, student_id, relationship, active)
                     VALUES ($1, $2, $3, true)
                     ON CONFLICT (parent_id, student_id) DO NOTHING`,
                    [parentId, user.id, relationship || 'guardain']
                );
            }

            await client.query('COMMIT');

            return res.status(201).json({
                success: true,
                id: user.id,
                userId: user.id,
                email: user.active_email,
                name: name || user.active_email.split('@')[0],
                role: studentRoleRow.name
            });

        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/v1/auth/forgot-password
 * Send a reset password email (usually handled by Firebase client SDK natively, but exposed here if server-side is needed)
 */
router.post('/forgot-password', async (req, res, next) => {
    try {
        const admin = require('../config/firebase');
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        // Send custom frontend link instead of Firebase default
        const link = `http://localhost:5173/change-password?email=${encodeURIComponent(email)}&mode=reset`;

        const EmailService = require('../services/email.service');
        await EmailService.sendPasswordReset(email, link);

        return res.json({ message: 'Password reset instructions sent' });
    } catch (err) {
        if (err.code === 'auth/user-not-found') {
            // Do not leak user existence
            return res.json({ message: 'Password reset instructions sent' });
        }
        next(err);
    }
});

/**
 * POST /api/v1/auth/verify
 * Dummy API if frontend is expecting an explicit verification call
 */
router.post('/verify', async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        const admin = require('../config/firebase');
        const decoded = await admin.auth().verifyIdToken(token);
        return res.json({ valid: true, uid: decoded.uid });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
});

/**
 * Catch-all for any unmatched requests inside /api/v1/auth/*
 */
router.all(/.*/, (req, res) => {
    res.status(404).json({
        error: 'Auth route not found',
        attempted: `${req.method} /api/v1/auth${req.path}`,
        availableRoutes: [
            'GET  /api/v1/auth',
            'GET  /api/v1/auth/ping',
            'POST /api/v1/auth/login',
            'POST /api/v1/auth/local-login',
            'POST /api/v1/auth/change-password',
            'POST /api/v1/auth/register-student',
            'POST /api/v1/auth/send-email-otp',
            'POST /api/v1/auth/verify-email-otp',
            'POST /api/v1/auth/send-admission-credentials',
            'POST /api/v1/auth/admission-prospects'
        ]
    });
});

/**
 * POST /api/v1/auth/register-staff
 */
router.post('/register-staff', async (req, res, next) => {
    try {
        const admin = require('../config/firebase');
        const { pool } = require('../utils/transaction.util');

        const { email, password, firstName, lastName, role } = req.body;

        if (!email || !role) {
            return res.status(400).json({ error: 'Email and Role are required.' });
        }

        // Verify OTP verified check
        const inviteResult = await pool.query(
            `SELECT verified FROM student_invites WHERE student_email = $1`,
            [email]
        );

        if (inviteResult.rows.length === 0 || !inviteResult.rows[0].verified) {
            return res.status(403).json({ error: 'Email not verified or OTP expired.' });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const roleResult = await client.query(
                `SELECT id, name FROM roles WHERE name = $1 LIMIT 1`,
                [role]
            );

            if (roleResult.rows.length === 0) {
                throw new Error(`Role ${role} not found in database.`);
            }

            const roleId = roleResult.rows[0].id;

            let firebaseUser;
            try {
                firebaseUser = await admin.auth().getUserByEmail(email);
            } catch (err) {
                if (err.code === 'auth/user-not-found') {
                    // Create in Firebase
                    firebaseUser = await admin.auth().createUser({
                        email,
                        password,
                        displayName: `${firstName} ${lastName || ''}`.trim()
                    });
                } else {
                    throw err;
                }
            }

            // check if user already exists
            const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
            if (existing.rows.length > 0) {
                await client.query(`UPDATE users SET firebase_uid = $1 WHERE email = $2`, [firebaseUser.uid, email]);
            } else {
                await client.query(
                    `INSERT INTO users (id, email, active_email, role_id, status, firebase_uid)
                     VALUES (gen_random_uuid(), $1, $1, $2, 'ACTIVE', $3)`,
                    [email, roleId, firebaseUser.uid]
                );
            }

            await client.query('COMMIT');
            res.json({ success: true, message: 'Staff user registered successfully.' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
