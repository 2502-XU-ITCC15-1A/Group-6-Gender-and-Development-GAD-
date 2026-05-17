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

## Prerequisites

Before setting up GIMS on a new device, ensure you have:

- **Node.js** (v18 or higher) and **npm** (v8+)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify: `node --version` and `npm --version`
- **MongoDB** (local install) OR **Docker** (recommended)
  - **Option A (Local)**: [Install MongoDB Community Edition](https://www.mongodb.com/docs/manual/installation/)
  - **Option B (Docker)**: [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Gmail App Password** (for email notifications)
  - Enable 2-Step Verification on your Gmail account
  - Generate an [App Password](https://myaccount.google.com/apppasswords)
- **Text Editor / IDE** (e.g., VS Code)
- **Git** (to clone the repository)

---

## Step-by-Step Setup Guide

### **Step 1: Clone the Repository**

```bash
git clone https://github.com/your-username/GIMS.git
cd GIMS
```

---

### **Step 2: Install Dependencies**

```bash
npm install
```

This installs all required packages listed in `package.json`:
- Express, Mongoose, JWT, bcryptjs
- Email & certificate services (Nodemailer, Puppeteer, Brevo API)
- Utilities (CORS, Morgan, Multer, ExcelJS)

---

### **Step 3: Environment Configuration**

Create a `.env` file in the project root directory:

```bash
touch .env
```

Add the following configuration (copy-paste and customize):

```env
# Server
PORT=4000

# MongoDB Connection
MONGO_URI=mongodb://127.0.0.1:27017/gims
USE_IN_MEMORY_DB=false

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Service (Gmail / Nodemailer)
GMAIL_USER=your-xu-gad-email@example.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# Optional: Brevo API (alternative email service)
BREVO_API_KEY=your-brevo-api-key

# Branding
ORG_NAME=Xavier University – Ateneo de Cagayan
SYSTEM_NAME=GIMS
```

**Important notes:**
- **JWT_SECRET**: Use a strong, random string. Change in production.
- **GMAIL_APP_PASSWORD**: Get from [Google App Passwords](https://myaccount.google.com/apppasswords) (NOT your regular Gmail password).
- **USE_IN_MEMORY_DB**: Set to `true` for testing without MongoDB (creates ephemeral in-memory DB).
- **Never commit `.env`** — it's already gitignored.

---

### **Step 4: Choose Your Setup Method**

#### **Option A: Local Setup (Node.js + MongoDB)**

**4A.1: Start MongoDB**

If MongoDB is installed locally:
```bash
# On macOS/Linux:
brew services start mongodb-community

# On Windows (Command Prompt as Admin):
net start MongoDB

# Or run MongoDB in Docker instead:
docker run -d -p 27017:27017 --name gims_mongo mongo:7
```

**4A.2: Start the Application**

Development mode (with auto-reload):
```bash
npm run dev
```

Or production mode:
```bash
npm start
```

The server will start at **`http://localhost:4000`**

---

#### **Option B: Docker Setup (Recommended)**

**4B.1: Start Both MongoDB and App**

```bash
docker compose up --build
```

This starts two containers:
- **gims_mongo**: MongoDB 7 (database: `gims`)
- **gims_app**: Node.js app (Express on port 4000)

**4B.2: Verify Services Are Running**

```bash
docker compose ps
```

You should see both `gims_mongo` and `gims_app` in the list.

The server will be available at **`http://localhost:4000`**

---

### **Step 5: Initial Database Setup**

The system automatically bootstraps **two hardcoded admin accounts**:

| Email | Password | Role |
|-------|----------|------|
| `gad.admin@xu.edu.ph` | `GimsAdmin!123` | Admin |
| `gad.secretary@xu.edu.ph` | `GimsSecretary!123` | Admin |

These are created automatically on first startup.

---

### **Step 6: Access the Application**

Open your browser and navigate to:

**`http://localhost:4000`**

You'll see the landing page with options:

- **Admin Login** → `/admin.html`
  - Use one of the hardcoded admin credentials (see Step 5)
- **Employee Sign-up** → `/signup.html`
  - Only `@xu.edu.ph` or `@my.xu.edu.ph` emails allowed
  - Verify via 6-digit PIN sent to email
- **Employee Login** → `/login.html`

---

### **Step 7: Admin Dashboard Setup**

Once logged in as admin, set up the system:

#### **Create Seminars**

1. Navigate to **Manage Seminars**
2. Click **Create Seminar**
3. Fill in details:
   - Title, Description, Date/Time
   - Capacity (max registrations)
   - **Mandatory**: If `true`, seminar counts toward compliance
   - **Certificate Release Mode**:
     - `manual` — admin issues manually
     - `evaluation` — auto-issued after evaluation
     - `automatic` — auto-issued after attendance
   - Multi-session support (optional)
4. Click **Save**

#### **Upload Learning Materials**

1. Navigate to **Learning Materials**
2. Click **Upload**
3. Select PDF, PPT, or PPTX (max 50 MB)
4. Associate with a seminar

#### **Manage Employees**

1. Navigate to **Manage Employees**
2. Create accounts manually or invite via bulk email
3. Set compliance requirements (seminars per year, default: 5)

---

### **Step 8: Employee Onboarding**

New employees sign up at `/signup.html`:

1. Enter **XU email** (`@xu.edu.ph` or `@my.xu.edu.ph`)
2. Click **Send PIN** → 6-digit code sent to email (5-min cooldown between requests)
3. Enter PIN and create password (min 8 chars, uppercase, number, special char)
4. Account created → redirect to **login page** (`/login.html`)
5. Log in with credentials → access **employee dashboard**

---

### **Step 9 (Optional): Seed Sample Data**

To populate the database with sample employees and seminars for testing:

```bash
npm run seed
```

This script creates:
- Sample employees (Juan Dela Cruz, Maria Santos)
- Sample seminars and registrations
- Useful for QA and demonstration

---

### **Step 10: Verify Everything is Working**

Test the health check endpoint:

```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "GIMS API running"
}
```

---

## Running Commands Summary

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server (auto-reload) |
| `npm start` | Start production server |
| `npm run seed` | Populate sample data |
| `docker compose up --build` | Start with Docker |
| `docker compose down` | Stop Docker containers |
| `docker compose ps` | Check container status |

---

## Configuration Reference

### Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/gims` | MongoDB connection string |
| `USE_IN_MEMORY_DB` | `false` | Use ephemeral in-memory DB (for testing) |
| `JWT_SECRET` | Required | Secret key for JWT signing — **MUST CHANGE IN PRODUCTION** |
| `GMAIL_USER` | Required | Sender email (for PIN/reminder emails) |
| `GMAIL_APP_PASSWORD` | Required | Gmail App Password (not regular password) |
| `BREVO_API_KEY` | Optional | Brevo email service API key |
| `ORG_NAME` | `Xavier University` | Organization name (for emails/certs) |
| `SYSTEM_NAME` | `GIMS` | System name (for branding) |

---

## Troubleshooting

### **Issue: MongoDB Connection Failed**

**Solution:**
- Ensure MongoDB is running: `mongosh --version` (or `mongod --version`)
- If using Docker, check: `docker ps` to see if `gims_mongo` is running
- Try using `USE_IN_MEMORY_DB=true` in `.env` to test without MongoDB

### **Issue: Email Not Sending**

**Solution:**
- Verify Gmail App Password is correct (16 characters, no spaces)
- Check if 2-Step Verification is enabled on Gmail
- Verify `GMAIL_USER` matches your Gmail address
- Check server logs for email service errors

### **Issue: Puppeteer Certificate Generation Fails**

**Solution:**
- In Docker: Chromium is pre-installed in the image
- Locally: Install Chromium or set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
- Check available disk space (Puppeteer needs ~300 MB)

### **Issue: Port 4000 Already in Use**

**Solution:**
```bash
# Find process using port 4000
lsof -i :4000

# Kill it
kill -9 <PID>

# Or change PORT in .env
PORT=3000
```

### **Issue: `npm install` Fails**

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and try again
rm -rf node_modules package-lock.json
npm install
```

### **Issue: Docker Container Won't Start**

**Solution:**
```bash
# Check logs
docker compose logs gims_app

# Rebuild from scratch
docker compose down
docker compose up --build
```

---

## File Structure for Reference

```
GIMS/
├── src/
│   ├── server.js                # Entry point
│   ├── config/
│   │   ├── db.js               # MongoDB connection
│   │   ├── passwordPolicy.js   # Password validation rules
│   │   └── bootstrapAccounts.js # Default admin accounts
│   ├── models/                  # Mongoose schemas
│   ├── routes/                  # API endpoints
│   ├── services/                # Business logic
│   └── scripts/
│       └── seedSamples.js      # Sample data (optional)
├── public/                      # Frontend (HTML/CSS/JS)
│   ├── index.html              # Landing page
│   ├── login.html              # Login
│   ├── signup.html             # Sign-up
│   ├── admin.html              # Admin dashboard
│   ├── employee.html           # Employee dashboard
│   ├── css/                    # Stylesheets
│   ├── js/                     # JavaScript files
│   └── uploads/                # User uploads (gitignored)
├── package.json                 # Dependencies & scripts
├── Dockerfile                   # Docker image config
├── docker-compose.yml          # Docker Compose config
├── .env                        # Environment variables (gitignored)
└── README.md                   # This file
```

---

## Production Deployment Notes

Before deploying to production:

1. **Change `JWT_SECRET`** to a strong, random value
2. **Change admin passwords** from defaults
3. **Set `NODE_ENV=production`** in `.env`
4. **Use MongoDB Atlas** or managed database (don't hardcode credentials)
5. **Use Brevo API** instead of SMTP for reliability
6. **Enable HTTPS** via reverse proxy (Nginx, Cloudflare, etc.)
7. **Set proper CORS** origins (not `*`)
8. **Enable rate limiting** on auth endpoints
9. **Use secrets manager** (never commit `.env` to repo)
10. **Regular backups** of MongoDB database

---

## First-Time Setup

### 1. Create an admin account

Admin accounts are automatically bootstrapped on startup. Use these credentials:

- **Email**: `gad.admin@xu.edu.ph`
- **Password**: `GimsAdmin!123`

To create additional admins after first login, use the Admin Dashboard → **Manage Admins**.

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
