# GADIMS – Gender and Development Management and Information System

GADIMS is a web-based information system designed for the Xavier University Gender and Development (GAD) Office to manage seminars, employee participation, and compliance.

This implementation follows the architecture and tools described in the project papers:
- Web-based system built with **Node.js**, **Express.js**, **MongoDB**
- Integration with **Google Sheets** (from Google Forms responses)
- Automated email notifications using **Gmail**
- Role-based access (Admin and Employee dashboards)

## Core Features

- **Admin Dashboard**
  - View compliance summary and counts
  - Filter non-compliant employees
  - Manage seminars (with linked Google Sheet IDs)
  - Trigger sync of seminar attendance from Google Sheets
  - Post seminar **Articles/Updates** (title + image + text)
  - Send bulk reminder emails

- **Employee Portal**
  - Login with employee account
  - View own seminar completion status
  - View list of attended seminars
  - View latest seminar **Articles/Updates** with “Read more” expand

## Project Structure

- `src/server.js` – Express app bootstrap
- `src/config/db.js` – MongoDB connection for the `gadims` database
- `src/models/Employee.js` – Employee profile and role data
- `src/models/Seminar.js` – Seminar metadata (date, time, capacity, mandatory, etc.)
- `src/models/Registration.js` – Seminar registrations and attendance status
- `src/models/LearningMaterial.js` – Learning materials uploaded by admins
- `src/models/User.js` – User accounts for admin/employee login
- `src/models/PinVerification.js` – One-time PIN codes for sign-up verification
- `src/services/emailService.js` – Sends verification PINs and reminders through Gmail
- `src/routes/auth.js` – GADIMS authentication (PIN, sign-up, login)
- `src/routes/admin.js` – Admin API (seminars, materials, reports, reminders)
- `src/routes/employee.js` – Employee API (profile, seminars, materials, history)
- `src/models/Article.js` – Seminar articles/updates
- `public/*` – HTML/CSS/JS dashboards for GADIMS admin and employees

## Environment Configuration

Create a `.env` file in the project root:

```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/magis_gad
JWT_SECRET=change-this-secret

# Gmail (using app password)
GMAIL_USER=your-xu-gad-email@example.com
GMAIL_APP_PASSWORD=your-app-password

# Google service account JSON (as a single line JSON string)
GOOGLE_SERVICE_ACCOUNT_JSON={"client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n", ...}

# Default range for Google Form responses
GOOGLE_SHEET_RANGE=Form Responses 1!A2:F
```

> Do **not** commit `.env` or real credentials.

## Installation & Running

```bash
cd magis-system
npm install
npm run dev
```

The app will run at `http://localhost:4000`.

### Run “directly” with Docker (recommended)

If you want the system to run immediately without installing MongoDB locally:

```bash
cd magis-system
docker compose up --build
```

Then open `http://localhost:4000`.

### 1. Create an admin user

Use any REST client (or `curl`) to call:

```bash
POST http://localhost:4000/api/admin/seed-admin
Content-Type: application/json

{
  "username": "gad_admin",
  "password": "StrongPassword123"
}
```

Then log in from `public/admin.html`.

### 2. Create a seminar linked to a Google Sheet

```bash
POST /api/admin/seminars
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Gender Sensitivity Training 1",
  "date": "2026-03-10",
  "topic": "Gender Sensitivity",
  "facilitator": "GAD Office",
  "googleSheetId": "YOUR_SHEET_ID_HERE"
}
```

### 3. Sync seminar attendance from Google Sheets

```bash
POST /api/admin/seminars/:id/sync-sheets
Authorization: Bearer <admin_token>
```

This will:
- Read responses from the linked Google Sheet
- Create/update `Employee` records
- Create `Attendance` records
- Recompute `completedSeminarsCount` per employee

### 4. Send bulk reminder emails

```bash
POST /api/admin/notifications/reminders
Authorization: Bearer <admin_token>
```

Emails are sent to employees who have fewer completed seminars than their `requiredSeminarsPerYear`.

## Posting Seminar Articles (Admin)

In `Admin Dashboard` → `Post Seminar Article`:
- Add a **title**
- (Optional) link to a **seminar**
- (Optional) upload a **cover image**
- Add the **article text**

Employees will see the latest posts on the Employee Portal and can click **Read more** to open the full article.

## Notes & Assumptions

- Google Forms → Google Sheets connection is configured manually in Google Workspace.
- The service account used for Sheets must have access to the target spreadsheets.
- Employee accounts (`User` with role `employee`) can be created via the Admin Dashboard (“Create Employee Account”).
- This is a semester-scale implementation focused on core monitoring, reporting, and notifications, consistent with the approved project scope.

