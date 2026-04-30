# GIMS – GAD Integrated Management System

GIMS is a web-based information system for the **Xavier University Gender and Development (GAD) Office**. It manages seminars, employee participation, evaluations, certificates, and compliance reporting.

Built with:
- **Node.js**, **Express.js**, **MongoDB** (Mongoose)
- **Gmail (Nodemailer)** for verification PINs and reminders
- **Puppeteer** for certificate PDF generation
- Role-based access (Admin and Employee dashboards)

## Core Features

### Admin Dashboard
- Manage seminars (sessions, capacity, mandatory flag, certificate release mode)
- Track registrations, attendance, and finalize per-session attendance
- Issue and download seminar certificates
- Manage employee accounts (create, deactivate, reset)
- Post seminar **Articles / Updates**
- Upload **Learning Materials** (PDF / PPT / PPTX)
- Send bulk reminder emails for non-compliant employees
- Department gender-mix reports (birth-sex based)

### Employee Portal
- Sign up via Gmail PIN verification
- View own compliance status and required seminars
- Register for upcoming seminars
- Submit seminar evaluations
- Download earned certificates
- Read latest seminar Articles / Updates

## Project Structure

```
src/
  server.js                 Express bootstrap
  config/db.js              MongoDB connection (database: gims)
  models/
    Article.js              Seminar articles / updates
    Employee.js             Employee profile + role
    Evaluation.js           Post-seminar evaluation responses
    LearningMaterial.js     Uploaded materials metadata
    Notification.js         In-app notifications
    PasswordReset.js        One-time password-reset PINs
    PinVerification.js      Sign-up PIN verification
    Registration.js         Seminar registration + per-session attendance
    Seminar.js              Seminar metadata
    User.js                 Login accounts (admin / employee)
  routes/
    admin.js                Admin API
    auth.js                 Sign-up, login, PIN, password reset
    employee.js             Employee API
  services/
    certificateService.js   Certificate rendering / issuance (Puppeteer)
    emailService.js         Gmail-based PIN + reminder emails
  scripts/
    seedSamples.js          Optional: seed sample admin/employee/seminar data
public/
  admin.html, employee.html, signup.html, login.html, index.html
  css/                      Stylesheets
  js/                       Frontend scripts
  images/                   Static images
  uploads/                  Runtime user uploads (gitignored)
```

## Environment Configuration

Copy `.env.example` to `.env` and fill in real values:

```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/gims
JWT_SECRET=change-this-secret
USE_IN_MEMORY_DB=false

# Gmail (use an App Password)
GMAIL_USER=your-xu-gad-email@example.com
GMAIL_APP_PASSWORD=your-app-password

# Branding
ORG_NAME=Xavier University – Ateneo de Cagayan
SYSTEM_NAME=GIMS
```

> **Never commit `.env` or real credentials.** `.env` is gitignored.
> Set `USE_IN_MEMORY_DB=true` to spin up an ephemeral MongoDB for local testing without installing MongoDB.

## Installation & Running

### Local (Node + MongoDB)

```bash
npm install
npm run dev
```

The app runs at `http://localhost:4000`.

### Docker (recommended)

```bash
docker compose up --build
```

This brings up two containers:
- `gims_mongo` (MongoDB 7, database name `gims`)
- `gims_app` (the Node app, port 4000)

Open `http://localhost:4000`.

## First-Time Setup

### 1. Create an admin account

Either:
- Run the optional seed script: `node src/scripts/seedSamples.js`
- Or use the **Create Admin Account** form inside the Admin Dashboard, or call the bootstrap endpoint:

```bash
POST http://localhost:4000/api/admin/seed-admin
Content-Type: application/json

{
  "name": "GIMS Admin",
  "email": "gad.admin@xu.edu.ph",
  "password": "StrongPassword123",
  "birthSex": "Female"
}
```

Then log in from `/admin.html`.

### 2. Create seminars and learning materials

Use the Admin Dashboard:
- **Manage Seminars** → create sessions, set capacity, mandatory flag, certificate release mode.
- **Learning Materials** → upload PDFs / PPTs (max 50 MB each).

### 3. Employee onboarding

Employees sign up at `/signup.html` using their `@xu.edu.ph` Gmail. A 6-digit PIN is emailed for verification, after which they set a password and log in at `/login.html`.

## Security Notes

- `.env` and `public/uploads/*` are gitignored — never commit secrets or user uploads.
- Passwords are hashed with **bcryptjs**; only password hashes are stored.
- Admin / employee routes are gated by JWT (`JWT_SECRET`). Rotate the secret in production.
- Gmail uses an **App Password**, not the account password. Revoke if leaked.
- File uploads are restricted by extension and size (PDF/PPT/PPTX only for materials, ≤50 MB).

## License

MIT — see `package.json`.
