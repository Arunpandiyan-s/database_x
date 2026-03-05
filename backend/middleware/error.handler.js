const { TransientTransactionError, DeterministicConflictError } = require('../utils/transaction.util');

class InvalidStateTransitionError extends DeterministicConflictError {
    constructor(message) {
        super(message);
        this.name = 'InvalidStateTransitionError';
    }
}

class ScopeViolationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ScopeViolationError';
    }
}

/**
 * Central Error Classification mapping into fixed semantic codes
 */
const errorHandler = (err, req, res, next) => {
    console.error('[Error Logger]', err);

    if (err instanceof InvalidStateTransitionError || err instanceof DeterministicConflictError) {
        return res.status(409).json({ error: 'Conflict', message: err.message });
    }

    if (err instanceof ScopeViolationError) {
        return res.status(403).json({ error: 'Forbidden', message: err.message });
    }

    if (err instanceof TransientTransactionError) {
        return res.status(503).json({ error: 'Service Unavailable', message: err.message });
    }

    // Postgres Check Constraint Violations
    if (err.code === '23514') {
        return res.status(409).json({ error: 'Conflict', message: 'Database constraint violation (Invalid status or action)' });
    }

    // Postgres Unique Constraint Violations
    if (err.code === '23505') {
        return res.status(409).json({ error: 'Conflict', message: 'Resource already exists or active mapping constraint violated' });
    }

    return res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected database or systemic error occurred' });
};

module.exports = {
    errorHandler,
    InvalidStateTransitionError,
    ScopeViolationError
};
