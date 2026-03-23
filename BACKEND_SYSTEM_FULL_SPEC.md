# BACKEND SYSTEM FULL SPEC

## 1️⃣ Backend Structure

```
backend/
 ├── routes/
 │   ├── attendance.routes.js
 │   ├── audit.routes.js
 │   ├── auth.routes.js
 │   ├── dashboard.routes.js
 │   ├── feed.routes.js
 │   ├── leave.routes.js
 │   ├── notification.routes.js
 │   ├── od.routes.js
 │   ├── parent.routes.js
 │   ├── results.routes.js
 │   ├── search.routes.js
 │   ├── student.routes.js
 ├── controllers/
 │   ├── attendance.controller.js
 │   ├── audit.controller.js
 │   ├── dashboard.controller.js
 │   ├── feed.controller.js
 │   ├── leave.controller.js
 │   ├── notification.controller.js
 │   ├── od.controller.js
 │   ├── parent.controller.js
 │   ├── results.controller.js
 │   ├── search.controller.js
 ├── services/
 │   ├── leave.service.js
 │   ├── scope.service.js
 ├── repositories/
 │   ├── leave.repository.js
 ├── models/
 │   ├── schema.sql
 ├── middleware/
 │   ├── auth.middleware.js
 │   ├── error.handler.js
 │   ├── lifecycle.middleware.js
 │   ├── rate_limit.middleware.js
 ├── utils/
 │   ├── notify.util.js
 │   ├── transaction.util.js
 ├── config/
 │   ├── firebase.js
 ├── workers/
 │   ├── event.outbox.worker.js
```

## 2️⃣ API Endpoints

