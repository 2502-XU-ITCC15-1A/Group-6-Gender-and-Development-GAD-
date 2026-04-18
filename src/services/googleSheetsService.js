import { google } from 'googleapis';
import Employee from '../models/Employee.js';
import Seminar from '../models/Seminar.js';
import Attendance from '../models/Attendance.js';

const getSheetsClient = () => {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
  const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

  const auth = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    scopes
  );

  return google.sheets({ version: 'v4', auth });
};

/**
 * Sync attendance data for a given seminar from Google Sheets into MongoDB.
 * Assumes each row contains: [timestamp, employeeId, name, email, campus, department]
 */
export const syncSeminarFromSheet = async (seminarId) => {
  const seminar = await Seminar.findById(seminarId);
  if (!seminar || !seminar.googleSheetId) {
    throw new Error('Seminar or Google Sheet not configured');
  }

  const sheets = getSheetsClient();
  const range = process.env.GOOGLE_SHEET_RANGE || 'Form Responses 1!A2:F';

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: seminar.googleSheetId,
    range,
  });

  const rows = res.data.values || [];

  for (const row of rows) {
    const [timestamp, employeeId, name, email, campus, department] = row;
    if (!employeeId || !email) continue;

    let employee = await Employee.findOne({ employeeId });
    if (!employee) {
      employee = await Employee.create({
        employeeId,
        name: name || employeeId,
        email,
        campus,
        department,
      });
    } else {
      employee.name = name || employee.name;
      employee.email = email || employee.email;
      employee.campus = campus || employee.campus;
      employee.department = department || employee.department;
      employee.lastUpdatedFromSheets = new Date();
      await employee.save();
    }

    try {
      await Attendance.updateOne(
        { employee: employee._id, seminar: seminar._id },
        {
          $setOnInsert: {
            attendedAt: timestamp ? new Date(timestamp) : new Date(),
            source: 'google_sheets',
          },
        },
        { upsert: true }
      );
    } catch (err) {
      console.error('Attendance upsert failed', err.message);
    }
  }

  // Recompute seminar counts for all employees who attended this seminar
  const attendanceDocs = await Attendance.find({ seminar: seminar._id }).populate('employee');
  const employeeIds = new Set(attendanceDocs.map((a) => a.employee._id.toString()));

  for (const empId of employeeIds) {
    const count = await Attendance.countDocuments({ employee: empId });
    await Employee.findByIdAndUpdate(empId, { completedSeminarsCount: count });
  }

  return { rowsImported: rows.length, seminarId: seminar._id.toString() };
};

