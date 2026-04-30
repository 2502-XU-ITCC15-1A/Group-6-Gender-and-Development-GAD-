# Test Accounts for GIMS

## Overview
The following test accounts are automatically created when you run the seed script. Use these accounts to test both admin and employee functionality.

## Seeding Test Data

### Option 1: Using npm script (Recommended)
```bash
npm run seed
```

### Option 2: Direct node command
```bash
node src/scripts/seedSamples.js
```

## Test Accounts

### Admin Account
- **Username:** `gad.admin@xu.edu.ph`
- **Password:** `GimsAdmin!123`
- **Name:** GIMS Admin
- **Department:** GAD Office
- **Position:** Administrator
- **Role:** Admin

**Features to test with this account:**
- View admin dashboard
- Manage seminars (create, edit, delete)
- Manage employees
- View gender analytics and compliance reports
- Manage system users

### Employee Accounts

#### Employee 1 - Juan Dela Cruz
- **Username:** `juan.delacruz@xu.edu.ph`
- **Password:** `GimsEmp!123`
- **Name:** Juan Dela Cruz
- **Department:** IT Office
- **Position:** Systems Analyst
- **Role:** Employee

#### Employee 2 - Maria Santos
- **Username:** `maria.santos@xu.edu.ph`
- **Password:** `GimsMaria!123`
- **Name:** Maria Santos
- **Department:** College of Engineering
- **Position:** Student Coordinator
- **Role:** Employee

#### Employee 3 - Peter Tan
- **Username:** N/A (No user account, employee record only)
- **Name:** Peter Tan
- **Department:** College of Engineering
- **Position:** Student Assistant
- **Role:** Employee

**Features to test with employee accounts:**
- View employee dashboard
- Register for seminars
- View attendance records
- Download certificates
- Update profile information

## Sample Data

The seed script also creates:
- **3 Upcoming Seminars** with registration capabilities
- **2 Completed Seminars** with certificates for testing
- **Gender statistics** from employee records
- **Sample registrations and certificates**

## Testing Workflow

1. **Start MongoDB** (via Docker or local installation)
2. **Run seed script:** `npm run seed`
3. **Start the server:** `npm start` or `npm run dev`
4. **Log in** using one of the accounts above
5. **Test features** based on your role

## Notes

- All passwords follow a pattern for security awareness testing
- Test accounts are idempotent - running the seed script multiple times is safe
- The accounts are linked to realistic employee profiles for department tracking
- Gender data (birthSex, genderIdentity) is included for analytics testing

## Database Reset

To completely reset and reseed:
```bash
# Stop the server
# Delete the MongoDB database or run:
npm run seed  # This will recreate all data
```

Or if using Docker Compose:
```bash
docker compose down -v
docker compose up
npm run seed
```
