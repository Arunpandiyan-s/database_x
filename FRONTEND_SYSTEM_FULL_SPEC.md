# FRONTEND SYSTEM FULL SPEC

## 1️⃣ Project Structure

```
frontend/
 └── src/
     ├── pages/
     ├── components/
     ├── contexts/
     ├── api/
     ├── hooks/
     ├── utils/
     ├── types/
```

### Files inside src/pages:
- AttendanceManagement.tsx
- AttendanceReports.tsx
- AuditLogs.tsx
- CampusFeed.tsx
- CreateAccount.tsx
- Dashboard.tsx
- FeedManagement.tsx
- ForgotPassword.tsx
- HierarchyManagement.tsx
- Index.tsx
- LeaveManagement.tsx
- LeavePage.tsx
- Login.tsx
- MentorReassignment.tsx
- MentorResults.tsx
- MentorStudentView.tsx
- NotFound.tsx
- Notifications.tsx
- ODManagement.tsx
- Results.tsx
- RoleManagement.tsx
- SearchPage.tsx
- StudentDetail.tsx
- StudentMenteeAssignment.tsx
- StudentProfile.tsx
- VicePrincipalDashboard.tsx

## 2️⃣ Role Discovery

| Role | Description | Pages Accessible | Allowed Actions |
|---|---|---|---|
| `student` | System role | Based on `ProtectedLayout` | View/Manage specific features |
| `mentor` | System role | Based on `ProtectedLayout` | View/Manage specific features |
| `class_advisor` | System role | Based on `ProtectedLayout` | View/Manage specific features |
| `hod` | System role | Based on `ProtectedLayout` | View/Manage specific features |
| `cluster_hod` | System role | Based on `ProtectedLayout` | View/Manage specific features |
| `vice_principal` | System role | Based on `ProtectedLayout` | View/Manage specific features |
| `principal` | System role | Based on `ProtectedLayout` | View/Manage specific features |
| `technical_director` | System role | Based on `ProtectedLayout` | View/Manage specific features |
| `admin` | System role | Based on `ProtectedLayout` | View/Manage specific features |
| `parent` | System role | Based on `ProtectedLayout` | View/Manage specific features |

## 3️⃣ Route Analysis

| Route | Component | Roles Allowed | Backend Data Required |
|---|---|---|---|
| `/login` | `Login` | `All` | Context Auth Context |
| `/create-account` | `CreateAccount` | `All` | Context Auth Context |
| `/forgot-password` | `ForgotPassword` | `All` | Context Auth Context |
| `/` | `Dynamic Router` | `All` | Context Auth Context |
| `/dashboard` | `Dashboard` | `Authenticated` | Context Auth Context |
| `/profile` | `StudentProfile` | `Authenticated` | Context Auth Context |
| `/students` | `StudentProfile` | `Authenticated` | Context Auth Context |
| `/students/:studentId` | `Dynamic Router` | `Authenticated` | Context Auth Context |
| `/edit-requests` | `StudentProfile` | `Authenticated` | Context Auth Context |
| `/od` | `ODManagement` | `Authenticated` | Context Auth Context |
| `/leave` | `LeaveRouter` | `Authenticated` | Context Auth Context |
| `/results` | `Results` | `Authenticated` | Context Auth Context |
| `/mentor-results` | `MentorResults` | `Authenticated` | Context Auth Context |
| `/mentor/students/:studentId` | `Dynamic Router` | `Authenticated` | Context Auth Context |
| `/notifications` | `Notifications` | `Authenticated` | Context Auth Context |
| `/search` | `SearchPage` | `Authenticated` | Context Auth Context |
| `/assignments` | `AssignmentsRouter` | `Authenticated` | Context Auth Context |
| `/mentor-reassignment` | `Dynamic Router` | `Authenticated` | Context Auth Context |
| `/audit` | `AuditLogs` | `Authenticated` | Context Auth Context |
| `/feed` | `Dynamic Router` | `Authenticated` | Context Auth Context |
| `/vp-announcements` | `Dynamic Router` | `Authenticated` | Context Auth Context |
| `/attendance` | `Dynamic Router` | `Authenticated` | Context Auth Context |
| `/attendance-reports` | `Dynamic Router` | `Authenticated` | Context Auth Context |
| `*` | `NotFound` | `All` | Context Auth Context |

## 4️⃣ Page Feature Analysis

### AttendanceManagement
- **Component**: `AttendanceManagement`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: No

### AttendanceReports
- **Component**: `AttendanceReports`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: No

### AuditLogs
- **Component**: `AuditLogs`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: No

### CampusFeed
- **Component**: `CampusFeed`
- **Forms**: No
- **Tables**: No
- **Uploads**: No

### CreateAccount
- **Component**: `CreateAccount`
- **Forms**: No
- **Tables**: No
- **Uploads**: No

