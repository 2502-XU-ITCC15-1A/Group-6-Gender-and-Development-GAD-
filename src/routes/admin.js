import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import Employee from '../models/Employee.js';
import Seminar from '../models/Seminar.js';
import Registration from '../models/Registration.js';
import LearningMaterial from '../models/LearningMaterial.js';
import Article from '../models/Article.js';
import { sendBulkReminders, sendReminderEmail } from '../services/emailService.js';
import User from '../models/User.js';

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

// Dashboard summary (top statistic cards)
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

// Employee table listing for admin dashboard
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
        seminarStatus: isCompliant ? 'Complete' : 'Non-Complete',
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

// Bulk notify selected employees (email reminders)
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
    const { title, description, date, startTime, durationHours, mandatory, capacity } = req.body;
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

    const seminar = await Seminar.create({
      title,
      description,
      date,
      startTime,
      durationHours: Number(durationHours),
      mandatory: String(mandatory).toLowerCase() === 'true',
      capacity: Number(capacity),
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
      .select('title isHeld heldAt registeredEmployees')
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
      },
      rows,
    });
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

    const registrations = await Registration.find({ seminarID: seminar._id });
    if (!registrations.length) {
      return res.json({ message: 'No registered participants found.', attendedCount: 0, absentCount: 0 });
    }

    const attendedEmployeeIds = [];
    const absentEmployeeIds = [];
    for (const reg of registrations) {
      const isAttended = attendedRegistrationIds.includes(String(reg._id));
      reg.status = isAttended ? 'attended' : 'absent';
      if (!isAttended) {
        reg.certificateIssued = false;
        reg.certificateIssuedAt = undefined;
      }
      await reg.save();

      if (isAttended) {
        attendedEmployeeIds.push(reg.employeeID);
      } else {
        absentEmployeeIds.push(reg.employeeID);
      }
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
    });

    let releasedCount = 0;
    const issuedAt = new Date();
    for (const reg of registrations) {
      const seminarCode = String(seminar._id).slice(-5).toUpperCase();
      const employeeCode = String(reg.employeeID).slice(-5).toUpperCase();
      const randomCode = Math.random().toString(36).slice(2, 6).toUpperCase();
      reg.certificateIssued = true;
      reg.certificateIssuedAt = issuedAt;
      reg.certificateCode = reg.certificateCode || `GAD-${seminarCode}-${employeeCode}-${randomCode}`;
      await reg.save();
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

router.put('/seminars/:id', authMiddleware, async (req, res, next) => {
  try {
    const { title, description, date, startTime, durationHours, mandatory, capacity } = req.body;
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

