const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { errorHandler } = require('./middleware/error.handler');
const { authLimiter, searchLimiter } = require('./middleware/rate_limit.middleware');
const { verifyFirebaseToken } = require('./middleware/auth.middleware');
const { blockArchivedUsers } = require('./middleware/lifecycle.middleware');

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
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

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS policy: origin "${origin}" is not allowed`));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

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

// ─── GLOBAL AUTH GUARD — all routes below require Firebase Bearer token ───────
app.use('/api/v1', verifyFirebaseToken, blockArchivedUsers);

// ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/od', odRoutes);
app.use('/api/v1/results', resultsRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/parent', parentRoutes);

// ─── Static uploaded files (auth-gated) ───────────────────────────────────────
app.use('/uploads', verifyFirebaseToken, express.static(path.join(__dirname, 'uploads')));

// ─── Central Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
