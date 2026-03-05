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
        const result = await pool.query(
            `SELECT u.id, u.email, u.active_email, u.status, u.college_id,
                    u.department_id, u.cluster_id, u.role_id,
                    r.name AS role_name, r.level AS role_level
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.firebase_uid = $1`,
            [decoded.uid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found in system. Contact your administrator.' });
        }

        const user = result.rows[0];

        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: `Account is ${user.status}. Contact your administrator.` });
        }

        return res.json({
            userId: user.id,
            email: user.active_email,
            role: user.role_name,
            level: user.role_level,
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
 * POST /api/v1/auth/register
 *
 * Public endpoint — creates a new Firebase Auth user, then inserts their
 * profile into the `users` table.
 *
 * Body: { email, password, name, role? }
 *   role defaults to 'student' if not supplied.
 *
 * Returns the same shape as /login so the frontend can immediately set
 * AuthContext state after a successful sign-up.
 */
router.post('/register', async (req, res, next) => {
    try {
        const admin = require('../config/firebase');
        const { pool } = require('../utils/transaction.util');

        const { email, password, name, role: requestedRole } = req.body;

        // ── Basic validation ──────────────────────────────────────────────────
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }

        // ── Resolve role ──────────────────────────────────────────────────────
        // Only 'student' is self-registerable. Other roles must be created by an admin.
        const allowedSelfRegisterRoles = ['student'];
        const roleName = allowedSelfRegisterRoles.includes(requestedRole) ? requestedRole : 'student';

        // Look up the role row so we get its id and level
        const roleResult = await pool.query(
            `SELECT id, name, level FROM roles WHERE name = $1 LIMIT 1`,
            [roleName]
        );
        if (roleResult.rows.length === 0) {
            return res.status(500).json({ error: `Role '${roleName}' not found in system. Contact your administrator.` });
        }
        const roleRow = roleResult.rows[0];

        // ── Create Firebase Auth user ─────────────────────────────────────────
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().createUser({
                email,
                password,
                displayName: name || email.split('@')[0],
            });
        } catch (fbErr) {
            // Map Firebase error codes to user-friendly messages
            const firebaseErrorMap = {
                'auth/email-already-exists': 'An account with this email already exists.',
                'auth/invalid-email': 'The email address is not valid.',
                'auth/weak-password': 'Password is too weak. Use at least 8 characters.',
            };
            const message = firebaseErrorMap[fbErr.code] || fbErr.message;
            return res.status(409).json({ error: message });
        }

        // ── Insert user into PostgreSQL ───────────────────────────────────────
        try {
            const insertResult = await pool.query(
                `INSERT INTO users (firebase_uid, email, active_email, role_id, status)
                 VALUES ($1, $2, $2, $3, 'ACTIVE')
                 RETURNING id, email, active_email, status, college_id, department_id, cluster_id, role_id`,
                [firebaseUser.uid, email, roleRow.id]
            );

            const user = insertResult.rows[0];

            return res.status(201).json({
                userId: user.id,
                email: user.active_email,
                role: roleRow.name,
                level: roleRow.level,
                collegeId: user.college_id,
                departmentId: user.department_id,
                clusterId: user.cluster_id,
            });

        } catch (dbErr) {
            // If DB insert fails, clean up the Firebase user to avoid orphaned accounts
            await admin.auth().deleteUser(firebaseUser.uid).catch(() => { });

            if (dbErr.code === '23505') {
                // Unique constraint — email already in users table
                return res.status(409).json({ error: 'An account with this email already exists.' });
            }
            throw dbErr; // pass to central error handler
        }

    } catch (err) {
        next(err);
    }
});

/**
 * Catch-all for any unmatched requests inside /api/v1/auth/*
 * IMPORTANT: This must be the LAST route in this file.
 */
router.all('/{*splat}', (req, res) => {
    res.status(404).json({
        error: 'Auth route not found',
        attempted: `${req.method} /api/v1/auth${req.path}`,
        availableRoutes: [
            'GET  /api/v1/auth',
            'GET  /api/v1/auth/ping',
            'POST /api/v1/auth/login',
            'POST /api/v1/auth/register',
        ]
    });
});

module.exports = router;
