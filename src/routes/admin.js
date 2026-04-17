import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import Employee from '../models/Employee.js';
import Seminar from '../models/Seminar.js';
import Registration from '../models/Registration.js';
import Notification from '../models/Notification.js';
import LearningMaterial from '../models/LearningMaterial.js';
import Article from '../models/Article.js';
import Evaluation from '../models/Evaluation.js';
import { sendBulkReminders, sendReminderEmail } from '../services/emailService.js';
import User from '../models/User.js';
import {
  buildCertificateDownload,
  renderCertificateBuffer,
  issueCertificateForRegistration,
} from '../services/certificateService.js';

const router = express.Router();

const ensureUploadsDir = () => {
  const dir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ensureUploadsDir());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext || '.bin';
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Missing Authorization header' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'gadims-secret');
    if (payload.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const makeEmployeeDisplayId = (id) => {
  const tail = String(id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  return `EMP-${tail || '000000'}`;
};

const parseDateOnly = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeCertificateReleaseMode = ({ certificateReleaseMode, autoSendCertificates }) => {
  const mode = String(certificateReleaseMode || '').trim().toLowerCase();
  if (['manual', 'evaluation', 'automatic'].includes(mode)) return mode;
  return String(autoSendCertificates).toLowerCase() === 'true' ? 'automatic' : 'evaluation';
};

router.post('/seed-admin', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!password) return res.status(400).json({ message: 'Password is required' });

    let employee = await Employee.findOne({ email: email.toLowerCase().trim() });
    if (!employee) {
      employee = await Employee.create({
        name: name || 'GADIMS Admin',
        email: email.toLowerCase().trim(),
        department: 'GAD Office',
        position: 'Administrator',
        role: 'admin',
      });
    } else {
      employee.role = 'admin';
      await employee.save();
    }

    let user = await User.findOne({ username: email.toLowerCase().trim(), role: 'admin' });
    if (!user) {
      user = new User({
        username: email.toLowerCase().trim(),
        role: 'admin',
        passwordHash: '',
        employee: employee._id,
      });
    }
    user.employee = employee._id;
    await user.setPassword(password);
    await user.save();

    const token = jwt.sign(
      { id: employee._id, role: 'admin', email: employee.email },
      process.env.JWT_SECRET || 'gadims-secret',
      { expiresIn: '8h' }
    );

    res.json({ token, employee });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({
      username: email.toLowerCase().trim(),
      role: 'admin',
    }).populate('employee');

    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    const employee = user.employee;
    const id = employee?._id || user._id;

    const token = jwt.sign(
      { id, role: 'admin', email: email.toLowerCase().trim() },
      process.env.JWT_SECRET || 'gadims-secret',
      { expiresIn: '8h' }
    );

    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// Dashboard summary
router.get('/reports/summary', authMiddleware, async (req, res, next) => {
  try {
    const totalEmployees = await Employee.countDocuments();

    const compliantAgg = await Employee.aggregate([
      {
        $project: {
          seminarsAttendedCount: { $size: { $ifNull: ['$seminarsAttended', []] } },
          requiredSeminarsPerYear: { $ifNull: ['$requiredSeminarsPerYear', 5] },
        },
      },
      {
        $match: {
          $expr: {
            $gte: ['$seminarsAttendedCount', '$requiredSeminarsPerYear'],
          },
        },
      },
      { $count: 'count' },
    ]);

    const compliant = compliantAgg?.[0]?.count || 0;
    const nonCompliant = totalEmployees - compliant;
    const completionRate = totalEmployees === 0 ? 0 : (compliant / totalEmployees) * 100;

    res.json({
      totalEmployees,
      compliant,
      nonCompliant,
      completionRatePercent: Number(completionRate.toFixed(1)),
    });
  } catch (err) {
    next(err);
  }
});

// Employee table listing
router.get('/employees', authMiddleware, async (req, res, next) => {
  try {
    const { department } = req.query;
    const filter = {};
    if (department && String(department).trim()) {
      filter.department = String(department).trim();
    }

    const employees = await Employee.find(filter).sort({ department: 1, name: 1 }).lean();

    const rows = employees.map((e) => {
      const attended = Array.isArray(e.seminarsAttended) ? e.seminarsAttended.length : 0;
      const required = Number(e.requiredSeminarsPerYear || 5);
      const isCompliant = attended >= required;
      return {
        id: e._id.toString(),
        employeeId: makeEmployeeDisplayId(e._id),
        name: e.name,
        email: e.email,
        department: e.department,
        position: e.position,
        seminarsAttended: attended,
        requiredSeminarsPerYear: required,
        seminarStatus: isCompliant ? 'Complete' : 'Incomplete',
        completionText: `${attended}/${required}`,
        updatedAt: e.updatedAt,
      };
    });

    const departments = await Employee.distinct('department');

    res.json({ rows, departments });
  } catch (err) {
    next(err);
  }
});

router.get('/employees/:id/profile', authMiddleware, async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('seminarsAttended', 'title date startTime')
      .lean();

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const registrations = await Registration.find({ employeeID: employee._id })
      .populate('seminarID', 'title date startTime')
      .sort({ createdAt: -1 })
      .lean();

    const reservedSeminars = registrations
      .filter((r) => ['registered', 'pre-registered'].includes(String(r?.status || '').toLowerCase()))
      .map((r) => ({
        id: r?.seminarID?._id?.toString() || '',
        title: r?.seminarID?.title || 'Untitled seminar',
        date: r?.seminarID?.date || null,
        startTime: r?.seminarID?.startTime || '',
        status: r.status,
      }));

    const takenFromRegistrations = registrations
      .filter((r) => String(r?.status || '').toLowerCase() === 'attended')
      .map((r) => ({
        id: r?.seminarID?._id?.toString() || '',
        title: r?.seminarID?.title || 'Untitled seminar',
        date: r?.seminarID?.date || null,
        startTime: r?.seminarID?.startTime || '',
      }));

    const takenSeen = new Set(takenFromRegistrations.map((s) => String(s.id || '')));
    const takenFromEmployeeRecord = (Array.isArray(employee.seminarsAttended) ? employee.seminarsAttended : [])
      .map((s) => ({
        id: s?._id?.toString() || '',
        title: s?.title || 'Untitled seminar',
        date: s?.date || null,
        startTime: s?.startTime || '',
      }))
      .filter((s) => {
        const key = String(s.id || '');
        if (!key || takenSeen.has(key)) return false;
        takenSeen.add(key);
        return true;
      });

    const takenSeminars = [...takenFromRegistrations, ...takenFromEmployeeRecord];
    const certificates = registrations
      .filter((r) => String(r?.status || '').toLowerCase() === 'attended' && r.certificateIssued)
      .map((r) => ({
        registrationId: r._id.toString(),
        seminarId: r.seminarID?._id?.toString() || '',
        title: r.seminarID?.title || 'Untitled seminar',
        date: r.seminarID?.date || null,
        startTime: r.seminarID?.startTime || '',
        certificateIssued: Boolean(r.certificateIssued),
        certificateCode: r.certificateCode || '',
        certificateIssuedAt: r.certificateIssuedAt || r.updatedAt || null,
        evaluationAvailable: Boolean(r.evaluationAvailable),
        evaluationCompleted: Boolean(r.evaluationCompleted),
      }));
    const attended = takenSeminars.length;
    const required = Number(employee.requiredSeminarsPerYear || 5);

    res.json({
      profile: {
        id: employee._id.toString(),
        employeeId: makeEmployeeDisplayId(employee._id),
        name: employee.name || '',
        email: employee.email || '',
        department: employee.department || '',
        position: employee.position || '',
        seminarStatus: attended >= required ? 'Complete' : 'Incomplete',
        completionText: `${attended}/${required}`,
      },
      reservedSeminars,
      takenSeminars,
      certificates,
    });
  } catch (err) {
    next(err);
  }
});

