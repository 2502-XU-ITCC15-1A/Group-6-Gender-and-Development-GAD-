import express from 'express';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';

import Employee from '../models/Employee.js';
import Seminar from '../models/Seminar.js';
import Registration from '../models/Registration.js';
import Notification from '../models/Notification.js';
import Evaluation from '../models/Evaluation.js';
import RegistrationArchive from '../models/RegistrationArchive.js';
import SeminarArchive from '../models/SeminarArchive.js';
import MaintenanceLog from '../models/MaintenanceLog.js';
import {
  getSchoolYear,
  currentSchoolYear,
  schoolYearRange,
  isValidSchoolYear,
} from '../services/schoolYearService.js';

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Missing Authorization header' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'gims-secret');
    if (payload.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const RESET_PHRASE = 'GIMS MAINTENANCE';

const displayValue = (value) => {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'number') return value;
  const s = String(value);
  return s.trim() === '' ? 'None' : s;
};

const formatDate = (d) => {
  if (!d) return 'None';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return 'None';
  return dt.toISOString().slice(0, 10);
};

// Resolve which seminars belong to a given school year. Falls back to the
// seminar.date range so legacy records (no schoolYear field) still match.
const findSeminarsForSchoolYear = async (schoolYear, { includeArchive = false } = {}) => {
  const range = schoolYearRange(schoolYear);
  const orConditions = [{ schoolYear }];
  if (range) {
    orConditions.push({
      schoolYear: { $in: [null, ''] },
      date: { $gte: range[0], $lt: range[1] },
    });
  }
  return Seminar.find({ $or: orConditions }).lean();
};

const findRegistrationsForSchoolYear = async (schoolYear, seminarIds) => {
  const range = schoolYearRange(schoolYear);
  const orConditions = [{ schoolYear }];
  if (seminarIds && seminarIds.length) {
    orConditions.push({
      schoolYear: { $in: [null, ''] },
      seminarID: { $in: seminarIds },
    });
  }
  if (range) {
    orConditions.push({
      schoolYear: { $in: [null, ''] },
      registeredAt: { $gte: range[0], $lt: range[1] },
    });
  }
  return Registration.find({ $or: orConditions }).lean();
};

// GET /api/admin/maintenance/current-school-year
router.get('/current-school-year', authMiddleware, (req, res) => {
  res.json({ schoolYear: currentSchoolYear() });
});

// GET /api/admin/maintenance/preview?schoolYear=YYYY-YYYY
router.get('/preview', authMiddleware, async (req, res, next) => {
  try {
    const schoolYear = String(req.query.schoolYear || currentSchoolYear());
    if (!isValidSchoolYear(schoolYear)) {
      return res.status(400).json({ message: 'Invalid schoolYear (expected YYYY-YYYY)' });
    }

    const seminars = await findSeminarsForSchoolYear(schoolYear);
    const seminarIds = seminars.map((s) => s._id);
    const registrations = await findRegistrationsForSchoolYear(schoolYear, seminarIds);

    const employeeIds = new Set(registrations.map((r) => String(r.employeeID)));
    const certificatesIssued = registrations.filter((r) => r.certificateIssued).length;

    res.json({
      schoolYear,
      counts: {
        seminars: seminars.length,
        registrations: registrations.length,
        employeesAffected: employeeIds.size,
        certificatesIssued,
      },
    });
  } catch (err) {
    next(err);
  }
});

const MASTERLIST_COLUMNS = [
  { header: 'Employee Name',        key: 'name',           width: 28 },
  { header: 'Department',           key: 'department',     width: 32 },
  { header: 'Position',             key: 'position',       width: 22 },
  { header: 'Email',                key: 'email',          width: 30 },
  { header: 'Seminar Title',        key: 'seminarTitle',   width: 32 },
  { header: 'Seminar Date',         key: 'seminarDate',    width: 14 },
  { header: 'Duration (hrs)',       key: 'duration',       width: 14 },
  { header: 'Status',               key: 'status',         width: 16 },
  { header: 'Certificate Issued',   key: 'certIssued',     width: 18 },
  { header: 'Certificate Code',     key: 'certCode',       width: 26 },
  { header: 'Certificate Issued At', key: 'certIssuedAt',  width: 18 },
  { header: 'School Year',          key: 'schoolYear',     width: 14 },
];