| Endpoint | Method | Controller | Service | Role Access | Payload | Response |
|---|---|---|---|---|---|---|
| `/api/attendance/classes` | `GET` | `AttendanceController.getClasses` | `AttendanceService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/attendance/classes` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/attendance/classes/:classId` | `GET` | `AttendanceController.getClassById` | `AttendanceService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/attendance/classes/:classId/students` | `GET` | `AttendanceController.getStudentsInClass` | `AttendanceService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/attendance/class/:classId/date/:date` | `GET` | `AttendanceController.getAttendanceByDate` | `AttendanceService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/attendance` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/attendance/class/:classId/date/:date` | `PUT` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/attendance/student/me/summary` | `GET` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/audit` | `GET` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/auth` | `GET` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/auth/login` | `GET` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/auth/login` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/auth/ping` | `GET` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/auth/register` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/dashboard/metrics` | `GET` | `DashboardController.getMetrics` | `DashboardService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/feed` | `GET` | `FeedController.getFeed` | `FeedService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/feed` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/feed/:id` | `DELETE` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/leave` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/leave` | `GET` | `LeaveController.getLeaves` | `LeaveService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/leave/:id/approve` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/leave/:id/reject` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/leave/:id/approval` | `PUT` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/leave/:id/parent-confirmation` | `PUT` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/notification` | `GET` | `NotificationController.getNotifications` | `NotificationService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/notification/read-all` | `PUT` | `NotificationController.markAllRead` | `NotificationService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/notification/:id/read` | `PUT` | `NotificationController.markRead` | `NotificationService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/od` | `GET` | `ODController.getODRequests` | `ODService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/od` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/od/:id/upload` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/od/:id/mentor-approval` | `PUT` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/od/:id/hod-approval` | `PUT` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/od/:id/parent-confirmation` | `PUT` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/parent/student/:studentId` | `GET` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/parent/od/:id/confirm` | `PUT` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/parent/leave/:id/confirm` | `PUT` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/results/me` | `GET` | `ResultsController.getMyResults` | `ResultsService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/results/student/:studentId` | `GET` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/results/upload` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/results/:id` | `PUT` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/results/:id` | `DELETE` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/results/:id/download` | `GET` | `ResultsController.downloadResult` | `ResultsService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/results/:id/view` | `GET` | `ResultsController.viewResult` | `ResultsService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/search` | `GET` | `SearchController.search` | `SearchService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/student/me` | `GET` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/student/me` | `PUT` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/student/me/documents/:docType` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/student/me/submit` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/student/me/request-edit` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/student` | `GET` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/student/:id` | `GET` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/student/:id/approve-edit` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/student/:id/quota-request` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |
| `/api/student/:id/scholarship-request` | `POST` | `Handled Inline` | `CoreService` | `Default/Token Required` | `JSON Payload` | `JSON Object` |

## 3️⃣ Database Schema

### `audit_logs`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `actor_id` | `UUID` |
| `college_id` | `UUID` |
| `role` | `VARCHAR(100)` |
| `action` | `TEXT` |
| `entity_type` | `TEXT` |
| `entity_id` | `UUID` |
| `metadata` | `JSONB` |
| `timestamp` | `TIMESTAMP` |
| `created_at` | `TIMESTAMP` |

### `event_outbox`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `event_id` | `UUID` |
| `type` | `TEXT` |
| `actor_id` | `UUID` |
| `entity_type` | `TEXT` |
| `entity_id` | `UUID` |
| `metadata` | `JSONB` |
| `status` | `TEXT` |
| `retry_count` | `INT` |
| `last_error` | `TEXT` |
| `created_at` | `TIMESTAMP` |
| `processed_at` | `TIMESTAMP` |

### `system_alerts`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `type` | `VARCHAR(100)` |
| `message` | `TEXT` |
| `metadata` | `JSONB` |
| `resolved` | `BOOLEAN` |
| `created_at` | `TIMESTAMP` |

### `roles`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `name` | `VARCHAR(50)` |
| `level` | `INT` |
| `created_at` | `TIMESTAMP` |

### `colleges`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `name` | `VARCHAR(255)` |
| `created_at` | `TIMESTAMP` |

### `departments`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `college_id` | `UUID` |
| `name` | `VARCHAR(255)` |
| `created_at` | `TIMESTAMP` |

### `clusters`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `college_id` | `UUID` |
| `name` | `VARCHAR(255)` |
| `created_at` | `TIMESTAMP` |

### `users`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `firebase_uid` | `VARCHAR(255)` |
| `email` | `VARCHAR(255)` |
| `active_email` | `VARCHAR(255)` |
| `role_id` | `UUID` |
| `status` | `VARCHAR(20)` |
| `college_id` | `UUID` |
| `department_id` | `UUID` |
| `cluster_id` | `UUID` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### `student_profiles`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `student_id` | `UUID` |
| `mentor_id` | `UUID` |
| `name` | `VARCHAR(255)` |
| `gender` | `VARCHAR(20)` |
| `dob` | `DATE` |
| `nationality` | `VARCHAR(100)` |
| `religion` | `VARCHAR(100)` |
| `community` | `VARCHAR(100)` |
| `community_cert_number` | `VARCHAR(100)` |
| `blood_group` | `VARCHAR(10)` |
| `emis_number` | `VARCHAR(50)` |
| `aadhaar_number` | `VARCHAR(20)` |
| `phone` | `VARCHAR(20)` |
| `email` | `VARCHAR(255)` |
| `parent_phone` | `VARCHAR(20)` |
| `parent_email` | `VARCHAR(255)` |
| `permanent_address` | `TEXT` |
| `communication_address` | `TEXT` |
| `communication_district` | `VARCHAR(100)` |
| `communication_town` | `VARCHAR(100)` |
| `communication_village` | `VARCHAR(100)` |
| `bank_account_number` | `VARCHAR(50)` |
| `bank_holder_name` | `VARCHAR(255)` |
| `bank_name` | `VARCHAR(255)` |
| `bank_branch_name` | `VARCHAR(255)` |
| `bank_ifsc_code` | `VARCHAR(20)` |
| `father_name` | `VARCHAR(255)` |
| `mother_name` | `VARCHAR(255)` |
| `guardian_name` | `VARCHAR(255)` |
| `parent_occupation` | `VARCHAR(255)` |
| `parent_annual_income` | `VARCHAR(50)` |
| `father_phone` | `VARCHAR(20)` |
| `mother_phone` | `VARCHAR(20)` |
| `register_number` | `VARCHAR(50)` |
| `admission_date` | `DATE` |
| `academic_year` | `VARCHAR(20)` |
| `programme` | `VARCHAR(50)` |
| `course_branch` | `VARCHAR(100)` |
| `department` | `VARCHAR(100)` |
| `year` | `INT` |
| `section` | `VARCHAR(10)` |
| `semester` | `INT` |
| `mode_of_admission` | `VARCHAR(50)` |
| `medium_of_instruction` | `VARCHAR(50)` |
| `previous_institution` | `VARCHAR(255)` |
| `year_of_passing` | `VARCHAR(10)` |
| `board` | `VARCHAR(100)` |
| `marks_or_cutoff` | `VARCHAR(50)` |
| `admission_quota` | `VARCHAR(50)` |
| `scholarship` | `VARCHAR(100)` |
| `status` | `VARCHAR(30)` |
| `profile_submitted` | `BOOLEAN` |
| `edit_request_pending` | `BOOLEAN` |
| `temp_unlock_expiry` | `TIMESTAMP` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### `leave_requests`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `student_id` | `UUID` |
| `mentor_id` | `UUID` |
| `hod_id` | `UUID` |
| `college_id` | `UUID` |
| `department_id` | `UUID` |
| `from_date` | `DATE` |
| `to_date` | `DATE` |
| `reason` | `TEXT` |
| `status` | `VARCHAR(30)` |
| `mentor_approval` | `BOOLEAN` |
| `hod_approval` | `BOOLEAN` |
| `remarks` | `TEXT` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### `od_requests`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `student_id` | `UUID` |
| `mentor_id` | `UUID` |
| `hod_id` | `UUID` |
| `college_id` | `UUID` |
| `department_id` | `UUID` |
| `dates` | `DATE[]` |
| `reason` | `TEXT` |
| `parents_informed` | `BOOLEAN` |
| `mentor_approval` | `VARCHAR(20)` |
| `hod_approval` | `VARCHAR(20)` |
| `brochure_url` | `TEXT` |
| `registration_proof_url` | `TEXT` |
| `participation_cert_url` | `TEXT` |
| `status` | `VARCHAR(30)` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### `results`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `student_id` | `UUID` |
| `semester` | `INT` |
| `file_name` | `VARCHAR(255)` |
| `file_url` | `TEXT` |
| `college_id` | `UUID` |
| `uploaded_at` | `TIMESTAMP` |
| `created_at` | `TIMESTAMP` |

### `notifications`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `user_id` | `UUID` |
| `message` | `TEXT` |
| `type` | `VARCHAR(20)` |
| `read` | `BOOLEAN` |
| `created_at` | `TIMESTAMP` |

### `mentor_mappings`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `student_id` | `UUID` |
| `mentor_id` | `UUID` |
| `college_id` | `UUID` |
| `active` | `BOOLEAN` |
| `created_at` | `TIMESTAMP` |

### `classes`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `college_id` | `UUID` |
| `department_id` | `UUID` |
| `department` | `VARCHAR(100)` |
| `year` | `INT` |
| `section` | `VARCHAR(10)` |
| `advisor_id` | `UUID` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### `class_student_mapping`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `class_id` | `UUID` |
| `student_id` | `UUID` |
| `created_at` | `TIMESTAMP` |

### `attendance_records`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `class_id` | `UUID` |
| `date` | `DATE` |
| `records` | `JSONB` |
| `saved_by` | `UUID` |
| `college_id` | `UUID` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### `feed_posts`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `title` | `TEXT` |
| `content` | `TEXT` |
| `type` | `VARCHAR(30)` |
| `author_id` | `UUID` |
| `author_role` | `VARCHAR(30)` |
| `student_name` | `VARCHAR(255)` |
| `department` | `VARCHAR(255)` |
| `college_id` | `UUID` |
| `status` | `VARCHAR(20)` |
| `created_at` | `TIMESTAMP` |
| `updated_at` | `TIMESTAMP` |

### `parent_student_mapping`
| Field | Type |
|---|---|
| `id` | `UUID` |
| `parent_id` | `UUID` |
| `student_id` | `UUID` |
| `relation` | `VARCHAR(50)` |
| `active` | `BOOLEAN` |
| `created_at` | `TIMESTAMP` |

## 4️⃣ Middleware

### `auth.middleware.js`
- `authorize` 
- `token` 
- `authorizeRoles` 
- `result` 
- `decodedToken` 
- `admin` 
- `roleRow` 
- `verifyFirebaseToken` 

### `error.handler.js`
- `errorHandler` 

### `lifecycle.middleware.js`
- `requireValidProfileStateForEdit` 
- `blockArchivedUsers` 
- `result` 
- `status` 

### `rate_limit.middleware.js`
- `searchLimiter` 
- `authLimiter` 
- `rateLimit` 
- `adminRestoreLimiter` 
- `emailSwitchLimiter` 

## 5️⃣ Event System

Events Used / Emitted:
- `ATTENDANCE_UPDATED`
- `FEED_POST_CREATED`
- `LEAVE_APPROVED`
- `LEAVE_STATUS_CHANGED`
- `NOTIFICATION_CREATED`
- `OD_APPROVED`
- `RESULT_UPLOADED`
- `ROLE_ASSIGNED`
- `STUDENT_PROFILE_CREATED`
