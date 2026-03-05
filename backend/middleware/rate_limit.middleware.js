const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Rate Limiting (Operationally Defined in Plan)
// Standard Auth endpoints (IP based)
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { error: 'Too Many Requests from this IP, please try again after a minute' }
});

// Search Endpoints (user-based key, falls back to IP with IPv6 safety)
const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => req.user?.userId || ipKeyGenerator(req),
    message: { error: 'Too Many Requests: Search limit exceeded' }
});

// Email Switching Logic
const emailSwitchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.user?.userId || ipKeyGenerator(req),
    message: { error: 'Too Many Requests: Email sync limit exceeded' }
});

// Admin Restore
const adminRestoreLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.user?.userId || ipKeyGenerator(req),
    message: { error: 'Too Many Requests: Restore limit exceeded' }
});

module.exports = {
    authLimiter,
    searchLimiter,
    emailSwitchLimiter,
    adminRestoreLimiter
};
