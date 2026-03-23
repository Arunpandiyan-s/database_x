# FRONTEND ↔ BACKEND INTEGRATION MAP

## Endpoint Comparison

| Frontend Action (File) | Frontend Endpoint Requested | Corresponding Backend Endpoint | Method | Status |
|---|---|---|---|---|
| `admin.api.ts` | `/api/audit` | `/api/audit` | `GET` | ✅ OK |
| `attendance.api.ts` | `/api/attendance/classes` | `/api/attendance/classes` | `GET` | ✅ OK |
| `attendance.api.ts` | `/api/attendance/classes` | `/api/attendance/classes` | `POST` | ✅ OK |
| `attendance.api.ts` | `/api/attendance/classes/:id` | `/api/attendance/classes` | `GET` | ✅ OK / PARAM MISMATCH |
| `attendance.api.ts` | `/api/attendance/classes/:id/students` | `/api/attendance/classes` | `GET` | ✅ OK / PARAM MISMATCH |
| `attendance.api.ts` | `/api/attendance/class/:id/date/:id` | `None` | `GET` | ❌ MISSING IN BACKEND |
| `attendance.api.ts` | `/api/attendance` | `/api/attendance/classes` | `POST` | ✅ OK / PARAM MISMATCH |
| `attendance.api.ts` | `/api/attendance/class/:id/date/:id` | `None` | `PUT` | ❌ MISSING IN BACKEND |
| `attendance.api.ts` | `/api/attendance/student/me/summary` | `/api/attendance/student/me/summary` | `GET` | ✅ OK |
| `auth.api.ts` | `/api/auth/login` | `/api/auth/login` | `POST` | ✅ OK |
| `auth.api.ts` | `/api/auth/forgot-password` | `None` | `POST` | ❌ MISSING IN BACKEND |
| `auth.api.ts` | `/api/auth/verify` | `None` | `POST` | ❌ MISSING IN BACKEND |
| `dashboard.api.ts` | `/api/dashboard/metrics` | `/api/dashboard/metrics` | `GET` | ✅ OK |
| `feed.api.ts` | `/api/feed` | `/api/feed` | `GET` | ✅ OK |
| `feed.api.ts` | `/api/feed` | `/api/feed` | `POST` | ✅ OK |
| `feed.api.ts` | `/api/feed/:id` | `/api/feed/:id` | `DELETE` | ✅ OK |
| `leave.api.ts` | `/api/leaves` | `/api/leave` | `GET` | ✅ OK / PARAM MISMATCH |
| `leave.api.ts` | `/api/leaves` | `/api/leave` | `POST` | ✅ OK / PARAM MISMATCH |
| `leave.api.ts` | `/api/leaves/:id/approval` | `None` | `PUT` | ❌ MISSING IN BACKEND |
| `leave.api.ts` | `/api/leaves/:id/approve` | `/api/leave` | `POST` | ✅ OK / PARAM MISMATCH |
| `leave.api.ts` | `/api/leaves/:id/reject` | `/api/leave` | `POST` | ✅ OK / PARAM MISMATCH |
| `leave.api.ts` | `/api/leaves/:id/parent-confirmation` | `None` | `PUT` | ❌ MISSING IN BACKEND |
| `mapping.api.ts` | `/api/students` | `/api/student` | `GET` | ✅ OK / PARAM MISMATCH |
| `mapping.api.ts` | `/api/parent/student/:id` | `None` | `GET` | ❌ MISSING IN BACKEND |
| `mapping.api.ts` | `/api/parent/od/:id/confirm` | `/api/parent/od/:id/confirm` | `PUT` | ✅ OK |
| `mapping.api.ts` | `/api/parent/leave/:id/confirm` | `/api/parent/leave/:id/confirm` | `PUT` | ✅ OK |
| `notification.api.ts` | `/api/notifications` | `/api/notification` | `GET` | ✅ OK / PARAM MISMATCH |
| `notification.api.ts` | `/api/notifications/:id/read` | `None` | `PUT` | ❌ MISSING IN BACKEND |
| `notification.api.ts` | `/api/notifications/read-all` | `None` | `PUT` | ❌ MISSING IN BACKEND |
| `od.api.ts` | `/api/od` | `/api/od` | `GET` | ✅ OK |
| `od.api.ts` | `/api/od` | `/api/od` | `POST` | ✅ OK |
| `od.api.ts` | `/api/od/:id/upload?type=:id` | `/api/od` | `POST` | ✅ OK / PARAM MISMATCH |
| `od.api.ts` | `/api/od/:id/mentor-approval` | `/api/od/:id/mentor-approval` | `PUT` | ✅ OK |
| `od.api.ts` | `/api/od/:id/hod-approval` | `/api/od/:id/hod-approval` | `PUT` | ✅ OK |
| `od.api.ts` | `/api/od/:id/parent-confirmation` | `/api/od/:id/parent-confirmation` | `PUT` | ✅ OK |
| `result.api.ts` | `/api/results/me` | `/api/results/me` | `GET` | ✅ OK |
| `result.api.ts` | `/api/results/student/:id` | `None` | `GET` | ❌ MISSING IN BACKEND |
| `result.api.ts` | `/api/results/upload` | `/api/results/upload` | `POST` | ✅ OK |
| `result.api.ts` | `/api/results/:id` | `/api/results/:id` | `PUT` | ✅ OK |
| `result.api.ts` | `/api/results/:id` | `/api/results/:id` | `DELETE` | ✅ OK |
| `search.api.ts` | `/api/search` | `/api/search` | `GET` | ✅ OK |
| `student.api.ts` | `/api/students/me` | `/api/student` | `GET` | ✅ OK / PARAM MISMATCH |
| `student.api.ts` | `/api/students/me` | `None` | `PUT` | ❌ MISSING IN BACKEND |
| `student.api.ts` | `/api/students/me/submit` | `None` | `POST` | ❌ MISSING IN BACKEND |
| `student.api.ts` | `/api/students/me/request-edit` | `None` | `POST` | ❌ MISSING IN BACKEND |
| `student.api.ts` | `/api/students/me/documents/:id` | `None` | `POST` | ❌ MISSING IN BACKEND |
| `student.api.ts` | `/api/students` | `/api/student` | `GET` | ✅ OK / PARAM MISMATCH |
| `student.api.ts` | `/api/students/:id` | `/api/student` | `GET` | ✅ OK / PARAM MISMATCH |
| `student.api.ts` | `/api/students/:id/approve-edit` | `None` | `POST` | ❌ MISSING IN BACKEND |
| `student.api.ts` | `/api/students/:id/quota-request` | `None` | `POST` | ❌ MISSING IN BACKEND |
| `student.api.ts` | `/api/students/:id/scholarship-request` | `None` | `POST` | ❌ MISSING IN BACKEND |
| `Unused/External` | `None` | `/api/attendance/classes/:classId` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/attendance/classes/:classId/students` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/attendance/class/:classId/date/:date` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/attendance` | `POST` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/attendance/class/:classId/date/:date` | `PUT` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/auth` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/auth/login` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/auth/ping` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/auth/register` | `POST` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/leave/:id/approve` | `POST` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/leave/:id/reject` | `POST` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/leave/:id/approval` | `PUT` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/leave/:id/parent-confirmation` | `PUT` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/notification/read-all` | `PUT` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/notification/:id/read` | `PUT` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/od/:id/upload` | `POST` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/parent/student/:studentId` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/results/student/:studentId` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/results/:id/download` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/results/:id/view` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/student/me` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/student/me` | `PUT` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/student/me/documents/:docType` | `POST` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/student/me/submit` | `POST` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/student/me/request-edit` | `POST` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/student/:id` | `GET` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/student/:id/approve-edit` | `POST` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/student/:id/quota-request` | `POST` | ⚠️ UNUSED IN FRONTEND |
| `Unused/External` | `None` | `/api/student/:id/scholarship-request` | `POST` | ⚠️ UNUSED IN FRONTEND |

## Data Models Comparison

| Frontend Model | Backend Table Found | Status |
|---|---|---|
| `User` | `user` | ✅ MATCH |
| `StudentProfile` | `None Detected` | ❌ MISSING DB ENTITY |
| `ODRequest` | `od_requests` | ✅ MATCH |
| `LeaveRequest` | `leave_requests` | ✅ MATCH |
| `ResultUpload` | `results` | ✅ MATCH |
| `Notification` | `notification` | ✅ MATCH |
| `AuditLog` | `audit_logs` | ✅ MATCH |
| `Campus` | `colleges` | ✅ MATCH |
| `Department` | `department` | ✅ MATCH |
| `FeedPost` | `feed_posts` | ✅ MATCH |
| `Class` | `None Detected` | ❌ MISSING DB ENTITY |
| `AttendanceRecord` | `attendance_records` | ✅ MATCH |
