# Backend Restructuring - Complete Implementation Guide

## Executive Summary

This document provides the complete refactored backend architecture for the ERP system, transforming it from an inconsistent hybrid pattern into a clean, scalable, modular system following the **Route → Controller → Service → Repository → Database** pattern consistently across all modules.

---

## 1. NEW DIRECTORY STRUCTURE

```
backend/
├── modules/                    # NEW: Feature-based modules
│   ├── auth/
│   │   ├── routes.js          # Express route definitions
│   │   ├── controller.js      # HTTP handlers
│   │   ├── service.js         # Business logic
│   │   ├── repository.js      # Database queries
│   │   ├── validation.js      # Input validation schemas
│   │   └── dto.js             # Data transfer objects
│   ├── student/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   ├── service.js
│   │   ├── repository.js
│   │   ├── validation.js
│   │   └── dto.js
│   ├── parent/                # NEW MODULE
│   │   ├── routes.js
│   │   ├── controller.js
│   │   ├── service.js
│   │   ├── repository.js
│   │   ├── validation.js
│   │   └── dto.js
│   ├── leave/                 # EXISTING (good pattern)
│   │   └── [already structured correctly]
│   ├── od/
│   ├── attendance/
│   ├── results/
│   ├── notification/
│   ├── feed/
│   ├── dashboard/
│   ├── audit/
│   └── search/
│
├── middleware/                 # EXISTING
│   ├── auth.middleware.js
│   ├── error.handler.js
│   ├── lifecycle.middleware.js
│   ├── rate_limit.middleware.js
│   └── upload.middleware.js
│
├── utils/                      # ENHANCED
│   ├── transaction.util.js    # Existing
│   ├── notify.util.js          # Existing
│   ├── mapper.js               # NEW: Centralized data mapping
│   └── fileUpload.js           # NEW: File upload utility
│
├── migrations/                 # ENHANCED
│   ├── 001_create_event_outbox.sql
│   ├── 002_core_erp_schema.sql
│   ├── 003_new_modules_schema.sql
│   └── 004_auth_enhancements.sql  # NEW
│
├── config/                     # EXISTING
│   └── firebase.js
│
├── models/                     # EXISTING
│   └── schema.sql
│
├── uploads/                    # File storage
│   ├── students/
│   ├── results/
│   └── od/
│
├── app.js                      # UPDATED: New route mounts
├── server.js                   # EXISTING
└── package.json
```

---

## 2. CORE UTILITIES

### 2.1 `utils/mapper.js` - Data Mapping Utility

**Purpose**: Centralize snake_case ↔ camelCase conversion

**Key Functions**:
- `mapDbToCamelCase(obj)` - DB → Frontend
- `mapCamelToSnakeCase(obj)` - Frontend → DB
- `mapToDto(row, schema)` - Custom DTO mapping

**Usage Example**:
```javascript
const { mapDbToCamelCase } = require('../utils/mapper');

// In Repository
const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
return mapDbToCamelCase(result.rows[0]);
```

### 2.2 `utils/fileUpload.js` - File Upload Utility

**Purpose**: Handle file uploads with validation

**Key Functions**:
- `saveFile(file, subDir, category)` - Save file to disk
- `deleteFile(relativePath)` - Remove file
- `validateFile(file, category)` - Validate type/size
- `getFileUrl(relativePath, baseUrl)` - Generate full URL

**Usage Example**:
```javascript
const { saveFile } = require('../utils/fileUpload');

// In Controller
const filePath = await saveFile(req.file, 'students', 'documents');
```

---

## 3. DATABASE MIGRATIONS

### 3.1 New Migration: `004_auth_enhancements.sql`

Creates two new tables:

**`student_invites`**
- Stores admin invitations for students
- Fields: id, email, name, department_id, college_id, invited_by, temp_password, status, expires_at

**`otp_verifications`**
- Stores OTP codes for email/phone verification
- Fields: id, identifier, identifier_type, otp_code, purpose, attempts, verified, expires_at

---

## 4. MODULE ARCHITECTURE PATTERN

Each module follows this consistent structure:

### 4.1 Routes Layer (`routes.js`)
- Defines HTTP endpoints
- Mounts middleware (auth, validation)
- Delegates to Controller

```javascript
const express = require('express');
const router = express.Router();
const Controller = require('./controller');
const { authorizeRoles } = require('../../middleware/auth.middleware');
const { validateBody } = require('./validation');

router.post('/', authorizeRoles('student'), validateBody('create'), Controller.create);
router.get('/:id', authorizeRoles('student', 'mentor'), Controller.getById);

module.exports = router;
```

