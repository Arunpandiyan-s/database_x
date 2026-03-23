# BACKEND REFACTORING - QUICK START GUIDE

## What Was Created

I've generated a complete backend restructuring plan with:

1. ✅ **BACKEND_RESTRUCTURE_GUIDE.md** - Complete 12-section implementation guide
2. ✅ **utils/mapper.js** - Centralized data mapping utility (snake_case ↔ camelCase)
3. ✅ **utils/fileUpload.js** - File upload handling utility
4. ✅ **migrations/004_auth_enhancements.sql** - New tables for OTP and invitations

## Current System Analysis

### ❌ Bad Pattern (Needs Refactoring)
- **Student Module**: 500+ lines of inline logic in `routes/student.routes.js`
- **Auth Module**: Logic mixed in `routes/auth.routes.js`
- **OD, Attendance, Results, Feed, Dashboard, Audit, Search**: Controllers with direct DB access

### ✅ Good Pattern (Reference)
- **Leave Module**: Clean Route → Controller → Service → Repository pattern

## Proposed Architecture

```
backend/modules/
├── auth/          [routes, controller, service, repository, validation, dto]
├── student/       [routes, controller, service, repository, validation, dto]
├── parent/        [NEW - routes, controller, service, repository, validation, dto]
├── leave/         [Already correct - no changes]
├── od/            [Refactor to match Leave pattern]
├── attendance/    [Refactor to match Leave pattern]
├── results/       [Refactor to match Leave pattern]
├── notification/  [Refactor to match Leave pattern]
├── feed/          [Refactor to match Leave pattern]
├── dashboard/     [Refactor to match Leave pattern]
├── audit/         [Refactor to match Leave pattern]
└── search/        [Refactor to match Leave pattern]
```

## Implementation Steps

### Step 1: Create Module Directories
```bash
mkdir -p backend/modules/{auth,student,parent,od,attendance,results,notification,feed,dashboard,audit,search}
```

### Step 2: Copy Utilities
- Copy `backend/utils/mapper.js` (already created)
- Copy `backend/utils/fileUpload.js` (already created)

### Step 3: Run Migration
```bash
psql -U your_user -d your_database -f backend/migrations/004_auth_enhancements.sql
```

### Step 4: Implement Auth Module (Priority 1)
Create these files:
- `backend/modules/auth/repository.js` - DB operations
- `backend/modules/auth/service.js` - Business logic (OTP, invitations)
- `backend/modules/auth/controller.js` - HTTP handlers
- `backend/modules/auth/routes.js` - Express routes
- `backend/modules/auth/validation.js` - Input validation
- `backend/modules/auth/dto.js` - Data transfer objects

### Step 5: Implement Student Module (Priority 2)
Extract logic from `backend/routes/student.routes.js` into:
- `backend/modules/student/repository.js`
- `backend/modules/student/service.js`
- `backend/modules/student/controller.js`
- `backend/modules/student/routes.js`
- `backend/modules/student/validation.js`
- `backend/modules/student/dto.js` (move `mapProfile` function here)

### Step 6: Implement Parent Module (Priority 3 - NEW)
Create from scratch:
- `backend/modules/parent/repository.js`
- `backend/modules/parent/service.js`
- `backend/modules/parent/controller.js`
- `backend/modules/parent/routes.js`
- `backend/modules/parent/validation.js`
- `backend/modules/parent/dto.js`

### Step 7: Refactor Remaining Modules
Use Leave module as template for:
- OD
- Attendance
- Results
- Notification
- Feed
- Dashboard
- Audit
- Search

### Step 8: Update app.js
Replace old imports with new module imports:
```javascript
// OLD
const studentRoutes = require('./routes/student.routes');
// NEW
const studentRoutes = require('./modules/student/routes');
```

Remove duplicate mounts:
```javascript
// REMOVE
app.use('/api/v1/student', studentRoutes);
// KEEP
app.use('/api/v1/students', studentRoutes);
```

## Key Benefits

1. **Consistent Structure**: All modules follow same pattern
2. **Testable**: Each layer independently testable
3. **Scalable**: Easy to add new features
4. **Maintainable**: Logic is isolated
5. **Type-Safe**: Better integration with TypeScript
6. **Centralized**: No more manual snake_case conversion

## Backward Compatibility

✅ All existing API endpoints preserved
✅ Same request/response formats
✅ Frontend code unchanged

❌ Removed singular route aliases (/student → /students only)

## Files to Review

1. **BACKEND_RESTRUCTURE_GUIDE.md** - Complete implementation guide (19KB)
2. **utils/mapper.js** - Data mapping utility
3. **utils/fileUpload.js** - File upload utility
4. **migrations/004_auth_enhancements.sql** - Database changes

## Example: Auth Module Repository

See `BACKEND_RESTRUCTURE_GUIDE.md` Section 4.4 for complete code examples of:
- Repository pattern
- Service pattern
- Controller pattern
- Route pattern

## Next Actions

1. ✅ Review BACKEND_RESTRUCTURE_GUIDE.md
2. ⏳ Create module directories
3. ⏳ Implement Auth module
4. ⏳ Implement Student module
5. ⏳ Implement Parent module
6. ⏳ Refactor remaining modules
7. ⏳ Update app.js
8. ⏳ Test all endpoints

## Questions?

Refer to Section 4 of BACKEND_RESTRUCTURE_GUIDE.md for detailed code examples of each layer (Routes, Controller, Service, Repository, Validation, DTO).

---

**Status**: Architecture design complete ✓  
**Next**: Begin implementation Phase 1