### Dashboard
- **Component**: `Dashboard`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: No

### FeedManagement
- **Component**: `FeedManagement`
- **Forms**: No
- **Tables**: No
- **Uploads**: No

### ForgotPassword
- **Component**: `ForgotPassword`
- **Forms**: Yes
- **Tables**: No
- **Uploads**: No

### HierarchyManagement
- **Component**: `HierarchyManagement`
- **Forms**: Yes
- **Tables**: Yes
- **Uploads**: Yes

### Index
- **Component**: `Index`
- **Forms**: No
- **Tables**: No
- **Uploads**: No

### LeaveManagement
- **Component**: `LeaveManagement`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: No

### LeavePage
- **Component**: `LeavePage`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: No

### Login
- **Component**: `Login`
- **Forms**: Yes
- **Tables**: No
- **Uploads**: No

### MentorReassignment
- **Component**: `MentorReassignment`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: No

### MentorResults
- **Component**: `MentorResults`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: Yes

### MentorStudentView
- **Component**: `MentorStudentView`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: No

### NotFound
- **Component**: `NotFound`
- **Forms**: No
- **Tables**: No
- **Uploads**: No

### Notifications
- **Component**: `Notifications`
- **Forms**: No
- **Tables**: No
- **Uploads**: No

### ODManagement
- **Component**: `ODManagement`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: Yes

### Results
- **Component**: `Results`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: No

### RoleManagement
- **Component**: `RoleManagement`
- **Forms**: Yes
- **Tables**: Yes
- **Uploads**: No

### SearchPage
- **Component**: `SearchPage`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: No

### StudentDetail
- **Component**: `StudentDetail`
- **Forms**: No
- **Tables**: No
- **Uploads**: No

### StudentMenteeAssignment
- **Component**: `StudentMenteeAssignment`
- **Forms**: No
- **Tables**: Yes
- **Uploads**: No

### StudentProfile
- **Component**: `StudentProfile`
- **Forms**: Yes
- **Tables**: Yes
- **Uploads**: Yes

### VicePrincipalDashboard
- **Component**: `VicePrincipalDashboard`
- **Forms**: No
- **Tables**: No
- **Uploads**: No

## 5️⃣ Action Button Extraction

| Action | Component | Handler Function | Roles Allowed |
|---|---|---|---|
| Action/Click | `AttendanceManagement` | `handleSave` | User specific |
| Action/Click | `CreateAccount` | `handleSendMobileOtp` | User specific |
| Action/Click | `CreateAccount` | `handleSendEmailOtp` | User specific |
| Action/Click | `CreateAccount` | `handleRoleChange` | User specific |
| Action/Click | `Dashboard` | `handleScholarshipRequest` | User specific |
| Action/Click | `Dashboard` | `handleQuotaRequest` | User specific |
| Action/Click | `FeedManagement` | `handlePrincipalSubmit` | User specific |
| Action/Click | `FeedManagement` | `handleAdminApprove` | User specific |
| Action/Click | `FeedManagement` | `handleDelete` | User specific |
| Action/Click | `FeedManagement` | `handleAdminCreate` | User specific |
| Action/Click | `FeedManagement` | `handleAdminReject` | User specific |
| Action/Click | `ForgotPassword` | `handleSubmit` | User specific |
| Action/Click | `HierarchyManagement` | `handleSubmit` | User specific |
| Action/Click | `HierarchyManagement` | `handleSave` | User specific |
| Action/Click | `LeaveManagement` | `handleAction` | User specific |
| Action/Click | `LeavePage` | `handleSubmit` | User specific |
| Action/Click | `Login` | `handleLogin` | User specific |
| Action/Click | `Login` | `handleStudentGoogleLogin` | User specific |
| Action/Click | `MentorReassignment` | `handleCurrentMentorChange` | User specific |
| Action/Click | `MentorReassignment` | `handleReassign` | User specific |
| Action/Click | `MentorReassignment` | `handleYearChange` | User specific |
| Action/Click | `MentorResults` | `handleDownload` | User specific |
| Action/Click | `MentorResults` | `handleEditSave` | User specific |
| Action/Click | `MentorResults` | `handleUpload` | User specific |
| Action/Click | `MentorResults` | `handleDelete` | User specific |
| Action/Click | `ODManagement` | `handleSubmitOD` | User specific |
| Action/Click | `Results` | `handleDownload` | User specific |
| Action/Click | `Results` | `handleView` | User specific |
| Action/Click | `RoleManagement` | `handleSubmit` | User specific |
| Action/Click | `RoleManagement` | `handleCancel` | User specific |
| Action/Click | `RoleManagement` | `handleSave` | User specific |
| Action/Click | `StudentDetail` | `handleAddRemark` | User specific |
| Action/Click | `StudentDetail` | `handleApproveEdit` | User specific |
| Action/Click | `StudentDetail` | `handleUnlockRecord` | User specific |
| Action/Click | `StudentMenteeAssignment` | `handleAssign` | User specific |
| Action/Click | `StudentMenteeAssignment` | `handleUnassign` | User specific |
| Action/Click | `StudentProfile` | `handleSubmit` | User specific |
| Action/Click | `StudentProfile` | `handleApproveEdit` | User specific |
| Action/Click | `StudentProfile` | `handleRequestEdit` | User specific |
| Action/Click | `StudentProfile` | `handleBrowse` | User specific |
| Action/Click | `StudentProfile` | `handleDrop` | User specific |
| Action/Click | `StudentProfile` | `handleView` | User specific |
| Action/Click | `VicePrincipalDashboard` | `handleSaveEdit` | User specific |
| Action/Click | `VicePrincipalDashboard` | `handleStartEdit` | User specific |
| Action/Click | `VicePrincipalDashboard` | `handlePublish` | User specific |
## 6️⃣ Form Extraction

