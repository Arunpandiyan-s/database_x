const admin = require('../config/firebase');

/**
 * Verifies Firebase ID Token and injects Scope context into req.user
 */
const verifyFirebaseToken = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { pool } = require('../utils/transaction.util');

        // user_id is a custom claim set after registration.
        // New users (registered before claims were set) won't have it yet —
        // fall back to a DB lookup by firebase_uid.
        let dbUser = null;

        if (decodedToken.user_id) {
            // Fast path: custom claim already present
            dbUser = {
                id: decodedToken.user_id,
                level: decodedToken.level || 1,
                college_id: decodedToken.college_id || null,
                department_id: decodedToken.department_id || null,
                cluster_id: decodedToken.cluster_id || null,
            };
        } else {
            // Slow path: look up by firebase_uid then backfill custom claims
            const result = await pool.query(
                `SELECT u.id, u.college_id, u.department_id, u.cluster_id,
                        r.level, r.name AS role_name
                 FROM users u
                 JOIN roles r ON r.id = u.role_id
                 WHERE u.firebase_uid = $1 AND u.status = 'ACTIVE'`,
                [decodedToken.uid]
            );
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Unauthorized: User not found in system' });
            }
            dbUser = result.rows[0];

            // Backfill custom claims so next token refresh is fast
            admin.auth().setCustomUserClaims(decodedToken.uid, {
                user_id: dbUser.id,
                level: dbUser.level,
                college_id: dbUser.college_id,
                department_id: dbUser.department_id,
                cluster_id: dbUser.cluster_id,
            }).catch(() => { }); // fire-and-forget, don't block the request
        }

        // Always ensure we have the role name for string-based RBAC
        let roleName = dbUser.role_name;
        if (!roleName) {
            const roleRow = await pool.query(
                `SELECT r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
                [dbUser.id]
            );
            roleName = roleRow.rows[0]?.role_name || 'student';
        }

        req.user = {
            firebaseUid: decodedToken.uid,
            userId: dbUser.id,
            email: decodedToken.email,
            role: roleName,           // e.g. 'mentor', 'hod', 'admin'
            level: dbUser.level || 1, // numeric level for legacy authorize()
            collegeId: dbUser.college_id || null,
            departmentId: dbUser.department_id || null,
            clusterId: dbUser.cluster_id || null,
        };

        next();
    } catch (error) {
        console.error('Firebase Auth Error:', error.message);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};


/**
 * Numeric-based Role Authorization (legacy)
 * @param {number} minLevel - Minimum role level required
 */
const authorize = (minLevel) => {
    return (req, res, next) => {
        if (!req.user || req.user.level < minLevel) {
            return res.status(403).json({ success: false, message: 'Permission denied: Insufficient role level' });
        }
        next();
    };
};

/**
 * Role-name-based Authorization
 * Usage: authorizeRoles('admin', 'principal')
 * @param {...string} roles - Allowed role names
 */
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Permission denied. Required roles: [${roles.join(', ')}]`
            });
        }
        next();
    };
};

module.exports = {
    verifyFirebaseToken,
    authorize,
    authorizeRoles,
};
