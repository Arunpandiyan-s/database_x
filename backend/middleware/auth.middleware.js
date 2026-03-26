const admin = require('../config/firebase');

/**
 * Verifies Firebase ID Token and injects Scope context into req.user
 */
async function verifyFirebaseToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        let decodedToken;
        
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (error) {
            console.error("Firebase token validation failed:", error.message);
            // Proper error handling for expired or invalid tokens
            if (error.code === 'auth/id-token-expired') {
                return res.status(401).json({ message: "Token expired", code: "auth/id-token-expired" });
            }
            return res.status(401).json({ message: "Invalid token" });
        }

        // Fetch User role/level from DB if not present
        if (!decodedToken.role || !decodedToken.level) {
            const { pool } = require('../utils/transaction.util');
            let dbRes = await pool.query(
                `SELECT u.id, r.name as role, r.level 
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE u.firebase_uid = $1`, 
                 [decodedToken.uid || decodedToken.user_id]
            );
            
            if (dbRes.rows.length === 0 && decodedToken.email) {
                // Fallback for newly created local accounts that haven't linked firebase_uid yet
                dbRes = await pool.query(
                    `SELECT u.id, r.name as role, r.level 
                     FROM users u 
                     JOIN roles r ON u.role_id = r.id 
                     WHERE u.active_email = $1 OR u.email = $1`, 
                     [decodedToken.email]
                );
                
                // Optional: Auto-link firebase_uid here if we wanted to
                if (dbRes.rows.length > 0) {
                     await pool.query(
                         `UPDATE users SET firebase_uid = $1 WHERE id = $2 AND firebase_uid IS NULL`,
                         [decodedToken.uid, dbRes.rows[0].id]
                     );
                }
            }
            
            if (dbRes.rows.length > 0) {
                decodedToken.user_id = dbRes.rows[0].id;
                decodedToken.role = dbRes.rows[0].role;
                decodedToken.level = dbRes.rows[0].level;
            } else {
                return res.status(403).json({ message: "User mapped to this token was not found in database." });
            }
        }

        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        return res.status(401).json({ message: "Invalid token" });
    }
}


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

const SUPPORTED_ROLES = [
    'student', 'mentor', 'class_advisor', 'hod', 'cluster_hod',
    'vice_principal', 'principal', 'technical_director', 'admin', 'parent'
];

module.exports = {
    verifyFirebaseToken,
    authorize,
    authorizeRoles,
    SUPPORTED_ROLES,
};