| Form | Field | Type | Required |
|---|---|---|---|
| `ForgotPassword` | `username` | Input/Select | Assumed Required |
## 7️⃣ File Upload Analysis

| Component | Upload Element | Handlers |
|---|---|---|
| `HierarchyManagement` | `<input type="file">` or FormData | Triggered locally |
| `MentorResults` | `<input type="file">` or FormData | Triggered locally |
| `ODManagement` | `<input type="file">` or FormData | Triggered locally |
| `StudentProfile` | `<input type="file">` or FormData | Triggered locally |
## 8️⃣ Table Interaction Analysis

| Table / Page | Columns / Actions |
|---|---|
| `AttendanceManagement` | #, Student Name, Register No., Status |
| `AttendanceReports` | Student Name, Register No., #, Percentage, P / A / OD |
| `AuditLogs` | User, Timestamp, Details, Action |
| `Dashboard` | Semester, Reg No, Date, Status, Email, Reason, Name, Role, Marksheet, Upload Date, Name, Dept |
| `HierarchyManagement` | {h} |
| `LeaveManagement` | Department, HOD, Student, Status, Mentor, Reason, Action, From, To, Applied |
| `LeavePage` | Status, Reason, Applied On, From, To |
| `MentorReassignment` | Dynamic headers |
| `MentorResults` | File, Actions, Uploaded On |
| `MentorStudentView` | {h} |
| `ODManagement` | HOD, Student, Status, Mentor, Reason, Action, Days |
| `Results` | S.No, Semester, File Name, Actions, Uploaded On, GPA |
| `RoleManagement` | Dynamic headers |
| `SearchPage` | Email, Name, Role |
| `StudentMenteeAssignment` | Dynamic headers |
| `StudentProfile` | Reg No, Status, Actions, Quota, Name, Dept, Scholarship |
## 9️⃣ Dashboard Metrics

| Metric Component | Page | Extracted Keywords |
|---|---|---|

## 🔟 Frontend API Layer

- **File**: `admin.api.ts` | **Function**: `adminApi`
- **File**: `attendance.api.ts` | **Function**: `attendanceApi`
- **File**: `auth.api.ts` | **Function**: `authApi`
- **File**: `dashboard.api.ts` | **Function**: `dashboardApi`
- **File**: `feed.api.ts` | **Function**: `feedApi`
- **File**: `leave.api.ts` | **Function**: `leaveApi`
- **File**: `mapping.api.ts` | **Function**: `mappingApi`
- **File**: `notification.api.ts` | **Function**: `notificationApi`
- **File**: `od.api.ts` | **Function**: `odApi`
- **File**: `result.api.ts` | **Function**: `resultApi`
- **File**: `search.api.ts` | **Function**: `searchApi`
- **File**: `student.api.ts` | **Function**: `studentApi`

## 1️⃣1️⃣ Frontend Data Models