// Bulk notify selected employees
router.post('/employees/notify', authMiddleware, async (req, res, next) => {
  try {
    const { employeeIds } = req.body;
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: 'employeeIds is required.' });
    }

    const employees = await Employee.find({ _id: { $in: employeeIds } });

    let sent = 0;
    for (const employee of employees) {
      const required = Number(employee.requiredSeminarsPerYear || 5);
      const completed = Array.isArray(employee.seminarsAttended) ? employee.seminarsAttended.length : 0;
      const remaining = required - completed;
      if (remaining <= 0) continue;

      try {
        await sendReminderEmail(employee, remaining);
        sent += 1;
      } catch (err) {
        console.error(`Failed to notify ${employee.email}:`, err?.message || err);
      }
    }

    res.json({ sent });
  } catch (err) {
    next(err);
  }
});

router.post('/seminars', authMiddleware, async (req, res, next) => {
  try {
    const {
      title,
      description,
      date,
      startTime,
      durationHours,
      mandatory,
      capacity,
      autoSendCertificates,
      certificateReleaseMode,
    } = req.body;
    if (!title || !description || !date || !startTime || !durationHours || !capacity) {
      return res
        .status(400)
        .json({ message: 'Title, description, date, start time, duration, and capacity are required.' });
    }

    const seminarDate = parseDateOnly(date);
    if (!seminarDate) {
      return res.status(400).json({ message: 'Invalid seminar date.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    seminarDate.setHours(0, 0, 0, 0);
    if (seminarDate < today) {
      return res.status(400).json({ message: 'Seminar date cannot be in the past.' });
    }

    const releaseMode = normalizeCertificateReleaseMode({ certificateReleaseMode, autoSendCertificates });

    const seminar = await Seminar.create({
      title,
      description,
      date,
      startTime,
      durationHours: Number(durationHours),
      mandatory: String(mandatory).toLowerCase() === 'true',
      capacity: Number(capacity),
      autoSendCertificates: releaseMode === 'automatic',
      certificateReleaseMode: releaseMode,
      createdBy: req.user.id,
    });

    res.status(201).json(seminar);
  } catch (err) {
    next(err);
  }
});

router.get('/seminars', authMiddleware, async (req, res, next) => {
  try {
    const seminars = await Seminar.find().sort({ date: -1, startTime: -1 });
    res.json(seminars);
  } catch (err) {
    next(err);
  }
});

router.get('/seminars/:id/participants', authMiddleware, async (req, res, next) => {
  try {
    const seminar = await Seminar.findById(req.params.id)
      .select('title isHeld heldAt registeredEmployees autoSendCertificates certificateReleaseMode')
      .populate('registeredEmployees', 'name department position email');
    if (!seminar) return res.status(404).json({ message: 'Seminar not found' });

    const registrations = await Registration.find({ seminarID: req.params.id })
      .populate('employeeID')
      .sort({ registeredAt: -1 });

    const rowMap = new Map();

    registrations.forEach((r) => {
      rowMap.set(String(r.employeeID?._id || r.employeeID), {
        id: r._id,
        employeeId: String(r.employeeID?._id || r.employeeID),
        name: r.employeeID?.name,
        department: r.employeeID?.department,
        position: r.employeeID?.position,
        email: r.employeeID?.email,
        status: r.status,
        certificateIssued: Boolean(r.certificateIssued),
        evaluationAvailable: Boolean(r.evaluationAvailable),
        evaluationCompleted: Boolean(r.evaluationCompleted),
        evaluationStatus: r.evaluationCompleted
          ? 'Answered'
          : r.evaluationAvailable
            ? 'Not Answered'
            : 'Not Available',
      });
    });

    const fallbackEmployees = Array.isArray(seminar.registeredEmployees) ? seminar.registeredEmployees : [];
    fallbackEmployees.forEach((employee) => {
      const key = String(employee._id);
      if (rowMap.has(key)) return;
      rowMap.set(key, {
        id: key,
        employeeId: key,
        name: employee.name,
        department: employee.department,
        position: employee.position,
        email: employee.email,
        status: 'registered',
        certificateIssued: false,
        evaluationAvailable: false,
        evaluationCompleted: false,
        evaluationStatus: 'Not Available',
      });
    });

    const rows = Array.from(rowMap.values());

    res.json({
      seminar: {
        id: seminar._id,
        title: seminar.title,
        isHeld: Boolean(seminar.isHeld),
        heldAt: seminar.heldAt,
        registeredCount: rows.length,
        autoSendCertificates: Boolean(seminar.autoSendCertificates),
        certificateReleaseMode: seminar.certificateReleaseMode || (seminar.autoSendCertificates ? 'automatic' : 'evaluation'),
      },
      rows,
    });
  } catch (err) {
    next(err);
  }
});

// Approve selected pre-registered participants
router.post('/seminars/:id/approve', authMiddleware, async (req, res, next) => {
  try {
    const seminar = await Seminar.findById(req.params.id);
    if (!seminar) return res.status(404).json({ message: 'Seminar not found' });

    const registrationIds = Array.isArray(req.body?.registrationIds)
      ? req.body.registrationIds.map((id) => String(id))
      : [];
    if (!registrationIds.length) {
      return res.status(400).json({ message: 'Select at least one participant to approve.' });
    }

    const registrations = await Registration.find({
      _id: { $in: registrationIds },
      seminarID: seminar._id,
      status: 'pre-registered',
    }).populate('employeeID', 'name');

    let approvedCount = 0;
    for (const reg of registrations) {
      reg.status = 'registered';
      await reg.save();

      // Create approval notification
      await Notification.create({
        employeeID: reg.employeeID._id,
        type: 'approval',
        message: `You are officially part of the seminar: "${seminar.title}". You have been approved as an Official Participant.`,
        seminarID: seminar._id,
        registrationID: reg._id,
      });

      approvedCount += 1;
    }

    res.json({ message: `${approvedCount} participant(s) approved successfully.`, approvedCount });
  } catch (err) {
    next(err);
  }
});

router.post('/seminars/:id/held', authMiddleware, async (req, res, next) => {
  try {
    const seminar = await Seminar.findById(req.params.id);
    if (!seminar) return res.status(404).json({ message: 'Seminar not found' });
    if (!seminar.isHeld) {
      seminar.isHeld = true;
      seminar.heldAt = new Date();
      await seminar.save();
    }
    res.json({
      message: 'Seminar marked as held. You can now record attendance.',
      seminar,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/seminars/:id/attendance', authMiddleware, async (req, res, next) => {
  try {
    const seminar = await Seminar.findById(req.params.id);
    if (!seminar) return res.status(404).json({ message: 'Seminar not found' });
    if (!seminar.isHeld) {
      return res.status(400).json({ message: 'Mark the seminar as held before recording attendance.' });
    }

    const attendedRegistrationIds = Array.isArray(req.body?.attendedRegistrationIds)
      ? req.body.attendedRegistrationIds.map((id) => String(id))
      : [];

    // Only process registered (approved) participants, not pre-registered
    const registrations = await Registration.find({
      seminarID: seminar._id,
      status: { $in: ['registered', 'attended', 'absent'] },
    });

    if (!registrations.length) {
      return res.json({ message: 'No approved participants found.', attendedCount: 0, absentCount: 0 });
    }

    const attendedEmployeeIds = [];
    const absentEmployeeIds = [];

    for (const reg of registrations) {
      const isAttended = attendedRegistrationIds.includes(String(reg._id));
      reg.status = isAttended ? 'attended' : 'absent';

      if (isAttended) {
        // Enable evaluation form
        reg.evaluationAvailable = true;
        attendedEmployeeIds.push(reg.employeeID);
      } else {
        reg.certificateIssued = false;
        reg.certificateIssuedAt = undefined;
        reg.evaluationAvailable = false;
        absentEmployeeIds.push(reg.employeeID);
      }
      await reg.save();
    }

    if (attendedEmployeeIds.length) {
      await Employee.updateMany(
        { _id: { $in: attendedEmployeeIds } },
        { $addToSet: { seminarsAttended: seminar._id } }
      );
    }
    if (absentEmployeeIds.length) {
      await Employee.updateMany(
        { _id: { $in: absentEmployeeIds } },
        { $pull: { seminarsAttended: seminar._id } }
      );
    }

    // Send evaluation notifications to attendees
    const attendedRegs = registrations.filter((r) => r.status === 'attended');
    for (const reg of attendedRegs) {
      await Notification.create({
        employeeID: reg.employeeID,
        type: 'evaluation',
        message: `An evaluation form is now available for the seminar: "${seminar.title}". Please share your feedback.`,
        seminarID: seminar._id,
        registrationID: reg._id,
      });
    }

    // Auto-send certificates immediately only when the seminar is configured for it.
    if (seminar.certificateReleaseMode === 'automatic' && attendedRegs.length > 0) {
      for (const reg of attendedRegs) {
        await issueCertificateForRegistration({
          registration: reg,
          seminar,
          employee: { _id: reg.employeeID },
          Notification,
        });
      }
    }

    res.json({
      message: 'Attendance recorded successfully.',
      attendedCount: attendedEmployeeIds.length,
      absentCount: absentEmployeeIds.length,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/seminars/:id/certificates', authMiddleware, async (req, res, next) => {
  try {
    const seminar = await Seminar.findById(req.params.id);
    if (!seminar) return res.status(404).json({ message: 'Seminar not found' });

    const registrationIds = Array.isArray(req.body?.registrationIds)
      ? req.body.registrationIds.map((id) => String(id))
      : [];
    if (!registrationIds.length) {
      return res.status(400).json({ message: 'Select at least one attendee.' });
    }

    const registrations = await Registration.find({
      _id: { $in: registrationIds },
      seminarID: seminar._id,
      status: 'attended',
      evaluationCompleted: true,
    });

    let releasedCount = 0;
    for (const reg of registrations) {
      const employee = await Employee.findById(reg.employeeID);
      if (!employee) continue;
      await issueCertificateForRegistration({ registration: reg, seminar, employee, Notification });

      releasedCount += 1;
    }

    res.json({
      message: 'Certificates released to selected attendees.',
      releasedCount,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/employees/:employeeId/certificates/:registrationId/download', authMiddleware, async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });

    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      employeeID: req.params.employeeId,
      status: 'attended',
      certificateIssued: true,
    }).populate('seminarID', 'title date startTime durationHours');

    if (!registration || !registration.seminarID) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    const download = buildCertificateDownload({
      employee,
      registration,
      seminar: registration.seminarID,
    });
    const pngBuffer = await renderCertificateBuffer({ html: download.html });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="GADIMS-Certificate-${download.fileNameSafe}-${download.certificateCode}.png"`
    );
    res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
});

router.put('/seminars/:id', authMiddleware, async (req, res, next) => {
  try {
    const {
      title,
      description,
      date,
      startTime,
      durationHours,
      mandatory,
      capacity,
      autoSendCertificates,
      certificateReleaseMode,
    } = req.body;
    if (!title || !description || !date || !startTime || !durationHours || !capacity) {
      return res
        .status(400)
        .json({ message: 'Title, description, date, start time, duration, and capacity are required.' });
    }

    const seminarDate = parseDateOnly(date);
    if (!seminarDate) {
      return res.status(400).json({ message: 'Invalid seminar date.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    seminarDate.setHours(0, 0, 0, 0);
    if (seminarDate < today) {
      return res.status(400).json({ message: 'Seminar date cannot be in the past.' });
    }

    const seminar = await Seminar.findById(req.params.id);
    if (!seminar) return res.status(404).json({ message: 'Seminar not found' });

    seminar.title = String(title).trim();
    seminar.description = String(description).trim();
    seminar.date = date;
    seminar.startTime = String(startTime).trim();
    seminar.durationHours = Number(durationHours);
    seminar.mandatory = String(mandatory).toLowerCase() === 'true';
    seminar.capacity = Number(capacity);
    const releaseMode = normalizeCertificateReleaseMode({ certificateReleaseMode, autoSendCertificates });
    seminar.certificateReleaseMode = releaseMode;
    seminar.autoSendCertificates = releaseMode === 'automatic';

    await seminar.save();
    res.json(seminar);
  } catch (err) {
    next(err);
  }
});

router.post('/seminars/:seminarId/participants/:registrationId/attend', authMiddleware, async (req, res, next) => {
  try {
    const registration = await Registration.findByIdAndUpdate(
      req.params.registrationId,
      { $set: { status: 'attended' } },
      { new: true }
    );
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    await Employee.findByIdAndUpdate(registration.employeeID, {
      $addToSet: { seminarsAttended: registration.seminarID },
    });
    res.json(registration);
  } catch (err) {
    next(err);
  }
});

router.delete(
  '/seminars/:seminarId/participants/:registrationId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const registration = await Registration.findByIdAndDelete(req.params.registrationId);
      if (!registration) return res.status(404).json({ message: 'Registration not found' });

      await Seminar.findByIdAndUpdate(registration.seminarID, {
        $pull: { registeredEmployees: registration.employeeID },
      });

      res.json({ message: 'Registration removed' });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/seminars/:id/close', authMiddleware, async (req, res, next) => {
  try {
    const seminar = await Seminar.findByIdAndUpdate(
      req.params.id,
      { $set: { capacity: 0 } },
      { new: true }
    );
    if (!seminar) return res.status(404).json({ message: 'Seminar not found' });
    res.json(seminar);
  } catch (err) {
    next(err);
  }
});

router.delete('/seminars/:id', authMiddleware, async (req, res, next) => {
  try {
    await Registration.deleteMany({ seminarID: req.params.id });
    await Notification.deleteMany({ seminarID: req.params.id });
    const seminar = await Seminar.findByIdAndDelete(req.params.id);
    if (!seminar) return res.status(404).json({ message: 'Seminar not found' });
    res.json({ message: 'Seminar deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/materials', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || !req.file) {
      return res.status(400).json({ message: 'Title and file are required.' });
    }

    const material = await LearningMaterial.create({
      title,
      description,
      fileURL: `/uploads/${req.file.filename}`,
      uploadedBy: req.user.id,
    });

    res.status(201).json(material);
  } catch (err) {
    next(err);
  }
});

router.get('/materials', authMiddleware, async (req, res, next) => {
  try {
    const materials = await LearningMaterial.find().sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    next(err);
  }
});

router.get('/reports/employees.csv', authMiddleware, async (req, res, next) => {
  try {
    const employees = await Employee.find().lean();

    const header = 'Name,Department,Position,Seminars Attended\n';
    const rows = employees
      .map((e) => {
        const attended = Array.isArray(e.seminarsAttended) ? e.seminarsAttended.length : 0;
        return `"${(e.name || '').replace(/"/g, '""')}","${(e.department || '').replace(
          /"/g,
          '""'
        )}","${(e.position || '').replace(/"/g, '""')}",${attended}`;
      })
      .join('\n');

    const csv = header + rows;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="gadims_employees.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/reminders', authMiddleware, async (req, res, next) => {
  try {
    const result = await sendBulkReminders();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get evaluations for a seminar
router.get('/seminars/:id/evaluations', authMiddleware, async (req, res, next) => {
  try {
    const evaluations = await Evaluation.find({ seminarID: req.params.id })
      .populate('employeeID', 'name department')
      .sort({ submittedAt: -1 });
    res.json(evaluations);
  } catch (err) {
    next(err);
  }
});

router.post('/articles', authMiddleware, upload.single('image'), async (req, res, next) => {
  try {
    const { title, content, seminarId, published } = req.body;
    if (!title || !content)
      return res.status(400).json({ message: 'title and content are required' });

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const article = await Article.create({
      title,
      content,
      imageUrl,
      seminar: seminarId || undefined,
      published: published === undefined ? true : String(published).toLowerCase() === 'true',
      publishedAt: new Date(),
      createdBy: req.user.id,
    });

    res.status(201).json(article);
  } catch (err) {
    next(err);
  }
});

router.get('/articles', authMiddleware, async (req, res, next) => {
  try {
    const articles = await Article.find()
      .populate('seminar')
      .sort({ publishedAt: -1, createdAt: -1 });
    res.json(articles);
  } catch (err) {
    next(err);
  }
});

router.delete('/articles/:id', authMiddleware, async (req, res, next) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
