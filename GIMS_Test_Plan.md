# GIMS – GAD Integrated Management System
# Software Test Plan

**Project:** GIMS – GAD Integrated Management System
**Institution:** Xavier University Ateneo de Cagayan
**Version:** 1.0
**Date:** April 27, 2026
**Prepared by:** Group 1 / Group 6

---

## Table of Contents
1. [Authentication Module](#1-authentication-module)
2. [Account Registration Module](#2-account-registration-module)
3. [Admin – Seminar Management](#3-admin--seminar-management)
4. [Admin – Attendance Management](#4-admin--attendance-management)
5. [Admin – Certificate Management](#5-admin--certificate-management)
6. [Admin – Employee Management](#6-admin--employee-management)
7. [Admin – Reports and Data Import](#7-admin--reports-and-data-import)
8. [Employee – Dashboard and Compliance](#8-employee--dashboard-and-compliance)
9. [Employee – Seminar Registration](#9-employee--seminar-registration)
10. [Employee – Evaluations](#10-employee--evaluations)
11. [Employee – Certificates](#11-employee--certificates)
12. [Notification System](#12-notification-system)

---

## 1. Authentication Module

### Requirement Addressed
The system shall allow registered employees and administrators to log in using their Xavier University email and password. The system shall reject invalid credentials, unregistered accounts, and deactivated accounts.

### Objective
Verify that the login functionality correctly authenticates valid users, enforces role-based redirection, and handles invalid inputs gracefully.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-AUTH-001 | Login with valid employee credentials | Email, Password | `juan.delacruz@xu.edu.ph`, `GimsEmp!123` | Login succeeds; JWT token stored in localStorage; user redirected to Employee Dashboard (`/employee.html`) |
| TC-AUTH-002 | Login with valid admin credentials | Email, Password | `admin@xu.edu.ph`, `GimsAdmin!123` | Login succeeds; JWT token stored; user redirected to Admin Dashboard (`/admin.html`) |
| TC-AUTH-003 | Login with incorrect password | Email, Password | `juan.delacruz@xu.edu.ph`, `WrongPass!` | Login fails; error message displayed: *"Invalid credentials."*; user remains on login page |
| TC-AUTH-004 | Login with unregistered email | Email, Password | `notregistered@xu.edu.ph`, `AnyPass!123` | Login fails; error message displayed: *"Invalid credentials."* |
| TC-AUTH-005 | Login with a non-XU email | Email, Password | `user@gmail.com`, `AnyPass!123` | Login fails; validation error: *"Only @xu.edu.ph or @my.xu.edu.ph emails are allowed."* |
| TC-AUTH-006 | Login with a deactivated employee account | Email, Password | `deactivated@xu.edu.ph`, correct password | Login fails; error: *"Your account is deactivated. Please contact the GAD office."* |
| TC-AUTH-007 | Login with empty email field | Email | *(blank)*, `AnyPass!123` | Form validation prevents submission; required field indicator shown |
| TC-AUTH-008 | Login with empty password field | Password | `juan.delacruz@xu.edu.ph`, *(blank)* | Form validation prevents submission; required field indicator shown |
| TC-AUTH-009 | Forgot Password – request reset PIN with valid XU email | Email (Reset Modal) | `juan.delacruz@xu.edu.ph` | PIN sent to the email; success message shown; PIN entry step becomes active |
| TC-AUTH-010 | Forgot Password – request reset PIN with non-XU email | Email (Reset Modal) | `user@yahoo.com` | Error: *"Only @xu.edu.ph or @my.xu.edu.ph emails are allowed."* |
| TC-AUTH-011 | Forgot Password – verify correct PIN within 10 minutes | PIN field | 6-digit PIN received via email | PIN accepted; password reset form unlocked |
| TC-AUTH-012 | Forgot Password – verify expired or wrong PIN | PIN field | `000000` (incorrect) | Error: *"Invalid or expired PIN."* |
| TC-AUTH-013 | Forgot Password – reset password with valid new password | New Password | `NewPass!456` | Password updated; success message shown; user can log in with new password |
| TC-AUTH-014 | Forgot Password – reset password shorter than 8 characters | New Password | `abc` | Error: *"Password must be at least 8 characters long."* |

---

## 2. Account Registration Module

### Requirement Addressed
The system shall allow new Xavier University employees to self-register using their official XU email address. Registration requires email PIN verification before account creation is permitted.

### Objective
Verify that the two-step signup flow (email verification → profile completion) works correctly, validates inputs, and prevents duplicate registrations.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-REG-001 | Request verification PIN with valid XU email | Email | `new.employee@xu.edu.ph` | 6-digit PIN sent to email; success message displayed; PIN input step shown |
| TC-REG-002 | Request verification PIN with student XU email | Email | `student@my.xu.edu.ph` | 6-digit PIN sent to email; success message displayed |
| TC-REG-003 | Request verification PIN with non-XU email | Email | `user@gmail.com` | Error: *"Only @xu.edu.ph or @my.xu.edu.ph emails are allowed."* |
| TC-REG-004 | Verify PIN with correct 6-digit code | PIN field | Valid PIN from email | PIN accepted; profile completion form unlocked |
| TC-REG-005 | Verify PIN with incorrect code | PIN field | `123456` (wrong) | Error: *"Invalid or expired PIN."* |
| TC-REG-006 | Verify PIN after 5-minute expiry | PIN field | Expired PIN | Error: *"Invalid or expired PIN."* |
| TC-REG-007 | Create account with all required fields valid | Full Name, Department, Position, Birth Sex, Gender Identity, Password | `Maria Santos`, `Finance`, `Accountant`, `Female`, `Woman`, `SecurePass!1` | Account created; JWT token saved; user automatically logged in and redirected to Employee Dashboard |
| TC-REG-008 | Create account with missing Full Name | Full Name | *(blank)* | Form validation error; submission blocked |
| TC-REG-009 | Create account with missing Department | Department | *(blank)* | Form validation error; submission blocked |
| TC-REG-010 | Create account with password shorter than 8 characters | Password | `abc123` | Error: password too short; submission blocked |
| TC-REG-011 | Attempt to register with an already-registered email | Email | `juan.delacruz@xu.edu.ph` (existing) | Error: *"An account with this email already exists."* |
| TC-REG-012 | Create account without completing PIN verification | Profile form | All fields filled | Profile form is locked; submit button disabled until PIN is verified |

---

## 3. Admin – Seminar Management

### Requirement Addressed
The system shall allow administrators to create, edit, delete, and manage seminars. Seminars may be single-day or multi-day, mandatory or optional, and have configurable certificate release modes.

### Objective
Verify that an admin can fully manage the seminar lifecycle including creation, editing, soft deletion, restoration, and marking as held.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-ADM-SEM-001 | Create a single-day seminar with all required fields | Title, Description, Date, Start Time, Duration, Capacity, Mandatory, Certificate Mode | `Gender Sensitivity Training`, `Intro to GAD`, `2026-05-10`, `09:00`, `3`, `30`, `false`, `evaluation` | Seminar created and appears in seminar list with correct details |
| TC-ADM-SEM-002 | Create a mandatory single-day seminar | Title, Mandatory toggle | `GAD Orientation 2026`, *(toggled on)* | Seminar created with `mandatory: true`; tagged as mandatory in the list |
| TC-ADM-SEM-003 | Create a multi-day seminar (Attend All mode) | Title, Sessions (calendar picker), Multi-Session Type | `GAD Leadership Series`, 3 selected dates, `all` | Multi-day seminar created with all 3 sessions; employees must attend all sessions |
| TC-ADM-SEM-004 | Create a multi-day seminar (Pick One mode) | Title, Sessions, Multi-Session Type | `GAD Workshop`, 2 selected dates, `pick-one` | Multi-day seminar created; employees can choose one session to attend |
| TC-ADM-SEM-005 | Create a seminar with missing title | Title | *(blank)* | Form validation error; submission blocked |
| TC-ADM-SEM-006 | Create a seminar with capacity of 0 | Capacity | `0` | Validation error: capacity must be at least 1 |
| TC-ADM-SEM-007 | Edit an existing seminar's title and capacity | Title, Capacity | `Updated Title`, `50` | Seminar updated; new title and capacity reflected in the list |
| TC-ADM-SEM-008 | Soft delete a seminar | Seminar (delete action) | Any active seminar | Seminar moved to "Recently Deleted" with 7-day retention; no longer shown in active list |
| TC-ADM-SEM-009 | Restore a soft-deleted seminar within 7 days | Seminar (restore action) | Soft-deleted seminar | Seminar restored to active list; removed from deleted view |
| TC-ADM-SEM-010 | Permanently delete a seminar after 7-day retention | Seminar (permanent delete action) | Seminar past retention period | Seminar and all related registrations/attendance permanently removed |
| TC-ADM-SEM-011 | Mark a single-day seminar as held | Seminar (mark held action) | Active seminar | Seminar marked as held; `isHeld: true`; attendance recording unlocked |
| TC-ADM-SEM-012 | Mark a specific session of a multi-day seminar as held | Session (mark held action) | One session of a multi-day seminar | Selected session marked held; other sessions unaffected |
| TC-ADM-SEM-013 | Upload a PDF learning material to a seminar | Material Title, File (PDF) | `Presentation Slides`, valid PDF file | Material uploaded and listed under the seminar; accessible to attended employees |
| TC-ADM-SEM-014 | Upload a non-PDF/PPT file as material | File | `.exe` file | Upload rejected; error message shown |

---

## 4. Admin – Attendance Management

### Requirement Addressed
The system shall allow administrators to view registered participants, approve pre-registrations, and record attendance for employees who attended a seminar.

### Objective
Verify that pre-registration approval and attendance recording function correctly for both single-day and multi-day seminars.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-ADM-ATT-001 | View participants list for a seminar | Seminar (participants action) | Any seminar with registrations | All registered employees listed with their registration status |
| TC-ADM-ATT-002 | Approve a pending pre-registration | Registration (approve action) | Pre-registered employee | Status changes to `registered`; employee notified via notification |
| TC-ADM-ATT-003 | Record attendance for a registered participant | Attendance checkbox | Registered employee | Registration status updated to `attended`; seminar added to employee's `seminarsAttended` list |
| TC-ADM-ATT-004 | Mark a participant as absent | Attendance toggle | Registered employee | Status updated to `absent`; seminar not added to attended list |
| TC-ADM-ATT-005 | Record session attendance for a multi-day seminar (Attend All) | Session attendance per participant | Employee with all-session seminar | Per-session attendance recorded in `sessionAttendance` array |
| TC-ADM-ATT-006 | Record session attendance for Pick-One multi-day seminar | Session attendance | Employee with chosen session | Only the chosen session attendance tracked; other sessions skipped |
| TC-ADM-ATT-007 | Attempt to record attendance before marking seminar as held | Attendance action | Seminar with `isHeld: false` | Attendance recording blocked or warning shown; seminar must be marked held first |

---

## 5. Admin – Certificate Management

### Requirement Addressed
The system shall generate and deliver PDF certificates to employees who attended a seminar, with configurable release modes: automatic, evaluation-triggered, or manual.

### Objective
Verify that certificates are correctly generated, contain accurate information, and are delivered based on the configured release mode.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-ADM-CERT-001 | Manually send certificates to attended employees | Seminar (send certificates action) | Seminar with `certificateReleaseMode: manual` | Certificates generated and sent to all employees with `attended` status; `certificateIssued: true` set |
| TC-ADM-CERT-002 | Verify certificate contains correct employee name | Certificate PDF | Any valid certificate | Certificate displays correct full name, seminar title, date, department, and unique certificate code |
| TC-ADM-CERT-003 | Verify automatic certificate release after marking held | Seminar (mark held) | Seminar with `certificateReleaseMode: automatic` | Certificates automatically issued to all attended employees immediately upon marking held |
| TC-ADM-CERT-004 | Verify evaluation-triggered certificate release | Evaluation submission | Seminar with `certificateReleaseMode: evaluation` | Certificate becomes available only after employee submits evaluation |
| TC-ADM-CERT-005 | Attempt to send certificate to absent employee | Certificates action | Employee with `status: absent` | Certificate not issued to absent employee; only attended employees receive certificates |

---

## 6. Admin – Employee Management

### Requirement Addressed
The system shall allow administrators to view, search, filter, deactivate, and reactivate employee accounts, as well as send compliance reminder emails.

### Objective
Verify that admin can manage employee records and accounts, and communicate with non-compliant employees.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-ADM-EMP-001 | View complete employee list | (No input; load page) | — | All active employees displayed in a table with name, department, position, compliance status |
| TC-ADM-EMP-002 | Search employees by name | Search field | `Santos` | Filtered list showing only employees whose name contains "Santos" |
| TC-ADM-EMP-003 | Filter employees by department | Department filter | `Finance` | Only Finance department employees displayed |
| TC-ADM-EMP-004 | View individual employee profile | Employee (view profile action) | Any employee record | Modal shows full profile: name, email, department, position, gender info, seminars attended, compliance status |
| TC-ADM-EMP-005 | Deactivate an active employee account | Account status toggle | Active employee | Account status set to `deactivated`; employee can no longer log in |
| TC-ADM-EMP-006 | Reactivate a deactivated employee account | Account status toggle | Deactivated employee | Account status set to `active`; employee can log in again |
| TC-ADM-EMP-007 | Send compliance reminder to a specific non-compliant employee | Employee selection + notify action | Non-compliant employee | Reminder email sent to selected employee; confirmation shown to admin |
| TC-ADM-EMP-008 | Send bulk compliance reminders to all non-compliant employees | Bulk notify action | All non-compliant employees | Reminder emails sent to all selected non-compliant employees |
| TC-ADM-EMP-009 | Export employee records as CSV | Export CSV button | — | Browser downloads a `gims_employees.csv` file containing all employee records with compliance data |

---

## 7. Admin – Reports and Data Import

### Requirement Addressed
The system shall provide a compliance summary dashboard and allow administrators to import historical seminar attendance data from CSV files.

### Objective
Verify that the dashboard displays accurate statistics and that legacy data can be imported correctly via CSV.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-ADM-RPT-001 | View dashboard compliance summary | (No input; load dashboard) | — | Dashboard shows: total employees, compliance rate (%), number of compliant employees, gender breakdown |
| TC-ADM-RPT-002 | View seminar attendance report | Seminar (view report action) | Any held seminar | Report shows total registered, total attended, total absent, attendance rate for that seminar |
| TC-ADM-RPT-003 | View seminar evaluation summary | Seminar (view evaluations action) | Seminar with submitted evaluations | Summary shows average rating, total submissions, recommendation rate, and individual feedback |
| TC-ADM-RPT-004 | Download CSV import template | Download template button | — | Browser downloads a `gims-legacy-import-template.csv` with correct column headers |
| TC-ADM-RPT-005 | Import a valid CSV with historical seminar attendance | CSV file upload | Valid CSV with columns: `employee_email`, `seminar_title`, `seminar_date`, `start_time`, `duration_hours`, `status` | Records imported; attendance reflected in employee compliance count |
| TC-ADM-RPT-006 | Import a CSV with a non-existent employee email | CSV file upload | CSV row with `notfound@xu.edu.ph` | Row skipped or error reported; other valid rows imported; warning shown to admin |
| TC-ADM-RPT-007 | Import a CSV with missing required columns | CSV file upload | CSV missing `seminar_date` column | Import rejected; error message: required columns are missing |

---

## 8. Employee – Dashboard and Compliance

### Requirement Addressed
The system shall show each employee their current compliance status, progress toward the annual seminar requirement, and a summary of attended seminars.

### Objective
Verify that the employee dashboard correctly reflects real-time compliance progress and seminar history.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-EMP-DASH-001 | View compliance status on dashboard load | (No input; authenticated employee loads dashboard) | — | Dashboard displays compliance progress bar, attended count, required count (default 5), and percentage |
| TC-EMP-DASH-002 | Compliance status shown as Compliant | (No input; employee has attended ≥ 5 seminars this year) | — | Status indicator shows "Compliant" in green; progress bar at 100% |
| TC-EMP-DASH-003 | Compliance status shown as Non-Compliant | (No input; employee has attended < 5 seminars this year) | — | Status indicator shows "Non-Compliant" in red; remaining count shown |
| TC-EMP-DASH-004 | View list of available seminars in dashboard | Seminars tab | — | Open and mandatory seminars displayed with title, date, capacity, and registration status |
| TC-EMP-DASH-005 | View attended seminars tab | Attended tab | — | List of seminars where employee status is `attended`; includes seminar title, date, certificate status |

---

## 9. Employee – Seminar Registration

### Requirement Addressed
The system shall allow employees to pre-register for open seminars, pending admin approval. Mandatory seminars are indicated. Employees with multi-day/pick-one seminars may choose their preferred session.

### Objective
Verify that the pre-registration flow works correctly, enforces capacity limits, and handles edge cases.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-EMP-REG-001 | Pre-register for an open seminar | Pre-Register button, Consent checkbox | Seminar with available capacity; consent checked | Registration created with `status: pre-registered`; confirmation shown; notification sent to employee upon admin approval |
| TC-EMP-REG-002 | Pre-register without checking consent | Consent checkbox | Unchecked | Submission blocked; consent required message shown |
| TC-EMP-REG-003 | Pre-register for a seminar already at full capacity | Pre-Register button | Seminar with `registeredEmployees.length >= capacity` | Error: seminar is full; registration not created |
| TC-EMP-REG-004 | Attempt to pre-register for a seminar already registered for | Pre-Register button | Seminar employee is already pre-registered for | Error or button disabled: already registered |
| TC-EMP-REG-005 | Pick-One multi-day seminar shows per-session Pre-Register buttons | Seminar card (pick-one type) | Multi-day seminar with `multiSessionType: pick-one` | Seminar card expands to show each session as a separate row, each with its own "Pre-Register" button; a "Multi-Day" badge is shown; no single shared button |
| TC-EMP-REG-006 | Pre-register for a specific session of a Pick-One seminar | Per-session Pre-Register button | One session row clicked | Modal opens with the selected session shown as "Selected session" (locked display, not a radio picker); employee confirms with consents |
| TC-EMP-REG-007 | View pre-registered seminars tab | Pre-Registered tab | — | All seminars with `status: pre-registered` listed; awaiting approval label shown |

---

## 10. Employee – Evaluations

### Requirement Addressed
The system shall allow employees to submit an evaluation for a seminar they attended, once the evaluation is made available by the system or admin. An evaluation includes a star rating, feedback, and a recommendation flag.

### Objective
Verify that employees can submit evaluations and that duplicate submissions are prevented.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-EMP-EVAL-001 | Submit a seminar evaluation with all fields | Star rating, Feedback, Would Recommend | `4 stars`, `Very informative seminar.`, `Yes` | Evaluation submitted; `evaluationCompleted: true` set on registration; certificate available if mode is `evaluation` |
| TC-EMP-EVAL-002 | Submit evaluation without selecting a star rating | Star rating | *(none selected)* | Submission blocked; error: rating is required |
| TC-EMP-EVAL-003 | Submit evaluation with no feedback (optional) | Feedback | *(blank)* | Evaluation submitted successfully; feedback stored as empty string |
| TC-EMP-EVAL-004 | Attempt to submit evaluation for a seminar not yet attended | Evaluation form | Seminar with `status: pre-registered` or `absent` | Evaluation form not accessible; button hidden or disabled |
| TC-EMP-EVAL-005 | Attempt to submit a duplicate evaluation for the same seminar | Evaluation form | Already-evaluated seminar | Error: evaluation already submitted; form shows completed state |

---

## 11. Employee – Certificates

### Requirement Addressed
The system shall allow employees to download their PDF certificate for any seminar they attended, provided the certificate has been issued.

### Objective
Verify that certificate download works correctly and that access is restricted to eligible employees.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-EMP-CERT-001 | Download certificate for an attended seminar | Download Certificate button | Seminar with `certificateIssued: true` | PDF certificate downloaded; contains correct name, seminar title, date, department, and unique certificate code (GAD-XXXXX-...) |
| TC-EMP-CERT-002 | Certificate download unavailable before issuance | Download Certificate button | Seminar with `certificateIssued: false` | Download button hidden or disabled; message: certificate not yet available |
| TC-EMP-CERT-003 | Certificate unavailable for absent employee | Certificate section | Employee with `status: absent` | No certificate option shown for absent registrations |
| TC-EMP-CERT-004 | Verify certificate code uniqueness | Certificate code on PDF | Two different certificates | Each certificate displays a unique code following the GAD-XXXXX-XXXXX-XXXX-XXXX format |

---

## 12. Notification System

### Requirement Addressed
The system shall notify employees of key events: pre-registration approval, certificate availability, evaluation availability, and seminar updates.

### Objective
Verify that notifications are created for the correct events, displayed in the notification bell, and can be marked as read.

---

| Test Case ID | Description | Input Field(s) | Input Value(s) | Expected Output |
|---|---|---|---|---|
| TC-NOTIF-001 | Employee receives notification when pre-registration is approved | (Triggered by admin approval) | Admin approves registration | Notification of type `approval` created for employee; unread badge increments on notification bell |
| TC-NOTIF-002 | Employee receives notification when certificate is issued | (Triggered by certificate issuance) | Admin sends certificate | Notification of type `certificate` created; badge updates |
| TC-NOTIF-003 | Employee receives notification when evaluation becomes available | (Triggered after attendance recorded) | Attendance marked for employee | Notification of type `evaluation` created; badge updates |
| TC-NOTIF-004 | View notifications dropdown | Notification bell | — | Dropdown shows all notifications with message, type, and timestamp; unread items highlighted |
| TC-NOTIF-005 | Mark a single notification as read | Notification item (click/read action) | One unread notification | Notification `read: true`; badge count decrements by 1 |
| TC-NOTIF-006 | Mark all notifications as read | Mark All Read button | Multiple unread notifications | All notifications set to `read: true`; badge count resets to 0 |
| TC-NOTIF-007 | Unread badge shows correct count | Notification bell | 3 unread notifications | Badge displays `3` |

---

*End of GIMS Test Plan v1.0*
