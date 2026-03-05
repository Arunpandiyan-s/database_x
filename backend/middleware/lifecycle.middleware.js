const { pool } = require('../utils/transaction.util');

/**
 * Global Guard to block any operations from ARCHIVED users
 */
const blockArchivedUsers = async (req, res, next) => {
    if (!req.user || !req.user.userId) return next();

    try {
        const result = await pool.query(
            `SELECT status FROM users WHERE id = $1`,
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found in database' });
        }

        if (result.rows[0].status === 'ARCHIVED') {
            return res.status(403).json({ error: 'Forbidden: Account is archived. Operations blocked.' });
        }

        if (result.rows[0].status === 'SUSPENDED') {
            return res.status(403).json({ error: 'Forbidden: Account is suspended.' });
        }

        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Reusable guard to prevent mutating resources when they reach a terminal state 
 * (Though Service layer enforces the actual state machine, this can fast-fail obviously illegal requests)
 */
const requireValidProfileStateForEdit = async (req, res, next) => {
    try {
        const { studentId } = req.user;
        if (!studentId) return res.status(400).json({ error: 'Not a student' });

        const result = await pool.query(
            `SELECT status FROM student_profiles WHERE student_id = $1 AND status != 'ARCHIVED'`,
            [studentId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });

        const status = result.rows[0].status;
        if (status === 'LOCKED') {
            return res.status(409).json({ error: 'Conflict: Profile is locked and cannot be edited without Mentor approval' });
        }

        next();
    } catch (err) {
        next(err);
    }
}

module.exports = {
    blockArchivedUsers,
    requireValidProfileStateForEdit
};
