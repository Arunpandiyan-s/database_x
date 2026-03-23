# COMPLETE PROJECT ARCHITECTURE

## 1. ROOT STRUCTURE

### Root Directory
* `backend/` - Node.js + Express Backend
* `edulink-the-core/` - React + TypeScript Frontend (renamed from `frontend/`)
* `BACKEND_SYSTEM_FULL_SPEC.md`
* `FRONTEND_BACKEND_INTEGRATION_MAP.md`
* `FRONTEND_SYSTEM_FULL_SPEC.md`
* `generate_map.py`
* `generate_map_v4.py`

### Backend Structure (`backend/`)
* `controllers/` - Logic handlers (sometimes skipped)
* `middleware/` - Auth, Error handling, Uploads
* `migrations/` - Database schema versioning
* `models/` - SQL Schema definitions
* `repositories/` - Data access layer (only used for `leave`)
* `routes/` - API Route definitions
* `services/` - Business logic (only used for `leave`, `email`, `scope`)
* `utils/` - Helpers (transaction, notify)
* `app.js` - Main entry point
* `create_admission_table.js` - Script
* `add_admin.js` - Script

### Frontend Structure (`edulink-the-core/src/`)
* `api/` - Axios API wrappers
* `components/` - Reusable UI components
* `contexts/` - Global state (Auth, Theme)
* `hooks/` - Custom React hooks
* `pages/` - Route components
* `types/` - TypeScript interfaces
* `utils/` - Helper functions
* `App.tsx` - Main Application Component & Routing
* `main.tsx` - Entry point

---

## 2. FILE POSITION INDEX