const buildMasterlistData = async (schoolYear, { source }) => {
  if (source === 'archive') {
    const regs = await RegistrationArchive.find({ schoolYear }).lean();
    return regs.map((r) => {
      const s = r.seminarSnapshot || {};
      const e = r.employeeSnapshot || {};
      return {
        name: displayValue(e.name),
        department: displayValue(e.department),
        position: displayValue(e.position),
        email: displayValue(e.email),
        seminarTitle: displayValue(s.title),
        seminarDate: formatDate(s.date),
        duration: displayValue(s.durationHours),
        status: displayValue(r.status),
        certIssued: r.certificateIssued ? 'Yes' : 'No',
        certCode: displayValue(r.certificateCode),
        certIssuedAt: formatDate(r.certificateIssuedAt),
        schoolYear: displayValue(r.schoolYear),
      };
    });
  }

  const seminars = await findSeminarsForSchoolYear(schoolYear);
  const seminarIds = seminars.map((s) => s._id);
  const seminarMap = new Map(seminars.map((s) => [String(s._id), s]));
  const registrations = await findRegistrationsForSchoolYear(schoolYear, seminarIds);
  const employeeIds = [...new Set(registrations.map((r) => String(r.employeeID)))];
  const employees = await Employee.find({ _id: { $in: employeeIds } }).lean();
  const empMap = new Map(employees.map((e) => [String(e._id), e]));

  return registrations.map((r) => {
    const s = seminarMap.get(String(r.seminarID)) || {};
    const e = empMap.get(String(r.employeeID)) || {};
    return {
      name: displayValue(e.name),
      department: displayValue(e.department),
      position: displayValue(e.position),
      email: displayValue(e.email),
      seminarTitle: displayValue(s.title),
      seminarDate: formatDate(s.date),
      duration: displayValue(s.durationHours),
      status: displayValue(r.status),
      certIssued: r.certificateIssued ? 'Yes' : 'No',
      certCode: displayValue(r.certificateCode),
      certIssuedAt: formatDate(r.certificateIssuedAt),
      schoolYear: displayValue(r.schoolYear || schoolYear),
    };
  });
};

const buildMasterlistWorkbook = async (schoolYear, rows) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GIMS — GAD Integrated Management System';
  wb.created = new Date();

  const ws = wb.addWorksheet(`SY ${schoolYear}`, {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const colCount = MASTERLIST_COLUMNS.length;
  const lastColLetter = ws.getColumn(colCount).letter;

  // Title row
  ws.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = `GIMS YEARLY ARCHIVE • SCHOOL YEAR ${schoolYear.replace('-', '–')}`;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF14264F' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // Subtitle row
  ws.mergeCells(`A2:${lastColLetter}2`);
  const subCell = ws.getCell('A2');
  subCell.value = 'Xavier University – Ateneo de Cagayan • GAD Integrated Management System';
  subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF6B7280' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  // Spacer row 3 (left blank by design)
  ws.getRow(3).height = 8;

  // Header row 4
  ws.columns = MASTERLIST_COLUMNS.map((c) => ({ key: c.key, width: c.width }));
  const headerRow = ws.getRow(4);
  MASTERLIST_COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF203A73' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF14264F' } },
      bottom: { style: 'thin', color: { argb: 'FF14264F' } },
      left:   { style: 'thin', color: { argb: 'FF14264F' } },
      right:  { style: 'thin', color: { argb: 'FF14264F' } },
    };
  });
  headerRow.height = 26;

  // Data rows
  rows.forEach((row, idx) => {
    const excelRow = ws.addRow(row);
    excelRow.height = 20;
    const isAlt = idx % 2 === 1;
    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF111827' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top:    { style: 'hair', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        left:   { style: 'hair', color: { argb: 'FFE5E7EB' } },
        right:  { style: 'hair', color: { argb: 'FFE5E7EB' } },
      };
      if (isAlt) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF6F8FC' },
        };
      }
    });

    // Center-align short, code-like, or status columns
    ['seminarDate', 'duration', 'status', 'certIssued', 'certCode', 'certIssuedAt', 'schoolYear']
      .forEach((key) => {
        const cell = excelRow.getCell(key);
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
      });

    // Color the certificate Yes/No
    const ci = excelRow.getCell('certIssued');
    if (ci.value === 'Yes') {
      ci.font = { ...ci.font, bold: true, color: { argb: 'FF0A7A0A' } };
    } else if (ci.value === 'None' || ci.value === 'No') {
      ci.font = { ...ci.font, color: { argb: 'FF6B7280' } };
    }

    // Dim "None" cells so empties read as muted
    excelRow.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.value === 'None') {
        cell.font = { ...cell.font, italic: true, color: { argb: 'FF9CA3AF' } };
      }
    });
  });

  // If empty result, add a friendly note row
  if (rows.length === 0) {
    ws.mergeCells(`A5:${lastColLetter}5`);
    const empty = ws.getCell('A5');
    empty.value = `No registrations found for school year ${schoolYear}.`;
    empty.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF6B7280' } };
    empty.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(5).height = 28;
  }

  return wb;
};