### 4.2 Controller Layer (`controller.js`)
- Handles HTTP request/response
- Validates input
- Calls Service layer
- Formats response

```javascript
const Service = require('./service');
const { pool } = require('../../utils/transaction.util');

class Controller {
    static async create(req, res, next) {
        try {
            const service = new Service(pool);
            const result = await service.create(req.body, req.user);
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = Controller;
```

### 4.3 Service Layer (`service.js`)
- Contains business logic
- Orchestrates operations
- Handles transactions
- Enforces business rules

```javascript
const Repository = require('./repository');
const { withTransactionRetry } = require('../../utils/transaction.util');

class Service {
    constructor(dbClient) {
        this.repository = new Repository(dbClient);
    }

    async create(data, user) {
        return await withTransactionRetry(async (client) => {
            // Business logic here
            const result = await this.repository.create(data);
            return result;
        });
    }
}

module.exports = Service;
```

### 4.4 Repository Layer (`repository.js`)
- Pure database operations
- Uses parameterized queries
- Returns mapped objects (camelCase)
- No business logic

```javascript
const { mapDbToCamelCase, mapCamelToSnakeCase } = require('../../utils/mapper');

class Repository {
    constructor(dbClient) {
        this.db = dbClient;
    }

    async create(data) {
        const dbData = mapCamelToSnakeCase(data);
        const result = await this.db.query(
            'INSERT INTO table_name (...) VALUES (...) RETURNING *',
            [dbData.field1, dbData.field2]
        );
        return mapDbToCamelCase(result.rows[0]);
    }

    async findById(id) {
        const result = await this.db.query(
            'SELECT * FROM table_name WHERE id = $1',
            [id]
        );
        return result.rows[0] ? mapDbToCamelCase(result.rows[0]) : null;
    }
}

module.exports = Repository;
```

### 4.5 Validation Layer (`validation.js`)
- Input validation schemas
- Uses express-validator or Joi

```javascript
const { body, validationResult } = require('express-validator');

const schemas = {
    create: [
        body('email').isEmail(),
        body('name').notEmpty().trim(),
    ]
};

function validateBody(schemaName) {
    return [
        ...schemas[schemaName],
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            next();
        }
    ];
}

module.exports = { validateBody };
```

### 4.6 DTO Layer (`dto.js`)
- Data transfer object definitions
- Custom object mappers

```javascript
const { mapDbToCamelCase } = require('../../utils/mapper');

class StudentDTO {
    static toResponse(dbRow) {
        const base = mapDbToCamelCase(dbRow);
        return {
            ...base,
            fullName: `${base.firstName} ${base.lastName}`,
            // Additional computed fields
        };
    }
}

module.exports = { StudentDTO };
```

---

## 5. MODULE-BY-MODULE REFACTORING

### 5.1 AUTH MODULE

**New Endpoints**:
- `POST /api/v1/auth/login` - Firebase login (existing)
- `POST /api/v1/auth/invite-student` - Admin invites student (NEW)
- `POST /api/v1/auth/send-email-otp` - Send OTP (NEW)
- `POST /api/v1/auth/verify-email-otp` - Verify OTP (NEW)
- `POST /api/v1/auth/register-student` - Complete registration (NEW)
- `GET /api/v1/auth/invites` - List pending invites (NEW)

**Key Changes**:
- Extract all logic from `routes/auth.routes.js` into Service/Repository
- Add OTP generation and verification
- Add student invitation workflow
- Email integration via EmailService

### 5.2 STUDENT MODULE

**Endpoints** (unchanged URLs for compatibility):
- `GET /api/v1/students/me` - Get own profile
- `PUT /api/v1/students/me` - Update profile
- `POST /api/v1/students/me/submit` - Submit for approval
- `POST /api/v1/students/me/request-edit` - Request edit unlock
- `POST /api/v1/students/me/documents/:docType` - Upload document
- `GET /api/v1/students` - List students (admin/mentor)
- `GET /api/v1/students/:id` - Get student by ID
- `POST /api/v1/students/:id/approve-edit` - Approve edit request

**Key Changes**:
- **CRITICAL**: Extract ~500 lines of inline logic from `routes/student.routes.js`
- Move `mapProfile` function to `student/dto.js`
- Use `utils/fileUpload.js` for document handling
- Use `utils/mapper.js` for snake_case conversion

### 5.3 PARENT MODULE (NEW)