### Backend Files
| File Path | Type | Purpose | Dependencies | Used By |
|---|---|---|---|---|
| `backend/app.js` | Entry Point | App configuration, Middleware, Route mounting | `express`, `cors`, `helmet`, routes/* | `server.js` (implied) |
| `backend/routes/auth.routes.js` | Route | Auth endpoints (login, admission) | `firebase`, `pool`, `email.service` | `app.js` |
| `backend/routes/student.routes.js` | Route | Student profile management (Inline Controller) | `pool`, `upload.middleware` | `app.js` |
| `backend/routes/leave.routes.js` | Route | Leave management endpoints | `LeaveController`, `auth.middleware` | `app.js` |
| `backend/controllers/leave.controller.js` | Controller | Handles leave requests | `LeaveService`, `LeaveRepository`, `pool` | `leave.routes.js` |
| `backend/services/leave.service.js` | Service | Complex leave state logic | `LeaveRepository`, `transaction.util` | `leave.controller.js` |
| `backend/repositories/leave.repository.js` | Repository | DB access for leaves | `pool` | `leave.service.js`, `leave.controller.js` |
| `backend/models/schema.sql` | Schema | Database definition | None | Database |

### Frontend Files
| File Path | Type | Purpose | Dependencies | Used By |
|---|---|---|---|---|
| `src/api/student.api.ts` | API | Student API calls | `axios`, `types` | `StudentProfile.tsx` |
| `src/api/auth.api.ts` | API | Auth API calls | `axios`, `types` | `AuthContext.tsx`, `Login.tsx` |
| `src/pages/Login.tsx` | Component | Login Page | `auth.api`, `AuthContext` | `App.tsx` |
| `src/pages/StudentProfile.tsx` | Component | Student Profile Page | `student.api` | `App.tsx` |
| `src/types/index.ts` | Type | Global Type Definitions | None | All components/APIs |

*(Note: Full list inferred from directory scans)*

---

## 3. FRONTEND DEEP ANALYSIS

### Key Components

#### `Login.tsx`
* **Route**: `/login`
* **Role**: All (Public)
* **State**: `email`, `password`, `loading`, `error`
* **API Calls**: `authApi.login(token)`
* **Handlers**: `handleLogin`, `handleGoogleLogin`
* **Flow**: User enters creds -> Firebase Auth -> Get Token -> POST /api/v1/auth/login -> Receive User & Token -> Store in Context -> Redirect to Dashboard.

#### `StudentProfile.tsx`
* **Route**: `/profile`, `/students/:id`
* **Role**: `student` (own), `mentor`, `admin` (view others)
* **State**: `profile` (StudentProfile), `isEditing`, `files`
* **API Calls**: `studentApi.getMyProfile`, `studentApi.saveProfile`, `studentApi.uploadDocument`
* **Handlers**: `handleSave`, `handleUpload`, `handleSubmitProfile`
* **UI Flow**: Tabs for Basic, Academic, Personal -> Edit Mode toggle -> Save -> Submit for Approval.

#### `LeavePage.tsx`
* **Route**: `/leave`
* **Role**: `student`
* **State**: `leaves` (List), `newLeave` (Form)
* **API Calls**: `leaveApi.getLeaves`, `leaveApi.createLeave`
* **Handlers**: `handleSubmit`
* **Form Fields**: `fromDate`, `toDate`, `reason`

---

## 4. FRONTEND ROUTING MAP

| Route Path | Component | Roles Allowed | Protected Logic |
|---|---|---|---|
| `/login` | `Login` | Public | Redirect if auth |
| `/dashboard` | `Dashboard` | Authenticated | `ProtectedLayout` |
| `/profile` | `StudentProfile` | `student` | `ProtectedLayout` |
| `/students/:id` | `StudentProfile` | `mentor`, `hod`, `admin` | `ProtectedLayout` + Permission Check |
| `/leave` | `LeavePage` | `student` | `ProtectedLayout` |
| `/od` | `ODManagement` | `student` | `ProtectedLayout` |
| `/results` | `Results` | `student` | `ProtectedLayout` |
| `/admin` | `AdminDashboard` | `admin` | `ProtectedLayout` |

---

## 5. FRONTEND API LAYER

| Function | Endpoint | Method | Payload | Response | Used In |
|---|---|---|---|---|---|
| `authApi.login` | `/auth/login` | POST | `{ token: string }` | `{ user: User, token: string }` | `Login.tsx` |
| `studentApi.getMyProfile` | `/students/me` | GET | - | `StudentProfile` | `StudentProfile.tsx` |
| `studentApi.saveProfile` | `/students/me` | PUT | `Partial<StudentProfile>` | `StudentProfile` | `StudentProfile.tsx` |
| `leaveApi.createLeave` | `/leaves` | POST | `{ fromDate, toDate, reason }` | `LeaveRequest` | `LeavePage.tsx` |
| `leaveApi.approveLeave` | `/leaves/:id/approve` | POST | - | `LeaveRequest` | `LeaveManagement.tsx` |

---

## 6. BACKEND STRUCTURE ANALYSIS

**Architecture Pattern:** HYBRID / INCONSISTENT

1.  **MVC Pattern (Correct):** Used in `Leave` module.
    *   `routes/leave.routes.js` -> `controllers/leave.controller.js` -> `services/leave.service.js` -> `repositories/leave.repository.js`
2.  **Inline Handler Pattern (Incorrect):** Used in `Student` module.
    *   `routes/student.routes.js` contains ALL logic and DB queries directly.
3.  **Controller-Direct Pattern:** Used in `Auth` module.
    *   `routes/auth.routes.js` contains logic and direct DB queries.

**Middleware:**
*   `auth.middleware.js`: `verifyFirebaseToken`, `authorizeRoles`
*   `error.handler.js`: Centralized error handling
*   `transaction.util.js`: Helper for atomic transactions (used in Service layer)

---

## 7. BACKEND ROUTE MAP

| Route | Method | Controller/Handler | Service | Middleware | Roles |
|---|---|---|---|---|---|
| `/api/v1/auth/login` | POST | Inline (auth.routes.js) | - | None (Public) | Public |
| `/api/v1/students/me` | GET | Inline (student.routes.js) | - | `verifyFirebaseToken` | `student` |
| `/api/v1/students/me` | PUT | Inline (student.routes.js) | - | `verifyFirebaseToken` | `student` |
| `/api/v1/leaves` | GET | `LeaveController.getLeaves` | `LeaveRepository` | `verifyFirebaseToken` | All |
| `/api/v1/leaves` | POST | `LeaveController.createLeave` | - | `verifyFirebaseToken` | `student` |
| `/api/v1/leaves/:id/approve` | POST | `LeaveController.approveLeave` | `LeaveService` | `authorize(2)` | `mentor`, `hod` |

---

## 8. DATABASE MAPPING

### Tables (PostgreSQL)

**`users`**
*   `id` (UUID)
*   `firebase_uid` (String)
*   `email` (String)
*   `role_id` (FK -> roles)

**`student_profiles`**
*   `student_id` (FK -> users)
*   `mentor_id` (FK -> users)
*   `register_number`
*   `status` ('DRAFT', 'LOCKED', etc.)

**`leave_requests`**
*   `student_id` (FK)
*   `status` ('pending_mentor', 'pending_hod', 'approved')
*   `reason`, `from_date`, `to_date`

**`roles`**
*   `name` ('student', 'mentor', 'admin')
*   `level` (int)

### Frontend Model Mapping

| Frontend Model | Backend Table | Status | Notes |
|---|---|---|---|
| `User` | `users` | MATCH | - |
| `StudentProfile` | `student_profiles` | MATCH | Field names mapped manually in route handlers |
| `LeaveRequest` | `leave_requests` | MATCH | - |
| `ODRequest` | `od_requests` | MATCH | - |

---

## 9. ACTION FLOW TRACE

### 1. Login
*   **Frontend**: User clicks Login -> `authApi.login` (sends Firebase Token)
*   **API**: `POST /api/v1/auth/login`
*   **Backend Route**: `auth.routes.js`
*   **Logic**: Verifies Firebase Token -> Queries `users` table by `firebase_uid` -> Returns User object.
*   **DB**: `SELECT * FROM users WHERE firebase_uid = $1`

### 2. Submit Leave
*   **Frontend**: `LeavePage` -> `handleSubmit` -> `leaveApi.createLeave`
*   **API**: `POST /api/v1/leaves`
*   **Backend Route**: `leave.routes.js`
*   **Controller**: `LeaveController.createLeave`
*   **Logic**: Validates dates -> Resolves Mentor -> Inserts into DB -> Sends Notification.
*   **DB**: `INSERT INTO leave_requests ...`

### 3. Approve Leave
*   **Frontend**: `LeaveManagement` -> `handleApprove` -> `leaveApi.approveLeave`
*   **API**: `POST /api/v1/leaves/:id/approve`
*   **Backend Route**: `leave.routes.js`
*   **Controller**: `LeaveController.approveLeave`
*   **Service**: `LeaveService.approveLeave`
*   **Logic**: Checks Role Level -> Updates Status (State Machine) -> Creates Audit Log -> Notifies Student.
*   **DB**: `UPDATE leave_requests SET status = ...`

---

## 10. ROLE SYSTEM TRACE

**Roles Defined:**
*   `student` (Level 1)
*   `mentor` (Level 2)
*   `hod` (Level 3)
*   `cluster_hod` (Level 4)
*   `principal` (Level 5)
*   `admin` (Level 7)

**Access Control:**
*   **Frontend**: `ProtectedLayout` checks `user.role`.
*   **Backend**: `authorizeRoles('role_name')` or `authorize(level)` middleware.

---

## 11. FEATURE GROUPING

### Auth
*   **FE**: `Login.tsx`, `auth.api.ts`
*   **BE**: `auth.routes.js`, `auth.middleware.js`

### Student
*   **FE**: `StudentProfile.tsx`, `student.api.ts`
*   **BE**: `student.routes.js` (Inline logic)

### Leave
*   **FE**: `LeavePage.tsx`, `leave.api.ts`
*   **BE**: `leave.routes.js`, `leave.controller.js`, `leave.service.js`, `leave.repository.js`

### OD
*   **FE**: `ODManagement.tsx`, `od.api.ts`
*   **BE**: `od.routes.js`, `od.controller.js`

---

## 12. INCONSISTENCY REPORT

### 1. Backend Architecture Inconsistency (CRITICAL)
*   `Leave` module uses a clean **Route -> Controller -> Service -> Repository** pattern.
*   `Student` module uses a **Monolithic Route Handler** pattern (logic & DB in `routes.js`).
*   `Auth` module uses a **Route Handler** pattern.
*   **Recommendation**: Refactor all modules to follow the `Leave` module pattern.

### 2. API Aliasing
*   `app.js` mounts routes multiple times:
    *   `/api/v1/students` AND `/api/v1/student`
    *   `/api/v1/leaves` AND `/api/v1/leave`
*   **Recommendation**: Standardize to plural nouns (`/students`, `/leaves`).

### 3. Manual Object Mapping
*   `student.routes.js` has a manual `mapProfile` function (~100 lines) to convert snake_case DB columns to camelCase JSON.
*   **Recommendation**: Use a consistent serialization layer or ORM (or repository pattern helper) to handle this globally.

### 4. Missing Services
*   Most business logic resides in Controllers or Routes. Only `Leave` has a Service.
*   Hard to test logic in isolation.

---

## 13. FILE RELATION GRAPH (CRITICAL)

**Student Feature (Current - Bad):**
`StudentProfile.tsx` -> `student.api.ts` -> `student.routes.js` -> `pool.query` (Direct DB)

**Leave Feature (Current - Good):**
`LeavePage.tsx` -> `leave.api.ts` -> `leave.routes.js` -> `LeaveController` -> `LeaveService` -> `LeaveRepository` -> `pool.query`

---

## 14. CURRENT ARCHITECTURE SUMMARY

The system is currently in a **transitional state**. It appears to have started as a simple Express app with logic in routes (seen in `student.routes.js`) and is being refactored into a layered architecture (seen in `leave` module).

**Key Issues:**
1.  **Code Duplication**: Manual mapping of DB rows to objects in every route/controller.
2.  **Scalability**: Logic inside routes makes files huge and untestable (e.g., `student.routes.js` is large).
3.  **Maintainability**: Inconsistent patterns mean developers need to know *which* pattern a specific feature uses.
4.  **Database Coupling**: Frontend types assume camelCase, Backend DB is snake_case. The translation layer is manual and fragile.

**Next Steps:**
1.  Enforce the **Service/Repository pattern** across all modules (Student, OD, Auth).
2.  Standardize API endpoints (remove aliases).
3.  Centralize Data Mapping (DB Row <-> Domain Model).
