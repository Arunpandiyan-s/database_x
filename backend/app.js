const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler } = require('./middleware/error.handler');
const { authLimiter, searchLimiter } = require('./middleware/rate_limit.middleware');
const { verifyFirebaseToken } = require('./middleware/auth.middleware');
const { blockArchivedUsers } = require('./middleware/lifecycle.middleware');

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes.v2');
const studentRoutes = require('./routes/student.routes.v2');
const leaveRoutes = require('./routes/leave.routes');
const odRoutes = require('./routes/od.routes');
const resultsRoutes = require('./routes/results.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const feedRoutes = require('./routes/feed.routes');
const notificationRoutes = require('./routes/notification.routes');
const searchRoutes = require('./routes/search.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const auditRoutes = require('./routes/audit.routes');
const parentRoutes = require('./routes/parent.routes');
const hierarchyRoutes = require('./routes/hierarchy.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Demo-Role',
        'X-Demo-Email'
    ],
    credentials: true
}));

app.options(/.*/, cors());

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
        }
    }
}));
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        service: 'ERP Backend API',
        version: '2.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        modules: [
            'auth', 'students', 'leaves', 'od', 'results',
            'attendance', 'classes', 'feed', 'notifications',
            'search', 'dashboard', 'audit', 'parent'
        ]
    });
});

// Silence Chrome DevTools probe
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => res.json({}));

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);

// ─── RATE LIMITING for search ─────────────────────────────────────────────────
app.use('/api/v1/search', searchLimiter);

// ─── GLOBAL AUTH GUARD — protects all non-auth API routes ─────────────────────
// Uses a path-specific approach so /api/v1/auth/* is NEVER intercepted.
const PROTECTED_PREFIXES = [
    '/api/v1/students',
    '/api/v1/leaves',
    '/api/v1/ods',
    '/api/v1/results',
    '/api/v1/attendance',
    '/api/v1/feeds',
    '/api/v1/notifications',
    '/api/v1/search',
    '/api/v1/dashboard',
    '/api/v1/audit',
    '/api/v1/parents',
    '/api/v1/hierarchy',
    '/api/v1/admin',
];
app.use((req, res, next) => {
    const isProtected = PROTECTED_PREFIXES.some(p => req.path.startsWith(p));
    if (isProtected) {
        return verifyFirebaseToken(req, res, next);
    }
    next();
});
app.use((req, res, next) => {
    const isProtected = PROTECTED_PREFIXES.some(p => req.path.startsWith(p));
    if (isProtected) {
        return blockArchivedUsers(req, res, next);
    }
    next();
});

// ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/ods', odRoutes);
app.use('/api/v1/results', resultsRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/feeds', feedRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/parents', parentRoutes);
app.use('/api/v1/hierarchy', hierarchyRoutes);
app.use('/api/v1/admin', adminRoutes);

// ─── Static uploaded files (Public) ───────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Central Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