**Endpoints**:
- `POST /api/v1/parents/register` - Parent registration
- `GET /api/v1/parents/students` - Get linked students
- `GET /api/v1/parents/students/:id` - Get specific student info
- `PUT /api/v1/parents/link/:studentId` - Link to student
- `GET /api/v1/parents/leaves/:studentId` - View student leaves
- `PUT /api/v1/parents/leaves/:id/confirm` - Confirm leave
- `GET /api/v1/parents/od/:studentId` - View student OD requests
- `PUT /api/v1/parents/od/:id/confirm` - Confirm OD

**Key Logic**:
- Uses `parent_student_mapping` table
- Allows parent to view child's data
- Restricted to linked students only

### 5.4 LEAVE MODULE

**Status**: Already follows correct pattern ✓

**No changes needed** - This is the reference implementation

### 5.5 OD MODULE

**Endpoints** (refactored to match Leave pattern):
- `POST /api/v1/od` - Create OD request
- `GET /api/v1/od` - List OD requests
- `POST /api/v1/od/:id/approve` - Approve OD
- `POST /api/v1/od/:id/reject` - Reject OD
- `POST /api/v1/od/:id/upload-cert` - Upload certificate

**Key Changes**:
- Extract logic from `od.controller.js` if it contains DB queries
- Use `utils/fileUpload.js` for certificate uploads
- Match Leave module's state machine pattern

### 5.6 ATTENDANCE MODULE

**Endpoints**:
- `GET /api/v1/attendance/classes` - Get classes for advisor
- `POST /api/v1/attendance/:classId` - Save attendance
- `GET /api/v1/attendance/:classId/:date` - Get attendance record
- `GET /api/v1/attendance/reports/:studentId` - Student attendance report

**Key Changes**:
- Refactor to layered architecture
- Use Repository for all DB access

### 5.7 RESULTS MODULE

**Endpoints**:
- `POST /api/v1/results/upload` - Upload result (mentor)
- `GET /api/v1/results/student/:studentId` - Get student results
- `GET /api/v1/results/:id` - Get specific result
- `DELETE /api/v1/results/:id` - Delete result

**Key Changes**:
- Use `utils/fileUpload.js` for file handling
- Enforce immutability rules in Service layer

### 5.8 NOTIFICATION MODULE

**Endpoints**:
- `GET /api/v1/notifications` - Get user notifications
- `PUT /api/v1/notifications/:id/read` - Mark as read
- `PUT /api/v1/notifications/read-all` - Mark all as read

**Key Changes**:
- Simple refactor to layered pattern

### 5.9 FEED MODULE

**Endpoints**:
- `GET /api/v1/feed` - Get feed posts
- `POST /api/v1/feed` - Create post (principal/admin)
- `PUT /api/v1/feed/:id` - Update post
- `DELETE /api/v1/feed/:id` - Delete post
- `POST /api/v1/feed/:id/approve` - Approve post (admin)

**Key Changes**:
- Refactor to layered architecture

### 5.10 DASHBOARD MODULE

**Endpoints**:
- `GET /api/v1/dashboard/stats` - Role-specific stats
- `GET /api/v1/dashboard/recent-activity` - Recent activities
- `GET /api/v1/dashboard/pending-approvals` - Pending items

**Key Changes**:
- Refactor to layered architecture
- Use Scope Service for role-based filtering

### 5.11 AUDIT MODULE

**Endpoints**:
- `GET /api/v1/audit` - Get audit logs (admin only)
- `GET /api/v1/audit/:entityType/:entityId` - Get entity audit trail

**Key Changes**:
- Simple refactor to layered pattern

### 5.12 SEARCH MODULE

**Endpoints**:
- `GET /api/v1/search/users` - Search users
- `GET /api/v1/search/students` - Search students

**Key Changes**:
- Refactor to layered architecture

---

## 6. UPDATED `app.js`

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const { errorHandler } = require('./middleware/error.handler');
const { authLimiter, searchLimiter } = require('./middleware/rate_limit.middleware');
const { verifyFirebaseToken } = require('./middleware/auth.middleware');
const { blockArchivedUsers } = require('./middleware/lifecycle.middleware');

// ─── NEW: Module-based Route Imports ──────────────────────────────────────────
const authRoutes = require('./modules/auth/routes');
const studentRoutes = require('./modules/student/routes');
const parentRoutes = require('./modules/parent/routes');
const leaveRoutes = require('./modules/leave/routes');
const odRoutes = require('./modules/od/routes');
const attendanceRoutes = require('./modules/attendance/routes');
const resultsRoutes = require('./modules/results/routes');
const notificationRoutes = require('./modules/notification/routes');
const feedRoutes = require('./modules/feed/routes');
const dashboardRoutes = require('./modules/dashboard/routes');
const auditRoutes = require('./modules/audit/routes');
const searchRoutes = require('./modules/search/routes');

