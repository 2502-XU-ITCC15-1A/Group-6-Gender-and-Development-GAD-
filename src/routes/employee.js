import express from 'express';
import jwt from 'jsonwebtoken';

import Employee from '../models/Employee.js';
import Seminar from '../models/Seminar.js';
import Registration from '../models/Registration.js';
import LearningMaterial from '../models/LearningMaterial.js';
import Article from '../models/Article.js';

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Missing Authorization header' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'gadims-secret');
    if (payload.role !== 'employee') return res.status(403).json({ message: 'Forbidden' });
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

const escapeHtml = (value) => {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const buildCertificateHtml = ({
  employeeName,
  seminarTitle,
  dateStr,
  startTime,
  certificateCode,
  employeeDisplayId,
  department,
  issuedStr,
}) => {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GADIMS Certificate - ${escapeHtml(employeeName)}</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        padding: 24px;
        background: #f6f8fb;
        font-family: "Segoe UI", Arial, sans-serif;
      }
      .certificate {
        max-width: 980px;
        margin: 0 auto;
        background: #ffffff;
        border: 14px solid #1f3c77;
        border-radius: 18px;
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
        padding: 38px 46px;
        position: relative;
        overflow: hidden;
      }
      .watermark {
        position: absolute;
        right: -24px;
        bottom: -32px;
        font-size: 130px;
        color: rgba(31, 60, 119, 0.06);
        font-weight: 800;
        letter-spacing: 0.08em;
        user-select: none;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #dbe5f7;
        padding-bottom: 16px;
      }
      .org {
        font-size: 14px;
        letter-spacing: 0.12em;
        color: #334155;
      }
      .title {
        margin-top: 8px;
        font-size: 38px;
        line-height: 1.1;
        color: #1f3c77;
        font-weight: 800;
      }
      .subtitle {
        margin-top: 8px;
        color: #475569;
        font-size: 16px;
      }
      .name {
        margin-top: 26px;
        text-align: center;
        font-size: 40px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.2;
      }
      .line {
        margin: 6px auto 16px;
        width: min(560px, 85%);
        border-bottom: 2px solid #cbd5e1;
      }
      .body-text {
        text-align: center;
        margin: 0 auto;
        max-width: 760px;
        color: #334155;
        font-size: 18px;
        line-height: 1.6;
      }
      .seminar {
        color: #1f3c77;
        font-weight: 700;
      }
      .meta {
        margin-top: 28px;
        display: grid;
        grid-template-columns: repeat(2, minmax(200px, 1fr));
        gap: 10px 18px;
        font-size: 14px;
        color: #334155;
      }
      .meta b { color: #0f172a; }
      .footer {
        margin-top: 28px;
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 16px;
      }
      .sig {
        border-top: 1px solid #94a3b8;
        width: 260px;
        text-align: center;
        padding-top: 8px;
        color: #334155;
      }
      .badge {
        background: #eaf0fb;
        color: #1f3c77;
        border: 1px solid #c9d8f3;
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <article class="certificate">
      <div class="watermark">GADIMS</div>
      <header class="header">
        <div class="org">XAVIER UNIVERSITY - ATENEO DE CAGAYAN</div>
        <div class="title">Certificate of Attendance</div>
        <div class="subtitle">Gender and Development Management and Information System</div>
      </header>

      <div class="name">${escapeHtml(employeeName)}</div>
      <div class="line"></div>

      <p class="body-text">
        is hereby recognized for attending the seminar
        <span class="seminar">${escapeHtml(seminarTitle)}</span>
        held on <span class="seminar">${escapeHtml(dateStr)}</span>
        at <span class="seminar">${escapeHtml(startTime)}</span>.
      </p>

      <section class="meta">
        <div><b>Certificate Code:</b> ${escapeHtml(certificateCode)}</div>
        <div><b>Employee ID:</b> ${escapeHtml(employeeDisplayId)}</div>
        <div><b>Department:</b> ${escapeHtml(department || 'N/A')}</div>
        <div><b>Issued At:</b> ${escapeHtml(issuedStr)}</div>
      </section>

      <footer class="footer">
        <div class="sig">GAD Office Representative</div>
        <div class="badge">System-Issued via GADIMS</div>
      </footer>
    </article>
  </body>
</html>`;
};

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    const required = Number(employee.requiredSeminarsPerYear || 5);
    const completed = Array.isArray(employee.seminarsAttended) ? employee.seminarsAttended.length : 0;
    const progressPercent = required === 0 ? 0 : Math.min(100, (completed / required) * 100);
    const compliant = completed >= required;

    const dept = employee.department;
    const maleCount = await Employee.countDocuments({
      department: dept,
      birthSex: { $regex: /male/i },
    });
    const femaleCount = await Employee.countDocuments({
      department: dept,
      birthSex: { $regex: /female/i },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const seminars = await Seminar.find({ date: { $gte: today } })
      .sort({ date: 1, startTime: 1 })
      .populate('createdBy', 'name');

    const upcomingSeminars = seminars.map((s) => {
      const remaining = Math.max(0, (s.capacity || 0) - (Array.isArray(s.registeredEmployees) ? s.registeredEmployees.length : 0));
      return {
        id: s._id.toString(),
        title: s.title,
        description: s.description,
        date: s.date,
        startTime: s.startTime,
        durationHours: s.durationHours,
        mandatory: s.mandatory,
        capacity: s.capacity,
        remainingCapacity: remaining,
        instructorName: s.createdBy?.name || 'GAD Office',
      };
    });

    const certificates = await Registration.find({
      employeeID: req.user.id,
      status: 'attended',
      certificateIssued: true,
    })
      .populate({
        path: 'seminarID',
        select: 'title description date startTime durationHours mandatory',
      })
      .sort({ registeredAt: -1 });

    const certificatesView = certificates.map((r) => ({
      registrationId: r._id.toString(),
      certificateCode: r.certificateCode || '',
      certificateIssuedAt: r.certificateIssuedAt || r.updatedAt || null,
      seminar: {
        id: r.seminarID?._id?.toString() || '',
        title: r.seminarID?.title || '',
        date: r.seminarID?.date,
        startTime: r.seminarID?.startTime,
      },
    }));

    res.json({
      profile: {
        employeeId: makeEmployeeDisplayId(employee._id),
        name: employee.name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        birthSex: employee.birthSex,
        genderIdentity: employee.genderIdentity || null,
        accountStatus: 'Active',
        departmentGenderCounts: {
          male: maleCount,
          female: femaleCount,
        },
      },
      compliance: {
        requiredSeminars: required,
        completedSeminars: completed,
        progressPercent: Number(progressPercent.toFixed(1)),
        compliant,
        statusLabel: compliant ? 'Compliant' : 'Non-Compliant',
      },
      upcomingSeminars,
      certificates: certificatesView,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/certificates/:registrationId/download', authMiddleware, async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      employeeID: req.user.id,
      status: 'attended',
      certificateIssued: true,
    }).populate('seminarID', 'title date startTime durationHours');

    if (!registration || !registration.seminarID) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const seminarTitle = registration.seminarID.title;
    const dateStr = registration.seminarID.date ? new Date(registration.seminarID.date).toLocaleDateString() : '';
    const fileNameSafe = `${seminarTitle}`.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 60);
    const issuedAt = registration.certificateIssuedAt
      ? new Date(registration.certificateIssuedAt)
      : new Date();
    const issuedStr = issuedAt.toLocaleString();
    const certificateCode = registration.certificateCode || `CERT-${registration._id.toString().slice(-8).toUpperCase()}`;
    const employeeDisplayId = makeEmployeeDisplayId(employee._id);

    const html = buildCertificateHtml({
      employeeName: employee.name,
      seminarTitle,
      dateStr,
      startTime: registration.seminarID.startTime || '',
      certificateCode,
      employeeDisplayId,
      department: employee.department,
      issuedStr,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="GADIMS-Certificate-${fileNameSafe}-${employeeDisplayId}.html"`
    );
    res.send(html);
  } catch (err) {
    next(err);
  }
});

