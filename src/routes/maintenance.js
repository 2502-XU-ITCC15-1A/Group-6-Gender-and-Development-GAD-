import express from 'express';
import jwt from 'jsonwebtoken';

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

const csvCell = (value) => {
  if (value === null || value === undefined || value === '') return '"None"';
  if (typeof value === 'number') return String(value);
  const s = String(value);
  if (s.trim() === '') return '"None"';
  return `"${s.replace(/"/g, '""')}"`;
};

const formatDate = (d) => {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
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

// Build masterlist rows for either live or archived data.
const buildMasterlistRows = async (schoolYear, { source }) => {
  const header = [
    'Employee Name',
    'Department',
    'Position',
    'Email',
    'Seminar Title',
    'Seminar Date',
    'Duration (hrs)',
    'Status',
    'Certificate Issued',
    'Certificate Code',
    'Certificate Issued At',
    'School Year',
  ];

  if (source === 'archive') {
    const regs = await RegistrationArchive.find({ schoolYear }).lean();
    return [header].concat(
      regs.map((r) => {
        const s = r.seminarSnapshot || {};
        const e = r.employeeSnapshot || {};
        return [
          e.name || '',
          e.department || '',
          e.position || '',
          e.email || '',
          s.title || '',
          formatDate(s.date),
          s.durationHours || '',
          r.status || '',
          r.certificateIssued ? 'Yes' : 'No',
          r.certificateCode || '',
          formatDate(r.certificateIssuedAt),
          r.schoolYear || '',
        ];
      })
    );
  }

  const seminars = await findSeminarsForSchoolYear(schoolYear);
  const seminarIds = seminars.map((s) => s._id);
  const seminarMap = new Map(seminars.map((s) => [String(s._id), s]));
  const registrations = await findRegistrationsForSchoolYear(schoolYear, seminarIds);
  const employeeIds = [...new Set(registrations.map((r) => String(r.employeeID)))];
  const employees = await Employee.find({ _id: { $in: employeeIds } }).lean();
  const empMap = new Map(employees.map((e) => [String(e._id), e]));

  return [header].concat(
    registrations.map((r) => {
      const s = seminarMap.get(String(r.seminarID)) || {};
      const e = empMap.get(String(r.employeeID)) || {};
      return [
        e.name || '',
        e.department || '',
        e.position || '',
        e.email || '',
        s.title || '',
        formatDate(s.date),
        s.durationHours || '',
        r.status || '',
        r.certificateIssued ? 'Yes' : 'No',
        r.certificateCode || '',
        formatDate(r.certificateIssuedAt),
        r.schoolYear || schoolYear,
      ];
    })
  );
};

const sendCsv = (res, filename, rows) => {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

// GET /api/admin/maintenance/masterlist.csv?schoolYear=YYYY-YYYY
router.get('/masterlist.csv', authMiddleware, async (req, res, next) => {
  try {
    const schoolYear = String(req.query.schoolYear || currentSchoolYear());
    if (!isValidSchoolYear(schoolYear)) {
      return res.status(400).json({ message: 'Invalid schoolYear' });
    }
    const rows = await buildMasterlistRows(schoolYear, { source: 'live' });
    sendCsv(res, `gims_masterlist_${schoolYear}.csv`, rows);
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

// GET /api/admin/maintenance/archives/:schoolYear/masterlist.csv
router.get('/archives/:schoolYear/masterlist.csv', authMiddleware, async (req, res, next) => {
  try {
    const schoolYear = String(req.params.schoolYear);
    if (!isValidSchoolYear(schoolYear)) {
      return res.status(400).json({ message: 'Invalid schoolYear' });
    }
    const rows = await buildMasterlistRows(schoolYear, { source: 'archive' });
    sendCsv(res, `gims_masterlist_${schoolYear}.csv`, rows);
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