const app = express();

// ─── CORS & Security ──────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
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
};

app.use(cors(corsOptions));
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        service: 'ERP Backend API',
        version: '3.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
    });
});

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);

// ─── GLOBAL AUTH GUARD ────────────────────────────────────────────────────────
app.use('/api/v1', verifyFirebaseToken, blockArchivedUsers);

// ─── PROTECTED ROUTES (Standardized - NO ALIASES) ─────────────────────────────
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/parents', parentRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/od', odRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/results', resultsRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/search', searchLimiter, searchRoutes);

// ─── Static File Serving ──────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
```

**Key Changes**:
- ✅ Removed duplicate route mounts (`/student`, `/leave`, etc.)
- ✅ All routes now use plural nouns (`/students`, `/leaves`)
- ✅ Imports from `modules/` directory
- ✅ Consistent structure

---

## 7. ROLE-BASED ACCESS CONTROL MATRIX

| Endpoint | student | parent | mentor | hod | admin |
|---|---|---|---|---|---|
| `POST /auth/login` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /students/me` | ✓ | - | - | - | - |
| `PUT /students/me` | ✓ | - | - | - | - |
| `GET /students` | - | - | ✓ | ✓ | ✓ |
| `GET /students/:id` | - | - | ✓ | ✓ | ✓ |
| `POST /leaves` | ✓ | - | - | - | - |
| `GET /leaves` | ✓ | ✓* | ✓ | ✓ | ✓ |
| `POST /leaves/:id/approve` | - | - | ✓ | ✓ | - |
| `PUT /parents/leaves/:id/confirm` | - | ✓ | - | - | - |
| `POST /attendance/:classId` | - | - | ✓ | - | - |
| `POST /results/upload` | - | - | ✓ | - | - |

*Parent can only view their linked student's data

---

## 8. MIGRATION STRATEGY

### Phase 1: Foundation (Week 1)
1. Create `modules/` directory structure
2. Create `utils/mapper.js` and `utils/fileUpload.js`
3. Run migration `004_auth_enhancements.sql`
4. Test utilities independently

### Phase 2: Auth Module (Week 1)
1. Create `modules/auth/` with full layers
2. Test all auth endpoints
3. Verify OTP flow works

### Phase 3: Student Module (Week 2)
1. **Critical**: Refactor `routes/student.routes.js` into layered structure
2. Test all student endpoints
3. Verify file uploads work

### Phase 4: Parent Module (Week 2)
1. Create new `modules/parent/` from scratch
2. Implement parent-student linking
3. Test parent confirmation flows

### Phase 5: Remaining Modules (Week 3-4)
1. Refactor OD, Attendance, Results, Notification, Feed, Dashboard, Audit, Search
2. Test each module independently
3. Integration testing

### Phase 6: Update `app.js` and Cleanup (Week 4)
1. Update route mounts in `app.js`
2. Remove old `routes/`, `controllers/`, `services/`, `repositories/` directories
3. Update documentation
4. Final E2E testing

---

## 9. TESTING CHECKLIST

- [ ] All existing endpoints return same responses
- [ ] File uploads work correctly
- [ ] Role-based access control works
- [ ] OTP flow completes successfully
- [ ] Parent module links to students
- [ ] Database transactions rollback on errors
- [ ] Frontend integration still works

---

## 10. BENEFITS OF NEW ARCHITECTURE

1. **Consistency**: All modules follow same pattern
2. **Testability**: Each layer can be unit tested
3. **Maintainability**: Logic is isolated and easy to find
4. **Scalability**: Easy to add new modules
5. **Code Reuse**: Centralized utilities
6. **Type Safety**: Better TypeScript integration potential
7. **Documentation**: Clear separation of concerns
8. **Onboarding**: New developers understand structure quickly

---

## 11. BACKWARD COMPATIBILITY

✅ **All existing frontend API calls will continue to work**

- URLs remain the same (`/api/v1/students/me`, etc.)
- Request/response formats unchanged
- Authentication flow identical
- File upload endpoints preserved

❌ **Removed**:
- Singular route aliases (`/student`, `/leave`) - Frontend should use plural versions

---

## 12. NEXT STEPS

1. Review this document with the team
2. Approve migration strategy
3. Create feature branches for each module
4. Begin Phase 1 implementation
5. Progressive testing and deployment

---

**Document Version**: 1.0  
**Last Updated**: 2026-03-18  
**Author**: Senior Backend Architect
