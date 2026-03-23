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

        const decodedToken = await admin.auth().verifyIdToken(token);

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