```typescript
export type UserRole =
  | 'student'
  | 'mentor'
  | 'class_advisor'
  | 'hod'
  | 'cluster_hod'
  | 'vice_principal'
  | 'principal'
  | 'technical_director'
  | 'admin'
  | 'parent';

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  parentId?: string;
  campusId?: string;
  departmentId?: string;
  childStudentId?: string; // For parent role: links to their child's student ID
}

export type ProfileStatus = 'DRAFT' | 'LOCKED' | 'PENDING_APPROVAL' | 'TEMP_UNLOCKED';

export interface StudentProfile {
  id: string;
  userId: string;
  mentorId: string;

  // ── Basic Details ────────────────────────────────────────────────────────────
  name: string;           // Full Name as per 10th/12th certificates
  gender: string;
  dob: string;
  nationality: string;
  religion: string;
  community: string;      // Community / Category
  communityCertNumber: string; // Digitalised Community Certificate Number
  bloodGroup: string;

  // ── Contact Information ───────────────────────────────────────────────────────
  emisNumber: string;
  aadhaarNumber: string;
  phone: string;          // Student Mobile Number (linked with Aadhaar)
  email: string;
  parentPhone: string;    // Parent/Guardian Mobile Number
  parentEmail: string;   // Parent/Guardian Email ID
  permanentAddress: string;
  communicationAddress: string;
  communicationDistrict: string;
  communicationTown: string;
  communicationVillagePanchayat: string;
  pinCode: string;
  // Bank Details
  bankAccountNumber: string;
  bankAccountHolderName: string;
  bankName: string;
  bankBranchName: string;
  bankIfscCode: string;

  // ── Parent / Guardian Details ─────────────────────────────────────────────────
  fatherPhoto: string;
  motherPhoto: string;
  guardianPhoto: string;
  fatherName: string;
  motherName: string;
  guardianName: string;
  siblingName: string;
  siblingOccupation: string;
  fatherOccupation: string;
  motherOccupation: string;
  parentAnnualIncome: string;
  fatherPhone: string;
  motherPhone: string;

  // ── Academic Details ──────────────────────────────────────────────────────────
  registerNumber: string;
  admissionDate: string;
  markSheet: string;      // file reference
  academicYear: string;
  programme: string;      // UG/PG etc.
  courseBranch: string;
  department: string;
  year: number;
  section: string;
  semester: number;
  modeOfAdmission: string;   // Govt / Management
  mediumOfInstruction: string;

  // Academic History
  tenthInstitutionName: string;
  tenthBoard: string;
  tenthPercentage: string;

  eleventhInstitutionName: string;
  eleventhBoard: string;
  eleventhPercentage: string;

  twelfthInstitutionName: string;
  twelfthBoard: string;
  twelfthPercentage: string;

  // ── Photo ─────────────────────────────────────────────────────────────────────
  photo: string;

  // ── Metadata ──────────────────────────────────────────────────────────────────
  profileStatus: ProfileStatus;
  profileSubmitted: boolean;
  editRequestPending: boolean;
  quotaEditRequested: boolean;
  scholarshipEditRequested: boolean;
  tempUnlockExpiry?: string;

  // ── Admission & Scholarship ───────────────────────────────────────────────────
  admissionQuota: 'Government' | 'Management' | '';
  scholarship: '7.5 Reservation' | 'Sports Quota' | "Founder's Scholarship" | 'None' | '';
}

export interface ODRequest {
  id: string;
  studentId: string;
  studentName: string;
  year: number;
  branch: string;
  section: string;
  registerNumber: string;
  semester: number;
  daysAvailed: number;
  daysRequested: number;
  dates: string[];
  reason: string;
  parentsInformed: boolean;
  mentorApproval: 'pending' | 'approved' | 'rejected';
  hodApproval: 'pending' | 'approved' | 'rejected';
  parentConfirmation: boolean;
  brochureUrl?: string;
  registrationProofUrl?: string;
  participationCertUrl?: string;
  status: string;
  createdAt: string;
  mentorId: string;
  hodId: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'pending_mentor' | 'pending_hod' | 'approved' | 'rejected';
  mentorApproval?: boolean;
  hodApproval?: boolean;
  createdAt: string;
  mentorId: string;
  hodId: string;
}

export interface ResultUpload {
  id: string;
  studentId: string;
  semester: number;
  fileName: string;
  uploadDate: string;
  fileUrl: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface Campus {
  id: string;
  name: string;
  principalId: string;
}

export interface Department {
  id: string;
  name: string;
  campusId: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  mentor: 'Mentor',
  class_advisor: 'Class Advisor',
  hod: 'HOD',
  cluster_hod: 'Cluster HOD',
  vice_principal: 'Vice Principal',
  principal: 'Principal',
  technical_director: 'Technical Director',
  admin: 'Admin',
  parent: 'Parent',
};

export interface FeedPost {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'achievement';
  status: 'draft' | 'submitted_to_admin' | 'approved_by_admin' | 'published' | 'rejected';
  authorRole: 'admin' | 'principal';
  createdAt: string;
  studentName?: string;
  department?: string;
}

export interface Class {
  id: string;
  department: string;
  year: string;
  section: string;
  advisorId: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  date: string;
  records: {
    studentId: string;
    studentName: string;
    registerNumber: string;
    status: 'present' | 'absent' | 'od';
  }[];
}

export const CAMPUSES = [
  'AI Campus',
  'Technology Campus',
  'Physio Campus',
  'Nursing Campus',
  'Allied Health Campus',
  'Pharmacy Health & Science Campus',
  'College of Education Campus',
  'Arts & Science Campus',
];

```