const sendWorkbook = async (res, filename, wb) => {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
};

// GET /api/admin/maintenance/masterlist.xlsx?schoolYear=YYYY-YYYY
router.get('/masterlist.xlsx', authMiddleware, async (req, res, next) => {
  try {
    const schoolYear = String(req.query.schoolYear || currentSchoolYear());
    if (!isValidSchoolYear(schoolYear)) {
      return res.status(400).json({ message: 'Invalid schoolYear' });
    }
    const rows = await buildMasterlistData(schoolYear, { source: 'live' });
    const wb = await buildMasterlistWorkbook(schoolYear, rows);
    await sendWorkbook(res, `GIMS_Masterlist_${schoolYear}.xlsx`, wb);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/maintenance/reset-school-year
// body: { schoolYear, confirmPhrase, notes? }
router.post('/reset-school-year', authMiddleware, async (req, res, next) => {
  try {
    const { schoolYear, confirmPhrase, notes } = req.body || {};
    if (!isValidSchoolYear(schoolYear)) {
      return res.status(400).json({ message: 'Invalid schoolYear (expected YYYY-YYYY)' });
    }
    if (String(confirmPhrase || '').trim() !== RESET_PHRASE) {
      return res.status(400).json({ message: `Confirmation phrase must be exactly "${RESET_PHRASE}"` });
    }

    const adminEmployee = await Employee.findById(req.user.id).lean();
    const adminId = req.user.id;

    // 1. Gather seminars and registrations for the SY
    const seminars = await findSeminarsForSchoolYear(schoolYear);
    const seminarIds = seminars.map((s) => s._id);
    const seminarMap = new Map(seminars.map((s) => [String(s._id), s]));

    const registrations = await findRegistrationsForSchoolYear(schoolYear, seminarIds);
    const affectedEmployeeIds = [...new Set(registrations.map((r) => String(r.employeeID)))];

    // Snapshot employee data for archive
    const employees = await Employee.find({ _id: { $in: affectedEmployeeIds } }).lean();
    const empMap = new Map(employees.map((e) => [String(e._id), e]));

    // 2. Copy registrations -> RegistrationArchive
    if (registrations.length) {
      const archiveDocs = registrations.map((r) => {
        const s = seminarMap.get(String(r.seminarID)) || {};
        const e = empMap.get(String(r.employeeID)) || {};
        return {
          schoolYear,
          archivedAt: new Date(),
          archivedBy: adminId,
          originalRegistrationId: r._id,
          seminarID: r.seminarID,
          employeeID: r.employeeID,
          registeredAt: r.registeredAt,
          status: r.status,
          certificateIssued: r.certificateIssued,
          certificateIssuedAt: r.certificateIssuedAt,
          certificateCode: r.certificateCode,
          evaluationAvailable: r.evaluationAvailable,
          evaluationCompleted: r.evaluationCompleted,
          sessionAttendance: r.sessionAttendance,
          chosenSessionId: r.chosenSessionId,
          originalCreatedAt: r.createdAt,
          originalUpdatedAt: r.updatedAt,
          seminarSnapshot: {
            title: s.title,
            description: s.description,
            location: s.location,
            date: s.date,
            durationHours: s.durationHours,
          },
          employeeSnapshot: {
            name: e.name,
            email: e.email,
            department: e.department,
            position: e.position,
          },
        };
      });
      await RegistrationArchive.insertMany(archiveDocs);
    }

    // 3. Pull SY's seminar IDs out of every employee's seminarsAttended[]
    if (seminarIds.length) {
      await Employee.updateMany(
        { seminarsAttended: { $in: seminarIds } },
        { $pull: { seminarsAttended: { $in: seminarIds } } }
      );
    }

    // 4. Delete the live registrations
    if (registrations.length) {
      await Registration.deleteMany({ _id: { $in: registrations.map((r) => r._id) } });
    }

    // 5. Copy seminars -> SeminarArchive, then delete from live
    if (seminars.length) {
      const seminarArchiveDocs = seminars.map((s) => ({
        schoolYear,
        archivedAt: new Date(),
        archivedBy: adminId,
        originalSeminarId: s._id,
        title: s.title,
        description: s.description,
        location: s.location,
        date: s.date,
        startTime: s.startTime,
        durationHours: s.durationHours,
        mandatory: s.mandatory,
        capacity: s.capacity,
        isHeld: s.isHeld,
        heldAt: s.heldAt,
        sessions: s.sessions,
        registeredEmployees: s.registeredEmployees,
        certificateReleaseMode: s.certificateReleaseMode,
        requiredSessionsToPass: s.requiredSessionsToPass,
        multiSessionType: s.multiSessionType,
        originalCreatedAt: s.createdAt,
        originalUpdatedAt: s.updatedAt,
      }));
      await SeminarArchive.insertMany(seminarArchiveDocs);

      // Cascade-delete related notifications/evaluations referencing those seminars
      await Notification.deleteMany({ seminarID: { $in: seminarIds } });
      await Evaluation.deleteMany({ seminarID: { $in: seminarIds } });
      await Seminar.deleteMany({ _id: { $in: seminarIds } });
    }

    // 6. Reset requiredSeminarsPerYear back to default for everyone (yearly stat)
    await Employee.updateMany({}, { $set: { requiredSeminarsPerYear: 5 } });

    // 7. Write maintenance log
    const log = await MaintenanceLog.create({
      action: 'school-year-reset',
      schoolYear,
      triggeredBy: adminId,
      triggeredByName: adminEmployee?.name || '',
      triggeredByEmail: adminEmployee?.email || req.user.email || '',
      triggeredAt: new Date(),
      counts: {
        registrationsArchived: registrations.length,
        seminarsArchived: seminars.length,
        employeesAffected: affectedEmployeeIds.length,
      },
      notes: String(notes || '').trim(),
    });

    res.json({
      message: 'School year reset complete',
      schoolYear,
      counts: log.counts,
      logId: log._id,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/maintenance/archives
router.get('/archives', authMiddleware, async (req, res, next) => {
  try {
    const years = await RegistrationArchive.aggregate([
      {
        $group: {
          _id: '$schoolYear',
          registrations: { $sum: 1 },
          certificates: { $sum: { $cond: ['$certificateIssued', 1, 0] } },
          employees: { $addToSet: '$employeeID' },
          firstArchivedAt: { $min: '$archivedAt' },
          lastArchivedAt: { $max: '$archivedAt' },
        },
      },
      {
        $project: {
          _id: 0,
          schoolYear: '$_id',
          registrations: 1,
          certificates: 1,
          employees: { $size: '$employees' },
          firstArchivedAt: 1,
          lastArchivedAt: 1,
        },
      },
      { $sort: { schoolYear: -1 } },
    ]);

    const seminarCounts = await SeminarArchive.aggregate([
      { $group: { _id: '$schoolYear', count: { $sum: 1 } } },
    ]);
    const seminarCountMap = new Map(seminarCounts.map((s) => [s._id, s.count]));
    years.forEach((y) => {
      y.seminars = seminarCountMap.get(y.schoolYear) || 0;
    });

    res.json({ archives: years });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/maintenance/archives/:schoolYear
router.get('/archives/:schoolYear', authMiddleware, async (req, res, next) => {
  try {
    const schoolYear = String(req.params.schoolYear);
    if (!isValidSchoolYear(schoolYear)) {
      return res.status(400).json({ message: 'Invalid schoolYear' });
    }

    const [seminars, registrations] = await Promise.all([
      SeminarArchive.find({ schoolYear }).sort({ date: 1 }).lean(),
      RegistrationArchive.find({ schoolYear }).sort({ archivedAt: 1 }).lean(),
    ]);

    // Group registrations by employee for a tidy view
    const byEmployee = new Map();
    for (const r of registrations) {
      const key = String(r.employeeID);
      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          employeeID: r.employeeID,
          employee: r.employeeSnapshot || {},
          registrations: [],
        });
      }
      byEmployee.get(key).registrations.push({
        seminarID: r.seminarID,
        seminar: r.seminarSnapshot || {},
        status: r.status,
        certificateIssued: r.certificateIssued,
        certificateCode: r.certificateCode,
        certificateIssuedAt: r.certificateIssuedAt,
        registeredAt: r.registeredAt,
      });
    }

    res.json({
      schoolYear,
      seminars,
      employees: [...byEmployee.values()],
      counts: {
        seminars: seminars.length,
        registrations: registrations.length,
        employees: byEmployee.size,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/maintenance/archives/:schoolYear/masterlist.xlsx
router.get('/archives/:schoolYear/masterlist.xlsx', authMiddleware, async (req, res, next) => {
  try {
    const schoolYear = String(req.params.schoolYear);
    if (!isValidSchoolYear(schoolYear)) {
      return res.status(400).json({ message: 'Invalid schoolYear' });
    }
    const rows = await buildMasterlistData(schoolYear, { source: 'archive' });
    const wb = await buildMasterlistWorkbook(schoolYear, rows);
    await sendWorkbook(res, `GIMS_Masterlist_${schoolYear}.xlsx`, wb);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/maintenance/logs
router.get('/logs', authMiddleware, async (req, res, next) => {
  try {
    const logs = await MaintenanceLog.find({})
      .sort({ triggeredAt: -1 })
      .limit(100)
      .lean();
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/maintenance/backfill-school-year
// One-time helper: stamps existing seminars/registrations that have no schoolYear.
router.post('/backfill-school-year', authMiddleware, async (req, res, next) => {
  try {
    const seminars = await Seminar.find({
      $or: [{ schoolYear: null }, { schoolYear: '' }, { schoolYear: { $exists: false } }],
    });
    let seminarsUpdated = 0;
    for (const s of seminars) {
      const sy = getSchoolYear(s.date);
      if (sy) {
        s.schoolYear = sy;
        await s.save();
        seminarsUpdated += 1;
      }
    }

    // For registrations: derive from the linked seminar's schoolYear
    const regs = await Registration.find({
      $or: [{ schoolYear: null }, { schoolYear: '' }, { schoolYear: { $exists: false } }],
    });
    let registrationsUpdated = 0;
    const seminarYearCache = new Map();
    for (const r of regs) {
      let sy = seminarYearCache.get(String(r.seminarID));
      if (sy === undefined) {
        const s = await Seminar.findById(r.seminarID).select('schoolYear date').lean();
        sy = s?.schoolYear || (s?.date ? getSchoolYear(s.date) : null);
        seminarYearCache.set(String(r.seminarID), sy);
      }
      if (sy) {
        r.schoolYear = sy;
        await r.save();
        registrationsUpdated += 1;
      }
    }

    res.json({
      message: 'Backfill complete',
      seminarsUpdated,
      registrationsUpdated,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