router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const updates = {
      birthSex: req.body.birthSex,
      genderIdentity: req.body.genderIdentity,
    };
    const employee = await Employee.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

router.get('/seminars', authMiddleware, async (req, res, next) => {
  try {
    const seminars = await Seminar.find().sort({ date: 1, startTime: 1 });
    res.json(seminars);
  } catch (err) {
    next(err);
  }
});

router.post('/seminars/:id/register', authMiddleware, async (req, res, next) => {
  try {
    const seminar = await Seminar.findById(req.params.id);
    if (!seminar) {
      return res.status(404).json({ message: 'Seminar not found' });
    }

    const employeeId = req.user.id;

    if (seminar.registeredEmployees.some((id) => String(id) === String(employeeId))) {
      return res.status(400).json({ message: 'You are already registered for this seminar.' });
    }

    if (seminar.registeredEmployees.length >= seminar.capacity) {
      return res.status(400).json({ message: 'Registration Full' });
    }

    seminar.registeredEmployees.push(employeeId);
    await seminar.save();

    await Registration.create({
      seminarID: seminar._id,
      employeeID: employeeId,
      status: 'registered',
    });

    res.json({ message: 'You have successfully registered for this seminar.' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You are already registered for this seminar.' });
    }
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

router.get('/registrations', authMiddleware, async (req, res, next) => {
  try {
    const regs = await Registration.find({ employeeID: req.user.id })
      .populate('seminarID')
      .sort({ registeredAt: -1 });
    res.json(regs);
  } catch (err) {
    next(err);
  }
});

router.get('/articles', authMiddleware, async (req, res, next) => {
  try {
    const articles = await Article.find({ published: true })
      .select('title excerpt imageUrl publishedAt seminar')
      .populate('seminar')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(20);
    res.json(articles);
  } catch (err) {
    next(err);
  }
});

router.get('/articles/:id', authMiddleware, async (req, res, next) => {
  try {
    const article = await Article.findOne({ _id: req.params.id, published: true }).populate(
      'seminar'
    );
    if (!article) return res.status(404).json({ message: 'Not found' });
    res.json(article);
  } catch (err) {
    next(err);
  }
});

export default router;

